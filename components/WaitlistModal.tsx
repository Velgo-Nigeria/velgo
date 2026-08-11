import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../lib/types';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: string;
  lga: string;
  profile: Profile | null;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  state,
  lga,
  profile,
}) => {
  const [contactInfo, setContactInfo] = useState<string>(
    profile?.phone_number || profile?.email || ''
  );
  const [roleIntent, setRoleIntent] = useState<'client' | 'worker'>('client');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInfo.trim()) {
      alert("Please enter a phone number or email address.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('location_waitlist').insert({
        user_id: profile?.id || null,
        contact_info: contactInfo.trim(),
        state,
        lga: lga === 'All' ? 'Whole State' : lga,
        role_intent: roleIntent,
      });

      if (error) throw error;

      setSubmitted(true);
    } catch (e: any) {
      alert("Registration failed: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-amber-500/30 max-w-sm w-full rounded-[36px] p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto text-2xl">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">You're on the Priority List!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                We will notify you via SMS/WhatsApp as soon as Velgo officially launches live services in <strong className="text-slate-800 dark:text-white">{lga === 'All' ? state : `${lga}, ${state}`}</strong>.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider mt-2"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-bell"></i>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Priority Waitlist</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Join Launch Waitlist
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Be among the first to hire verified pros or earn money when Velgo opens in <strong className="text-slate-800 dark:text-white">{lga === 'All' ? state : `${lga}, ${state}`}</strong>.
            </p>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                Your Primary Role Intent
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRoleIntent('client')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    roleIntent === 'client'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <i className="fa-solid fa-briefcase mr-1"></i> I Want to Hire
                </button>
                <button
                  type="button"
                  onClick={() => setRoleIntent('worker')}
                  className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    roleIntent === 'worker'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <i className="fa-solid fa-wrench mr-1"></i> I Want to Work
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                WhatsApp Phone or Email
              </label>
              <input
                required
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="08012345678 or user@gmail.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all mt-2"
            >
              {submitting ? 'Registering...' : 'Register For Pre-Launch Alert'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
