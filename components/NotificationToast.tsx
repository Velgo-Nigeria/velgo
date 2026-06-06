import React, { useEffect, useState } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'alert';
}

interface ToastProps {
  message?: string;
  type?: 'info' | 'success' | 'alert';
  onClose?: () => void;
  toasts?: ToastItem[];
  onRemove?: (id: string) => void;
}

const IndividualToast: React.FC<{
  id: string;
  message: string;
  type: 'info' | 'success' | 'alert';
  onClose: () => void;
}> = ({ id, message, type, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 4000; // 4 seconds duration
    const intervalTime = 40; // update every 40/ms (~25fps)
    const decrement = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onClose]);

  // Determine beautiful matching titles based on content keywords
  const getSubTitleText = () => {
    const msg = message.toLowerCase();
    if (msg.includes('verification') || msg.includes('nin') || msg.includes('id card') || msg.includes('verify')) return 'Verification Station';
    if (msg.includes('safety') || msg.includes('scam') || msg.includes('prohibited') || msg.includes('forbidden') || msg.includes('standard') || msg.includes('restricted')) return 'Safety Shield';
    if (msg.includes('booking') || msg.includes('book') || msg.includes('artisan')) return 'Booking Engine';
    if (msg.includes('payment') || msg.includes('bank') || msg.includes('transfer') || msg.includes('paystack')) return 'Secure Paystack';
    if (msg.includes('apply') || msg.includes('task') || msg.includes('job') || msg.includes('posted')) return 'Job Hub';
    if (msg.includes('success') || msg.includes('completed') || msg.includes('great') || msg.includes('saved') || msg.includes('updated')) return 'Success Confirmed';
    if (msg.includes('error') || msg.includes('fail') || msg.includes('denied') || msg.includes('reject')) return 'Action Denied';
    
    return type === 'success' ? 'Confirmed Action' : type === 'alert' ? 'Velgo Alert' : 'Market Alert';
  };

  const colors = {
    info: {
      bg: 'bg-white dark:bg-gray-950 border-gray-150 dark:border-gray-800 text-gray-900 dark:text-gray-100',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400',
      icon: 'fa-bell',
      progress: 'bg-indigo-500',
      subText: 'text-indigo-600 dark:text-indigo-400',
      shadow: 'shadow-lg shadow-indigo-100/10 dark:shadow-none'
    },
    success: {
      bg: 'bg-white dark:bg-gray-950 border-emerald-150 dark:border-emerald-900/30 text-gray-900 dark:text-gray-100',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
      icon: 'fa-circle-check',
      progress: 'bg-emerald-500',
      subText: 'text-emerald-600 dark:text-emerald-400',
      shadow: 'shadow-lg shadow-emerald-100/10 dark:shadow-none'
    },
    alert: {
      bg: 'bg-white dark:bg-gray-950 border-amber-150 dark:border-amber-900/30 text-gray-900 dark:text-gray-100',
      iconBg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
      icon: 'fa-user-shield',
      progress: 'bg-brand', // Custom orange-red primary brand color
      subText: 'text-[#d97706] dark:text-amber-400',
      shadow: 'shadow-lg shadow-amber-100/10 dark:shadow-none'
    }
  };

  const activeColor = colors[type] || colors.info;

  return (
    <div 
      className={`w-full max-w-sm mx-auto overflow-hidden rounded-[24px] border p-4 flex flex-col gap-3 relative transition-all duration-300 transform scale-100 translate-y-0 active:scale-98 cursor-pointer shadow-2xl ${activeColor.bg} ${activeColor.shadow} pointer-events-auto`}
      onClick={onClose}
    >
      <div className="flex items-start gap-3">
        {/* Rounded Icon Badge */}
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-sm ${activeColor.iconBg}`}>
          <i className={`fa-solid ${activeColor.icon}`}></i>
        </div>

        {/* Dynamic customized text content */}
        <div className="flex-1 min-w-0 pr-2">
          <p className={`text-[9px] font-black uppercase tracking-widest ${activeColor.subText}`}>
            {getSubTitleText()}
          </p>
          <p className="text-xs font-bold leading-relaxed text-gray-700 dark:text-gray-300 mt-0.5 break-words">
            {message}
          </p>
        </div>

        {/* Small Close Control Tap Targets */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }} 
          className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-gray-400 dark:text-gray-500 shrink-0"
        >
          <i className="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>

      {/* Modern countdown timeline indicator */}
      <div className="w-full h-[3px] bg-gray-50 dark:bg-gray-950/50 rounded-full overflow-hidden absolute bottom-0 left-0 right-0">
        <div 
          className={`h-full transition-all duration-75 ease-linear ${activeColor.progress}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const NotificationToast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  onClose,
  toasts,
  onRemove
}) => {
  // Dual-mode integration: Check if we are running in multi-toast or single-toast fallback
  if (toasts && onRemove) {
    return (
      <div className="fixed top-6 left-0 right-0 z-[100] px-6 flex flex-col gap-3 pointer-events-none max-w-sm mx-auto">
        {toasts.map((item) => (
          <IndividualToast 
            key={item.id}
            id={item.id}
            message={item.message}
            type={item.type}
            onClose={() => onRemove(item.id)}
          />
        ))}
      </div>
    );
  }

  // Fallback to singular toast if passed individually
  if (message && onClose) {
    return (
      <div className="fixed top-6 left-0 right-0 z-[100] px-6 pointer-events-none max-w-sm mx-auto">
        <IndividualToast 
          id="classic-toast"
          message={message}
          type={type}
          onClose={onClose}
        />
      </div>
    );
  }

  return null;
};
