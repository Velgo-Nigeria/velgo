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
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

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
    <div className="auth-bg px-8 py-12 flex flex-col justify-center items-center relative">
      {onBack && (
        <button 
          onClick={onBack} 
          className="absolute top-10 left-8 text-gray-500 hover:text-white transition-all w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
      )}

      <div className="w-full max-w-sm space-y-10">
        <div className="text-center animate-fadeIn">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-6" />
          <h2 className="text-[32px] font-black text-white uppercase tracking-tighter leading-none">Security</h2>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[2px] mt-3 opacity-80">Update Your Access Token</p>
        </div>

        <form className="space-y-6" onSubmit={handleUpdate}>
          {error && (
            <div className="p-4 bg-red-500/10 text-red-400 text-[11px] font-bold rounded-2xl border border-red-500/20 animate-fadeIn flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <div className="auth-input-group">
               <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  placeholder=" "
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="auth-input-field" 
               />
               <label className="auth-label">New Password</label>
               <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
               </button>
          </div>

          <div className="auth-input-group">
               <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  placeholder=" "
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="auth-input-field" 
               />
               <label className="auth-label">Confirm New Password</label>
          </div>
          
          <button type="submit" disabled={loading} className="auth-btn-primary">
            {loading ? 'Processing...' : 'UPDATE SECURELY'}
          </button>

          {onBack && (
            <button 
              type="button" 
              onClick={onBack} 
              className="w-full text-center text-gray-500 font-black text-[11px] uppercase tracking-widest mt-4 opacity-40 hover:opacity-100 transition-opacity"
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;