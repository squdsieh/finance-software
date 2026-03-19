import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { createAuditLog } from '../../utils/audit';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class BillsService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('bills')
      .leftJoin(`${schema}.vendors`, 'vendors.id', 'bills.vendor_id')
      .where({ 'bills.is_deleted': false })
      .select('bills.*', 'vendors.display_name as vendor_name');

    if (options.status) query = query.where({ 'bills.status': options.status });
    if (options.vendorId) query = query.where({ 'bills.vendor_id': options.vendorId });

    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'bills.bill_date', sortOrder: 'desc',
    });
  }

  async getById(schema: string, id: string) {
    const bill = await this.db.withSchema(schema).table('bills')
      .where({ id, is_deleted: false }).first();
    if (!bill) throw new AppError('Bill not found', 404, 'NOT_FOUND');

    const lineItems = await this.db.withSchema(schema).table('bill_line_items')
      .where({ bill_id: id }).orderBy('sort_order', 'asc');

    return { ...bill, lineItems };
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    const tenant = await this.db('public.tenants').where({ id: ctx.tenantId }).first();
    const settings = tenant.settings || {};
    const prefix = settings.billPrefix || 'BILL-';
    const nextNum = settings.billNextNumber || 1;

    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);

    const lineItems = (data.lineItems || []).map((item: any, index: number) => {
      const amount = new Decimal(item.amount);
      subtotal = subtotal.plus(amount);
      const tax = item.taxCodeId ? amount.times('0.05') : new Decimal(0);
      totalTax = totalTax.plus(tax);

      return {
        id: uuidv4(), bill_id: id, account_id: item.accountId,
        description: item.description, amount: item.amount,
        tax_code_id: item.taxCodeId, tax_amount: tax.toFixed(2),
        customer_id: item.customerId, project_id: item.projectId,
        sort_order: index,
      };
    });

    const totalAmount = subtotal.plus(totalTax);

    await this.db.transaction(async (trx) => {
      await trx.withSchema(ctx.tenantSchema).table('bills').insert({
        id,
        bill_number: data.billNumber || `${prefix}${String(nextNum).padStart(4, '0')}`,
        vendor_id: data.vendorId,
        bill_date: data.billDate,
        due_date: data.dueDate,
        terms: data.terms,
        subtotal: subtotal.toFixed(2),
        tax_amount: totalTax.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        balance_due: totalAmount.toFixed(2),
        memo: data.memo,
        purchase_order_id: data.purchaseOrderId,
        project_id: data.projectId,
        class_id: data.classId,
        location_id: data.locationId,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });

      if (lineItems.length > 0) {
        await trx.withSchema(ctx.tenantSchema).table('bill_line_items').insert(lineItems);
      }

      await trx('public.tenants').where({ id: ctx.tenantId }).update({
        settings: this.db.raw(`settings || '{"billNextNumber": ${nextNum + 1}}'::jsonb`),
      });
    });

    return this.getById(ctx.tenantSchema, id);
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.dueDate) updates.due_date = data.dueDate;
    if (data.memo !== undefined) updates.memo = data.memo;

    await this.db.withSchema(ctx.tenantSchema).table('bills').where({ id }).update(updates);
    return this.getById(ctx.tenantSchema, id);
  }

  async delete(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('bills').where({ id }).update({
      is_deleted: true, deleted_at: new Date(), updated_by: ctx.userId,
    });
  }

  async recordPayment(ctx: ServiceContext, billId: string, data: any) {
    const bill = await this.getById(ctx.tenantSchema, billId);
    const paymentAmount = new Decimal(data.amount);
    const currentBalance = new Decimal(bill.balance_due);

    if (paymentAmount.greaterThan(currentBalance)) {
      throw new AppError('Payment exceeds balance', 400, 'OVERPAYMENT');
    }

    const newBalance = currentBalance.minus(paymentAmount);
    const newStatus = newBalance.isZero() ? 'paid' : 'partially_paid';
    const paymentId = uuidv4();

    await this.db.transaction(async (trx) => {
      await trx.withSchema(ctx.tenantSchema).table('bill_payments').insert({
        id: paymentId, vendor_id: bill.vendor_id, payment_date: data.paymentDate,
        amount: data.amount, payment_method: data.paymentMethod,
        reference_number: data.referenceNumber, account_id: data.accountId,
        memo: data.memo, created_by: ctx.userId, updated_by: ctx.userId,
      });

      await trx.withSchema(ctx.tenantSchema).table('bill_payment_allocations').insert({
        id: uuidv4(), bill_payment_id: paymentId, bill_id: billId, amount: data.amount,
      });

      await trx.withSchema(ctx.tenantSchema).table('bills').where({ id: billId }).update({
        amount_paid: new Decimal(bill.amount_paid).plus(paymentAmount).toFixed(2),
        balance_due: newBalance.toFixed(2),
        status: newStatus, updated_at: new Date(),
      });
    });

    return { id: paymentId, status: newStatus };
  }

  async approve(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('bills').where({ id }).update({
      approval_status: 'approved', approved_by: ctx.userId,
      approved_at: new Date(), updated_at: new Date(),
    });
  }

  async voidBill(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('bills').where({ id }).update({
      status: 'voided', updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async listPurchaseOrders(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('purchase_orders')
      .where({ is_deleted: false });
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'po_date', sortOrder: 'desc',
    });
  }

  async createPurchaseOrder(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    const tenant = await this.db('public.tenants').where({ id: ctx.tenantId }).first();
    const settings = tenant.settings || {};
    const prefix = settings.poPrefix || 'PO-';
    const nextNum = settings.poNextNumber || 1;

    await this.db.withSchema(ctx.tenantSchema).table('purchase_orders').insert({
      id,
      po_number: `${prefix}${String(nextNum).padStart(4, '0')}`,
      vendor_id: data.vendorId,
      po_date: data.poDate,
      expected_delivery_date: data.expectedDeliveryDate,
      shipping_terms: data.shippingTerms,
      total_amount: data.totalAmount || 0,
      memo: data.memo,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });

    await this.db('public.tenants').where({ id: ctx.tenantId }).update({
      settings: this.db.raw(`settings || '{"poNextNumber": ${nextNum + 1}}'::jsonb`),
    });

    return { id };
  }

  async updatePurchaseOrder(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.status) updates.status = data.status;
    if (data.memo !== undefined) updates.memo = data.memo;

    await this.db.withSchema(ctx.tenantSchema).table('purchase_orders').where({ id }).update(updates);
    return { id };
  }

  async convertPOToBill(ctx: ServiceContext, poId: string) {
    const po = await this.db.withSchema(ctx.tenantSchema).table('purchase_orders')
      .where({ id: poId }).first();
    if (!po) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');

    // Create bill from PO
    const billData = {
      vendorId: po.vendor_id,
      billDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purchaseOrderId: poId,
      lineItems: [],
    };

    const bill = await this.create(ctx, billData);

    await this.db.withSchema(ctx.tenantSchema).table('purchase_orders').where({ id: poId }).update({
      status: 'received', updated_at: new Date(),
    });

    return bill;
  }
}
