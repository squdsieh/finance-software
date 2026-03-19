import { useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Plus, Users, DollarSign, Calendar, PlayCircle, CheckCircle, Clock } from 'lucide-react';

export function PayrollPage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'payruns'>('employees');

  const employees = [
    { name: 'Ahmed Al Maktoum', position: 'Software Engineer', department: 'Engineering', salary: 25000, status: 'active' },
    { name: 'Sara Hassan', position: 'Marketing Manager', department: 'Marketing', salary: 20000, status: 'active' },
    { name: 'Raj Patel', position: 'Financial Analyst', department: 'Finance', salary: 18000, status: 'active' },
    { name: 'Maria Santos', position: 'HR Specialist', department: 'Human Resources', salary: 16000, status: 'active' },
    { name: 'John Smith', position: 'Sales Executive', department: 'Sales', salary: 15000, status: 'on_leave' },
  ];

  const payRuns = [
    { period: 'February 2026', status: 'draft', employees: 5, grossPay: 94000, netPay: 82460, dueDate: '2026-02-28' },
    { period: 'January 2026', status: 'completed', employees: 5, grossPay: 94000, netPay: 82460, dueDate: '2026-01-31' },
    { period: 'December 2025', status: 'completed', employees: 4, grossPay: 79000, netPay: 69520, dueDate: '2025-12-31' },
  ];

  const statusIcons: Record<string, any> = { draft: Clock, processing: PlayCircle, completed: CheckCircle };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payroll</h1>
          <p className="text-gray-500 mt-1">Manage employees, salaries, and pay runs</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'employees' ? (
            <Button><Plus size={16} className="mr-1" /> Add Employee</Button>
          ) : (
            <Button><PlayCircle size={16} className="mr-1" /> New Pay Run</Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Users size={16} /> Total Employees</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{employees.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><DollarSign size={16} /> Monthly Payroll</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">AED 94,000</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Calendar size={16} /> Next Pay Date</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Feb 28</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><CheckCircle size={16} /> YTD Paid</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">AED 176,460</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('employees')} className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'employees' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`}>Employees</button>
        <button onClick={() => setActiveTab('payruns')} className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'payruns' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`}>Pay Runs</button>
      </div>

      {activeTab === 'employees' ? (
        <Card padding={false}>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <div className="grid grid-cols-6 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-2">Employee</div>
              <div>Department</div>
              <div>Position</div>
              <div className="text-right">Monthly Salary</div>
              <div className="text-center">Status</div>
            </div>
            {employees.map((emp) => (
              <div key={emp.name} className="grid grid-cols-6 gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium">
                    {emp.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</span>
                </div>
                <div className="text-sm text-gray-500 flex items-center">{emp.department}</div>
                <div className="text-sm text-gray-500 flex items-center">{emp.position}</div>
                <div className="text-sm font-medium text-right flex items-center justify-end">AED {emp.salary.toLocaleString()}</div>
                <div className="flex items-center justify-center">
                  <Badge variant={emp.status === 'active' ? 'success' : 'warning'}>{emp.status === 'active' ? 'Active' : 'On Leave'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {payRuns.map((run) => {
            const StatusIcon = statusIcons[run.status] || Clock;
            return (
              <Card key={run.period}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${run.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                      <StatusIcon size={24} className={run.status === 'completed' ? 'text-green-600' : 'text-yellow-600'} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{run.period}</h3>
                      <p className="text-sm text-gray-500">{run.employees} employees &middot; Due {run.dueDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Gross Pay</p>
                      <p className="font-medium">AED {run.grossPay.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Net Pay</p>
                      <p className="font-medium">AED {run.netPay.toLocaleString()}</p>
                    </div>
                    <Badge variant={run.status === 'completed' ? 'success' : 'warning'}>
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
