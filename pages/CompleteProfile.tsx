
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserRole, ClientType } from '../types';
import { VelgoLogo } from '../components/Brand';
import { NIGERIA_STATES, NIGERIA_LGAS } from '../lib/locations';
import { CATEGORY_MAP } from '../constants';
import { openWhatsAppHelper } from '../lib/whatsapp';

interface CompleteProfileProps {
  session: any;
  onComplete: () => void;
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ session, onComplete }) => {
  const metadata = session?.user?.user_metadata || {};

  // Initialize state from session metadata if available
  const [role, setRole] = useState<UserRole>(metadata.role || 'user');
  const [clientType, setClientType] = useState<ClientType>(metadata.client_type || 'personal');
  const [fullName, setFullName] = useState(metadata.full_name || metadata.name || '');
  const [phone, setPhone] = useState(metadata.phone_number || '');
  
  // Optional artisan profile fields
  const [state, setState] = useState(metadata.state || 'Lagos');
  const [lga, setLga] = useState(metadata.lga || '');
  const [category, setCategory] = useState(metadata.category || '');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state to handle invisible auto-submission
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);

  useEffect(() => {
    // Check if we have the critical data needed to skip the manual form
    const hasCriticalData = metadata.full_name && metadata.phone_number && metadata.role;
    
    if (hasCriticalData) {
      performProfileUpdate(true);
    }
  }, []);

  const performProfileUpdate = async (isAuto: boolean) => {
    if (isAuto) setIsAutoCompleting(true);
    else setLoading(true);
    
    setError(null);

    // Strict Nigerian phone number validation
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!isAuto) {
      const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        setError("Please enter a valid Nigerian phone number (e.g., 080..., 090..., or +234...).");
        setLoading(false);
        setIsAutoCompleting(false);
        return;
      }
    }

    const updates: any = {
      full_name: fullName.trim(),
      phone_number: cleanPhone,
      avatar_url: metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName.trim())}&background=10b981&color=fff`
    };

    if (state.trim()) updates.state = state.trim();
    if (lga.trim()) updates.lga = lga.trim();
    if (category.trim()) updates.category = category.trim();

    // First check if profile exists to decide between update or insert
    const { data: existingProfile } = await supabase.from('profiles').select('id, role').eq('id', session.user.id).maybeSingle();
    
    let dbError;
    if (existingProfile) {
       if (!existingProfile.role) {
         updates.role = 'user';
       }
       const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
       dbError = error;
    } else {
       const { error } = await supabase.from('profiles').insert({
         ...updates,
         id: session.user.id,
         email: session.user.email,
         is_verified: false
       });
       dbError = error;
    }

    if (dbError) {
      console.error("Profile Sync Error:", dbError);
      if (isAuto) {
        setIsAutoCompleting(false);
      } else {
        setError("Sync failed. Please check your connection and try again.");
        setLoading(false);
      }
    } else {
      try {
        await supabase.auth.updateUser({ data: { full_name: fullName.trim(), phone_number: cleanPhone } });
      } catch (authErr) {
        console.warn("Auth metadata sync warning:", authErr);
      }
      onComplete();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performProfileUpdate(false);
  };

  // 1. Loading State (Invisible Setup)
  if (isAutoCompleting) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] auth-gradient flex flex-col items-center justify-center animate-fadeIn">
         <VelgoLogo variant="light" className="h-16 animate-pulse mb-6" />
         <p className="text-white text-[10px] font-black uppercase tracking-[4px] opacity-80">Finalizing Setup...</p>
      </div>
    );
  }

  // 2. Manual Form
  return (
    <div className="min-h-screen w-full bg-[#0f172a] auth-gradient flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8 animate-fadeIn">
        <div className="text-center">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Welcome</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[3px] mt-2">Finish quick setup</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20">{error}</div>}

          <div className="space-y-3.5">
            <input 
              required value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-4 px-6 text-white font-bold outline-none transition-all placeholder-gray-500 text-sm"
              placeholder="Full Name"
            />
            <div className="space-y-1">
              <input 
                required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-4 px-6 text-white font-bold outline-none transition-all placeholder-gray-500 text-sm"
                placeholder="WhatsApp Number (e.g. 080...)"
              />
              <p className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider px-4 leading-relaxed">
                * Required. Connect directly with clients and service pros.
              </p>
            </div>

            {/* Optional work profile toggle */}
            <div className="pt-2">
              <button 
                type="button" 
                onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                className="w-full py-2.5 px-4 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 rounded-2xl flex items-center justify-between text-left text-slate-300 text-xs font-bold transition-all"
              >
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-briefcase text-emerald-400"></i>
                  <span>Artisan / Location Setup (Optional)</span>
                </span>
                <i className={`fa-solid fa-chevron-${showOptionalDetails ? 'up' : 'down'} text-[10px] text-gray-500`}></i>
              </button>

              {showOptionalDetails && (
                <div className="mt-3 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/40 space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-gray-400 uppercase block mb-1">State</label>
                      <select 
                        value={state} 
                        onChange={e => { setState(e.target.value); setLga(''); }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                      >
                        {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-gray-400 uppercase block mb-1">LGA</label>
                      <select 
                        value={lga} 
                        onChange={e => setLga(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                      >
                        <option value="">Select LGA</option>
                        {NIGERIA_LGAS[state]?.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase block mb-1">Trade Category</label>
                    <select 
                      value={category} 
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                    >
                      <option value="">Select Trade Category (Optional)</option>
                      {Object.keys(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95 mt-4 cursor-pointer"
          >
            {loading ? 'Finalizing...' : 'Enter App'}
          </button>
          
          <div className="flex flex-col items-center gap-3 pt-2">
            <button 
              type="button" 
              onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} 
              className="w-full text-center text-gray-500 font-black text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
              Cancel & Sign Out
            </button>

            <button
              type="button"
              onClick={() => openWhatsAppHelper("Hello Velgo Support, I need assistance setting up my account details.")}
              className="flex items-center gap-2 text-emerald-400/80 hover:text-emerald-400 text-[11px] font-bold py-1 px-3 rounded-full hover:bg-emerald-500/10 transition-all cursor-pointer"
            >
              <i className="fa-brands fa-whatsapp text-sm text-[#25D366]"></i>
              <span>Need Help? Chat on WhatsApp</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;

