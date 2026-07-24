import React from 'react';

export const SidebarItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void; hasBadge?: boolean }> = ({ icon, label, active, onClick, hasBadge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-xl transition-all group ${active ? 'bg-brand text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
      <div className="flex items-center gap-4">
          <i className={`fa-solid ${icon} text-lg ${active ? 'text-white' : 'text-gray-400 group-hover:text-brand'}`}></i>
          <span className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
      </div>
      {hasBadge && (
          <span className={`w-2 h-2 rounded-full bg-red-500 animate-pulse ${active ? 'ring-2 ring-white/30' : ''}`}></span>
      )}
  </button>
);
