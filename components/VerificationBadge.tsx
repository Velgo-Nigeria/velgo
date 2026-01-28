
import React from 'react';

export const VerificationBadge: React.FC<{ className?: string }> = ({ className = "text-blue-500 text-xs" }) => {
  return (
    <div className="relative inline-flex items-center group z-10" onClick={(e) => e.stopPropagation()}>
      <i className={`fa-solid fa-circle-check ${className} cursor-help`}></i>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl flex flex-col items-center min-w-[100px]">
        <span>Identity Verified</span>
        <span className="text-[8px] text-gray-400 font-medium uppercase tracking-wide">via NIN / BVN</span>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};
