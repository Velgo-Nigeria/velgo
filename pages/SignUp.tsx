
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserRole, ClientType } from '../types';
import { VelgoLogo } from '../components/Brand';

interface SignUpProps {
  onToggle: () => void;
  initialRole?: UserRole;
}

const SignUp: React.FC<SignUpProps> = ({ onToggle, initialRole = 'user' }) => {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [clientType, setClientType] = useState<ClientType>('personal');
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false); // <--- Still used if we don't do OTP, but let's change it
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { setRole(initialRole); }, [initialRole]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    
    // Strict Nigerian phone number validation
    const cleanPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError("Please enter a valid Nigerian phone number (e.g., 080..., 090..., or +234...).");
      return;
    }
    
    setLoading(true);

    const metaData = {
      full_name: fullName.trim(),
      phone_number: cleanPhone,
      role: 'user',
      client_type: 'personal',
    };

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: metaData, 
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) {
        console.error("Signup process failed:", authError);
        if (authError.message.includes("Database error")) {
          setError("Account created in Auth, but Profile sync failed. Please try to Sign In; the app will fix your profile automatically.");
        } else {
          setError(authError.message);
        }
      } else {
        if (data.session) {
             // Successfully logged in immediately (if auto-confirm is enabled)
             setSuccess(true);
        } else if (data.user) {
             // Require email confirmation - switch to OTP view
             setAwaitingOtp(true);
        }
      }
    } catch (err: any) {
      setError("Connectivity issue. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpToken.trim(),
        type: 'signup'
      });

      if (verifyError) {
        setError(verifyError.message);
      } else if (data.session) {
        // Success! The session will be picked up by the auth listener in App.tsx/Home.tsx
        setSuccess(true);
      } else {
        // Sometimes it succeeds but doesn't return a session automatically depending on Supabase settings
        setSuccess(true);
      }
    } catch (err: any) {
      setError("Connectivity issue. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success && !awaitingOtp) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] auth-gradient flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-10 animate-fadeIn text-center">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-8" />
          
          <div className="bg-emerald-500/10 p-10 rounded-[40px] text-center border border-emerald-500/20 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-emerald-500/30">
              <i className="fa-solid fa-check text-4xl"></i>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-4">You're In!</h2>
            <p className="text-sm text-gray-300 font-medium leading-relaxed mb-8">
              Your account has been created successfully. Welcome to Velgo.
            </p>
            <button 
              onClick={onToggle} 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (awaitingOtp && !success) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] auth-gradient flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-10 animate-fadeIn text-center">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-8" />
          
          <div className="bg-emerald-500/10 p-10 rounded-[40px] text-center border border-emerald-500/20 shadow-2xl">
            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-lock text-2xl"></i>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-4">Enter OTP</h2>
            <p className="text-xs text-gray-300 font-medium leading-relaxed mb-8">
              We've sent a 6-digit code to <span className="text-white font-bold">{email}</span>. Please enter it below.
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-2xl border border-red-500/20 text-left flex items-start gap-2">
                  <i className="fa-solid fa-xmark mt-0.5"></i>
                  <span>{error}</span>
                </div>
              )}

              <input 
                required 
                type="text" 
                value={otpToken} 
                onChange={(e) => setOtpToken(e.target.value.trim())}
                className="w-full bg-slate-800 border-2 border-slate-700/50 focus:border-emerald-500 rounded-[24px] py-4 px-6 text-white text-center text-2xl tracking-[0.2em] font-black outline-none transition-all placeholder-gray-600"
                placeholder="Token"
              />

              <button 
                type="submit" 
                disabled={loading || otpToken.length < 6} 
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/40 transition-all active:scale-95"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button 
                type="button" 
                onClick={() => setAwaitingOtp(false)} 
                className="w-full text-center text-gray-500 font-black text-[10px] uppercase tracking-widest mt-4 opacity-60 hover:opacity-100 transition-opacity"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0f172a] auth-gradient flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-10 animate-fadeIn">
        <div className="text-center">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-8" />
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Join Us</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[3px] mt-3">Start your journey</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-start gap-3 animate-bounce">
              <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <input 
              required value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
              placeholder="Full Name"
            />
            <div className="space-y-1.5">
              <input 
                required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
                placeholder="WhatsApp Number (e.g. 080...)"
              />
              <p className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider px-6 leading-relaxed">
                * Required. Other users will message you here directly to close deals.
              </p>
            </div>
            <input 
              required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
              placeholder="Email Address"
            />
            
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
                placeholder="Password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400">
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>

            <div className="relative">
              <input 
                type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
                placeholder="Confirm Password"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400">
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[28px] font-black uppercase text-xs tracking-[2px] shadow-2xl shadow-emerald-900/40 transition-all active:scale-95 mt-6">
            {loading ? 'Processing...' : 'Get Started'}
          </button>
          
          <button type="button" onClick={onToggle} className="w-full text-center text-gray-500 font-black text-[10px] uppercase tracking-widest mt-6 opacity-60 hover:opacity-100 transition-opacity">
            Already have an account? Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
