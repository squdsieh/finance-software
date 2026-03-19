import { useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Plus, Percent, FileText, Calendar, Calculator } from 'lucide-react';

export function TaxPage() {
  const [activeTab, setActiveTab] = useState<'rates' | 'returns'>('rates');
  const [showCreate, setShowCreate] = useState(false);

  const taxRates = [
    { name: 'Standard VAT', rate: 5.00, type: 'VAT', code: 'SR', isDefault: true, isActive: true },
    { name: 'Zero-Rated', rate: 0.00, type: 'VAT', code: 'ZR', isDefault: false, isActive: true },
    { name: 'Exempt', rate: 0.00, type: 'VAT', code: 'EX', isDefault: false, isActive: true },
    { name: 'Out of Scope', rate: 0.00, type: 'None', code: 'OS', isDefault: false, isActive: true },
    { name: 'Reverse Charge', rate: 5.00, type: 'VAT', code: 'RC', isDefault: false, isActive: true },
  ];

  const vatReturns = [
    { period: 'Q4 2025 (Oct-Dec)', dueDate: '2026-01-28', status: 'filed', salesVat: 12500, purchaseVat: 4200, netVat: 8300 },
    { period: 'Q3 2025 (Jul-Sep)', dueDate: '2025-10-28', status: 'filed', salesVat: 11800, purchaseVat: 3900, netVat: 7900 },
    { period: 'Q1 2026 (Jan-Mar)', dueDate: '2026-04-28', status: 'draft', salesVat: 6200, purchaseVat: 2100, netVat: 4100 },
  ];

  const rateColumns = [
    { key: 'name', header: 'Tax Rate Name', render: (r: any) => (
      <div className="flex items-center gap-2">
        <Percent size={14} className="text-gray-400" />
        <span className="font-medium">{r.name}</span>
        {r.isDefault && <Badge variant="info">Default</Badge>}
      </div>
    )},
    { key: 'code', header: 'Code' },
    { key: 'type', header: 'Type', render: (r: any) => <Badge variant={r.type === 'VAT' ? 'info' : 'default'}>{r.type}</Badge> },
    { key: 'rate', header: 'Rate', render: (r: any) => `${r.rate.toFixed(2)}%` },
    { key: 'status', header: 'Status', render: (r: any) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tax</h1>
          <p className="text-gray-500 mt-1">Manage tax rates, VAT settings, and file tax returns</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'rates' ? (
            <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" /> New Tax Rate</Button>
          ) : (
            <Button><FileText size={16} className="mr-1" /> File Return</Button>
          )}
        </div>
      </div>

      {/* VAT Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Calculator size={16} /> VAT Collected (Q1)</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">AED 6,200.00</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Calculator size={16} /> VAT Paid (Q1)</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">AED 2,100.00</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/10">
          <div className="flex items-center gap-2 text-blue-600 text-sm"><Calendar size={16} /> Net VAT Due</div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">AED 4,100.00</p>
          <p className="text-xs text-blue-500 mt-1">Due: Apr 28, 2026</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('rates')} className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'rates' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`}>Tax Rates</button>
        <button onClick={() => setActiveTab('returns')} className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'returns' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`}>VAT Returns</button>
      </div>

      {activeTab === 'rates' ? (
        <Card padding={false}>
          <Table columns={rateColumns} data={taxRates} loading={false} emptyMessage="No tax rates configured." />
        </Card>
      ) : (
        <div className="space-y-4">
          {vatReturns.map((ret) => (
            <Card key={ret.period}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${ret.status === 'filed' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                    <FileText size={24} className={ret.status === 'filed' ? 'text-green-600' : 'text-yellow-600'} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{ret.period}</h3>
                    <p className="text-sm text-gray-500">Due: {ret.dueDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Sales VAT</p>
                    <p className="text-sm font-medium">AED {ret.salesVat.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Purchase VAT</p>
                    <p className="text-sm font-medium">AED {ret.purchaseVat.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Net VAT</p>
                    <p className="text-sm font-bold">AED {ret.netVat.toLocaleString()}</p>
                  </div>
                  <Badge variant={ret.status === 'filed' ? 'success' : 'warning'}>
                    {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Tax Rate">
        <div className="space-y-4">
          <Input label="Tax Rate Name" placeholder="e.g. Standard VAT" required />
          <Input label="Rate (%)" type="number" placeholder="5.00" required />
          <Input label="Tax Code" placeholder="e.g. SR" required />
          <p className="text-sm text-gray-500">Additional tax rate options coming soon.</p>
        </div>
      </Modal>
    </div>
  );
}
