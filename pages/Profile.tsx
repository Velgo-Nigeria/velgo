
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { CATEGORY_MAP } from '../lib/constants';
import { NIGERIA_STATES, NIGERIA_LGAS } from '../lib/locations';

interface ProfilePageProps {
  profile: Profile | null;
  onRefreshProfile: () => void;
  onSubscription: () => void;
  onSettings: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onRefreshProfile, onSubscription, onSettings }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [state, setState] = useState(profile?.state || 'Lagos');
  const [lga, setLga] = useState(profile?.lga || '');
  
  // Professional State (Workers Only)
  const [bio, setBio] = useState(profile?.bio || '');
  const [category, setCategory] = useState(profile?.category || Object.keys(CATEGORY_MAP)[0]);
  const [subcategory, setSubcategory] = useState(profile?.subcategory || '');
  const [startingPrice, setStartingPrice] = useState(profile?.starting_price?.toString() || '');
  const [instagram, setInstagram] = useState(profile?.instagram_handle || '');
  const [portfolio, setPortfolio] = useState(profile?.portfolio_url || '');

  const isWorker = profile?.role === 'worker';

  useEffect(() => {
    // Reset LGA if state changes and current LGA is invalid for new state
    if (state && NIGERIA_LGAS[state] && !NIGERIA_LGAS[state].includes(lga)) {
        setLga(NIGERIA_LGAS[state][0] || '');
    }
  }, [state]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !profile) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setLoading(true);
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

    if (uploadError) {
      alert("Error uploading image: " + uploadError.message);
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
    onRefreshProfile();
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);

    const updates: any = {
      full_name: fullName,
      phone_number: phone,
      address,
      state,
      lga,
      updated_at: new Date().toISOString(),
    };

    if (isWorker) {
        updates.bio = bio;
        updates.category = category;
        updates.subcategory = subcategory;
        updates.starting_price = parseInt(startingPrice) || 0;
        updates.instagram_handle = instagram;
        updates.portfolio_url = portfolio;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);

    if (error) {
      alert("Failed to update profile: " + error.message);
    } else {
      setEditing(false);
      onRefreshProfile();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen pb-24 transition-colors duration-200">
      
      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Profile</h1>
        <div className="flex gap-3">
            <button onClick={onSettings} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                <i className="fa-solid fa-gear"></i>
            </button>
            <button onClick={onSubscription} className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg ${profile?.subscription_tier === 'basic' ? 'bg-gray-400' : 'bg-brand'}`}>
                <i className="fa-solid fa-crown"></i>
            </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
            <div className="relative group">
                <div className="w-28 h-28 rounded-[36px] overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl bg-gray-100 dark:bg-gray-700">
                    <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}`} className="w-full h-full object-cover" />
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                    <i className="fa-solid fa-camera text-sm"></i>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            
            <div className="mt-4 text-center">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{profile?.full_name}</h2>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
                    {profile?.role} • {profile?.subscription_tier}
                </p>
                {profile?.is_verified && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <i className="fa-solid fa-circle-check"></i> Verified ID
                    </div>
                )}
            </div>
        </div>

        {/* Edit Toggle */}
        <div className="flex justify-end">
            {editing ? (
                <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl text-xs font-bold uppercase">Cancel</button>
                    <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-brand text-white rounded-xl text-xs font-black uppercase shadow-lg">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            ) : (
                <button onClick={() => setEditing(true)} className="px-4 py-2 bg-brand/10 text-brand rounded-xl text-xs font-black uppercase tracking-widest">
                    Edit Profile
                </button>
            )}
        </div>

        {/* Personal Details Form */}
        <div className="space-y-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personal Details</h3>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Full Name</label>
                    <input 
                        disabled={!editing} 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                        className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold text-gray-900 dark:text-white disabled:bg-transparent disabled:p-0 disabled:text-base transition-all" 
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Phone Number</label>
                    <input 
                        disabled={!editing} 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold text-gray-900 dark:text-white disabled:bg-transparent disabled:p-0 disabled:text-base transition-all" 
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Street Address</label>
                    <input 
                        disabled={!editing} 
                        value={address} 
                        onChange={e => setAddress(e.target.value)} 
                        placeholder="Enter street address"
                        className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold text-gray-900 dark:text-white disabled:bg-transparent disabled:p-0 disabled:text-base transition-all placeholder-gray-300" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">State</label>
                        {editing ? (
                             <select value={state} onChange={e => setState(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-sm font-bold dark:text-white outline-none">
                                {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                        ) : (
                            <p className="font-bold text-gray-900 dark:text-white">{state}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">LGA</label>
                        {editing ? (
                             <select value={lga} onChange={e => setLga(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-sm font-bold dark:text-white outline-none">
                                {NIGERIA_LGAS[state]?.map(l => <option key={l} value={l}>{l}</option>)}
                             </select>
                        ) : (
                            <p className="font-bold text-gray-900 dark:text-white">{lga}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Professional Profile - WORKERS ONLY */}
        {isWorker && (
            <div className="space-y-6 animate-fadeIn">
                <h3 className="text-[10px] font-black text-brand uppercase tracking-widest ml-1 flex items-center gap-2">
                    <i className="fa-solid fa-briefcase"></i> Professional Profile
                </h3>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-[32px] border-2 border-brand/10 shadow-lg shadow-brand/5 space-y-4">
                    
                    {/* Category Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Trade Category</label>
                            {editing ? (
                                <select value={category} onChange={e => { setCategory(e.target.value); setSubcategory(''); }} className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-xs font-bold dark:text-white outline-none">
                                    {Object.keys(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            ) : <p className="font-bold text-sm text-gray-900 dark:text-white">{category || 'Not Set'}</p>}
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Specialization</label>
                            {editing ? (
                                <select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-xs font-bold dark:text-white outline-none">
                                    <option value="">Select...</option>
                                    {CATEGORY_MAP[category]?.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            ) : <p className="font-bold text-sm text-gray-900 dark:text-white">{subcategory || 'Not Set'}</p>}
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Professional Bio</label>
                        {editing ? (
                            <textarea 
                                value={bio} 
                                onChange={e => setBio(e.target.value)} 
                                rows={3}
                                placeholder="Describe your skills and experience..."
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-none focus:ring-1 focus:ring-brand" 
                            />
                        ) : (
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{bio || 'No bio added yet.'}</p>
                        )}
                    </div>

                    {/* Pricing */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Starting Price (₦)</label>
                        <input 
                            type="number"
                            disabled={!editing} 
                            value={startingPrice} 
                            onChange={e => setStartingPrice(e.target.value)} 
                            placeholder="0"
                            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold text-gray-900 dark:text-white disabled:bg-transparent disabled:p-0 disabled:text-base transition-all" 
                        />
                    </div>

                    {/* Socials & Portfolio */}
                    <div className="pt-2 space-y-3">
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center"><i className="fa-brands fa-instagram"></i></div>
                             <div className="flex-1">
                                 <label className="text-[9px] font-bold text-gray-400 uppercase">Instagram Handle</label>
                                 <input 
                                    disabled={!editing}
                                    value={instagram}
                                    onChange={e => setInstagram(e.target.value)}
                                    placeholder="@username"
                                    className="w-full bg-transparent border-b border-gray-100 dark:border-gray-700 py-1 text-sm font-medium focus:border-brand outline-none dark:text-white"
                                 />
                             </div>
                         </div>
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><i className="fa-solid fa-globe"></i></div>
                             <div className="flex-1">
                                 <label className="text-[9px] font-bold text-gray-400 uppercase">Portfolio Website</label>
                                 <input 
                                    disabled={!editing}
                                    value={portfolio}
                                    onChange={e => setPortfolio(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-transparent border-b border-gray-100 dark:border-gray-700 py-1 text-sm font-medium focus:border-brand outline-none dark:text-white"
                                 />
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ProfilePage;