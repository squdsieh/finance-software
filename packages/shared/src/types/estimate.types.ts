import { BaseEntity, Attachment } from './common.types';
import { InvoiceLineItem } from './invoice.types';

export type EstimateStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface Estimate extends BaseEntity {
  estimateNumber: string;
  customerId: string;
  customerName: string;
  estimateDate: string;
  expirationDate: string;
  status: EstimateStatus;
  currency: string;
  exchangeRate: string;
  lineItems: InvoiceLineItem[];
  subtotal: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  memo?: string;
  privateNotes?: string;
  attachments: Attachment[];
  acceptanceSignature?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  convertedInvoiceId?: string;
  projectId?: string;
  classId?: string;
  locationId?: string;
}
