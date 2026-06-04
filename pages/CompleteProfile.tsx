
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
  const [role, setRole] = useState<UserRole>(metadata.role || 'user');
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
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName.trim())}&background=10b981&color=fff`
    };

    // First check if profile exists to decide between update or insert
    const { data: existingProfile } = await supabase.from('profiles').select('id, role').eq('id', session.user.id).maybeSingle();
    
    let dbError;
    if (existingProfile) {
       // If the existing user somehow doesn't have a role, enforce 'user'
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

          <div className="space-y-4">
            <input 
              required value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
              placeholder="Full Name"
            />
            <div className="space-y-1.5">
              <input 
                required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
                placeholder="WhatsApp Number (e.g. 080...)"
              />
              <p className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider px-6 leading-relaxed">
                * Required. Other users will message you here directly to close deals.
              </p>
            </div>
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
