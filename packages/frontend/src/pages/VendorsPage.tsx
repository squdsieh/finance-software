import { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, Download, Upload } from 'lucide-react';
import { vendorsApi } from '../services/api';
import toast from 'react-hot-toast';

export function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', phone: '', companyName: '' });

  const fetchVendors = async (page = 1) => {
    setLoading(true);
    try {
      const res = await vendorsApi.list({ page, limit: 25, search });
      setVendors(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch { toast.error('Failed to load vendors'); }
    setLoading(false);
  };

  useEffect(() => { fetchVendors(); }, [search]);

  const handleCreate = async () => {
    try {
      await vendorsApi.create(form);
      toast.success('Vendor created');
      setShowCreate(false);
      setForm({ displayName: '', email: '', phone: '', companyName: '' });
      fetchVendors();
    } catch { toast.error('Failed to create vendor'); }
  };

  const columns = [
    { key: 'display_name', header: 'Name' },
    { key: 'company_name', header: 'Company' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'current_balance', header: 'Balance', render: (v: any) => `AED ${parseFloat(v.current_balance || 0).toFixed(2)}` },
    { key: 'is_active', header: 'Status', render: (v: any) => <Badge variant={v.is_active ? 'success' : 'default'}>{v.is_active ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendors</h1>
          <p className="text-gray-500 mt-1">Manage your supplier contacts and accounts payable</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload size={16} className="mr-1" /> Import</Button>
          <Button variant="outline" size="sm"><Download size={16} className="mr-1" /> Export</Button>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" /> New Vendor</Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search vendors..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <Table columns={columns} data={vendors} loading={loading} emptyMessage="No vendors yet. Add your first vendor!" />
        {pagination.totalPages > 1 && (
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={fetchVendors} />
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Vendor" footer={
        <><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
        <Button onClick={handleCreate}>Create Vendor</Button></>
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
