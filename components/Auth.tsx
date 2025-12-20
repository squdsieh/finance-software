
import React, { useState } from 'react';
import { ICONS } from '../constants';

interface AuthProps {
  onSuccess: () => void;
}

export const AuthScreen: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth logic
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 1500);
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    setFormData({
      email: 'demo@instabuy.ae',
      password: 'password123',
      name: 'Demo Broker'
    });
    
    // Simulate demo authentication
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-4 py-12">
      {/* Branding Header */}
      <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="bg-[#1B1C1C] p-4 rounded-2xl inline-block mb-4 shadow-xl border-b-4 border-[#F0971A]">
           <div className="text-[#F0971A] font-black text-3xl tracking-tighter uppercase">IB</div>
        </div>
        <h1 className="text-3xl font-black text-[#1B1C1C] tracking-tighter uppercase">Instabuy CRM</h1>
        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Fleet Management Portal</p>
      </div>

      {/* Auth Card */}
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="bg-[#1B1C1C] p-8 text-white flex justify-between items-end border-b-4 border-[#F0971A]">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">{isLogin ? 'Welcome Back' : 'Join Fleet'}</h2>
            <p className="text-[#F0971A] text-[10px] font-black uppercase tracking-[0.2em] mt-1">
              {isLogin ? 'Verify your identity' : 'Create broker account'}
            </p>
          </div>
          <div className="text-white/20">{ICONS.LEASING}</div>
        </div>

        <div className="p-10 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {!isLogin && (
                <AuthInput 
                  label="Full Name" 
                  placeholder="John Doe" 
                  value={formData.name} 
                  onChange={(v) => setFormData({...formData, name: v})} 
                  required 
                />
              )}
              <AuthInput 
                label="Fleet ID / Email" 
                placeholder="name@instabuy.ae" 
                type="email"
                value={formData.email} 
                onChange={(v) => setFormData({...formData, email: v})} 
                required 
              />
              <AuthInput 
                label="Password" 
                placeholder="••••••••" 
                type="password"
                value={formData.password} 
                onChange={(v) => setFormData({...formData, password: v})} 
                required 
              />
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <button type="button" className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#F0971A] transition-colors">
                  Forgot Password?
                </button>
              </div>
            )}

            <div className="space-y-3">
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-5 rounded-2xl bg-[#F0971A] text-[#1B1C1C] font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-[#1B1C1C] hover:text-white active:scale-95 transition-all flex items-center justify-center gap-3 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isLoading && isLogin ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Initializing...
                  </>
                ) : (isLogin ? 'Initialize Session' : 'Register Broker')}
              </button>

              {isLogin && (
                <button 
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  className="w-full py-5 rounded-2xl border-2 border-[#1B1C1C] text-[#1B1C1C] font-black uppercase tracking-widest text-[11px] hover:bg-[#1B1C1C] hover:text-[#F0971A] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {ICONS.SPARKLE} Explore Demo Account
                </button>
              )}
            </div>

            <div className="pt-6 border-t border-gray-50 text-center">
              <button 
                type="button" 
                onClick={() => setIsLogin(!isLogin)}
                className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-[#1B1C1C] transition-colors"
              >
                {isLogin ? "New to Instabuy? Create Account" : "Already registered? Login here"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <p className="mt-12 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] max-w-xs text-center leading-relaxed">
        Authorized Access Only. All transactions logged in Instabuy Abu Dhabi Network.
      </p>
    </div>
  );
};

const AuthInput: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}> = ({ label, placeholder, value, onChange, type = 'text', required }) => (
  <div className="group space-y-2 text-left">
    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-[#F0971A]">
      {label}
    </label>
    <input 
      type={type}
      placeholder={placeholder}
      className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#F0971A] focus:ring-0 outline-none transition-all placeholder:text-gray-300 text-sm font-bold text-[#1B1C1C]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    />
  </div>
);
