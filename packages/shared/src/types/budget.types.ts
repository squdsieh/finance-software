import { BaseEntity } from './common.types';

export interface Budget extends BaseEntity {
  name: string;
  fiscalYear: number;
  version: string;
  status: 'draft' | 'active' | 'archived';
  classId?: string;
  locationId?: string;
  lines: BudgetLine[];
  totalAmount: string;
}

export interface BudgetLine {
  id: string;
  accountId: string;
  accountName: string;
  months: Record<string, string>;
  annualTotal: string;
}

export interface BudgetVsActual {
  accountId: string;
  accountName: string;
  months: BudgetVsActualMonth[];
  ytdBudget: string;
  ytdActual: string;
  ytdVariance: string;
  ytdVariancePercent: string;
}

export interface BudgetVsActualMonth {
  month: string;
  budget: string;
  actual: string;
  variance: string;
  variancePercent: string;
}
