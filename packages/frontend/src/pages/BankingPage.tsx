import { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Plus, RefreshCw, Building2, CreditCard, Wallet, ArrowUpRight, ArrowDownLeft, Link2, CheckCircle, Tag, Search, Scale } from 'lucide-react';
import { bankingApi } from '../services/api';
import toast from 'react-hot-toast';

interface BankAccount {
  id: string;
  name: string;
  bank: string;
  number: string;
  balance: number;
  type: string;
  connected: boolean;
  last_synced?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  matched: boolean;
  account_id: string;
}

export function BankingPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'reconciliation'>('accounts');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showCategorize, setShowCategorize] = useState<Transaction | null>(null);
  const [showReconcile, setShowReconcile] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [accountForm, setAccountForm] = useState({ name: '', bank: '', type: 'checking', accountNumber: '', openingBalance: '' });

  const fetchAccounts = async () => {
    try {
      const res = await bankingApi.listAccounts();
      setAccounts(res.data.data || []);
    } catch {
      toast.error('Failed to load bank accounts');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await bankingApi.listTransactions({ search });
      setTransactions(res.data.data || []);
    } catch {
      toast.error('Failed to load transactions');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [search]);

  const handleSyncAll = async () => {
    try {
      for (const acc of accounts.filter((a) => a.connected)) {
        await bankingApi.syncTransactions(acc.id);
      }
      toast.success('All accounts synced');
      fetchAccounts();
      fetchTransactions();
    } catch {
      toast.error('Failed to sync accounts');
    }
  };

  const handleSyncOne = async (id: string) => {
    try {
      await bankingApi.syncTransactions(id);
      toast.success('Account synced');
      fetchAccounts();
      fetchTransactions();
    } catch {
      toast.error('Failed to sync account');
    }
  };

  const handleAddAccount = async () => {
    try {
      await bankingApi.createAccount({
        name: accountForm.name,
        bank: accountForm.bank,
        type: accountForm.type,
        account_number: accountForm.accountNumber,
        opening_balance: parseFloat(accountForm.openingBalance) || 0,
      });
      toast.success('Bank account added');
      setShowAddAccount(false);
      setAccountForm({ name: '', bank: '', type: 'checking', accountNumber: '', openingBalance: '' });
      fetchAccounts();
    } catch {
      toast.error('Failed to add bank account');
    }
  };

  const handleCategorize = async () => {
    if (!showCategorize) return;
    try {
      await bankingApi.categorize(showCategorize.id, { category: selectedCategory });
      toast.success('Transaction categorized');
      setShowCategorize(null);
      setSelectedCategory('');
      fetchTransactions();
    } catch {
      toast.error('Failed to categorize transaction');
    }
  };

  const handleMatch = async (txnId: string) => {
    try {
      await bankingApi.match(txnId, {});
      toast.success('Transaction matched');
      fetchTransactions();
    } catch {
      toast.error('Failed to match transaction');
    }
  };

  const handleStartReconciliation = async () => {
    try {
      await bankingApi.startReconciliation({ account_id: accounts[0]?.id });
      toast.success('Reconciliation started');
      setShowReconcile(false);
    } catch {
      toast.error('Failed to start reconciliation');
    }
  };

  const iconMap: Record<string, any> = { checking: Building2, savings: Wallet, credit: CreditCard, cash: Wallet };
  const unmatchedCount = transactions.filter((t) => !t.matched).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banking</h1>
          <p className="text-gray-500 mt-1">Manage bank accounts and reconcile transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncAll}>
            <RefreshCw size={16} className="mr-1" /> Sync All
          </Button>
          <Button onClick={() => setShowAddAccount(true)}>
            <Plus size={16} className="mr-1" /> Connect Account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => {
          const Icon = iconMap[acc.type] || Building2;
          return (
            <div key={acc.id || acc.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                    <Icon size={18} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{acc.name}</p>
                    <p className="text-xs text-gray-500">{acc.bank}</p>
                  </div>
                </div>
                <Badge variant={acc.connected ? 'success' : 'default'}>
                  {acc.connected ? 'Connected' : 'Manual'}
                </Badge>
              </div>
              <p className={`text-xl font-bold ${acc.balance < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                AED {Math.abs(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                {acc.balance < 0 && ' CR'}
              </p>
              {acc.last_synced && (
                <p className="text-xs text-gray-400 mt-1">
                  Last synced: {new Date(acc.last_synced).toLocaleString()}
                </p>
              )}
              {acc.connected && (
                <button
                  onClick={() => handleSyncOne(acc.id)}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Sync now
                </button>
              )}
            </div>
          );
        })}
        {accounts.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No bank accounts connected. Add your first account to get started.
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(['accounts', 'transactions', 'reconciliation'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === tab ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'
            }`}
          >
            {tab === 'accounts' ? 'Overview' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'transactions' && (
        <Card padding={false}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative max-w-sm">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {unmatchedCount > 0 && (
                <p className="text-sm text-amber-600">{unmatchedCount} unmatched transactions need review</p>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No transactions found</div>
            ) : (
              transactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${txn.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {txn.amount > 0 ? <ArrowDownLeft size={16} className="text-green-600" /> : <ArrowUpRight size={16} className="text-red-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{txn.description}</p>
                      <p className="text-xs text-gray-500">{txn.date} &middot; {txn.category || 'Uncategorized'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${txn.amount > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                      {txn.amount > 0 ? '+' : ''}AED {Math.abs(txn.amount).toFixed(2)}
                    </span>
                    {txn.matched ? (
                      <Badge variant="success">
                        <CheckCircle size={12} className="mr-1" /> Matched
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMatch(txn.id)}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        >
                          Match
                        </button>
                        <button
                          onClick={() => { setShowCategorize(txn); setSelectedCategory(txn.category || ''); }}
                          className="px-2 py-1 text-xs bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <Tag size={12} className="inline mr-1" />Categorize
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {activeTab === 'reconciliation' && (
        <Card>
          <div className="text-center py-8">
            <Scale size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Bank Reconciliation</h3>
            <p className="text-sm text-gray-500 mb-4">
              Match your bank statements with your accounting records to ensure accuracy.
            </p>
            <Button onClick={() => setShowReconcile(true)}>
              Start Reconciliation
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'accounts' && accounts.length > 0 && (
        <Card title="Recent Activity" subtitle="Latest transactions across all accounts" padding={false}>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {transactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-full ${txn.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {txn.amount > 0 ? <ArrowDownLeft size={16} className="text-green-600" /> : <ArrowUpRight size={16} className="text-red-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{txn.description}</p>
                    <p className="text-xs text-gray-500">{txn.date}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${txn.amount > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                  {txn.amount > 0 ? '+' : ''}AED {Math.abs(txn.amount).toFixed(2)}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">No recent transactions</div>
            )}
          </div>
        </Card>
      )}

      <Modal
        isOpen={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        title="Add Bank Account"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddAccount(false)}>Cancel</Button>
            <Button onClick={handleAddAccount}>Add Account</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Account Name" required value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="e.g. Business Checking" />
          <Input label="Bank Name" required value={accountForm.bank} onChange={(e) => setAccountForm({ ...accountForm, bank: e.target.value })} placeholder="e.g. Emirates NBD" />
          <Select
            label="Account Type"
            options={[
              { value: 'checking', label: 'Checking' },
              { value: 'savings', label: 'Savings' },
              { value: 'credit', label: 'Credit Card' },
              { value: 'cash', label: 'Cash' },
            ]}
            value={accountForm.type}
            onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
          />
          <Input label="Account Number" value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} placeholder="Last 4 digits" />
          <Input label="Opening Balance" type="number" step="0.01" value={accountForm.openingBalance} onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value })} />
        </div>
      </Modal>

      <Modal
        isOpen={!!showCategorize}
        onClose={() => setShowCategorize(null)}
        title="Categorize Transaction"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCategorize(null)}>Cancel</Button>
            <Button onClick={handleCategorize}>Save Category</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium">{showCategorize?.description}</p>
            <p className="text-xs text-gray-500 mt-1">
              {showCategorize?.date} &middot; AED {Math.abs(showCategorize?.amount || 0).toFixed(2)}
            </p>
          </div>
          <Select
            label="Category"
            options={[
              { value: 'income', label: 'Income' },
              { value: 'cost_of_goods', label: 'Cost of Goods Sold' },
              { value: 'office_supplies', label: 'Office Supplies' },
              { value: 'rent', label: 'Rent & Lease' },
              { value: 'utilities', label: 'Utilities' },
              { value: 'travel', label: 'Travel' },
              { value: 'meals', label: 'Meals & Entertainment' },
              { value: 'marketing', label: 'Marketing' },
              { value: 'professional_services', label: 'Professional Services' },
              { value: 'transfer', label: 'Transfer' },
              { value: 'other', label: 'Other' },
            ]}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            placeholder="Select a category"
          />
        </div>
      </Modal>

      <Modal
        isOpen={showReconcile}
        onClose={() => setShowReconcile(false)}
        title="Start Reconciliation"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowReconcile(false)}>Cancel</Button>
            <Button onClick={handleStartReconciliation}>Begin Reconciliation</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Bank Account"
            options={accounts.map((a) => ({ value: a.id, label: `${a.name} - ${a.bank}` }))}
            placeholder="Select account to reconcile"
          />
          <Input label="Statement Ending Date" type="date" />
          <Input label="Statement Ending Balance" type="number" step="0.01" placeholder="Enter the balance from your bank statement" />
        </div>
      </Modal>
    </div>
  );
}
