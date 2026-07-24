import React from 'react';
import { TIERS } from '../../../lib/constants';
import { openWhatsAppHelper } from '../../../lib/whatsapp';
export interface ReviewsTabProps {
  pendingReplies: any;
  processingId: any;
  handleReviewReplyReject: any;
  handleReviewReplyApprove: any;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({
  pendingReplies,
  processingId,
  handleReviewReplyReject,
  handleReviewReplyApprove
}) => {
  return (
    (
              <div className="space-y-6 animate-fadeIn pb-12">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-[28px] border dark:border-slate-700">
                      <div>
                          <h3 className="text-sm font-black text-gray-900 dark:text-white">Worker Reply Vetting</h3>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Reviewing professional conduct</p>
                      </div>
                      <span className="text-[11px] font-black bg-brand/10 text-brand px-3 py-1.5 rounded-xl">
                          {pendingReplies.filter(r => !r.worker_reply_approved).length} Pending
                      </span>
                  </div>

                  {pendingReplies.length === 0 ? (
                      <div className="text-center py-20 opacity-35 bg-white dark:bg-slate-800 rounded-[28px] border dark:border-slate-700">
                          <i className="fa-solid fa-circle-check text-6xl mb-4 text-emerald-500"></i>
                          <p className="font-black uppercase tracking-widest text-xs dark:text-white">All clear! No pending worker replies.</p>
                      </div>
                  ) : (
                      <div className="space-y-4 font-sans">
                          {pendingReplies.map((reply) => (
                              <div key={reply.id} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700 shadow-sm space-y-4 relative overflow-hidden">
                                  {/* User details header */}
                                  <div className="flex justify-between items-center text-xs border-b pb-3 dark:border-slate-700">
                                      <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
                                              {reply.worker?.avatar_url ? <img src={reply.worker.avatar_url} className="w-full h-full object-cover" alt=""/> : <span className="font-bold text-gray-400 p-2 text-xs">U</span>}
                                          </div>
                                          <div>
                                              <p className="font-extrabold text-gray-800 dark:text-gray-200">{reply.worker?.full_name || 'Unknown Worker'}</p>
                                              <p className="text-[8px] font-black uppercase text-brand">Professional / Worker</p>
                                          </div>
                                      </div>
                                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                          {reply.worker_reply_at ? new Date(reply.worker_reply_at).toLocaleDateString() : 'Unknown Date'}
                                      </span>
                                  </div>

                                  {/* The Original client Review info */}
                                  <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                                      <div className="flex justify-between items-center mb-1">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-[9px] font-bold text-gray-500 uppercase">Client Review by {reply.client?.full_name || 'Client'}</span>
                                          </div>
                                          <div className="flex text-yellow-400 text-[8px] gap-0.5">
                                              {Array(reply.rating || 5).fill(0).map((_, idx) => <i key={idx} className="fa-solid fa-star"></i>)}
                                          </div>
                                      </div>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{reply.review || 'No written review text'}"</p>
                                  </div>

                                  {/* The Worker's actual Reply */}
                                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/10 font-sans">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                                          <i className="fa-solid fa-reply"></i> Proposed Worker Reply
                                      </p>
                                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">"{reply.worker_reply}"</p>
                                  </div>

                                  {/* Verification status and moderation action items */}
                                  <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
                                      <div className="flex items-center gap-1.5">
                                          {reply.worker_reply_approved ? (
                                              <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border border-green-100 dark:border-green-800/40">
                                                  <i className="fa-solid fa-circle-check mr-1"></i> Approved & Live
                                              </span>
                                          ) : (
                                              <span className="bg-yellow-50 dark:bg-yellow-905 text-yellow-600 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse border border-yellow-100 dark:border-yellow-900/30">
                                                  <i className="fa-solid fa-hourglass-half mr-1"></i> Pending Moderation
                                              </span>
                                          )}
                                      </div>

                                      <div className="flex gap-2">
                                          <button 
                                              disabled={processingId === reply.id}
                                              onClick={() => handleReviewReplyReject(reply.id)} 
                                              className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wide hover:bg-red-100 active:scale-95 transition-transform"
                                          >
                                              Reject & Delete
                                          </button>
                                          {!reply.worker_reply_approved && (
                                              <button 
                                                  disabled={processingId === reply.id}
                                                  onClick={() => handleReviewReplyApprove(reply.id)} 
                                                  className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wide shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 active:scale-95 transition-transform"
                                              >
                                                  Approve
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )
  );
};
