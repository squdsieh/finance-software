import { useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Plus, Calendar, TrendingUp, TrendingDown, BarChart3, DollarSign } from 'lucide-react';

export function BudgetsPage() {
  const [selectedYear, setSelectedYear] = useState('2026');

  const budgets = [
    { category: 'Revenue', budgeted: 1500000, actual: 250860, variance: 'on_track', monthlyBudget: 125000 },
    { category: 'Cost of Goods Sold', budgeted: 600000, actual: 98400, variance: 'under', monthlyBudget: 50000 },
    { category: 'Salaries & Wages', budgeted: 480000, actual: 82460, variance: 'on_track', monthlyBudget: 40000 },
    { category: 'Rent & Utilities', budgeted: 120000, actual: 21500, variance: 'over', monthlyBudget: 10000 },
    { category: 'Marketing', budgeted: 60000, actual: 12800, variance: 'over', monthlyBudget: 5000 },
    { category: 'Office Supplies', budgeted: 24000, actual: 3200, variance: 'under', monthlyBudget: 2000 },
    { category: 'Travel & Entertainment', budgeted: 36000, actual: 4500, variance: 'under', monthlyBudget: 3000 },
    { category: 'Professional Services', budgeted: 48000, actual: 8000, variance: 'on_track', monthlyBudget: 4000 },
  ];

  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalActual = budgets.reduce((s, b) => s + b.actual, 0);

  const varianceConfig: Record<string, { variant: string; label: string; icon: any }> = {
    on_track: { variant: 'success', label: 'On Track', icon: TrendingUp },
    over: { variant: 'danger', label: 'Over Budget', icon: TrendingUp },
    under: { variant: 'info', label: 'Under Budget', icon: TrendingDown },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="text-gray-500 mt-1">Plan and track your annual budgets against actual spending</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
          >
            <option value="2026">FY 2026</option>
            <option value="2025">FY 2025</option>
          </select>
          <Button><Plus size={16} className="mr-1" /> New Budget</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><DollarSign size={16} /> Total Budgeted</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">AED {(totalBudgeted / 1000).toFixed(0)}K</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><BarChart3 size={16} /> YTD Actual</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">AED {(totalActual / 1000).toFixed(0)}K</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Calendar size={16} /> Period</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Feb 2026</p>
          <p className="text-xs text-gray-500 mt-1">2 of 12 months</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/10">
          <div className="flex items-center gap-2 text-green-600 text-sm"><TrendingDown size={16} /> Under Budget</div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">AED {((totalBudgeted / 6 - totalActual) / 1000).toFixed(0)}K</p>
          <p className="text-xs text-green-500 mt-1">vs. pro-rated budget</p>
        </div>
      </div>

      {/* Budget Lines */}
      <Card padding={false}>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <div className="grid grid-cols-7 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 uppercase">
            <div className="col-span-2">Category</div>
            <div className="text-right">Annual Budget</div>
            <div className="text-right">Monthly Budget</div>
            <div className="text-right">YTD Actual</div>
            <div className="text-right">Variance</div>
            <div className="text-center">Status</div>
          </div>
          {budgets.map((budget) => {
            const config = varianceConfig[budget.variance];
            const ytdBudget = budget.monthlyBudget * 2; // 2 months into year
            const variance = ytdBudget - budget.actual;
            const pctUsed = (budget.actual / budget.budgeted) * 100;
            return (
              <div key={budget.category} className="grid grid-cols-7 gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{budget.category}</p>
                  <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${pctUsed > 20 ? 'bg-red-500' : 'bg-primary-500'}`}
                      style={{ width: `${Math.min(pctUsed, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{pctUsed.toFixed(1)}% used</p>
                </div>
                <div className="text-sm text-right font-medium flex items-center justify-end">AED {budget.budgeted.toLocaleString()}</div>
                <div className="text-sm text-right text-gray-500 flex items-center justify-end">AED {budget.monthlyBudget.toLocaleString()}</div>
                <div className="text-sm text-right font-medium flex items-center justify-end">AED {budget.actual.toLocaleString()}</div>
                <div className={`text-sm text-right font-medium flex items-center justify-end ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {variance >= 0 ? '+' : ''}AED {variance.toLocaleString()}
                </div>
                <div className="flex items-center justify-center">
                  <Badge variant={config?.variant as any || 'default'}>{config?.label || budget.variance}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
