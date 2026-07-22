import React from 'react';
import { Profile } from '../lib/types';
import { getWorkerTier } from '../lib/constants';
import { TierBadge } from './TierBadge';

interface GamifiedTierUIProps {
  profile: Profile;
}

export const GamifiedTierUI: React.FC<GamifiedTierUIProps> = ({ profile }) => {
  if (!profile.is_verified) return null;

  const currentTier = getWorkerTier(profile);
  const imageCount = profile.portfolio_images?.length || 0;
  const ratingCount = profile.worker_rating_count || 0;
  const avgRating = profile.worker_avg_rating || 0;

  let nextTier = 'silver';
  let requirements = [];
  let progress = 0;

  if (currentTier === 'blue') {
      nextTier = 'Silver Pro';
      requirements = [
          { label: 'Upload 3 Portfolio Images', current: imageCount, target: 3 },
          { label: 'Get 2 Positive Reviews', current: ratingCount, target: 2 },
          { label: 'Maintain 4.0+ Rating', current: avgRating, target: 4.0, format: 'star' }
      ];
      const p1 = Math.min(imageCount / 3, 1) * 33;
      const p2 = Math.min(ratingCount / 2, 1) * 33;
      const p3 = avgRating >= 4.0 ? 33 : (avgRating / 4.0) * 33;
      progress = p1 + p2 + p3;
  } else if (currentTier === 'silver') {
      nextTier = 'Gold Pro';
      requirements = [
          { label: 'Complete 10 Jobs', current: ratingCount, target: 10 },
          { label: 'Maintain 4.5+ Rating', current: avgRating, target: 4.5, format: 'star' },
          { label: 'Zero Safety Reports', current: 0, target: 0, format: 'check' } // Placeholder logic
      ];
      const p1 = Math.min(ratingCount / 10, 1) * 50;
      const p2 = avgRating >= 4.5 ? 50 : (avgRating / 4.5) * 50;
      progress = p1 + p2;
  } else {
      nextTier = 'Max Tier Reached';
      progress = 100;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
        <div className="flex items-center justify-between mb-4">
            <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Current Tier</h4>
                <div className="mt-1">
                    <TierBadge tier={currentTier as any} showLabel={true} />
                </div>
            </div>
            <div className="text-right">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Next Tier</h4>
                <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{nextTier}</p>
            </div>
        </div>
        
        {currentTier !== 'gold' && (
            <>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
                    <div className="bg-brand h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
                
                <div className="space-y-3">
                    {requirements.map((req, idx) => {
                        let isMet = false;
                        if (req.format === 'star') isMet = req.current >= req.target;
                        else if (req.format === 'check') isMet = true;
                        else isMet = req.current >= req.target;

                        return (
                            <div key={idx} className="flex justify-between items-center text-xs font-medium text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-2">
                                    <i className={`fa-solid ${isMet ? 'fa-check text-green-500' : 'fa-circle-notch text-gray-300'} w-4`}></i>
                                    {req.label}
                                </span>
                                <span>
                                    {req.format === 'star' ? `${req.current.toFixed(1)} / ${req.target}` : 
                                     req.format === 'check' ? '-' : `${req.current} / ${req.target}`}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </>
        )}
        {currentTier === 'gold' && (
            <div className="text-center py-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl mt-4">
                <i className="fa-solid fa-crown text-amber-500 text-3xl mb-2"></i>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">You are a Velgo Pro!</p>
                <p className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-500 mt-1">Maximum trust level achieved.</p>
            </div>
        )}
    </div>
  );
};
