import React from 'react';
import { VerificationTier } from '../lib/types';

interface TierBadgeProps {
  tier: VerificationTier;
  className?: string;
  showLabel?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, className = '', showLabel = false }) => {
  if (tier === 'none') return null;

  const config = {
    blue: {
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'fa-solid fa-circle-check',
      label: 'ID Verified'
    },
    silver: {
      color: 'text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-800',
      border: 'border-slate-300 dark:border-slate-600',
      icon: 'fa-solid fa-medal',
      label: 'Silver Pro'
    },
    gold: {
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-300 dark:border-amber-700',
      icon: 'fa-solid fa-crown',
      label: 'Gold Pro'
    }
  };

  const current = config[tier];

  return (
    <div className={`inline-flex items-center gap-1.5 ${showLabel ? `px-2.5 py-1 rounded-full border ${current.bg} ${current.border}` : ''} ${className}`}>
      <i className={`${current.icon} ${current.color} ${showLabel ? 'text-xs' : 'text-lg'}`}></i>
      {showLabel && <span className={`text-[10px] font-black uppercase tracking-widest ${current.color}`}>{current.label}</span>}
    </div>
  );
};
