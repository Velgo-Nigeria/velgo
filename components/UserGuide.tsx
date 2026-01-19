import React, { useState } from 'react';
import { VelgoLogo } from './Brand';

interface UserGuideProps {
  onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onClose }) => {
  const [role, setRole] = useState<'client' | 'worker' | null>(null);
  const [step, setStep] = useState(0);

  const clientSlides = [
    {
      title: "Direct Hire vs. Public Post",
      text: "You have two ways to hire: Search the 'Market' to message a worker directly (Direct Hire), or tap 'Post a Job' to let verified workers across Nigeria apply to you.",
      icon: "fa-handshake",
      color: "bg-brand"
    },
    {
      title: "Pro-Tip: Bank Verification",
      text: "When paying, Velgo shows you the worker's registered Bank Name and Account Name. ALWAYS ensure the name on your banking app matches the name shown in Velgo before sending money.",
      icon: "fa-building-columns",
      color: "bg-blue-600"
    },
    {
      title: "The Completion Rule",
      text: "Never pay upfront. Only transfer funds once the job is finished. Once you pay, mark the task as 'Completed' in your Gigs tab to build the worker's reputation.",
      icon: "fa-circle-check",
      color: "bg-green-600"
    },
    {
      title: "Verified Security",
      text: "Look for the blue checkmark. Verified workers have submitted their NIN. We recommend hiring verified pros for home-service jobs for maximum safety.",
      icon: "fa-shield-halved",
      color: "bg-gray-900"
    }
  ];

  const workerSlides = [
    {
      title: "Profile Optimization",
      text: "To get hired across Nigeria, ensure your 'Category' and 'Subcategory' are exact. Workers with detailed bios and clear profile photos get 3x more direct bookings.",
      icon: "fa-user-gear",
      color: "bg-brand"
    },
    {
      title: "Managing Applications",
      text: "Check the 'Gigs' tab daily. 'Requests' are direct hires waiting for your response. 'Ongoing' shows jobs you are currently working on. Speed is key to winning clients!",
      icon: "fa-bolt",
      color: "bg-orange-600"
    },
    {
      title: "Payment Security",
      text: "Clients pay you directly to your bank. Ensure your bank details in Settings are correct. Remind clients to check your name in the app before they transfer.",
      icon: "fa-money-bill-transfer",
      color: "bg-green-700"
    },
    {
      title: "Safety First",
      text: "Always set an Emergency Contact in Settings. Before starting a job in a new location, use the 'Safety Center' to flag any concerns with our 24/7 team.",
      icon: "fa-kit-medical",
      color: "bg-red-600"
    }
  ];

  const activeSlides = role === 'client' ? clientSlides : workerSlides;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl relative min-h-[450px] flex flex-col transition-colors duration-200">
        
        <div className="absolute top-4 right-4 z-20">
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 text-gray-800 dark:text-white flex items-center justify-center hover:bg-black/20"><i className="fa-solid fa-xmark"></i></button>
        </div>

        {!role ? (
            <div className="p-8 flex flex-col items-center justify-center flex-1 space-y-6 text-center">
                <VelgoLogo className="h-10 mb-2" />
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Velgo App Guide</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Step-by-step instructions for using the platform safely.</p>
                
                <button onClick={() => setRole('client')} className="w-full bg-brand text-white p-5 rounded-[24px] shadow-xl flex items-center gap-4 active:scale-95 transition-transform text-left">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl"><i className="fa-solid fa-user-tie"></i></div>
                    <div>
                        <p className="text-xs font-black uppercase opacity-80 text-white/70">Guide for</p>
                        <p className="text-lg font-black">Clients / Employers</p>
                    </div>
                </button>

                <button onClick={() => setRole('worker')} className="w-full bg-gray-900 dark:bg-gray-700 text-white p-5 rounded-[24px] shadow-xl flex items-center gap-4 active:scale-95 transition-transform text-left">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl"><i className="fa-solid fa-helmet-safety"></i></div>
                    <div>
                        <p className="text-xs font-black uppercase opacity-80 text-white/70">Guide for</p>
                        <p className="text-lg font-black">Workers / Artisans</p>
                    </div>
                </button>
            </div>
        ) : (
            <>
                <div className={`h-48 ${activeSlides[step].color} flex items-center justify-center relative transition-colors duration-300`}>
                    <i className={`fa-solid ${activeSlides[step].icon} text-8xl text-white opacity-20 absolute scale-150`}></i>
                    <i className={`fa-solid ${activeSlides[step].icon} text-5xl text-white relative z-10 animate-bounce`}></i>
                    <div className="absolute top-4 left-4">
                        <button onClick={() => { setRole(null); setStep(0); }} className="px-4 py-2 bg-black/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest"><i className="fa-solid fa-arrow-left mr-2"></i> Switch Role</button>
                    </div>
                </div>
                
                <div className="p-8 text-center space-y-4 flex-1 flex flex-col">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{activeSlides[step].title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        {activeSlides[step].text}
                    </p>
                    
                    <div className="flex justify-center gap-2 pt-4 mt-auto">
                        {activeSlides.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 ' + activeSlides[step].color : 'w-2 bg-gray-200 dark:bg-gray-700'}`} />
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <button 
                        onClick={() => { if (step > 0) setStep(step - 1); }} 
                        className={`text-gray-400 font-black text-[10px] uppercase tracking-widest p-2 ${step === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        Back
                    </button>
                    
                    <button 
                        onClick={() => {
                            if (step < activeSlides.length - 1) setStep(step + 1);
                            else onClose();
                        }}
                        className={`px-10 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-[2px] shadow-lg transition-all active:scale-95 ${activeSlides[step].color}`}
                    >
                        {step === activeSlides.length - 1 ? "Start Using Velgo" : "Next Step"}
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};