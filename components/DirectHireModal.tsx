import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile, TaskUrgency, BudgetType } from '../lib/types';
import { NIGERIA_STATES, NIGERIA_LGAS } from '../lib/locations';
import { CategoryAvatar } from './CategoryAvatar';

interface DirectHireModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Profile;
  clientProfile: Profile | null;
  onSuccess: () => void;
  onUpgrade?: () => void;
}

export const DirectHireModal: React.FC<DirectHireModalProps> = ({
  isOpen,
  onClose,
  worker,
  clientProfile,
  onSuccess,
  onUpgrade
}) => {
  // Form State
  const [description, setDescription] = useState('');
  const [selectedState, setSelectedState] = useState(clientProfile?.state || worker?.state || 'Lagos');
  const [selectedLGA, setSelectedLGA] = useState(clientProfile?.lga || worker?.lga || '');
  const [address, setAddress] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetType, setBudgetType] = useState<BudgetType>('fixed');
  const [urgency, setUrgency] = useState<TaskUrgency>('normal');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync state & LGA options
  useEffect(() => {
    if (clientProfile?.state) {
      setSelectedState(clientProfile.state);
      if (clientProfile?.lga) {
        setSelectedLGA(clientProfile.lga);
      }
    } else if (worker?.state) {
      setSelectedState(worker.state);
      if (worker?.lga) {
        setSelectedLGA(worker.lga);
      }
    }
  }, [clientProfile, worker, isOpen]);

  useEffect(() => {
    if (NIGERIA_LGAS[selectedState]) {
      if (!NIGERIA_LGAS[selectedState].includes(selectedLGA)) {
        setSelectedLGA(NIGERIA_LGAS[selectedState][0] || '');
      }
    } else {
      setSelectedLGA('');
    }
  }, [selectedState]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientProfile) {
      if ((window as any).triggerAuthGate) {
        (window as any).triggerAuthGate("Sign in to Hire", "Create an account or sign in to book artisans directly on Velgo.");
      } else {
        setError("Please sign in or create an account to send work requests.");
      }
      return;
    }

    if (!clientProfile.is_verified) {
      setError("Verification Required: To eliminate fake requests, please verify your identity (NIN) in your profile before hiring professionals.");
      return;
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc || trimmedDesc.length < 15) {
      setError("Please provide a short heading and clear description of the work needed (at least 15 characters).");
      return;
    }

    const numericBudget = parseInt(budget.replace(/[^0-9]/g, ''), 10) || 0;
    if (budgetType === 'fixed' && numericBudget <= 0) {
      setError("Please specify a valid budget amount in Naira for this job.");
      return;
    }

    // Safety checks against contact sharing in briefs before booking acceptance
    const phoneRegex = /(?:\+?234|0)[789][01]\d{8}/;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (phoneRegex.test(trimmedDesc) || phoneRegex.test(address)) {
      setError("Safety Filter: Direct phone numbers cannot be placed in the job brief. Contact details unlock automatically after the artisan accepts your in-app request.");
      return;
    }
    if (emailRegex.test(trimmedDesc)) {
      setError("Safety Filter: Email addresses are not allowed in the job brief. Please keep coordination inside Velgo.");
      return;
    }

    setLoading(true);

    try {
      // Derive clean title from first line of heading
      const firstLine = trimmedDesc.split('\n')[0].replace(/^(heading|title|job|work):?\s*/i, '').trim();
      const jobTitle = firstLine.length > 3 ? firstLine.slice(0, 60) : `Direct Work Request`;
      const fullLocation = address.trim() 
        ? `${address.trim()}, ${selectedLGA}, ${selectedState}`
        : `${selectedLGA}, ${selectedState}`;

      const urgencyLabel = urgency === 'emergency' ? '🚨 Emergency' : urgency === 'urgent' ? '⚡ Urgent' : '🗓️ Normal';
      const budgetLabel = budgetType === 'negotiable' 
        ? `₦${numericBudget.toLocaleString()} (Negotiable Offer)` 
        : `₦${numericBudget.toLocaleString()} (Fixed Budget)`;

      // Structured Job Brief stored directly on the direct booking record
      const fullJobBrief = `${jobTitle}\n\n${trimmedDesc}\n\n📍 Location: ${fullLocation}\n💰 Proposed Budget: ${budgetLabel}\n⏱️ Urgency: ${urgencyLabel}`;

      // Insert directly into bookings table (NO public task creation to avoid polluting the public marketplace)
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          client_id: clientProfile.id,
          worker_id: worker.id,
          task_id: null,
          status: 'pending',
          quote_price: numericBudget,
          quote_notes: fullJobBrief
        }])
        .select('id')
        .single();

      if (bookingError) throw bookingError;

      // Trigger In-App Notification to Artisan (Zero WhatsApp)
      try {
        await supabase.from('notifications').insert([{
          user_id: worker.id,
          title: '💼 New Direct Job Request',
          message: `${clientProfile.full_name} sent you a private work request: "${jobTitle}" (${selectedLGA}, ${selectedState}). Open Activity to review!`,
          type: 'booking_request'
        }]);
      } catch (notifErr) {
        console.warn("Notification logging non-fatal:", notifErr);
      }

      setIsSuccess(true);
      onSuccess();
    } catch (err: any) {
      console.error("Direct hire submission failed:", err);
      setError(err.message || "Failed to submit request. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <CategoryAvatar
              avatarUrl={worker.avatar_url}
              category={worker.category}
              fullName={worker.full_name}
              className="w-12 h-12 rounded-2xl shrink-0"
              iconClassName="text-xl"
            />
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Direct Work Request
              </span>
              <h2 className="text-base font-black text-gray-900 dark:text-white truncate">
                Hire {worker.full_name}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {worker.subcategory || worker.category || 'General Artisan'} • {worker.lga || worker.state || 'Nigeria'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center transition-colors shrink-0"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isSuccess ? (
            /* Success State */
            <div className="text-center py-8 space-y-5">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto animate-bounce">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Work Request Sent!
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Your job brief was delivered to <b>{worker.full_name}</b>. You can track their response in your <b>Activity</b> tab.
                </p>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-500/20 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <i className="fa-solid fa-shield-halved"></i>
                  <span>Velgo Marketplace Protection</span>
                </div>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-normal">
                  Contact coordination unlocks as soon as {worker.full_name} accepts your request in the app. Tokens are deducted upon in-app acceptance.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3.5 bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-brand/20 active:scale-95 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                  <i className="fa-solid fa-circle-exclamation text-sm shrink-0 mt-0.5"></i>
                  <span className="leading-tight font-medium">{error}</span>
                </div>
              )}

              {/* 1. Description Field (Heading + Details) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Job Brief (Heading & Details) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[9px] text-gray-400 font-bold">
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  rows={4}
                  required
                  placeholder="Heading: Fix Leaking Kitchen Pipe&#10;Details: The pipe under the sink has a crack causing water overflow. Need replacement pipe and quick sealing today."
                  className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none font-medium leading-relaxed"
                />
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  Write a clear summary so {worker.full_name} knows the exact problem and tools required.
                </p>
              </div>

              {/* 2. Location (State & LGA) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand"
                  >
                    {NIGERIA_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    LGA <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedLGA}
                    onChange={(e) => setSelectedLGA(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand"
                  >
                    {(NIGERIA_LGAS[selectedState] || []).map((lga) => (
                      <option key={lga} value={lga}>{lga}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Address (Specific Street Only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Street Address / Landmark <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                  className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand"
                />
              </div>

              {/* 4. Budget & Budget Type */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Proposed Budget (₦) <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Fixed vs Negotiable switch */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setBudgetType('fixed')}
                      className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg transition-all ${
                        budgetType === 'fixed' 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      Fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => setBudgetType('negotiable')}
                      className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg transition-all ${
                        budgetType === 'negotiable' 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      Negotiable
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder={budgetType === 'negotiable' ? '5,000 (Starting offer)' : '10,000'}
                    required
                    className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl pl-8 pr-4 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand font-bold"
                  />
                </div>
              </div>

              {/* 5. Urgency */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Job Urgency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUrgency('normal')}
                    className={`py-2.5 px-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-1 ${
                      urgency === 'normal'
                        ? 'border-brand bg-brand/10 text-brand dark:bg-brand/20'
                        : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <i className="fa-solid fa-calendar-check text-xs"></i>
                    <span>Normal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgency('urgent')}
                    className={`py-2.5 px-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-1 ${
                      urgency === 'urgent'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <i className="fa-solid fa-clock text-xs"></i>
                    <span>Urgent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgency('emergency')}
                    className={`py-2.5 px-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-1 ${
                      urgency === 'emergency'
                        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <i className="fa-solid fa-bolt-lightning text-xs"></i>
                    <span>Emergency</span>
                  </button>
                </div>
              </div>

              {/* Safety notice - in-app token protection */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-2.5">
                <i className="fa-solid fa-shield-check text-emerald-500 text-sm shrink-0 mt-0.5"></i>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                  <b>In-App Protection:</b> This request is sent directly to {worker.full_name}'s Velgo dashboard. Tokens are deducted only upon mutual in-app acceptance.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Transmitting Request...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                    <span>Send Work Request</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
