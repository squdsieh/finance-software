import { Card } from '../components/common/Card';
import {
  BarChart3, PieChart, TrendingUp, FileText, DollarSign,
  Receipt, Users, Building2, Calendar, ArrowRight, BookOpen, Scale
} from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  icon: any;
  category: string;
}

const reports: ReportCard[] = [
  { title: 'Profit & Loss', description: 'Revenue, expenses, and net income for a period', icon: TrendingUp, category: 'Financial Statements' },
  { title: 'Balance Sheet', description: 'Assets, liabilities, and equity at a point in time', icon: Scale, category: 'Financial Statements' },
  { title: 'Cash Flow Statement', description: 'Cash inflows and outflows by activity', icon: DollarSign, category: 'Financial Statements' },
  { title: 'Trial Balance', description: 'Debit and credit balances for all accounts', icon: BookOpen, category: 'Financial Statements' },
  { title: 'General Ledger', description: 'Detailed transactions for all accounts', icon: FileText, category: 'Financial Statements' },
  { title: 'Accounts Receivable Aging', description: 'Outstanding customer invoices by age', icon: Users, category: 'Receivables' },
  { title: 'Customer Statement', description: 'Transaction history for a specific customer', icon: Users, category: 'Receivables' },
  { title: 'Invoice Summary', description: 'Overview of all invoices by status', icon: FileText, category: 'Receivables' },
  { title: 'Accounts Payable Aging', description: 'Outstanding vendor bills by age', icon: Receipt, category: 'Payables' },
  { title: 'Vendor Statement', description: 'Transaction history for a specific vendor', icon: Building2, category: 'Payables' },
  { title: 'Expense Report', description: 'Expenses broken down by category', icon: Receipt, category: 'Expenses' },
  { title: 'Sales Tax Report', description: 'VAT collected and paid summary', icon: PieChart, category: 'Tax' },
  { title: 'Tax Return Summary', description: 'Data for VAT return filing', icon: Calendar, category: 'Tax' },
  { title: 'Budget vs Actual', description: 'Compare actual results to budgeted amounts', icon: BarChart3, category: 'Budgeting' },
  { title: 'Payroll Summary', description: 'Employee compensation and deductions', icon: DollarSign, category: 'Payroll' },
  { title: 'Inventory Valuation', description: 'Current stock value and movement', icon: BarChart3, category: 'Inventory' },
];

export function ReportsPage() {
  const categories = [...new Set(reports.map(r => r.category))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-gray-500 mt-1">Generate financial reports and gain insights into your business</p>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.filter(r => r.category === category).map((report) => {
              const Icon = report.icon;
              return (
                <button key={report.title} className="text-left group">
                  <Card>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg shrink-0">
                        <Icon size={20} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{report.title}</h3>
                          <ArrowRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors shrink-0" />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
