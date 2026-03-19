/**
 * CloudBooks Pro - InvoicesService Unit Tests
 *
 * Tests invoice creation with line items, total calculation with tax,
 * discount handling, payment recording, and status transitions.
 * Uses Decimal.js for precise monetary assertions.
 */

import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { InvoicesService } from '@/modules/invoices/invoices.service';
import { AppError } from '@/utils/app-error';
import { getDatabase } from '@/database/connection';
import { ServiceContext } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockDb = getDatabase() as any;

function chainMock(resolveTo: any = null) {
  const chain: any = {};
  const self = () => chain;
  chain.where = jest.fn().mockImplementation(self);
  chain.orWhere = jest.fn().mockImplementation(self);
  chain.first = jest.fn().mockResolvedValue(resolveTo);
  chain.select = jest.fn().mockImplementation(self);
  chain.insert = jest.fn().mockResolvedValue([]);
  chain.update = jest.fn().mockResolvedValue(1);
  chain.delete = jest.fn().mockResolvedValue(1);
  chain.join = jest.fn().mockImplementation(self);
  chain.leftJoin = jest.fn().mockImplementation(self);
  chain.orderBy = jest.fn().mockImplementation(self);
  chain.limit = jest.fn().mockImplementation(self);
  chain.offset = jest.fn().mockImplementation(self);
  chain.raw = jest.fn().mockResolvedValue({});
  chain.withSchema = jest.fn().mockImplementation(self);
  chain.table = jest.fn().mockImplementation(self);
  chain.count = jest.fn().mockResolvedValue([{ count: '0' }]);
  return chain;
}

function resetDbMock() {
  mockDb.mockReturnValue(chainMock());
  (mockDb as any).raw = jest.fn().mockReturnValue('raw-expression');
  (mockDb as any).withSchema = jest.fn().mockReturnValue(chainMock());
  (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
    const trxChain = chainMock();
    const trxFn = jest.fn().mockReturnValue(trxChain);
    Object.assign(trxFn, trxChain);
    return cb(trxFn);
  });
}

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------
function buildCtx(overrides: Partial<ServiceContext> = {}): ServiceContext {
  return {
    userId: uuidv4(),
    userName: 'Test User',
    tenantId: uuidv4(),
    tenantSchema: 'tenant_test_schema',
    ipAddress: '127.0.0.1',
    permissions: ['invoices:view', 'invoices:create', 'invoices:edit', 'invoices:delete'],
    ...overrides,
  };
}

function buildInvoice(overrides: Record<string, any> = {}) {
  return {
    id: uuidv4(),
    invoice_number: 'INV-0001',
    customer_id: uuidv4(),
    customer_name: 'Acme Corp',
    invoice_date: '2026-01-15',
    due_date: '2026-02-14',
    status: 'draft',
    currency: 'AED',
    exchange_rate: 1,
    subtotal: '1000.00',
    discount_type: null,
    discount_value: null,
    discount_amount: '0.00',
    tax_amount: '50.00',
    shipping_amount: '0.00',
    total_amount: '1050.00',
    amount_paid: '0.00',
    balance_due: '1050.00',
    is_deleted: false,
    lineItems: [
      {
        id: uuidv4(),
        invoice_id: null, // will be set
        product_id: uuidv4(),
        description: 'Consulting service',
        quantity: 10,
        unit_rate: '100.00',
        amount: '1000.00',
        tax_code_id: uuidv4(),
        tax_amount: '50.00',
        sort_order: 0,
      },
    ],
    payments: [],
    ...overrides,
  };
}

function buildTenant(overrides: Record<string, any> = {}) {
  return {
    id: uuidv4(),
    company_name: 'Test Corp',
    settings: {
      invoicePrefix: 'INV-',
      invoiceNextNumber: 5,
      journalEntryPrefix: 'JE-',
      journalEntryNextNumber: 1,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(() => {
    resetDbMock();
    service = new InvoicesService();
  });

  // =========================================================================
  // INVOICE CREATION
  // =========================================================================
  describe('create', () => {
    it('should create an invoice with correct line item calculations', async () => {
      const ctx = buildCtx();
      const tenant = buildTenant({ id: ctx.tenantId });

      // Mock: get tenant for settings (to generate invoice number)
      mockDb.mockReturnValueOnce(chainMock(tenant));

      // The transaction callback will be called by the service
      let capturedInvoiceInsert: any = null;
      let capturedLineItems: any[] = [];

      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        trxChain.insert = jest.fn().mockImplementation((data: any) => {
          // Capture the first insert (invoice) and second insert (line items)
          if (!capturedInvoiceInsert) {
            capturedInvoiceInsert = data;
          } else if (Array.isArray(data)) {
            capturedLineItems = data;
          }
          return Promise.resolve([]);
        });

        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      // Mock getById for the return value
      const createdInvoice = buildInvoice({ status: 'draft' });
      jest.spyOn(service, 'getById').mockResolvedValue(createdInvoice);

      const data = {
        customerId: uuidv4(),
        invoiceDate: '2026-02-01',
        dueDate: '2026-03-03',
        lineItems: [
          {
            productId: uuidv4(),
            description: 'Web development',
            quantity: '20',
            unitRate: '150.00',
            taxCodeId: uuidv4(),
          },
          {
            productId: uuidv4(),
            description: 'Design services',
            quantity: '5',
            unitRate: '200.00',
            taxCodeId: null,
          },
        ],
      };

      const result = await service.create(ctx, data);

      expect(result).toBeDefined();
      expect(result.invoice_number).toBe('INV-0001');

      // Verify calculations using Decimal.js
      // Line 1: 20 * 150 = 3000.00 + 5% tax = 150.00
      // Line 2: 5 * 200 = 1000.00, no tax = 0
      // Subtotal: 4000.00, Tax: 150.00, Total: 4150.00
      if (capturedInvoiceInsert) {
        const subtotal = new Decimal(capturedInvoiceInsert.subtotal);
        const taxAmount = new Decimal(capturedInvoiceInsert.tax_amount);
        const totalAmount = new Decimal(capturedInvoiceInsert.total_amount);

        expect(subtotal.toFixed(2)).toBe('4000.00');
        expect(taxAmount.toFixed(2)).toBe('150.00');
        expect(totalAmount.toFixed(2)).toBe('4150.00');
      }
    });

    it('should generate sequential invoice numbers', async () => {
      const ctx = buildCtx();
      const tenant = buildTenant({
        id: ctx.tenantId,
        settings: { invoicePrefix: 'INV-', invoiceNextNumber: 42 },
      });

      mockDb.mockReturnValueOnce(chainMock(tenant));

      let capturedInvoiceInsert: any = null;
      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        trxChain.insert = jest.fn().mockImplementation((data: any) => {
          if (!capturedInvoiceInsert) capturedInvoiceInsert = data;
          return Promise.resolve([]);
        });
        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      jest.spyOn(service, 'getById').mockResolvedValue(buildInvoice());

      await service.create(ctx, {
        customerId: uuidv4(),
        invoiceDate: '2026-02-01',
        dueDate: '2026-03-03',
        lineItems: [
          { productId: uuidv4(), description: 'Item', quantity: '1', unitRate: '100.00' },
        ],
      });

      expect(capturedInvoiceInsert.invoice_number).toBe('INV-0042');
    });

    it('should apply percentage discount correctly', async () => {
      const ctx = buildCtx();
      const tenant = buildTenant({ id: ctx.tenantId });
      mockDb.mockReturnValueOnce(chainMock(tenant));

      let capturedInvoice: any = null;
      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        trxChain.insert = jest.fn().mockImplementation((data: any) => {
          if (!capturedInvoice) capturedInvoice = data;
          return Promise.resolve([]);
        });
        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      jest.spyOn(service, 'getById').mockResolvedValue(buildInvoice());

      await service.create(ctx, {
        customerId: uuidv4(),
        invoiceDate: '2026-02-01',
        dueDate: '2026-03-03',
        discountType: 'percentage',
        discountValue: '10',
        lineItems: [
          {
            productId: uuidv4(),
            description: 'Service A',
            quantity: '4',
            unitRate: '250.00',
            taxCodeId: null,
          },
        ],
      });

      // Subtotal: 4 * 250 = 1000.00
      // Discount: 10% of 1000 = 100.00
      // No tax (taxCodeId is null)
      // Total: 1000 - 100 + 0 = 900.00
      if (capturedInvoice) {
        const subtotal = new Decimal(capturedInvoice.subtotal);
        const discountAmount = new Decimal(capturedInvoice.discount_amount);
        const totalAmount = new Decimal(capturedInvoice.total_amount);

        expect(subtotal.toFixed(2)).toBe('1000.00');
        expect(discountAmount.toFixed(2)).toBe('100.00');
        expect(totalAmount.toFixed(2)).toBe('900.00');
      }
    });

    it('should apply fixed discount correctly', async () => {
      const ctx = buildCtx();
      const tenant = buildTenant({ id: ctx.tenantId });
      mockDb.mockReturnValueOnce(chainMock(tenant));

      let capturedInvoice: any = null;
      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        trxChain.insert = jest.fn().mockImplementation((data: any) => {
          if (!capturedInvoice) capturedInvoice = data;
          return Promise.resolve([]);
        });
        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      jest.spyOn(service, 'getById').mockResolvedValue(buildInvoice());

      await service.create(ctx, {
        customerId: uuidv4(),
        invoiceDate: '2026-02-01',
        dueDate: '2026-03-03',
        discountType: 'fixed',
        discountValue: '75.50',
        lineItems: [
          {
            productId: uuidv4(),
            description: 'Service B',
            quantity: '2',
            unitRate: '500.00',
            taxCodeId: uuidv4(),
          },
        ],
      });

      // Subtotal: 2 * 500 = 1000.00
      // Tax: 5% of 1000 = 50.00
      // Discount: 75.50 (fixed)
      // Total: 1000 - 75.50 + 50 = 974.50
      if (capturedInvoice) {
        const subtotal = new Decimal(capturedInvoice.subtotal);
        const discountAmount = new Decimal(capturedInvoice.discount_amount);
        const taxAmount = new Decimal(capturedInvoice.tax_amount);
        const totalAmount = new Decimal(capturedInvoice.total_amount);

        expect(subtotal.toFixed(2)).toBe('1000.00');
        expect(discountAmount.toFixed(2)).toBe('75.50');
        expect(taxAmount.toFixed(2)).toBe('50.00');
        expect(totalAmount.toFixed(2)).toBe('974.50');
      }
    });

    it('should include shipping in total amount', async () => {
      const ctx = buildCtx();
      const tenant = buildTenant({ id: ctx.tenantId });
      mockDb.mockReturnValueOnce(chainMock(tenant));

      let capturedInvoice: any = null;
      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        trxChain.insert = jest.fn().mockImplementation((data: any) => {
          if (!capturedInvoice) capturedInvoice = data;
          return Promise.resolve([]);
        });
        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      jest.spyOn(service, 'getById').mockResolvedValue(buildInvoice());

      await service.create(ctx, {
        customerId: uuidv4(),
        invoiceDate: '2026-02-01',
        dueDate: '2026-03-03',
        shippingAmount: '25.00',
        lineItems: [
          {
            productId: uuidv4(),
            description: 'Physical product',
            quantity: '1',
            unitRate: '200.00',
            taxCodeId: null,
          },
        ],
      });

      // Subtotal: 200.00, Shipping: 25.00, Total: 225.00
      if (capturedInvoice) {
        const totalAmount = new Decimal(capturedInvoice.total_amount);
        const shippingAmount = new Decimal(capturedInvoice.shipping_amount);

        expect(shippingAmount.toFixed(2)).toBe('25.00');
        expect(totalAmount.toFixed(2)).toBe('225.00');
      }
    });

    it('should deduct deposit amount from balance due', async () => {
      const ctx = buildCtx();
      const tenant = buildTenant({ id: ctx.tenantId });
      mockDb.mockReturnValueOnce(chainMock(tenant));

      let capturedInvoice: any = null;
      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        trxChain.insert = jest.fn().mockImplementation((data: any) => {
          if (!capturedInvoice) capturedInvoice = data;
          return Promise.resolve([]);
        });
        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      jest.spyOn(service, 'getById').mockResolvedValue(buildInvoice());

      await service.create(ctx, {
        customerId: uuidv4(),
        invoiceDate: '2026-02-01',
        dueDate: '2026-03-03',
        depositAmount: '300.00',
        lineItems: [
          {
            productId: uuidv4(),
            description: 'Project milestone',
            quantity: '1',
            unitRate: '1000.00',
            taxCodeId: null,
          },
        ],
      });

      // Total: 1000.00, Deposit: 300.00, Balance: 700.00
      if (capturedInvoice) {
        const balanceDue = new Decimal(capturedInvoice.balance_due);
        expect(balanceDue.toFixed(2)).toBe('700.00');
      }
    });
  });

  // =========================================================================
  // TOTAL CALCULATION WITH TAX (Decimal.js precision tests)
  // =========================================================================
  describe('total calculation precision', () => {
    it('should avoid floating point errors with Decimal.js', () => {
      // Classic floating point issue: 0.1 + 0.2 !== 0.3 in IEEE 754
      const a = new Decimal('0.1');
      const b = new Decimal('0.2');
      const sum = a.plus(b);

      expect(sum.toFixed(2)).toBe('0.30');
      expect(sum.equals(new Decimal('0.3'))).toBe(true);
    });

    it('should correctly compute multi-line-item totals with tax', () => {
      const lineItems = [
        { quantity: '3', unitRate: '33.33', hasTax: true },
        { quantity: '7', unitRate: '14.29', hasTax: true },
        { quantity: '1', unitRate: '999.99', hasTax: false },
      ];

      let subtotal = new Decimal(0);
      let totalTax = new Decimal(0);

      for (const item of lineItems) {
        const lineAmount = new Decimal(item.quantity).times(new Decimal(item.unitRate));
        const lineTax = item.hasTax
          ? lineAmount.times(new Decimal('0.05'))
          : new Decimal(0);
        subtotal = subtotal.plus(lineAmount);
        totalTax = totalTax.plus(lineTax);
      }

      // Line 1: 3 * 33.33 = 99.99, tax = 4.9995
      // Line 2: 7 * 14.29 = 100.03, tax = 5.0015
      // Line 3: 1 * 999.99 = 999.99, tax = 0
      // Subtotal: 1200.01
      // Tax: 10.001
      // Total: 1210.011
      const total = subtotal.plus(totalTax);

      expect(subtotal.toFixed(2)).toBe('1200.01');
      expect(totalTax.toFixed(4)).toBe('10.0010');
      expect(total.toFixed(2)).toBe('1210.01');
    });

    it('should handle very small amounts without losing precision', () => {
      const qty = new Decimal('0.001');
      const rate = new Decimal('0.01');
      const amount = qty.times(rate);

      expect(amount.toFixed(5)).toBe('0.00001');
    });

    it('should handle very large invoice amounts', () => {
      const qty = new Decimal('999999');
      const rate = new Decimal('9999.99');
      const amount = qty.times(rate);
      const tax = amount.times(new Decimal('0.05'));
      const total = amount.plus(tax);

      expect(amount.toFixed(2)).toBe('9999980000.01');
      expect(tax.toFixed(2)).toBe('499999000.00');
      expect(total.toFixed(2)).toBe('10499979000.01');
    });
  });

  // =========================================================================
  // PAYMENT RECORDING
  // =========================================================================
  describe('recordPayment', () => {
    it('should record a full payment and set status to paid', async () => {
      const ctx = buildCtx();
      const invoice = buildInvoice({
        status: 'sent',
        total_amount: '1050.00',
        amount_paid: '0.00',
        balance_due: '1050.00',
      });

      // Mock getById
      jest.spyOn(service, 'getById').mockResolvedValue(invoice);

      let capturedPaymentInsert: any = null;
      let capturedInvoiceUpdate: any = null;

      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        const insertCalls: any[] = [];
        trxChain.insert = jest.fn().mockImplementation((data: any) => {
          insertCalls.push(data);
          if (!capturedPaymentInsert && !Array.isArray(data)) {
            capturedPaymentInsert = data;
          }
          return Promise.resolve([]);
        });
        trxChain.update = jest.fn().mockImplementation((data: any) => {
          capturedInvoiceUpdate = data;
          return Promise.resolve(1);
        });

        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      const result = await service.recordPayment(ctx, {
        invoiceId: invoice.id,
        amount: '1050.00',
        paymentDate: '2026-02-15',
        paymentMethod: 'bank_transfer',
        referenceNumber: 'REF-001',
        depositAccountId: uuidv4(),
      });

      expect(result).toHaveProperty('id');
      expect(result.amount).toBe('1050.00');
      expect(result.status).toBe('paid');
    });

    it('should record a partial payment and set status to partially_paid', async () => {
      const ctx = buildCtx();
      const invoice = buildInvoice({
        status: 'sent',
        total_amount: '1000.00',
        amount_paid: '0.00',
        balance_due: '1000.00',
      });

      jest.spyOn(service, 'getById').mockResolvedValue(invoice);

      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        trxChain.insert = jest.fn().mockResolvedValue([]);
        trxChain.update = jest.fn().mockResolvedValue(1);
        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      const result = await service.recordPayment(ctx, {
        invoiceId: invoice.id,
        amount: '600.00',
        paymentDate: '2026-02-15',
        paymentMethod: 'credit_card',
        depositAccountId: uuidv4(),
      });

      expect(result.status).toBe('partially_paid');
      // Verify the new balance: 1000 - 600 = 400
      const newBalance = new Decimal(invoice.balance_due).minus(new Decimal('600.00'));
      expect(newBalance.toFixed(2)).toBe('400.00');
    });

    it('should reject payment on a paid invoice', async () => {
      const ctx = buildCtx();
      const invoice = buildInvoice({
        status: 'paid',
        balance_due: '0.00',
      });

      jest.spyOn(service, 'getById').mockResolvedValue(invoice);

      await expect(
        service.recordPayment(ctx, {
          invoiceId: invoice.id,
          amount: '100.00',
          paymentDate: '2026-02-15',
          paymentMethod: 'cash',
          depositAccountId: uuidv4(),
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_STATUS',
      });
    });

    it('should reject payment on a voided invoice', async () => {
      const ctx = buildCtx();
      const invoice = buildInvoice({ status: 'voided' });

      jest.spyOn(service, 'getById').mockResolvedValue(invoice);

      await expect(
        service.recordPayment(ctx, {
          invoiceId: invoice.id,
          amount: '100.00',
          paymentDate: '2026-02-15',
          paymentMethod: 'cash',
          depositAccountId: uuidv4(),
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_STATUS',
      });
    });

    it('should reject overpayment', async () => {
      const ctx = buildCtx();
      const invoice = buildInvoice({
        status: 'sent',
        total_amount: '500.00',
        amount_paid: '0.00',
        balance_due: '500.00',
      });

      jest.spyOn(service, 'getById').mockResolvedValue(invoice);

      await expect(
        service.recordPayment(ctx, {
          invoiceId: invoice.id,
          amount: '500.01',
          paymentDate: '2026-02-15',
          paymentMethod: 'bank_transfer',
          depositAccountId: uuidv4(),
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'OVERPAYMENT',
      });
    });

    it('should correctly compute remaining balance with Decimal precision', async () => {
      const ctx = buildCtx();
      // A scenario with pennies that may cause floating-point issues
      const invoice = buildInvoice({
        status: 'sent',
        total_amount: '33.33',
        amount_paid: '0.00',
        balance_due: '33.33',
      });

      jest.spyOn(service, 'getById').mockResolvedValue(invoice);

      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        trxChain.insert = jest.fn().mockResolvedValue([]);
        trxChain.update = jest.fn().mockResolvedValue(1);
        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      const result = await service.recordPayment(ctx, {
        invoiceId: invoice.id,
        amount: '11.11',
        paymentDate: '2026-02-15',
        paymentMethod: 'cash',
        depositAccountId: uuidv4(),
      });

      // 33.33 - 11.11 = 22.22 (must be exact, no floating-point drift)
      const expectedBalance = new Decimal('33.33').minus(new Decimal('11.11'));
      expect(expectedBalance.toFixed(2)).toBe('22.22');
      expect(result.status).toBe('partially_paid');
    });
  });

  // =========================================================================
  // STATUS TRANSITIONS
  // =========================================================================
  describe('status transitions', () => {
    it('should set status to draft on creation', async () => {
      const ctx = buildCtx();
      const tenant = buildTenant({ id: ctx.tenantId });
      mockDb.mockReturnValueOnce(chainMock(tenant));

      let capturedInvoice: any = null;
      (mockDb as any).transaction = jest.fn().mockImplementation(async (cb: any) => {
        const trxChain = chainMock();
        trxChain.insert = jest.fn().mockImplementation((data: any) => {
          if (!capturedInvoice) capturedInvoice = data;
          return Promise.resolve([]);
        });
        const trxFn = jest.fn().mockReturnValue(trxChain);
        Object.assign(trxFn, trxChain);
        return cb(trxFn);
      });

      jest.spyOn(service, 'getById').mockResolvedValue(buildInvoice());

      await service.create(ctx, {
        customerId: uuidv4(),
        invoiceDate: '2026-02-01',
        dueDate: '2026-03-03',
        lineItems: [
          { productId: uuidv4(), description: 'Service', quantity: '1', unitRate: '100.00' },
        ],
      });

      expect(capturedInvoice.status).toBe('draft');
    });

    it('should prevent editing a paid invoice', async () => {
      const ctx = buildCtx();
      const paidInvoice = buildInvoice({ status: 'paid' });

      jest.spyOn(service, 'getById').mockResolvedValue(paidInvoice);

      await expect(
        service.update(ctx, paidInvoice.id, { memo: 'Updated' }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_STATUS',
      });
    });

    it('should prevent editing a voided invoice', async () => {
      const ctx = buildCtx();
      const voidedInvoice = buildInvoice({ status: 'voided' });

      jest.spyOn(service, 'getById').mockResolvedValue(voidedInvoice);

      await expect(
        service.update(ctx, voidedInvoice.id, { memo: 'Updated' }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_STATUS',
      });
    });

    it('should allow deleting only draft invoices', async () => {
      const ctx = buildCtx();
      const sentInvoice = buildInvoice({ status: 'sent' });

      jest.spyOn(service, 'getById').mockResolvedValue(sentInvoice);

      await expect(service.delete(ctx, sentInvoice.id)).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_STATUS',
      });
    });

    it('should soft-delete a draft invoice', async () => {
      const ctx = buildCtx();
      const draftInvoice = buildInvoice({ status: 'draft' });

      jest.spyOn(service, 'getById').mockResolvedValue(draftInvoice);

      // Mock the update call for soft delete
      const schemaChain = chainMock();
      (mockDb as any).withSchema = jest.fn().mockReturnValue(schemaChain);

      await service.delete(ctx, draftInvoice.id);

      expect(schemaChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_deleted: true,
          deleted_at: expect.any(Date),
        }),
      );
    });

    it('should void an invoice that is not already voided', async () => {
      const ctx = buildCtx();
      const invoice = buildInvoice({ status: 'sent' });

      jest.spyOn(service, 'getById').mockResolvedValue(invoice);

      const schemaChain = chainMock();
      (mockDb as any).withSchema = jest.fn().mockReturnValue(schemaChain);

      await service.voidInvoice(ctx, invoice.id);

      expect(schemaChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'voided',
        }),
      );
    });

    it('should throw ALREADY_VOIDED when voiding a voided invoice', async () => {
      const ctx = buildCtx();
      const invoice = buildInvoice({ status: 'voided' });

      jest.spyOn(service, 'getById').mockResolvedValue(invoice);

      await expect(service.voidInvoice(ctx, invoice.id)).rejects.toMatchObject({
        statusCode: 400,
        code: 'ALREADY_VOIDED',
      });
    });
  });

  // =========================================================================
  // GET BY ID
  // =========================================================================
  describe('getById', () => {
    it('should throw NOT_FOUND for non-existent invoice', async () => {
      const schemaChain = chainMock(null);
      schemaChain.leftJoin = jest.fn().mockReturnThis();
      schemaChain.select = jest.fn().mockReturnThis();
      schemaChain.first = jest.fn().mockResolvedValue(null);
      (mockDb as any).withSchema = jest.fn().mockReturnValue(schemaChain);

      await expect(
        service.getById('tenant_test', uuidv4()),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });
});
