
import React, { useState, useEffect, createContext, useContext } from 'react';
import { COLORS, ICONS } from './constants';
import { Dashboard } from './components/Dashboard';
import { ClientsList } from './components/Clients';
import { CarsList } from './components/Cars';
import { LeasingList } from './components/Leasing';
import { FinanceSummary } from './components/Finance';
import { TabType } from './types';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/Auth';
import { FloatingActionButton, NotificationProvider } from './components/UI';

// Context for global modal management
interface GlobalActionContextType {
  openAddModal: (tab?: TabType) => void;
}
export const GlobalActionContext = createContext<GlobalActionContextType>({
  openAddModal: () => {},
});

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [modalTrigger, setModalTrigger] = useState<{ tab: TabType; timestamp: number } | null>(null);

  const openAddModal = (tab?: TabType) => {
    const targetTab = tab || activeTab;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    // Set a trigger that the sub-components can listen to
    setModalTrigger({ tab: targetTab, timestamp: Date.now() });
  };

  const renderContent = () => {
    // Pass the trigger to components that need it
    const triggerProps = { externalTrigger: modalTrigger };
    
    switch (activeTab) {
      case 'home': return <Dashboard onAction={openAddModal} />;
      case 'clients': return <ClientsList {...triggerProps} />;
      case 'cars': return <CarsList {...triggerProps} />;
      case 'leasing': return <LeasingList {...triggerProps} />;
      case 'finance': return <FinanceSummary {...triggerProps} />;
      default: return <Dashboard onAction={openAddModal} />;
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isInitializing) {
    return <SplashScreen onFinish={() => setIsInitializing(false)} />;
  }

  if (!isAuthenticated) {
    return <AuthScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <NotificationProvider>
      <GlobalActionContext.Provider value={{ openAddModal }}>
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
          <header className="bg-[#1B1C1C] px-8 py-5 flex items-center justify-between sticky top-0 z-30 shadow-2xl">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="bg-[#F0971A] w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12 shadow-lg">
                 <div className="text-[#1B1C1C] font-black text-2xl tracking-tighter uppercase">IB</div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">INSTABUY</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-[2px] w-4 bg-[#F0971A]"></div>
                  <p className="text-[10px] font-black text-[#F0971A] uppercase tracking-[0.4em] leading-none mt-2">CAR BROKER</p>
                  <div className="h-[2px] w-4 bg-[#F0971A]"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button className="p-2 text-gray-400 hover:text-[#F0971A] transition-all active:scale-90 relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#1B1C1C]"></span>
              </button>
              <div 
                onClick={handleLogout}
                className="w-12 h-12 rounded-full bg-[#F0971A] flex items-center justify-center text-[#1B1C1C] font-black text-sm border-2 border-white/10 cursor-pointer hover:ring-4 hover:ring-[#F0971A]/20 transition-all group relative"
              >
                JD
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#1B1C1C] rounded-full"></div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-24 scroll-smooth bg-[#F8F9FA]">
            <div key={activeTab} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
              {renderContent()}
            </div>
          </main>

          {/* Global FAB - contextually aware */}
          {activeTab !== 'home' && activeTab !== 'finance' && (
            <FloatingActionButton 
              onClick={() => openAddModal()} 
              icon={ICONS.ADD} 
            />
          )}

          <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 px-2 py-4 z-40 shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.08)]">
            <div className="max-w-4xl mx-auto flex justify-around items-center">
              <TabButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={ICONS.HOME} label="Home" />
              <TabButton active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} icon={ICONS.CLIENTS} label="Clients" />
              <TabButton active={activeTab === 'leasing'} onClick={() => setActiveTab('leasing')} icon={ICONS.LEASING} label="Leasing" />
              <TabButton active={activeTab === 'cars'} onClick={() => setActiveTab('cars')} icon={ICONS.CARS} label="Cars" />
              <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={ICONS.FINANCE} label="Finance" />
            </div>
          </nav>
        </div>
      </GlobalActionContext.Provider>
    </NotificationProvider>
  );
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 flex-1 transition-all group ${active ? 'text-[#F0971A]' : 'text-gray-400 hover:text-[#1B1C1C]'}`}>
    <div className={`p-2 rounded-2xl transition-all duration-300 ${active ? 'bg-[#F0971A]/10 scale-110 shadow-sm' : 'group-hover:bg-gray-50'}`}>
      {icon}
    </div>
    <span className={`text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${active ? 'translate-y-0 opacity-100' : 'opacity-70'}`}>{label}</span>
    {active && <div className="w-1.5 h-1.5 bg-[#F0971A] rounded-full animate-in zoom-in duration-300 mt-1" />}
  </button>
);
