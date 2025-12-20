
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// --- Notification Logic ---

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
        {notifications.map((n) => (
          <Toast key={n.id} message={n.message} type={n.type} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

const Toast: React.FC<{ message: string; type: NotificationType }> = ({ message, type }) => {
  const colors = {
    success: 'bg-[#1B1C1C] border-[#10B981] text-white',
    error: 'bg-red-600 border-red-400 text-white',
    info: 'bg-[#1B1C1C] border-[#F0971A] text-white'
  };

  const icons = {
    success: <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>,
    error: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>,
    info: <svg className="w-5 h-5 text-[#F0971A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-2xl border-l-8 shadow-2xl animate-in slide-in-from-top-10 fade-in duration-500 fill-mode-both ${colors[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="text-xs font-black uppercase tracking-widest">{message}</p>
    </div>
  );
};

// --- Form Components ---

interface FormInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text', 
  required,
  error 
}) => (
  <div className="group space-y-2 text-left">
    <div className="flex justify-between items-center ml-1">
      <label className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${error ? 'text-red-500' : 'text-gray-400 group-focus-within:text-[#F0971A]'}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {error && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{error}</span>}
    </div>
    <input 
      type={type}
      placeholder={placeholder}
      className={`w-full px-6 py-4 rounded-2xl border-2 bg-gray-50 focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-300 text-sm font-bold text-[#1B1C1C] ${
        error ? 'border-red-500 focus:border-red-500' : 'border-gray-50 focus:border-[#F0971A]'
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    />
  </div>
);

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  value,
  onChange,
  options,
  required,
  placeholder = "Select an option"
}) => (
  <div className="group space-y-2 text-left">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-[#F0971A]">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <select 
        className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#F0971A] focus:ring-0 outline-none transition-all text-sm font-bold text-[#1B1C1C] appearance-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[#F0971A]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

// --- Button Components ---

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  type = 'button',
  variant = 'primary',
  loading,
  disabled,
  icon,
  fullWidth = false,
  className = ""
}) => {
  const baseStyles = "px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#F0971A] text-[#1B1C1C] shadow-lg hover:bg-[#1B1C1C] hover:text-white shadow-orange-100",
    secondary: "bg-[#1B1C1C] text-white shadow-xl hover:bg-[#F0971A] hover:text-[#1B1C1C]",
    danger: "bg-red-500 text-white shadow-lg shadow-red-100 hover:bg-red-600",
    outline: "border-2 border-gray-100 bg-white text-gray-400 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-400 hover:text-[#1B1C1C] hover:bg-gray-50"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Syncing...
        </>
      ) : (
        <>
          {icon && <span className="scale-125">{icon}</span>}
          {label}
        </>
      )}
    </button>
  );
};

export const FloatingActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode }> = ({ onClick, icon }) => (
  <button 
    onClick={onClick}
    className="fixed bottom-28 right-8 z-50 w-16 h-16 bg-[#F0971A] text-[#1B1C1C] rounded-2xl shadow-[0_20px_50px_rgba(240,151,26,0.3)] flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 border-b-4 border-[#1B1C1C]/20"
  >
    <div className="scale-150">{icon}</div>
  </button>
);
