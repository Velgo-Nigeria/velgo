import React, { useState, useEffect, useCallback } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile, PostedTask } from '../lib/types';
import { GoogleGenAI } from "@google/genai";
import { VelgoLogo } from '../components/Brand';
import { CATEGORY_MAP } from '../lib/constants';
import { NIGERIA_STATES, NIGERIA_LGAS } from '../lib/locations';

const Home: React.FC<{ profile: Profile | null, onViewWorker: (id: string) => void, onViewTask: (id: string) => void, onRefreshProfile: () => void, onUpgrade: () => void, onPostTask: () => void, onShowGuide: () => void }> = ({ profile, onViewWorker, onViewTask, onRefreshProfile, onUpgrade, onPostTask, onShowGuide }) => {
  const [items, setItems] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [subcategory, setSubcategory] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedLGA, setSelectedLGA] = useState('All');
  
  const [workerViewMode, setWorkerViewMode] = useState<'jobs' | 'market'>('jobs');
  
  const [showInsights, setShowInsights] = useState(false);
  const [insightQuery, setInsightQuery] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightResult, setInsightResult] = useState<{ text: string, sources: any[] } | null>(null);

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
    const isFetchingWorkers = profile.role === 'client' || (profile.role === 'worker' && workerViewMode === 'market');
    
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
  }, [category, subcategory, selectedState, selectedLGA, profile, workerViewMode, searchTerm]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

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
        {/* Search Bar */}
        <div className="relative group">
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or keyword..."
              className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand/30 py-5 px-14 rounded-3xl text-sm font-bold dark:text-white outline-none transition-all shadow-sm"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-400"></i>
            {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand"><i className="fa-solid fa-circle-xmark"></i></button>
            )}
        </div>

        {/* View Toggle for Workers */}
        {profile?.role === 'worker' && (
             <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl flex text-[10px] font-black uppercase tracking-widest max-w-sm mx-auto shadow-inner transition-colors duration-200">
                 <button onClick={() => setWorkerViewMode('jobs')} className={`flex-1 py-3 rounded-xl transition-all ${workerViewMode === 'jobs' ? 'bg-white dark:bg-slate-700 text-brand shadow-lg' : 'text-gray-400'}`}>View Jobs</button>
                 <button onClick={() => setWorkerViewMode('market')} className={`flex-1 py-3 rounded-xl transition-all ${workerViewMode === 'market' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-lg' : 'text-gray-400'}`}>Competitors</button>
             </div>
        )}

        {/* Welcome Card */}
        <div className="bg-[#0f172a] dark:bg-black text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden group border border-white/5 transition-colors duration-200">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand/10 rounded-full blur-3xl group-hover:bg-brand/20 transition-all"></div>
            <p className="text-[10px] font-black uppercase tracking-[4px] text-brand mb-1">NIGERIA HUB ACTIVE</p>
            <h2 className="text-3xl font-black tracking-tighter leading-none mb-4">Hello, {profile?.full_name.split(' ')[0]}</h2>
            {profile?.role === 'client' ? (
                <button onClick={onPostTask} className="bg-brand text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-all">Post a Job Request</button>
            ) : <p className="text-xs font-medium text-gray-400">Ready to crush your next gig?</p>}
        </div>

        {/* Location Filters Header */}
        <div className="flex justify-between items-end px-2">
            <p className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[3px]">Filter by Location</p>
            {isFilterActive && (
                <button onClick={clearFilters} className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity">
                    <i className="fa-solid fa-trash-can"></i> Clear All
                </button>
            )}
        </div>

        {/* Location Filters Inputs */}
        <div className="grid grid-cols-2 gap-3">
            <div className="relative">
                <select 
                value={selectedState} 
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider border-2 border-transparent focus:border-brand/30 outline-none appearance-none transition-all shadow-sm"
                >
                <option value="All">All States</option>
                {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
            </div>

            <div className="relative">
                <select 
                value={selectedLGA} 
                onChange={(e) => setSelectedLGA(e.target.value)}
                disabled={selectedState === 'All'}
                className={`w-full bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider border-2 border-transparent focus:border-brand/30 outline-none appearance-none transition-all shadow-sm ${selectedState === 'All' ? 'opacity-50' : 'opacity-100'}`}
                >
                <option value="All">All LGAs</option>
                {selectedState !== 'All' && NIGERIA_LGAS[selectedState]?.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
            </div>
        </div>

        {/* Category Scroll */}
        <div className="space-y-4">
           <p className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[3px] ml-2">Industries</p>
           <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            <button onClick={() => handleCategoryChange('All')} className={`whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${category === 'All' ? 'bg-brand text-white shadow-xl scale-105' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>All</button>
            {Object.keys(CATEGORY_MAP).map(cat => (
              <button key={cat} onClick={() => handleCategoryChange(cat)} className={`whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${category === cat ? 'bg-brand text-white shadow-xl scale-105' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{cat}</button>
            ))}
          </div>

          {/* Subcategory Scroll - Appears only when a category is selected */}
          {category !== 'All' && CATEGORY_MAP[category] && (
            <div className="animate-fadeIn space-y-2">
                <p className="text-[8px] font-black text-brand/60 uppercase tracking-[2px] ml-2">Specific Services</p>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
                    <button onClick={() => setSubcategory('All')} className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${subcategory === 'All' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-400 border border-gray-100 dark:border-slate-700'}`}>All {category}</button>
                    {CATEGORY_MAP[category].map(sub => (
                    <button key={sub} onClick={() => setSubcategory(sub)} className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${subcategory === sub ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-400 border border-gray-100 dark:border-slate-700'}`}>{sub}</button>
                    ))}
                </div>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="grid grid-cols-1 gap-6">
          <div className="flex justify-between items-center px-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {loading ? 'Searching...' : `${items.length} ${items.length === 1 ? 'result' : 'results'} found`}
              </p>
          </div>

          {loading ? [1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-50 dark:bg-slate-800 rounded-[40px] animate-pulse" />) : 
            items.length === 0 ? (
                <div className="text-center py-20 animate-fadeIn">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-200 dark:text-slate-700">
                        <i className="fa-solid fa-magnifying-glass text-2xl"></i>
                    </div>
                    <p className="text-gray-300 dark:text-slate-700 font-black uppercase text-[10px] tracking-[5px]">No results match your search</p>
                    <button onClick={clearFilters} className="mt-4 text-brand font-black uppercase text-[10px] tracking-widest underline">Reset All Filters</button>
                </div>
            ) :
            items.map(item => (
              <div key={item.id} onClick={() => (profile?.role === 'client' || workerViewMode === 'market') ? onViewWorker(item.id) : onViewTask(item.id)} className="bg-white dark:bg-slate-800 p-6 rounded-[40px] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex items-center gap-5">
                  <div className="w-20 h-20 rounded-3xl border-2 border-white dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
                      <img src={item.avatar_url || item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name || item.title || 'User')}&background=008000&color=fff`} className="w-full h-full object-cover" alt="User Avatar" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-900 dark:text-white text-[18px] tracking-tight truncate">{(item.full_name || item.title)}</h4>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 truncate">{(item.subcategory || item.category || 'Artisan')}</p>
                      <div className="mt-3 flex items-center gap-3">
                          <span className="text-brand font-black text-lg tracking-tighter">₦{(item.starting_price || item.budget)?.toLocaleString()}</span>
                          <span className="text-gray-200 dark:text-slate-700 text-xs">|</span>
                          <span className="text-[9px] text-gray-500 dark:text-slate-400 font-black uppercase truncate max-w-[100px]"><i className="fa-solid fa-location-dot mr-1 text-brand"></i>{item.lga || item.location?.split(',')[0] || 'Nigeria'}</span>
                      </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-gray-300 dark:text-slate-600 shrink-0"><i className="fa-solid fa-chevron-right"></i></div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
export default Home;
