
import React, { useState, useEffect } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile, PostedTask } from '../types';
import { getTierLimit } from '../lib/constants';
import { GoogleGenAI } from "@google/genai";
import { VerificationBadge } from '../components/VerificationBadge';
import { isBookmarked, toggleBookmark } from '../lib/bookmarkService';
import { openWhatsAppHelper } from '../lib/whatsapp';
import { ShareModal } from '../components/ShareModal';

interface TaskDetailProps { 
  profile: Profile | null; 
  taskId: string; 
  onBack: () => void; 
  onUpgrade: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ profile, taskId, onBack, onUpgrade }) => {
  const [task, setTask] = useState<PostedTask | null>(null);
  const [client, setClient] = useState<Profile | null>(null);
  const [clientRating, setClientRating] = useState<{avg: number, count: number} | null>(null);
  const [clientReviews, setClientReviews] = useState<any[]>([]); // New state for reviews
  
  const [hasApplied, setHasApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  
  // Translation State
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  
  // Modals
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Proposal Bid Quote Modal States
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [useClientBudget, setUseClientBudget] = useState(true);
  const [bidPrice, setBidPrice] = useState('');
  const [coversLabor, setCoversLabor] = useState(true);
  const [coversMaterials, setCoversMaterials] = useState(false);
  const [coversTransport, setCoversTransport] = useState(false);
  const [coversOther, setCoversOther] = useState(false);
  const [bidNotes, setBidNotes] = useState('');

  // Job Post Reporting system states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('Fake Job');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportEvidenceFile, setReportEvidenceFile] = useState<File | null>(null);
  const [reportEvidencePreview, setReportEvidencePreview] = useState<string | null>(null);

  const handleReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReportEvidenceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportEvidencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !task) return;
    if (!reportDetails.trim()) {
      alert("Please supply details describing the issue with this job post.");
      return;
    }

    try {
      setSubmittingReport(true);

      let finalEvidenceUrl = '';
      if (reportEvidenceFile) {
        const fileExt = reportEvidenceFile.name.split('.').pop();
        const fileName = `safety-evidence-${profile.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('verifications')
          .upload(fileName, reportEvidenceFile);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('verifications')
            .getPublicUrl(fileName);
          finalEvidenceUrl = publicUrl;
        } else {
          console.error("Evidence upload failed:", uploadError);
        }
      }

      const richDetails = `
INCIDENT TYPE: ${reportCategory.toUpperCase()} (JOB FLAG)
TARGET TASK: ${task.title} (${task.id})
POSTED BY PROFILES_ID: ${task.client_id || 'N/A'}
REPORTER CONTENT: ${reportDetails}
EVIDENCE ATTACHED: ${reportEvidenceFile ? 'Yes' : 'No'}
${finalEvidenceUrl ? `EVIDENCE LINK: ${finalEvidenceUrl}` : ''}

-- REPORTER DATA --
Name: ${profile.full_name}
Email: ${profile.email || 'N/A'}
Phone: ${profile.phone_number}
UID: ${profile.id}
      `.trim();

      // Dual-channel sync with WhatsApp for immediate action
      const waMsg = `🚨 VELGO JOB FLAG REPORT 🚨\n\nIncident Type: ${reportCategory.toUpperCase()}\nTarget Job: ${task.title}\nReporter Name: ${profile.full_name}\n\nREASON:\n${reportDetails}`;
      try {
        openWhatsAppHelper(waMsg);
      } catch (err) {
        console.warn("WhatsApp intent skipped:", err);
      }

      const insertPayload: any = {
        reporter_id: profile.id,
        reported_user_id: task.client_id || null,
        related_task_id: task.id,
        type: reportCategory,
        details: richDetails,
        status: 'pending',
        evidence_url: finalEvidenceUrl || null
      };

      const { error } = await supabase.from('safety_reports').insert([insertPayload]);
      if (error) {
        console.warn("Retrying insert without new target relations in case schema update is lagging:", error.message);
        delete insertPayload.reported_user_id;
        delete insertPayload.related_task_id;
        const retryResult = await supabase.from('safety_reports').insert([insertPayload]);
        if (retryResult.error) throw retryResult.error;
      }

      alert(`Job reported successfully. The Velgo compliance team has been alerted and is auditing: "${task.title}". We appreciate your commitment to keeping our platform safe.`);
      setShowReportModal(false);
      setReportDetails('');
      setReportEvidenceFile(null);
      setReportEvidencePreview(null);
    } catch (err: any) {
      alert("Failed to lodge complaint: " + err.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  useEffect(() => {
    const fetchTaskDetails = async () => {
      setLoading(true);
      
      const { data: taskData } = await safeFetch<PostedTask>(async () => 
        await supabase.from('posted_tasks').select('*').eq('id', taskId).single() as any
      );

      if (taskData) {
        setTask(taskData);
        
        if (taskData.client_id) {
            const { data: clientData } = await safeFetch<Profile>(async () => 
                await supabase.from('profiles').select('*').eq('id', taskData.client_id).single() as any
            );
            setClient(clientData);

            // Fetch Client Ratings (Worker rating Client -> 'client_rating' column)
            const { data: ratingData } = await supabase.from('bookings')
                .select('client_rating')
                .eq('client_id', taskData.client_id)
                .not('client_rating', 'is', null);
            
            if (ratingData && ratingData.length > 0) {
                const total = ratingData.reduce((acc, curr) => acc + (curr.client_rating || 0), 0);
                setClientRating({
                    avg: parseFloat((total / ratingData.length).toFixed(1)),
                    count: ratingData.length
                });
            }

            // Fetch Written Reviews about Client (from Workers)
            const { data: reviewsData } = await supabase.from('bookings')
                .select('client_review, client_rating, created_at, profiles:worker_id(full_name, avatar_url)')
                .eq('client_id', taskData.client_id)
                .not('client_review', 'is', null)
                .neq('client_review', '') // Ensure not empty
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (reviewsData) setClientReviews(reviewsData);
        }

        if (profile) {
            const { data: booking } = await supabase.from('bookings')
                .select('id')
                .eq('task_id', taskId)
                .eq('worker_id', profile.id)
                .maybeSingle();
            if (booking) setHasApplied(true);
            
            isBookmarked(profile.id, taskId, 'job').then(setBookmarked);
        }
      }
      setLoading(false);
    };

    fetchTaskDetails();
  }, [taskId, profile]);

  const handleApply = async () => {
      if (!profile || !task) return;
      
      if (!profile.is_verified) {
          alert("Verification Required: To secure our marketplace and eliminate fake applicants, Velgo requires you to verify your identity before applying. Please go to your Profile and upload your NIN.");
          return;
      }
      
      setApplying(true);
      
      const parsedPrice = useClientBudget ? task.budget : Number(bidPrice);
      
      let insertPayload: any = {
          task_id: task.id,
          client_id: task.client_id,
          worker_id: profile.id,
          status: 'pending',
          quote_price: parsedPrice,
          quote_covers_labor: coversLabor,
          quote_covers_materials: coversMaterials,
          quote_covers_transport: coversTransport,
          quote_covers_other: coversOther,
          quote_notes: bidNotes || null
      };

      let { error } = await supabase.from('bookings').insert(insertPayload);

      // Robust database protection: If the remote Supabase database columns have not been run/synced,
      // it returns code '42703' (undefined_column). In that case, we fall back to a simple application insert
      // so there is ZERO downtime or friction for the artisan.
      if (error && error.code === '42703') {
          console.warn("Custom quote columns are missing in database, falling back to clean simple booking insert.", error);
          const fallbackQuery = await supabase.from('bookings').insert({
              task_id: task.id,
              client_id: task.client_id,
              worker_id: profile.id,
              status: 'pending'
          });
          error = fallbackQuery.error;
          
          if (!error) {
              setHasApplied(true);
              setApplying(false);
              setShowProposalModal(false);
              alert("Application Sent! Note: Your detailed quote price and breakdowns were omitted as database schema configuration is pending admin execution.");
              return;
          }
      }

      if (error) {
          alert("Failed to apply: " + error.message);
          setApplying(false);
      } else {
          setHasApplied(true);
          setApplying(false);
          setShowProposalModal(false);
          alert("Application Sent! The client will review your detailed quote breakdown.");
      }
  };

  const handleDelete = async () => {
    if (!task) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this job? This action cannot be undone.");
    if (!confirmDelete) return;

    setDeleting(true);

    const { data, error } = await supabase.from('posted_tasks').delete().eq('id', task.id).select();

    if (error) {
        alert("Failed to delete: " + error.message);
        setDeleting(false);
    } else if (!data || data.length === 0) {
        alert("Failed to delete: Permission denied or task not found. Make sure you are the owner.");
        setDeleting(false);
    } else {
        alert("Job deleted successfully.");
        onBack();
    }
  };
  
  const handleTranslate = async () => {
      if (!task?.description) return;
      setTranslating(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Translate this English text to Nigerian Pidgin English clearly. Keep it short: "${task.description}"`;
          const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
          if (response.text) setTranslation(response.text.trim());
      } catch (err) {
          console.error(err);
          alert("Translation failed. Please check API Key.");
      } finally {
          setTranslating(false);
      }
  };

  const handleShare = () => {
    if (!task) return;
    setIsShareModalOpen(true);
  };

  const handleToggleBookmark = async () => {
    if (!profile) {
      alert("Please log in to save to your bookmarks!");
      return;
    }
    const result = await toggleBookmark(profile.id, taskId, 'job');
    setBookmarked(result);
  };

  const ReviewsModal = () => (
      <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center sm:p-6 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white dark:bg-gray-800 rounded-t-[32px] sm:rounded-[32px] p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white dark:text-white">Reviews on {client?.full_name}</h3>
                <button onClick={() => setShowReviewsModal(false)} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300"><i className="fa-solid fa-xmark"></i></button>
            </div>

            {/* Client Detailed Client Performance */}
            {(client?.client_rating_count || 0) > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-[20px] p-4 space-y-3 mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Client Reputation</h4>
                    <div className="space-y-2">
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase">Communication</span>
                                <span className="text-[10px] font-black text-gray-900 dark:text-white dark:text-gray-100">{client?.client_avg_communication || (clientRating?.avg || 5)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${((client?.client_avg_communication || (clientRating?.avg || 5)) / 5) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase">Fairness/Respect</span>
                                <span className="text-[10px] font-black text-gray-900 dark:text-white dark:text-gray-100">{client?.client_avg_fairness || (clientRating?.avg || 5)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${((client?.client_avg_fairness || (clientRating?.avg || 5)) / 5) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {clientReviews.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs italic">No reviews yet.</div>
            ) : (
                clientReviews.map((r, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-2">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                                    {r.profiles?.avatar_url ? <img src={r.profiles.avatar_url} className="w-full h-full object-cover"/> : <i className="fa-solid fa-user text-gray-400 text-xs p-1"></i>}
                                </div>
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{r.profiles?.full_name || 'Worker'}</span>
                            </div>
                            <div className="flex text-yellow-400 text-[10px] gap-0.5">
                                {Array(Math.round(r.client_rating || 5)).fill(0).map((_, idx) => <i key={idx} className="fa-solid fa-star"></i>)}
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">"{r.client_review}"</p>
                        <p className="text-[9px] text-gray-400 font-bold mt-2 text-right">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                ))
            )}
        </div>
      </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
    </div>
  );

  if (!task) return (
    <div className="p-10 text-center min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl font-black">
            <i className="fa-solid fa-triangle-exclamation animate-bounce"></i>
        </div>
        <div className="space-y-2">
            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">Job Post Offline</h2>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">This job posting might have been completed, filled by another artisan, or deleted by the client.</p>
        </div>
        <button onClick={onBack} className="px-6 py-3 bg-brand text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-transform">
            Go to Marketplace
        </button>
    </div>
  );

  const isOwner = profile?.id === task.client_id;

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pb-24 relative">
      {showReviewsModal && <ReviewsModal />}
      
      {/* Header / Map Placeholder */}
      <div className="relative h-[35vh] bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
            {task.image_url ? (
               <img src={task.image_url} className="w-full h-full object-cover opacity-80" />
            ) : (
               <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            )}
        </div>
        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
            <button onClick={onBack} className="bg-white/20 backdrop-blur-xl text-white w-10 h-10 flex items-center justify-center rounded-2xl active:scale-95 transition-transform">
                <i className="fa-solid fa-chevron-left"></i>
            </button>
            <div className="flex items-center gap-3">
                <button onClick={handleToggleBookmark} className={`bg-white/20 backdrop-blur-xl text-white w-10 h-10 flex items-center justify-center rounded-2xl active:scale-95 transition-transform ${bookmarked ? 'text-red-500' : ''}`} title="Bookmark Job">
                    {bookmarked ? (
                        <i className="fa-solid fa-heart text-rose-500"></i>
                    ) : (
                        <i className="fa-regular fa-heart"></i>
                    )}
                </button>
                <button onClick={handleShare} className="bg-white/20 backdrop-blur-xl text-white w-10 h-10 flex items-center justify-center rounded-2xl active:scale-95 transition-transform" title="Share Job">
                    <i className="fa-solid fa-share-nodes"></i>
                </button>
                {profile && !isOwner && (
                    <button 
                        onClick={() => {
                            setReportCategory('Fake Job');
                            setShowReportModal(true);
                        }} 
                        className="bg-white/20 hover:bg-red-655/40 hover:text-red-300 backdrop-blur-xl text-white w-10 h-10 flex items-center justify-center rounded-2xl active:scale-95 transition-colors" 
                        title="Report job post"
                    >
                        <i className="fa-regular fa-flag"></i>
                    </button>
                )}
            </div>
        </div>
        
        <div className="absolute bottom-6 left-6 right-6 text-white z-20">
            <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${task.urgency === 'emergency' ? 'bg-red-500' : 'bg-brand'}`}>
                    {task.urgency}
                </span>
                {task.due_date && (
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-900 border border-gray-700/50 flex items-center gap-1 text-gray-200">
                        <i className="fa-regular fa-calendar"></i> Due: {new Date(task.due_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                )}
            </div>
            <h1 className="text-3xl font-black mt-3 leading-tight shadow-sm drop-shadow-md">{task.title}</h1>
            <div className="flex items-center gap-3 mt-2 opacity-90 text-sm font-bold flex-wrap">
                <span className="flex items-center gap-1.5 shrink-0"><i className="fa-solid fa-location-dot text-brand-light"></i> {task.address ? `${task.address}, ${task.location}` : task.location}</span>
            </div>
        </div>
        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
      </div>

      <div className="px-6 -mt-6 relative z-10">
        <div className="bg-white dark:bg-gray-900 rounded-t-[32px] p-6 shadow-xl border-t border-gray-100 min-h-[60vh] space-y-8">
            
            {/* Budget & Category */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget</p>
                    <p className="text-2xl font-black text-brand">
                      {task.budget_type === 'negotiable' ? (
                        "Negotiable"
                      ) : (
                        <>₦{(task.budget || 0).toLocaleString()}{task.budget_type && task.budget_type !== 'fixed' ? <span className="text-sm text-gray-500 font-bold ml-1">/{task.budget_type === 'daily' ? 'day' : task.budget_type === 'weekly' ? 'wk' : 'mo'}</span> : ''}</>
                      )}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</p>
                    <p className="text-sm font-bold text-gray-800">{task.category}</p>
                </div>
            </div>

            {/* Client Info */}
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                <img src={client?.avatar_url || `https://ui-avatars.com/api/?name=${client?.full_name || 'User'}`} className="w-12 h-12 rounded-xl border border-white shadow-sm" />
                <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Posted By</p>
                    <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{client?.full_name || 'Valued Client'}</h3>
                    {clientRating ? (
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                                <i className="fa-solid fa-star text-yellow-400 text-[10px]"></i>
                                <span className="text-[10px] font-black text-gray-700">{clientRating.avg}</span>
                                <span className="text-[9px] text-gray-400 font-bold">({clientRating.count})</span>
                            </div>
                            <button onClick={() => setShowReviewsModal(true)} className="text-[9px] font-bold text-blue-600 underline decoration-blue-200">See Reviews</button>
                        </div>
                    ) : (
                        <span className="text-[9px] text-gray-400 font-bold">No ratings yet</span>
                    )}
                    
                    {/* Flag option trigger directly below profile reputation */}
                    {profile && !isOwner && (
                        <button 
                            type="button"
                            onClick={() => {
                                setReportCategory('Fake Job');
                                setShowReportModal(true);
                            }}
                            className="mt-1.5 flex items-center gap-1 text-[9px] font-black uppercase text-red-500 hover:text-red-755 hover:underline transition-all"
                        >
                            <i className="fa-solid fa-triangle-exclamation"></i> Flag this Job Post or Report Job Post
                        </button>
                    )}
                </div>
                {client?.is_verified && <VerificationBadge className="text-blue-500" />}
            </div>

            {/* Description */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">Task Details</h3>
                    {!translation && (
                        <button onClick={handleTranslate} disabled={translating} className="text-[9px] font-black text-brand uppercase flex items-center gap-1">
                            <i className={`fa-solid fa-language ${translating ? 'animate-spin' : ''}`}></i> {translating ? 'Translating...' : 'Pidgin Translation'}
                        </button>
                    )}
                </div>
                <p className="text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                    {translation || task.description}
                </p>
                {translation && <p className="text-[9px] text-gray-400 font-bold uppercase mt-2 italic text-right">Translated by AI</p>}
            </div>

            {/* Action Area */}
            {!isOwner ? (
                <div className="pt-4 space-y-4">
                    {profile && !profile.is_verified && (
                        <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/30 p-5 rounded-[24px] flex items-start gap-4">
                            <div className="w-10 h-10 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0 text-lg">
                                <i className="fa-solid fa-user-shield animate-pulse"></i>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 font-sans">Verification Required to Apply</h4>
                                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold leading-relaxed mt-1">
                                    To eliminate fake applicants and protect our clients, Velgo requires workers to verify their identity before applying to any posted jobs.
                                </p>
                                <p className="text-[9px] text-[#b45309] dark:text-amber-500 font-black uppercase tracking-widest mt-2">
                                   👉 Go to your Profile tab to upload your NIN card.
                                </p>
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={() => {
                            if (!profile) return;
                            if (!profile.is_verified) {
                                alert("Verification Required: To secure our marketplace and eliminate fake applicants, Velgo requires you to verify your identity before applying. Please go to your Profile and upload your NIN.");
                                return;
                            }
                            setBidPrice(task ? task.budget.toString() : '');
                            setUseClientBudget(true);
                            setCoversLabor(true);
                            setCoversMaterials(false);
                            setCoversTransport(false);
                            setCoversOther(false);
                            setBidNotes('');
                            setShowProposalModal(true);
                        }} 
                        disabled={hasApplied || applying}
                        className={`w-full py-5 rounded-[28px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${
                            hasApplied 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : !profile?.is_verified
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-brand text-white hover:bg-brand-dark'
                        }`}
                    >
                        {hasApplied 
                            ? 'Application Sent' 
                            : applying 
                            ? 'Sending...' 
                            : !profile?.is_verified 
                            ? '🔒 Verify ID to Apply' 
                            : 'Apply Now'
                        }
                    </button>
                    {hasApplied && <p className="text-center text-[10px] text-gray-400 font-bold mt-3 uppercase">Check 'Job Offer' tab for status updates.</p>}
                </div>
            ) : (
                <div className="pt-4">
                     <button 
                        onClick={handleDelete} 
                        disabled={deleting}
                        className="w-full py-5 rounded-[28px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 bg-red-50 text-red-600 border border-red-100"
                    >
                        {deleting ? 'Deleting...' : 'Delete Job'}
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Dynamic Clipboard Copy Toast */}
      {showShareToast && (
        <div className="fixed bottom-24 left-6 right-6 z-[150] bg-slate-900 border border-slate-800 text-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-2xl animate-fadeIn backdrop-blur-md bg-opacity-95 font-sans">
            <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                    <i className="fa-solid fa-check"></i>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-white">Link Copied!</p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Share with friends over WhatsApp or SMS</p>
                </div>
            </div>
            <span className="text-[8px] font-black uppercase text-gray-500 bg-white/5 px-2 py-0.5 rounded-lg font-mono">Pristine</span>
        </div>
      )}

      {/* Artisan Quote Proposal Detailed Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black/80 z-[160] flex items-center justify-center p-5 overflow-y-auto backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-[36px] border border-gray-100 dark:border-gray-700 w-full max-w-md p-6 relative shadow-2xl space-y-5 animate-slideUp font-sans">
            {/* Close Circle Button */}
            <button 
              onClick={() => setShowProposalModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 transition-colors w-9 h-9 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-full outline-none"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>

            {/* Header Title Section */}
            <div>
              <span className="text-[8px] font-black bg-brand/10 text-brand px-2.5 py-1 rounded-full uppercase tracking-wider">Proposal Customizer</span>
              <h3 className="text-lg font-black text-gray-900 dark:text-white dark:text-white mt-1.5 leading-tight">Submit Your Quote</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-450 font-bold leading-normal mt-1">Specify transparent pricing and bounds to avoid client disputes.</p>
            </div>

            {/* Educational Clarity Alert */}
            <div className="bg-orange-50 dark:bg-orange-955/20 border border-orange-100 dark:border-orange-900/40 p-3.5 rounded-2xl flex items-start gap-3">
              <span className="text-lg text-orange-500 shrink-0 mt-0.5">💡</span>
              <p className="text-[10px] text-orange-850 dark:text-orange-300 font-bold leading-normal">
                <strong>Budget Clarity:</strong> In Nigeria, clients sometimes expect buying parts/materials or covering transport are already included. Be explicitly clear below what is covered.
              </p>
            </div>

            {/* Budget segmented toggle buttons */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Select Bid Strategy</label>
              <div className="bg-gray-50 dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    setUseClientBudget(true);
                    setBidPrice(task ? task.budget.toString() : '');
                  }}
                  className={`py-2 px-1 rounded-xl text-[10px] font-extrabold uppercase transition-all outline-none ${useClientBudget ? 'bg-white dark:bg-gray-800 text-gray-950 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Client Budget (₦{(task?.budget || 0).toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setUseClientBudget(false)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-extrabold uppercase transition-all outline-none ${!useClientBudget ? 'bg-white dark:bg-gray-800 text-gray-950 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Custom Quote (₦)
                </button>
              </div>
            </div>

            {/* Custom Quote Numerical Input */}
            {!useClientBudget && (
              <div className="space-y-2 animate-fadeIn">
                <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Your Bidding Offer (₦)</label>
                <div className="relative rounded-2xl shadow-sm">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 font-black text-gray-400 text-sm">
                    ₦
                  </span>
                  <input
                    type="number"
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                    className="block w-full rounded-2xl border border-gray-200 dark:border-gray-700 py-3.5 pl-9 pr-4 text-xs font-black text-gray-900 dark:text-white dark:text-white dark:bg-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder="e.g. 15000"
                    min="1"
                    required
                  />
                </div>
              </div>
            )}

            {/* Breakdown checkboxes */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase block">Includes (What is covered in quote):</label>
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-2.5">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${coversLabor ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/40' : 'bg-gray-50 border-gray-100 dark:bg-gray-900 dark:border-gray-750'}`}>
                  <input 
                    type="checkbox" 
                    checked={coversLabor} 
                    onChange={(e) => setCoversLabor(e.target.checked)} 
                    className="rounded text-brand focus:ring-brand accent-brand h-3.5 w-3.5" 
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-gray-800 dark:text-gray-200">🛠️ Labor fee</span>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">Work Done</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${coversMaterials ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40' : 'bg-gray-50 border-gray-100 dark:bg-gray-900 dark:border-gray-750'}`}>
                  <input 
                    type="checkbox" 
                    checked={coversMaterials} 
                    onChange={(e) => setCoversMaterials(e.target.checked)} 
                    className="rounded text-brand focus:ring-brand accent-brand h-3.5 w-3.5" 
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-gray-800 dark:text-gray-200">🧱 Materials</span>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">Supply parts</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${coversTransport ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40' : 'bg-gray-50 border-gray-100 dark:bg-gray-900 dark:border-gray-750'}`}>
                  <input 
                    type="checkbox" 
                    checked={coversTransport} 
                    onChange={(e) => setCoversTransport(e.target.checked)} 
                    className="rounded text-brand focus:ring-brand accent-brand h-3.5 w-3.5" 
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-gray-800 dark:text-gray-200">🚚 Transport</span>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">Transit/Fuel</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${coversOther ? 'bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/40' : 'bg-gray-50 border-gray-100 dark:bg-gray-900 dark:border-gray-750'}`}>
                  <input 
                    type="checkbox" 
                    checked={coversOther} 
                    onChange={(e) => setCoversOther(e.target.checked)} 
                    className="rounded text-brand focus:ring-brand accent-brand h-3.5 w-3.5" 
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-gray-805 dark:text-gray-200">📦 Other Cost</span>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">Extra fees</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Quote specific Notes */}
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Artisan Quote Notes (Optional)</label>
              <textarea
                value={bidNotes}
                onChange={(e) => setBidNotes(e.target.value)}
                placeholder="e.g., I will need you to buy the 30-amp board beforehand, or Tell client key prerequisites."
                className="w-full text-xs p-3 border border-gray-200 dark:border-gray-700 bg-transparent rounded-2xl focus:ring-1 focus:ring-brand focus:border-brand dark:bg-gray-900 font-bold outline-none resize-none h-16"
                maxLength={400}
              />
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={handleApply}
                disabled={applying || (!useClientBudget && (!bidPrice || Number(bidPrice) <= 0))}
                className="w-full bg-brand text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-lg shadow-brand/10 hover:bg-brand-dark active:scale-95 duration-200 disabled:opacity-40 select-none outline-none shrink-0"
              >
                {applying ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin mr-1.5"></i> Sending application proposal...
                  </>
                ) : (
                  "Confirm & Submit Application"
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setShowProposalModal(false)}
                className="w-full text-gray-400 dark:text-gray-500 py-1 font-black text-[10px] uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-400 transition-colors select-none outline-none mr-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Job Modal / Bottom Sheet */}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-[32px] p-6 space-y-6 shadow-2xl relative translate-y-0 transition-transform duration-300 pointer-events-auto max-h-[85vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div>
                        <h3 className="text-lg font-black text-red-600 uppercase tracking-wide">Report Job Listing</h3>
                        <p className="text-xs text-gray-500">Flag issues with: {task?.title}</p>
                    </div>
                    <button 
                        onClick={() => setShowReportModal(false)}
                        className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-white transition-colors"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleReportSubmit} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Issue Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Fake Job', 'Payment Issue', 'Suspicious', 'Other'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setReportCategory(type)}
                                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        reportCategory === type 
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Describe what is fraudulent or wrong</label>
                        <textarea
                            required
                            rows={4}
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                            placeholder="e.g. This user is asking for registration fees upfront / is posting a fake job with bad coordinates..."
                            className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-xs font-medium outline-none border border-transparent focus:border-red-250 transition-all text-gray-800 dark:text-gray-100 placeholder-gray-400"
                        />
                    </div>

                    {/* Screenshot file picker */}
                    <div>
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Attach Chat/Evidence Screenshot (Optional)</label>
                        <div className="flex items-center gap-3">
                            <label className="flex-1 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                <i className="fa-regular fa-image text-gray-400 group-hover:text-red-500 text-2xl mb-1.5 transition-colors"></i>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Select Image</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleReportFileChange} 
                                    className="hidden" 
                                />
                            </label>
                            {reportEvidencePreview && (
                                <div className="w-20 h-20 rounded-2xl relative border border-gray-150 overflow-hidden shrink-0">
                                    <img src={reportEvidencePreview} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReportEvidenceFile(null);
                                            setReportEvidencePreview(null);
                                        }}
                                        className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
                                    >
                                        <i className="fa-solid fa-trash-can text-sm"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submittingReport}
                        className="w-full bg-red-650 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        {submittingReport ? 'Filing Job Report...' : 'Lodge Job Audit & Sync WhatsApp'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Share Graphic Card Modal */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        type="task" 
        data={task} 
      />
    </div>
  );
};

export default TaskDetail;
