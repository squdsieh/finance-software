import { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, Download, Upload } from 'lucide-react';
import { customersApi } from '../services/api';
import toast from 'react-hot-toast';

export function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', phone: '', companyName: '' });

  const fetchCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await customersApi.list({ page, limit: 25, search });
      setCustomers(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch { toast.error('Failed to load customers'); }
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  const handleCreate = async () => {
    try {
      await customersApi.create(form);
      toast.success('Customer created');
      setShowCreate(false);
      setForm({ displayName: '', email: '', phone: '', companyName: '' });
      fetchCustomers();
    } catch { toast.error('Failed to create customer'); }
  };

  const columns = [
    { key: 'display_name', header: 'Name' },
    { key: 'company_name', header: 'Company' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'current_balance', header: 'Balance', render: (c: any) => `AED ${parseFloat(c.current_balance || 0).toFixed(2)}` },
    { key: 'is_active', header: 'Status', render: (c: any) => <Badge variant={c.is_active ? 'success' : 'default'}>{c.is_active ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-500 mt-1">Manage your customer contacts and relationships</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload size={16} className="mr-1" /> Import</Button>
          <Button variant="outline" size="sm"><Download size={16} className="mr-1" /> Export</Button>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" /> New Customer</Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search customers..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <Table columns={columns} data={customers} loading={loading} emptyMessage="No customers yet. Create your first customer!" />
        {pagination.totalPages > 1 && (
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={fetchCustomers} />
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Customer" footer={
        <><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
        <Button onClick={handleCreate}>Create Customer</Button></>
      }>
        <div className="space-y-4">
          <Input label="Display Name" required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <Input label="Company Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
