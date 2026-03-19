import { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, Download, Send, Eye, ArrowRightCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { estimatesApi } from '../services/api';
import toast from 'react-hot-toast';

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: number;
}

interface EstimateForm {
  customerName: string;
  estimateDate: string;
  expiryDate: string;
  lineItems: LineItem[];
  notes: string;
  terms: string;
}

const emptyLineItem: LineItem = { description: '', quantity: '1', unitPrice: '0', amount: 0 };

const emptyForm: EstimateForm = {
  customerName: '',
  estimateDate: new Date().toISOString().split('T')[0],
  expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  lineItems: [{ ...emptyLineItem }],
  notes: '',
  terms: 'Valid for 30 days',
};

const statusVariants: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
  converted: 'success',
};

export function EstimatesPage() {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<EstimateForm>(emptyForm);

  const fetchEstimates = async (page = 1) => {
    setLoading(true);
    try {
      const res = await estimatesApi.list({ page, limit: 25, search, status: statusFilter !== 'all' ? statusFilter : undefined });
      setEstimates(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to load estimates');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEstimates();
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
      await estimatesApi.create({
        customer_name: form.customerName,
        estimate_date: form.estimateDate,
        expiry_date: form.expiryDate,
        line_items: form.lineItems.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unitPrice) || 0,
          amount: item.amount,
        })),
        notes: form.notes,
        terms: form.terms,
      });
      toast.success('Estimate created');
      setShowCreate(false);
      setForm(emptyForm);
      fetchEstimates();
    } catch {
      toast.error('Failed to create estimate');
    }
  };

  const handleSend = async (id: string) => {
    try {
      await estimatesApi.send(id);
      toast.success('Estimate sent');
      fetchEstimates();
    } catch {
      toast.error('Failed to send estimate');
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await estimatesApi.accept(id);
      toast.success('Estimate accepted');
      fetchEstimates();
    } catch {
      toast.error('Failed to accept estimate');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await estimatesApi.reject(id);
      toast.success('Estimate rejected');
      fetchEstimates();
    } catch {
      toast.error('Failed to reject estimate');
    }
  };

  const handleConvert = async (id: string) => {
    try {
      await estimatesApi.convert(id);
      toast.success('Estimate converted to invoice');
      fetchEstimates();
    } catch {
      toast.error('Failed to convert estimate');
    }
  };

  const statuses = ['all', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'];

  const columns = [
    {
      key: 'estimate_number',
      header: 'Estimate #',
      render: (est: any) => <span className="font-medium text-primary-600">{est.estimate_number}</span>,
    },
    { key: 'customer_name', header: 'Customer' },
    {
      key: 'estimate_date',
      header: 'Date',
      render: (est: any) => new Date(est.estimate_date).toLocaleDateString(),
    },
    {
      key: 'expiry_date',
      header: 'Expiry Date',
      render: (est: any) => {
        const expiry = new Date(est.expiry_date);
        const isExpired = est.status === 'sent' && expiry < new Date();
        return (
          <span className={isExpired ? 'text-red-600 font-medium' : ''}>
            {expiry.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'total_amount',
      header: 'Amount',
      render: (est: any) => `AED ${parseFloat(est.total_amount || 0).toFixed(2)}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (est: any) => (
        <Badge variant={statusVariants[est.status] || 'default'}>
          {est.status?.charAt(0).toUpperCase() + est.status?.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (est: any) => (
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
            <Eye size={16} className="text-gray-500" />
          </button>
          {est.status === 'draft' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSend(est.id); }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Send"
            >
              <Send size={16} className="text-blue-500" />
            </button>
          )}
          {est.status === 'sent' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleAccept(est.id); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="Accept"
              >
                <CheckCircle size={16} className="text-green-500" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleReject(est.id); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="Reject"
              >
                <XCircle size={16} className="text-red-500" />
              </button>
            </>
          )}
          {est.status === 'accepted' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleConvert(est.id); }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Convert to Invoice"
            >
              <ArrowRightCircle size={16} className="text-green-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estimates</h1>
          <p className="text-gray-500 mt-1">Create and manage quotes and proposals for your customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-1" /> Export
          </Button>
          <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
            <Plus size={16} className="mr-1" /> New Estimate
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
              placeholder="Search estimates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <Table columns={columns} data={estimates} loading={loading} emptyMessage="No estimates yet. Create your first estimate!" />
        {pagination.totalPages > 1 && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={fetchEstimates}
          />
        )}
      </Card>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Estimate"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Estimate</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Customer"
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Customer name"
            />
            <Input
              label="Estimate Date"
              type="date"
              value={form.estimateDate}
              onChange={(e) => setForm({ ...form, estimateDate: e.target.value })}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-24">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-32">Unit Price</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-32">Amount</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {form.lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="Item description"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(i, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium">AED {item.amount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeLineItem(i)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                          disabled={form.lineItems.length <= 1}
                        >
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
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="font-bold text-gray-900 dark:text-white">AED {getSubtotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Notes visible to customer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terms</label>
              <textarea
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Terms and conditions"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
