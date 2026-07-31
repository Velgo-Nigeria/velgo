import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { submitAppRating } from '../lib/appRatings';

interface RateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: Profile | null;
  onSuccess?: () => void;
}

export const RateAppModal: React.FC<RateAppModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSuccess
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userName, setUserName] = useState<string>(profile?.full_name || '');
  const [userRole, setUserRole] = useState<string>(
    profile?.role === 'user' ? 'Worker' : profile?.role === 'admin' ? 'Admin' : 'Guest'
  );

  useEffect(() => {
    if (profile?.full_name) {
      setUserName(profile.full_name);
    }
    if (profile?.role) {
      setUserRole(profile.role === 'user' ? 'Worker' : profile.role === 'admin' ? 'Admin' : 'Guest');
    }
  }, [profile, isOpen]);
  const [category, setCategory] = useState<string>('General Feedback');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Please write a short comment about your experience with Velgo.");
      return;
    }
    if (!userName.trim()) {
      setError("Please provide your name or enter 'Guest'.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await submitAppRating({
        user_id: profile?.id,
        user_name: userName.trim(),
        user_role: userRole,
        rating,
        comment: comment.trim(),
        category,
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSubmitted(false);
        setComment('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError("Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[36px] shadow-2xl border border-gray-100 dark:border-slate-800 p-6 md:p-8 relative overflow-hidden space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center text-sm transition-all"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {submitted ? (
          <div className="py-10 text-center space-y-4 animate-scaleUp">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl shadow-xl shadow-emerald-500/10">
              <i className="fa-solid fa-heart"></i>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Thank You for Rating Velgo!</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto font-medium">
              Your feedback helps us build Nigeria's premier zero-commission gig ecosystem.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Modal Header */}
            <div className="text-center space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[3px] text-brand">App Feedback & Reviews</span>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Rate Your Experience</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Open for both guests & registered users</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-3.5 rounded-2xl font-bold text-center">
                {error}
              </div>
            )}

            {/* Interactive Star Rating */}
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform active:scale-125 focus:outline-none"
                  >
                    <i 
                      className={`fa-solid fa-star text-3xl transition-colors ${
                        (hoverRating || rating) >= star 
                          ? 'text-amber-400 drop-shadow-md' 
                          : 'text-gray-200 dark:text-slate-800'
                      }`}
                    ></i>
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-500">
                {rating === 5 ? '⭐⭐⭐⭐⭐ Excellent (5 Stars)' :
                 rating === 4 ? '⭐⭐⭐⭐ Great (4 Stars)' :
                 rating === 3 ? '⭐⭐⭐ Average (3 Stars)' :
                 rating === 2 ? '⭐⭐ Needs Work (2 Stars)' :
                 '⭐ Poor (1 Star)'}
              </span>
            </div>

            {/* User Name & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 px-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. John Doe or Guest"
                  className="w-full bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 rounded-2xl py-3 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 px-1">
                  Your Role
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 rounded-2xl py-3 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-brand"
                >
                  <option value="Guest">Guest Visitor</option>
                  <option value="Client">Client / Gig Employer</option>
                  <option value="Worker">Service Worker / Freelancer</option>
                </select>
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 px-1">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['General Feedback', 'Usability', 'Gigs & Payments', 'Customer Support'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      category === cat
                        ? 'bg-brand text-white shadow-md shadow-brand/20'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 px-1">
                Your Review / Suggestion
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What do you think about Velgo? Share your thoughts, praise, or ideas..."
                rows={3}
                className="w-full bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 rounded-2xl p-4 text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-brand resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand hover:bg-brand-dark text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand/20 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting Rating...' : 'Submit App Rating'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
