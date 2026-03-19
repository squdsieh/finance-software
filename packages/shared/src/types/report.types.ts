export type ReportType =
  | 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'trial_balance'
  | 'general_ledger' | 'journal_report'
  | 'ar_aging_summary' | 'ar_aging_detail' | 'ap_aging_summary' | 'ap_aging_detail'
  | 'sales_by_customer' | 'sales_by_product' | 'expense_by_vendor' | 'expense_by_category'
  | 'tax_liability' | 'tax_summary' | 'vat_return'
  | 'inventory_valuation' | 'stock_status'
  | 'payroll_summary' | 'payroll_detail'
  | 'project_profitability' | 'budget_vs_actual'
  | 'custom';

export interface ReportConfig {
  id?: string;
  name: string;
  reportType: ReportType;
  filters: ReportFilters;
  columns: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  comparisonType?: 'prior_period' | 'prior_year' | 'budget' | 'percentage';
}

export interface ReportFilters {
  dateRange: { startDate: string; endDate: string };
  accountIds?: string[];
  customerIds?: string[];
  vendorIds?: string[];
  classIds?: string[];
  locationIds?: string[];
  projectIds?: string[];
  amountRange?: { min?: string; max?: string };
}

export interface ScheduledReport {
  id: string;
  tenantId: string;
  reportConfigId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'excel';
  nextRunDate: string;
  isActive: boolean;
}

export interface ReportRow {
  label: string;
  values: Record<string, string>;
  isHeader: boolean;
  isTotal: boolean;
  indent: number;
  drillDownId?: string;
  children?: ReportRow[];
}

export interface ReportResult {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: ReportRow[];
  totals: Record<string, string>;
  generatedAt: string;
  filters: ReportFilters;
}
