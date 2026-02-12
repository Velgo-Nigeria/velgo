
// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile, PostedTask, Broadcast } from '../lib/types';
import { GoogleGenAI } from "@google/genai";
import { VelgoLogo } from '../components/Brand';
import { CATEGORY_MAP, getTierLimit } from '../lib/constants';
import { NIGERIA_STATES, NIGERIA_LGAS } from '../lib/locations';
import { VerificationBadge } from '../components/VerificationBadge';

const Home: React.FC<{ profile: Profile | null, onViewWorker: (id: string) => void, onViewTask: (id: string) => void, onRefreshProfile: () => void, onUpgrade: () => void, onPostTask: () => void, onShowGuide: () => void }> = ({ profile, onViewWorker, onViewTask, onRefreshProfile, onUpgrade, onPostTask, onShowGuide }) => {
  const [items, setItems] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [subcategory, setSubcategory] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedLGA, setSelectedLGA] = useState('All');
  
  // viewMode: 'jobs' shows tasks, 'market' shows workers
  const [viewMode, setViewMode] = useState<'jobs' | 'market'>(profile?.role === 'worker' ? 'jobs' : 'market');
  
  // Broadcast State
  const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null);
  const [dismissedBroadcastId, setDismissedBroadcastId] = useState<string | null>(localStorage.getItem('velgo_dismissed_b'));

  const [showInsights, setShowInsights] = useState(false);
  const [insightQuery, setInsightQuery] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightResult, setInsightResult] = useState<{ text: string, sources: any[] } | null>(null);

  const isAdmin = profile?.role === 'admin';

  // Usage Calculation & Animation
  const usageCount = profile?.task_count || 0;
  const usageLimit = getTierLimit(profile?.subscription_tier);
  const rawPercent = Math.min((usageCount / usageLimit) * 100, 100);
  
  const [usagePercent, setUsagePercent] = useState(0);
  
  // Animate the progress bar on mount/update
  useEffect(() => {
    const timer = setTimeout(() => setUsagePercent(rawPercent), 400);
    return () => clearTimeout(timer);
  }, [rawPercent]);

  const isHighUsage = rawPercent >= 80;
  const usageColor = rawPercent >= 100 ? 'bg-red-500' : isHighUsage ? 'bg-yellow-400' : 'bg-brand';
  const usageStatus = rawPercent >= 100 ? 'Maxed Out' : isHighUsage ? 'Running Low' : 'Active';

  const fetchBroadcast = useCallback(async () => {
    if (!profile) return;
    try {
        const { data, error } = await supabase.from('broadcasts')
            .select('*')
            .or(`target_role.eq.all,target_role.eq.${profile.role}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        if (data && data.id !== dismissedBroadcastId) {
            setActiveBroadcast(data);
        }
    } catch (e) {
        console.warn("Broadcast fetch failed, likely table missing.");
    }
  }, [profile, dismissedBroadcastId]);

  const dismissBroadcast = () => {
    if (activeBroadcast) {
        localStorage.setItem('velgo_dismissed_b', activeBroadcast.id);
        setDismissedBroadcastId(activeBroadcast.id);
        setActiveBroadcast(null);
    }
  };

  const fetchMarketInsights = async () => {
    if (!insightQuery.trim()) return;
    setInsightLoading(true);
    setInsightResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `What is the current market price for ${insightQuery} in Nigeria today? Include local context and average labor rates if applicable.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) || [];
      setInsightResult({ text: response.text || "No insights found.", sources });
    } catch (e) {
      alert("Failed to fetch market insights.");
    } finally {
      setInsightLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const isFetchingWorkers = viewMode === 'market';
    
    try {
        let query;
        if (isFetchingWorkers) {
            query = supabase.from('profiles').select('*').eq('role', 'worker');
            if (category !== 'All') query = query.eq('category', category);
            if (subcategory !== 'All') query = query.eq('subcategory', subcategory);
            if (selectedState !== 'All') query = query.eq('state', selectedState);
            if (selectedLGA !== 'All') query = query.eq('lga', selectedLGA);
            if (searchTerm) query = query.ilike('full_name', `%${searchTerm}%`);
        } else {
            query = supabase.from('posted_tasks').select('*, profiles:client_id(full_name, avatar_url, is_verified)').eq('status', 'open').order('created_at', { ascending: false });
            if (category !== 'All') query = query.eq('category', category);
            if (subcategory !== 'All') query = query.eq('subcategory', subcategory);
            if (selectedState !== 'All') query = query.ilike('location', `%${selectedState}%`);
            if (selectedLGA !== 'All') query = query.ilike('location', `%${selectedLGA}%`);
            if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        
        const { data } = await safeFetch<any[]>(async () => await query.limit(50));
        setItems(data || []);
    } catch (e) { 
        console.error(e); 
    } finally { 
        setLoading(false); 
    }
  }, [category, subcategory, selectedState, selectedLGA, profile, viewMode, searchTerm]);

  useEffect(() => { 
    fetchData(); 
    fetchBroadcast();

    const broadcastChannel = supabase.channel('broadcasts_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
          const newB = payload.new as Broadcast;
          if (newB.target_role === 'all' || newB.target_role === profile?.role) {
              setActiveBroadcast(newB);
          }
      }).subscribe();

    return () => { supabase.removeChannel(broadcastChannel); };
  }, [fetchData, fetchBroadcast, profile?.role]);

  const clearFilters = () => {
    setCategory('All');
    setSubcategory('All');
    setSelectedState('All');
    setSelectedLGA('All');
    setSearchTerm('');
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedLGA('All');
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setSubcategory('All');
  };

  const isFilterActive = category !== 'All' || subcategory !== 'All' || selectedState !== 'All' || selectedLGA !== 'All' || searchTerm !== '';

  return (
    <div className="bg-white dark:bg-[#0f172a] min-h-screen transition-colors duration-200">
      {/* Insights Modal */}
      {showInsights && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-6 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-[40px] p-8 w-full max-w-sm relative max-h-[85vh] overflow-y-auto">
             <button onClick={() => setShowInsights(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><i className="fa-solid fa-xmark"></i></button>
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-brand/10 text-brand rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl rotate-3"><i className="fa-solid fa-magnifying-glass-chart"></i></div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Market Insights</h3>
             </div>
             <div className="space-y-4">
                <div className="relative">
                  <input value={insightQuery} onChange={e => setInsightQuery(e.target.value)} placeholder="e.g. 50kg Cement, Fuel..." className="w-full bg-gray-100 dark:bg-slate-700 border-none rounded-2xl py-4 px-5 text-sm font-bold dark:text-white outline-none" />
                  <button onClick={fetchMarketInsights} disabled={insightLoading} className="absolute right-2 top-2 bg-brand text-white w-10 h-10 rounded-xl shadow-lg"><i className={`fa-solid ${insightLoading ? 'fa-spinner animate-spin' : 'fa-arrow-right'}`}></i></button>
                </div>
                {insightResult && (
                  <div className="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-3xl border border-gray-100 dark:border-slate-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">{insightResult.text}</p>
                    {insightResult.sources.length > 0 && (
                      <div className="space-y-2">
                        {insightResult.sources.slice(0, 3).map((s: any, i: number) => (
                          <a key={i} href={s.uri} target="_blank" className="block text-[10px] text-brand font-bold underline truncate">{s.title || s.uri}</a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-6 pt-10 pb-4 sticky top-0 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md z-30 flex justify-between items-center border-b border-gray-50 dark:border-slate-800 transition-colors duration-200">
        <VelgoLogo className="h-10" />
        <div className="flex gap-3">
            <button onClick={onShowGuide} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm transition-all"><i className="fa-solid fa-question-circle"></i></button>
            <button onClick={() => setShowInsights(true)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm transition-all"><i className="fa-solid fa-magnifying-glass-chart"></i></button>
            <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-800 overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
                <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=008000&color=fff`} className="w-full h-full object-cover" alt="Profile" />
            </div>
        </div>
      </header>

      <div className="px-6 space-y-6 mt-6 pb-24 max-w-2xl mx-auto">
        {/* Announcement Banner */}
        {activeBroadcast && (
            <div className="bg-emerald-600 text-white p-6 rounded-[32px] shadow-2xl relative animate-fadeIn border border-white/20">
                <button onClick={dismissBroadcast} className="absolute top-4 right-4 text-white/50 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                <div className="flex items-start gap-4 pr-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/10"><i className="fa-solid fa-bullhorn text-xl"></i></div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-black uppercase tracking-[2px] bg-black/20 px-2 py-0.5 rounded-full">Velgo Official</span>
                            <span className="text-[8px] opacity-60 font-bold uppercase">{new Date(activeBroadcast.created_at).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-black text-lg tracking-tight leading-none mb-1">{activeBroadcast.title}</h4>
                        <p className="text-xs font-medium opacity-90 leading-relaxed">{activeBroadcast.message}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex gap-2">
            <div className="relative group flex-1">
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={viewMode === 'market' ? "Find workers by name..." : "Search for live jobs..."}
                  className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand/30 py-4 px-12 rounded-2xl text-sm font-bold dark:text-white outline-none transition-all shadow-sm"
                />
                <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${showFilters || isFilterActive ? 'bg-brand text-white shadow-lg' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'}`}
            >
                <i className="fa-solid fa-sliders text-lg"></i>
            </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-xl border border-gray-100 dark:border-slate-700 animate-fadeIn space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">Filter Options</h3>
                    <button onClick={clearFilters} className="text-[10px] font-bold text-red-500 uppercase">Clear All</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Location (State / LGA)</label>
                        <div className="flex gap-2">
                            <select value={selectedState} onChange={e => handleStateChange(e.target.value)} className="flex-1 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl text-xs font-bold dark:text-white outline-none">
                                <option value="All">All States</option>
                                {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={selectedLGA} onChange={e => setSelectedLGA(e.target.value)} disabled={selectedState === 'All'} className="flex-1 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl text-xs font-bold dark:text-white outline-none disabled:opacity-50">
                                <option value="All">All LGAs</option>
                                {NIGERIA_LGAS[selectedState]?.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Industry & Role</label>
                        <select value={category} onChange={e => handleCategoryChange(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 p-3 rounded-xl text-xs font-bold dark:text-white outline-none mb-2">
                            <option value="All">All Industries</option>
                            {Object.keys(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={subcategory} onChange={e => setSubcategory(e.target.value)} disabled={category === 'All'} className="w-full bg-gray-50 dark:bg-slate-900 p-3 rounded-xl text-xs font-bold dark:text-white outline-none disabled:opacity-50">
                            <option value="All">All Specializations</option>
                            {CATEGORY_MAP[category]?.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        )}

        {/* View Toggle for Workers and Admin */}
        {(profile?.role === 'worker' || profile?.role === 'admin') && (
             <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl flex text-[10px] font-black uppercase tracking-widest max-w-sm mx-auto shadow-inner transition-colors duration-200">
                 <button onClick={() => setViewMode('jobs')} className={`flex-1 py-3 rounded-xl transition-all ${viewMode === 'jobs' ? 'bg-white dark:bg-slate-700 text-brand shadow-lg' : 'text-gray-400'}`}>Live Jobs</button>
                 <button onClick={() => setViewMode('market')} className={`flex-1 py-3 rounded-xl transition-all ${viewMode === 'market' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-lg' : 'text-gray-400'}`}>
                    {profile?.role === 'worker' ? 'Competitors' : 'Workers'}
                 </button>
             </div>
        )}

        {/* Welcome Card */}
        <div className="bg-[#0f172a] dark:bg-black text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden group border border-white/5 transition-colors duration-200">
            {/* The 3D Watermark */}
            <img 
                src="https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png"
                className="absolute -right-6 -bottom-8 w-48 h-48 opacity-20 rotate-12 pointer-events-none grayscale-[0.2]"
                alt=""
            />
            
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand/10 rounded-full blur-3xl group-hover:bg-brand/20 transition-all"></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black uppercase tracking-[4px] text-brand">
                      {isAdmin ? 'ADMIN CONTROL PANEL' : 'NIGERIA HUB ACTIVE'}
                    </p>
                    {!isAdmin && (
                      <span className="text-[8px] font-black uppercase bg-white/10 px-2 py-1 rounded-md text-gray-400 border border-white/5">
                        {profile?.subscription_tier} Plan
                      </span>
                    )}
                </div>
                
                <h2 className="text-3xl font-black tracking-tighter leading-none mb-3">Hello, {profile?.full_name.split(' ')[0]}</h2>
                
                {/* Plan Usage Indicator */}
                {!isAdmin && (
                  <div className="mb-6 w-full max-w-[220px]">
                    <div className="flex justify-between items-end text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      <div className="flex flex-col">
                         <span>Monthly Limit</span>
                         <span className={isHighUsage ? 'text-yellow-400 animate-pulse' : 'text-brand-light'}>
                            {usageStatus}
                         </span>
                      </div>
                      <div className="text-right">
                         <span className="text-white text-[10px]">{usageCount}</span>
                         <span className="opacity-50"> / {usageLimit > 999 ? '∞' : usageLimit}</span>
                      </div>
                    </div>
                    
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
                      {isHighUsage && <div className="absolute inset-0 bg-yellow-400/20 animate-pulse"></div>}
                      
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${usageColor}`} 
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>

                    {isHighUsage && (
                        <button onClick={onUpgrade} className="mt-3 w-full text-center text-[9px] font-black uppercase text-gray-900 bg-yellow-400 rounded-lg py-1.5 hover:bg-white transition-colors shadow-lg">
                            Upgrade Now
                        </button>
                    )}
                  </div>
                )}

                {profile?.role === 'client' || isAdmin ? (
                    <div className="flex gap-3 animate-fadeIn">
                        <button 
                            onClick={onPostTask} 
                            className="flex-1 bg-brand text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-all"
                        >
                            {isAdmin ? 'Post Admin Alert' : 'Post a Job Request'}
                        </button>
                        {!isAdmin && (
                          <button 
                              onClick={onPostTask} 
                              className="w-14 h-14 bg-brand text-white rounded-2xl flex items-center justify-center text-xl shadow-xl shadow-brand/20 active:scale-95 transition-all shrink-0"
                              aria-label="Quick post job"
                          >
                              <i className="fa-solid fa-plus"></i>
                          </button>
                        )}
                    </div>
                ) : <p className="text-xs font-medium text-gray-400">Ready for your next gig?</p>}
            </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="py-20 text-center text-gray-300 font-black uppercase tracking-[5px] animate-pulse">Syncing Hub...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {items.map((item) => (
              <div 
                key={item.id} 
                onClick={() => viewMode === 'market' ? onViewWorker(item.id) : onViewTask(item.id)}
                className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 shadow-sm">
                    <img 
                      src={item.avatar_url || item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name || item.title)}&background=008000&color=fff`} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt="" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-gray-900 dark:text-white truncate">{item.full_name || item.title}</h3>
                      {(item.is_verified || item.profiles?.is_verified) && <VerificationBadge />}
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
                      {item.category && item.category !== 'All' ? item.category.split(',')[0] : 'Gig'} • {item.state || item.location?.split(',').pop()?.trim() || 'Nigeria'}
                    </p>
                    {item.subcategory && (
                        <p className="text-[10px] font-medium text-brand mt-1 truncate">{item.subcategory}</p>
                    )}
                  </div>
                  <i className="fa-solid fa-chevron-right text-gray-200 dark:text-slate-700 group-hover:text-brand transition-colors"></i>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="py-20 text-center opacity-30">
                <i className="fa-solid fa-cloud-moon text-6xl text-gray-200 mb-6"></i>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[5px]">
                  No {viewMode === 'market' ? (profile?.role === 'worker' ? 'competitors' : 'workers') : 'jobs'} found
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
