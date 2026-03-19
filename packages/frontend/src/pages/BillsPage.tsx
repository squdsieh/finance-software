import { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, Download, CreditCard, Copy, Eye, Trash2, MoreHorizontal } from 'lucide-react';
import { billsApi } from '../services/api';
import toast from 'react-hot-toast';

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: number;
  account: string;
}

interface BillForm {
  vendorName: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  lineItems: LineItem[];
  notes: string;
}

const emptyLineItem: LineItem = { description: '', quantity: '1', unitPrice: '0', amount: 0, account: '' };

const emptyForm: BillForm = {
  vendorName: '',
  billNumber: '',
  billDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  lineItems: [{ ...emptyLineItem }],
  notes: '',
};

const statusVariants: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'default',
  received: 'info',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
  void: 'default',
};

export function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<any>(null);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [form, setForm] = useState<BillForm>(emptyForm);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], method: 'bank_transfer', reference: '' });

  const fetchBills = async (page = 1) => {
    setLoading(true);
    try {
      const res = await billsApi.list({ page, limit: 25, search, status: statusFilter !== 'all' ? statusFilter : undefined });
      setBills(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to load bills');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBills();
  }, [search, statusFilter]);

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const items = [...form.lineItems];
    items[index] = { ...items[index], [field]: value };
    const qty = parseFloat(items[index].quantity) || 0;
    const price = parseFloat(items[index].unitPrice) || 0;
    items[index].amount = qty * price;
    setForm({ ...form, lineItems: items });
  };

  const addLineItem = () => {
    setForm({ ...form, lineItems: [...form.lineItems, { ...emptyLineItem }] });
  };

  const removeLineItem = (index: number) => {
    if (form.lineItems.length <= 1) return;
    setForm({ ...form, lineItems: form.lineItems.filter((_, i) => i !== index) });
  };

  const getSubtotal = () => form.lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handleCreate = async () => {
    try {
      await billsApi.create({
        vendor_name: form.vendorName,
        bill_number: form.billNumber,
        bill_date: form.billDate,
        due_date: form.dueDate,
        line_items: form.lineItems.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unitPrice) || 0,
          amount: item.amount,
          account: item.account,
        })),
        notes: form.notes,
      });
      toast.success('Bill created');
      setShowCreate(false);
      setForm(emptyForm);
      fetchBills();
    } catch {
      toast.error('Failed to create bill');
    }
  };

  const handleRecordPayment = async () => {
    if (!showPayment) return;
    try {
      await billsApi.recordPayment(showPayment.id, {
        amount: parseFloat(paymentForm.amount) || 0,
        payment_date: paymentForm.date,
        payment_method: paymentForm.method,
        reference: paymentForm.reference,
      });
      toast.success('Payment recorded');
      setShowPayment(null);
      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'bank_transfer', reference: '' });
      fetchBills();
    } catch {
      toast.error('Failed to record payment');
    }
  };

  const handleDuplicate = async (bill: any) => {
    try {
      await billsApi.create({
        vendor_name: bill.vendor_name,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        total_amount: bill.total_amount,
        notes: bill.notes,
      });
      toast.success('Bill duplicated');
      fetchBills();
    } catch {
      toast.error('Failed to duplicate bill');
    }
    setShowActions(null);
  };

  const statuses = ['all', 'draft', 'received', 'partial', 'paid', 'overdue', 'void'];

  const columns = [
    {
      key: 'bill_number',
      header: 'Bill #',
      render: (b: any) => <span className="font-medium text-primary-600">{b.bill_number}</span>,
    },
    { key: 'vendor_name', header: 'Vendor' },
    {
      key: 'bill_date',
      header: 'Date',
      render: (b: any) => new Date(b.bill_date).toLocaleDateString(),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (b: any) => {
        const due = new Date(b.due_date);
        const isOverdue = b.status !== 'paid' && b.status !== 'void' && due < new Date();
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {due.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'total_amount',
      header: 'Amount',
      render: (b: any) => `AED ${parseFloat(b.total_amount || 0).toFixed(2)}`,
    },
    {
      key: 'balance_due',
      header: 'Balance',
      render: (b: any) => {
        const balance = parseFloat(b.balance_due || 0);
        return (
          <span className={balance > 0 ? 'font-medium' : 'text-gray-500'}>
            AED {balance.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (b: any) => (
        <Badge variant={statusVariants[b.status] || 'default'}>
          {b.status?.charAt(0).toUpperCase() + b.status?.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (b: any) => (
        <div className="relative flex items-center gap-1">
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
            <Eye size={16} className="text-gray-500" />
          </button>
          {b.status !== 'paid' && b.status !== 'void' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPayment(b);
                setPaymentForm({
                  amount: String(b.balance_due || b.total_amount || ''),
                  date: new Date().toISOString().split('T')[0],
                  method: 'bank_transfer',
                  reference: '',
                });
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Record Payment"
            >
              <CreditCard size={16} className="text-green-600" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(showActions === b.id ? null : b.id);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <MoreHorizontal size={16} className="text-gray-500" />
            </button>
            {showActions === b.id && (
              <div className="absolute right-0 top-8 z-10 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(b); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Copy size={14} /> Duplicate
                </button>
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bills</h1>
          <p className="text-gray-500 mt-1">Track bills from vendors and manage accounts payable</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-1" /> Export
          </Button>
          <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
            <Plus size={16} className="mr-1" /> New Bill
          </Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search bills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <Table columns={columns} data={bills} loading={loading} emptyMessage="No bills yet. Record your first bill!" />
        {pagination.totalPages > 1 && (
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={fetchBills} />
        )}
      </Card>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Bill"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Bill</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vendor" required value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Vendor name" />
            <Input label="Bill Number" value={form.billNumber} onChange={(e) => setForm({ ...form, billNumber: e.target.value })} placeholder="e.g. BILL-001" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bill Date" type="date" value={form.billDate} onChange={(e) => setForm({ ...form, billDate: e.target.value })} />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-28">Account</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-28">Price</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">Amount</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {form.lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <input type="text" value={item.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Item description" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.account} onChange={(e) => updateLineItem(i, 'account', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Account" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.quantity} onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500" min="0" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.unitPrice} onChange={(e) => updateLineItem(i, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500" min="0" step="0.01" />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium">AED {item.amount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeLineItem(i)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500" disabled={form.lineItems.length <= 1}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2">
              <Plus size={14} className="mr-1" /> Add Line
            </Button>
          </div>

          <div className="flex justify-end">
            <div className="w-64 text-sm">
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold">AED {getSubtotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Internal notes" />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!showPayment}
        onClose={() => setShowPayment(null)}
        title={`Record Payment - ${showPayment?.bill_number || ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPayment(null)}>Cancel</Button>
            <Button onClick={handleRecordPayment}>Record Payment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bill Total</span>
              <span className="font-medium">AED {parseFloat(showPayment?.total_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">Balance Due</span>
              <span className="font-bold text-gray-900 dark:text-white">AED {parseFloat(showPayment?.balance_due || showPayment?.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
          <Input label="Payment Amount" type="number" step="0.01" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          <Input label="Payment Date" type="date" required value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
          <Select
            label="Payment Method"
            options={[
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cash', label: 'Cash' },
              { value: 'cheque', label: 'Cheque' },
              { value: 'credit_card', label: 'Credit Card' },
            ]}
            value={paymentForm.method}
            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
          />
          <Input label="Reference" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Payment reference" />
        </div>
      </Modal>
    </div>
  );
}
