
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { VelgoLogo } from '../components/Brand';

interface LandingProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onViewLegal: (tab: string) => void;
  onViewAbout: () => void;
  onNavigate?: (view: string, data?: any) => void;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onLogin, onViewLegal, onViewAbout, onNavigate }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Review Form State
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-play timer ref
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data } = await supabase.from('app_reviews').select('*, profiles:user_id(full_name, role)').order('created_at', { ascending: false }).limit(6);
    
    if (data && data.length > 0) {
      setReviews(data.map(d => ({
          id: d.id,
          user_name: d.profiles?.full_name || 'Verified User',
          comment: d.review_text,
          rating: d.rating,
          is_worker: d.profiles?.role === 'user'
      })));
    } else {
      setReviews([
        { id: 1, user_name: "Ose Architecture", comment: "Velgo has changed how I hire artisans. The zero-commission model means my money goes straight to the worker's family.", rating: 5, is_worker: true },
        { id: 2, user_name: "Moriah Indo", comment: "The best platform for Nigerian professionals to scale their business effortlessly. I got 3 bookings in my first week!", rating: 5, is_worker: true },
        { id: 3, user_name: "Tega Design", comment: "Seamless payments and great interface. Highly recommended for every entrepreneur in Edo State.", rating: 5, is_worker: true }
      ]);
    }
  };

  const nextSlide = () => {
    if (reviews.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
    resetTimer();
  };

  const prevSlide = () => {
    if (reviews.length === 0) return;
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
    }, 6000);
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
      {/* 1. Hero Section */}
      <div className="relative h-[65vh] flex flex-col justify-end px-6 pb-10 overflow-hidden bg-gray-900 rounded-b-[48px] shadow-2xl z-10">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1574950578143-858c6fc58922?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover opacity-40 scale-105"
            alt="Nigerian Worker"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
        </div>

        {/* 3D LOGO HERO PLACEMENT */}
        <div className="absolute top-20 right-6 z-0 animate-pulse pointer-events-none opacity-90">
             <img
                src="https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png"
                className="w-32 h-32 md:w-56 md:h-56 object-contain drop-shadow-[0_20px_50px_rgba(0,128,0,0.5)]"
                alt="Velgo 3D Icon"
            />
        </div>

        <div className="relative z-10 space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center w-full">
             <VelgoLogo variant="light" className="h-12" />
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => onNavigate && onNavigate('pricing')} 
                 className="px-4 py-2 text-[11px] font-black uppercase text-white/95 hover:text-white transition-all bg-white/10 hover:bg-white/20 rounded-full border border-white/10"
               >
                 Pricing
               </button>
               <button onClick={onLogin} className="velgo-glass px-6 py-2.5 rounded-full text-[11px] font-black uppercase text-white hover:bg-white/20 transition-all">Sign In</button>
             </div>
          </div>
          
          <h1 className="text-5xl font-black text-white leading-[0.95] tracking-tighter mt-4 drop-shadow-lg">
            The Trusted <br/>
            Gig <span className="text-brand">Hub</span> <br/>
            For Naija.
          </h1>
          
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => onGetStarted('user')}
              className="flex-1 bg-brand text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl shadow-brand/30 active:scale-95 transition-transform border border-white/10"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* 2. Trust Affirmations (Guarantees) */}
      <div className="py-12 bg-white border-b border-gray-100">
         <div className="max-w-6xl mx-auto px-6">
            <p className="text-center text-[10px] font-black uppercase tracking-[4px] text-gray-400 mb-8">Platform Guarantees</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-brand-light/30 rounded-[32px] border border-brand/10 space-y-4 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center text-xl shadow-lg shadow-brand/20"><i className="fa-solid fa-bolt-lightning"></i></div>
                    <div>
                        <h3 className="font-black text-gray-900 text-xl leading-none">0% Fee</h3>
                        <p className="text-sm text-gray-500 font-medium mt-3 leading-relaxed">Workers take home every single Kobo earned. No middleman cuts.</p>
                    </div>
                </div>
                <div className="p-8 bg-blue-50/50 rounded-[32px] border border-blue-100 space-y-4 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-lg shadow-blue-200"><i className="fa-solid fa-user-shield"></i></div>
                    <div>
                        <h3 className="font-black text-gray-900 text-xl leading-none">Verified ID</h3>
                        <p className="text-sm text-gray-500 font-medium mt-3 leading-relaxed">NIN-verified profiles ensure you always hire real, local professionals.</p>
                    </div>
                </div>
                <div className="p-8 bg-purple-50/50 rounded-[32px] border border-purple-100 space-y-4 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-200"><i className="fa-solid fa-handshake"></i></div>
                    <div>
                        <h3 className="font-black text-gray-900 text-xl leading-none">Safe Work</h3>
                        <p className="text-sm text-gray-500 font-medium mt-3 leading-relaxed">A strict community code ensures mutual respect and service quality.</p>
                    </div>
                </div>
            </div>
         </div>
      </div>

      {/* 3. Pricing & Transparency Section (Side-by-Side) */}
      <div className="py-16 bg-gray-50">
         <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3 px-6">
                <p className="text-[10px] font-black uppercase tracking-[5px] text-brand">How It Works</p>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter italic lg:max-w-2xl lg:mx-auto">How Velgo Works</h2>
                <p className="text-base text-gray-500 font-medium max-w-xl mx-auto">We empower both sides of the hub with full transparency.</p>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 px-6">
                
                {/* Service Providers Card */}
                <div className="bg-white p-10 md:p-12 rounded-[48px] border-2 border-brand/10 shadow-xl space-y-8 flex flex-col hover:shadow-2xl hover:border-brand/30 transition-all">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-brand/10 text-brand flex items-center justify-center text-2xl"><i className="fa-solid fa-briefcase"></i></div>
                        <h3 className="font-black text-gray-900 text-3xl tracking-tight">Offering a Service</h3>
                    </div>
                    <div className="flex-1 space-y-5">
                        <div className="flex items-start gap-4">
                            <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-check text-[11px] text-brand"></i></div>
                            <p className="text-base font-bold text-gray-700 leading-snug">Keep <span className="text-brand">100%</span> of your labor fee.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-check text-[11px] text-brand"></i></div>
                            <p className="text-base font-bold text-gray-700 leading-snug">Setup your profile and list your services in minutes.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-check text-[11px] text-brand"></i></div>
                            <p className="text-base font-bold text-gray-700 leading-snug">Uses 1 Token only when confirming a booking.</p>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-gray-100 text-center">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Get Started</p>
                        <p className="text-4xl font-black text-gray-900 italic">2 Free <span className="text-base font-medium text-gray-400">Tokens</span></p>
                    </div>
                </div>

                {/* Clients Card */}
                <div className="bg-gray-900 p-10 md:p-12 rounded-[48px] border-2 border-white/5 shadow-2xl space-y-8 flex flex-col text-white">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-white/10 text-white flex items-center justify-center text-2xl"><i className="fa-solid fa-shield-check"></i></div>
                        <h3 className="font-black text-white text-3xl tracking-tight">Hiring a Service</h3>
                    </div>
                    <div className="flex-1 space-y-5">
                        <div className="flex items-start gap-4">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-check text-[11px] text-brand"></i></div>
                            <p className="text-base font-bold text-gray-200 leading-snug">Zero middleman markup on artisan labor.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-check text-[11px] text-brand"></i></div>
                            <p className="text-base font-bold text-gray-200 leading-snug">Post tasks and receive bids from vetted professionals.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-check text-[11px] text-brand"></i></div>
                            <p className="text-base font-bold text-gray-200 leading-snug">Uses 1 Token only when confirming a booking.</p>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-white/10 text-center">
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Transparent Value</p>
                        <p className="text-4xl font-black text-white italic">1 Account. <span className="text-lg font-medium text-gray-500">2 Roles.</span></p>
                    </div>
                </div>

            </div>

            <div className="text-center px-6">
                <p className="text-[11px] text-gray-400 font-black uppercase tracking-[4px]">
                    Transparent Economy • Verified Pros • Direct Payouts
                </p>
            </div>
         </div>
      </div>

      {/* 4. About Us Section */}
      <div className="py-10 px-6 bg-white border-b border-gray-100">
           <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-brand-light text-brand rounded-3xl flex items-center justify-center mx-auto mb-2 text-2xl rotate-3 shadow-lg shadow-brand/10">
                <i className="fa-solid fa-quote-left"></i>
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Our Mission</h2>
              <p className="text-lg text-gray-600 leading-relaxed font-medium">
                 Born in Edo State, Velgo is Nigeria's premier zero-commission gig marketplace. We empower artisans and professionals by connecting them directly with clients—no hidden fees, no deductions.
              </p>
              <button 
                  onClick={onViewAbout} 
                  className="inline-block mt-2 text-[11px] font-black text-brand uppercase tracking-widest border-b-2 border-brand/20 pb-1 hover:border-brand transition-colors"
              >
                  Read Our Story & FAQs
              </button>
           </div>
      </div>

      {/* 5. Community Reviews Section */}
      <div className="py-12 px-6 bg-[#fcfcfc] overflow-hidden">
        <div className="max-w-xl mx-auto space-y-8">
             <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[5px] text-brand">Real Stories</p>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Voices of the Community</h2>
             </div>
             
             {reviews.length > 0 ? (
                <div className="relative">
                    {/* Carousel Container */}
                    <div className="relative overflow-visible">
                        <div 
                            className="flex transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)" 
                            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                        >
                            {reviews.map((r, i) => (
                                <div key={r.id} className="min-w-full px-2 pt-10">
                                    <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 p-8 md:p-12 relative flex flex-col items-center">
                                        
                                        {/* Overlapping Avatar */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                                            <div className="w-24 h-24 rounded-full border-[6px] border-[#fcfcfc] bg-white shadow-xl overflow-hidden">
                                                <img 
                                                    src={`https://ui-avatars.com/api/?name=${r.user_name}&background=008000&color=fff&size=200`} 
                                                    className="w-full h-full object-cover" 
                                                    alt={r.user_name}
                                                />
                                            </div>
                                            <div className="absolute bottom-0 right-0 bg-yellow-400 text-white w-7 h-7 rounded-full border-[3px] border-white flex items-center justify-center text-[10px] shadow-lg">
                                                <i className="fa-solid fa-star"></i>
                                            </div>
                                        </div>

                                        <div className="mt-10 text-center space-y-6">
                                            <p className="text-xl md:text-2xl font-medium text-gray-800 italic leading-snug tracking-tight">
                                                "{r.comment}"
                                            </p>
                                            
                                            <div className="space-y-2 pt-2">
                                                <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">{r.user_name}</h4>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="px-3 py-1 bg-brand-light text-brand text-[9px] font-black uppercase tracking-[2px] rounded-full">
                                                        Community Member
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-bold">•</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verified User</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex flex-col items-center gap-6 mt-8">
                        {/* Indicator Dots */}
                        <div className="flex justify-center gap-3">
                            {reviews.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => goToSlide(i)}
                                    className={`h-2 rounded-full transition-all duration-500 ease-out ${i === currentIndex ? 'w-10 bg-brand' : 'w-2 bg-gray-200 hover:bg-gray-300'}`}
                                    aria-label={`Go to slide ${i + 1}`}
                                />
                            ))}
                        </div>

                        {/* Arrows */}
                        <div className="flex gap-4">
                            <button 
                                onClick={prevSlide}
                                className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 text-gray-400 hover:text-brand hover:border-brand transition-all active:scale-90 flex items-center justify-center group"
                            >
                                <i className="fa-solid fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
                            </button>
                            <button 
                                onClick={nextSlide}
                                className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 text-gray-400 hover:text-brand hover:border-brand transition-all active:scale-90 flex items-center justify-center group"
                            >
                                <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                            </button>
                        </div>
                    </div>
                </div>
             ) : (
                <div className="py-12 text-gray-300 text-sm font-bold uppercase tracking-widest text-center">
                    Loading community voices...
                </div>
             )}
        </div>
      </div>

      {/* 6. Rate Us Section */}
      <div className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-sm mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h3 className="text-3xl font-black tracking-tight">Share Your Love</h3>
                <p className="text-xs text-gray-400 font-medium">Your feedback helps us grow the community.</p>
            </div>

            {submitted ? (
                <div className="bg-brand/10 p-10 rounded-[40px] text-center border border-brand/20 animate-fadeIn">
                    <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-brand/30">
                        <i className="fa-solid fa-heart text-3xl"></i>
                    </div>
                    <p className="font-black text-brand-light uppercase tracking-widest text-sm">Review Submitted!</p>
                </div>
            ) : (
                <div className="space-y-4 relative">
                    {/* Locked Form overlay */}
                    <div className="absolute inset-0 z-10 bg-gray-900/60 backdrop-blur-sm rounded-[32px] flex items-center justify-center flex-col text-center p-6 border border-white/10">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white text-xl mb-3">
                            <i className="fa-solid fa-lock"></i>
                        </div>
                        <h4 className="text-white font-black text-lg mb-1">Members Only</h4>
                        <p className="text-gray-300 text-xs font-medium mb-4">You must be logged in and verified to submit a review.</p>
                        <button onClick={onLogin} className="bg-white text-gray-900 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-gray-100 transition-colors">
                            Sign In to Write Review
                        </button>
                    </div>

                    <div className="opacity-40 pointer-events-none p-2 space-y-4">
                        <div className="flex justify-center gap-4 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button 
                                    key={star} 
                                    type="button"
                                    className="text-4xl text-gray-800"
                                >
                                    <i className="fa-solid fa-star"></i>
                                </button>
                            ))}
                        </div>
                        
                        <div className="space-y-4">
                            <input 
                                placeholder="Your Name"
                                disabled
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white placeholder-gray-500 outline-none"
                            />
                            
                            <textarea 
                                placeholder="What do you think about Velgo?"
                                rows={4}
                                disabled
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-medium text-white placeholder-gray-500 outline-none resize-none"
                            />
                        </div>

                        <button 
                            disabled
                            className="w-full bg-brand text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl opacity-50"
                        >
                            Post Review
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#fcfcfc] border-t border-gray-100 py-10 text-center space-y-8 mt-auto px-6">
          <VelgoLogo className="h-8 mx-auto opacity-30 grayscale" />
          
          <div className="flex justify-center gap-5">
             <a href="https://facebook.com" target="_blank" className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-600 hover:shadow-lg transition-all"><i className="fa-brands fa-facebook-f"></i></a>
             <a href="https://twitter.com" target="_blank" className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:shadow-lg transition-all"><i className="fa-brands fa-twitter"></i></a>
             <a href="https://instagram.com" target="_blank" className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-pink-600 hover:border-pink-600 hover:shadow-lg transition-all"><i className="fa-brands fa-instagram"></i></a>
             <a href="https://whatsapp.com" target="_blank" className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-600 hover:shadow-lg transition-all"><i className="fa-brands fa-whatsapp"></i></a>
          </div>

          <div className="flex justify-center gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <a href="/pricing" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('pricing'); }} className="hover:text-gray-900 font-bold">Pricing</a>
              <a href="/terms" onClick={(e) => { e.preventDefault(); onViewLegal('tos'); }} className="hover:text-gray-900">Terms</a>
              <a href="/privacy" onClick={(e) => { e.preventDefault(); onViewLegal('privacy'); }} className="hover:text-gray-900">Privacy</a>
              <a href="/legal?tab=guidelines" onClick={(e) => { e.preventDefault(); onViewLegal('guidelines'); }} className="hover:text-gray-900">Guidelines</a>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] text-gray-400 uppercase tracking-widest">© 2025 Velgo Nigeria.</p>
             <p className="text-[8px] text-gray-300 font-black uppercase tracking-[3px]">A Division of Universal Empire</p>
          </div>
      </div>
    </div>
  );
};

export default Landing;
