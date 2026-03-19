import { z } from 'zod';

export const invoiceLineItemSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1).max(1000),
  quantity: z.string().regex(/^\d+(\.\d{1,4})?$/),
  unitRate: z.string().regex(/^-?\d+(\.\d{1,4})?$/),
  taxCodeId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  poNumber: z.string().max(50).optional(),
  currency: z.string().length(3).optional(),
  exchangeRate: z.string().optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.string().optional(),
  shippingAmount: z.string().default('0'),
  memo: z.string().max(5000).optional(),
  privateNotes: z.string().max(5000).optional(),
  depositAmount: z.string().optional(),
  onlinePaymentEnabled: z.boolean().default(true),
  projectId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
  paymentMethod: z.enum(['cash', 'check', 'credit_card', 'bank_transfer', 'ach', 'paypal', 'other']),
  referenceNumber: z.string().max(50).optional(),
  depositAccountId: z.string().uuid(),
  memo: z.string().max(500).optional(),
});
