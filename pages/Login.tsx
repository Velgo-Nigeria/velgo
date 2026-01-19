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
        setError(error.message.includes('Invalid') ? 'Incorrect email or password.' : error.message);
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
      <div className="min-h-screen w-full bg-[#0f172a] auth-gradient flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-10 animate-fadeIn">
          <div className="text-center">
            <VelgoLogo variant="light" className="h-12 mx-auto mb-8" />
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Reset</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[3px] mt-3">Security Protocol</p>
          </div>

          {resetSent ? (
            <div className="bg-emerald-500/10 p-10 rounded-[40px] text-center border border-emerald-500/20">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-emerald-500/30">
                <i className="fa-solid fa-paper-plane text-2xl"></i>
              </div>
              <p className="text-sm text-white font-bold leading-relaxed mb-6">Check your email for the recovery link.</p>
              <button onClick={() => { setIsResetting(false); setResetSent(false); }} className="text-[11px] font-black text-emerald-400 uppercase tracking-widest hover:text-white transition-colors">Back to Login</button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {error && <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20">{error}</div>}
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
                placeholder="Email Address"
              />
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-emerald-900/40 transition-all">
                {loading ? 'Sending...' : 'Send Recovery Link'}
              </button>
              <button type="button" onClick={() => setIsResetting(false)} className="w-full text-center text-gray-500 font-black text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100">Cancel</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0f172a] auth-gradient flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-10 animate-fadeIn">
        <div className="text-center">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-8" />
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Sign In</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[4px] mt-3">Naija Gig Marketplace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-start gap-3">
              <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
              placeholder="Email Address"
            />

            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
                placeholder="Password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors">
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <div className="flex justify-end px-4">
             <button type="button" onClick={() => setIsResetting(true)} className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300">Forgot Password?</button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-[2px] shadow-2xl shadow-emerald-900/40 transition-all active:scale-95">
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
            New to Velgo? <button onClick={onToggle} className="text-emerald-400 font-black ml-2 border-b-2 border-emerald-400/20 hover:border-emerald-400 transition-all pb-0.5">Create Account</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
