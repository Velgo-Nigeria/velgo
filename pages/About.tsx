
import React, { useState } from 'react';
import { VelgoLogo } from '../components/Brand';

interface AboutProps {
  onBack: () => void;
}

const About: React.FC<AboutProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'story' | 'faq'>('story');

  const faqs = [
      {
          q: "Why don't you take a commission?",
          a: "We believe the Nigerian Worker deserves 100% of their earnings. We charge a flat monthly subscription fee for access and security instead of a percentage-based commission, ensuring predictable income for us and higher earnings for the Worker."
      },
      {
          q: "How do I know the Client/Worker will pay/do the job?",
          a: "Trust is our product. We require full ID verification for all users. Furthermore, both parties pay a subscription fee, meaning they have a financial stake in using the platform professionally. Our Ratings/Reviews system heavily penalizes repeated non-compliance."
      },
      {
          q: "What if the Client refuses to pay after I complete the job?",
          a: "As per our Terms of Service, Velgo does not hold or guarantee funds. Your contract for service is directly with the Client. Velgo's role is limited to providing the Client's confirmed identity and detailed communication/job logs to assist the Worker in pursuing the claim against the Client."
      },
      {
          q: "I am a Worker. Which tier is best for me?",
          a: "If you are new, start with Basic (₦0, 2 jobs). If you regularly get more than 6 jobs a month, upgrade to Verified Standard (₦6,999 for 10 jobs), as the higher limit and priority listing ensure you recoup the subscription cost quickly and profitably."
      },
      {
          q: "I am a Client. Why do I have to pay a subscription?",
          a: "Your subscription fee funds the verification system and gives you priority access to the highest-rated and most professional Workers (who also pay a subscription). Your fee ensures you are accessing a pool of committed, serious service providers."
      },
      {
          q: "How do you verify the Workers?",
          a: "All Workers undergo multi-stage verification, including ID confirmation, bank account ownership matching, and background checks where required. Our Professional Services category often requires proof of certification."
      }
  ];

  const handleContactSupport = () => {
    window.location.href = "mailto:velgonigeria.uni@gmail.com?subject=Velgo%20Support%20Inquiry";
  };

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen flex flex-col transition-colors duration-200">
      <div className="px-6 pt-10 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 sticky top-0 bg-white dark:bg-gray-900 z-10 transition-colors duration-200">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <i className="fa-solid fa-chevron-left text-gray-500"></i>
        </button>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">About Velgo</h1>
      </div>

      <div className="flex overflow-x-auto px-6 py-4 gap-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => setActiveTab('story')}
            className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'story' ? 'bg-brand text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-100 dark:border-gray-700'}`}
          >
            Our Story
          </button>
          <button 
            onClick={() => setActiveTab('faq')}
            className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'faq' ? 'bg-brand text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-100 dark:border-gray-700'}`}
          >
            FAQ
          </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto pb-24">
         {activeTab === 'story' ? (
             <div className="space-y-8 animate-fadeIn">
                 <div className="text-center space-y-4">
                     <VelgoLogo className="h-12 mx-auto" />
                     <h2 className="text-xl font-black text-gray-900 dark:text-white">Built for Trust, Driven by Local Economy</h2>
                     <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                        Velgo Nigeria was conceived out of a fundamental challenge facing the local service industry in Edo State: a profound trust deficit and a system that often shortchanged the skilled worker.
                     </p>
                 </div>

                 <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[32px] border border-gray-100 dark:border-gray-700 space-y-4">
                     <h3 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-widest border-b border-gray-200 dark:border-gray-700 pb-2">The Velgo Difference</h3>
                     
                     <div className="space-y-4">
                         <div className="flex gap-4 items-start">
                             <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-brand flex items-center justify-center shrink-0"><i className="fa-solid fa-hand-holding-dollar"></i></div>
                             <div>
                                 <h4 className="font-bold text-gray-900 dark:text-white text-sm">100% Payout</h4>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">We eliminated commission fees. Workers keep every Naira of the agreed service fee.</p>
                             </div>
                         </div>
                         <div className="flex gap-4 items-start">
                             <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0"><i className="fa-solid fa-shield-halved"></i></div>
                             <div>
                                 <h4 className="font-bold text-gray-900 dark:text-white text-sm">Verified Access</h4>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">Our subscription model ensures only serious, verified users access the platform, building a safer community.</p>
                             </div>
                         </div>
                     </div>
                 </div>

                 <div className="space-y-4">
                     <h3 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-widest pl-2">Our Mission</h3>
                     <div className="bg-brand text-white p-6 rounded-[32px] shadow-xl">
                         <i className="fa-solid fa-quote-left text-3xl opacity-30 mb-2"></i>
                         <p className="text-sm font-bold leading-relaxed">
                            To be the most trusted, transparent, and economically empowering hyper-local service platform in Nigeria, ensuring 100% of service fees directly fund local talent.
                         </p>
                     </div>
                 </div>

                 <div className="space-y-4">
                     <h3 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-widest pl-2">How We Compare</h3>
                     <div className="bg-white dark:bg-gray-800 rounded-[24px] border border-gray-100 dark:border-gray-700 overflow-hidden">
                         <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-700 p-3 text-[9px] font-black uppercase text-gray-500 dark:text-gray-300">
                             <div>Feature</div>
                             <div className="text-center">Others</div>
                             <div className="text-center text-brand">Velgo</div>
                         </div>
                         <div className="grid grid-cols-3 p-4 border-b border-gray-50 dark:border-gray-700 text-xs items-center">
                             <div className="font-bold text-gray-700 dark:text-gray-300">Fees</div>
                             <div className="text-center text-red-500">15-30%</div>
                             <div className="text-center text-brand font-black">0%</div>
                         </div>
                         <div className="grid grid-cols-3 p-4 border-b border-gray-50 dark:border-gray-700 text-xs items-center">
                             <div className="font-bold text-gray-700 dark:text-gray-300">Payout</div>
                             <div className="text-center text-gray-500">Delayed</div>
                             <div className="text-center text-brand font-black">Instant</div>
                         </div>
                         <div className="grid grid-cols-3 p-4 text-xs items-center">
                             <div className="font-bold text-gray-700 dark:text-gray-300">Trust</div>
                             <div className="text-center text-gray-500">Open</div>
                             <div className="text-center text-brand font-black">Verified</div>
                         </div>
                     </div>
                 </div>
             </div>
         ) : (
             <div className="space-y-4 animate-fadeIn">
                 {faqs.map((faq, i) => (
                     <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm">
                         <h3 className="font-black text-sm text-gray-900 dark:text-white mb-2">{faq.q}</h3>
                         <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{faq.a}</p>
                     </div>
                 ))}
                 
                 <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-[24px] text-center mt-8">
                     <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4">Still have questions?</p>
                     <button 
                        onClick={handleContactSupport}
                        className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase shadow-lg active:scale-95 transition-transform"
                     >
                        Contact Support
                     </button>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default About;
