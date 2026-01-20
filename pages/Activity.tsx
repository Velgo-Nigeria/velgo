
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { getTierLimit } from '../lib/constants';

const Activity: React.FC<{ profile: Profile | null; onOpenChat: (partnerId: string) => void; onUpgrade: () => void; onRefreshProfile: () => void; }> = ({ profile, onOpenChat, onUpgrade, onRefreshProfile }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'ongoing' | 'history'>('requests');
  const [bookings, setBookings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Completion Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingBooking, setCompletingBooking] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchActivity = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const partnerColumn = profile.role === 'client' ? 'worker_id' : 'client_id';
    
    // Updated query to explicitly include bank details for the worker
    const { data: bookingsData } = await safeFetch<any[]>(async () => 
      await supabase.from('bookings')
        .select(`
          *, 
          profiles:${partnerColumn}(
            id, full_name, avatar_url, subscription_tier, task_count, 
            bank_name, account_number, account_name
          ), 
          posted_tasks:task_id(title, description, budget)
        `)
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

  const handleOpenCompleteModal = (item: any) => {
      setCompletingBooking(item);
      setRating(5);
      setReview('');
      setShowCompleteModal(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Account number copied!");
  };

  const submitCompletion = async () => {
      if (!completingBooking || !profile) return;
      setIsSubmitting(true);
      
      try {
          const { error: bookingError } = await supabase
              .from('bookings')
              .update({ 
                  status: 'completed',
                  rating: rating,
                  review: review.trim()
              })
              .eq('id', completingBooking.id);
          
          if (bookingError) throw bookingError;

          if (completingBooking.task_id) {
              await supabase
                  .from('posted_tasks')
                  .update({ status: 'completed' })
                  .eq('id', completingBooking.task_id);
          }

          alert("Great! Job marked as completed.");
          setShowCompleteModal(false);
          fetchActivity();
      } catch (err: any) {
          alert("Failed to complete task: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const currentItems = activeTab === 'requests' ? bookings.filter(b => b.status === 'pending').concat(tasks.filter(t => t.status === 'open')) 
                     : activeTab === 'ongoing' ? bookings.filter(b => b.status === 'accepted').concat(tasks.filter(t => t.status === 'assigned'))
                     : bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).concat(tasks.filter(t => t.status === 'completed'));

  return (
    <div className="bg-white min-h-screen transition-colors duration-200">
      {/* Completion Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowCompleteModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><i className="fa-solid fa-xmark"></i></button>
                
                <div className="text-center">
                    <div className="w-16 h-16 bg-brand/10 text-brand rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl rotate-3"><i className="fa-solid fa-receipt"></i></div>
                    <h3 className="text-xl font-black text-gray-900">Payment & Completion</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Pay Worker Directly</p>
                </div>

                {/* Worker Bank Details Card */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Worker Bank</p>
                            <p className="text-sm font-black text-gray-900">{completingBooking?.profiles?.bank_name || 'Bank Not Set'}</p>
                        </div>
                        <i className="fa-solid fa-building-columns text-gray-200 text-xl"></i>
                    </div>

                    <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Number</p>
                        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-gray-100">
                            <p className="text-lg font-black text-gray-900 tracking-widest font-mono">{completingBooking?.profiles?.account_number || '----------'}</p>
                            {completingBooking?.profiles?.account_number && (
                                <button onClick={() => handleCopy(completingBooking.profiles.account_number)} className="text-brand p-2 active:scale-90 transition-transform">
                                    <i className="fa-regular fa-copy"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Name</p>
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-tight">{completingBooking?.profiles?.account_name || completingBooking?.profiles?.full_name}</p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-[9px] text-center text-gray-400 font-medium italic">
                            Verify the name on your banking app matches before sending.
                        </p>
                    </div>
                </div>

                <div className="space-y-6 pt-2">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-3">Rate {completingBooking?.profiles?.full_name.split(' ')[0]}'s Service</p>
                        <div className="flex justify-center gap-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)} className={`text-3xl transition-all active:scale-125 ${star <= rating ? 'text-yellow-400 drop-shadow-md' : 'text-gray-200'}`}>
                                    <i className="fa-solid fa-star"></i>
                                </button>
                            ))}
                        </div>
                    </div>

                    <textarea 
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="Write a quick review about the work..."
                        rows={2}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                    />

                    <button 
                        onClick={submitCompletion}
                        disabled={isSubmitting}
                        className="w-full bg-brand text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-brand/20 active:scale-95 transition-all"
                    >
                        {isSubmitting ? 'Processing...' : 'Confirm Payment & Complete'}
                    </button>
                </div>
            </div>
        </div>
      )}

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
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{item.profiles?.full_name || 'User'}</span>
                             {item.status === 'completed' && <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">Completed</span>}
                          </div>
                      </div>
                    </div>
                    {item.status === 'pending' && (
                        <div className="flex gap-3 w-full">
                            <button onClick={() => updateBookingStatus(item, 'cancelled')} className="flex-1 bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Decline</button>
                            <button onClick={() => updateBookingStatus(item, 'accepted')} className="flex-1 bg-brand text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Accept</button>
                        </div>
                    )}
                    {['accepted', 'assigned'].includes(item.status) && (
                        <div className="space-y-3">
                            {profile?.role === 'client' && (
                                <button 
                                    onClick={() => handleOpenCompleteModal(item)} 
                                    className="w-full bg-yellow-400 text-gray-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-circle-check"></i> Complete & Pay
                                </button>
                            )}
                            <button 
                                onClick={() => onOpenChat(profile?.role === 'client' ? (item.worker_id || item.assigned_worker_id) : item.client_id)} 
                                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                Open Chat
                            </button>
                        </div>
                    )}
                    {item.status === 'completed' && item.rating && (
                        <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex text-yellow-400 text-[10px] gap-0.5">
                                {Array(item.rating).fill(0).map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
                            </div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
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
