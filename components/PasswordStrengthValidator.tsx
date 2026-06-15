import React from 'react';

interface PasswordStrengthValidatorProps {
  password: string;
}

export function calculatePasswordStrength(password: string) {
  if (!password) return { score: 0, text: 'Empty', color: 'bg-gray-700/30' };

  let score = 0;
  
  // 1. Min 6 characters (Hard minimum)
  const hasMinLength = password.length >= 6;
  if (hasMinLength) score += 1;

  // 2. Contains uppercase
  const hasUppercase = /[A-Z]/.test(password);
  if (hasUppercase) score += 1;

  // 3. Contains number
  const hasNumber = /[0-9]/.test(password);
  if (hasNumber) score += 1;

  // 4. Contains symbol
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (hasSymbol) score += 1;

  let text = 'Too Weak';
  let color = 'bg-red-500';
  let textColor = 'text-red-400';

  if (!hasMinLength) {
    text = 'Too Short (Min 6 chars)';
    color = 'bg-red-500';
    textColor = 'text-red-400';
  } else {
    switch (score) {
      case 1:
        text = 'Weak';
        color = 'bg-orange-500';
        textColor = 'text-orange-400';
        break;
      case 2:
        text = 'Fair';
        color = 'bg-yellow-500';
        textColor = 'text-yellow-400';
        break;
      case 3:
        text = 'Good';
        color = 'bg-blue-500';
        textColor = 'text-blue-400';
        break;
      case 4:
        text = 'Strong';
        color = 'bg-emerald-500';
        textColor = 'text-emerald-400';
        break;
    }
  }

  return {
    score,
    maxScore: 4,
    text,
    color,
    textColor,
    checks: {
      minLength: hasMinLength,
      uppercase: hasUppercase,
      number: hasNumber,
      symbol: hasSymbol,
    }
  };
}

export const PasswordStrengthValidator: React.FC<PasswordStrengthValidatorProps> = ({ password }) => {
  if (!password) return null;

  const { score, maxScore, text, color, textColor, checks } = calculatePasswordStrength(password);

  return (
    <div className="w-full bg-slate-850/40 border border-slate-800/80 rounded-2xl p-4 space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Strength</span>
        <span className={`text-[10px] font-black uppercase tracking-wider ${textColor}`}>
          {text}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        {[0, 1, 2, 3].map((index) => {
          const filled = checks.minLength ? score > index : index === 0;
          return (
            <div
              key={index}
              className={`h-full rounded-full transition-all duration-300 ${
                filled ? color : 'bg-slate-700/40'
              }`}
            />
          );
        })}
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs flex items-center justify-center transition-colors ${checks.minLength ? 'text-emerald-500' : 'text-gray-600'}`}>
            <i className={`fa-solid ${checks.minLength ? 'fa-circle-check' : 'fa-circle text-[8px] opacity-40'}`}></i>
          </span>
          <span className={`text-[10px] font-bold ${checks.minLength ? 'text-gray-300' : 'text-gray-500'} transition-colors`}>
            6+ Characters
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs flex items-center justify-center transition-colors ${checks.uppercase ? 'text-emerald-500' : 'text-gray-600'}`}>
            <i className={`fa-solid ${checks.uppercase ? 'fa-circle-check' : 'fa-circle text-[8px] opacity-40'}`}></i>
          </span>
          <span className={`text-[10px] font-bold ${checks.uppercase ? 'text-gray-300' : 'text-gray-500'} transition-colors`}>
            Uppercase Letter
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs flex items-center justify-center transition-colors ${checks.number ? 'text-emerald-500' : 'text-gray-600'}`}>
            <i className={`fa-solid ${checks.number ? 'fa-circle-check' : 'fa-circle text-[8px] opacity-40'}`}></i>
          </span>
          <span className={`text-[10px] font-bold ${checks.number ? 'text-gray-300' : 'text-gray-500'} transition-colors`}>
            One Number
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs flex items-center justify-center transition-colors ${checks.symbol ? 'text-emerald-500' : 'text-gray-600'}`}>
            <i className={`fa-solid ${checks.symbol ? 'fa-circle-check' : 'fa-circle text-[8px] opacity-40'}`}></i>
          </span>
          <span className={`text-[10px] font-bold ${checks.symbol ? 'text-gray-300' : 'text-gray-500'} transition-colors`}>
            Special Symbol
          </span>
        </div>
      </div>
    </div>
  );
};
