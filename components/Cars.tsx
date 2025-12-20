
import React, { useState, useEffect } from 'react';
// Added TabType to imports
import { Car, CarStatus, Lease, LeaseStatus, Transaction, TabType } from '../types';
import { ICONS, COLORS } from '../constants';
import { getCarMarketInsights, MarketInsight } from '../services/geminiService';

// Added externalTrigger prop to fix Type error in App.tsx
export const CarsList: React.FC<{ externalTrigger?: { tab: TabType; timestamp: number } | null }> = ({ externalTrigger }) => {
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  
  // Simulation of a global state/db
  const [cars, setCars] = useState<Car[]>([
    { id: '1', make: 'Audi', model: 'Q7', year: 2023, vin: 'AUDI123456789', licensePlate: 'DXB-7721', status: CarStatus.AVAILABLE, mileage: 12000, dailyRate: 450 },
    { id: '2', make: 'Tesla', model: 'Model Y', year: 2024, vin: 'TSLA998877665', licensePlate: 'DXB-1109', status: CarStatus.LEASED, mileage: 5000, dailyRate: 350 },
    { id: '3', make: 'Toyota', model: 'Land Cruiser', year: 2022, vin: 'TOYO554433221', licensePlate: 'DXB-8888', status: CarStatus.MAINTENANCE, mileage: 45000, dailyRate: 600 },
  ]);

  // Listen for global "Add" triggers
  useEffect(() => {
    if (externalTrigger?.tab === 'cars') {
      setEditingCar(null);
      setIsModalOpen(true);
    }
  }, [externalTrigger]);

  // Mock lease lookup for detail view
  const currentLease = selectedCar?.status === CarStatus.LEASED ? {
    id: 'L-001',
    clientId: 'C-001',
    carId: selectedCar.id,
    startDate: '2023-12-01',
    endDate: '2024-12-01',
    totalValue: 125000,
    status: LeaseStatus.ACTIVE,
    deposit: 15000
  } : null;

  useEffect(() => {
    if (selectedCar) {
      setLoadingInsight(true);
      getCarMarketInsights(selectedCar.make, selectedCar.model, selectedCar.year).then(res => {
        setInsight(res);
        setLoadingInsight(false);
      });
    } else {
      setInsight(null);
    }
  }, [selectedCar]);

  const handleSaveCar = (formData: Omit<Car, 'id' | 'status'>) => {
    if (editingCar) {
      setCars(cars.map(c => c.id === editingCar.id ? { ...c, ...formData } : c));
      if (selectedCar?.id === editingCar.id) {
        setSelectedCar({ ...selectedCar, ...formData });
      }
    } else {
      const car: Car = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        status: CarStatus.AVAILABLE,
      };
      setCars([car, ...cars]);
    }
    setIsModalOpen(false);
    setEditingCar(null);
  };

  const handleDeleteCar = () => {
    if (selectedCar) {
      setCars(cars.filter(c => c.id !== selectedCar.id));
      setSelectedCar(null);
      setIsDeleteConfirmOpen(false);
    }
  };

  if (selectedCar) {
    return (
      <div className="animate-in slide-in-from-right duration-500 ease-out space-y-10">
        {/* Navigation & Action Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <button 
            onClick={() => setSelectedCar(null)} 
            className="flex items-center gap-3 text-[#1B1C1C] font-black uppercase text-xs tracking-[0.2em] hover:text-[#F0971A] active:scale-95 transition-all group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Inventory
          </button>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="px-6 py-3 border-2 border-gray-100 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#1B1C1C] hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              View Lease History
            </button>
            <button 
              onClick={() => { setEditingCar(selectedCar); setIsModalOpen(true); }}
              className="px-6 py-3 bg-[#1B1C1C] text-[#F0971A] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Car
            </button>
            <button 
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="px-6 py-3 border-2 border-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all"
            >
              Retire Asset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Visuals & Specs */}
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-700">
              <div className="relative h-[32rem] bg-[#1B1C1C]">
                <img 
                  src={`https://picsum.photos/seed/${selectedCar.id}-detail/1200/800`} 
                  className="w-full h-full object-cover opacity-70 group-hover:scale-110 transition-transform duration-[20s]" 
                  alt={selectedCar.model}
                />
                <div className="absolute top-10 right-10 flex gap-4">
                  <span className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.3em] shadow-2xl ${
                    selectedCar.status === CarStatus.AVAILABLE ? 'bg-[#F0971A] text-[#1B1C1C]' :
                    selectedCar.status === CarStatus.LEASED ? 'bg-white text-[#1B1C1C]' : 'bg-red-500 text-white'
                  }`}>
                    {selectedCar.status}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-12 bg-gradient-to-t from-[#1B1C1C] via-[#1B1C1C]/40 to-transparent">
                   <h2 className="text-7xl font-black text-white tracking-tighter uppercase leading-tight">
                     {selectedCar.year} {selectedCar.make} <span className="text-[#F0971A]">{selectedCar.model}</span>
                   </h2>
                   <div className="flex items-center gap-6 mt-6">
                      <div className="bg-[#F0971A] px-5 py-2 rounded-xl">
                        <p className="text-[#1B1C1C] text-xl font-black uppercase tracking-[0.3em]">{selectedCar.licensePlate}</p>
                      </div>
                      <div className="h-6 w-px bg-white/20"></div>
                      <p className="text-gray-400 text-sm font-bold tracking-[0.2em] uppercase">VIN: {selectedCar.vin}</p>
                   </div>
                </div>
              </div>
              
              <div className="p-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 pb-16 border-b border-gray-50">
                   <DetailMetric label="Logged Distance" value={`${selectedCar.mileage.toLocaleString()} KM`} icon={ICONS.CARS} />
                   <DetailMetric label="Daily Revenue" value={`${selectedCar.dailyRate} AED`} icon={ICONS.FINANCE} />
                   <DetailMetric label="Maintenance" value="Optimal" icon={ICONS.SPARKLE} />
                   <DetailMetric label="Fuel Range" value="Full Tank" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                  <div className="space-y-8">
                    <h3 className="font-black text-[#1B1C1C] uppercase tracking-[0.3em] text-[10px] border-b-2 border-[#F0971A] w-fit pb-1">Technical DNA</h3>
                    <div className="space-y-4">
                      <SpecRow label="Transmission" value="Dual-Clutch Automatic" />
                      <SpecRow label="Drivetrain" value="Adaptive All-Wheel" />
                      <SpecRow label="Engine Configuration" value="3.0L V6 Powerplant" />
                      <SpecRow label="Upholstery" value="Nappa Leather (Black)" />
                      <SpecRow label="Efficiency" value="8.4L / 100KM" />
                    </div>
                  </div>
                  <div className="space-y-8">
                    <h3 className="font-black text-[#1B1C1C] uppercase tracking-[0.3em] text-[10px] border-b-2 border-[#F0971A] w-fit pb-1">Governance & Docs</h3>
                    <div className="space-y-4">
                      <SpecRow label="Registration Expiry" value="Aug 2025" />
                      <SpecRow label="Insurance Tier" value="Comprehensive Platinum" />
                      <SpecRow label="Manufacturer Warranty" value="Active till 2028" />
                      <SpecRow label="Service Interval" value="Every 15,000 KM" />
                      <SpecRow label="Owner ID" value="Instabuy Fleet Abu Dhabi" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Current Lease & AI Intelligence */}
          <div className="space-y-10">
            {/* Current Engagement Panel */}
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right duration-700 delay-200 fill-mode-both">
              <h3 className="font-black text-[#1B1C1C] mb-8 uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F0971A]"></div>
                Current Engagement
              </h3>
              
              {selectedCar.status === CarStatus.LEASED && currentLease ? (
                <div className="space-y-8">
                  <div className="flex items-center gap-5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-16 h-16 rounded-2xl bg-[#1B1C1C] text-[#F0971A] flex items-center justify-center text-2xl font-black shadow-lg">
                      A
                    </div>
                    <div>
                      <h4 className="font-black text-[#1B1C1C] text-lg tracking-tight uppercase leading-none">Ahmad Al-Fayed</h4>
                      <p className="text-[10px] text-[#F0971A] font-black uppercase tracking-[0.3em] mt-2">Active Lessee</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Maturity Date</p>
                       <p className="text-base font-black text-[#1B1C1C] mt-1 uppercase">{currentLease.endDate}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Monthly Yield</p>
                       <p className="text-base font-black text-[#F0971A] mt-1">12,500 AED <span className="text-[10px] text-gray-400 tracking-normal">/ month</span></p>
                    </div>
                  </div>

                  <button className="w-full py-5 bg-[#1B1C1C] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#F0971A] hover:text-[#1B1C1C] transition-all shadow-xl active:scale-95">
                    Agreement Hub
                  </button>
                </div>
              ) : (
                <div className="p-12 border-4 border-dashed border-gray-50 rounded-[2.5rem] text-center space-y-6 flex flex-col items-center">
                   <div className="w-16 h-16 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-200">
                      {ICONS.LEASING}
                   </div>
                   <div className="space-y-1">
                     <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Asset Unallocated</p>
                     <p className="text-[10px] text-gray-300 font-medium">No active contracts assigned to this VIN</p>
                   </div>
                   <button className="px-8 py-3 bg-[#F0971A] text-[#1B1C1C] rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-orange-100">
                     Initiate Lease
                   </button>
                </div>
              )}
            </div>

            {/* AI Market Analysis Panel */}
            <div className="bg-[#1B1C1C] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group border-b-[12px] border-[#F0971A] animate-in fade-in slide-in-from-right duration-700 delay-400 fill-mode-both">
               <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform group-hover:scale-150 duration-1000 text-white">
                 {ICONS.SPARKLE}
               </div>
               <h3 className="font-black text-white mb-8 flex items-center gap-3 uppercase tracking-[0.1em] text-sm">
                  <div className="text-[#F0971A]">{ICONS.SPARKLE}</div>
                  Gemini Market Intel
               </h3>
               
               {loadingInsight ? (
                  <div className="space-y-6 animate-pulse">
                     <div className="h-4 bg-white/10 rounded-full w-full"></div>
                     <div className="h-4 bg-white/10 rounded-full w-5/6"></div>
                     <div className="h-4 bg-white/10 rounded-full w-4/6"></div>
                  </div>
               ) : insight ? (
                  <div className="animate-in fade-in duration-700">
                     <p className="text-sm text-gray-300 leading-relaxed font-medium italic border-l-4 border-[#F0971A] pl-6 py-1">
                        "{insight.summary}"
                     </p>
                     
                     {insight.sources.length > 0 && (
                       <div className="mt-8 pt-6 border-t border-white/5">
                         <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Grounding Sources</p>
                         <div className="flex flex-wrap gap-2">
                           {insight.sources.slice(0, 3).map((src, i) => (
                             <a 
                               key={i} 
                               href={src.uri} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="px-4 py-1.5 bg-white/5 hover:bg-[#F0971A] hover:text-[#1B1C1C] text-[8px] font-black uppercase tracking-widest text-gray-400 rounded-full transition-all truncate max-w-[120px]"
                               title={src.title}
                             >
                               {src.title}
                             </a>
                           ))}
                         </div>
                       </div>
                     )}
                  </div>
               ) : (
                  <p className="text-xs text-gray-500 uppercase font-black tracking-widest text-center py-4">Analysis Engine Offline</p>
               )}
            </div>
          </div>
        </div>

        {/* Modal Components */}
        {isDeleteConfirmOpen && (
          <DeleteConfirmModal 
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={handleDeleteCar}
            title="VEHICLE DISPOSAL"
            message={`Are you sure you want to retire the ${selectedCar.year} ${selectedCar.make} ${selectedCar.model}? This will purge its data from the active Instabuy inventory.`}
          />
        )}
        
        {isModalOpen && (
          <CarFormModal 
            onClose={() => { setIsModalOpen(false); setEditingCar(null); }} 
            onSubmit={handleSaveCar} 
            initialData={editingCar || undefined}
          />
        )}

        {isHistoryOpen && (
          <LeaseHistoryModal 
            onClose={() => setIsHistoryOpen(false)}
            carId={selectedCar.id}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h2 className="text-5xl font-black text-[#1B1C1C] tracking-tighter uppercase leading-none">Fleet Inventory</h2>
          <p className="text-base text-gray-500 font-bold mt-4 tracking-tight">Managing {cars.length} high-value assets for Instabuy Car Broker</p>
        </div>
        <button 
          onClick={() => { setEditingCar(null); setIsModalOpen(true); }}
          className="bg-[#1B1C1C] text-[#F0971A] px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[13px] hover:bg-[#F0971A] hover:text-[#1B1C1C] active:scale-95 transition-all shadow-2xl flex items-center gap-3 border-b-4 border-transparent hover:border-[#1B1C1C]"
        >
          <span className="text-2xl font-black leading-none -mt-1">+</span>
          Acquire Vehicle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {cars.map((car, idx) => (
          <div 
            key={car.id} 
            onClick={() => setSelectedCar(car)}
            className="bg-white rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-4 transition-all cursor-pointer group overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500 fill-mode-both"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="relative h-72 overflow-hidden bg-[#1B1C1C]">
               <img 
                 src={`https://picsum.photos/seed/${car.id}/800/600`} 
                 className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-60 transition-all duration-1000 ease-out" 
                 alt={car.model} 
               />
               <div className="absolute top-6 right-6">
                  <span className={`text-[10px] font-black px-5 py-2 rounded-full shadow-2xl tracking-[0.2em] ${
                     car.status === CarStatus.AVAILABLE ? 'bg-[#F0971A] text-[#1B1C1C]' :
                     car.status === CarStatus.LEASED ? 'bg-white text-[#1B1C1C]' : 'bg-red-500 text-white'
                  }`}>
                    {car.status.toUpperCase()}
                  </span>
               </div>
               <div className="absolute bottom-6 left-6 bg-[#1B1C1C]/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10">
                 <p className="text-[11px] font-black text-[#F0971A] uppercase tracking-[0.3em] leading-none">{car.licensePlate}</p>
               </div>
            </div>
            <div className="p-10 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="font-black text-[#1B1C1C] text-3xl tracking-tighter group-hover:text-[#F0971A] transition-colors uppercase leading-none">
                     {car.make} {car.model}
                   </h3>
                   <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.3em] mt-3">{car.year} LIMITED EDITION</p>
                </div>
                <div className="text-right">
                   <p className="text-2xl font-black text-[#1B1C1C] leading-none">{car.dailyRate}</p>
                   <p className="text-[10px] font-black text-[#F0971A] uppercase tracking-widest mt-1">AED / DAY</p>
                </div>
              </div>
              <div className="mt-auto pt-8 border-t border-gray-50 flex items-center justify-between">
                 <div className="flex items-center gap-2 text-[11px] text-gray-500 font-black uppercase tracking-widest group-hover:text-[#F0971A] transition-all">
                    <svg className="w-5 h-5 text-[#F0971A] transition-transform group-hover:scale-125" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Instabuy Rated
                 </div>
                 <div className="text-[11px] text-white font-black bg-[#1B1C1C] px-5 py-2.5 rounded-2xl uppercase tracking-[0.2em] shadow-lg group-hover:bg-[#F0971A] group-hover:text-[#1B1C1C] transition-all">
                    {car.mileage.toLocaleString()} KM
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <CarFormModal 
          onClose={() => { setIsModalOpen(false); setEditingCar(null); }} 
          onSubmit={handleSaveCar} 
          initialData={editingCar || undefined}
        />
      )}
    </div>
  );
};

// Internal Sub-Components
const DetailMetric = ({ label, value, icon }: { label: string, value: string, icon: any }) => (
  <div className="group cursor-default">
     <div className="w-14 h-14 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-[#F0971A] mb-5 shadow-sm group-hover:bg-[#1B1C1C] group-hover:scale-110 transition-all duration-500">
        {icon}
     </div>
     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
     <p className="text-xl font-black text-[#1B1C1C] mt-1 group-hover:text-[#F0971A] transition-colors">{value}</p>
  </div>
);

const SpecRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-xl transition-all group">
    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#F0971A] transition-colors">{label}</span>
    <span className="text-sm font-bold text-[#1B1C1C] tracking-tight">{value}</span>
  </div>
);

const LeaseHistoryModal: React.FC<{ onClose: () => void, carId: string }> = ({ onClose, carId }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-[#1B1C1C]/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
    <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="bg-[#1B1C1C] px-12 py-10 text-white flex justify-between items-center border-b-[12px] border-[#F0971A]">
        <div>
          <h3 className="text-3xl font-black uppercase tracking-tighter">Lease Timeline</h3>
          <p className="text-[#F0971A] text-[11px] font-black uppercase tracking-[0.4em] mt-1">Audit Trail for Asset ID: {carId}</p>
        </div>
        <button onClick={onClose} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-[#F0971A] hover:text-[#1B1C1C] active:scale-90 transition-all">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-12 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
        {[
          { id: '102', client: 'Sarah Jenkins', period: 'Jan 2024 - Dec 2024', val: 85000, status: 'Active' },
          { id: '098', client: 'Abu Dhabi Tech', period: 'Jun 2023 - Dec 2023', val: 42000, status: 'Completed' },
          { id: '081', client: 'Khalifa Logistics', period: 'Jan 2023 - May 2023', val: 38500, status: 'Completed' },
        ].map((hist, i) => (
          <div key={i} className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex justify-between items-center group hover:bg-white hover:shadow-xl transition-all border-l-[10px] border-[#1B1C1C]">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-[#F0971A] group-hover:scale-110 transition-transform">
                {ICONS.LEASING}
              </div>
              <div>
                 <p className="text-xl font-black text-[#1B1C1C] uppercase tracking-tighter">{hist.client}</p>
                 <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Ref ID: #{hist.id} • {hist.period}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1B1C1C] tracking-tighter">{hist.val.toLocaleString()} <span className="text-xs uppercase font-black text-gray-400">AED</span></p>
              <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mt-3 block w-fit ml-auto shadow-sm ${
                hist.status === 'Active' ? 'bg-[#F0971A] text-[#1B1C1C]' : 'bg-gray-200 text-gray-500'
              }`}>
                {hist.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CarFormModal: React.FC<{
  onClose: () => void;
  onSubmit: (car: Omit<Car, 'id' | 'status'>) => void;
  initialData?: Car;
}> = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    make: initialData?.make || '',
    model: initialData?.model || '',
    year: initialData?.year || new Date().getFullYear(),
    vin: initialData?.vin || '',
    licensePlate: initialData?.licensePlate || '',
    mileage: initialData?.mileage || 0,
    dailyRate: initialData?.dailyRate || 0,
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#1B1C1C]/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 ease-out">
        <div className="bg-[#1B1C1C] px-12 py-10 text-white flex justify-between items-center border-b-[10px] border-[#F0971A]">
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter">{initialData ? 'Update Asset' : 'Fleet Expansion'}</h3>
            <p className="text-[#F0971A] text-[11px] font-black uppercase tracking-[0.3em] mt-1">Global Inventory Registration Hub</p>
          </div>
          <button onClick={onClose} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-[#F0971A] hover:text-[#1B1C1C] active:scale-90 transition-all">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-12 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            <FormInput label="Manufacturer" placeholder="e.g. Audi" value={formData.make} onChange={(v) => setFormData({...formData, make: v})} required />
            <FormInput label="Specific Model" placeholder="e.g. Q7" value={formData.model} onChange={(v) => setFormData({...formData, model: v})} required />
          </div>
          <div className="grid grid-cols-2 gap-8">
            <FormInput label="Production Year" placeholder="2024" type="number" value={formData.year.toString()} onChange={(v) => setFormData({...formData, year: parseInt(v) || 0})} required />
            <FormInput label="VIN Registry" placeholder="17-Digit Serial" value={formData.vin} onChange={(v) => setFormData({...formData, vin: v})} required />
          </div>
          <FormInput label="Regional Plate ID" placeholder="DXB-XXXX" value={formData.licensePlate} onChange={(v) => setFormData({...formData, licensePlate: v})} required />
          <div className="grid grid-cols-2 gap-8">
            <FormInput label="Logged Distance" type="number" placeholder="0" value={formData.mileage.toString()} onChange={(v) => setFormData({...formData, mileage: parseInt(v) || 0})} required />
            <FormInput label="Daily Asset Yield" type="number" placeholder="0" value={formData.dailyRate.toString()} onChange={(v) => setFormData({...formData, dailyRate: parseInt(v) || 0})} required />
          </div>
          
          <div className="flex gap-6 pt-8">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-6 rounded-[1.8rem] border-2 border-gray-100 text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-50 active:scale-95 transition-all">Abort</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-6 rounded-[1.8rem] bg-[#F0971A] text-[#1B1C1C] font-black uppercase tracking-widest text-xs shadow-2xl shadow-orange-100 hover:bg-[#1B1C1C] hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Syncing...
                </>
              ) : (initialData ? 'Authorize Update' : 'Register Vehicle')}
            </button>
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
  <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-[#1B1C1C]/90 backdrop-blur-lg animate-in fade-in duration-300" onClick={onClose} />
    <div className="relative bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl p-12 animate-in zoom-in-95 duration-300 border-t-[14px] border-red-600">
      <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2.5rem] flex items-center justify-center mb-10 mx-auto animate-bounce">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <h3 className="text-3xl font-black text-[#1B1C1C] text-center mb-4 uppercase tracking-tighter">{title}</h3>
      <p className="text-gray-500 text-sm text-center mb-12 leading-relaxed font-bold tracking-tight">{message}</p>
      <div className="flex gap-6">
        <button onClick={onClose} className="flex-1 py-5 rounded-[1.5rem] bg-gray-100 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 active:scale-95 transition-all">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-5 rounded-[1.5rem] bg-red-600 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-red-100 hover:bg-red-700 active:scale-95 transition-all">Purge Asset</button>
      </div>
    </div>
  </div>
);

const FormInput: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}> = ({ label, placeholder, value, onChange, type = 'text', required }) => (
  <div className="group space-y-3 text-left">
    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 transition-colors group-focus-within:text-[#F0971A]">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input 
      type={type}
      placeholder={placeholder}
      className="w-full px-8 py-5 rounded-[1.8rem] border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#F0971A] focus:ring-0 outline-none transition-all placeholder:text-gray-300 text-base font-bold text-[#1B1C1C]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    />
  </div>
);
