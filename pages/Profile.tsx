
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { CATEGORY_MAP, TIERS } from '../lib/constants';
import { GoogleGenAI } from "@google/genai";
import { NIGERIA_STATES, NIGERIA_LGAS } from '../lib/locations';

const ProfilePage: React.FC<{ profile: Profile | null; onRefreshProfile: () => Promise<void>; onSubscription: () => void; onSettings: () => void; }> = ({ profile, onRefreshProfile, onSubscription, onSettings }) => {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [streetAddress, setStreetAddress] = useState(profile?.address || '');
  const [selectedState, setSelectedState] = useState(profile?.state || 'Lagos');
  const [selectedLGA, setSelectedLGA] = useState(profile?.lga || '');
  const [bank, setBank] = useState(profile?.bank_name || '');
  const [account, setAccount] = useState(profile?.account_number || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Usage Meter Calculation
  const currentTier = TIERS.find(t => t.id === profile?.subscription_tier) || TIERS[0];
  const limit = currentTier.limit;
  const usage = profile?.task_count || 0;
  const percentage = Math.min(100, Math.max(0, (usage / limit) * 100));
  const isUnlimited = limit > 1000;
  const progressColor = percentage >= 100 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-400' : 'bg-brand';

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone_number || '');
      setStreetAddress(profile.address || '');
      setSelectedState(profile.state || 'Lagos');
      setSelectedLGA(profile.lga || '');
      setBank(profile.bank_name || '');
      setAccount(profile.account_number || '');
    }
  }, [profile]);

  const handleUpdate = async () => {
    if (!profile) return;
    setLoading(true);
    try {
        const updates = { 
          phone_number: phone || null, 
          address: streetAddress || null, 
          state: selectedState || null,
          lga: selectedLGA || null,
          bank_name: bank || null,
          account_number: account || null,
          updated_at: new Date().toISOString()
        };
        const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
        if (error) throw error;
        await onRefreshProfile();
        setEditing(false); 
    } catch (err: any) { alert("Unable to save: " + err.message); } finally { setLoading(false); }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    const file = event.target.files[0];
    const fileName = `${profile?.id}-${Date.now()}.jpg`;
    try {
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile?.id);
        await onRefreshProfile();
    } catch (err: any) { alert("Upload failed: " + err.message); }
  };

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col items-center py-10 relative overflow-hidden bg-gray-900 rounded-[48px] shadow-2xl">
        
        {/* Holographic Watermark */}
        <img 
            src="https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png"
            className="absolute -right-12 -bottom-12 w-64 h-64 opacity-[0.07] rotate-[-15deg] pointer-events-none"
            alt=""
        />

        <div className="relative group w-32 h-32 rounded-[44px] overflow-hidden border-4 border-white shadow-2xl z-10">
          <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=008000&color=fff`} className="w-full h-full object-cover" />
          <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><i className="fa-solid fa-camera text-white text-xl"></i></button>
          <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
        </div>
        <div className="text-center mt-6 z-10 px-4 w-full flex flex-col items-center">
          <h2 className="text-3xl font-black text-white tracking-tight">{profile?.full_name}</h2>
          <span className="inline-block bg-brand/80 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mt-3 border border-white/10">{profile?.subscription_tier} Member</span>
          
          {/* Usage Meter */}
          {!isUnlimited && (
            <div className="w-full max-w-[200px] mt-6 space-y-2 animate-fadeIn bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex justify-between items-end text-white/80">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Monthly Usage</span>
                    <span className="text-[10px] font-black text-white">{usage} / {limit}</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className={`h-full ${progressColor} transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.2)]`} 
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <p className="text-[9px] text-gray-400 font-medium text-center pt-1">
                    {usage >= limit ? 'Limit Reached. Upgrade now.' : `${limit - usage} slots remaining`}
                </p>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="flex justify-between items-center border-b border-gray-50 pb-6"><h3 className="font-black text-gray-900 text-[10px] uppercase tracking-[4px]">Account Info</h3><button onClick={() => setEditing(!editing)} className="px-4 py-1.5 rounded-full bg-gray-50 text-[10px] font-black text-brand uppercase tracking-widest border border-gray-100">{editing ? 'Cancel' : 'Edit'}</button></div>
        <div className="space-y-4">
            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Phone Contact</label>{editing ? <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-black border border-gray-100" /> : <p className="font-bold text-gray-900">{profile?.phone_number || 'Not Set'}</p>}</div>
            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">State</label>{editing ? <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-black border border-gray-100">{NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select> : <p className="font-bold text-gray-900">{profile?.state || 'Not Set'}</p>}</div>
            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">LGA</label>{editing ? <select value={selectedLGA} onChange={e => setSelectedLGA(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-black border border-gray-100">{NIGERIA_LGAS[selectedState]?.map(l => <option key={l} value={l}>{l}</option>)}</select> : <p className="font-bold text-gray-900">{profile?.lga || 'Not Set'}</p>}</div>
        </div>
        {editing && <button onClick={handleUpdate} disabled={loading} className="w-full bg-brand text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-brand/40 transition-all">{loading ? 'Saving Changes...' : 'Save Profile'}</button>}
      </div>
      <div className="grid grid-cols-1 gap-4">
        <button onClick={onSubscription} className="w-full bg-white p-6 rounded-[32px] flex items-center justify-between border border-gray-100 shadow-sm active:scale-95 transition-transform"><span className="font-black text-gray-900 text-xs uppercase tracking-widest">Subscription</span><i className="fa-solid fa-crown text-yellow-500"></i></button>
        <button onClick={onSettings} className="w-full bg-white p-6 rounded-[32px] flex items-center justify-between border border-gray-100 shadow-sm active:scale-95 transition-transform"><span className="font-black text-gray-900 text-xs uppercase tracking-widest">Settings</span><i className="fa-solid fa-gear text-gray-300"></i></button>
      </div>
    </div>
  );
};
export default ProfilePage;
