import { BaseEntity, Address, PaymentTerms, PaymentMethod } from './common.types';

export interface Customer extends BaseEntity {
  displayName: string;
  companyName?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  taxRegistrationNumber?: string;
  paymentTerms: PaymentTerms;
  customPaymentDays?: number;
  preferredPaymentMethod?: PaymentMethod;
  preferredDeliveryMethod: 'email' | 'print' | 'none';
  openingBalance: string;
  openingBalanceDate?: string;
  notes?: string;
  isActive: boolean;
  parentCustomerId?: string;
  customFields?: Record<string, string>;
  currentBalance: string;
  overdueBalance: string;
  creditBalance: string;
  lastPaymentDate?: string;
  ytdRevenue: string;
  totalRevenue: string;
  totalPayments: string;
  transactionCount: number;
  averageDaysToPay: number;
  lastTransactionDate?: string;
}

export interface CustomerStatement {
  customerId: string;
  customerName: string;
  startDate: string;
  endDate: string;
  openingBalance: string;
  transactions: CustomerStatementLine[];
  closingBalance: string;
  agingSummary: AgingBucket[];
}

export interface CustomerStatementLine {
  date: string;
  transactionType: string;
  transactionNumber: string;
  description: string;
  amount: string;
  balance: string;
}

export interface AgingBucket {
  label: string;
  amount: string;
}
