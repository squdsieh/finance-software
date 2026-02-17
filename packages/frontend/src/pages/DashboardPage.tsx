import { StatsCard } from '../components/common/StatsCard';
import { Card } from '../components/common/Card';
import { DollarSign, FileText, Receipt, TrendingUp, Users, AlertTriangle } from 'lucide-react';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's an overview of your finances.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Revenue" value="AED 125,430.00" change="+12.5% from last month" changeType="positive" icon={DollarSign} />
        <StatsCard title="Outstanding Invoices" value="AED 45,230.00" change="8 invoices pending" changeType="neutral" icon={FileText} />
        <StatsCard title="Overdue Bills" value="AED 12,800.00" change="3 bills overdue" changeType="negative" icon={Receipt} />
        <StatsCard title="Net Income" value="AED 67,200.00" change="+8.2% from last month" changeType="positive" icon={TrendingUp} />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card title="Recent Invoices" subtitle="Latest invoicing activity">
          <div className="space-y-3">
            {[
              { number: 'INV-0042', customer: 'Acme Corp', amount: 'AED 5,200.00', status: 'Sent' },
              { number: 'INV-0041', customer: 'Tech Solutions', amount: 'AED 3,800.00', status: 'Paid' },
              { number: 'INV-0040', customer: 'Global Trading', amount: 'AED 12,500.00', status: 'Overdue' },
              { number: 'INV-0039', customer: 'Digital Agency', amount: 'AED 7,100.00', status: 'Draft' },
            ].map((inv) => (
              <div key={inv.number} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.number}</p>
                  <p className="text-xs text-gray-500">{inv.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{inv.amount}</p>
                  <p className={`text-xs ${inv.status === 'Paid' ? 'text-green-600' : inv.status === 'Overdue' ? 'text-red-600' : 'text-gray-500'}`}>
                    {inv.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions & Alerts */}
        <Card title="Alerts & Reminders">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle size={20} className="text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">3 invoices overdue</p>
                <p className="text-xs text-yellow-600">Total: AED 15,300.00 - Send reminders</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Receipt size={20} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">5 bills due this week</p>
                <p className="text-xs text-blue-600">Total: AED 8,400.00 - Review and pay</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Users size={20} className="text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">2 new customers this week</p>
                <p className="text-xs text-green-600">Complete their profiles</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bank Accounts Summary */}
      <Card title="Bank Accounts" subtitle="Connected account balances">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Business Checking', bank: 'Emirates NBD', balance: 'AED 89,450.00' },
            { name: 'Business Savings', bank: 'ADCB', balance: 'AED 250,000.00' },
            { name: 'Credit Card', bank: 'Mashreq', balance: '-AED 4,200.00' },
          ].map((acc) => (
            <div key={acc.name} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{acc.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{acc.bank}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">{acc.balance}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
