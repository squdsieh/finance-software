import { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { StatsCard } from '../components/common/StatsCard';
import { Plus, Search, Camera, Filter, Receipt, DollarSign, TrendingDown, Calendar, Upload } from 'lucide-react';
import { expensesApi } from '../services/api';
import toast from 'react-hot-toast';

interface ExpenseForm {
  vendorName: string;
  expenseDate: string;
  category: string;
  amount: string;
  description: string;
  isBillable: boolean;
  status: string;
}

const emptyForm: ExpenseForm = {
  vendorName: '',
  expenseDate: new Date().toISOString().split('T')[0],
  category: '',
  amount: '',
  description: '',
  isBillable: false,
  status: 'pending',
};

const categoryOptions = [
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals & Entertainment' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'software', label: 'Software & Subscriptions' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const statusVariants: Record<string, 'default' | 'warning' | 'success' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  reimbursed: 'info',
};

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [summaryData, setSummaryData] = useState({ thisMonth: 0, lastMonth: 0, ytd: 0 });

  const fetchExpenses = async (page = 1) => {
    setLoading(true);
    try {
      const res = await expensesApi.list({
        page,
        limit: 25,
        search,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      setExpenses(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
      if (res.data.summary) {
        setSummaryData(res.data.summary);
      }
    } catch {
      toast.error('Failed to load expenses');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [search, dateFrom, dateTo, categoryFilter, statusFilter]);

  const handleCreate = async () => {
    try {
      await expensesApi.create({
        vendor_name: form.vendorName,
        expense_date: form.expenseDate,
        category: form.category,
        amount: parseFloat(form.amount) || 0,
        description: form.description,
        is_billable: form.isBillable,
        status: form.status,
      });
      toast.success('Expense created');
      setShowCreate(false);
      setForm(emptyForm);
      fetchExpenses();
    } catch {
      toast.error('Failed to create expense');
    }
  };

  const handleScanReceipt = async () => {
    toast.success('Receipt scanner opened');
  };

  const columns = [
    {
      key: 'expense_date',
      header: 'Date',
      render: (e: any) => new Date(e.expense_date).toLocaleDateString(),
    },
    {
      key: 'vendor_name',
      header: 'Vendor / Payee',
      render: (e: any) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{e.vendor_name || 'Unknown'}</p>
          {e.description && <p className="text-xs text-gray-500 truncate max-w-xs">{e.description}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (e: any) => (
        <div className="flex items-center gap-2">
          <Receipt size={14} className="text-gray-400" />
          <span>{e.category_name || e.category || 'Uncategorized'}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (e: any) => (
        <span className="font-medium">AED {parseFloat(e.amount || 0).toFixed(2)}</span>
      ),
    },
    {
      key: 'has_receipt',
      header: 'Receipt',
      render: (e: any) =>
        e.receipt_url ? (
          <Badge variant="success">Attached</Badge>
        ) : (
          <Badge variant="default">None</Badge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e: any) => {
        const status = e.status || 'pending';
        return (
          <Badge variant={statusVariants[status] || 'default'}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-500 mt-1">Track and categorize your business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleScanReceipt}>
            <Camera size={16} className="mr-1" /> Scan Receipt
          </Button>
          <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
            <Plus size={16} className="mr-1" /> New Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="This Month"
          value={`AED ${summaryData.thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Last Month"
          value={`AED ${summaryData.lastMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
        />
        <StatsCard
          title="Year to Date"
          value={`AED ${summaryData.ytd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={Calendar}
        />
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={16} className="mr-1" /> Filters
            </Button>
          </div>
          {showFilters && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                label="From Date"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                label="To Date"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              <Select
                label="Category"
                options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
              <Select
                label="Status"
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'reimbursed', label: 'Reimbursed' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
          )}
        </div>
        <Table columns={columns} data={expenses} loading={loading} emptyMessage="No expenses recorded. Track your first expense!" />
        {pagination.totalPages > 1 && (
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={fetchExpenses} />
        )}
      </Card>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Expense"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Expense</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Vendor / Payee"
              required
              value={form.vendorName}
              onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
              placeholder="Who was the expense for?"
            />
            <Input
              label="Date"
              type="date"
              required
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              required
              options={categoryOptions}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Select category"
            />
            <Input
              label="Amount"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What was this expense for?"
          />
          <Select
            label="Status"
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'reimbursed', label: 'Reimbursed' },
            ]}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isBillable}
              onChange={(e) => setForm({ ...form, isBillable: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Billable expense</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Drag and drop a receipt image, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, PDF up to 10MB</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
