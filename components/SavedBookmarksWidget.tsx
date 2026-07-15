import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getBookmarkedIds, toggleBookmark } from '../lib/bookmarkService';
import { VerificationBadge } from './VerificationBadge';

interface SavedBookmarksWidgetProps {
  userId: string;
  onNavigate?: (view: string, data?: any) => void;
}

export const SavedBookmarksWidget: React.FC<SavedBookmarksWidgetProps> = ({ userId, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'workers' | 'jobs'>('workers');
  const [savedWorkers, setSavedWorkers] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSavedItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      if (activeTab === 'workers') {
        const ids = await getBookmarkedIds(userId, 'worker');
        if (ids.length === 0) {
          setSavedWorkers([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, category, starting_price, is_verified, lga, state, worker_avg_rating, worker_rating_count')
          .in('id', ids);

        if (error) throw error;
        
        // Retain original order of bookmarked items if possible
        const orderedData = ids.map(id => data.find(item => item.id === id)).filter(Boolean);
        setSavedWorkers(orderedData);
      } else {
        const ids = await getBookmarkedIds(userId, 'job');
        if (ids.length === 0) {
          setSavedJobs([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('posted_tasks')
          .select('id, title, budget, location, urgency, category, created_at, client_id, profiles:client_id(full_name, avatar_url, is_verified)')
          .in('id', ids);

        if (error) throw error;
        
        const orderedData = ids.map(id => data.find(item => item.id === id)).filter(Boolean);
        setSavedJobs(orderedData);
      }
    } catch (err) {
      console.error('Error fetching bookmarked items:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab]);

  useEffect(() => {
    fetchSavedItems();
  }, [fetchSavedItems]);

  const handleUnfavorite = async (e: React.MouseEvent, targetId: string, type: 'worker' | 'job') => {
    e.stopPropagation(); // Avoid triggering navigation
    const confirmRemove = window.confirm(`Are you sure you want to remove this item from your saved list?`);
    if (!confirmRemove) return;

    const isBookmarkedAfter = await toggleBookmark(userId, targetId, type);
    if (!isBookmarkedAfter) {
      if (type === 'worker') {
        setSavedWorkers(prev => prev.filter(item => item.id !== targetId));
      } else {
        setSavedJobs(prev => prev.filter(item => item.id !== targetId));
      }
    }
  };

  const handleItemClick = (targetId: string, type: 'worker' | 'job') => {
    if (onNavigate) {
      if (type === 'worker') {
        onNavigate('worker-detail', targetId);
      } else {
        onNavigate('task-detail', targetId);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[35px] border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-5 animate-fadeIn">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-2xl flex items-center justify-center">
            <i className="fa-solid fa-heart text-lg"></i>
          </div>
          <div>
            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">
              Saved Favourites
            </h3>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              Your bookmarked expert workers & job offers
            </p>
          </div>
        </div>
        <button 
          onClick={fetchSavedItems} 
          className="text-gray-400 hover:text-brand text-xs active:rotate-180 transition-transform duration-300"
          title="Refresh List"
        >
          <i className="fa-solid fa-arrows-rotate"></i>
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="grid grid-cols-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('workers')}
          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all ${activeTab === 'workers' ? 'bg-slate-900 dark:bg-gray-700 text-white shadow-sm' : 'text-gray-500'}`}
        >
          👷 Saved Workers
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all ${activeTab === 'jobs' ? 'bg-slate-900 dark:bg-gray-700 text-white shadow-sm' : 'text-gray-500'}`}
        >
          💼 Saved Job Offers
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin"></div>
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Updating...</p>
          </div>
        ) : activeTab === 'workers' ? (
          savedWorkers.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <i className="fa-regular fa-address-book text-3xl text-gray-300"></i>
              <p className="text-xs font-bold">No saved workers yet</p>
              <p className="text-[10px] max-w-xs mx-auto leading-relaxed">
                Click the heart icon on any worker's detail page to bookmark them for easy access later.
              </p>
            </div>
          ) : (
            savedWorkers.map(w => (
              <div 
                key={w.id}
                onClick={() => handleItemClick(w.id, 'worker')}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 rounded-2xl border border-gray-100/50 dark:border-gray-700/50 transition-all cursor-pointer group"
              >
                <img 
                  src={w.avatar_url || `https://ui-avatars.com/api/?name=${w.full_name}`} 
                  className="w-10 h-10 rounded-xl object-cover" 
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="font-bold text-xs text-gray-950 dark:text-white truncate">{w.full_name}</h4>
                    {w.is_verified && <VerificationBadge className="text-blue-500 text-[10px]" />}
                  </div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase truncate">{w.category || 'Verified Professional'}</p>
                  <p className="text-[9px] font-medium text-gray-400 mt-0.5">
                    Starting: ₦{w.starting_price} • Rating: {w.worker_avg_rating ? `${w.worker_avg_rating}★` : 'N/A'}
                  </p>
                </div>
                <button 
                  onClick={(e) => handleUnfavorite(e, w.id, 'worker')}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-100/40 active:scale-90 transition-transform shrink-0"
                  title="Remove Bookmark"
                >
                  <i className="fa-solid fa-heart"></i>
                </button>
              </div>
            ))
          )
        ) : (
          savedJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <i className="fa-regular fa-folder text-3xl text-gray-300"></i>
              <p className="text-xs font-bold">No saved job offers yet</p>
              <p className="text-[10px] max-w-xs mx-auto leading-relaxed">
                Heart interesting job postings to bookmark them and track updates easily.
              </p>
            </div>
          ) : (
            savedJobs.map(j => (
              <div 
                key={j.id}
                onClick={() => handleItemClick(j.id, 'jobs')}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 rounded-2xl border border-gray-100/50 dark:border-gray-700/50 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm shrink-0">
                  <i className="fa-solid fa-briefcase"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-gray-950 dark:text-white truncate">{j.title}</h4>
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase truncate">Budget: ₦{(j.budget || 0).toLocaleString()}</p>
                  <p className="text-[9px] font-medium text-gray-400 mt-0.5 truncate">
                    {j.urgency} urgency • {j.location}
                  </p>
                </div>
                <button 
                  onClick={(e) => handleUnfavorite(e, j.id, 'job')}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-100/40 active:scale-90 transition-transform shrink-0"
                  title="Remove Bookmark"
                >
                  <i className="fa-solid fa-heart"></i>
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
