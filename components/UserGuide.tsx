import React, { useState } from 'react';
import { VelgoLogo } from './Brand';

interface UserGuideProps {
  onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onClose }) => {
  const [role, setRole] = useState<'employer' | 'worker' | null>(null);
  const [step, setStep] = useState(0);

  const clientSlides = [
    {
      title: "1. Choose How to Hire",
      text: "Explore the 'Market' to view top artisans with real service histories, or tap 'Post a Job' to detail your request. Verified talent across Nigeria will apply with transparent proposals.",
      icon: "fa-search",
      color: "bg-brand"
    },
    {
      title: "2. Chat & Agree First",
      text: "Always finalize terms in the Velgo Chat first. Explicitly agree on the final labor cost, expected delivery date, and whether the worker needs a transport fee to move to your site.",
      icon: "fa-comments",
      color: "bg-purple-600"
    },
    {
      title: "3. Materials Protocol",
      text: "To avoid cash-advance risks, always buy materials yourself or accompany the artisan to the market. Only send cash directly for materials to highly-rated, verified artisans.",
      icon: "fa-cart-shopping",
      color: "bg-amber-600"
    },
    {
      title: "4. Verify Bank Names",
      text: "When making bank transfers, ALWAYS double-check that the recipient name in your banking app matches the verified Account Name in the artisan's Velgo profile exactly.",
      icon: "fa-building-columns",
      color: "bg-blue-600"
    },
    {
      title: "5. Safe Escrow & Completion",
      text: "Never pay in full upfront. Transfer funds directly to the worker once they safely finish the job. Once paid, mark the task as 'Completed' in the Activities tab.",
      icon: "fa-circle-check",
      color: "bg-green-600"
    },
    {
      title: "6. Security & Checkmarks",
      text: "Prioritize workers with the blue verification checkmark. They have submitted authenticated NIN credentials. Leave honest ratings to maintain marketplace integrity.",
      icon: "fa-shield-halved",
      color: "bg-slate-900"
    }
  ];

  const workerSlides = [
    {
      title: "1. Clean Profile & Subcategory",
      text: "Artisans with distinct work photos and clear service subcategories get 4x more direct hires. Make your bio detailed, welcoming, and clearly represent your actual craft.",
      icon: "fa-user-gear",
      color: "bg-brand"
    },
    {
      title: "2. Verify with NIN",
      text: "Unlock the community verified badge by completing NIIN security verification in Settings. Clients are search-filtering exclusively for verified trust to secure home services.",
      icon: "fa-fingerprint",
      color: "bg-teal-600"
    },
    {
      title: "3. Prompt Applications",
      text: "Track direct Requests and public job openings daily in the Activities tab. Responding swiftly in under 30 minutes dramatically raises your chance of securing the gig.",
      icon: "fa-bolt",
      color: "bg-orange-600"
    },
    {
      title: "4. Clarify Travel & Materials",
      text: "Before starting your transit, confirm the exact project address and finalize the labor sum in chat. Explicitly discuss transit logistics and who purchases the supplies.",
      icon: "fa-map-location-dot",
      color: "bg-indigo-600"
    },
    {
      title: "5. Direct Direct-to-Bank Pay",
      text: "Ensure your registered Bank Account number in settings is correct. Before transferring, have clients match your verified bank name shown inside the Velgo app.",
      icon: "fa-money-bill-transfer",
      color: "bg-green-700"
    },
    {
      title: "6. Physical Safety Habits",
      text: "Always set emergency contact numbers in Settings. If traveling to a distant location, share live locations with family and access the 24/7 Safety Center first to flag issues.",
      icon: "fa-kit-medical",
      color: "bg-red-600"
    }
  ];

  const activeSlides = role === 'employer' ? clientSlides : workerSlides;

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
                
                <button onClick={() => setRole('employer')} className="w-full bg-brand text-white p-5 rounded-[24px] shadow-xl flex items-center gap-4 active:scale-95 transition-transform text-left">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl"><i className="fa-solid fa-user-tie"></i></div>
                    <div>
                        <p className="text-xs font-black uppercase opacity-80 text-white/70">Guide for</p>
                        <p className="text-lg font-black">Hiring Talent</p>
                    </div>
                </button>

                <button onClick={() => setRole('worker')} className="w-full bg-gray-900 dark:bg-gray-700 text-white p-5 rounded-[24px] shadow-xl flex items-center gap-4 active:scale-95 transition-transform text-left">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl"><i className="fa-solid fa-helmet-safety"></i></div>
                    <div>
                        <p className="text-xs font-black uppercase opacity-80 text-white/70">Guide for</p>
                        <p className="text-lg font-black">Earning Money</p>
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