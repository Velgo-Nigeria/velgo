import React from 'react';

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  onLearnMore?: () => void;
  title?: string;
  message?: string;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onSignUp,
  onLearnMore,
  title = "Account Required",
  message = "Create a free account or log in to contact professionals, submit proposals, post tasks, and unlock full access."
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-[32px] max-w-sm w-full p-6 text-center border border-gray-100 dark:border-gray-700 shadow-2xl space-y-5 animate-scale-up">
        
        {/* Icon Header */}
        <div className="w-16 h-16 bg-brand/10 dark:bg-brand/20 text-brand rounded-3xl mx-auto flex items-center justify-center text-2xl shadow-inner">
          <i className="fa-solid fa-user-lock"></i>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => {
              onClose();
              onSignUp();
            }}
            className="w-full bg-brand hover:bg-brand/90 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-95 transition-all"
          >
            Create Account (Free)
          </button>

          <button
            onClick={() => {
              onClose();
              onLogin();
            }}
            className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Sign In
          </button>

          {onLearnMore && (
            <button
              onClick={() => {
                onClose();
                onLearnMore();
              }}
              className="w-full py-2 text-xs font-bold text-brand hover:text-brand-dark flex items-center justify-center gap-1.5 transition-colors"
            >
              <i className="fa-solid fa-circle-info text-xs"></i>
              <span>Learn More About Velgo</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="text-[11px] font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 pt-1 transition-colors block w-full"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
};
