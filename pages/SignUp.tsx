import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserRole, ClientType } from '../types';
import { VelgoLogo } from '../components/Brand';

interface SignUpProps {
  onToggle: () => void;
  initialRole?: UserRole;
}

const SignUp: React.FC<SignUpProps> = ({ onToggle, initialRole = 'client' }) => {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [clientType, setClientType] = useState<ClientType>('personal');
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { setRole(initialRole); }, [initialRole]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    
    setLoading(true);

    const metaData = {
      full_name: fullName.trim(),
      phone_number: phone.trim(),
      role: role,
      client_type: role === 'client' ? clientType : 'personal',
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
        // We now show the RAW error message from Supabase to help debug
        setError(authError.message);
      } else {
        if (data.session) {
             // Handled by App.tsx
        } else if (data.user) {
            alert("Success! Please check your email to verify your account.");
            onToggle();
        }
      }
    } catch (err: any) {
      setError("Connection failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-start gap-3">
              <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-800/40 p-1.5 rounded-[32px] border border-white/10 flex gap-2">
            <button 
              type="button" onClick={() => setRole('client')} 
              className={`flex-1 py-4 rounded-[26px] text-[10px] font-black uppercase tracking-widest transition-all ${role === 'client' ? 'bg-white text-emerald-600 shadow-xl' : 'text-gray-500 hover:text-white'}`}
            >
              Hire Help
            </button>
            <button 
              type="button" onClick={() => setRole('worker')} 
              className={`flex-1 py-4 rounded-[26px] text-[10px] font-black uppercase tracking-widest transition-all ${role === 'worker' ? 'bg-white text-emerald-600 shadow-xl' : 'text-gray-500 hover:text-white'}`}
            >
              Earn Money
            </button>
          </div>

          {role === 'client' && (
            <div className="flex justify-center gap-8 py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" className="hidden" checked={clientType === 'personal'} onChange={() => setClientType('personal')} />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${clientType === 'personal' ? 'border-emerald-500' : 'border-slate-700'}`}>
                  {clientType === 'personal' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${clientType === 'personal' ? 'text-white' : 'text-gray-500'}`}>Personal</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" className="hidden" checked={clientType === 'enterprise'} onChange={() => setClientType('enterprise')} />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${clientType === 'enterprise' ? 'border-emerald-500' : 'border-slate-700'}`}>
                  {clientType === 'enterprise' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${clientType === 'enterprise' ? 'text-white' : 'text-gray-500'}`}>Business</span>
              </label>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <input 
              required value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
              placeholder={role === 'client' && clientType === 'enterprise' ? "Business Name" : "Full Name"}
            />
            <input 
              required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
              placeholder="Phone Number"
            />
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
            <input 
              type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-5 px-8 text-white font-bold outline-none transition-all placeholder-gray-500"
              placeholder="Confirm Password"
            />
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
