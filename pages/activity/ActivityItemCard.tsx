import React from 'react';
import { Profile } from '../../lib/types';

export interface ActivityItemCardProps {
  item: any;
  statusFilter: any;
  viewMode: any;
  profile: any;
  handleItemClick: any;
  loading: any;
  handleStaleAction: any;
  handleArchiveBooking: any;
  updateBookingStatus: any;
  handleOpenCompleteModal: any;
  handleDismissWorker: any;
  handleConnectWhatsApp: any;
  rating: any;
  review: any;
  handleOpenArtisanReplyModal: any;
  handleOpenWorkerRatingModal: any;
  downloadJobReceipt: any;
}

export const ActivityItemCard: React.FC<ActivityItemCardProps> = ({
  item,
  statusFilter,
  viewMode,
  profile,
  handleItemClick,
  loading,
  handleStaleAction,
  handleArchiveBooking,
  updateBookingStatus,
  handleOpenCompleteModal,
  handleDismissWorker,
  handleConnectWhatsApp,
  rating,
  review,
  handleOpenArtisanReplyModal,
  handleOpenWorkerRatingModal,
  downloadJobReceipt
}) => {
  
                // Logic to identify if item is an Open Task (no worker assigned yet)
                const isOpenTask = item.budget !== undefined && !item.worker_id; 

                // Dynamic stale calculation (Zero-cost, client-side, fully aligned with DB enums)
                const isBooking = !!item.worker_id;
                const createdTime = item.created_at ? new Date(item.created_at).getTime() : 0;
                const referenceTime = item.updated_at ? new Date(item.updated_at).getTime() : (item.created_at ? new Date(item.created_at).getTime() : 0);
                
                const isStalePending = isBooking && item.status === 'pending' && createdTime > 0 && (Date.now() - createdTime > 48 * 60 * 60 * 1000);
                const isStaleOngoing = isBooking && item.status === 'accepted' && referenceTime > 0 && (Date.now() - referenceTime > 3 * 24 * 60 * 60 * 1000);
                const isStale = isStalePending || isStaleOngoing;

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
                        if (item.task_id) {
                            const isAssignedToOther = item.posted_tasks?.status === 'assigned' && item.posted_tasks?.assigned_worker_id !== profile?.id;
                            if (isAssignedToOther && item.status === 'pending') {
                                return (
                                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg animate-pulse">
                                        Under Review by Client
                                    </span>
                                );
                            }
                            return <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg">Application Sent</span>;
                        }
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
                          <h3 className="font-black text-gray-900 dark:text-white text-[15px] truncate tracking-tight">
                            {item.title || item.posted_tasks?.title || (item.quote_notes ? item.quote_notes.split('\n')[0] : 'Direct Request')}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                             {renderItemTypeLabel()}
                             {!isOpenTask && <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">{item.profiles?.full_name || 'User'}</span>}
                          </div>
                      </div>
                    </div>

                    {/* Proposal Quote Breakdown (Real-time Nigerian Context Help) */}
                    {item.quote_price !== undefined && item.quote_price !== null && (
                      <div className="bg-slate-50 dark:bg-gray-900/40 p-3.5 border border-gray-100 dark:border-gray-800 rounded-3xl space-y-3 font-sans relative z-10 text-left">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                           <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Custom Offer Quote</p>
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                 <span className="text-sm font-black text-brand">₦{Number(item.quote_price).toLocaleString()}</span>
                                 {/* Compare option against task budget */}
                                 {item.posted_tasks?.budget && Number(item.posted_tasks.budget) !== Number(item.quote_price) && (
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${Number(item.quote_price) > Number(item.posted_tasks.budget) ? 'bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-400'}`}>
                                       {Number(item.quote_price) > Number(item.posted_tasks.budget) ? 'Above Budget' : 'Below Budget'}
                                    </span>
                                 )}
                              </div>
                           </div>
                           {item.posted_tasks?.budget && (
                              <div className="text-right">
                                 <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Client Budget</p>
                                 <p className="text-xs font-black text-gray-600 dark:text-gray-300 mt-0.5">
                                   {item.posted_tasks.budget_type === 'negotiable' ? (
                                      "Negotiable"
                                   ) : (
                                      <>₦{Number(item.posted_tasks.budget).toLocaleString()}{item.posted_tasks.budget_type && item.posted_tasks.budget_type !== 'fixed' ? <span className="text-[10px] ml-0.5 font-bold">/{item.posted_tasks.budget_type === 'daily' ? 'day' : item.posted_tasks.budget_type === 'weekly' ? 'wk' : 'mo'}</span> : ''}</>
                                   )}
                                 </p>
                              </div>
                           )}
                        </div>

                        {/* Visual checklist tags */}
                        <div className="space-y-1">
                           <p className="text-[7.5px] font-black uppercase text-gray-400 tracking-wider">This estimate includes:</p>
                           <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {item.quote_covers_labor && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-orange-50 text-orange-650 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    🛠️ Labor
                                 </span>
                              )}
                              {item.quote_covers_materials && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-655 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    🧱 Materials
                                 </span>
                              )}
                              {item.quote_covers_transport && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-650 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    🚚 Transport
                                 </span>
                              )}
                              {item.quote_covers_other && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-purple-50 text-purple-650 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    📦 Other Required
                                 </span>
                              )}
                              {!item.quote_covers_labor && !item.quote_covers_materials && !item.quote_covers_transport && !item.quote_covers_other && (
                                 <span className="text-[8px] font-black uppercase tracking-wider bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-300 px-2 py-0.5 rounded-lg">
                                    Unspecified Included Items
                                 </span>
                              )}
                           </div>
                        </div>

                        {/* Optional notes context */}
                        {item.quote_notes && (
                           <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-[10.5px] text-gray-600 dark:text-gray-400 font-bold italic leading-relaxed whitespace-pre-wrap">
                              "{item.quote_notes}"
                           </div>
                        )}
                      </div>
                    )}

                    {/* Dynamic Inactivity Alert and Rail (Client Only) */}
                    {isStale && profile?.id === item.client_id && (
                        <div className="space-y-3 relative z-10 pt-2 pb-1 text-left font-sans" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 items-start animate-fadeIn">
                                <span className="text-amber-500 dark:text-amber-400 text-sm mt-0.5"><i className="fa-solid fa-triangle-exclamation"></i></span>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] uppercase font-black tracking-wider text-amber-805 dark:text-amber-400">Inactivity Alert</p>
                                    <p className="text-[10.5px] leading-relaxed text-amber-700/90 dark:text-amber-300 font-bold">
                                        {item.status === 'pending' 
                                            ? "This application has been pending for over 48 hours without any decision."
                                            : "This hire has been accepted for over 3 days without completion. You can re-open or cancel it."
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Small Modern Button Rail */}
                            <div className={`grid ${item.task_id ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                                {item.task_id && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleStaleAction(item, 'reopen'); }}
                                        className="bg-sky-50 dark:bg-sky-950/20 hover:bg-sky-100 text-sky-700 dark:text-sky-450 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-sky-100 dark:border-sky-900/40 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 focus:outline-none"
                                        title="Dismiss worker and allow other candidates to apply again"
                                    >
                                        <i className="fa-solid fa-arrows-rotate text-xs"></i>
                                        <span>Re-open Job</span>
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleStaleAction(item, 'failed'); }}
                                    className="bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-650 dark:text-rose-450 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-rose-100/60 dark:border-rose-900/40 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 focus:outline-none"
                                    title={item.task_id ? "Close this job post without successfully completing it" : "Cancel this direct hire"}
                                >
                                    <i className="fa-solid fa-ban text-xs"></i>
                                    <span>{item.task_id ? 'Mark Failed' : 'Cancel Hire'}</span>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleArchiveBooking(item.id); }}
                                    className="bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-gray-100 dark:border-gray-700/60 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 focus:outline-none"
                                    title="Hide this record from your active dashboard feeds"
                                >
                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                    <span>Archive</span>
                                </button>
                            </div>
                        </div>
                    )}

                    
                    {(item.status === 'declined' || item.status === 'cancelled') && item.decline_reason && (
                        <div className="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-2xl relative z-10">
                            <p className="text-[9px] font-black uppercase text-red-500 tracking-widest mb-1">{item.status === 'declined' ? 'Decline Reason' : 'Cancel Reason'}</p>
                            <p className="text-xs font-medium text-red-900/80 dark:text-red-200">{item.decline_reason}</p>
                        </div>
                    )}

                    {item.status === 'pending' && (
                        <div className="w-full relative z-10 mt-4">
                            {/* CASE 1: JOB APPLICATION (HAS TASK ID) */}
                            {item.task_id ? (
                                profile?.id === item.client_id ? (
                                    // Hiring View: Accept/Decline Worker's Application
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'declined'); }} 
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
                                            onClick={(e) => { e.stopPropagation(); updateBookingStatus(item, 'declined'); }} 
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
                                <div className="flex flex-col gap-2.5">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenCompleteModal(item); }} 
                                        className="w-full bg-yellow-400 text-gray-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <i className="fa-solid fa-circle-check"></i> Complete & Pay
                                    </button>
                                    {item.task_id && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDismissWorker(item); }} 
                                            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-650 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 dark:text-rose-400 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/40 outline-none"
                                        >
                                            <i className="fa-solid fa-user-minus"></i> Dismiss & Re-open Job
                                        </button>
                                    )}
                                </div>
                            )}
                             <div className="bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40 p-3.5 rounded-2xl flex items-start gap-2.5 my-1.5 shadow-sm">
                                 <i className="fa-brands fa-whatsapp text-emerald-500 dark:text-emerald-400 text-base mt-0.5 animate-pulse"></i>
                                 <div className="flex-1">
                                     <p className="text-[9px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-0.5">Direct Live chat</p>
                                     <p className="text-[10.5px] text-emerald-700 dark:text-gray-300 leading-snug font-medium">
                                         Contract active! Move your coordination to WhatsApp to share location, send voice messages, or upload job photos seamlessly.
                                     </p>
                                 </div>
                             </div>
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleConnectWhatsApp(item); }} 
                                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fa-brands fa-whatsapp text-sm"></i> Chat on WhatsApp
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

                            {/* Display existing worker replies, or reply submission details */}
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

                            {/* Client sees the approved responses from the professional */}
                            {profile?.id === item.client_id && item.worker_reply && item.worker_reply_approved && (
                                <div className="mt-3 ml-4 pl-4 border-l-2 border-emerald-500 dark:border-emerald-600 space-y-1 font-sans bg-emerald-50/20 dark:bg-emerald-950/10 p-2.5 rounded-xl">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-450 flex items-center gap-1">
                                        <i className="fa-solid fa-reply"></i> Response from Professional
                                    </p>
                                    <p className="text-xs text-gray-800 dark:text-gray-200">"{item.worker_reply}"</p>
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

                        </div>
                    )}

                    {statusFilter === 'history' && (
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center gap-3 relative z-10 font-sans">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); downloadJobReceipt(item); }}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-4.5 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-rose-600/10 transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                                title="Download PDF invoice for this job history record"
                            >
                                <i className="fa-solid fa-file-pdf text-xs"></i>
                                <span>PDF Receipt</span>
                            </button>
                        </div>
                    )}
                </div>
            )};
