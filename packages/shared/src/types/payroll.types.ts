import { BaseEntity, Address } from './common.types';

export type EmploymentType = 'full_time' | 'part_time' | 'contractor';
export type PayType = 'hourly' | 'salary';
export type PaySchedule = 'weekly' | 'bi_weekly' | 'semi_monthly' | 'monthly';
export type EmployeeStatus = 'active' | 'on_leave' | 'terminated';

export interface Employee extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  nationalId?: string;
  address?: Address;
  hireDate: string;
  terminationDate?: string;
  terminationReason?: string;
  employmentType: EmploymentType;
  department?: string;
  position?: string;
  managerId?: string;
  payType: PayType;
  payRate: string;
  paySchedule: PaySchedule;
  status: EmployeeStatus;
  filingStatus?: string;
  allowances?: number;
  directDepositAccounts?: DirectDepositAccount[];
  userId?: string;
  ptoBalance: string;
  ptoAccrualRate: string;
  ptoMaxBalance: string;
}

export interface DirectDepositAccount {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  amount?: string;
  percentage?: string;
  isPrimary: boolean;
}

export interface PayRun extends BaseEntity {
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  paySchedule: PaySchedule;
  status: 'draft' | 'processing' | 'approved' | 'paid' | 'voided';
  items: PayRunItem[];
  totalGrossPay: string;
  totalDeductions: string;
  totalNetPay: string;
  totalEmployerTaxes: string;
  totalEmployerCosts: string;
  journalEntryId?: string;
  processedAt?: string;
  processedBy?: string;
}

export interface PayRunItem {
  id: string;
  employeeId: string;
  employeeName: string;
  regularHours: string;
  overtimeHours: string;
  regularPay: string;
  overtimePay: string;
  bonusPay: string;
  commissionPay: string;
  reimbursements: string;
  grossPay: string;
  federalTax: string;
  stateTax: string;
  socialSecurity: string;
  medicare: string;
  otherTaxes: string;
  preTaxDeductions: string;
  postTaxDeductions: string;
  totalDeductions: string;
  netPay: string;
  employerSocialSecurity: string;
  employerMedicare: string;
  employerUnemployment: string;
  employerOtherTaxes: string;
  totalEmployerCosts: string;
}
