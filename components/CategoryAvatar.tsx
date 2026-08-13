import React, { useState } from 'react';

interface CategoryAvatarProps {
  avatarUrl?: string | null;
  category?: string | null;
  fullName?: string;
  className?: string;
  iconClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CATEGORY_STYLES: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  'Fashion & Tailoring': {
    icon: 'fa-solid fa-scissors',
    bg: 'bg-pink-500/10 dark:bg-pink-500/20',
    text: 'text-pink-500 dark:text-pink-400',
    border: 'border-pink-500/30'
  },
  'Beauty & Wellness': {
    icon: 'fa-solid fa-spa',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-500 dark:text-rose-400',
    border: 'border-rose-500/30'
  },
  'Artisans & Technicians': {
    icon: 'fa-solid fa-screwdriver-wrench',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-500 dark:text-amber-400',
    border: 'border-amber-500/30'
  },
  'Home & Cleaning': {
    icon: 'fa-solid fa-broom',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-500 dark:text-cyan-400',
    border: 'border-cyan-500/30'
  },
  'Events & Entertainment': {
    icon: 'fa-solid fa-champagne-glasses',
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-500 dark:text-purple-400',
    border: 'border-purple-500/30'
  },
  'Logistics & Errands': {
    icon: 'fa-solid fa-motorcycle',
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    text: 'text-orange-500 dark:text-orange-400',
    border: 'border-orange-500/30'
  },
  'Tech & Creative': {
    icon: 'fa-solid fa-laptop-code',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-500 dark:text-blue-400',
    border: 'border-blue-500/30'
  },
  'Professional Services': {
    icon: 'fa-solid fa-user-tie',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-500 dark:text-emerald-400',
    border: 'border-emerald-500/30'
  }
};

const DEFAULT_STYLE = {
  icon: 'fa-solid fa-user-gear',
  bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
  text: 'text-emerald-500 dark:text-emerald-400',
  border: 'border-emerald-500/30'
};

export const CategoryAvatar: React.FC<CategoryAvatarProps> = ({
  avatarUrl,
  category,
  fullName,
  className = 'w-14 h-14 rounded-2xl',
  iconClassName = 'text-xl',
}) => {
  const [imageError, setImageError] = useState(false);

  // Check if avatarUrl is real (not default ui-avatars placeholder or broken url)
  const isCustomImage = avatarUrl && 
    !imageError && 
    !avatarUrl.includes('ui-avatars.com') && 
    avatarUrl.trim() !== '';

  if (isCustomImage) {
    return (
      <img
        src={avatarUrl}
        alt={fullName || 'Worker Profile'}
        onError={() => setImageError(true)}
        className={`${className} object-cover bg-gray-100 dark:bg-gray-700`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const style = (category && CATEGORY_STYLES[category]) || DEFAULT_STYLE;

  return (
    <div 
      className={`${className} ${style.bg} ${style.border} border flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-inner`}
      title={category || 'Worker Skill'}
    >
      <i className={`${style.icon} ${style.text} ${iconClassName}`}></i>
      {category && (
        <span className="text-[7px] font-black uppercase tracking-tighter opacity-75 mt-0.5 truncate max-w-[90%] text-center line-clamp-1 px-1">
          {category.split('&')[0].trim()}
        </span>
      )}
    </div>
  );
};
