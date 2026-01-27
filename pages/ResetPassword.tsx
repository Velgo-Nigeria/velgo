
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { VelgoLogo } from '../components/Brand';

interface ResetPasswordProps {
  onSuccess: () => void;
  onBack?: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onSuccess, onBack }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] auth-gradient flex flex-col items-center justify-center px-6 py-12 relative">
      {onBack && (
        <button 
          onClick={onBack} 
          className="absolute top-10 left-8 text-gray-500 hover:text-white transition-all w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/5"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
      )}

      <div className="w-full max-w-sm space-y-10 animate-fadeIn">
        <div className="text-center">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-8" />
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Security</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[3px] mt-3 opacity-80">Update Your Token</p>
        </div>

        <form className="space-y-6" onSubmit={handleUpdate}>
          {error && (
            <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} 
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 pl-8 pr-12 text-white font-bold outline-none transition-all placeholder-gray-500"
                placeholder="New Password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors">
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>

            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 pl-8 pr-12 text-white font-bold outline-none transition-all placeholder-gray-500"
                placeholder="Confirm New Password"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors">
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl transition-all">
            {loading ? 'Processing...' : 'Update Securely'}
          </button>

          {onBack && (
            <button type="button" onClick={onBack} className="w-full text-center text-gray-500 font-black text-[10px] uppercase tracking-widest mt-4 opacity-40 hover:opacity-100 transition-opacity">Cancel</button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
