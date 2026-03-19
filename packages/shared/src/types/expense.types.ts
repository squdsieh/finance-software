import { BaseEntity, PaymentMethod, Attachment } from './common.types';

export interface Expense extends BaseEntity {
  date: string;
  paymentAccountId: string;
  paymentMethod: PaymentMethod;
  vendorId?: string;
  vendorName?: string;
  totalAmount: string;
  currency: string;
  exchangeRate: string;
  memo?: string;
  lineItems: ExpenseLineItem[];
  attachments: Attachment[];
  isBillable: boolean;
  customerId?: string;
  projectId?: string;
  classId?: string;
  locationId?: string;
  ocrData?: OcrResult;
  expenseClaimId?: string;
}

export interface ExpenseLineItem {
  id: string;
  categoryAccountId: string;
  description: string;
  amount: string;
  taxCodeId?: string;
  taxAmount: string;
  isBillable: boolean;
  customerId?: string;
  projectId?: string;
  classId?: string;
  locationId?: string;
  sortOrder: number;
}

export interface OcrResult {
  vendorName?: string;
  date?: string;
  totalAmount?: string;
  suggestedCategory?: string;
  confidence: number;
  rawText: string;
}

export interface MileageEntry extends BaseEntity {
  date: string;
  startLocation: string;
  endLocation: string;
  distance: string;
  unit: 'miles' | 'km';
  ratePerUnit: string;
  totalAmount: string;
  purpose: string;
  vehicle?: string;
  isBillable: boolean;
  customerId?: string;
  projectId?: string;
}

export interface ExpenseClaim extends BaseEntity {
  employeeId: string;
  employeeName: string;
  title: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  expenseIds: string[];
  totalAmount: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  reimbursedAt?: string;
  reimbursementPaymentId?: string;
}
