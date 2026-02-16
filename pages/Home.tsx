
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
  // Default for Worker: 'jobs' (Live Jobs)
  // Default for Client: 'market' (Hire Now)
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

  const firstName = profile?.full_name?.split(' ')[0] || 'User';

  return (
    <div className="bg-white dark:bg-[#0f172a] min-h-screen transition-colors duration-200">
      
      {/* Floating Action Button (Client Only) */}
      {profile?.role === 'client' && (
        <button 
            onClick={onPostTask}
            className="fixed bottom-24 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-2xl shadow-brand/40 flex items-center justify-center z-40 active:scale-90 transition-transform md:hidden animate-fadeIn"
        >
            <i className="fa-solid fa-plus text-xl"></i>
        </button>
      )}

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
      <div className="px-6 pt-10 pb-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-end sticky top-0 bg-white dark:bg-[#0f172a] z-10">
        <VelgoLogo className="h-8" />
        <div className="flex gap-3">
            <button onClick={() => setShowInsights(true)} className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center animate-pulse"><i className="fa-solid fa-wand-magic-sparkles"></i></button>
            <button onClick={() => onShowGuide()} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white"><i className="fa-regular fa-circle-question"></i></button>
        </div>
      </div>

      {/* Broadcast Banner */}
      {activeBroadcast && (
          <div className="px-6 mt-4 animate-fadeIn">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 rounded-2xl flex items-start gap-3 shadow-xl relative overflow-hidden">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0"><i className="fa-solid fa-bullhorn text-xs"></i></div>
                  <div className="flex-1">
                      <h4 className="text-xs font-black uppercase tracking-widest">{activeBroadcast.title}</h4>
                      <p className="text-[10px] font-medium opacity-90 mt-1">{activeBroadcast.message}</p>
                  </div>
                  <button onClick={dismissBroadcast} className="text-white/50 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
              </div>
          </div>
      )}

      {/* Dashboard / Status Card */}
      <div className="px-6 mt-6">
          <div onClick={onUpgrade} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[32px] border border-gray-100 dark:border-gray-700 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all">
              
              {/* Background Pattern */}
              <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                  <VelgoLogo className="h-40 w-40 grayscale" />
              </div>

              <div className="relative z-10 space-y-4">
                  <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Hello, {firstName}</h2>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse"></div>
                              {profile?.subscription_tier || 'Basic'} • Nigeria Hub Active
                          </span>
                      </div>
                  </div>

                  <div>
                      <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monthly Limit</span>
                          <span className={`text-[10px] font-black uppercase ${rawPercent >= 100 ? 'text-red-500' : 'text-gray-500'}`}>
                              {usageCount} / {usageLimit} {profile?.role === 'client' ? 'Hires' : 'Jobs'}
                          </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ease-out ${usageColor}`} style={{ width: `${usagePercent}%` }}></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Action Buttons - Compact Horizontal Layout */}
      <div className="px-6 mt-6 grid grid-cols-2 gap-3">
          
          {/* WORKER VIEW BUTTONS */}
          {profile?.role === 'worker' && (
              <>
                <button 
                    onClick={() => { setViewMode('jobs'); clearFilters(); fetchData(); }} 
                    className={`py-4 px-2 rounded-[20px] border transition-all flex flex-row items-center justify-center gap-2 relative overflow-hidden group active:scale-95 ${viewMode === 'jobs' ? 'bg-brand text-white border-transparent shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700'}`}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${viewMode === 'jobs' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                        <i className="fa-solid fa-briefcase text-xs"></i>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Live Jobs</span>
                </button>

                <button 
                    onClick={() => { setViewMode('market'); clearFilters(); fetchData(); }} 
                    className={`py-4 px-2 rounded-[20px] border transition-all flex flex-row items-center justify-center gap-2 relative overflow-hidden group active:scale-95 ${viewMode === 'market' ? 'bg-gray-900 text-white border-transparent shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700'}`}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${viewMode === 'market' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                        <i className="fa-solid fa-ranking-star text-xs"></i>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Top Earners</span>
                </button>
              </>
          )}

          {/* CLIENT VIEW BUTTONS */}
          {profile?.role === 'client' && (
              <>
                <button 
                    onClick={() => { setViewMode('market'); clearFilters(); fetchData(); }} 
                    className={`py-4 px-2 rounded-[20px] border transition-all flex flex-row items-center justify-center gap-2 relative overflow-hidden group active:scale-95 ${viewMode === 'market' ? 'bg-gray-900 text-white border-transparent shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700'}`}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${viewMode === 'market' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                        <i className="fa-solid fa-magnifying-glass text-xs"></i>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Hire Now</span>
                </button>

                <button 
                    onClick={onPostTask} 
                    className="py-4 px-2 rounded-[20px] bg-brand text-white border-transparent shadow-lg flex flex-row items-center justify-center gap-2 relative overflow-hidden group active:scale-95 transition-transform"
                >
                    <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-plus text-xs"></i>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Post Job</span>
                </button>
              </>
          )}
      </div>

      {/* Search & Filter */}
      <div className="px-6 mt-6 sticky top-20 z-10 bg-white dark:bg-[#0f172a] pb-2 transition-colors duration-200">
          <div className="flex gap-3">
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center px-4 py-3 border border-transparent focus-within:border-brand focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
                  <i className="fa-solid fa-search text-gray-400 mr-3"></i>
                  <input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={viewMode === 'market' ? "Search..." : "Search jobs..."} 
                    className="bg-transparent w-full text-sm font-bold text-gray-900 dark:text-white outline-none placeholder-gray-400"
                  />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isFilterActive ? 'bg-brand text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
              >
                  <i className="fa-solid fa-sliders"></i>
              </button>
          </div>

          {showFilters && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-[24px] border border-gray-100 dark:border-gray-700 space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Category</label>
                          <select value={category} onChange={e => handleCategoryChange(e.target.value)} className="w-full bg-white dark:bg-gray-900 p-2 rounded-xl text-xs font-bold border border-gray-100 dark:border-gray-700 outline-none dark:text-white">
                              <option value="All">All Categories</option>
                              {Object.keys(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Subcategory</label>
                          <select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="w-full bg-white dark:bg-gray-900 p-2 rounded-xl text-xs font-bold border border-gray-100 dark:border-gray-700 outline-none dark:text-white">
                              <option value="All">All Types</option>
                              {CATEGORY_MAP[category]?.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">State</label>
                          <select value={selectedState} onChange={e => handleStateChange(e.target.value)} className="w-full bg-white dark:bg-gray-900 p-2 rounded-xl text-xs font-bold border border-gray-100 dark:border-gray-700 outline-none dark:text-white">
                              <option value="All">All Nigeria</option>
                              {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">LGA</label>
                          <select value={selectedLGA} onChange={e => setSelectedLGA(e.target.value)} className="w-full bg-white dark:bg-gray-900 p-2 rounded-xl text-xs font-bold border border-gray-100 dark:border-gray-700 outline-none dark:text-white" disabled={selectedState === 'All'}>
                              <option value="All">All Areas</option>
                              {NIGERIA_LGAS[selectedState]?.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                      </div>
                  </div>
                  <button onClick={clearFilters} className="w-full py-3 text-[10px] font-black uppercase text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl">Clear Filters</button>
              </div>
          )}
      </div>

      {/* List Content */}
      <div className="px-6 pb-24 space-y-4 min-h-[50vh]">
          {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300 space-y-4">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-brand rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-[3px]">Loading...</p>
              </div>
          ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300 space-y-4 text-center">
                  <i className="fa-solid fa-wind text-4xl"></i>
                  <p className="text-[10px] font-black uppercase tracking-[3px]">No results found</p>
                  <button onClick={clearFilters} className="text-brand text-xs font-bold underline">Clear Filters</button>
              </div>
          ) : (
              items.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => viewMode === 'market' ? onViewWorker(item.id) : onViewTask(item.id)}
                    className="bg-white dark:bg-gray-800 p-5 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 active:scale-[0.98] transition-all cursor-pointer group"
                  >
                      <div className="relative shrink-0">
                          {viewMode === 'market' ? (
                              <img 
                                src={item.avatar_url || `https://ui-avatars.com/api/?name=${item.full_name}`} 
                                className="w-14 h-14 rounded-2xl object-cover bg-gray-100 dark:bg-gray-700" 
                                loading="lazy" 
                                decoding="async"
                              />
                          ) : (
                              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl text-gray-400">
                                  {item.image_url ? (
                                    <img src={item.image_url} className="w-full h-full object-cover rounded-2xl" loading="lazy" decoding="async" />
                                  ) : (
                                    <i className="fa-solid fa-briefcase"></i>
                                  )}
                              </div>
                          )}
                          {item.is_verified && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-white dark:border-gray-800"><i className="fa-solid fa-check"></i></div>}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                              <h3 className="font-black text-sm text-gray-900 dark:text-white truncate pr-2">{viewMode === 'market' ? item.full_name : item.title}</h3>
                              {viewMode === 'jobs' && <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${item.urgency === 'emergency' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>{item.urgency}</span>}
                          </div>
                          
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                              {viewMode === 'market' ? (item.subcategory || item.category || 'General Worker') : `Budget: ₦${(item.budget || 0).toLocaleString()}`}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-gray-400">
                              <i className="fa-solid fa-location-dot text-brand"></i>
                              <span className="truncate">{viewMode === 'market' ? `${item.lga}, ${item.state}` : item.location}</span>
                          </div>
                      </div>
                      
                      <div className="self-center">
                          <i className="fa-solid fa-chevron-right text-gray-300 text-xs group-hover:text-brand transition-colors"></i>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};

export default Home;
