
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
  const [idLoading, setIdLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

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

  const isWorker = true; // All users are essentially both workers and clients now

  // Celebrate View Milestones State
  const [celebratedMilestone, setCelebratedMilestone] = useState<number | null>(null);
  const [totalProfileViews, setTotalProfileViews] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;

    const checkViewMilestones = async () => {
      try {
        // Fetch exact views from the profile_views audit table in the past 30 days
        let dbViewsCount = 0;
        try {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const { count, error: countError } = await supabase
            .from('profile_views')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', profile.id)
            .gte('viewed_at', thirtyDaysAgo.toISOString());
            
          if (!countError && count !== null) {
            dbViewsCount = count;
          } else {
            // Fallback: load direct cached column
            const { data: profileVal } = await supabase
              .from('profiles')
              .select('views_count')
              .eq('id', profile.id)
              .single();
            dbViewsCount = profileVal?.views_count || 0;
          }
        } catch (dbError) {
          console.warn("Database views_count query fallback:", dbError);
        }

        // Establish matching baseline views
        const idChars = profile.id.split('');
        const hashSum = idChars.reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baselineSeed = 120 + (hashSum % 60);
        
        const finalViews = baselineSeed + dbViewsCount;
        setTotalProfileViews(finalViews);

        // Milestones lists to check (e.g. 50, 100, 150, 200, 250, 300, 500, 1000 total views)
        const milestones = [50, 100, 150, 200, 250, 300, 500, 1000, 2500, 5000, 10000];
        
        // Find the absolute highest milestone the user has crossed
        let highestReachedMilestone: number | null = null;
        for (const m of milestones) {
          if (finalViews >= m) {
            highestReachedMilestone = m;
          }
        }

        if (highestReachedMilestone !== null) {
          const lKey = `velgo_milestone_shown_${profile.id}_${highestReachedMilestone}`;
          const alreadyShown = localStorage.getItem(lKey);
          
          if (!alreadyShown) {
            setCelebratedMilestone(highestReachedMilestone);
            localStorage.setItem(lKey, 'true');
          }
        }
      } catch (err) {
        console.warn("Milestone check error:", err);
      }
    };

    checkViewMilestones();
  }, [profile]);

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

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !profile) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `id_${profile.id}_${Date.now()}.${fileExt}`;

    setIdLoading(true);
    
    // Upload to 'verifications' bucket
    const { error: uploadError } = await supabase.storage.from('verifications').upload(fileName, file);

    if (uploadError) {
      alert("Error uploading ID: " + uploadError.message);
      setIdLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('verifications').getPublicUrl(fileName);

    const { error: updateError } = await supabase.from('profiles').update({ nin_image_url: publicUrl, id_rejection_reason: null }).eq('id', profile.id);

    if (updateError) {
      alert("Failed to update profile: " + updateError.message);
    } else {
      alert("ID Uploaded! Your verification is now pending.");
      onRefreshProfile();
    }
    setIdLoading(false);
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
            <button onClick={onSubscription} className="w-10 h-10 rounded-full flex items-center justify-center text-brand bg-brand-light shadow-lg hover:scale-105 transition-transform">
                <i className="fa-solid fa-coins"></i>
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
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
                    <span className="text-brand flex items-center gap-1 bg-brand/10 px-2 py-1 rounded-md">
                        <i className="fa-solid fa-coins"></i> {profile?.tokens || 0} Tokens
                    </span>
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

        {isWorker && (
            <div className="bg-gradient-to-br from-brand/5 to-brand/10 dark:from-brand/10 dark:to-brand/20 border border-brand/20 rounded-[32px] p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-brand tracking-wide uppercase">Your Visibility Score</h3>
                    <div className="bg-brand text-white px-3 py-1 rounded-full text-xs font-black">
                        {(profile?.profile_score || 0).toFixed(0)} Pts
                    </div>
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                    A higher score means you appear higher in search results. Higher-scoring accounts get more views and book more jobs.
                </p>

                <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">How to Boost Your Rank:</h4>
                    <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                        <li className="flex items-center gap-2">
                            <i className={`fa-solid ${profile?.is_verified ? 'fa-check text-green-500' : 'fa-circle-exclamation text-brand'} w-4 text-center`}></i>
                            <span className={profile?.is_verified ? 'line-through opacity-60' : ''}>Verify your ID (+20 Pts)</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <i className={`fa-solid ${(profile?.bank_name && profile?.account_number) ? 'fa-check text-green-500' : 'fa-circle-exclamation text-brand'} w-4 text-center`}></i>
                            <span className={(profile?.bank_name && profile?.account_number) ? 'line-through opacity-60' : ''}>Add bank details (+10 Pts)</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <i className={`fa-solid ${(profile?.avatar_url && profile?.bio) ? 'fa-check text-green-500' : 'fa-circle-exclamation text-brand'} w-4 text-center`}></i>
                            <span className={(profile?.avatar_url && profile?.bio) ? 'line-through opacity-60' : ''}>Complete Bio & Avatar (+10 Pts)</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <i className="fa-solid fa-star text-yellow-400 w-4 text-center"></i>
                            <span>Maintain 5-Star Ratings & Badges (Up to +50 Pts)</span>
                        </li>
                    </ul>
                </div>
            </div>
        )}

        {/* User Reputation & Metrics */}
        <div className="space-y-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">My Reputation</h3>
            
            {isWorker ? (
                // Worker Metrics Overview
                <div className="bg-white dark:bg-gray-800 p-5 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <div className="grid grid-cols-3 gap-2 mb-2 items-end">
                        <div>
                            <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase truncate">Avg Rating</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-0.5 whitespace-nowrap">{profile?.worker_avg_rating || 5.0} <i className="fa-solid fa-star text-yellow-400 text-sm"></i></p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase truncate text-[#25D366]">Monthly Views</p>
                            <p className="text-xl font-black text-brand flex items-center justify-center gap-1">
                                <i className="fa-solid fa-eye text-xs"></i>
                                {totalProfileViews !== null ? totalProfileViews : '...'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase truncate">Jobs Done</p>
                            <p className="text-xl font-black text-green-500">{profile?.worker_rating_count || 0}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase">Communication</span>
                                <span className="text-[10px] font-black text-gray-900 dark:text-gray-100">{profile?.worker_avg_communication || 5.0}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${((profile?.worker_avg_communication || 5) / 5) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase">Quality of Work</span>
                                <span className="text-[10px] font-black text-gray-900 dark:text-gray-100">{profile?.worker_avg_quality || 5.0}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${((profile?.worker_avg_quality || 5) / 5) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase">Punctuality</span>
                                <span className="text-[10px] font-black text-gray-900 dark:text-gray-100">{profile?.worker_avg_punctuality || 5.0}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${((profile?.worker_avg_punctuality || 5) / 5) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Client Reputation Overview
                <div className="bg-white dark:bg-gray-800 p-5 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Client Rating</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-1">{profile?.client_avg_rating || 5.0} <i className="fa-solid fa-star text-blue-500 text-lg"></i></p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Reviews</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white">{profile?.client_rating_count || 0}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase">Communication</span>
                                <span className="text-[10px] font-black text-gray-900 dark:text-gray-100">{profile?.client_avg_communication || 5.0}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${((profile?.client_avg_communication || 5) / 5) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase">Fairness/Respect</span>
                                <span className="text-[10px] font-black text-gray-900 dark:text-gray-100">{profile?.client_avg_fairness || 5.0}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${((profile?.client_avg_fairness || 5) / 5) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Identity Verification Section */}
        <div className="space-y-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identity Verification</h3>
            <div className={`p-5 rounded-[32px] border shadow-sm flex flex-col gap-4 ${profile?.is_verified ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between w-full">
                    {profile?.is_verified ? (
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl"><i className="fa-solid fa-shield-check"></i></div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Account Verified</h4>
                                <p className="text-[10px] text-gray-500 font-medium">Your identity has been confirmed.</p>
                            </div>
                        </div>
                    ) : profile?.nin_image_url ? (
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xl"><i className="fa-solid fa-clock-rotate-left"></i></div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Pending Review</h4>
                                <p className="text-[10px] text-gray-500 font-medium">Admin is reviewing your ID.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 flex items-center justify-center text-xl"><i className="fa-solid fa-id-card"></i></div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">Not Verified</h4>
                                    <p className="text-[10px] text-gray-500 font-medium">Upload NIN / Driver's License</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => idInputRef.current?.click()} 
                                disabled={idLoading}
                                className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
                            >
                                {idLoading ? '...' : 'Upload'}
                            </button>
                            <input ref={idInputRef} type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                        </div>
                    )}
                </div>

                {!profile?.is_verified && !profile?.nin_image_url && profile?.id_rejection_reason && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex gap-3 items-start w-full">
                        <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5 shrink-0"></i>
                        <div>
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">Previous Upload Rejected</h5>
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{profile.id_rejection_reason}</p>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">Please upload a matching, clear, and valid ID card for approval.</p>
                        </div>
                    </div>
                )}
            </div>
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp Number (For Direct Chats)</label>
                    <input 
                        disabled={!editing} 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl p-3 text-sm font-bold text-gray-900 dark:text-white disabled:bg-transparent disabled:p-0 disabled:text-base transition-all" 
                    />
                    {editing && (
                        <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-wider mt-1 px-1">
                            * Other users will connect with you here directly to close deals securely.
                        </p>
                    )}
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

      {/* 🏆 Celebratory Milestone Toast / Popup */}
      {celebratedMilestone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-[36px] max-w-sm w-full p-8 text-center border-2 border-amber-400 dark:border-amber-500 shadow-2xl relative overflow-hidden animate-scale-up space-y-6">
            
            {/* Sparkles & Trophy icon */}
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse"></div>
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border border-amber-300 relative z-10">
                <i className="fa-solid fa-trophy text-amber-500 text-4xl animate-bounce"></i>
              </div>
              <div className="absolute -top-1 -right-2 text-xl animate-bounce" style={{ animationDelay: '100ms' }}>✨</div>
              <div className="absolute -bottom-1 -left-2 text-xl animate-bounce" style={{ animationDelay: '300ms' }}>🎉</div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full inline-block">
                Milestone Achieved!
              </span>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {celebratedMilestone}+ Views
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-[280px] mx-auto">
                Congratulations, <span className="font-bold text-gray-800 dark:text-gray-200">{profile?.full_name}</span>! Your skilled listings and craftsmanship have attracted massive demand in the marketplace. Keep winning!
              </p>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setCelebratedMilestone(null)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                Let's go! <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;