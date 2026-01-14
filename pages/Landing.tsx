
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserRole } from '../types';
import { VelgoLogo } from '../components/Brand';

interface LandingProps {
  onGetStarted: (role: UserRole) => void;
  onLogin: () => void;
  onViewLegal: (tab: string) => void;
  onViewAbout: () => void;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onLogin, onViewLegal, onViewAbout }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Review Form State
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-play timer ref
  // FIX: Using any instead of NodeJS.Timeout to avoid namespace errors in browser environment
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data } = await supabase.from('app_reviews').select('*').order('created_at', { ascending: false }).limit(6);
    if (data && data.length > 0) {
      setReviews(data);
    }
  };

  // Carousel Navigation
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
    resetTimer();
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    resetTimer();
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    resetTimer();
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimer();
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      if (reviews.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % reviews.length);
      }
    }, 5000);
  };

  useEffect(() => {
    if (reviews.length > 0) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;
    setSubmitting(true);
    
    const { error } = await supabase.from('app_reviews').insert([{
      user_name: reviewName,
      comment: reviewComment,
      rating: reviewRating
    }]);

    if (!error) {
      setSubmitted(true);
      fetchReviews();
      setReviewName('');
      setReviewComment('');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero Section */}
      <div className="relative h-[60vh] flex flex-col justify-end px-6 pb-12 overflow-hidden bg-gray-900 rounded-b-[40px] shadow-2xl z-10">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1574950578143-858c6fc58922?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover opacity-40"
            alt="Nigerian Worker"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        </div>

        <div className="relative z-10 space-y-5 animate-fadeIn">
          <div className="flex justify-between items-start">
             <VelgoLogo variant="light" className="h-12" />
             <button onClick={onLogin} className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-full text-[10px] font-black uppercase text-white border border-white/20">Sign In</button>
          </div>
          
          <h1 className="text-4xl font-black text-white leading-[1.05] tracking-tight mt-4">
            The Trusted App <br/>
            Bridging <span className="text-brand">Workers</span> <br/>
            & Clients.
          </h1>
          
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => onGetStarted('client')}
              className="flex-1 bg-brand text-white py-4 rounded-2xl font-black text-sm uppercase shadow-lg shadow-brand/20 active:scale-95 transition-transform"
            >
              Hire Help
            </button>
            <button 
              onClick={() => onGetStarted('worker')}
              className="flex-1 bg-white text-gray-900 py-4 rounded-2xl font-black text-sm uppercase shadow-lg active:scale-95 transition-transform"
            >
              Earn Money
            </button>
          </div>
        </div>
      </div>

      {/* Trust Affirmations (Ticker) */}
      <div className="bg-brand-light py-6 overflow-hidden">
         <div className="px-6 space-y-4">
            <p className="text-center text-[10px] font-black uppercase tracking-[3px] text-brand opacity-70">Our Guarantee</p>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                <div className="snap-center shrink-0 w-64 p-5 bg-white rounded-[24px] border-2 border-brand/20 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-brand text-white text-[9px] font-black px-2 py-1 rounded-bl-lg">100% YOURS</div>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-3 text-brand text-lg"><i className="fa-solid fa-hand-holding-dollar"></i></div>
                    <h3 className="font-black text-gray-900 text-lg">0% Commission</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">Workers keep 100% of the agreed price. No platform deductions.</p>
                </div>
                <div className="snap-center shrink-0 w-64 p-5 bg-white rounded-[24px] border border-brand/10 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3 text-blue-600 text-lg"><i className="fa-solid fa-user-shield"></i></div>
                    <h3 className="font-black text-gray-900 text-lg">Verified Workers</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">We verify IDs and addresses so you can hire with peace of mind.</p>
                </div>
                <div className="snap-center shrink-0 w-64 p-5 bg-white rounded-[24px] border border-brand/10 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-3 text-purple-600 text-lg"><i className="fa-solid fa-scale-balanced"></i></div>
                    <h3 className="font-black text-gray-900 text-lg">Fair Guidelines</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">A strict code of conduct ensures respect and quality service for all.</p>
                </div>
            </div>
         </div>
      </div>

      {/* About Us Section */}
      <div className="py-12 px-6 bg-white border-b border-gray-50">
           <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center mx-auto mb-2"><i className="fa-solid fa-quote-left"></i></div>
              <h2 className="text-2xl font-black text-gray-900">About Velgo</h2>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                 Velgo is Nigeria's premier zero-commission gig marketplace. Born in Edo State, our mission is to empower local artisans and professionals by connecting them directly with clients—no middleman, no hidden fees. We believe in the dignity of labour and the power of technology to bridge the gap.
              </p>
              <button 
                  onClick={onViewAbout} 
                  className="inline-block mt-2 text-xs font-black text-brand uppercase tracking-widest border-b-2 border-brand/20 pb-1 hover:border-brand transition-colors"
              >
                  Read Our Story & FAQs
              </button>
           </div>
      </div>

      {/* Community Reviews Carousel */}
      <div className="py-16 px-6 bg-white overflow-hidden">
        <div className="max-w-xl mx-auto text-center space-y-8">
             <div className="space-y-1">
                <h2 className="text-3xl font-black text-gray-900">Naija Loves Velgo</h2>
                <p className="text-sm text-gray-500 font-medium">Voices from our growing marketplace.</p>
             </div>
             
             {reviews.length > 0 ? (
                <div className="relative group">
                    {/* Carousel Container */}
                    <div className="relative overflow-hidden rounded-[40px] border border-gray-100 bg-gray-50 shadow-sm">
                        <div 
                            className="flex transition-transform duration-500 ease-in-out" 
                            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                        >
                            {reviews.map((r, i) => (
                                <div key={r.id} className="min-w-full p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full bg-brand-light flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                                            <img 
                                                src={`https://ui-avatars.com/api/?name=${r.user_name}&background=008000&color=fff&size=128`} 
                                                className="w-full h-full object-cover" 
                                                alt={r.user_name}
                                            />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-[10px]">
                                            <i className="fa-solid fa-star"></i>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-lg md:text-xl font-medium text-gray-800 italic leading-relaxed">
                                            "{r.comment}"
                                        </p>
                                        <div className="space-y-1">
                                            <h4 className="font-black text-gray-900 text-base">{r.user_name}</h4>
                                            <span className="inline-block px-3 py-1 bg-brand/10 text-brand text-[9px] font-black uppercase tracking-widest rounded-full">
                                                Community Member
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="absolute inset-y-0 -left-4 md:-left-8 flex items-center">
                        <button 
                            onClick={prevSlide}
                            className="w-10 h-10 rounded-full shadow-lg border border-gray-50 text-gray-400 hover:text-brand transition-all active:scale-90 flex items-center justify-center"
                        >
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                    </div>
                    <div className="absolute inset-y-0 -right-4 md:-right-8 flex items-center">
                        <button 
                            onClick={nextSlide}
                            className="w-10 h-10 rounded-full shadow-lg border border-gray-50 text-gray-400 hover:text-brand transition-all active:scale-90 flex items-center justify-center"
                        >
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>

                    {/* Indicator Dots */}
                    <div className="flex justify-center gap-3 mt-8">
                        {reviews.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goToSlide(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-brand' : 'w-2 bg-gray-200 hover:bg-gray-300'}`}
                            />
                        ))}
                    </div>
                </div>
             ) : (
                <div className="py-20 text-gray-300 text-sm font-bold uppercase tracking-widest">
                    No reviews yet. Be the first to share!
                </div>
             )}
        </div>
      </div>

      {/* Rate Us Section */}
      <div className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-sm mx-auto space-y-8">
            <div className="text-center">
                <h3 className="text-2xl font-black">Rate Your Experience</h3>
                <p className="text-xs text-gray-400 mt-1">Help us build the most trusted gig app in Naija.</p>
            </div>

            {submitted ? (
                <div className="bg-brand/10 p-8 rounded-[32px] text-center border border-brand/20 animate-fadeIn">
                    <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-brand/30">
                        <i className="fa-solid fa-heart text-2xl"></i>
                    </div>
                    <p className="font-black text-brand-light uppercase tracking-widest text-sm">Thank you for the love!</p>
                </div>
            ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div className="flex justify-center gap-3 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button 
                                key={star} 
                                type="button"
                                onClick={() => setReviewRating(star)}
                                className={`text-3xl transition-all duration-200 active:scale-125 ${star <= reviewRating ? 'text-yellow-400 drop-shadow-lg' : 'text-gray-700 hover:text-gray-600'}`}
                            >
                                <i className="fa-solid fa-star"></i>
                            </button>
                        ))}
                    </div>
                    
                    <div className="space-y-3">
                        <input 
                            value={reviewName}
                            onChange={(e) => setReviewName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white placeholder-gray-500 outline-none focus:border-brand focus:bg-white/10 transition-all"
                            required
                        />
                        
                        <textarea 
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="What do you think about Velgo?"
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white placeholder-gray-500 outline-none focus:border-brand focus:bg-white/10 transition-all resize-none"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full bg-brand text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand/10 hover:bg-brand-dark active:scale-95 transition-all"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <i className="fa-solid fa-circle-notch animate-spin"></i> Posting...
                            </span>
                        ) : 'Submit Review'}
                    </button>
                </form>
            )}
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="bg-gray-50 border-t border-gray-100 py-10 text-center space-y-6 mt-auto">
          <VelgoLogo className="h-6 mx-auto opacity-30 grayscale" />
          
          <div className="flex justify-center gap-6">
             <a href="https://facebook.com" target="_blank" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-600 transition-all"><i className="fa-brands fa-facebook-f"></i></a>
             <a href="https://twitter.com" target="_blank" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:border-blue-400 transition-all"><i className="fa-brands fa-twitter"></i></a>
             <a href="https://instagram.com" target="_blank" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-pink-600 hover:border-pink-600 transition-all"><i className="fa-brands fa-instagram"></i></a>
             <a href="https://whatsapp.com/channel/0029Vb6sLaWGOj9upwLX6s2v" target="_blank" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-600 transition-all"><i className="fa-brands fa-whatsapp"></i></a>
          </div>

          <div className="flex justify-center gap-4 text-[10px] font-bold text-gray-400 uppercase">
              <button onClick={() => onViewLegal('tos')}>Terms</button>
              <button onClick={() => onViewLegal('privacy')}>Privacy</button>
              <button onClick={() => onViewLegal('guidelines')}>Guidelines</button>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] text-gray-400 uppercase tracking-widest">© 2025 Velgo Nigeria.</p>
             <p className="text-[8px] text-gray-300 font-black uppercase tracking-[2px]">A Division of Universal Empire</p>
          </div>
      </div>
    </div>
  );
};

export default Landing;
