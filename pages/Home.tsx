import React, { useState, useEffect, useCallback } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile, PostedTask } from '../lib/types';
import { GoogleGenAI } from "@google/genai";
import { VelgoLogo } from '../components/Brand';
import { CATEGORY_MAP, getTierLimit } from '../lib/constants';
import { NIGERIA_STATES, NIGERIA_LGAS } from '../lib/locations';

const Home: React.FC<{ profile: Profile | null, onViewWorker: (id: string) => void, onViewTask: (id: string) => void, onRefreshProfile: () => void, onUpgrade: () => void, onPostTask: () => void, onShowGuide: () => void }> = ({ profile, onViewWorker, onViewTask, onRefreshProfile, onUpgrade, onPostTask, onShowGuide }) => {
  const [items, setItems] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
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
      alert("Failed to fetch market insights. Please try again later.");
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
        } else {
            query = supabase.from('posted_tasks').select('*, profiles:client_id(full_name, avatar_url, is_verified)').eq('status', 'open').order('created_at', { ascending: false });
            if (category !== 'All') query = query.eq('category', category);
        }
        const { data } = await safeFetch<any[]>(async () => await query.limit(50));
        setItems(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [category, profile, workerViewMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen transition-colors duration-200">
      {showInsights && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-6 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-[40px] p-8 w-full max-w-sm relative max-h-[85vh] overflow-y-auto">
             <button onClick={() => setShowInsights(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><i className="fa-solid fa-xmark"></i></button>
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-brand/10 text-brand rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl rotate-3"><i className="fa-solid fa-magnifying-glass-chart"></i></div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Market Insights</h3>
             </div>
             <div className="space-y-4">
                <div className="relative">
                  <input value={insightQuery} onChange={e => setInsightQuery(e.target.value)} placeholder="e.g. 50kg Cement, Fuel Price..." className="w-full bg-gray-100 dark:bg-gray-700 border-none rounded-2xl py-4 px-5 text-sm font-bold dark:text-white outline-none" />
                  <button onClick={fetchMarketInsights} disabled={insightLoading} className="absolute right-2 top-2 bg-brand text-white w-10 h-10 rounded-xl shadow-lg"><i className={`fa-solid ${insightLoading ? 'fa-spinner animate-spin' : 'fa-arrow-right'}`}></i></button>
                </div>
                {insightResult && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-700">
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
      <header className="px-6 pt-10 pb-4 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-30 flex justify-between items-center border-b border-gray-50 dark:border-gray-800 transition-colors duration-200">
        <VelgoLogo className="h-10" />
        <div className="flex gap-3">
            <button onClick={onShowGuide} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm transition-all" title="App Guide"><i className="fa-solid fa-question-circle"></i></button>
            <button onClick={() => setShowInsights(true)} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm transition-all" title="Market Insights"><i className="fa-solid fa-magnifying-glass-chart"></i></button>
            <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=008000&color=fff`} className="w-full h-full object-cover" />
            </div>
        </div>
      </header>
      <div className="px-6 space-y-6 mt-6 pb-24 max-w-2xl mx-auto">
        {profile?.role === 'worker' && (
             <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl flex text-[10px] font-black uppercase tracking-widest max-w-sm mx-auto shadow-inner transition-colors duration-200">
                 <button onClick={() => setWorkerViewMode('jobs')} className={`flex-1 py-3 rounded-xl transition-all ${workerViewMode === 'jobs' ? 'bg-white dark:bg-gray-700 text-brand shadow-lg' : 'text-gray-400'}`}>View Jobs</button>
                 <button onClick={() => setWorkerViewMode('market')} className={`flex-1 py-3 rounded-xl transition-all ${workerViewMode === 'market' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-lg' : 'text-gray-400'}`}>Competitors</button>
             </div>
        )}
        <div className="bg-gray-900 dark:bg-black text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden group border border-white/5 transition-colors duration-200">
            <p className="text-[10px] font-black uppercase tracking-[4px] text-brand mb-1">NIGERIA HUB ACTIVE</p>
            <h2 className="text-3xl font-black tracking-tighter leading-none mb-4">Hello, {profile?.full_name.split(' ')[0]}</h2>
            {profile?.role === 'client' ? (
                <button onClick={onPostTask} className="bg-brand text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-all">Post a Job Request</button>
            ) : <p className="text-xs font-medium text-gray-400">Find your next client today!</p>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {['All', ...Object.keys(CATEGORY_MAP)].map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className={`whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${category === cat ? 'bg-brand text-white shadow-xl scale-105' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{cat}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6">
          {loading ? [1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-50 dark:bg-gray-800 rounded-[40px] animate-pulse" />) : 
            items.length === 0 ? <div className="text-center py-20 text-gray-300 dark:text-gray-700 font-black uppercase text-[10px] tracking-[5px]">No active gigs found</div> :
            items.map(item => (
              <div key={item.id} onClick={() => (profile?.role === 'client' || workerViewMode === 'market') ? onViewWorker(item.id) : onViewTask(item.id)} className="bg-white dark:bg-gray-800 p-6 rounded-[40px] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex items-center gap-5">
                  <div className="w-20 h-20 rounded-3xl border-2 border-white dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center shadow-xl overflow-hidden">
                      <img src={item.avatar_url || item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${item.full_name || 'User'}&background=008000&color=fff`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-900 dark:text-white text-[18px] tracking-tight truncate">{(item.full_name || item.title)}</h4>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{(item.category || item.subcategory || 'Artisan')}</p>
                      <div className="mt-3 flex items-center gap-3">
                          <span className="text-brand font-black text-lg tracking-tighter">₦{(item.starting_price || item.budget)?.toLocaleString()}</span>
                          <span className="text-gray-200 dark:text-gray-700 text-xs">|</span>
                          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase"><i className="fa-solid fa-location-dot mr-1"></i>{item.lga || item.location?.split(',')[0] || 'Lagos'}</span>
                      </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-600"><i className="fa-solid fa-chevron-right"></i></div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
export default Home;