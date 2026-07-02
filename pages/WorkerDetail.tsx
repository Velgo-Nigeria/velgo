
import React, { useState, useEffect } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { getTierLimit } from '../lib/constants';
import { VerificationBadge } from '../components/VerificationBadge';
import { isBookmarked, toggleBookmark } from '../lib/bookmarkService';
import { openWhatsAppHelper } from '../lib/whatsapp';
import { ShareModal } from '../components/ShareModal';

interface WorkerDetailProps { profile: Profile | null; workerId: string; onBack: () => void; onBook: (workerId: string) => void; onRefreshProfile?: () => void; onUpgrade: () => void; }

const WorkerDetail: React.FC<WorkerDetailProps> = ({ profile, workerId, onBack, onBook, onRefreshProfile, onUpgrade }) => {
  const [worker, setWorker] = useState<Profile | null>(null);
  const [rating, setRating] = useState<number>(5.0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const reviewsPerPage = 5;
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [hasRequested, setHasRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showShareToast, setShowShareToast] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Profile Reporting Subsystem States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportIncidentType, setReportIncidentType] = useState('Fraud');
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
    if (!profile || !worker) return;
    if (!reportDetails.trim()) {
      alert("Please provide specific feedback/evidence regarding this artisan.");
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
          console.error("Evidence file upload failed:", uploadError);
        }
      }

      const richDetails = `
INCIDENT TYPE: ${reportIncidentType.toUpperCase()}
TARGET PROFILE: ${worker.full_name} (${worker.id})
REPORTER EXPLANATION: ${reportDetails}
EVIDENCE ATTACHED: ${reportEvidenceFile ? 'Yes' : 'No'}
${finalEvidenceUrl ? `EVIDENCE LINK: ${finalEvidenceUrl}` : ''}

-- REPORTER DATA --
Name: ${profile.full_name}
Email: ${profile.email || 'N/A'}
Phone: ${profile.phone_number}
UID: ${profile.id}
      `.trim();

      // Launch official dual-channel WhatsApp reporting line
      const waMsg = `🚨 VELGO USER PROFILE REPORT 🚨\n\nIncident Type: ${reportIncidentType.toUpperCase()}\nTarget Artisan: ${worker.full_name}\nReporter: ${profile.full_name}\n\nREASON:\n${reportDetails}`;
      try {
        openWhatsAppHelper(waMsg);
      } catch (err) {
        console.warn("WhatsApp intent skipped:", err);
      }

      const insertPayload: any = {
        reporter_id: profile.id,
        reported_user_id: worker.id,
        type: reportIncidentType,
        details: richDetails,
        status: 'pending',
        evidence_url: finalEvidenceUrl || null
      };

      const { error } = await supabase.from('safety_reports').insert([insertPayload]);
      if (error) {
        console.warn("Retrying insert without new target relations in case schema update is still propagating in the browser:", error.message);
        delete insertPayload.reported_user_id;
        const retryResult = await supabase.from('safety_reports').insert([insertPayload]);
        if (retryResult.error) throw retryResult.error;
      }

      alert(`Report submitted! We have successfully registered your ticket. A Velgo Safety Analyst is auditing "${worker.full_name}" (LGA: ${worker.lga || 'N/A'}) to protect citizens in our market.`);
      setShowReportModal(false);
      setReportDetails('');
      setReportEvidenceFile(null);
      setReportEvidencePreview(null);
    } catch (err: any) {
      alert("Failed to transmit incident logs to Velgo Compliance: " + err.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    safeFetch<Profile>(async () => await supabase.from('profiles').select('*').eq('id', workerId).single() as any)
      .then(({data}) => {
         setWorker(data);
         setLoading(false);
      });

    // Real and accurate profile views tracking with a persistent 'profile_views' audit table in Supabase
    if (!profile || profile.id !== workerId) {
      supabase.from('profile_views')
        .insert([{
          profile_id: workerId,
          viewer_id: profile ? profile.id : null
        }])
        .then(({ error }) => {
          if (error) {
            console.warn("Real-time profile_views insert failed, falling back to cached RPC:", error.message);
            // Fallback to legacy RPC integration if the table is still deploying
            supabase.rpc('increment_profile_views', { target_id: workerId }).then();
          }
        });
    }
    
    // Check if profile has already requested this worker
    if (profile && profile.id !== workerId) {
        supabase.from('bookings')
            .select('id')
            .eq('client_id', profile.id)
            .eq('worker_id', workerId)
            .in('status', ['pending', 'accepted', 'assigned'])
            .maybeSingle()
            .then(({data}) => {
                if (data) setHasRequested(true);
            });
    }

    if (profile && workerId) {
        isBookmarked(profile.id, workerId, 'worker').then(setBookmarked);
    }

    const fetchRating = async () => {
        const { data: ratingData } = await supabase.from('bookings').select('rating').eq('worker_id', workerId).not('rating', 'is', null);
        if (ratingData && ratingData.length > 0) {
            const total = ratingData.reduce((sum, item) => sum + (item.rating || 0), 0);
            setRating(parseFloat((total / ratingData.length).toFixed(1)));
            setReviewCount(ratingData.length);
        }
    };
    fetchRating();
  }, [workerId]);

  const fetchReviews = async (currentPage: number) => {
      const from = currentPage * reviewsPerPage;
      const to = from + reviewsPerPage - 1;
      const { data: reviewsData } = await supabase
          .from('bookings')
          .select('rating, review, created_at, worker_reply, worker_reply_at, worker_reply_approved, profiles:client_id(full_name, avatar_url)')
          .eq('worker_id', workerId)
          .not('review', 'is', null)
          .neq('review', '')
          .order('created_at', { ascending: false })
          .range(from, to);
          
      if (reviewsData && reviewsData.length > 0) {
          if (currentPage === 0) setReviews(reviewsData);
          else setReviews(prev => [...prev, ...reviewsData]);
          setHasMoreReviews(reviewsData.length === reviewsPerPage);
      } else {
          setHasMoreReviews(false);
      }
  };

  useEffect(() => {
      fetchReviews(page);
  }, [workerId, page]);

  const loadMoreReviews = () => {
      setPage(prev => prev + 1);
  };

  const handleBooking = async () => {
    if (!profile) return;
    if (hasRequested) return;

    if (!profile.is_verified) {
      alert("Verification Required: To secure our marketplace and eliminate fake bookings, Velgo requires you to verify your identity before booking professionals. Please go to your Profile and upload your NIN.");
      return;
    }

    setRequesting(true);
    const { error } = await safeFetch(async () => await supabase.from('bookings').insert([{ client_id: profile.id, worker_id: workerId, status: 'pending' }]));
    setRequesting(false);
    
    if (!error) { 
      if (onRefreshProfile) onRefreshProfile();

      setHasRequested(true);
      alert("Request Sent!"); 
    } else {
      alert("Failed to initiate booking: " + error.message);
    }
  };

  const handleShare = () => {
    if (!worker) return;
    setIsShareModalOpen(true);
  };

  const handleToggleBookmark = async () => {
    if (!profile) {
      alert("Please log in to save to your bookmarks!");
      return;
    }
    const result = await toggleBookmark(profile.id, workerId, 'worker');
    setBookmarked(result);
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400 animate-pulse font-sans bg-white dark:bg-gray-950 min-h-screen flex flex-col items-center justify-center">
          <i className="fa-solid fa-cloud-arrow-down text-4xl mb-3 text-brand animate-bounce"></i>
          <p className="font-black uppercase tracking-wider text-[10px]">Retrieving Artisan Profile...</p>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="p-10 text-center min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl font-black">
              <i className="fa-solid fa-triangle-exclamation animate-bounce"></i>
          </div>
          <div className="space-y-2">
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">Artisan Offline</h2>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">This artisan public profile might have been suspended, deleted, or is temporarily unavailable.</p>
          </div>
          <button onClick={onBack} className="px-6 py-3 bg-brand text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-transform">
              Go to Marketplace
          </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pb-24 relative">

      <div className="relative h-[45vh] bg-gray-900 overflow-hidden">
        
        {/* Holographic Watermark */}
        <img 
            src="https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png"
            className="absolute -right-12 -bottom-24 w-80 h-80 opacity-[0.15] rotate-[-15deg] pointer-events-none z-0"
            alt=""
        />

        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
            <button onClick={onBack} className="bg-white/20 backdrop-blur-xl text-white w-10 h-10 flex items-center justify-center rounded-2xl active:scale-90 transition-transform">
                <i className="fa-solid fa-chevron-left"></i>
            </button>
            <div className="flex items-center gap-3">
                <button onClick={handleToggleBookmark} className={`bg-white/20 backdrop-blur-xl text-white w-10 h-10 flex items-center justify-center rounded-2xl active:scale-90 transition-transform ${bookmarked ? 'text-red-500' : ''}`} title="Bookmark Worker">
                    {bookmarked ? (
                        <i className="fa-solid fa-heart text-rose-500"></i>
                    ) : (
                        <i className="fa-regular fa-heart"></i>
                    )}
                </button>
                <button onClick={handleShare} className="bg-white/20 backdrop-blur-xl text-white w-10 h-10 flex items-center justify-center rounded-2xl active:scale-90 transition-transform" title="Share profile">
                    <i className="fa-solid fa-share-nodes"></i>
                </button>
                {profile && profile.id !== workerId && (
                    <button 
                        onClick={() => setShowReportModal(true)} 
                        className="bg-white/20 hover:bg-red-600/35 hover:text-red-300 backdrop-blur-xl text-white w-10 h-10 flex items-center justify-center rounded-2xl active:scale-90 transition-colors" 
                        title="Report/Flag Bad Behavior"
                    >
                        <i className="fa-regular fa-flag"></i>
                    </button>
                )}
            </div>
        </div>

        <img src={worker?.avatar_url || `https://picsum.photos/seed/${workerId}/1200/1000`} className="w-full h-full object-cover opacity-80 relative z-10" />
      </div>
      <div className="px-6 -mt-24 relative z-10">
        <img src={worker?.avatar_url} className="w-32 h-32 rounded-[44px] border-[6px] border-white dark:border-gray-900 shadow-2xl object-cover bg-white dark:bg-gray-900" />
        <div className="mt-6 space-y-8">
          <div>
              <div className="flex items-center gap-2 mb-1">
                 <h1 className="text-3xl font-black text-gray-900 dark:text-white">{worker?.full_name}</h1>
                 {worker?.is_verified && <VerificationBadge className="text-blue-500 text-xl" />}
              </div>
              <div className="flex flex-wrap gap-2">
                 <span className="bg-brand-light text-brand px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">{worker?.category}</span>
                 {worker?.is_verified && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><VerificationBadge className="text-blue-600" /> ID Verified</span>}
              </div>
              {(worker?.lga || worker?.state) && (
                 <div className="flex items-center gap-1.5 mt-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                    <i className="fa-solid fa-location-dot text-brand"></i>
                    <span>{worker?.address ? `${worker.address}, ` : ''}{worker?.lga}, {worker?.state}</span>
                 </div>
              )}
          </div>
          <div className="grid grid-cols-4 gap-1 py-8 border-y border-gray-100 dark:border-gray-800">
            <div className="text-center"><p className="text-[9px] text-gray-400 font-black uppercase">Starting</p><p className="font-black text-gray-900 dark:text-white text-xl">₦{worker?.starting_price}</p></div>
            <div className="text-center"><p className="text-[9px] text-gray-400 font-black uppercase">Trust</p><p className="font-black text-emerald-500 flex items-end justify-center gap-0.5 text-xl">{worker?.trust_score || 0}<span className="text-[10px] text-emerald-600/60 pb-1">Pts</span></p></div>
            <div className="text-center"><p className="text-[9px] text-gray-400 font-black uppercase">Rating</p><p className="font-black text-gray-900 dark:text-white text-xl flex items-center justify-center gap-1">{worker?.worker_avg_rating || rating} <i className="fa-solid fa-star text-xs text-yellow-400"></i></p></div>
            <div className="text-center"><p className="text-[9px] text-gray-400 font-black uppercase">Jobs</p><p className="font-black text-green-500 text-xl">{worker?.worker_rating_count || reviewCount} Done</p></div>
          </div>

          <p className="text-sm text-gray-500 leading-relaxed font-medium">{worker?.bio || `Professional ${worker?.subcategory} available in ${worker?.address}.`}</p>
          
          {/* Detailed Performance Metrics */}
          {(worker?.worker_rating_count || reviewCount) > 0 && (
              <div className="bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-3xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest mb-2 flex items-center justify-between">
                     Performance Breakdown
                     <span className="text-[9px] text-gray-400 font-medium normal-case">Based on {worker?.worker_rating_count || reviewCount} reviews</span>
                  </h3>
                  
                  <div className="space-y-3">
                      <div>
                          <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Communication</span>
                              <span className="text-xs font-black text-gray-900 dark:text-gray-100">{worker?.worker_avg_communication || rating}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className="bg-yellow-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${((worker?.worker_avg_communication || rating) / 5) * 100}%` }}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Quality of Work</span>
                              <span className="text-xs font-black text-gray-900 dark:text-gray-100">{worker?.worker_avg_quality || rating}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className="bg-yellow-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${((worker?.worker_avg_quality || rating) / 5) * 100}%` }}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Punctuality</span>
                              <span className="text-xs font-black text-gray-900 dark:text-gray-100">{worker?.worker_avg_punctuality || rating}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className="bg-yellow-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${((worker?.worker_avg_punctuality || rating) / 5) * 100}%` }}></div>
                          </div>
                      </div>
                  </div>

                  {/* Trust Badges */}
                  {(worker?.worker_rating_count || reviewCount) >= 10 || (worker?.worker_avg_punctuality && worker.worker_avg_punctuality >= 4.5) || (worker?.worker_avg_quality && worker.worker_avg_quality >= 4.5) ? (
                      <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
                          <h3 className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Earned Badges</h3>
                          <div className="flex flex-wrap gap-2">
                              {(worker?.worker_rating_count || reviewCount) >= 10 && (
                                  <div className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-purple-100 dark:bg-purple-900/10 dark:border-purple-800/30">
                                      <i className="fa-solid fa-award text-sm"></i>
                                      <div>
                                          <p className="text-[9px] font-black uppercase tracking-widest leading-none">Top Rated Pro</p>
                                          <p className="text-[8px] font-medium opacity-80 mt-0.5">Highly reliable</p>
                                      </div>
                                  </div>
                              )}
                              {worker?.worker_avg_punctuality && worker.worker_avg_punctuality >= 4.5 && (
                                  <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/30">
                                      <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                                      <div>
                                          <p className="text-[9px] font-black uppercase tracking-widest leading-none">Always on Time</p>
                                          <p className="text-[8px] font-medium opacity-80 mt-0.5">Punctual worker</p>
                                      </div>
                                  </div>
                              )}
                              {worker?.worker_avg_quality && worker.worker_avg_quality >= 4.5 && (
                                  <div className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30">
                                      <i className="fa-solid fa-gem text-sm"></i>
                                      <div>
                                          <p className="text-[9px] font-black uppercase tracking-widest leading-none">Premium Quality</p>
                                          <p className="text-[8px] font-medium opacity-80 mt-0.5">Exceptional work</p>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  ) : null}
              </div>
          )}
          
          <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">Recent Reviews</h3>
              {reviews.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center text-xs text-gray-400 font-medium italic">No written reviews yet.</div>
              ) : (
                  <>
                  {reviews.map((r, i) => {
                      const isWorkerSelf = profile?.id === workerId;
                      return (
                      <div key={i} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 font-sans">
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                      {r.profiles?.avatar_url ? <img src={r.profiles.avatar_url} className="w-full h-full object-cover" alt=""/> : <i className="fa-solid fa-user text-gray-400 text-[10px] p-1.5"></i>}
                                  </div>
                                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{r.profiles?.full_name || 'Client'}</span>
                              </div>
                              <div className="flex text-yellow-400 text-[10px] gap-0.5">
                                  {Array(Math.round(r.rating || 5)).fill(0).map((_, idx) => <i key={idx} className="fa-solid fa-star"></i>)}
                              </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">"{r.review}"</p>
                          
                          {/* Render Artisan Response */}
                          {r.worker_reply && (r.worker_reply_approved || isWorkerSelf) && (
                              <div className="mt-3 ml-4 pl-4 border-l-2 border-emerald-500 dark:border-emerald-600 space-y-1 font-sans bg-gray-100/50 dark:bg-gray-900/40 p-2.5 rounded-xl">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-650 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                          <i className="fa-solid fa-reply"></i> Response from Artisan
                                      </p>
                                      {!r.worker_reply_approved && (
                                          <span className="text-[7px] font-black uppercase tracking-widest bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-405 px-1.5 py-0.5 rounded border border-yellow-101 dark:border-yellow-904 animate-pulse">
                                              Pending Vetting
                                          </span>
                                      )}
                                  </div>
                                  <p className="text-[11px] text-gray-700 dark:text-gray-300 italic leading-relaxed">"{r.worker_reply}"</p>
                              </div>
                          )}

                          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-2 text-right">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                  )})}
                  {hasMoreReviews && (
                      <button onClick={loadMoreReviews} className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">
                          Load More Reviews
                      </button>
                  )}
                  </>
              )}
          </div>

          {profile && profile.id !== workerId && !profile.is_verified && (
              <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/30 p-5 rounded-[24px] flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0 text-lg">
                      <i className="fa-solid fa-user-shield animate-pulse"></i>
                  </div>
                  <div className="flex-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">Verification Required</h4>
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold leading-relaxed mt-1">
                          To protect our community and eliminate advance fee fraud or fake bookings, Velgo requires clients to verify their profile before booking professionals.
                      </p>
                      <p className="text-[9px] text-[#b45309] dark:text-amber-500 font-black uppercase tracking-widest mt-2">
                         👉 View your Profile tab to upload your NIN card.
                      </p>
                  </div>
              </div>
          )}

          {profile && profile.id !== workerId && (
            <button 
                onClick={handleBooking} 
                disabled={hasRequested || requesting}
                className={`w-full py-5 rounded-[28px] font-black shadow-xl uppercase tracking-widest transition-all ${
                    hasRequested 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : !profile.is_verified
                        ? 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95'
                        : 'bg-brand text-white hover:bg-brand-dark active:scale-95'
                }`}
            >
                {requesting ? 'SENDING...' : hasRequested ? 'REQUEST SENT' : !profile.is_verified ? '🔒 Verify ID to Book' : 'HIRE WORKER NOW'}
            </button>
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

      {/* Report Modal / Bottom Sheet */}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-[32px] p-6 space-y-6 shadow-2xl relative translate-y-0 transition-transform duration-300 pointer-events-auto max-h-[85vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div>
                        <h3 className="text-lg font-black text-red-600 uppercase tracking-wide">Report Profile</h3>
                        <p className="text-xs text-gray-500">Flag issues with {worker?.full_name}</p>
                    </div>
                    <button 
                        onClick={() => setShowReportModal(false)}
                        className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleReportSubmit} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Incident Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Fraud', 'Unprofessional', 'Abuse', 'Other'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setReportIncidentType(type)}
                                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        reportIncidentType === type 
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
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Details & Explanation</label>
                        <textarea
                            required
                            rows={4}
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                            placeholder="Please supply specific context, booking date, description and what went wrong..."
                            className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-xs font-medium outline-none border border-transparent focus:border-red-250 transition-all text-gray-800 dark:text-gray-100 placeholder-gray-400"
                        />
                    </div>

                    {/* Evidence Screenshot File Picker */}
                    <div>
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Attach Evidence Screenshot (Chats, Receipt)</label>
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
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        {submittingReport ? 'Lodging Audit Report...' : 'Lodge Complaint & Sync WhatsApp'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Sharing Graphic Card Modal */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        type="worker" 
        data={worker} 
      />
    </div>
  );
};
export default WorkerDetail;
