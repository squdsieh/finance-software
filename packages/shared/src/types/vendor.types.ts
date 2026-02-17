import { BaseEntity, Address, PaymentTerms, PaymentMethod } from './common.types';

export interface Vendor extends BaseEntity {
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
  vendorAccountNumber?: string;
  is1099Eligible: boolean;
  taxId?: string;
  defaultExpenseAccountId?: string;
  businessIdNumber?: string;
  paymentTerms: PaymentTerms;
  customPaymentDays?: number;
  preferredPaymentMethod?: PaymentMethod;
  openingBalance: string;
  openingBalanceDate?: string;
  notes?: string;
  isActive: boolean;
  customFields?: Record<string, string>;
  currentBalance: string;
  overdueBalance: string;
  ytdPayments: string;
}
