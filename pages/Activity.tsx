
import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { getTierLimit } from '../lib/constants';
import { openWhatsAppHelper } from '../lib/whatsapp';
import { ActivityItemCard } from "./activity/ActivityItemCard";
import { downloadJobReceipt, downloadAllHistoryPDF } from "./activity/exportUtils";

interface ActivityProps {
  profile: Profile | null;
  onOpenChat: (partnerId: string) => void;
  onUpgrade: () => void;
  onRefreshProfile: () => void;
  onViewTask: (id: string) => void;
  onViewWorker: (id: string) => void;
  onShowNotifications?: () => void;
  unreadCount?: number;
}

const Activity: React.FC<ActivityProps> = ({ profile, onOpenChat, onUpgrade, onRefreshProfile, onViewTask, onViewWorker, onShowNotifications, unreadCount }) => {
  const [viewMode, setViewMode] = useState<'working' | 'hiring'>('working');
  const [statusFilter, setStatusFilter] = useState<'requests' | 'ongoing' | 'history'>('requests');
  const [bookings, setBookings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manage client-side hidden or archived bookings/tasks without schema adjustments
  const [archivedBookingIds, setArchivedBookingIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('velgo_archived_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Redirect modal states
  
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineBookingItem, setDeclineBookingItem] = useState<any>(null);
  const [declineActionType, setDeclineActionType] = useState<'declined' | 'cancelled'>('declined');
  const [declineReason, setDeclineReason] = useState("");
  const [customDeclineReason, setCustomDeclineReason] = useState("");

  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectingPartnerName, setRedirectingPartnerName] = useState('');
  const [redirectingPhone, setRedirectingPhone] = useState('');
  const [redirectingMessage, setRedirectingMessage] = useState('');

  const handleConnectWhatsApp = (item: any) => {
    if (!profile) return;
    
    let partnerPhone = '';
    let partnerName = '';
    let jobTitle = item.title || item.posted_tasks?.title || 'our job';

    // 1. If it's a booking object (has worker_id)
    if (item.worker_id) {
      const isClient = profile.id === item.client_id;
      const partner = isClient ? item.worker : item.client;
      partnerPhone = partner?.phone_number || '';
      partnerName = partner?.full_name || 'User';
    } 
    // 2. If it's a task object
    else {
      const isClient = profile.id === item.client_id;
      const partner = isClient ? item.profiles : item.client; // profiles holds assigned_worker_id mapped as profiles
      partnerPhone = partner?.phone_number || '';
      partnerName = partner?.full_name || 'User';
    }

    if (!partnerPhone) {
      alert("We couldn't retrieve the partner's phone number. Please contact Support.");
      return;
    }

    const message = `Hello! I am contacting you regarding our contract for '${jobTitle}' on Velgo Nigeria.`;
    
    // Call unified global countdown redirector helper natively on both iOS and Android!
    openWhatsAppHelper(message, partnerPhone, partnerName);
  };

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
  const [showClientNudgeModal, setShowClientNudgeModal] = useState(false);
  const [nudgedClientName, setNudgedClientName] = useState('');

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
          client:client_id(id, full_name, email, phone_number, avatar_url),
          worker:worker_id(id, full_name, email, phone_number, avatar_url, bank_name, account_number, account_name), 
          posted_tasks:task_id(id, title, description, budget, budget_type, status, assigned_worker_id)
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
        .select('*, client:client_id(*), profiles:assigned_worker_id(*)')
        .or(`client_id.eq.${profile.id},assigned_worker_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
    );

    setTasks(tasksData || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const updateBookingStatus = async (booking: any, newStatus: string, bypassModal: boolean = false) => {
    if ((newStatus === 'declined' || newStatus === 'cancelled') && !bypassModal) {
        setDeclineBookingItem(booking);
        setDeclineActionType(newStatus);
        setDeclineReason("");
        setCustomDeclineReason("");
        setShowDeclineModal(true);
        return;
    }
    if (!profile) return;
    try {
        if (newStatus === 'accepted') {
            const { error } = await supabase.rpc('accept_booking_with_token', { 
                p_booking_id: booking.id, 
                p_user_id: profile.id 
            });
            if (error) {
                if (error.message.includes('INSUFFICIENT_TOKENS_CLIENT')) {
                    // 1. Double Channel Notification: Trigger Immediate Client In-App alert
                    await supabase.from('notifications').insert({
                        user_id: booking.client_id,
                        title: '⚠️ Urgent: Token Refuel Needed',
                        message: `An professional is ready to start your job "${booking.posted_tasks?.title || 'your request'}"! Please purchase a hiring token to unlock instant coordination.`,
                        type: 'alert'
                    });

                    // 2. Double Channel Notification: Trigger Immediate Admin In-App alerts
                    try {
                        const { data: admins } = await supabase.from('profiles').select('id').or('role.eq.admin,email.eq.admin.velgo@gmail.com');
                        if (admins && admins.length > 0) {
                            const adminNotifications = admins.map(admin => ({
                                user_id: admin.id,
                                title: '⚠️ Match Impediment: Client Out of Tokens',
                                message: `Professional tried to accept booking for task "${booking.posted_tasks?.title || 'a job'}", but Client has 0 tokens remaining. Match is on hold.`,
                                type: 'alert'
                            }));
                            await supabase.from('notifications').insert(adminNotifications);
                        }
                    } catch (adminErr) {
                        console.error("Failed to notify admins of token impediment:", adminErr);
                    }

                    setNudgedClientName(booking.client?.full_name || 'The Client');
                    setShowClientNudgeModal(true);
                    return;
                } else if (error.message.includes('INSUFFICIENT_TOKENS_WORKER') || error.message.includes('INSUFFICIENT_TOKENS')) {
                    setShowUpgradeModal(true);
                    return;
                } else {
                    throw error;
                }
            }
        } else {
            let updatePayload: any = { status: newStatus };
            if ((newStatus === 'declined' || newStatus === 'cancelled') && declineReason && declineBookingItem?.id === booking.id) {
                updatePayload.decline_reason = declineReason === "Other" ? ("Other: " + customDeclineReason) : declineReason;
            }
            let { error } = await supabase.from('bookings').update(updatePayload).eq('id', booking.id);
            
            // Fallback if decline_reason column doesn't exist yet
            if (error && error.message && error.message.includes('decline_reason')) {
                delete updatePayload.decline_reason;
                updatePayload.quote_notes = declineReason === "Other" ? ("Other: " + customDeclineReason) : declineReason;
                const fallbackRes = await supabase.from('bookings').update(updatePayload).eq('id', booking.id);
                error = fallbackRes.error;
            }
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

            // Auto-decline other applications for this job since one has been accepted
            let { error: declineError } = await supabase
                .from('bookings')
                .update({ 
                    status: 'declined',
                    decline_reason: 'The client has accepted another professional for this job.'
                })
                .eq('task_id', booking.task_id)
                .eq('status', 'pending');
                
            if (declineError && declineError.message && declineError.message.includes('decline_reason')) {
                const fallbackDecline = await supabase
                    .from('bookings')
                    .update({ 
                        status: 'declined',
                        quote_notes: 'The client has accepted another professional for this job.'
                    })
                    .eq('task_id', booking.task_id)
                    .eq('status', 'pending');
                declineError = fallbackDecline.error;
            }
            
            if (declineError) console.error("Failed to auto-decline others:", declineError.message);
        }

        if (newStatus === 'accepted' && onRefreshProfile) onRefreshProfile(); // Refresh profile to show deducted tokens

        if (newStatus === 'accepted') {
            // Trigger immediate direct-drive WhatsApp connection
            setTimeout(() => {
                handleConnectWhatsApp(booking);
            }, 400);
        }
        
        fetchActivity();
    } catch (err: any) { alert("Action failed: " + err.message); }
  };

  const handleDismissWorker = async (booking: any) => {
    if (!profile || !booking) return;

    const confirmDismiss = window.confirm(
      "Are you sure you want to dismiss this professional and re-open the task for applications? Other pending applicants will instantly become available again, and the hired worker will be removed from this task. Note: Your safety deposit token is not refundable."
    );
    if (!confirmDismiss) return;

    try {
        setLoading(true);

        // 1. Revert active booking back to 'cancelled' status
        const { error: bookingError } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', booking.id);
        
        if (bookingError) throw bookingError;

        // 2. Re-open the task and clear assigned_worker_id
        if (booking.task_id) {
            const { error: taskError } = await supabase
                .from('posted_tasks')
                .update({ 
                    status: 'open', 
                    assigned_worker_id: null 
                })
                .eq('id', booking.task_id);
            
            if (taskError) throw taskError;
        }

        alert("Artisan dismissed and job has been successfully re-opened for other applicants!");
        fetchActivity();
    } catch (err: any) {
        alert("Dismiss failed: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleArchiveBooking = (bookingId: string) => {
    const updated = [...archivedBookingIds, bookingId];
    setArchivedBookingIds(updated);
    localStorage.setItem('velgo_archived_bookings', JSON.stringify(updated));
    alert("Record successfully archived and removed from your active feeds.");
  };

  const handleStaleAction = async (booking: any, action: 'reopen' | 'failed' | 'archive') => {
    if (!profile || !booking) return;

    if (action === 'archive') {
      handleArchiveBooking(booking.id);
      return;
    }

    const confirmMsg = action === 'reopen'
      ? "Are you sure you want to dismiss this professional and re-open this task? This will cancel the booking and mark the task as open again for other candidates. Safety deposit tokens are not refundable."
      : booking.task_id
        ? "Are you sure you want to mark this task as FAILED? This will cancel the active booking and mark the job post as officially cancelled on Velgo."
        : "Are you sure you want to cancel this direct hire? This will cancel the active booking.";

    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);

      // 1. Revert active booking back to 'cancelled' status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);
      
      if (bookingError) throw bookingError;

      // 2. Re-open or Cancel the task
      if (booking.task_id) {
        const { error: taskError } = await supabase
          .from('posted_tasks')
          .update({ 
            status: action === 'reopen' ? 'open' : 'cancelled', 
            assigned_worker_id: null 
          })
          .eq('id', booking.task_id);
        
        if (taskError) throw taskError;
      }

      alert(action === 'reopen' 
        ? "Job successfully re-opened! Other candidates can now apply and you can select them."
        : booking.task_id
          ? "Project marked as failed and cancelled."
          : "Hire cancelled successfully."
      );
      fetchActivity();
    } catch (err: any) {
      alert("Action failed: " + err.message);
    } finally {
      setLoading(false);
    }
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

  // ============================================
  // PRIVACY MASKING & PDF INVOICE GENERATOR UTILS
  // ============================================
  const obfuscateEmail = (email?: string): string => {
    if (!email) return 'N/A';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  };

  const obfuscatePhone = (phone?: string): string => {
    if (!phone) return 'N/A';
    if (phone.length <= 6) return '****';
    return `${phone.substring(0, 4)}****${phone.slice(-2)}`;
  };

  const resolveItemDetails = (item: any) => {
    const isBooking = item.worker_id !== undefined;
    const isTask = !isBooking;

    const title = item.title || item.posted_tasks?.title || 'Direct Artisan Booking';

    const rawBudget = item.budget !== undefined ? item.budget : item.posted_tasks?.budget;
    const formattedBudget = rawBudget ? `NGN ${Number(rawBudget).toLocaleString()}` : 'Negotiated';

    let cpName = 'N/A';
    let cpEmail = 'N/A';
    let cpPhone = 'N/A';

    if (isBooking) {
      cpName = item.profiles?.full_name || 'N/A';
      cpEmail = item.profiles?.email || 'N/A';
      cpPhone = item.profiles?.phone_number || 'N/A';
    } else {
      if (viewMode === 'hiring') {
        cpName = item.profiles?.full_name || 'Unassigned / Open';
        cpEmail = item.profiles?.email || 'N/A';
        cpPhone = item.profiles?.phone_number || 'N/A';
      } else {
        cpName = item.client?.full_name || 'N/A';
        cpEmail = item.client?.email || 'N/A';
        cpPhone = item.client?.phone_number || 'N/A';
      }
    }

    const status = (item.status || 'N/A').toUpperCase();
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : 'N/A';

    return { title, rawBudget, formattedBudget, cpName, cpEmail, cpPhone, status, dateStr, isBooking };
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

              // Auto-decline all OTHER remaining pending bookings for that task
              const { error: declineError } = await supabase
                  .from('bookings')
                  .update({ 
                      status: 'declined',
                      quote_notes: 'Job successfully completed by another professional.'
                  })
                  .eq('task_id', completingBooking.task_id)
                  .eq('status', 'pending');
              
              if (declineError) {
                  console.error("Failed to auto-decline other applications on completion:", declineError.message);
              }
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


  const confirmUpdateBookingStatus = () => {
    if (declineBookingItem && declineActionType) {
        updateBookingStatus(declineBookingItem, declineActionType, true);
        setShowDeclineModal(false);
        setCustomDeclineReason("");
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
        // If client is viewing applications for their task, go to worker profile
        if (profile?.id === item.client_id) {
            onViewWorker(item.worker_id);
        } else {
            // Worker viewing their application goes to task details
            onViewTask(item.task_id);
        }
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

  const currentItems = (statusFilter === 'requests' 
      ? viewBookings.filter(b => {
          if (b.status !== 'pending') return false;
          // Hide pending candidates from client's requests tab if another worker was already accepted/hired
          if (viewMode === 'hiring' && b.task_id && b.posted_tasks?.status && b.posted_tasks?.status !== 'open') {
              return false;
          }
          return true;
        }).concat(viewTasks.filter(t => t.status === 'open')) 
      : statusFilter === 'ongoing' 
      ? viewBookings.filter(b => b.status === 'accepted').concat(viewTasks.filter(t => t.status === 'assigned'))
      : viewBookings.filter(b => ['completed', 'cancelled', 'declined', 'disputed'].includes(b.status)).concat(viewTasks.filter(t => t.status === 'completed' || t.status === 'cancelled'))
  ).filter(item => !archivedBookingIds.includes(item.id));

  const hiringRequestsBadge = bookings.some(b => b.client_id === profile?.id && b.status === 'pending' && b.task_id != null);
  const hiringOngoingBadge = bookings.some(b => b.client_id === profile?.id && b.status === 'accepted') || tasks.some(t => t.client_id === profile?.id && t.status === 'assigned');
  const hiringHistoryBadge = bookings.some(b => b.client_id === profile?.id && b.status === 'completed' && !b.rating);
  const hiringBadge = hiringRequestsBadge || hiringOngoingBadge || hiringHistoryBadge;

  const workingRequestsBadge = bookings.some(b => b.worker_id === profile?.id && b.status === 'pending' && b.task_id == null);
  const workingOngoingBadge = bookings.some(b => b.worker_id === profile?.id && b.status === 'accepted') || tasks.some(t => t.assigned_worker_id === profile?.id && t.status === 'assigned');
  const workingHistoryBadge = bookings.some(b => b.worker_id === profile?.id && b.status === 'completed' && !b.client_rating);
  const workingBadge = workingRequestsBadge || workingOngoingBadge || workingHistoryBadge;

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen transition-colors duration-200">
      {/* Artisan Review Reply Modal */}
      
      {/* Decline/Cancel Reason Modal */}
      {showDeclineModal && declineBookingItem && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-hidden flex flex-col font-sans">
                <button onClick={() => { setShowDeclineModal(false); setCustomDeclineReason(""); }} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-circle-exclamation text-2xl text-red-600 dark:text-red-400"></i>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                        {declineActionType === 'declined' ? 'Decline Request' : 'Cancel Request'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please provide a reason. This helps keep the platform transparent.
                    </p>
                </div>
                
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 block">Select Reason</label>
                    <select 
                        value={declineReason} 
                        onChange={(e) => setDeclineReason(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none"
                    >
                        <option value="">-- Select a reason --</option>
                        {profile?.id === declineBookingItem.client_id ? (
                            declineActionType === 'declined' ? (
                                <>
                                    <option value="1. I have hired someone else for this job.">1. I have hired someone else.</option>
                                    <option value="2. Your price is higher than my budget.">2. Your price is higher than my budget.</option>
                                    <option value="3. Our timing or schedules do not match.">3. Our timing or schedules do not match.</option>
                                    <option value="4. Your skills don't perfectly match what I need right now.">4. Skills don't perfectly match.</option>
                                </>
                            ) : (
                                <>
                                    <option value="1. I don't need this service anymore.">1. I don't need this service anymore.</option>
                                    <option value="2. I made a mistake while creating this request.">2. Made a mistake creating request.</option>
                                    <option value="3. I found a worker outside this app.">3. Found a worker outside this app.</option>
                                </>
                            )
                        ) : (
                            declineActionType === 'declined' ? (
                                <>
                                    <option value="1. I am fully booked and too busy right now.">1. I am fully booked and busy.</option>
                                    <option value="2. This job is outside what I normally do.">2. Job is outside what I normally do.</option>
                                    <option value="3. The job location is too far for me.">3. The job location is too far.</option>
                                    <option value="4. The pay offered is too small for this work.">4. The pay offered is too small.</option>
                                </>
                            ) : (
                                <>
                                    <option value="1. I am no longer free to do this job.">1. I am no longer free to do this job.</option>
                                    <option value="2. I applied for this job by mistake.">2. I applied for this job by mistake.</option>
                                </>
                            )
                        )}
                        <option value="Other">Custom Reason (Please specify)</option>
                    </select>
                </div>

                {declineReason === 'Other' && (
                    <div>
                        <textarea
                            placeholder="Please specify (optional)"
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-white outline-none resize-none h-20 focus:ring-2 focus:ring-brand focus:border-brand"
                            value={customDeclineReason}
                            onChange={(e) => setCustomDeclineReason(e.target.value)}
                        ></textarea>
                    </div>
                )}

                <button 
                    onClick={confirmUpdateBookingStatus}
                    disabled={!declineReason || (declineReason === "Other" && !customDeclineReason.trim())}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                    Confirm {declineActionType === 'declined' ? 'Decline' : 'Cancel'}
                </button>
            </div>
        </div>
      )}

      {showReplyModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-hidden flex flex-col font-sans">
                <button onClick={() => setShowReplyModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white dark:hover:text-white transition-colors">
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
                    <button onClick={() => setShowCompleteModal(false)} className="absolute top-0 right-0 text-gray-400 hover:text-gray-900 dark:hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                    
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
                <button onClick={() => setShowWorkerRatingModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                
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

      <div className="px-6 pt-10 pb-4 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-20 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Activities</h1>
        {onShowNotifications && (
          <button 
            onClick={onShowNotifications} 
            className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white relative hover:scale-105 transition-transform"
          >
            <i className="fa-solid fa-bell"></i>
            {unreadCount !== undefined && unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 bg-brand text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            ) : null}
          </button>
        )}
      </div>

      {profile && (profile.tokens !== undefined ? profile.tokens : 0) <= 1 && bookings.some(b => b.status === 'pending') && (
        <div className="mx-6 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-[24px] p-4.5 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-triangle-exclamation text-lg"></i>
            </div>
            <div>
              <p className="font-black uppercase tracking-wider text-xs text-amber-600 dark:text-amber-400">
                Hiring Impediment Warning
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300 font-bold leading-relaxed mt-0.5">
                ⚠️ You have active hiring offers pending! Refuel tokens to avoid losing your candidate.
              </p>
            </div>
          </div>
          <button 
            onClick={onUpgrade}
            className="bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white font-black uppercase tracking-wider text-[9px] py-2 px-3.5 rounded-xl shrink-0"
          >
            Refuel Tokens
          </button>
        </div>
      )}

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
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border outline-none relative ${statusFilter === filter ? 'bg-brand/10 border-brand/20 text-brand shadow-sm' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'}`}
                >
                    {filter}
                    {filter === 'requests' && (viewMode === 'hiring' ? hiringRequestsBadge : workingRequestsBadge) && (
                        <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                    {filter === 'ongoing' && (viewMode === 'hiring' ? hiringOngoingBadge : workingOngoingBadge) && (
                        <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                    {filter === 'history' && (viewMode === 'hiring' ? hiringHistoryBadge : workingHistoryBadge) && (
                        <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                </button>
            ))}
        </div>
      </div>

      <div className="p-6 pb-24">
        {statusFilter === 'history' && !loading && currentItems.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-5 rounded-[30px] flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 relative z-10 font-sans">
              <div className="text-center sm:text-left">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 justify-center sm:justify-start">
                     <i className="fa-solid fa-list-check text-rose-500 text-sm"></i>
                     <span>Consolidated History Report</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Download full ledger log of your completed & archived service records.</p>
              </div>
              <button 
                  onClick={() => downloadAllHistoryPDF(currentItems, profile, viewMode)}
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/10 transition-all flex items-center justify-center gap-1.5 shrink-0 outline-none"
                  title="Export complete history records in one Landscape PDF report"
              >
                  <i className="fa-solid fa-file-pdf text-xs"></i>
                  <span>Export All History (PDF)</span>
              </button>
          </div>
        )}

        {loading ? <div className="text-center py-20 animate-pulse text-[10px] font-black uppercase tracking-[5px] text-gray-300">Syncing Activities...</div> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {currentItems.length > 0 ? currentItems.map(item => <ActivityItemCard
              key={item.id}
              item={item}
              statusFilter={statusFilter}
              viewMode={viewMode}
              profile={profile}
              handleItemClick={handleItemClick}
              loading={loading}
              handleStaleAction={handleStaleAction}
              handleArchiveBooking={handleArchiveBooking}
              updateBookingStatus={updateBookingStatus}
              handleOpenCompleteModal={handleOpenCompleteModal}
              handleDismissWorker={handleDismissWorker}
              handleConnectWhatsApp={handleConnectWhatsApp}
              rating={rating}
              review={review}
              handleOpenArtisanReplyModal={handleOpenArtisanReplyModal}
              handleOpenWorkerRatingModal={handleOpenWorkerRatingModal}
              downloadJobReceipt={(item) => downloadJobReceipt(item, profile)}
            />) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-gray-400 text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <i className="fa-solid fa-cloud text-2xl"></i>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-xs font-bold mb-2">No activities in this tab</p>
                    
                    <p className="text-[11px] max-w-[250px] leading-relaxed">
                        Looking for work or need something done? Head over to the Home tab to browse job offers, hire a worker, or post a job!
                    </p>
                </div>
            )}
          </div>
        }
        
        {/* Upgrade / Token Refill Modal */}
        {showUpgradeModal && (
            <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-6 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4">
                <i className="fa-solid fa-coins text-2xl"></i>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Out of Tokens!</h3>
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

        {/* Nudge Client Modal */}
        {showClientNudgeModal && (
            <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-6 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl space-y-4">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 mb-4 animate-bounce">
                <i className="fa-solid fa-paper-plane text-2xl"></i>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Client Nudge Alert!</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    This client ({nudgedClientName}) needs to replenish their hiring tokens to complete the match. We’ve sent them an instant nudge! Once they top up, this job is yours.
                </p>
                <div className="pt-2 flex flex-col gap-3">
                <button 
                    onClick={() => setShowClientNudgeModal(false)} 
                    className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-brand-dark active:scale-95 transition-all text-[11px]"
                >
                    Acknowledge
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
