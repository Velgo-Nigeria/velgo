
import React, { useCallback } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { supabase } from '../lib/supabaseClient';
import { Profile, SubscriptionTier } from '../types';
import { TIERS } from '../lib/constants';

interface SubscriptionProps { profile: Profile | null; sessionEmail?: string; onRefreshProfile: () => void; onBack: () => void; }

// Sub-component to handle individual tier logic and Paystack hook correctly
const SubscriptionCard: React.FC<{ 
  tier: typeof TIERS[0]; 
  isActive: boolean; 
  email: string; 
  publicKey: string; 
  onSuccess: (tier: SubscriptionTier) => void; 
}> = ({ tier, isActive, email, publicKey, onSuccess }) => {
  
  const config = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: tier.price * 100, // Paystack expects amount in kobo
    publicKey: publicKey.trim(), // Ensure no whitespace
  };

  // Initialize the hook at the top level of this sub-component
  const initializePayment = usePaystackPayment(config);

  const handleUpgrade = () => {
    console.log("Upgrade button clicked for tier:", tier.id);
    
    if (isActive) return;
    
    // If it's the free tier, just run success logic immediately
    if (tier.price === 0) {
      onSuccess('basic');
    } else {
      // Trigger Paystack Modal
      try {
        // Fix: initializePayment expects a single callback in some type definitions
        (initializePayment as any)(
          () => {
            console.log("Payment success");
            onSuccess(tier.id);
          },
          () => {
             console.log("Payment closed");
          }
        );
      } catch (err) {
        console.error("Paystack initialization failed:", err);
        alert("Payment system could not start. Please check console for details.");
      }
    }
  };

  return (
    <div className={`p-6 rounded-[32px] border ${isActive ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'} shadow-sm space-y-4 relative overflow-hidden transition-all duration-300`}>
      {isActive && <div className="absolute top-0 right-0 bg-brand text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">Current Plan</div>}
      
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">{tier.name}</span>
          <h3 className="text-2xl font-black pt-1 text-gray-900 dark:text-white">₦{tier.price.toLocaleString()} <span className="text-sm font-medium text-gray-400 dark:text-gray-500">/mo</span></h3>
        </div>
      </div>

      <ul className="space-y-2">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
            <i className="fa-solid fa-check text-brand text-[10px]"></i> {f}
          </li>
        ))}
      </ul>

      <button 
        type="button"
        onClick={handleUpgrade}
        className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${isActive ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default' : 'bg-brand text-white shadow-lg active:scale-95'}`}
      >
        {isActive ? 'Active Plan' : (tier.price === 0 ? 'Downgrade to Basic' : 'Upgrade Now')}
      </button>
    </div>
  );
};

const Subscription: React.FC<SubscriptionProps> = ({ profile, sessionEmail, onRefreshProfile, onBack }) => {
  const onSuccess = useCallback(async (tier: SubscriptionTier) => {
    if (!profile) return;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 Days Validity

    const { error } = await supabase.from('profiles').update({ 
      subscription_tier: tier, 
      is_verified: true,
      // Reset task count on upgrade so they can immediately work/hire
      task_count: 0, 
      subscription_end_date: endDate.toISOString()
    }).eq('id', profile.id);
    
    if (error) {
        alert("Update failed: " + error.message);
        return;
    }

    onRefreshProfile(); 
    onBack();
  }, [profile, onRefreshProfile, onBack]);

  // Use Env Var if available, otherwise use the Verified Hardcoded Key
  const publicKey = (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_4a7ebac9ce2a757e1209a5e52df541161b509981';

  // Robust Fallback email logic
  const userEmail = sessionEmail || (profile?.email) || (profile?.id ? `${profile.id}@velgo.ng` : 'guest@velgo.ng');

  return (
    <div className="p-4 space-y-6 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <div className="flex items-center gap-4 py-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-chevron-left text-gray-500 dark:text-gray-400"></i>
        </button>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Choose Plan</h1>
      </div>
      
      {TIERS.map(t => (
        <SubscriptionCard 
            key={t.id}
            tier={t}
            isActive={profile?.subscription_tier === t.id}
            email={userEmail}
            publicKey={publicKey}
            onSuccess={onSuccess}
        />
      ))}

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center transition-colors">
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Secure Payment</p>
          <div className="flex justify-center gap-2 text-gray-300 dark:text-gray-600 text-xl">
              <i className="fa-brands fa-cc-visa"></i>
              <i className="fa-brands fa-cc-mastercard"></i>
              <i className="fa-solid fa-lock"></i>
          </div>
      </div>
    </div>
  );
};

export default Subscription;
