import { BaseEntity } from './common.types';

export type BankAccountType = 'checking' | 'savings' | 'credit_card' | 'money_market' | 'line_of_credit' | 'loan' | 'paypal' | 'other';

export interface BankAccount extends BaseEntity {
  name: string;
  accountType: BankAccountType;
  accountNumber?: string;
  routingNumber?: string;
  institutionName?: string;
  currentBalance: string;
  currency: string;
  isConnected: boolean;
  plaidItemId?: string;
  plaidAccountId?: string;
  lastSyncAt?: string;
  chartAccountId: string;
  isActive: boolean;
}

export type BankTransactionStatus = 'matched' | 'categorized' | 'uncategorized' | 'excluded';

export interface BankTransaction extends BaseEntity {
  bankAccountId: string;
  date: string;
  description: string;
  amount: string;
  type: 'debit' | 'credit';
  status: BankTransactionStatus;
  matchedTransactionId?: string;
  matchedTransactionType?: string;
  matchConfidence?: 'high' | 'medium' | 'low';
  categoryAccountId?: string;
  vendorId?: string;
  customerId?: string;
  classId?: string;
  locationId?: string;
  plaidTransactionId?: string;
  isReconciled: boolean;
  reconciledAt?: string;
  memo?: string;
}

export interface BankRule extends BaseEntity {
  name: string;
  priority: number;
  conditions: BankRuleCondition[];
  actions: BankRuleAction;
  autoConfirm: boolean;
  isActive: boolean;
}

export interface BankRuleCondition {
  field: 'description' | 'amount';
  operator: 'contains' | 'equals' | 'starts_with' | 'greater_than' | 'less_than' | 'between';
  value: string;
  value2?: string;
}

export interface BankRuleAction {
  categoryAccountId: string;
  vendorId?: string;
  customerId?: string;
  classId?: string;
  locationId?: string;
}

export interface Reconciliation extends BaseEntity {
  bankAccountId: string;
  statementDate: string;
  statementEndingBalance: string;
  beginningBalance: string;
  clearedDeposits: string;
  clearedPayments: string;
  clearedBalance: string;
  difference: string;
  status: 'in_progress' | 'completed';
  completedAt?: string;
  completedBy?: string;
}

export interface BankDeposit extends BaseEntity {
  bankAccountId: string;
  depositDate: string;
  totalAmount: string;
  memo?: string;
  paymentIds: string[];
}
