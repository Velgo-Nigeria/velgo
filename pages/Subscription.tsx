
import React, { useCallback, useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { supabase } from '../lib/supabaseClient';
import { Profile, SubscriptionTier } from '../lib/types';
import { TIERS } from '../lib/constants';

interface SubscriptionProps { profile: Profile | null; sessionEmail?: string; onRefreshProfile: () => void; onBack: () => void; }

const VELGO_BANK = {
    bankName: "Moniepoint MFB",
    accountNumber: "9167799600",
    accountName: "Velgo Nigeria Operations",
    supportPhone: "2349167799600"
};

const SubscriptionCard: React.FC<{ 
  tier: typeof TIERS[0]; 
  isActive: boolean; 
  email: string; 
  publicKey: string; 
  onSuccess: (tier: SubscriptionTier) => void;
  onManualPay: (tier: typeof TIERS[0]) => void;
}> = ({ tier, isActive, email, publicKey, onSuccess, onManualPay }) => {
  
  const config = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: tier.price * 100,
    publicKey: publicKey.trim(),
  };

  const initializePayment = usePaystackPayment(config);

  const handlePaystack = () => {
    if (isActive) return;
    if (tier.price === 0) {
      onSuccess('basic');
    } else {
      try {
        (initializePayment as any)(
          () => onSuccess(tier.id),
          () => console.log("Payment closed")
        );
      } catch (err) {
        alert("Payment initialization error. Please try the 'Bank Transfer' option.");
      }
    }
  };

  return (
    <div className={`p-6 rounded-[32px] border ${isActive ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'} shadow-sm space-y-4 relative overflow-hidden transition-all duration-300 flex flex-col`}>
      {isActive && <div className="absolute top-0 right-0 bg-brand text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">Current Plan</div>}
      
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">{tier.name}</span>
          <h3 className="text-2xl font-black pt-1 text-gray-900 dark:text-white">₦{tier.price.toLocaleString()} <span className="text-sm font-medium text-gray-400 dark:text-gray-500">/mo</span></h3>
        </div>
      </div>

      <ul className="space-y-2 flex-1">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
            <i className="fa-solid fa-check text-brand text-[10px]"></i> {f}
          </li>
        ))}
      </ul>

      <div className="space-y-2 mt-4">
          <button 
            type="button"
            onClick={handlePaystack}
            disabled={isActive}
            className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${isActive ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default' : 'bg-brand text-white shadow-lg active:scale-95'}`}
          >
            {isActive ? 'Active Plan' : (tier.price === 0 ? 'Downgrade to Basic' : 'Pay with Card')}
          </button>
          
          {!isActive && tier.price > 0 && (
             <button 
                type="button"
                onClick={() => onManualPay(tier)}
                className="w-full py-3 rounded-2xl font-black uppercase text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
             >
                Pay via Transfer
             </button>
          )}
      </div>
    </div>
  );
};

const Subscription: React.FC<SubscriptionProps> = ({ profile, sessionEmail, onRefreshProfile, onBack }) => {
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);

  const onSuccess = useCallback(async (tier: SubscriptionTier) => {
    if (!profile) return;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { error } = await supabase.from('profiles').update({ 
      subscription_tier: tier, 
      is_verified: true,
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

  const handleManualPayClick = (tier: typeof TIERS[0]) => {
      setSelectedTier(tier);
      setShowManualModal(true);
  };

  const handleWhatsAppConfirmation = () => {
      if (!selectedTier || !profile) return;
      const message = `Hello Velgo Admin, I have just transferred ₦${selectedTier.price.toLocaleString()} for the ${selectedTier.name} Plan.\n\nMy Email: ${profile.email}\nMy Name: ${profile.full_name}`;
      const url = `https://wa.me/${VELGO_BANK.supportPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const publicKey = (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_4a7ebac9ce2a757e1209a5e52df541161b509981';
  const userEmail = sessionEmail || (profile?.email) || (profile?.id ? `${profile.id}@velgo.ng` : 'guest@velgo.ng');

  return (
    <div className="p-4 space-y-6 pb-24 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-200">
      
      {showManualModal && selectedTier && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md animate-fadeIn">
              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 w-full max-w-sm space-y-6 text-center border border-gray-100 dark:border-gray-700">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-gray-900 dark:text-white text-2xl">
                      <i className="fa-solid fa-building-columns"></i>
                  </div>
                  
                  <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase">Bank Transfer</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Transfer <span className="text-brand font-black">₦{selectedTier.price.toLocaleString()}</span> to the account below.
                      </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl space-y-1 border border-dashed border-gray-300 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{VELGO_BANK.bankName}</p>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-2xl font-black text-gray-900 dark:text-white tracking-widest">{VELGO_BANK.accountNumber}</p>
                        <button onClick={() => navigator.clipboard.writeText(VELGO_BANK.accountNumber)} className="text-brand"><i className="fa-regular fa-copy"></i></button>
                      </div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{VELGO_BANK.accountName}</p>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={handleWhatsAppConfirmation}
                          className="w-full bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-transform"
                      >
                          <i className="fa-brands fa-whatsapp text-lg"></i> Confirm Payment
                      </button>
                      <button onClick={() => setShowManualModal(false)} className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex items-center gap-4 py-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-chevron-left text-gray-500 dark:text-gray-400"></i>
        </button>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Choose Plan</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TIERS.map(t => (
            <SubscriptionCard 
                key={t.id}
                tier={t}
                isActive={profile?.subscription_tier === t.id}
                email={userEmail}
                publicKey={publicKey}
                onSuccess={onSuccess}
                onManualPay={handleManualPayClick}
            />
        ))}
      </div>

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
