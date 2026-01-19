import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { VelgoLogo } from '../components/Brand';

interface LoginProps {
  onToggle: () => void;
}

const Login: React.FC<LoginProps> = ({ onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email address before logging in.');
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password.');
        } else {
          setError(error.message);
        }
      }
    } catch (err: any) {
      setError('Network connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isResetting) {
    return (
      <div className="auth-bg px-8 py-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-sm space-y-10">
          <div className="text-center animate-fadeIn">
            <VelgoLogo variant="light" className="h-12 mx-auto mb-6" />
            <h2 className="text-[32px] font-black text-white uppercase tracking-tighter leading-none">Reset</h2>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[2px] mt-3 opacity-80">Security Protocol Alpha</p>
          </div>

          {resetSent ? (
            <div className="bg-brand/10 p-10 rounded-[40px] text-center border border-brand/20 animate-fadeIn">
              <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-brand/30">
                <i className="fa-solid fa-paper-plane text-2xl"></i>
              </div>
              <p className="text-xs text-white/80 font-bold leading-relaxed">Recovery link sent to<br/><span className="text-brand">{email}</span></p>
              <button onClick={() => { setIsResetting(false); setResetSent(false); }} className="mt-8 text-[11px] font-black text-brand uppercase tracking-widest">Back to Login</button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {error && <div className="p-4 bg-red-500/10 text-red-400 text-[11px] font-bold rounded-2xl border border-red-500/20">{error}</div>}
              <div className="auth-input-group">
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder=" " 
                  className="auth-input-field" 
                />
                <label className="auth-label">Email Address</label>
              </div>
              <button type="submit" disabled={loading} className="auth-btn-primary">{loading ? 'Processing...' : 'SEND RECOVERY LINK'}</button>
              <button type="button" onClick={() => setIsResetting(false)} className="w-full text-center text-gray-500 font-black text-[11px] uppercase tracking-widest mt-4 opacity-40 hover:opacity-100 transition-opacity">Cancel</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg px-8 py-12 flex flex-col justify-center items-center">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center animate-fadeIn">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-6" />
          <h1 className="text-[32px] font-black text-white uppercase tracking-tighter leading-none">Sign In</h1>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[2px] mt-3 opacity-80">Naija Gig Marketplace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-500/10 text-red-400 text-[11px] font-bold rounded-2xl border border-red-500/20 mb-2 animate-fadeIn flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <div className="auth-input-group">
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input-field"
              placeholder=" "
            />
            <label className="auth-label">Email Address</label>
          </div>

          <div className="auth-input-group">
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input-field"
                placeholder=" "
              />
              <label className="auth-label">Password</label>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <div className="flex justify-end px-1">
             <button type="button" onClick={() => setIsResetting(true)} className="text-[10px] font-black text-brand uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">Forgot Password?</button>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="auth-btn-primary mt-6"
          >
            {loading ? 'Authenticating...' : 'SIGN IN'}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
            New to Velgo? <button onClick={onToggle} className="text-brand font-black ml-1 border-b border-brand/20 pb-0.5 hover:border-brand transition-all">Sign Up</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;