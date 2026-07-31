import React, { useState, useEffect } from 'react';
import { AppRating } from '../../../types';
import { 
  fetchAllAppRatings, 
  toggleFeaturedAppRating, 
  replyAppRating, 
  deleteAppRating 
} from '../../../lib/appRatings';

export const AppRatingsTab: React.FC = () => {
  const [ratings, setRatings] = useState<AppRating[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'featured' | 'pending_reply' | '5star' | 'low'>('all');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    setLoading(true);
    const data = await fetchAllAppRatings();
    setRatings(data);
    setLoading(false);
  };

  const handleToggleFeatured = async (ratingId: string, currentStatus: boolean) => {
    setProcessingId(ratingId);
    await toggleFeaturedAppRating(ratingId, !currentStatus);
    setRatings(prev => prev.map(r => r.id === ratingId ? { ...r, is_featured: !currentStatus } : r));
    setActionSuccess(!currentStatus ? 'Rating featured on Landing Page!' : 'Rating removed from Landing Page!');
    setProcessingId(null);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleSendReply = async (ratingId: string) => {
    const text = replyInputs[ratingId]?.trim();
    if (!text) return;

    setProcessingId(ratingId);
    await replyAppRating(ratingId, text);
    const now = new Date().toISOString();
    setRatings(prev => prev.map(r => r.id === ratingId ? { ...r, admin_reply: text, admin_replied_at: now } : r));
    setReplyInputs(prev => ({ ...prev, [ratingId]: '' }));
    setActionSuccess('Admin reply saved!');
    setProcessingId(null);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleDelete = async (ratingId: string) => {
    if (!window.confirm("Are you sure you want to delete this app rating?")) return;
    setProcessingId(ratingId);
    await deleteAppRating(ratingId);
    setRatings(prev => prev.filter(r => r.id !== ratingId));
    setActionSuccess('Rating deleted.');
    setProcessingId(null);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Metrics calculations
  const totalCount = ratings.length;
  const avgRating = totalCount > 0 
    ? (ratings.reduce((acc, r) => acc + r.rating, 0) / totalCount).toFixed(1)
    : '0.0';
  const featuredCount = ratings.filter(r => r.is_featured).length;
  const pendingReplyCount = ratings.filter(r => !r.admin_reply).length;

  const filteredRatings = ratings.filter(r => {
    if (filter === 'featured') return r.is_featured;
    if (filter === 'pending_reply') return !r.admin_reply;
    if (filter === '5star') return r.rating === 5;
    if (filter === 'low') return r.rating <= 3;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <i className="fa-solid fa-circle-check"></i>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700 shadow-sm space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Average Rating</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-amber-500">{avgRating}</span>
            <div className="text-amber-400 text-xs">
              <i className="fa-solid fa-star"></i>
            </div>
          </div>
          <p className="text-[9px] text-gray-400 font-bold">From {totalCount} total review{totalCount === 1 ? '' : 's'}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700 shadow-sm space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Feedback</p>
          <span className="text-3xl font-black text-gray-900 dark:text-white">{totalCount}</span>
          <p className="text-[9px] text-emerald-500 font-bold">Guests & Members</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700 shadow-sm space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Featured on Landing</p>
          <span className="text-3xl font-black text-brand">{featuredCount}</span>
          <p className="text-[9px] text-gray-400 font-bold">Pushed to community hero</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700 shadow-sm space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Pending Replies</p>
          <span className="text-3xl font-black text-amber-600">{pendingReplyCount}</span>
          <p className="text-[9px] text-gray-400 font-bold">Requires admin response</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white dark:bg-slate-800 p-4 rounded-[24px] border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'all', label: 'All Ratings' },
            { id: 'featured', label: '🌟 Featured' },
            { id: 'pending_reply', label: '💬 Needs Reply' },
            { id: '5star', label: '⭐ 5 Stars' },
            { id: 'low', label: '⚠️ Low Ratings (≤3)' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                filter === f.id
                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                  : 'bg-gray-100 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={loadRatings}
          className="text-[10px] font-black uppercase tracking-wider text-brand hover:underline flex items-center gap-1 ml-auto"
        >
          <i className="fa-solid fa-rotate-right"></i> Refresh Ratings
        </button>
      </div>

      {/* List of Ratings */}
      {loading ? (
        <div className="text-center py-16 opacity-40">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-brand mb-2"></i>
          <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Loading App Ratings...</p>
        </div>
      ) : filteredRatings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-[28px] border border-gray-100 dark:border-slate-700 opacity-50 space-y-2">
          <i className="fa-solid fa-star-half-stroke text-5xl text-gray-300 dark:text-slate-600"></i>
          <p className="font-black uppercase tracking-widest text-xs dark:text-white">No ratings found for this filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRatings.map((r) => (
            <div 
              key={r.id} 
              className={`bg-white dark:bg-slate-800 p-6 rounded-[28px] border transition-all shadow-sm space-y-4 relative ${
                r.is_featured 
                  ? 'border-brand/40 ring-1 ring-brand/20' 
                  : 'border-gray-100 dark:border-slate-700'
              }`}
            >
              {/* Header Info */}
              <div className="flex justify-between items-start gap-4 flex-wrap border-b border-gray-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-sm uppercase">
                    {r.user_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{r.user_name}</h4>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        r.user_role === 'Worker' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        r.user_role === 'Client' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                        'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      }`}>
                        {r.user_role || 'Guest'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Category Pill */}
                  {r.category && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-xl">
                      {r.category}
                    </span>
                  )}
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1 rounded-xl text-amber-500 text-xs font-black">
                    <i className="fa-solid fa-star"></i>
                    <span>{r.rating}.0</span>
                  </div>
                </div>
              </div>

              {/* Comment Content */}
              <div className="bg-gray-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-relaxed italic">
                  "{r.comment}"
                </p>
              </div>

              {/* Admin Reply Box if exists */}
              {r.admin_reply && (
                <div className="bg-brand/5 dark:bg-brand/10 p-4 rounded-2xl border border-brand/20 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase text-brand tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-reply"></i> Admin Response
                    </span>
                    {r.admin_replied_at && (
                      <span className="opacity-70">{new Date(r.admin_replied_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    "{r.admin_reply}"
                  </p>
                </div>
              )}

              {/* Inline Reply Form if not replied */}
              {!r.admin_reply && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyInputs[r.id] || ''}
                      onChange={(e) => setReplyInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Write an official response to this review..."
                      className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:border-brand dark:text-white"
                    />
                    <button
                      onClick={() => handleSendReply(r.id)}
                      disabled={processingId === r.id || !replyInputs[r.id]?.trim()}
                      className="bg-brand text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-dark transition-all disabled:opacity-40"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700/60 flex-wrap gap-2">
                <button
                  onClick={() => handleToggleFeatured(r.id, !!r.is_featured)}
                  disabled={processingId === r.id}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    r.is_featured 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-amber-500 hover:text-white'
                  }`}
                >
                  <i className={`fa-solid ${r.is_featured ? 'fa-star' : 'fa-star-of-david'}`}></i>
                  <span>{r.is_featured ? '🌟 Featured on Landing' : 'Push to Landing Page'}</span>
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  {r.admin_reply && (
                    <button
                      onClick={() => {
                        setReplyInputs(prev => ({ ...prev, [r.id]: r.admin_reply || '' }));
                        setRatings(prev => prev.map(item => item.id === r.id ? { ...item, admin_reply: undefined } : item));
                      }}
                      className="text-[10px] font-black uppercase text-gray-500 hover:text-brand px-3 py-1.5"
                    >
                      Edit Reply
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={processingId === r.id}
                    className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
