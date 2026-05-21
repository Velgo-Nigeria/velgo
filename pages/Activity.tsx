
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { getTierLimit } from '../lib/constants';

interface ActivityProps {
  profile: Profile | null;
  onOpenChat: (partnerId: string) => void;
  onUpgrade: () => void;
  onRefreshProfile: () => void;
  onViewTask: (id: string) => void;
  onViewWorker: (id: string) => void;
}

const Activity: React.FC<ActivityProps> = ({ profile, onOpenChat, onUpgrade, onRefreshProfile, onViewTask, onViewWorker }) => {
  const [viewMode, setViewMode] = useState<'working' | 'hiring'>('working');
  const [statusFilter, setStatusFilter] = useState<'requests' | 'ongoing' | 'history'>('requests');
  const [bookings, setBookings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Client Completion Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingBooking, setCompletingBooking] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Artisan-to-Client Review Reply State
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyingBooking, setReplyingBooking] = useState<any>(null);
  const [workerReplyText, setWorkerReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Worker-to-Client Rating Modal State
  const [showWorkerRatingModal, setShowWorkerRatingModal] = useState(false);
  const [ratingToClient, setRatingToClient] = useState(5);
  const [clientCommunicationRating, setClientCommunicationRating] = useState(5);
  const [clientFairnessRating, setClientFairnessRating] = useState(5);
  const [reviewToClient, setReviewToClient] = useState('');

  const fetchActivity = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    
    // Fetch Bookings (Direct hires or applications) where user is client OR worker
    const { data: bookingsData } = await safeFetch<any[]>(async () => 
      await supabase.from('bookings')
        .select(`
          *, 
          client:client_id(id, full_name, avatar_url),
          worker:worker_id(id, full_name, avatar_url, bank_name, account_number, account_name), 
          posted_tasks:task_id(title, description, budget)
        `)
        .or(`client_id.eq.${profile.id},worker_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
    );

    // Map profiles column back for compatibility with existing code
    const processedBookings = (bookingsData || []).map((b: any) => ({
      ...b,
      profiles: b.client_id === profile.id ? b.worker : b.client
    }));
    
    setBookings(processedBookings);
    
    // Fetch Tasks (Jobs posted by the user or assigned to the user)
    const { data: tasksData } = await safeFetch<any[]>(async () => 
      await supabase.from('posted_tasks')
        .select('*, profiles:assigned_worker_id(*)')
        .or(`client_id.eq.${profile.id},assigned_worker_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
    );

    setTasks(tasksData || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const updateBookingStatus = async (booking: any, newStatus: string) => {
    if (!profile) return;
    try {
        if (newStatus === 'accepted') {
            const { error } = await supabase.rpc('accept_booking_with_token', { 
                p_booking_id: booking.id, 
                p_user_id: profile.id 
            });
            if (error) {
                if (error.message.includes('INSUFFICIENT_TOKENS')) {
                    setShowUpgradeModal(true);
                    return;
                } else {
                    throw error;
                }
            }
        } else {
            const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id);
            if (error) throw error;
        }

        // Auto-assign Task if Client accepts Application
        if (newStatus === 'accepted' && booking.task_id && profile.id === booking.client_id) {
            const { error: taskError } = await supabase
                .from('posted_tasks')
                .update({ 
                    status: 'assigned',
                    assigned_worker_id: booking.worker_id 
                })
                .eq('id', booking.task_id);
            
            if (taskError) console.error("Failed to auto-assign task:", taskError.message);
        }

        if (newStatus === 'accepted' && onRefreshProfile) onRefreshProfile(); // Refresh profile to show deducted tokens

        if (newStatus === 'accepted') {
            const partnerId = profile.id === booking.client_id ? booking.worker_id : booking.client_id;
            const jobText = booking.posted_tasks?.title ? ` on '${booking.posted_tasks.title}'` : "";
            
            await supabase.from('messages').insert([{
                sender_id: profile.id,
                receiver_id: partnerId,
                content: `Hello! I have just accepted your request${jobText}.`
            }]);
        }
        
        fetchActivity();
    } catch (err: any) { alert("Action failed: " + err.message); }
  };

  const handleOpenCompleteModal = (item: any) => {
      setCompletingBooking(item);
      setRating(5);
      setCommunicationRating(5);
      setQualityRating(5);
      setPunctualityRating(5);
      setReview('');
      setShowCompleteModal(true);
  };

  const handleOpenWorkerRatingModal = (item: any) => {
      setCompletingBooking(item);
      setRatingToClient(5);
      setClientCommunicationRating(5);
      setClientFairnessRating(5);
      setReviewToClient('');
      setShowWorkerRatingModal(true);
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
                  worker_communication_rating: communicationRating,
                  worker_quality_rating: qualityRating,
                  worker_punctuality_rating: punctualityRating,
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

  const submitWorkerRating = async () => {
      if (!completingBooking || !profile) return;
      setIsSubmitting(true);
      
      try {
          const { error } = await supabase
              .from('bookings')
              .update({ 
                  client_rating: ratingToClient,
                  client_communication_rating: clientCommunicationRating,
                  client_fairness_rating: clientFairnessRating,
                  client_review: reviewToClient.trim()
              })
              .eq('id', completingBooking.id);
          
          if (error) throw error;

          alert("Feedback submitted! Thanks for helping keep the community safe.");
          setShowWorkerRatingModal(false);
          fetchActivity();
      } catch (err: any) {
          alert("Failed to submit rating: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleOpenArtisanReplyModal = (item: any) => {
      setReplyingBooking(item);
      setWorkerReplyText('');
      setShowReplyModal(true);
  };

  const submitArtisanReply = async () => {
      if (!replyingBooking || !profile) return;
      
      const textToSubmit = workerReplyText.trim();
      if (!textToSubmit) {
          alert("Please write your reply first.");
          return;
      }
      if (textToSubmit.length > 200) {
          alert("Your reply exceeds the 200 character cap constraint.");
          return;
      }

      // Proactive safety checks (Nigerian context, security checks, contact info)
      const phoneRegex = /(?:\+?234|0)[789][01]\d{8}/; 
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const bannedWords = ['fuck', 'bastard', 'bitch', 'idiot', 'fool', 'mad', 'mumu', 'scam', 'thief', 'ole', 'barawo', 'ashewo', 'oloribu', 'stupid', 'onu', 'oloriburuku'];

      if (phoneRegex.test(textToSubmit) || /\d{10,}/.test(textToSubmit)) {
          alert("Safety Filter: Adding phone numbers, bank accounts or numeric contact details in review replies is strictly prohibited for your physical safety and privacy. Please remove any contact numbers.");
          return;
      }
      if (emailRegex.test(textToSubmit)) {
          alert("Safety Filter: Including email addresses or websites is forbidden. Please communicate strictly inside the application.");
          return;
      }
      const lowerText = textToSubmit.toLowerCase();
      if (bannedWords.some(word => lowerText.includes(word))) {
          alert("Professionalism Filter: Your response contains terms that violate our community standards. Please rephrase your reply to maintain a polite, commercial, and professional tone.");
          return;
      }

      setIsSubmittingReply(true);
      try {
          const { error } = await supabase
              .from('bookings')
              .update({
                  worker_reply: textToSubmit,
                  worker_reply_at: new Date().toISOString(),
                  worker_reply_approved: false // Pending approval by default
              })
              .eq('id', replyingBooking.id);

          if (error) throw error;

          alert("Your reply was submitted successfully! It is now pending administrative review and will be live on your profile once approved.");
          setShowReplyModal(false);
          fetchActivity();
      } catch (err: any) {
          alert("Submission failed: " + err.message);
      } finally {
          setIsSubmittingReply(false);
      }
  };

  const handleItemClick = (item: any) => {
    // 1. Is it a raw Task Post? (Identified by having a budget but no worker_id in the item root)
    if (item.budget !== undefined && !item.worker_id) {
        onViewTask(item.id);
        return;
    }

    // 2. Is it a Booking linked to a Task?
    if (item.task_id) {
        onViewTask(item.task_id);
        return;
    }

    // 3. Is it a Direct Hire? (No task_id)
    if (profile?.id === item.client_id) {
        onViewWorker(item.worker_id);
    } else {
        onViewWorker(item.client_id);
    }
  };

  // Filter by viewMode first
  const viewBookings = viewMode === 'hiring' ? bookings.filter(b => b.client_id === profile?.id) : bookings.filter(b => b.worker_id === profile?.id);
  
  // Note: For tasks, if viewMode == 'hiring', tasks where user is client.
  // If viewMode == 'working', tasks where user is assigned_worker.
  const viewTasks = viewMode === 'hiring' ? tasks.filter(t => t.client_id === profile?.id) : tasks.filter(t => t.assigned_worker_id === profile?.id);

  const currentItems = statusFilter === 'requests' 
      ? viewBookings.filter(b => b.status === 'pending').concat(viewTasks.filter(t => t.status === 'open')) 
      : statusFilter === 'ongoing' 
      ? viewBookings.filter(b => b.status === 'accepted').concat(viewTasks.filter(t => t.status === 'assigned'))
      : viewBookings.filter(b => ['completed', 'cancelled', 'declined', 'disputed'].includes(b.status)).concat(viewTasks.filter(t => t.status === 'completed' || t.status === 'cancelled'));

  const hiringBadge = bookings.some(b => b.client_id === profile?.id && b.status === 'pending' && b.task_id != null);
  const workingBadge = bookings.some(b => b.worker_id === profile?.id && b.status === 'pending' && b.task_id == null);

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen transition-colors duration-200">
      {/* Artisan Review Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-hidden flex flex-col font-sans">
                <button onClick={() => setShowReplyModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>

                <div className="text-center shrink-0">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-3 text-xl">
                        <i className="fa-solid fa-reply"></i>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Artisan Reply</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">One-Time Response Vetting</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                    {/* Original Review Callout */}
                    <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 relative">
                        <p className="text-[8px] font-black tracking-widest uppercase text-gray-400 mb-1">Original Review left by Client</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{replyingBooking?.review || 'No written comment'}"</p>
                        <div className="flex text-yellow-400 text-[8px] gap-0.5 mt-2">
                            {Array(replyingBooking?.rating || 5).fill(0).map((_, idx) => <i key={idx} className="fa-solid fa-star"></i>)}
                        </div>
                    </div>

                    {/* Strict Compliance Warning Block */}
                    <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-4 rounded-3xl border border-amber-200 dark:border-amber-900/30 text-xs leading-relaxed space-y-1">
                        <p className="font-bold flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-amber-500 text-sm"></i> Strict Terms of Submission:</p>
                        <ul className="list-disc pl-4 space-y-1 mt-1 text-[10px] font-medium font-sans">
                            <li><strong>Strict One-Time Entry:</strong> Once submitted, your reply cannot be edited, changed, or deleted.</li>
                            <li><strong>Privacy Ban:</strong> Do not include phone numbers, location links, bank info, or specific account names.</li>
                            <li><strong>Professional Conduct:</strong> Professionalism is required. Slurs or insults are flagged automatically and deleted by moderators.</li>
                        </ul>
                    </div>

                    {/* Character limit controlled response box */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Proposed Reply text</label>
                        <div className="relative">
                            <textarea 
                                value={workerReplyText}
                                onChange={(e) => setWorkerReplyText(e.target.value.slice(0, 200))}
                                placeholder="Type your polite response to this rating..."
                                rows={4}
                                disabled={isSubmittingReply}
                                className="w-full bg-gray-50 dark:bg-gray-900/40 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 text-xs text-gray-800 dark:text-gray-200 font-sans leading-relaxed outline-none focus:border-emerald-500 resize-none"
                            />
                            <div className={`absolute bottom-3 right-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${200 - workerReplyText.length <= 15 ? 'bg-red-50 text-red-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                                {200 - workerReplyText.length} Chars Left
                            </div>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 flex gap-3 pt-2">
                    <button 
                        onClick={() => setShowReplyModal(false)}
                        disabled={isSubmittingReply}
                        className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-wider transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={submitArtisanReply}
                        disabled={isSubmittingReply || !workerReplyText.trim()}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                    >
                        {isSubmittingReply ? 'Submitting...' : 'Submit Response'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Client Completion & Rating Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-hidden">
                
                {/* Receipt Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <img 
                        src="https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png"
                        className="w-64 h-64 opacity-[0.03] grayscale pointer-events-none"
                        alt=""
                    />
                </div>

                <div className="relative z-10 overflow-y-auto max-h-[80vh]">
                    <button onClick={() => setShowCompleteModal(false)} className="absolute top-0 right-0 text-gray-400 hover:text-gray-900"><i className="fa-solid fa-xmark"></i></button>
                    
                    <div className="text-center">
                        <div className="w-16 h-16 bg-brand/10 text-brand rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl rotate-3"><i className="fa-solid fa-receipt"></i></div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">Payment & Completion</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Pay Worker Directly</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[32px] p-6 space-y-4 mt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Worker Bank</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white">{completingBooking?.profiles?.bank_name || 'Bank Not Set'}</p>
                            </div>
                            <i className="fa-solid fa-building-columns text-gray-200 dark:text-gray-700 text-xl"></i>
                        </div>

                        <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Number</p>
                            <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <p className="text-lg font-black text-gray-900 dark:text-white tracking-widest font-mono">{completingBooking?.profiles?.account_number || '----------'}</p>
                                {completingBooking?.profiles?.account_number && (
                                    <button onClick={() => handleCopy(completingBooking.profiles.account_number)} className="text-brand p-2 active:scale-90 transition-transform">
                                        <i className="fa-regular fa-copy"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Name</p>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">{completingBooking?.profiles?.account_name || completingBooking?.profiles?.full_name}</p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[9px] text-center text-gray-400 font-medium italic">
                                Verify the name on your banking app matches before sending.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-1">Overall Satisfaction</p>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setRating(star)} className={`text-2xl transition-all active:scale-125 ${star <= rating ? 'text-yellow-400 drop-shadow-md' : 'text-gray-200 dark:text-gray-700'}`}>
                                            <i className="fa-solid fa-star"></i>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Communication</p>
                                    <div className="flex justify-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setCommunicationRating(star)} className={`text-lg ${star <= communicationRating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Quality of Work</p>
                                    <div className="flex justify-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setQualityRating(star)} className={`text-lg ${star <= qualityRating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Punctuality (On Time)</p>
                                    <div className="flex justify-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setPunctualityRating(star)} className={`text-lg ${star <= punctualityRating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <textarea 
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Write a quick review about the work..."
                            rows={2}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl py-4 px-5 text-sm font-medium dark:text-white outline-none focus:ring-2 focus:ring-brand/20 resize-none"
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
        </div>
      )}

      {/* Worker Rating Client Modal */}
      {showWorkerRatingModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowWorkerRatingModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><i className="fa-solid fa-xmark"></i></button>
                
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl rotate-3"><i className="fa-solid fa-user-pen"></i></div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Rate the Client</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Your experience matters</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 space-y-4">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 text-center">How was working with {completingBooking?.profiles?.full_name}?</p>
                        
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-1">Overall Experience</p>
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setRatingToClient(star)} className={`text-2xl transition-all active:scale-125 ${star <= ratingToClient ? 'text-blue-500 drop-shadow-md' : 'text-gray-200 dark:text-gray-700'}`}>
                                        <i className="fa-solid fa-star"></i>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Communication</p>
                                <div className="flex justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setClientCommunicationRating(star)} className={`text-lg ${star <= clientCommunicationRating ? 'text-blue-500' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide text-center mb-1">Fairness/Respect</p>
                                <div className="flex justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setClientFairnessRating(star)} className={`text-lg ${star <= clientFairnessRating ? 'text-blue-500' : 'text-gray-200 dark:text-gray-700'}`}><i className="fa-solid fa-star"></i></button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <textarea 
                        value={reviewToClient}
                        onChange={(e) => setReviewToClient(e.target.value)}
                        placeholder="Was the client professional? Did they pay promptly?"
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl py-4 px-5 text-sm font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />

                    <button 
                        onClick={submitWorkerRating}
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
                    >
                        {isSubmitting ? 'Posting...' : 'Submit Feedback'}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="px-6 pt-10 pb-4 flex justify-between items-end sticky top-0 bg-white dark:bg-gray-900 z-20">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Gigs</h1>
      </div>

      <div className="px-6 sticky top-[72px] bg-white dark:bg-gray-900 z-10 pb-2">
        {/* Main Tabs: Hiring vs Working */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-[22px] border border-gray-200 dark:border-gray-700 relative">
            <button 
                onClick={() => { setViewMode('working'); setStatusFilter('requests'); }} 
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all relative ${viewMode === 'working' ? 'bg-white dark:bg-gray-700 text-brand shadow-lg' : 'text-gray-400 dark:text-gray-500'}`}
            >
                Working
                {workingBadge && <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </button>
            <button 
                onClick={() => { setViewMode('hiring'); setStatusFilter('requests'); }} 
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all relative ${viewMode === 'hiring' ? 'bg-white dark:bg-gray-700 text-brand shadow-lg' : 'text-gray-400 dark:text-gray-500'}`}
            >
                Hiring
                {hiringBadge && <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </button>
        </div>

        {/* Sub Filters: Requests, Ongoing, History */}
        <div className="flex gap-2 mt-4">
            {['requests', 'ongoing', 'history'].map(filter => (
                <button 
                    key={filter} 
                    onClick={() => setStatusFilter(filter as any)} 
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border outline-none ${statusFilter === filter ? 'bg-brand/10 border-brand/20 text-brand shadow-sm' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'}`}
                >
                    {filter}
                </button>
            ))}
        </div>
      </div>

      <div className="p-6 pb-24">
        {loading ? <div className="text-center py-20 animate-pulse text-[10px] font-black uppercase tracking-[5px] text-gray-300">Syncing Gigs...</div> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {currentItems.length > 0 ? currentItems.map(item => {
                // Logic to identify if item is an Open Task (no worker assigned yet)
                const isOpenTask = item.budget !== undefined && !item.worker_id; 

                const renderItemTypeLabel = () => {
                    if (statusFilter === 'history') {
                        return <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${item.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{item.status}</span>;
                    }
                    if (viewMode === 'hiring') {
                        if (isOpenTask) return <span className="text-[9px] font-black text-brand uppercase tracking-widest bg-brand/10 px-2 py-0.5 rounded-lg">Job Posted</span>;
                        if (item.task_id) return <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">Applicant</span>;
                        return <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-lg">Direct Request Sent</span>;
                    } else {
                        if (isOpenTask || (item.status === 'assigned' && item.title)) return <span className="text-[9px] font-black text-green-500 uppercase tracking-widest bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-lg">Assigned Job</span>;
                        if (item.task_id) return <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">Application Sent</span>;
                        return <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-lg">Direct Request Recv</span>;
                    }
                };
                
                return (
                <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    className="bg-white dark:bg-gray-800 p-6 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4 relative overflow-hidden transition-all hover:shadow-md group active:scale-[0.98] cursor-pointer"
                >
                    
                    {/* Gig Card Watermark */}
                    <img 
                        src="https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png"
                        className="absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.05] rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-500"
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />

                    {/* Interaction Hint */}
                    <div className="absolute top-4 right-4 text-gray-200 dark:text-gray-700 group-hover:text-brand transition-colors">
                        <i className="fa-solid fa-chevron-right text-xs"></i>
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-16 h-16 rounded-3xl border-2 border-white dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
                          {item.profiles?.avatar_url ? (
                              <img src={item.profiles.avatar_url} className="w-full h-full object-cover" loading="lazy" decoding="async"/>
                          ) : (isOpenTask || item.title) ? (
                              <i className="fa-solid fa-briefcase text-brand text-2xl"></i>
                          ) : (
                              <span className="font-black text-gray-300 dark:text-gray-600 text-xl">{(item.profiles?.full_name || item.title || 'U')[0]}</span>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="font-black text-gray-900 dark:text-white text-[15px] truncate tracking-tight">{item.title || item.posted_tasks?.title || 'Direct Request'}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                             {renderItemTypeLabel()}
                             {!isOpenTask && <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">{item.profiles?.full_name || 'User'}</span>}
                          </div>
                      </div>
                    </div>

                    {item.status === 'pending' && (
                        <div className="w-full relative z-10 mt-4">
                            {/* CASE 1: JOB APPLICATION (HAS TASK ID) */}
                            {item.task_id ? (
                                profile?.id === item.client_id ? (
                                    // Hiring View: Accept/Decline Worker's Application
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'cancelled'); }} 
                                            className="flex-1 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                                        >
                                            Decline
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'accepted'); }} 
                                            className="flex-1 bg-brand text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-brand-dark transition-colors"
                                        >
                                            Hire Worker
                                        </button>
                                    </div>
                                ) : (
                                    // Working View: Withdraw Application
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'cancelled'); }} 
                                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-colors"
                                    >
                                        Withdraw Application
                                    </button>
                                )
                            ) : (
                                /* CASE 2: DIRECT BOOKING (NO TASK ID) */
                                profile?.id === item.worker_id ? (
                                    // Working View: Accept/Decline Client's Request
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'cancelled'); }} 
                                            className="flex-1 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors"
                                        >
                                            Decline
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'accepted'); }} 
                                            className="flex-1 bg-brand text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-brand-dark transition-colors"
                                        >
                                            Accept Job
                                        </button>
                                    </div>
                                ) : (
                                    // Hiring View: Cancel Request
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'cancelled'); }} 
                                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-colors"
                                    >
                                        Cancel Request
                                    </button>
                                )
                            )}
                        </div>
                    )}

                    {['accepted', 'assigned'].includes(item.status) && (
                        <div className="space-y-3 relative z-10">
                            {profile?.id === item.client_id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenCompleteModal(item); }} 
                                    className="w-full bg-yellow-400 text-gray-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-circle-check"></i> Complete & Pay
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onOpenChat(profile?.id === item.client_id ? (item.worker_id || item.assigned_worker_id) : item.client_id); }} 
                                className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                Open Chat
                            </button>
                        </div>
                    )}

                    {item.status === 'completed' && (
                        <div className="space-y-4 relative z-10 font-sans">
                            {/* Display ratings if both provided */}
                            <div className="pt-2 border-t border-gray-50 dark:border-gray-700 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Worker Rating</span>
                                    {item.rating ? (
                                        <div className="flex text-yellow-400 text-[10px] gap-0.5">
                                            {Array(item.rating).fill(0).map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
                                        </div>
                                    ) : <span className="text-[9px] text-gray-300 italic font-bold">Pending</span>}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Client Rating (Your Rating)</span>
                                    {item.client_rating ? (
                                        <div className="flex text-blue-500 text-[10px] gap-0.5">
                                            {Array(item.client_rating).fill(0).map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
                                        </div>
                                    ) : <span className="text-[9px] text-gray-300 italic font-bold">Pending</span>}
                                </div>
                            </div>

                            {/* Display client's written review about this worker */}
                            {item.review && (
                                <div className="bg-gray-50 dark:bg-gray-950/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Feedback from Client</p>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{item.review}"</p>
                                </div>
                            )}

                            {/* Display existing artisan replies, or reply submission details */}
                            {profile?.id === item.worker_id && item.review && (
                                <div className="mt-1">
                                    {item.worker_reply ? (
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <i className="fa-solid fa-reply"></i> Your Reply
                                                </span>
                                                {item.worker_reply_approved ? (
                                                    <span className="text-[7px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-800/45 text-emerald-700 px-1.5 py-0.5 rounded">Live & Approved</span>
                                                ) : (
                                                    <span className="text-[7.5px] font-black uppercase tracking-widest bg-yellow-100 dark:bg-yellow-805 text-yellow-700 px-1.5 py-0.5 rounded animate-pulse">Pending Moderation</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-800 dark:text-gray-200">"{item.worker_reply}"</p>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenArtisanReplyModal(item); }}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/15 active:scale-95 transition-all"
                                        >
                                            <i className="fa-solid fa-reply mr-1"></i> Reply to Client Review
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Show Worker Feedback Button if missing */}
                            {profile?.id === item.worker_id && !item.client_rating && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenWorkerRatingModal(item); }}
                                    className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-blue-100 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                                >
                                    <i className="fa-solid fa-star-half-stroke mr-1"></i> Rate this Client
                                </button>
                            )}

                            <div className="flex justify-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-gray-400 text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <i className="fa-solid fa-cloud text-2xl"></i>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-xs font-bold mb-2">No Gigs in this tab</p>
                    
                    <p className="text-[11px] max-w-[250px] leading-relaxed">
                        Looking for work or need something done? Head over to the Home tab to browse available jobs, hire talent, or post a new task!
                    </p>
                </div>
            )}
          </div>
        }
        
        {/* Upgrade / Token Refill Modal */}
        {showUpgradeModal && (
            <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-6 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4">
                <i className="fa-solid fa-coins text-2xl"></i>
                </div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">Out of Tokens!</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                You need a Token to accept this job. Please buy a refill pack to continue.
                </p>
                <div className="pt-2 flex flex-col gap-3">
                <button 
                    onClick={() => { setShowUpgradeModal(false); onUpgrade(); }} 
                    className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-brand-dark active:scale-95 transition-all text-[11px]"
                >
                    Buy Tokens
                </button>
                <button 
                    onClick={() => setShowUpgradeModal(false)} 
                    className="w-full text-gray-400 py-3 font-black uppercase tracking-widest hover:text-gray-600 transition-colors text-[10px]"
                >
                    Cancel
                </button>
                </div>
            </div>
            </div>
        )}

      </div>
    </div>
  );
};
export default Activity;
