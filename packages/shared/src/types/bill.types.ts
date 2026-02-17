import { BaseEntity, PaymentMethod, Attachment } from './common.types';

export type BillStatus = 'open' | 'partially_paid' | 'paid' | 'overdue' | 'voided';

export interface Bill extends BaseEntity {
  billNumber: string;
  vendorId: string;
  vendorName: string;
  billDate: string;
  dueDate: string;
  terms?: string;
  status: BillStatus;
  currency: string;
  exchangeRate: string;
  lineItems: BillLineItem[];
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  memo?: string;
  attachments: Attachment[];
  purchaseOrderId?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  approvedBy?: string;
  approvedAt?: string;
  projectId?: string;
  classId?: string;
  locationId?: string;
}

export interface BillLineItem {
  id: string;
  accountId: string;
  description: string;
  amount: string;
  taxCodeId?: string;
  taxAmount: string;
  customerId?: string;
  projectId?: string;
  classId?: string;
  locationId?: string;
  sortOrder: number;
}

export interface BillPayment {
  id: string;
  billId: string;
  paymentDate: string;
  amount: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  accountId: string;
  memo?: string;
  createdAt: string;
}

export interface PurchaseOrder extends BaseEntity {
  poNumber: string;
  vendorId: string;
  vendorName: string;
  poDate: string;
  expectedDeliveryDate?: string;
  shippingTerms?: string;
  status: 'open' | 'partially_received' | 'received' | 'closed' | 'cancelled';
  lineItems: PurchaseOrderLineItem[];
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  memo?: string;
  attachments: Attachment[];
}

export interface PurchaseOrderLineItem {
  id: string;
  productId?: string;
  description: string;
  quantity: string;
  unitRate: string;
  amount: string;
  quantityReceived: string;
  taxCodeId?: string;
  sortOrder: number;
}

export interface BillApprovalWorkflow {
  id: string;
  tenantId: string;
  name: string;
  rules: BillApprovalRule[];
  isActive: boolean;
}

export interface BillApprovalRule {
  id: string;
  minAmount?: string;
  maxAmount?: string;
  vendorCategory?: string;
  expenseCategory?: string;
  approverIds: string[];
  approvalType: 'any' | 'all';
  sortOrder: number;
}
