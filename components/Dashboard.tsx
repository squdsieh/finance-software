
import React, { useState, useEffect } from 'react';
import { ICONS, COLORS } from '../constants';
import { getFleetPerformanceSummary } from '../services/geminiService';
import { DashboardStats, Activity, TabType } from '../types';

export const Dashboard: React.FC<{ onAction?: (tab: TabType) => void }> = ({ onAction }) => {
  const [stats] = useState<DashboardStats>({
    activeLeases: 124,
    pendingApprovals: 8,
    totalClients: 450,
    availableCars: 15,
    monthlyRevenue: 285000,
  });

  const [aiInsight, setAiInsight] = useState<string>("Analyzing current fleet data...");
  const [activities] = useState<Activity[]>([
    { id: '1', type: 'Lease', action: 'New Lease Created', timestamp: '2 mins ago', user: 'Sarah K.', details: 'Audi Q7 for client TechCorp' },
    { id: '2', type: 'Client', action: 'New Client Registered', timestamp: '1 hour ago', user: 'Admin', details: 'Ahmad Al-Fayed' },
    { id: '3', type: 'Finance', action: 'Payment Received', timestamp: '3 hours ago', user: 'System', details: 'Invoice #8822 - 15,000 AED' },
    { id: '4', type: 'Car', action: 'Maintenance Completed', timestamp: 'Yesterday', user: 'Mechanic A.', details: 'Tesla Model Y - Oil Change' },
  ]);

  useEffect(() => {
    const loadInsights = async () => {
      const summary = await getFleetPerformanceSummary(stats);
      setAiInsight(summary);
    };
    loadInsights();
  }, [stats]);

  return (
    <div className="space-y-8">
      <section className="animate-in fade-in slide-in-from-left duration-700">
        <h2 className="text-3xl font-black text-[#1B1C1C] tracking-tight">Welcome, John.</h2>
        <p className="text-gray-500 font-medium">Instabuy 'Direct-to-Drive' performance today.</p>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Leases" value={stats.activeLeases.toString()} icon={ICONS.LEASING} color="bg-[#1B1C1C]" />
        <StatCard label="Pending" value={stats.pendingApprovals.toString()} icon={ICONS.ADD} color="bg-[#F0971A]" />
        <StatCard label="Total Clients" value={stats.totalClients.toString()} icon={ICONS.CLIENTS} color="bg-[#1B1C1C]" />
        <StatCard label="Available" value={stats.availableCars.toString()} icon={ICONS.CARS} color="bg-[#F0971A]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 animate-in fade-in slide-in-from-left duration-700 delay-300">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-[#1B1C1C] text-xl tracking-tight">Live Activity Feed</h3>
            <button className="text-[#F0971A] text-sm font-bold hover:underline active:scale-95 transition-transform uppercase tracking-wider">Historical Log</button>
          </div>
          <div className="space-y-6">
            {activities.map((activity, idx) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-700 delay-300">
          <div className="bg-[#1B1C1C] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group border-b-4 border-[#F0971A]">
            <div className="absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-125 duration-1000">
              <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6 bg-[#F0971A] w-fit px-4 py-1.5 rounded-full text-[10px] font-black text-[#1B1C1C] uppercase tracking-widest">
                {ICONS.SPARKLE} GEN-AI STRATEGY
              </div>
              <p className="text-base leading-relaxed mb-6 text-gray-300 font-medium italic">
                "{aiInsight}"
              </p>
              <button className="w-full bg-[#F0971A] text-[#1B1C1C] font-black py-4 rounded-2xl hover:bg-white active:scale-95 transition-all shadow-lg uppercase tracking-tight text-sm">
                Optimize Fleet
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <h3 className="font-black text-[#1B1C1C] mb-6 tracking-tight uppercase text-sm text-center">Direct Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickActionButton onClick={() => onAction?.('leasing')} label="New Lease" icon={ICONS.LEASING} color="bg-orange-50" textColor="text-[#F0971A]" />
              <QuickActionButton onClick={() => onAction?.('clients')} label="Add Client" icon={ICONS.CLIENTS} color="bg-gray-50" textColor="text-[#1B1C1C]" />
              <QuickActionButton onClick={() => onAction?.('cars')} label="Add Car" icon={ICONS.CARS} color="bg-gray-50" textColor="text-[#1B1C1C]" />
              <QuickActionButton onClick={() => onAction?.('finance')} label="Payment" icon={ICONS.FINANCE} color="bg-orange-50" textColor="text-[#F0971A]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
    <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg transition-transform group-hover:rotate-6 ${color === 'bg-[#F0971A]' ? 'text-[#1B1C1C]' : 'text-[#F0971A]'}`}>
      {icon}
    </div>
    <div className="text-4xl font-black text-[#1B1C1C] tracking-tighter">{value}</div>
    <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mt-2">{label}</div>
  </div>
);

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => (
  <div className="flex gap-5 p-4 rounded-2xl hover:bg-gray-50 transition-all duration-300 border-l-4 border-transparent hover:border-[#F0971A] cursor-pointer group">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110 ${
      activity.type === 'Lease' ? 'bg-[#F0971A]/10 text-[#F0971A]' :
      activity.type === 'Client' ? 'bg-[#1B1C1C] text-white' :
      activity.type === 'Finance' ? 'bg-green-50 text-green-600' : 'bg-[#1B1C1C] text-[#F0971A]'
    }`}>
      {activity.type === 'Lease' ? ICONS.LEASING : activity.type === 'Client' ? ICONS.CLIENTS : activity.type === 'Finance' ? ICONS.FINANCE : ICONS.CARS}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start">
        <h4 className="font-black text-[#1B1C1C] text-sm tracking-tight">{activity.action}</h4>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{activity.timestamp}</span>
      </div>
      <p className="text-sm text-gray-500 mt-1 truncate font-medium">{activity.details}</p>
    </div>
  </div>
);

const QuickActionButton: React.FC<{ label: string, icon: React.ReactNode, color: string, textColor: string, onClick: () => void }> = ({ label, icon, color, textColor, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-5 rounded-2xl ${color} ${textColor} hover:scale-105 active:scale-95 transition-all border border-transparent hover:border-current shadow-sm group`}
  >
    <div className="mb-2 transition-transform group-hover:scale-125">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
  </button>
);
