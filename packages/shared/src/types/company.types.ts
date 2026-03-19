import { Address } from './common.types';

export type AccountingMethod = 'cash' | 'accrual';

export type FiscalYearMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Tenant {
  id: string;
  companyName: string;
  legalName?: string;
  industry: string;
  address: Address;
  phone?: string;
  email: string;
  website?: string;
  logoUrl?: string;
  fiscalYearStartMonth: FiscalYearMonth;
  accountingMethod: AccountingMethod;
  homeCurrency: string;
  dateFormat: string;
  numberFormat: {
    thousandSeparator: string;
    decimalSeparator: string;
  };
  taxRegistrationNumber?: string;
  schemaName: string;
  subscriptionId?: string;
  isActive: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  enforceMfa: boolean;
  idleTimeout: number;
  closingDate?: string;
  closingDatePassword?: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  estimatePrefix: string;
  estimateNextNumber: number;
  billPrefix: string;
  billNextNumber: number;
  journalEntryPrefix: string;
  journalEntryNextNumber: number;
  poPrefix: string;
  poNextNumber: number;
  defaultPaymentTerms: string;
  lateFeeEnabled: boolean;
  lateFeeType: 'percentage' | 'fixed';
  lateFeeAmount: string;
  lateFeeGracePeriod: number;
  reminderEnabled: boolean;
  reminderSchedule: number[];
  enableClasses: boolean;
  enableLocations: boolean;
  enableProjects: boolean;
  enableTimeTracking: boolean;
  enableInventory: boolean;
  enableBudgets: boolean;
  enableMultiCurrency: boolean;
  enablePurchaseOrders: boolean;
}

export interface OnboardingStep {
  step: number;
  name: string;
  completed: boolean;
}

export type Industry =
  | 'professional_services' | 'retail' | 'manufacturing' | 'construction'
  | 'technology' | 'nonprofit' | 'healthcare' | 'real_estate'
  | 'food_beverage' | 'transportation' | 'education' | 'agriculture'
  | 'hospitality' | 'media' | 'consulting' | 'other';
