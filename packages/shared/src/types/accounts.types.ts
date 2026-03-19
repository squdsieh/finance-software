import { BaseEntity } from './common.types';

export type AccountType =
  | 'current_assets' | 'fixed_assets' | 'other_assets'
  | 'current_liabilities' | 'long_term_liabilities'
  | 'equity'
  | 'revenue' | 'cost_of_goods_sold' | 'expenses'
  | 'other_income' | 'other_expenses';

export type AccountCategory = 'assets' | 'liabilities' | 'equity' | 'income' | 'expenses';

export interface Account extends BaseEntity {
  accountNumber?: string;
  name: string;
  type: AccountType;
  detailType: string;
  description?: string;
  currency: string;
  taxCodeId?: string;
  isActive: boolean;
  isSubAccount: boolean;
  parentAccountId?: string;
  isSystemAccount: boolean;
  systemAccountType?: SystemAccountType;
  currentBalance: string;
  children?: Account[];
}

export type SystemAccountType =
  | 'undeposited_funds' | 'opening_balance_equity'
  | 'retained_earnings' | 'accounts_receivable'
  | 'accounts_payable' | 'currency_gain_loss'
  | 'inventory_asset' | 'cost_of_goods_sold';

export interface AccountTemplate {
  accountNumber: string;
  name: string;
  type: AccountType;
  detailType: string;
  isSubAccount: boolean;
  parentName?: string;
}

export interface AccountActivity {
  date: string;
  transactionType: string;
  transactionId: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
}

export interface ChartOfAccountsTemplate {
  industry: string;
  accounts: AccountTemplate[];
}
