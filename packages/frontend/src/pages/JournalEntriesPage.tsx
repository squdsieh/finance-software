import { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, BookOpen, Trash2, AlertCircle } from 'lucide-react';
import { journalEntriesApi } from '../services/api';
import toast from 'react-hot-toast';

interface JournalLine {
  account: string;
  description: string;
  debit: string;
  credit: string;
}

interface JournalForm {
  entryDate: string;
  reference: string;
  description: string;
  lines: JournalLine[];
}

const emptyLine: JournalLine = { account: '', description: '', debit: '', credit: '' };

const emptyForm: JournalForm = {
  entryDate: new Date().toISOString().split('T')[0],
  reference: '',
  description: '',
  lines: [{ ...emptyLine }, { ...emptyLine }],
};

export function JournalEntriesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<JournalForm>(emptyForm);

  const fetchEntries = async (page = 1) => {
    setLoading(true);
    try {
      const res = await journalEntriesApi.list({ page, limit: 25, search });
      setEntries(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to load journal entries');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [search]);

  const updateLine = (index: number, field: keyof JournalLine, value: string) => {
    const lines = [...form.lines];
    lines[index] = { ...lines[index], [field]: value };
    if (field === 'debit' && value && parseFloat(value) > 0) {
      lines[index].credit = '';
    }
    if (field === 'credit' && value && parseFloat(value) > 0) {
      lines[index].debit = '';
    }
    setForm({ ...form, lines });
  };

  const addLine = () => {
    setForm({ ...form, lines: [...form.lines, { ...emptyLine }] });
  };

  const removeLine = (index: number) => {
    if (form.lines.length <= 2) return;
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) });
  };

  const totalDebits = form.lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredits = form.lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const difference = totalDebits - totalCredits;

  const handleCreate = async () => {
    if (!isBalanced) {
      toast.error('Debits and credits must balance');
      return;
    }
    try {
      await journalEntriesApi.create({
        entry_date: form.entryDate,
        reference: form.reference,
        description: form.description,
        lines: form.lines
          .filter((line) => line.account && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0))
          .map((line) => ({
            account: line.account,
            description: line.description,
            debit: parseFloat(line.debit) || 0,
            credit: parseFloat(line.credit) || 0,
          })),
      });
      toast.success('Journal entry created');
      setShowCreate(false);
      setForm(emptyForm);
      fetchEntries();
    } catch {
      toast.error('Failed to create journal entry');
    }
  };

  const columns = [
    {
      key: 'entry_number',
      header: 'Entry #',
      render: (e: any) => (
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-primary-500" />
          <span className="font-medium text-primary-600">{e.entry_number}</span>
        </div>
      ),
    },
    {
      key: 'entry_date',
      header: 'Date',
      render: (e: any) => new Date(e.entry_date).toLocaleDateString(),
    },
    { key: 'reference', header: 'Reference' },
    {
      key: 'description',
      header: 'Description',
      render: (e: any) => (
        <span className="truncate max-w-xs block">{e.description || '-'}</span>
      ),
    },
    {
      key: 'total_debit',
      header: 'Total Debits',
      render: (e: any) => `AED ${parseFloat(e.total_debit || 0).toFixed(2)}`,
    },
    {
      key: 'total_credit',
      header: 'Total Credits',
      render: (e: any) => `AED ${parseFloat(e.total_credit || 0).toFixed(2)}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (e: any) => (
        <Badge variant={e.is_posted ? 'success' : 'default'}>
          {e.is_posted ? 'Posted' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (e: any) => (
        <Badge variant={e.is_auto_generated ? 'info' : 'default'}>
          {e.is_auto_generated ? 'Auto' : 'Manual'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal Entries</h1>
          <p className="text-gray-500 mt-1">View and create manual journal entries for your general ledger</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
          <Plus size={16} className="mr-1" /> New Journal Entry
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <Table columns={columns} data={entries} loading={loading} emptyMessage="No journal entries yet." />
        {pagination.totalPages > 1 && (
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={fetchEntries} />
        )}
      </Card>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Journal Entry"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!isBalanced}>Create Entry</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Date"
              type="date"
              required
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
            />
            <Input
              label="Reference"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="e.g. ADJ-001"
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Journal entry description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Journal Lines</label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Account</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-32">Debit</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-32">Credit</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {form.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.account}
                          onChange={(e) => updateLine(i, 'account', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="Account name"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(i, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="Line description"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={line.debit}
                          onChange={(e) => updateLine(i, 'debit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={line.credit}
                          onChange={(e) => updateLine(i, 'credit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeLine(i)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                          disabled={form.lines.length <= 2}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-right text-sm">Totals</td>
                    <td className="px-3 py-2 text-sm">AED {totalDebits.toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm">AED {totalCredits.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex items-center justify-between mt-2">
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus size={14} className="mr-1" /> Add Line
              </Button>
              {!isBalanced && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  <span>
                    Out of balance by AED {Math.abs(difference).toFixed(2)} ({difference > 0 ? 'debits exceed credits' : 'credits exceed debits'})
                  </span>
                </div>
              )}
              {isBalanced && totalDebits > 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <BookOpen size={16} />
                  <span>Entry is balanced</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
