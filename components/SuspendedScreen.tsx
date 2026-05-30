import React, { useState } from 'react';
import { Profile } from '../lib/types';

interface SuspendedScreenProps {
  profile: Profile;
  onCheckStatus: () => Promise<void>;
  onLogOut: () => Promise<void>;
}

export const SuspendedScreen: React.FC<SuspendedScreenProps> = ({ profile, onCheckStatus, onLogOut }) => {
  const [checking, setChecking] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await onCheckStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const handleLogOut = async () => {
    setLoggingOut(true);
    try {
      await onLogOut();
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[36px] p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Abstract warning background shape */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-rose-600 to-red-500"></div>
        
        {/* Warning Icon Container */}
        <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-6 animate-pulse">
          <i className="fa-solid fa-triangle-exclamation text-3xl text-red-600"></i>
        </div>

        {/* Brand / Header */}
        <span className="text-[10px] font-black tracking-[4px] text-red-600 dark:text-red-500 uppercase">
          Security Enforcement Protocol
        </span>
        
        <h2 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-wider mt-2 mb-1">
          Account Suspended
        </h2>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide mb-6">
          Velgo Nigeria Trust &amp; Safety Division
        </p>

        {/* Suspended Reason Box */}
        <div className="w-full bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 text-left mb-6">
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
            Official Reason for Sanction:
          </span>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
            {profile.block_reason || "Access has been temporarily suspended pending profile review by compliance operators."}
          </p>
        </div>

        {/* Regulatory fine print */}
        <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium leading-relaxed mb-8">
          This system is guided by the Velgo Terms of Service, NDPR user security standards, and local cyber protection laws. Attempting to bypass this restriction is a violation of network integrity policies.
        </p>

        {/* Action button options */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleCheck}
            disabled={checking}
            className="w-full bg-slate-950 dark:bg-white dark:text-slate-950 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl shadow-xl hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {checking ? (
              <span className="animate-spin truncate">Checking Status...</span>
            ) : (
              <>
                <i className="fa-solid fa-arrows-rotate text-xs"></i>
                <span>Re-Check Account Status</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogOut}
            disabled={loggingOut}
            className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            {loggingOut ? (
              <span className="animate-spin truncate">Logging Out...</span>
            ) : (
              <>
                <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                <span>Disconnect &amp; Exit app</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-50 dark:border-slate-800/50 w-full">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            Case Reference Number: VLG-{profile.id.substring(0, 8).toUpperCase()}
          </span>
        </div>

      </div>
    </div>
  );
};
