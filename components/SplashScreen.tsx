
import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 500); // Wait for fade out animation
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[100] bg-[#1B1C1C] flex flex-col items-center justify-center transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="relative">
        {/* Animated Background Ring */}
        <div className="absolute inset-0 -m-8 border-4 border-[#F0971A]/20 rounded-full animate-ping duration-[3000ms]"></div>
        
        {/* Logo Container */}
        <div className="bg-[#F0971A] p-6 rounded-[2rem] shadow-[0_0_50px_rgba(240,151,26,0.3)] animate-in zoom-in duration-1000 ease-out">
          <div className="text-[#1B1C1C] font-black text-6xl tracking-tighter uppercase">IB</div>
        </div>
      </div>

      <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-both">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">INSTABUY</h1>
        <p className="text-[10px] font-black text-[#F0971A] uppercase tracking-[0.4em] leading-none mt-2">CAR BROKER</p>
        
        {/* Progress bar simulation */}
        <div className="w-32 h-1 bg-white/10 rounded-full mt-10 mx-auto overflow-hidden">
          <div className="h-full bg-[#F0971A] w-0 animate-[loading_2s_ease-in-out_forwards]"></div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};
