import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserRole, ClientType } from '../types';
import { VelgoLogo } from '../components/Brand';

interface CompleteProfileProps {
  session: any;
  onComplete: () => void;
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ session, onComplete }) => {
  const [role, setRole] = useState<UserRole>('client');
  const [clientType, setClientType] = useState<ClientType>('personal');
  const [fullName, setFullName] = useState(session.user.user_metadata.full_name || '');
  const [phone, setPhone] = useState(session.user.user_metadata.phone_number || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName.trim())}&background=008000&color=fff`,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      setError("Failed to save profile. Please try again.");
      setLoading(false);
    } else {
      onComplete();
    }
  };

  return (
    <div className="auth-bg px-8 py-12 flex flex-col justify-center items-center">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center animate-fadeIn">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-6" />
          <h2 className="text-[32px] font-black text-white uppercase tracking-tighter leading-none">Finish Setup</h2>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[2px] mt-3 opacity-80">Almost there, Naija!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-4 bg-red-500/10 text-red-400 text-[11px] font-bold rounded-2xl border border-red-500/20 mb-2 animate-fadeIn">{error}</div>}

          <div className="auth-toggle-container">
            <button type="button" onClick={() => setRole('client')} className={`auth-toggle-btn ${role === 'client' ? 'auth-toggle-btn-active' : 'auth-toggle-btn-inactive'}`}>Hire Help</button>
            <button type="button" onClick={() => setRole('worker')} className={`auth-toggle-btn ${role === 'worker' ? 'auth-toggle-btn-active' : 'auth-toggle-btn-inactive'}`}>Earn Money</button>
          </div>

          {role === 'client' && (
            <div className="flex justify-center gap-10 mb-8 animate-fadeIn">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${clientType === 'personal' ? 'border-brand' : 'border-gray-600'}`}>
                  {clientType === 'personal' && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
                </div>
                <input type="radio" className="hidden" checked={clientType === 'personal'} onChange={() => setClientType('personal')} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${clientType === 'personal' ? 'text-white' : 'text-gray-500'}`}>Personal</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${clientType === 'enterprise' ? 'border-brand' : 'border-gray-600'}`}>
                  {clientType === 'enterprise' && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
                </div>
                <input type="radio" className="hidden" checked={clientType === 'enterprise'} onChange={() => setClientType('enterprise')} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${clientType === 'enterprise' ? 'text-white' : 'text-gray-500'}`}>Business</span>
              </label>
            </div>
          )}

          <div className="auth-input-group">
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder=" " className="auth-input-field" />
            <label className="auth-label">{clientType === 'enterprise' && role === 'client' ? "Business Name" : "Full Name"}</label>
          </div>

          <div className="auth-input-group">
            <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder=" " className="auth-input-field" />
            <label className="auth-label">Phone Number</label>
          </div>

          <button type="submit" disabled={loading} className="auth-btn-primary mt-8">
            {loading ? 'Finalizing...' : 'ENTER VELGO'}
          </button>
          
          <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full text-center text-gray-500 font-black text-[11px] uppercase tracking-widest mt-8 opacity-40 hover:opacity-100 transition-opacity">Cancel & Sign Out</button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;