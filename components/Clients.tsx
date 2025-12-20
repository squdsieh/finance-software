
import React, { useState, useEffect, useCallback } from 'react';
import { Client, Lease, LeaseStatus, TabType } from '../types';
import { ICONS, COLORS } from '../constants';
import { FormInput, FormSelect, ActionButton, useNotification } from './UI';

interface ClientsListProps {
  externalTrigger?: { tab: TabType; timestamp: number } | null;
}

export const ClientsList: React.FC<ClientsListProps> = ({ externalTrigger }) => {
  const { showNotification } = useNotification();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientLeases, setClientLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialFetchError, setInitialFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [clients, setClients] = useState<Client[]>([]);

  // --- Initial Data Fetch (Simulated API) ---
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setInitialFetchError(null);
    try {
      // Simulated Network Latency
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulated 5% Failure Rate for testing the Error UI
      if (Math.random() < 0.05) {
        throw new Error("ERR_SERVICE_UNAVAILABLE: Connection to Abu Dhabi central registry timed out.");
      }

      const initialData: Client[] = [
        { id: '1', name: 'Ahmad Al-Fayed', email: 'ahmad@example.com', phone: '+971 50 123 4567', company: 'Al Fayed Holdings', status: 'Active', createdAt: '2023-10-15' },
        { id: '2', name: 'Sarah Jenkins', email: 'sarah.j@techcorp.com', phone: '+971 55 987 6543', company: 'TechCorp ME', status: 'Active', createdAt: '2023-11-20' },
        { id: '3', name: 'Mubarak Said', email: 'mubarak@logic.ae', phone: '+971 52 444 5555', company: 'Logic Solutions', status: 'Inactive', createdAt: '2023-08-01' },
      ];
      setClients(initialData);
    } catch (error: any) {
      setInitialFetchError(error.message);
      showNotification("Registry Synchronization Failed", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (externalTrigger?.tab === 'clients') {
      setEditingClient(null);
      setIsModalOpen(true);
    }
  }, [externalTrigger]);

  // --- Fetching Lease History (Mutation/Detail Fetch) ---
  useEffect(() => {
    const fetchLeases = async () => {
      if (!selectedClient) return;
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Simulated failure for detail fetch (10% chance)
        if (Math.random() < 0.1) {
          throw new Error("ERR_FETCH_HISTORY: Could not retrieve secure financial records.");
        }

        const mockLeases: Lease[] = [
          { id: '101', clientId: selectedClient.id, carId: 'C1', startDate: '2023-12-01', endDate: '2024-12-01', totalValue: 125000, status: LeaseStatus.ACTIVE, deposit: 15000 },
        ];
        setClientLeases(mockLeases);
      } catch (error) {
        showNotification("Security records unavailable. Check internal node status.", "error");
        setClientLeases([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeases();
  }, [selectedClient, showNotification]);

  // --- Mutations (Save/Delete) ---
  const handleSaveClient = async (formData: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Test Case for specific error handling
      if (formData.email === 'error@instabuy.ae') {
        throw new Error("ERR_DUPLICATE_ENTRY: Identity already exists in database.");
      }

      if (editingClient) {
        setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...formData } : c));
        if (selectedClient?.id === editingClient.id) {
          setSelectedClient(prev => prev ? { ...prev, ...formData } : null);
        }
        showNotification("Record updated in secure registry", "success");
      } else {
        const client: Client = {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString().split('T')[0]
        };
        setClients(prev => [client, ...prev]);
        showNotification("Identity successfully onboarded", "success");
      }
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("ERR_DUPLICATE_ENTRY") 
        ? "Identity conflict: Email address already registered." 
        : "Failed to authorize changes. Protocol error.";
      showNotification(errorMsg, "error");
      throw error;
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (clientLeases.some(l => l.status === LeaseStatus.ACTIVE)) {
        throw new Error("ERR_ACTIVE_AGREEMENT: Active financial bonds detected.");
      }

      setClients(prev => prev.filter(c => c.id !== selectedClient.id));
      setSelectedClient(null);
      setIsDeleteConfirmOpen(false);
      showNotification("Identity purged from active nodes", "info");
    } catch (error: any) {
      const msg = error.message.includes("ERR_ACTIVE_AGREEMENT")
        ? "Purge Denied: Asset return pending for this identity."
        : "Purge failed. Registry locked.";
      showNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  // --- Error State UI ---
  if (initialFetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl border-4 border-white">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-3xl font-black text-[#1B1C1C] uppercase tracking-tight">Sync Failure</h2>
        <p className="text-gray-500 font-medium max-w-sm mt-4 leading-relaxed italic">"{initialFetchError}"</p>
        <div className="mt-10">
          <ActionButton label="Retry Synchronization" variant="primary" onClick={fetchClients} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>} />
        </div>
      </div>
    );
  }

  // --- Detail View ---
  if (selectedClient) {
    return (
      <div className="animate-in slide-in-from-right duration-500 ease-out">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => setSelectedClient(null)} className="flex items-center gap-2 text-[#1B1C1C] font-black uppercase text-xs tracking-widest hover:text-[#F0971A] active:scale-95 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Clients Directory
          </button>
          <div className="flex gap-3">
            <button onClick={() => { setEditingClient(selectedClient); setIsModalOpen(true); }} className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-[#1B1C1C] hover:bg-gray-50 active:scale-95 transition-all">Update Record</button>
            <button onClick={() => setIsDeleteConfirmOpen(true)} className="px-5 py-2.5 border border-red-100 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 active:scale-95 transition-all">Purge</button>
          </div>
        </div>
        
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden mb-8 animate-in zoom-in-95 duration-500">
          <div className="bg-[#1B1C1C] h-40 relative">
             <div className="absolute -bottom-12 left-10">
                <div className="w-28 h-28 rounded-[2rem] bg-white border-8 border-white shadow-2xl flex items-center justify-center text-5xl font-black text-[#F0971A]">{selectedClient.name[0]}</div>
             </div>
          </div>
          <div className="pt-16 pb-10 px-10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-black text-[#1B1C1C] tracking-tight uppercase leading-none">{selectedClient.name}</h2>
                <p className="text-lg text-[#F0971A] font-black uppercase tracking-widest mt-2 text-sm">{selectedClient.company || 'Private Client'}</p>
              </div>
              <span className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest ${selectedClient.status === 'Active' ? 'bg-[#F0971A]/10 text-[#F0971A]' : 'bg-gray-100 text-gray-400'}`}>{selectedClient.status.toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-12">
               <div className="space-y-8">
                  <h3 className="font-black text-[#1B1C1C] uppercase tracking-[0.2em] text-[10px] border-b border-gray-100 pb-2">Verified Contact</h3>
                  <DetailItem label="Primary Email" value={selectedClient.email} />
                  <DetailItem label="Phone Line" value={selectedClient.phone} />
                  <DetailItem label="Onboarded" value={selectedClient.createdAt} />
               </div>
               <div className="md:col-span-2 space-y-8">
                  <h3 className="font-black text-[#1B1C1C] uppercase tracking-[0.2em] text-[10px] border-b border-gray-100 pb-2">Direct Installment History</h3>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2].map(i => <div key={i} className="h-20 bg-gray-50 animate-pulse rounded-3xl w-full"></div>)}
                    </div>
                  ) : clientLeases.length > 0 ? (
                    <div className="space-y-4">
                      {clientLeases.map((lease) => (
                        <div key={lease.id} onClick={() => showNotification(`Inspecting Agreement #L-00${lease.id}`, "info")} className="p-5 bg-gray-50 border border-gray-100 rounded-3xl flex justify-between items-center hover:bg-[#1B1C1C] hover:scale-[1.01] transition-all cursor-pointer group shadow-sm">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#F0971A] group-hover:bg-[#F0971A] group-hover:text-[#1B1C1C] transition-all shadow-sm">{ICONS.LEASING}</div>
                            <div>
                              <p className="text-sm font-black text-[#1B1C1C] group-hover:text-white uppercase tracking-tight">Lease #L-00{lease.id}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest group-hover:text-gray-500">{lease.startDate} • {lease.endDate}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-[#F0971A]">{lease.totalValue.toLocaleString()} <span className="text-[10px]">AED</span></p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${lease.status === LeaseStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{lease.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-16 border-4 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center text-gray-300">
                       <p className="text-xs font-black uppercase tracking-widest">No Active Agreements</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- List View ---
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center animate-in fade-in slide-in-from-top-2 duration-500">
        <div>
          <h2 className="text-3xl font-black text-[#1B1C1C] tracking-tight uppercase tracking-tighter">Clients Hub</h2>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-tight text-[#F0971A] mt-1">Registry Authorization: Active</p>
        </div>
        <ActionButton label="New Client" variant="secondary" onClick={() => { setEditingClient(null); setIsModalOpen(true); }} icon={ICONS.ADD} />
      </div>

      <div className="relative">
        <input type="text" placeholder="Filter by Name or Corporate ID..." className="w-full pl-14 pr-6 py-5 rounded-[2rem] border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#F0971A] outline-none transition-all shadow-sm font-bold text-[#1B1C1C]" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#F0971A]">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => <SkeletonClientCard key={i} />)
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <div key={client.id} onClick={() => setSelectedClient(client)} className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-[#1B1C1C] text-[#F0971A] flex items-center justify-center text-3xl font-black group-hover:bg-[#F0971A] group-hover:text-[#1B1C1C] transition-all duration-500 shadow-xl">{client.name[0]}</div>
                <div>
                  <h4 className="font-black text-[#1B1C1C] text-xl tracking-tighter group-hover:text-[#F0971A] transition-colors uppercase leading-none">{client.name}</h4>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">{client.company || 'Private'}</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                 <div className="flex items-center gap-4 text-xs text-gray-500 font-bold border-l-4 border-gray-100 pl-4">{client.email}</div>
                 <div className="flex items-center gap-4 text-xs text-gray-500 font-bold border-l-4 border-gray-100 pl-4">{client.phone}</div>
              </div>
              <div className="pt-8 border-t border-gray-50 flex justify-between items-center">
                <span className={`text-[9px] font-black px-4 py-1.5 rounded-xl tracking-[0.2em] ${client.status === 'Active' ? 'bg-[#F0971A]/10 text-[#F0971A]' : 'bg-gray-100 text-gray-400'}`}>{client.status.toUpperCase()}</span>
                <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest">ONBOARD {client.createdAt}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-40">
             <div className="text-6xl mb-6">{ICONS.CLIENTS}</div>
             <p className="text-sm font-black uppercase tracking-widest">No Matches Found in Registry</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ClientFormModal 
          onClose={() => { setIsModalOpen(false); setEditingClient(null); }} 
          onSubmit={handleSaveClient} 
          initialData={editingClient || undefined}
        />
      )}

      {isDeleteConfirmOpen && (
        <DeleteConfirmModal 
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleDeleteClient}
          title="IDENTITY PURGE"
          message={`Confirm permanent removal of ${selectedClient?.name} from Abu Dhabi active nodes?`}
        />
      )}
    </div>
  );
};

const SkeletonClientCard = () => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm animate-pulse">
    <div className="flex items-center gap-6 mb-8">
      <div className="w-16 h-16 rounded-[1.5rem] bg-gray-100"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-100 rounded-full w-32"></div>
        <div className="h-2 bg-gray-50 rounded-full w-20"></div>
      </div>
    </div>
    <div className="space-y-4 mb-8">
      <div className="h-2 bg-gray-50 rounded-full w-full"></div>
      <div className="h-2 bg-gray-50 rounded-full w-5/6"></div>
    </div>
    <div className="pt-8 border-t border-gray-50 flex justify-between">
      <div className="h-4 bg-gray-50 rounded-xl w-16"></div>
      <div className="h-2 bg-gray-50 rounded-full w-24"></div>
    </div>
  </div>
);

const ClientFormModal: React.FC<{
  onClose: () => void;
  onSubmit: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  initialData?: Client;
}> = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    status: initialData?.status || 'Active' as 'Active' | 'Inactive'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Full Legal Identity Required";
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid Registry Email";
    if (!formData.phone.trim()) newErrors.phone = "Communication Line Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      // Toast handles visual feedback
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#1B1C1C]/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        <div className="bg-[#1B1C1C] px-12 py-10 text-white flex justify-between items-center border-b-8 border-[#F0971A]">
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter">{initialData ? 'Update Record' : 'Registry Entry'}</h3>
            <p className="text-[#F0971A] text-[10px] font-black uppercase tracking-[0.2em] mt-1">Direct KYC Authorization</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><span className="text-2xl">×</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-12 space-y-6">
          <FormInput label="Account Holder" placeholder="e.g. Ahmad Al-Fayed" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required error={errors.name} />
          <FormInput label="Secure Email" placeholder="identity@node.ae" type="email" value={formData.email} onChange={(v) => setFormData({...formData, email: v})} required error={errors.email} />
          <div className="grid grid-cols-2 gap-6">
            <FormInput label="Direct Line" placeholder="+971..." value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} required error={errors.phone} />
            <FormInput label="Corporate" placeholder="License Name" value={formData.company || ''} onChange={(v) => setFormData({...formData, company: v})} />
          </div>
          <FormSelect label="Access Level" value={formData.status} onChange={(v) => setFormData({...formData, status: v as 'Active' | 'Inactive'})} options={[{ label: 'Active - Verified', value: 'Active' }, { label: 'Inactive - Locked', value: 'Inactive' }]} required />
          <div className="flex gap-6 pt-10">
            <ActionButton label="Abort" variant="outline" onClick={onClose} disabled={isSubmitting} fullWidth />
            <ActionButton label={initialData ? 'Commit' : 'Authorize'} variant="primary" type="submit" loading={isSubmitting} fullWidth />
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmModal: React.FC<{
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ onClose, onConfirm, title, message }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-[#1B1C1C]/90 backdrop-blur-lg" onClick={onClose} />
    <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-12 shadow-2xl border-t-[14px] border-red-600">
      <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2.5rem] flex items-center justify-center mb-10 mx-auto">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </div>
      <h3 className="text-3xl font-black text-center mb-4 uppercase tracking-tighter">{title}</h3>
      <p className="text-gray-500 text-sm text-center mb-12 font-bold leading-relaxed">{message}</p>
      <div className="flex gap-6">
        <ActionButton label="Cancel" variant="outline" onClick={onClose} fullWidth />
        <ActionButton label="Purge" variant="danger" onClick={onConfirm} fullWidth />
      </div>
    </div>
  </div>
);

const DetailItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="group text-left">
    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-colors group-hover:text-[#F0971A]">{label}</div>
    <div className="text-[#1B1C1C] font-black mt-1 text-base tracking-tight">{value}</div>
  </div>
);
