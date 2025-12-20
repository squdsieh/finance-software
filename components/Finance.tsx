
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ICONS, COLORS } from '../constants';
import { Transaction, Lease, Client, Car, CarStatus, LeaseStatus, TabType } from '../types';
import { FormInput, FormSelect, ActionButton } from './UI';

const chartData = [
  { name: 'Jan', revenue: 240000, expenses: 140000 },
  { name: 'Feb', revenue: 210000, expenses: 130000 },
  { name: 'Mar', revenue: 280000, expenses: 150000 },
  { name: 'Apr', revenue: 320000, expenses: 180000 },
  { name: 'May', revenue: 300000, expenses: 170000 },
  { name: 'Jun', revenue: 350000, expenses: 200000 },
];

export const FinanceSummary: React.FC<{ externalTrigger?: { tab: TabType; timestamp: number } | null }> = ({ externalTrigger }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkedData, setLinkedData] = useState<{ lease: Lease; client: Client; car: Car } | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 'T-8821', amount: 15000, type: 'Income', category: 'Monthly Installment', date: '2024-05-24', description: 'Direct Payment - Ahmad Al-Fayed', leaseId: 'L-001' },
    { id: 'T-8822', amount: 2450, type: 'Expense', category: 'Maintenance', date: '2024-05-23', description: 'Service Center - Audi Q7 Asset', leaseId: 'L-001' },
    { id: 'T-8823', amount: 12000, type: 'Expense', category: 'Insurance', date: '2024-05-22', description: 'Abu Dhabi Fleet Insurance' },
    { id: 'T-8824', amount: 45000, type: 'Income', category: 'Corporate Payment', date: '2024-05-21', description: 'Corporate Installment - TechCorp', leaseId: 'L-002' },
  ]);

  useEffect(() => {
    if (externalTrigger?.tab === 'finance') {
      setEditingTransaction(null);
      setIsFormModalOpen(true);
    }
  }, [externalTrigger]);

  useEffect(() => {
    if (selectedTransaction?.leaseId) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLinkedData({
          lease: { id: selectedTransaction.leaseId!, clientId: 'C-001', carId: 'V-101', startDate: '2023-12-01', endDate: '2024-12-01', totalValue: 125000, status: LeaseStatus.ACTIVE, deposit: 15000 },
          client: { id: 'C-001', name: 'Ahmad Al-Fayed', email: 'ahmad@example.ae', phone: '+971 50 123 4567', status: 'Active', createdAt: '2023-10-15' },
          car: { id: 'V-101', make: 'Audi', model: 'Q7', year: 2023, vin: 'AUDI123456789', licensePlate: 'DXB-7721', status: CarStatus.LEASED, mileage: 12500, dailyRate: 450 }
        });
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setLinkedData(null);
    }
  }, [selectedTransaction]);

  const handleSaveTransaction = (txData: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      setTransactions(transactions.map(t => t.id === editingTransaction.id ? { ...txData, id: t.id } : t));
    } else {
      const newTx: Transaction = {
        ...txData,
        id: `T-${Math.floor(1000 + Math.random() * 9000)}`
      };
      setTransactions([newTx, ...transactions]);
    }
    setIsFormModalOpen(false);
    setEditingTransaction(null);
  };

  const handleVoidTransaction = () => {
    if (selectedTransaction) {
      setTransactions(transactions.filter(t => t.id !== selectedTransaction.id));
      setSelectedTransaction(null);
      setIsVoidConfirmOpen(false);
    }
  };

  if (selectedTransaction) {
    return (
      <div className="animate-in slide-in-from-right duration-500 space-y-10">
        <div className="flex justify-between items-center">
          <button onClick={() => setSelectedTransaction(null)} className="flex items-center gap-3 text-[#1B1C1C] font-black uppercase text-xs tracking-[0.2em] hover:text-[#F0971A] active:scale-90 transition-all group">
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            Finance Ledger
          </button>
          <div className="flex gap-4">
            <ActionButton label="Edit Entry" variant="outline" onClick={() => { setEditingTransaction(selectedTransaction); setIsFormModalOpen(true); }} />
            <ActionButton label="Void Entry" variant="danger" onClick={() => setIsVoidConfirmOpen(true)} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm border-t-[12px] border-[#F0971A] animate-in zoom-in-95 duration-500 relative overflow-hidden">
              <div className="flex justify-between items-start mb-16">
                <div>
                  <h2 className="text-5xl font-black text-[#1B1C1C] tracking-tighter uppercase leading-none">Entry {selectedTransaction.id}</h2>
                  <p className="text-[#F0971A] text-xs font-black uppercase tracking-[0.3em] mt-3">Verified Transaction Log</p>
                </div>
                <span className="px-6 py-2.5 rounded-full bg-green-50 text-green-700 text-[11px] font-black uppercase tracking-widest border border-green-100">Cleared & Settled</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div>
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Capital Volume</p>
                  <p className={`text-6xl font-black tracking-tighter ${selectedTransaction.type === 'Income' ? 'text-green-600' : 'text-[#1B1C1C]'}`}>
                    {selectedTransaction.type === 'Income' ? '+' : '-'}{selectedTransaction.amount.toLocaleString()} <span className="text-xl uppercase">AED</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <DetailBlock label="Category" value={selectedTransaction.category} />
                  <DetailBlock label="Process Date" value={selectedTransaction.date} />
                  <DetailBlock label="Log Type" value={selectedTransaction.type} />
                </div>
              </div>
              <div className="mt-16 pt-12 border-t border-gray-50">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Description</p>
                <p className="text-[#1B1C1C] text-xl font-bold leading-relaxed italic">"{selectedTransaction.description}"</p>
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <h3 className="font-black text-[#1B1C1C] uppercase tracking-[0.3em] text-[11px] border-b-2 border-gray-100 pb-3">Association Context</h3>
            {linkedData ? (
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm border-l-[10px] border-[#F0971A]">
                <h4 className="font-black text-[#1B1C1C] text-lg uppercase mb-2">{linkedData.client.name}</h4>
                <p className="text-[10px] text-[#F0971A] font-black uppercase tracking-[0.3em]">Agreement #L-00{linkedData.lease.id}</p>
                <ActionButton label="Inspect Agreement" variant="secondary" fullWidth className="mt-8" />
              </div>
            ) : (
              <div className="p-16 border-4 border-dashed border-gray-100 rounded-[3rem] text-center text-gray-300">
                <p className="text-[11px] font-black uppercase tracking-[0.3em]">No Association</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black text-[#1B1C1C] tracking-tighter uppercase leading-none">Capital Flow</h2>
          <p className="text-base text-gray-500 font-bold mt-3 tracking-tight">Verified installment revenue and fleet operational costs</p>
        </div>
        <ActionButton label="Record Entry" variant="secondary" icon={<span>+</span>} onClick={() => { setEditingTransaction(null); setIsFormModalOpen(true); }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <FinanceCard label="Installment Revenue" value="1,700,000" trend="+12.5%" color="text-green-600" />
        <FinanceCard label="Operational Burdens" value="970,000" trend="-2.4%" color="text-red-600" />
        <FinanceCard label="Net Liquidity" value="730,000" trend="+18.2%" color="text-[#1B1C1C]" />
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="px-12 py-10 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center text-2xl font-black uppercase tracking-tight">
            Transaction Ledger
         </div>
         <div className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} date={tx.date} desc={tx.description} amount={`${tx.type === 'Income' ? '+' : '-'}${tx.amount.toLocaleString()}`} type={tx.type} onClick={() => setSelectedTransaction(tx)} />
            ))}
         </div>
      </div>

      {isFormModalOpen && (
        <TransactionFormModal 
          onClose={() => setIsFormModalOpen(false)} 
          onSubmit={handleSaveTransaction} 
          initialData={editingTransaction || undefined}
        />
      )}

      {isVoidConfirmOpen && <VoidConfirmModal onClose={() => setIsVoidConfirmOpen(false)} onConfirm={handleVoidTransaction} />}
    </div>
  );
};

const TransactionFormModal: React.FC<{
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
  initialData?: Transaction;
}> = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    amount: initialData?.amount || 0,
    type: initialData?.type || 'Income' as 'Income' | 'Expense',
    category: initialData?.category || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    description: initialData?.description || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit(formData);
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#1B1C1C]/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="bg-[#1B1C1C] px-12 py-10 text-white border-b-8 border-[#F0971A] flex justify-between items-center">
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tight">{initialData ? 'Update Ledger' : 'New Capital Entry'}</h3>
            <p className="text-[#F0971A] text-[11px] font-black uppercase tracking-[0.3em] mt-1">Audit Trail Authentication</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-[#F0971A] hover:text-[#1B1C1C] transition-all"><span className="text-2xl">×</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-12 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormSelect 
              label="Type" 
              value={formData.type} 
              onChange={(v) => setFormData({...formData, type: v as 'Income' | 'Expense'})} 
              options={[{ label: 'Income (+)', value: 'Income' }, { label: 'Expense (-)', value: 'Expense' }]}
            />
            <FormInput label="Capital Volume (AED)" type="number" placeholder="0" value={formData.amount.toString()} onChange={(v) => setFormData({...formData, amount: parseFloat(v) || 0})} required />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <FormInput label="Category" placeholder="e.g. Installment" value={formData.category} onChange={(v) => setFormData({...formData, category: v})} required />
            {/* Fix: Added required placeholder prop */}
            <FormInput label="Value Date" type="date" placeholder="YYYY-MM-DD" value={formData.date} onChange={(v) => setFormData({...formData, date: v})} required />
          </div>
          <FormInput label="Description" placeholder="Narrative justifying the transaction" value={formData.description} onChange={(v) => setFormData({...formData, description: v})} required />
          <div className="flex gap-4 pt-6">
            <ActionButton label="Abort" variant="outline" onClick={onClose} fullWidth />
            <ActionButton label={initialData ? 'Commit Changes' : 'Record Entry'} variant="primary" type="submit" loading={isSubmitting} fullWidth />
          </div>
        </form>
      </div>
    </div>
  );
};

const FinanceCard: React.FC<{ label: string, value: string, trend: string, color: string }> = ({ label, value, trend, color }) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
     <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">{label}</p>
     <div className="flex items-baseline gap-4 mt-4">
        <h4 className={`text-4xl font-black ${color} tracking-tighter`}>{value} <span className="text-sm">AED</span></h4>
        <span className={`text-[11px] font-black px-4 py-1.5 rounded-full ${trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{trend}</span>
     </div>
  </div>
);

const TransactionRow: React.FC<{ date: string, desc: string, amount: string, type: 'Income' | 'Expense', onClick: () => void }> = ({ date, desc, amount, type, onClick }) => (
   <div onClick={onClick} className="px-12 py-8 flex justify-between items-center hover:bg-[#1B1C1C] transition-all cursor-pointer group">
      <div className="flex items-center gap-8">
         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${type === 'Income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={type === 'Income' ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} /></svg>
         </div>
         <div>
            <p className="text-lg font-black text-[#1B1C1C] group-hover:text-white uppercase tracking-tight">{desc}</p>
            <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.3em] group-hover:text-[#F0971A]">{date}</p>
         </div>
      </div>
      <div className={`text-2xl font-black ${type === 'Income' ? 'text-green-600' : 'text-red-600'} group-hover:text-white`}>{amount} AED</div>
   </div>
);

const DetailBlock: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">{label}</p>
    <p className="text-[#1B1C1C] font-black text-base mt-1 uppercase">{value}</p>
  </div>
);

const VoidConfirmModal: React.FC<{ onClose: () => void; onConfirm: () => void }> = ({ onClose, onConfirm }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-[#1B1C1C]/90 backdrop-blur-lg" onClick={onClose} />
    <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-12 border-t-[12px] border-red-600">
      <h3 className="text-3xl font-black text-center mb-4 uppercase">Void Entry?</h3>
      <p className="text-gray-500 text-sm text-center mb-10 leading-relaxed font-bold">THIS ACTION IS IRREVERSIBLE.</p>
      <div className="flex gap-4">
        <ActionButton label="Cancel" variant="outline" onClick={onClose} fullWidth />
        <ActionButton label="Void" variant="danger" onClick={onConfirm} fullWidth />
      </div>
    </div>
  </div>
);
