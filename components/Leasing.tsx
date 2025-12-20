
import React, { useState, useEffect, useMemo } from 'react';
import { Lease, LeaseStatus, Client, Car, CarStatus, Transaction, TabType } from '../types';
import { ICONS, COLORS } from '../constants';
import { FormInput, FormSelect, ActionButton, useNotification } from './UI';

interface ScheduleItem {
  id: string;
  dueDate: string;
  amount: number;
  status: 'Settled' | 'Overdue' | 'Upcoming';
  installmentNumber: number;
}

export const LeasingList: React.FC<{ externalTrigger?: { tab: TabType; timestamp: number } | null }> = ({ externalTrigger }) => {
  const { showNotification } = useNotification();
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaseData, setLeaseData] = useState<{ client: Client; car: Car; transactions: Transaction[] } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false);

  const [leases, setLeases] = useState<Lease[]>([
    { id: '1', clientId: '1', carId: '1', startDate: '2023-12-01', endDate: '2024-12-01', totalValue: 125000, status: LeaseStatus.ACTIVE, deposit: 15000 },
    { id: '2', clientId: '2', carId: '2', startDate: '2024-01-15', endDate: '2024-07-15', totalValue: 45000, status: LeaseStatus.PENDING, deposit: 5000 },
    { id: '3', clientId: '3', carId: '3', startDate: '2023-05-01', endDate: '2023-11-01', totalValue: 35000, status: LeaseStatus.COMPLETED, deposit: 3000 },
    { id: '4', clientId: '1', carId: '2', startDate: '2025-12-18', endDate: '2026-12-18', totalValue: 120000, status: LeaseStatus.PENDING, deposit: 20000 },
  ]);

  useEffect(() => {
    if (externalTrigger?.tab === 'leasing') {
      setIsModalOpen(true);
    }
  }, [externalTrigger]);

  useEffect(() => {
    if (selectedLease) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLeaseData({
          client: { id: selectedLease.clientId, name: 'Ahmad Al-Fayed', email: 'ahmad@example.com', phone: '+971 50 123 4567', status: 'Active', createdAt: '2023-10-15' },
          car: { id: selectedLease.carId, make: 'Audi', model: 'Q7', year: 2023, vin: 'AUDI-7721-XYZ', licensePlate: 'DXB-7721', status: CarStatus.LEASED, mileage: 12000, dailyRate: 450 },
          transactions: [
            { id: 'T1', amount: selectedLease.deposit, type: 'Income', category: 'Deposit', date: selectedLease.startDate, description: 'Initial Security Deposit' },
            { id: 'T2', amount: (selectedLease.totalValue - selectedLease.deposit) / 12, type: 'Income', category: 'Monthly Installment', date: '2024-01-05', description: 'January 2024 Payment' },
            { id: 'T3', amount: (selectedLease.totalValue - selectedLease.deposit) / 12, type: 'Income', category: 'Monthly Installment', date: '2024-02-05', description: 'February 2024 Payment' },
          ]
        });
        setLoading(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [selectedLease]);

  const paymentSchedule = useMemo(() => {
    if (!selectedLease) return [];
    const start = new Date(selectedLease.startDate);
    const end = new Date(selectedLease.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.max(1, Math.round(diffDays / 30.44));
    const monthlyAmount = (selectedLease.totalValue - selectedLease.deposit) / months;
    const schedule: ScheduleItem[] = [];
    const today = new Date();

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(start.getMonth() + i);
      const dateString = dueDate.toISOString().split('T')[0];
      let status: 'Settled' | 'Overdue' | 'Upcoming' = 'Upcoming';
      const hasTransaction = leaseData?.transactions.some(t => 
        t.category === 'Monthly Installment' && 
        new Date(t.date).getMonth() === dueDate.getMonth() &&
        new Date(t.date).getFullYear() === dueDate.getFullYear()
      );
      if (hasTransaction) status = 'Settled';
      else if (dueDate < today) status = 'Overdue';

      schedule.push({
        id: `SCH-${selectedLease.id}-${i}`,
        dueDate: dateString,
        amount: monthlyAmount,
        status,
        installmentNumber: i
      });
    }
    return schedule;
  }, [selectedLease, leaseData]);

  const stats = useMemo(() => {
    const settledCount = paymentSchedule.filter(s => s.status === 'Settled').length;
    const totalCount = paymentSchedule.length;
    const progress = totalCount > 0 ? (settledCount / totalCount) * 100 : 0;
    const settledValue = paymentSchedule
      .filter(s => s.status === 'Settled')
      .reduce((acc, curr) => acc + curr.amount, 0) + (selectedLease?.deposit || 0);
    const outstandingValue = (selectedLease?.totalValue || 0) - settledValue;

    return { settledCount, totalCount, progress, settledValue, outstandingValue };
  }, [paymentSchedule, selectedLease]);

  const handleCreateLease = (formData: Omit<Lease, 'id' | 'status'>) => {
    const newLease: Lease = {
      ...formData,
      id: (leases.length + 1).toString(),
      status: LeaseStatus.PENDING
    };
    setLeases([newLease, ...leases]);
    setIsModalOpen(false);
    showNotification("New lease authorized successfully", "success");
  };

  const handleCompleteLease = () => {
    if (!selectedLease) return;
    const updatedLeases = leases.map(l => l.id === selectedLease.id ? { ...l, status: LeaseStatus.COMPLETED } : l);
    setLeases(updatedLeases);
    setSelectedLease({ ...selectedLease, status: LeaseStatus.COMPLETED });
    setIsCompleteConfirmOpen(false);
    showNotification(`Agreement #L-00${selectedLease.id} marked as completed. Asset released.`, "success");
  };

  if (selectedLease && leaseData) {
    return (
      <div className="animate-in slide-in-from-right duration-500 space-y-8 pb-10">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedLease(null)} 
            className="flex items-center gap-3 text-[#1B1C1C] font-black uppercase text-[10px] tracking-[0.25em] hover:text-[#F0971A] active:scale-90 transition-all group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Leasing Hub
          </button>
          <div className="flex gap-4">
            {selectedLease.status !== LeaseStatus.COMPLETED && (
               <ActionButton 
                 label="Finalize Agreement" 
                 variant="outline" 
                 className="text-[#10B981] hover:bg-green-50"
                 onClick={() => setIsCompleteConfirmOpen(true)}
               />
            )}
            <ActionButton label="Log Payment" variant="primary" icon={<span className="text-lg">+</span>} />
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <span className="bg-[#1B1C1C] text-[#F0971A] px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">Validated Contract</span>
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      selectedLease.status === LeaseStatus.ACTIVE ? 'bg-green-50 text-green-600' : 
                      selectedLease.status === LeaseStatus.COMPLETED ? 'bg-gray-100 text-gray-500' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {selectedLease.status}
                    </span>
                  </div>
                  <h2 className="text-5xl font-black text-[#1B1C1C] tracking-tighter uppercase leading-none">Agreement #L-00{selectedLease.id}</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <LeaseDetailInfo label="Activation" value={selectedLease.startDate} />
                <LeaseDetailInfo label="Termination" value={selectedLease.endDate} />
                <LeaseDetailInfo label="Security" value={`${selectedLease.deposit.toLocaleString()} AED`} />
                <LeaseDetailInfo label="Total Value" value={`${selectedLease.totalValue.toLocaleString()} AED`} highlight />
              </div>
            </div>

            <div className="bg-gray-50 rounded-[2.5rem] p-8 flex flex-col justify-center border border-gray-100">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Settlement Progress</p>
               <div className="flex items-end justify-between mb-4">
                  <span className="text-4xl font-black text-[#1B1C1C] tracking-tighter">{Math.round(stats.progress)}%</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stats.settledCount} / {stats.totalCount} Cycles</span>
               </div>
               <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-[#F0971A] transition-all duration-1000 ease-out" style={{ width: `${stats.progress}%` }}></div>
               </div>
               <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Capital In</p>
                    <p className="text-sm font-black text-green-600">{stats.settledValue.toLocaleString()} AED</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Outstanding</p>
                    <p className="text-sm font-black text-[#1B1C1C]">{stats.outstandingValue.toLocaleString()} AED</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm flex flex-col">
            <h3 className="font-black text-[#1B1C1C] text-2xl tracking-tighter uppercase mb-10">Repayment Schedule</h3>
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {paymentSchedule.map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-6 rounded-[1.8rem] border-2 transition-all group ${item.status === 'Settled' ? 'bg-green-50/20 border-green-50' : item.status === 'Overdue' ? 'bg-red-50/20 border-red-50' : 'bg-white border-gray-50'}`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xs ${item.status === 'Settled' ? 'bg-green-600 text-white' : item.status === 'Overdue' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {item.installmentNumber}
                    </div>
                    <div>
                      <p className="text-base font-black text-[#1B1C1C] uppercase tracking-tight">Due: {item.dueDate}</p>
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${item.status === 'Settled' ? 'text-green-600' : item.status === 'Overdue' ? 'text-red-600' : 'text-gray-400'}`}>
                        {item.status} Installment
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-[#1B1C1C]">{Math.round(item.amount).toLocaleString()} <span className="text-[10px]">AED</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-8">
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm border-l-8 border-[#F0971A]">
                {/* Fixed typo on line 224: changed 'lease Leases' to 'leaseData.client.name' */}
                <h4 className="font-black text-[#1B1C1C] text-lg uppercase mb-4">{leaseData.client.name || 'Lessee Party'}</h4>
                <p className="text-xs text-gray-500 font-bold mb-6">{leaseData.client.email}</p>
                <ActionButton label="Profile Hub" variant="outline" fullWidth />
             </div>
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <h4 className="font-black text-[#1B1C1C] text-lg uppercase leading-tight mb-4">
                  {leaseData.car.year} {leaseData.car.make} {leaseData.car.model}
                </h4>
                <ActionButton label="Inspect Vehicle" variant="secondary" fullWidth />
             </div>
          </div>
        </div>

        {isCompleteConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-[#1B1C1C]/90 backdrop-blur-lg" onClick={() => setIsCompleteConfirmOpen(false)} />
            <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-12 border-t-[12px] border-[#10B981]">
              <div className="w-20 h-20 bg-green-50 text-[#10B981] rounded-3xl flex items-center justify-center mb-8 mx-auto">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-3xl font-black text-[#1B1C1C] text-center mb-4 uppercase">Complete Contract?</h3>
              <p className="text-gray-500 text-sm text-center mb-10 leading-relaxed font-bold">This will release the asset back to the available inventory and archive the ledger entries.</p>
              <div className="flex gap-4">
                <ActionButton label="Abort" variant="outline" onClick={() => setIsCompleteConfirmOpen(false)} fullWidth />
                <ActionButton label="Confirm" variant="primary" className="bg-[#10B981] border-[#10B981] hover:bg-[#0D9466]" onClick={handleCompleteLease} fullWidth />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black text-[#1B1C1C] tracking-tighter uppercase leading-none">Agreement Hub</h2>
          <p className="text-base text-gray-500 font-bold mt-4 tracking-tight">Active installment and direct-finance agreements</p>
        </div>
        <ActionButton 
          label="Authorize Contract" 
          variant="secondary" 
          onClick={() => setIsModalOpen(true)}
          icon={<span className="text-2xl">+</span>}
        />
      </div>

      <div className="bg-[#1B1C1C] rounded-[3.5rem] shadow-2xl overflow-hidden border-b-[16px] border-[#F0971A]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#1B1C1C] border-b border-[#F0971A]/30 text-[#F0971A] text-[11px] font-black uppercase tracking-[0.3em]">
              <th className="px-12 py-8">Contract REF</th>
              <th className="px-12 py-8">Lessee Party</th>
              <th className="px-12 py-8">Lifecycle</th>
              <th className="px-12 py-8">Financial Volume</th>
              <th className="px-12 py-8">Status</th>
              <th className="px-12 py-8"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {leases.map((lease) => (
              <tr key={lease.id} onClick={() => setSelectedLease(lease)} className="hover:bg-gray-50 transition-all cursor-pointer group">
                <td className="px-12 py-10"><span className="font-black text-[#1B1C1C] text-lg group-hover:text-[#F0971A]">#L-00{lease.id}</span></td>
                <td className="px-12 py-10 font-bold text-[#1B1C1C] text-sm">Party {lease.clientId}</td>
                <td className="px-12 py-10 flex flex-col">
                  <span className="font-black text-[#1B1C1C] text-sm">{lease.startDate}</span>
                  <span className="text-[10px] text-[#F0971A] font-black uppercase tracking-widest">TO {lease.endDate}</span>
                </td>
                <td className="px-12 py-10 text-2xl font-black text-[#1B1C1C]">{lease.totalValue.toLocaleString()} AED</td>
                <td className="px-12 py-10">
                  <span className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] ${
                    lease.status === LeaseStatus.ACTIVE ? 'bg-[#F0971A] text-[#1B1C1C]' : 
                    lease.status === LeaseStatus.COMPLETED ? 'bg-gray-100 text-gray-500' :
                    'bg-[#1B1C1C] text-[#F0971A]'
                  }`}>
                    {lease.status}
                  </span>
                </td>
                <td className="px-12 py-10 text-right text-gray-300 group-hover:text-[#F0971A] transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <MultiStepLeaseForm 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleCreateLease} 
        />
      )}
    </div>
  );
};

const MultiStepLeaseForm: React.FC<{
  onClose: () => void;
  onSubmit: (lease: Omit<Lease, 'id' | 'status'>) => void;
}> = ({ onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clientId: '',
    carId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    totalValue: 0,
    deposit: 0
  });

  const [mockClients] = useState([{ id: '1', name: 'Ahmad Al-Fayed' }, { id: '2', name: 'Sarah Jenkins' }, { id: '3', name: 'Mubarak Said' }]);
  const [mockCars] = useState([{ id: '1', name: '2023 Audi Q7 (DXB-7721)' }, { id: '2', name: '2024 Tesla Model Y (DXB-1109)' }, { id: '3', name: '2022 Toyota Land Cruiser (DXB-8888)' }]);

  const installmentCalc = useMemo(() => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const months = Math.max(1, Math.round(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    const monthly = (formData.totalValue - formData.deposit) / months;
    return { months, monthly };
  }, [formData]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#1B1C1C]/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="bg-[#1B1C1C] px-12 py-10 text-white border-b-8 border-[#F0971A] flex justify-between items-center">
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tight">Contract Authorization</h3>
            <div className="flex gap-4 mt-3">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? 'bg-[#F0971A]' : 'bg-white/10'}`}></div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-[#F0971A] hover:text-[#1B1C1C] transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-12 min-h-[400px]">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <h4 className="text-xl font-black text-[#1B1C1C] uppercase mb-8">Step 1: Select Verified Lessee</h4>
              <FormSelect 
                label="Customer Identity" 
                value={formData.clientId} 
                onChange={(v) => setFormData({...formData, clientId: v})} 
                options={mockClients.map(c => ({ label: c.name, value: c.id }))}
                required
              />
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <h4 className="text-xl font-black text-[#1B1C1C] uppercase mb-8">Step 2: Assign Fleet Asset</h4>
              <FormSelect 
                label="Registered Vehicle" 
                value={formData.carId} 
                onChange={(v) => setFormData({...formData, carId: v})} 
                options={mockCars.map(c => ({ label: c.name, value: c.id }))}
                required
              />
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right duration-500 space-y-6">
              <h4 className="text-xl font-black text-[#1B1C1C] uppercase">Step 3: Financial Terms</h4>
              <div className="grid grid-cols-2 gap-6">
                <FormInput label="Start Date" type="date" placeholder="YYYY-MM-DD" value={formData.startDate} onChange={(v) => setFormData({...formData, startDate: v})} required />
                <FormInput label="End Date" type="date" placeholder="YYYY-MM-DD" value={formData.endDate} onChange={(v) => setFormData({...formData, endDate: v})} required />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <FormInput label="Total Value (AED)" type="number" placeholder="0" value={formData.totalValue.toString()} onChange={(v) => setFormData({...formData, totalValue: parseInt(v) || 0})} required />
                <FormInput label="Initial Deposit (AED)" type="number" placeholder="0" value={formData.deposit.toString()} onChange={(v) => setFormData({...formData, deposit: parseInt(v) || 0})} required />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
              <h4 className="text-xl font-black text-[#1B1C1C] uppercase">Step 4: Final Validation</h4>
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
                 <div className="flex justify-between items-center mb-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Installment</p>
                    <p className="text-3xl font-black text-[#1B1C1C]">{Math.round(installmentCalc.monthly).toLocaleString()} AED</p>
                 </div>
                 <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lease Duration</p>
                    <p className="text-lg font-black text-[#F0971A]">{installmentCalc.months} Cycles (Months)</p>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between text-sm font-bold text-[#1B1C1C]"><span>Lesser:</span> <span>Instabuy Abu Dhabi</span></div>
                 <div className="flex justify-between text-sm font-bold text-[#1B1C1C]"><span>Lessee ID:</span> <span>{mockClients.find(c => c.id === formData.clientId)?.name}</span></div>
                 <div className="flex justify-between text-sm font-bold text-[#1B1C1C]"><span>Asset ID:</span> <span>{mockCars.find(c => c.id === formData.carId)?.name}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="px-12 py-8 bg-gray-50 border-t border-gray-200 flex gap-4">
          {step > 1 && <ActionButton label="Back" variant="outline" onClick={handleBack} fullWidth />}
          {step < 4 ? (
            <ActionButton 
              label="Continue" 
              variant="secondary" 
              onClick={handleNext} 
              fullWidth 
              disabled={(step === 1 && !formData.clientId) || (step === 2 && !formData.carId)} 
            />
          ) : (
            <ActionButton label="Authorize Contract" variant="primary" onClick={() => onSubmit(formData)} fullWidth />
          )}
        </div>
      </div>
    </div>
  );
};

const LeaseDetailInfo: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div>
    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">{label}</p>
    <p className={`mt-3 font-black ${highlight ? 'text-4xl text-[#1B1C1C] tracking-tighter' : 'text-lg text-[#1B1C1C] tracking-tight'}`}>{value}</p>
    {highlight && <div className="h-1.5 w-12 bg-[#F0971A] mt-2 rounded-full"></div>}
  </div>
);
