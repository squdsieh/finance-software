import { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, ChevronRight, ChevronDown, Edit, Trash2, Download, FolderOpen, FileText } from 'lucide-react';
import { accountsApi } from '../services/api';
import toast from 'react-hot-toast';

interface AccountForm {
  code: string;
  name: string;
  type: string;
  detailType: string;
  description: string;
  parentId: string;
}

const emptyForm: AccountForm = {
  code: '',
  name: '',
  type: 'asset',
  detailType: '',
  description: '',
  parentId: '',
};

const accountTypes = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
];

const detailTypesByType: Record<string, { value: string; label: string }[]> = {
  asset: [
    { value: 'cash', label: 'Cash and Cash Equivalents' },
    { value: 'bank', label: 'Bank' },
    { value: 'accounts_receivable', label: 'Accounts Receivable' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'fixed_asset', label: 'Fixed Asset' },
    { value: 'other_current_asset', label: 'Other Current Asset' },
    { value: 'other_asset', label: 'Other Asset' },
  ],
  liability: [
    { value: 'accounts_payable', label: 'Accounts Payable' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'current_liability', label: 'Current Liability' },
    { value: 'long_term_liability', label: 'Long-Term Liability' },
    { value: 'other_liability', label: 'Other Liability' },
  ],
  equity: [
    { value: 'owners_equity', label: "Owner's Equity" },
    { value: 'retained_earnings', label: 'Retained Earnings' },
    { value: 'opening_balance', label: 'Opening Balance Equity' },
  ],
  revenue: [
    { value: 'income', label: 'Income' },
    { value: 'other_income', label: 'Other Income' },
  ],
  expense: [
    { value: 'expense', label: 'Expense' },
    { value: 'cost_of_goods', label: 'Cost of Goods Sold' },
    { value: 'other_expense', label: 'Other Expense' },
  ],
};

const typeColors: Record<string, { badge: 'info' | 'warning' | 'success' | 'danger' | 'default'; bg: string }> = {
  asset: { badge: 'info', bg: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  liability: { badge: 'warning', bg: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
  equity: { badge: 'success', bg: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  revenue: { badge: 'success', bg: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  expense: { badge: 'danger', bg: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
};

export function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['asset', 'liability', 'equity', 'revenue', 'expense'])
  );

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await accountsApi.list({ search });
      setAccounts(res.data.data || []);
    } catch {
      toast.error('Failed to load chart of accounts');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [search]);

  const handleCreate = async () => {
    try {
      await accountsApi.create({
        account_code: form.code,
        account_name: form.name,
        account_type: form.type,
        account_sub_type: form.detailType,
        description: form.description,
        parent_id: form.parentId || undefined,
      });
      toast.success('Account created');
      setShowCreate(false);
      setForm(emptyForm);
      fetchAccounts();
    } catch {
      toast.error('Failed to create account');
    }
  };

  const handleUpdate = async () => {
    if (!editingAccount) return;
    try {
      await accountsApi.update(editingAccount.id, {
        account_code: form.code,
        account_name: form.name,
        account_type: form.type,
        account_sub_type: form.detailType,
        description: form.description,
      });
      toast.success('Account updated');
      setEditingAccount(null);
      setForm(emptyForm);
      fetchAccounts();
    } catch {
      toast.error('Failed to update account');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? It cannot have existing transactions.')) return;
    try {
      await accountsApi.delete(id);
      toast.success('Account deleted');
      fetchAccounts();
    } catch {
      toast.error('Failed to delete account. It may have transactions.');
    }
  };

  const openEdit = (account: any) => {
    setEditingAccount(account);
    setForm({
      code: account.account_code || '',
      name: account.account_name || '',
      type: account.account_type || 'asset',
      detailType: account.account_sub_type || '',
      description: account.description || '',
      parentId: account.parent_id || '',
    });
  };

  const toggleGroup = (type: string) => {
    const next = new Set(expandedGroups);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setExpandedGroups(next);
  };

  const groupedAccounts = accounts.reduce<Record<string, any[]>>((acc, account) => {
    const type = account.account_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {});

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Account Code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="e.g. 1000"
        />
        <Input
          label="Account Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Cash on Hand"
        />
      </div>
      <Select
        label="Account Type"
        required
        options={accountTypes}
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value, detailType: '' })}
      />
      <Select
        label="Detail Type"
        options={detailTypesByType[form.type] || []}
        value={form.detailType}
        onChange={(e) => setForm({ ...form, detailType: e.target.value })}
        placeholder="Select detail type"
      />
      <Input
        label="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Optional account description"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
          <p className="text-gray-500 mt-1">Manage your account structure and classifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-1" /> Export
          </Button>
          <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
            <Plus size={16} className="mr-1" /> New Account
          </Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-1">Code</div>
              <div className="col-span-4">Account Name</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Detail Type</div>
              <div className="col-span-2 text-right">Balance</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>

            {accountTypes.map((type) => {
              const typeAccounts = groupedAccounts[type.value] || [];
              const isExpanded = expandedGroups.has(type.value);
              const groupTotal = typeAccounts.reduce(
                (sum: number, a: any) => sum + (parseFloat(a.current_balance) || 0),
                0
              );
              const colors = typeColors[type.value] || typeColors.asset;

              return (
                <div key={type.value}>
                  <button
                    onClick={() => toggleGroup(type.value)}
                    className="w-full grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left items-center"
                  >
                    <div className="col-span-7 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <FolderOpen size={16} className="text-gray-400" />
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${colors.bg}`}>
                        {type.label}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">({typeAccounts.length})</span>
                    </div>
                    <div className="col-span-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                      AED {Math.abs(groupTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-1"></div>
                  </button>
                  {isExpanded &&
                    typeAccounts.map((acc: any) => (
                      <div
                        key={acc.id}
                        className="grid grid-cols-12 gap-4 px-4 py-2.5 pl-12 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700/50 items-center"
                      >
                        <div className="col-span-1 text-sm text-gray-500 font-mono">
                          {acc.account_code || '-'}
                        </div>
                        <div className="col-span-4 text-sm flex items-center gap-2">
                          <FileText size={14} className="text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">{acc.account_name}</span>
                        </div>
                        <div className="col-span-2">
                          <Badge variant={colors.badge}>{acc.account_type}</Badge>
                        </div>
                        <div className="col-span-2 text-sm text-gray-500">{acc.account_sub_type || '-'}</div>
                        <div className="col-span-2 text-sm text-right font-medium">
                          AED {parseFloat(String(acc.current_balance || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="col-span-1 flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(acc)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Edit"
                          >
                            <Edit size={14} className="text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(acc.id)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Delete"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {isExpanded && typeAccounts.length === 0 && (
                    <div className="px-12 py-3 text-sm text-gray-400 border-t border-gray-100 dark:border-gray-700/50">
                      No accounts in this category
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Account"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Account</Button>
          </>
        }
      >
        {renderForm()}
      </Modal>

      <Modal
        isOpen={!!editingAccount}
        onClose={() => { setEditingAccount(null); setForm(emptyForm); }}
        title="Edit Account"
        footer={
          <>
            <Button variant="outline" onClick={() => { setEditingAccount(null); setForm(emptyForm); }}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </>
        }
      >
        {renderForm()}
      </Modal>
    </div>
  );
}
