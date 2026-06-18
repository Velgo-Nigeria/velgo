import React, { useEffect } from 'react';
import { TIERS } from '../lib/constants';
import { VelgoLogo } from '../components/Brand';

interface PricingProps {
  onBack?: () => void;
  onGetStarted?: () => void;
  onLogin?: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onBack, onGetStarted, onLogin }) => {
  
  useEffect(() => {
    // Inject SEO meta tags dynamically for web crawlers, search engines and bots
    document.title = "Velgo Nigeria - Transparent Pricing, No-Commission, No-Escrow Gig Hub";
    
    // Schema Markups for Google Structured Data (JSON-LD)
    const scriptId = "velgo-pricing-structured-data";
    let existingScript = document.getElementById(scriptId);
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.innerHTML = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Velgo Nigeria Professional Token Packs",
        "description": "NIN-verified, 0% commission local gig ecosystem. Powering direct bank transfer settlements without holding escrow.",
        "offers": TIERS.map(tier => ({
          "@type": "Offer",
          "name": tier.name,
          "price": tier.price,
          "priceCurrency": "NGN",
          "eligibleQuantity": {
            "@type": "QuantitativeValue",
            "value": tier.limit,
            "unitText": "Token"
          }
        }))
      });
      document.head.appendChild(script);
    }

    return () => {
      const script = document.getElementById(scriptId);
      if (script) {
        script.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 selection:bg-rose-500 selection:text-white pb-20 antialiased">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/60 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto rounded-b-[24px]">
        <div className="cursor-pointer" onClick={onBack}>
          <VelgoLogo className="h-8 md:h-9" />
        </div>
        <div className="flex items-center gap-4">
          {onLogin && (
            <button 
              onClick={onLogin} 
              className="text-xs font-black uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-2 transition-colors"
            >
              Sign In
            </button>
          )}
          {onGetStarted && (
            <button 
              onClick={onGetStarted} 
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-full text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md shadow-black/5"
            >
              Join Velgo
            </button>
          )}
          {onBack && (
            <button 
              onClick={onBack} 
              className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-10 h-10 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              title="Go Back"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
          )}
        </div>
      </header>

      {/* 2. Page Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-12 space-y-4">
        <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[4px] inline-block animate-pulse">
          Fair, Transparent Pricing
        </span>
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight italic">
          Powering Nigeria's <br className="hidden md:block"/> No-Commission Gig Economy
        </h1>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium max-w-xl mx-auto leading-relaxed">
          Unlock leads, confirm secure bookings, and build your digital reputation. Buy only what you need, with zero recurring trap subscriptions.
        </p>
      </section>

      {/* 3. The 0% Commission & No-Escrow Declaration Segment */}
      <section className="max-w-5xl mx-auto px-6 mb-16">
        <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white p-8 md:p-12 rounded-[40px] shadow-2xl relative overflow-hidden border border-slate-800 space-y-8">
          {/* Holographic Icon */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-80 h-80 opacity-[0.03] select-none pointer-events-none">
            <i className="fa-solid fa-shield-halved text-[280px]"></i>
          </div>

          <div className="max-w-2xl space-y-4 relative z-10">
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1 rounded-full font-black uppercase tracking-[2px]">
              Direct Trust Compact
            </span>
            <h2 className="text-3xl font-black tracking-tight leading-none text-white italic">
              We Don't Hold Escrow. You Keep 100% of Your Earnings.
            </h2>
            <p className="text-xs md:text-sm text-slate-300 font-bold leading-relaxed">
              At Velgo, we believe local trade flourishes when we remove artificial barriers. Traditional platforms lock your money in complex online escrow holding systems, charge hefty withdrawal percentages, and delay cashouts. 
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 relative z-10 border-t border-slate-800">
            <div className="space-y-2">
              <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center text-lg">
                <i className="fa-solid fa-money-bill-transfer"></i>
              </div>
              <h4 className="font-extrabold text-white text-sm">Direct Local Payouts</h4>
              <p className="text-[11px] text-slate-400">All payments are made directly between clients and workers via instant Bank Transfers, USSD, or cash on completion of the task.</p>
            </div>
            
            <div className="space-y-2">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center text-lg">
                <i className="fa-solid fa-percent"></i>
              </div>
              <h4 className="font-extrabold text-white text-sm">Strict 0% Commission</h4>
              <p className="text-[11px] text-slate-400">We take zero cuts from the gig value. Whether the project is for ₦5,000 or ₦1,000,000, you keep every single Kobo earned.</p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 bg-sky-500/10 text-sky-500 rounded-xl flex items-center justify-center text-lg">
                <i className="fa-solid fa-heart-circle-check"></i>
              </div>
              <h4 className="font-extrabold text-white text-sm">Token-Based Leads</h4>
              <p className="text-[11px] text-slate-400">Workers use 1 single Token only when confirming a booking with a client. This prevents spam, ensures seriousness, and guarantees solid results.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pricing Plans Grid */}
      <main className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {TIERS.map((tier) => {
          const isPower = tier.id === 'pro';
          const isStandard = tier.id === 'standard';
          
          return (
            <div 
              key={tier.id}
              className={`p-8 bg-white dark:bg-gray-800 rounded-[35px] border ${isStandard ? 'border-2 border-slate-900 dark:border-white scale-102 lg:scale-105 shadow-xl relative' : 'border-gray-200/60 dark:border-gray-700/60 shadow-sm'} flex flex-col justify-between hover:shadow-md transition-all duration-300`}
            >
              {isStandard && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md z-15">
                  🔥 Best Seller
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{tier.name}</span>
                  <div className="flex items-baseline mt-1 gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">₦{tier.price.toLocaleString()}</span>
                    <span className="text-gray-400 text-xs font-bold font-sans">/pack</span>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-100 dark:bg-gray-750"></div>

                <ul className="space-y-3">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-xs font-extrabold text-gray-700 dark:text-gray-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-[8px]">
                        <i className="fa-solid fa-check"></i>
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2.5 text-xs font-medium text-gray-400">
                    <div className="w-4 h-4 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-400 flex items-center justify-center text-[8px]">
                      <i className="fa-solid fa-minus"></i>
                    </div>
                    <span>No subscription trap</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={onGetStarted}
                  className={`w-full py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${
                    isStandard 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-black/10' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-650'
                  }`}
                >
                  Buy {tier.limit} {tier.limit === 1 ? 'Token' : 'Tokens'}
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {/* 5. FAQ Section for SEO Crawling */}
      <section className="max-w-3xl mx-auto px-6 space-y-8 mb-12">
        <div className="text-center">
          <h3 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-wider">Frequently Asked Questions</h3>
          <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mt-1">Clear Answers for Smart Artisans & Clients</p>
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50 space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">What are Velgo Tokens used for?</h4>
            <p className="text-xs text-gray-500 leading-relaxed dark:text-gray-400">
              Tokens are the marketplace credit for artisans. While registration, listing services, browsing jobs, and talking with potential clients are 100% free, an artisan uses 1 single Token to finalize and accept an official booking.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50 space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">What does "No Escrow" mean for me?</h4>
            <p className="text-xs text-gray-500 leading-relaxed dark:text-gray-400">
              Unlike foreign sites that freeze payments inside third-party holding accounts, Velgo maintains a Direct Settlement system. Once work is completed, the payment happens directly from client to worker at mutually agreed terms, meaning you receive your funds instantly without any fees.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/50 space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Are there any recurring monthly charges?</h4>
            <p className="text-xs text-gray-500 leading-relaxed dark:text-gray-400">
              Absolutely not. You buy tokens only when you need them. Unused tokens have no expiration date, giving you full control over when to work and scale your business.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Footer section */}
      <footer className="max-w-6xl mx-auto text-center border-t border-gray-150 dark:border-gray-800 pt-10 space-y-4 px-6 text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">
        <div>
          <a href="/" onClick={(e) => { e.preventDefault(); if (onBack) onBack(); }} className="hover:text-slate-900 dark:hover:text-white transition-colors">Back To Landing Page</a>
        </div>
        <p className="font-medium text-gray-300 dark:text-gray-600">© 2025 Velgo Nigeria. Edo State Professional Artisan Hub.</p>
      </footer>
    </div>
  );
};
