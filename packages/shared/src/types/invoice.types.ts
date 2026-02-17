import { BaseEntity, PaymentMethod, Attachment } from './common.types';

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'voided' | 'written_off';

export interface Invoice extends BaseEntity {
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  poNumber?: string;
  status: InvoiceStatus;
  currency: string;
  exchangeRate: string;
  lineItems: InvoiceLineItem[];
  subtotal: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: string;
  discountAmount: string;
  taxAmount: string;
  shippingAmount: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  depositAmount?: string;
  memo?: string;
  privateNotes?: string;
  attachments: Attachment[];
  emailStatus?: 'sent' | 'opened' | 'bounced';
  onlinePaymentEnabled: boolean;
  paymentLink?: string;
  recurringTemplateId?: string;
  estimateId?: string;
  projectId?: string;
  classId?: string;
  locationId?: string;
}

export interface InvoiceLineItem {
  id: string;
  productId?: string;
  description: string;
  quantity: string;
  unitRate: string;
  amount: string;
  taxCodeId?: string;
  taxAmount: string;
  classId?: string;
  locationId?: string;
  projectId?: string;
  sortOrder: number;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  depositAccountId: string;
  memo?: string;
  createdAt: string;
}

export interface RecurringInvoiceTemplate extends BaseEntity {
  customerId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
  occurrencesGenerated: number;
  autoSend: boolean;
  daysBeforeDueDate: number;
  isPaused: boolean;
  nextGenerationDate: string;
  lineItems: InvoiceLineItem[];
  memo?: string;
}

export interface PaymentReminder {
  id: string;
  tenantId: string;
  stage: 'before_due' | 'on_due' | 'overdue';
  daysOffset: number;
  emailTemplateSubject: string;
  emailTemplateBody: string;
  isActive: boolean;
}

export interface LateFeeConfig {
  enabled: boolean;
  type: 'percentage' | 'fixed';
  amount: string;
  gracePeriodDays: number;
  maxFee?: string;
  frequency: 'one_time' | 'recurring';
}
