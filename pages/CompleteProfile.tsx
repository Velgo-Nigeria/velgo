
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserRole, ClientType } from '../types';
import { VelgoLogo } from '../components/Brand';

interface CompleteProfileProps {
  session: any;
  onComplete: () => void;
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ session, onComplete }) => {
  const metadata = session.user.user_metadata || {};

  // Initialize state from session metadata if available
  const [role, setRole] = useState<UserRole>(metadata.role || 'client');
  const [clientType, setClientType] = useState<ClientType>(metadata.client_type || 'personal');
  const [fullName, setFullName] = useState(metadata.full_name || '');
  const [phone, setPhone] = useState(metadata.phone_number || '');
  
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

    const updates = {
      id: session.user.id,
      email: session.user.email,
      full_name: fullName.trim(),
      phone_number: phone.trim(),
      role: role,
      client_type: role === 'client' ? clientType : 'personal',
      subscription_tier: 'basic',
      is_verified: false,
      task_count: 0,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName.trim())}&background=10b981&color=fff`,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      console.error("Profile Sync Error:", error);
      // If auto-complete fails, fall back to manual form so user isn't stuck
      if (isAuto) {
        setIsAutoCompleting(false);
        // We don't show an error immediately, we just let them see the form to confirm details
      } else {
        setError("Sync failed. Please check your connection and try again.");
        setLoading(false);
      }
    } else {
      // Success! Proceed to app
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

  // 2. Manual Fallback Form (Only shown if data is missing or auto-sync failed)
  return (
    <div className="min-h-screen w-full bg-[#0f172a] auth-gradient flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-10 animate-fadeIn">
        <div className="text-center">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-8" />
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Complete</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[3px] mt-3">Confirm your details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20">{error}</div>}

          <div className="bg-slate-800/40 p-1.5 rounded-[32px] border border-white/10 flex gap-2">
            <button type="button" onClick={() => setRole('client')} className={`flex-1 py-4 rounded-[26px] text-[10px] font-black uppercase tracking-widest transition-all ${role === 'client' ? 'bg-white text-emerald-600 shadow-xl' : 'text-gray-500 hover:text-white'}`}>Hire Help</button>
            <button type="button" onClick={() => setRole('worker')} className={`flex-1 py-4 rounded-[26px] text-[10px] font-black uppercase tracking-widest transition-all ${role === 'worker' ? 'bg-white text-emerald-600 shadow-xl' : 'text-gray-500 hover:text-white'}`}>Earn Money</button>
          </div>

          {role === 'client' && (
            <div className="flex justify-center gap-10 py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" className="hidden" checked={clientType === 'personal'} onChange={() => setClientType('personal')} />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${clientType === 'personal' ? 'border-emerald-500' : 'border-slate-700'}`}>
                  {clientType === 'personal' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${clientType === 'personal' ? 'text-white' : 'text-gray-500'}`}>Personal</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" className="hidden" checked={clientType === 'enterprise'} onChange={() => setClientType('enterprise')} />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${clientType === 'enterprise' ? 'border-emerald-500' : 'border-slate-700'}`}>
                  {clientType === 'enterprise' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${clientType === 'enterprise' ? 'text-white' : 'text-gray-500'}`}>Business</span>
              </label>
            </div>
          )}

          <div className="space-y-4">
            <input 
              required value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
              placeholder={clientType === 'enterprise' && role === 'client' ? "Business Name" : "Full Name"}
            />
            <input 
              required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
              placeholder="Phone Number"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95">
            {loading ? 'Finalizing...' : 'Enter App'}
          </button>
          
          <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full text-center text-gray-500 font-black text-[10px] uppercase tracking-widest mt-6 opacity-40 hover:opacity-100 transition-opacity">Cancel & Sign Out</button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
