
import React, { useState } from 'react';
import { VelgoLogo } from '../components/Brand';
import { supabase } from '../lib/supabaseClient';
import { openWhatsAppHelper } from '../lib/whatsapp';
import { Profile } from '../types';

interface AboutProps {
  profile?: Profile | null;
  onBack: () => void;
}

const About: React.FC<AboutProps> = ({ profile, onBack }) => {
  const [activeTab, setActiveTab] = useState<'story' | 'faq'>('story');

  const faqs = [
      {
          q: "Why don't you take a commission?",
          a: "We believe professionals deserve 100% of their earnings. Instead of a percentage-based commission, we use a simple Token system. You only spend a Token when a booking is confirmed, ensuring predictable low costs for you and maximum value."
      },
      {
          q: "How does the Token system work?",
          a: "Every new user gets 5 Free Tokens. A Token is only deducted when a job block (collaboration) is officially accepted by both parties. Once you run out, you can top up at an affordable rate. This single currency powers the whole app, whether you are hiring or working."
      },
      {
          q: "What if someone refuses to pay or do the job?",
          a: "Trust is our product. We require full ID verification for users. Furthermore, since confirming a job costs a Token, both parties have a financial stake in acting professionally. You operate under a strict code of conduct, and our Ratings/Reviews system heavily penalizes unreliability."
      },
      {
          q: "Do I need separate accounts for hiring and working?",
          a: "No! Velgo uses a unified profile architecture. You can post a task you need done today, and offer your own professional services tomorrow—all from the exact same account using the same Tokens."
      },
      {
          q: "How do you handle dispute resolution?",
          a: "Velgo provides the verified identities and detailed communication/job logs to assist you. While your contract for service is directly with the other party, we will step in to ban bad actors and mediate disputes if our community guidelines are violated."
      },
      {
          q: "How do you verify professionals?",
          a: "All users undergo multi-stage verification, including NIN/ID confirmation and background checks where required. Professionals offering specialized services may also require proof of certification to maintain high standards."
      }
  ];

  const handleContactSupport = () => {
    try {
        const name = profile?.full_name || 'Unauthenticated Visitor';
        const phone = profile?.phone_number || 'N/A';
        const email = profile?.email || 'N/A';
        const uid = profile?.id || '';

        // 1. WhatsApp redirection synchronously (no await/promise delay) - 100% PWA-proof
        const message = `Hello Velgo, I have an inquiry regarding...\n\nMy Name: ${name}\nMy Email: ${email}\nMy Phone: ${phone}`;
        openWhatsAppHelper(message);

        // 2. Perform database logging in parallel
        if (profile?.id) {
            const richLog = `👋 Clicked "Contact Support" WhatsApp button from the About/FAQ view.\n\nVisitor Name: ${name}\nEmail: ${email}\nPhone: ${phone}`;
            supabase.from('support_messages').insert([{
                user_id: profile.id,
                content: richLog,
                message: richLog,
                status: 'open',
                admin_reply: false
            }]).then(({ error }) => {
                if (error) console.error("Support message logging failed:", error.message);
            });
        }
    } catch (e) {
        const message = "Hello Velgo, I have an inquiry regarding...";
        openWhatsAppHelper(message);
    }
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
                                 <h4 className="font-bold text-gray-900 dark:text-white text-sm">Verified Security</h4>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">Our Token model ensures only serious, verified users interact on the platform, building a safer community.</p>
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
                        className="w-full bg-green-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                     >
                        <i className="fa-brands fa-whatsapp text-lg"></i> Contact Support
                     </button>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default About;
