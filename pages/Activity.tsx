import React, { useState, useEffect, useCallback } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { getTierLimit } from '../lib/constants';
import { jsPDF } from 'jspdf';

const Activity: React.FC<{ profile: Profile | null; onOpenChat: (partnerId: string) => void; onUpgrade: () => void; onRefreshProfile: () => void; }> = ({ profile, onOpenChat, onUpgrade, onRefreshProfile }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'ongoing' | 'history'>('requests');
  const [bookings, setBookings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const partnerColumn = profile.role === 'client' ? 'worker_id' : 'client_id';
    const { data: bookingsData } = await safeFetch<any[]>(async () => 
      await supabase.from('bookings')
        .select(`*, profiles:${partnerColumn}(*, subscription_tier, task_count), posted_tasks:task_id(title, description, budget)`)
        .eq(profile.role === 'client' ? 'client_id' : 'worker_id', profile.id)
        .order('created_at', { ascending: false })
    );
    setBookings(bookingsData || []);
    let taskQuery = supabase.from('posted_tasks').select('*, profiles:assigned_worker_id(*)').order('created_at', { ascending: false });
    if (profile.role === 'client') taskQuery = taskQuery.eq('client_id', profile.id);
    else taskQuery = taskQuery.eq('assigned_worker_id', profile.id);
    const { data: tasksData } = await safeFetch<any[]>(async () => await taskQuery);
    setTasks(tasksData || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const updateBookingStatus = async (booking: any, newStatus: string) => {
    if (!profile) return;
    try {
        if (newStatus === 'accepted' && profile.role === 'worker') {
          const limit = getTierLimit(profile.subscription_tier);
          if (profile.task_count >= limit) { onUpgrade(); return; }
        }
        const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id);
        if (error) throw error;
        if (newStatus === 'accepted') onRefreshProfile();
        fetchActivity();
    } catch (err: any) { alert("Action failed: " + err.message); }
  };

  const currentItems = activeTab === 'requests' ? bookings.filter(b => b.status === 'pending').concat(tasks.filter(t => t.status === 'open')) 
                     : activeTab === 'ongoing' ? bookings.filter(b => b.status === 'accepted').concat(tasks.filter(t => t.status === 'assigned'))
                     : bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).concat(tasks.filter(t => t.status === 'completed'));

  return (
    <div className="bg-white min-h-screen">
      <div className="px-6 pt-10 pb-4 border-b border-gray-50 flex justify-between items-end sticky top-0 bg-white z-10">
        <h1 className="text-2xl font-black text-gray-900">My Gigs</h1>
      </div>
      <div className="px-6 mt-6">
        <div className="flex bg-gray-100 p-1.5 rounded-[22px] border border-gray-200">
            {['requests', 'ongoing', 'history'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[18px] transition-all ${activeTab === tab ? 'bg-white text-brand shadow-lg' : 'text-gray-400'}`}>{tab}</button>
            ))}
        </div>
      </div>
      <div className="p-6 pb-24">
        {loading ? <div className="text-center py-20 animate-pulse text-[10px] font-black uppercase tracking-[5px] text-gray-300">Syncing Gigs...</div> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentItems.length > 0 ? currentItems.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-[40px] shadow-sm border border-gray-100 space-y-4 relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl border-2 border-white bg-gray-50 flex items-center justify-center shadow-xl overflow-hidden">
                          {item.profiles?.avatar_url ? <img src={item.profiles.avatar_url} className="w-full h-full object-cover"/> : <span className="font-black text-gray-300 text-xl">{(item.profiles?.full_name || item.title || 'U')[0]}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="font-black text-gray-900 text-[15px] truncate tracking-tight">{item.title || item.posted_tasks?.title || 'Direct Request'}</h3>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{item.profiles?.full_name || 'User'}</span>
                      </div>
                    </div>
                    {item.status === 'pending' && (
                        <div className="flex gap-3 w-full">
                            <button onClick={() => updateBookingStatus(item, 'cancelled')} className="flex-1 bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Decline</button>
                            <button onClick={() => updateBookingStatus(item, 'accepted')} className="flex-1 bg-brand text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Accept</button>
                        </div>
                    )}
                    {['accepted'].includes(item.status) && (
                        <button onClick={() => onOpenChat(profile?.role === 'client' ? item.worker_id : item.client_id)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Open Chat</button>
                    )}
                </div>
            )) : <div className="col-span-full text-center py-20 flex flex-col items-center opacity-30"><i className="fa-solid fa-cloud text-6xl text-gray-200 mb-6"></i><p className="text-gray-400 text-[10px] font-black uppercase tracking-[5px]">No Gigs in this tab</p></div>}
          </div>
        }
      </div>
    </div>
  );
};
export default Activity;