import React, { useRef, useEffect, useState } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({ length = 8, value, onChange, disabled = false }) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Sync state if value changes externally
    const newDigits = value.split('').slice(0, length);
    while (newDigits.length < length) newDigits.push('');
    setDigits(newDigits);
  }, [value, length]);

  const handleChange = (index: number, val: string) => {
    // Only allow numbers
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (!cleanVal && val !== '') return;

    const newDigits = [...digits];
    
    // Handle paste of multiple characters
    if (cleanVal.length > 1) {
        let i = 0;
        let pIndex = index;
        while (i < cleanVal.length && pIndex < length) {
            newDigits[pIndex] = cleanVal[i];
            i++;
            pIndex++;
        }
        onChange(newDigits.join(''));
        if (pIndex < length) {
            inputRefs.current[pIndex]?.focus();
        } else {
            inputRefs.current[length - 1]?.focus();
        }
        return;
    }

    newDigits[index] = cleanVal.slice(-1); // Take the last character if multiple
    onChange(newDigits.join(''));

    // Move to next input if filled
    if (cleanVal && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Focus previous and optionally clear it
      inputRefs.current[index - 1]?.focus();
      // To auto-clear previous on backspace:
      // const newDigits = [...digits];
      // newDigits[index - 1] = '';
      // onChange(newDigits.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/[^0-9]/g, '');
    if (pastedData) {
        handleChange(0, pastedData);
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 w-full">
      {digits.map((digit, index) => {
        // Simple visual feedback: green if filled, else normal
        const isFilled = digit.length > 0;
        return (
            <div key={index} className="relative">
                <input
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={length} // Allow paste of full length into any box
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={`w-10 h-12 sm:w-12 sm:h-14 bg-slate-800 border-2 rounded-xl text-white text-center text-xl font-black outline-none transition-all disabled:opacity-50
                    ${isFilled ? 'border-emerald-500/50 focus:border-emerald-400 bg-emerald-900/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-700/50 focus:border-emerald-500 focus:bg-slate-900'}
                    `}
                />
                {isFilled && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f172a]">
                        <i className="fa-solid fa-check text-[6px] text-white"></i>
                    </div>
                )}
            </div>
        );
      })}
    </div>
  );
};
