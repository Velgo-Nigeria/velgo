// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { AppRating } from '../types';

interface AllReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratings: AppRating[];
  onOpenRateModal: () => void;
}

export const AllReviewsModal: React.FC<AllReviewsModalProps> = ({
  isOpen,
  onClose,
  ratings,
  onOpenRateModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | 'ALL'>('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  // Compute Aggregate Stats
  const safeRatings = ratings || [];
  const totalCount = safeRatings.length;
  const avgRating = totalCount > 0 
    ? (safeRatings.reduce((acc, r) => acc + (r.rating || 5), 0) / totalCount).toFixed(1)
    : '5.0';

  const breakdown = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    safeRatings.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [safeRatings]);

  // Filter Logic
  const filteredRatings = useMemo(() => {
    return safeRatings.filter((r) => {
      const matchSearch = 
        !searchTerm || 
        (r.user_name && r.user_name.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (r.comment && r.comment.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchCategory = 
        selectedCategory === 'ALL' || 
        (r.category && r.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchStar = 
        selectedRatingFilter === 'ALL' || 
        (selectedRatingFilter === 2 ? (r.rating || 5) <= 2 : Math.round(r.rating || 5) === selectedRatingFilter);

      return matchSearch && matchCategory && matchStar;
    });
  }, [safeRatings, searchTerm, selectedCategory, selectedRatingFilter]);

  if (!isOpen) return null;

  const displayedRatings = filteredRatings.slice(0, visibleCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-[#fcfcfc] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-light text-brand flex items-center justify-center text-lg shadow-sm">
              <i className="fa-solid fa-star"></i>
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-lg sm:text-xl tracking-tight leading-tight">
                Community Ratings & Reviews
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Verified feedback from guests, clients & workers
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-all flex items-center justify-center"
            aria-label="Close modal"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* Google Play Style Rating Summary Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row gap-6 items-center justify-between">
            {/* Big Rating Score */}
            <div className="text-center md:text-left shrink-0 space-y-1">
              <div className="flex items-baseline justify-center md:justify-start gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">{avgRating}</span>
                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">/ 5.0</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <i 
                    key={star} 
                    className={`fa-solid fa-star text-sm ${
                      star <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-gray-600'
                    }`}
                  ></i>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                Based on {totalCount} total reviews
              </p>
            </div>

            {/* Star Breakdown Bars */}
            <div className="w-full max-w-xs space-y-1.5 text-[11px] font-bold text-gray-300">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = breakdown[star] || 0;
                const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-4 text-right">{star}★</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <span className="w-8 text-right text-gray-400 font-medium text-[10px]">{percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reviews or keywords..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-brand focus:bg-white transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { label: 'All Categories', value: 'ALL' },
                { label: 'Usability', value: 'Usability' },
                { label: 'Gigs & Payments', value: 'Gigs & Payments' },
                { label: 'General Feedback', value: 'General Feedback' },
                { label: 'Security & Trust', value: 'Security & Trust' }
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Rating Star Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1 shrink-0">Filter:</span>
              {[
                { label: 'All Stars', value: 'ALL' },
                { label: '5 ★', value: 5 },
                { label: '4 ★', value: 4 },
                { label: '3 ★', value: 3 },
                { label: '≤ 2 ★', value: 2 },
              ].map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setSelectedRatingFilter(filter.value)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all ${
                    selectedRatingFilter === filter.value
                      ? 'bg-amber-400 text-gray-900 shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Reviews */}
          <div className="space-y-4">
            {displayedRatings.length > 0 ? (
              displayedRatings.map((r) => (
                <div 
                  key={r.id} 
                  className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 text-brand font-black flex items-center justify-center text-xs shrink-0 border border-brand/20">
                        {r.user_name ? r.user_name.substring(0, 2).toUpperCase() : 'GU'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-gray-900 text-sm tracking-tight">{r.user_name}</h4>
                          <span className="px-2 py-0.5 bg-brand-light text-brand text-[8px] font-black uppercase tracking-wider rounded-full">
                            {r.user_role || 'Community Member'}
                          </span>
                          {r.user_role && r.user_role.toLowerCase() !== 'guest' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <i className="fa-solid fa-circle-check text-emerald-500"></i>
                              Verified User
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-400 font-medium">Guest Feedback</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                        </p>
                      </div>
                    </div>

                    {/* Star Score Badge */}
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i 
                            key={star} 
                            className={`fa-solid fa-star text-xs ${
                              star <= (r.rating || 5) ? 'text-amber-400' : 'text-gray-200'
                            }`}
                          ></i>
                        ))}
                      </div>
                      {r.category && (
                        <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200/50">
                          {r.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Comment */}
                  <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed italic">
                    "{r.comment}"
                  </p>

                  {/* Official Admin Reply */}
                  {r.admin_reply && (
                    <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-3 sm:p-4 space-y-1.5 text-left shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-[9px]">
                          <i className="fa-solid fa-shield-halved"></i>
                        </span>
                        <span className="text-[10px] font-black text-brand uppercase tracking-wider">
                          Response from Velgo Team
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 font-medium leading-relaxed pl-7">
                        "{r.admin_reply}"
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-lg">
                  <i className="fa-solid fa-comment-slash"></i>
                </div>
                <p className="text-xs font-bold text-gray-500">No reviews match your selected filters.</p>
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); setSelectedRatingFilter('ALL'); }}
                  className="text-[10px] font-black text-brand uppercase tracking-wider hover:underline"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          {/* Load More Button */}
          {visibleCount < filteredRatings.length && (
            <div className="text-center pt-2">
              <button 
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black uppercase tracking-wider px-6 py-3 rounded-full transition-colors"
              >
                Load More Reviews ({filteredRatings.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-[#fcfcfc] flex items-center justify-between gap-3 shrink-0">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider hidden sm:block">
            Showing {displayedRatings.length} of {filteredRatings.length} reviews
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                onClose();
                onOpenRateModal();
              }}
              className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-gray-900 font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-star text-xs"></i>
              Write a Review
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-2xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
