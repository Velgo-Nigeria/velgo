
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserRole, ClientType } from '../types';
import { VelgoLogo } from '../components/Brand';
import { PasswordStrengthValidator } from '../components/PasswordStrengthValidator';
import { OTPInput } from '../components/OTPInput';
import { NIGERIA_STATES, NIGERIA_LGAS, getPopularAreas } from '../lib/locations';
import { CATEGORY_MAP } from '../constants';
import { openWhatsAppHelper } from '../lib/whatsapp';

interface SignUpProps {
  onToggle: () => void;
  initialRole?: UserRole;
}

const SignUp: React.FC<SignUpProps> = ({ onToggle, initialRole = 'user' }) => {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [clientType, setClientType] = useState<ClientType>('personal');
  
  // Step 1: Base Credentials
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Optional Professional & Location Setup
  const [state, setState] = useState('Lagos');
  const [lga, setLga] = useState('');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');

  useEffect(() => {
    const savedCode = localStorage.getItem('velgo_referrer_code') || '';
    if (savedCode) setReferralCode(savedCode);
  }, []);

  useEffect(() => { setRole(initialRole); }, [initialRole]);

  const validateStep1 = () => {
    setError(null);
    if (!fullName.trim()) { setError("Please enter your full name."); return false; }
    if (!phone.trim()) { setError("Please enter your WhatsApp phone number."); return false; }
    
    // Strict Nigerian phone number validation
    const cleanPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError("Please enter a valid Nigerian phone number (e.g., 080..., 090..., or +234...).");
      return false;
    }

    if (!email.trim() || !email.includes('@')) { setError("Please enter a valid email address."); return false; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return false; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return false; }
    if (!consent) { setError("Please agree to the Terms of Service & Privacy Policy to continue."); return false; }
    return true;
  };

  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSignUp = async (skipOptionalFields: boolean = false) => {
    if (!validateStep1()) return;
    setError(null);
    
    const cleanPhone = phone.replace(/\s+/g, '');
    if (referralCode.trim()) {
      localStorage.setItem('velgo_referrer_code', referralCode.trim().toUpperCase());
    }

    setLoading(true);

    // Check if email address or phone number is blacklisted in deleted_accounts
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data: blacklisted } = await supabase
        .from('deleted_accounts')
        .select('id, email, phone_number')
        .or(`email.ilike.${cleanEmail},phone_number.eq.${cleanPhone}`)
        .limit(1);

      if (blacklisted && blacklisted.length > 0) {
        setError("This email address or phone number belongs to a permanently deleted account and cannot be re-registered on Velgo for platform safety and security. If you require assistance, please contact Velgo Support on WhatsApp (+2349167799600).");
        setLoading(false);
        return;
      }
    } catch (checkErr) {
      console.warn("Blacklist check skipped:", checkErr);
    }

    const metaData: any = {
      full_name: fullName.trim(),
      phone_number: cleanPhone,
      role: 'user',
      client_type: 'personal',
    };

    if (!skipOptionalFields) {
      if (state.trim()) metaData.state = state.trim();
      if (lga.trim()) metaData.lga = lga.trim();
      if (area.trim()) metaData.area = area.trim();
      if (category.trim()) metaData.category = category.trim();
      if (subcategory.trim()) metaData.subcategory = subcategory.trim();
      if (bankName.trim()) metaData.bank_name = bankName.trim();
      if (accountName.trim()) metaData.account_name = accountName.trim();
      if (accountNumber.trim()) metaData.account_number = accountNumber.trim();
    }

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
        if (data.session && data.user) {
          // Direct DB Profile enrichment if session is active
          try {
            const profileUpdates: any = {
              full_name: fullName.trim(),
              phone_number: cleanPhone,
            };
            if (!skipOptionalFields) {
              if (state.trim()) profileUpdates.state = state.trim();
              if (lga.trim()) profileUpdates.lga = lga.trim();
              if (area.trim()) profileUpdates.area = area.trim();
              if (category.trim()) profileUpdates.category = category.trim();
              if (subcategory.trim()) profileUpdates.subcategory = subcategory.trim();
              if (bankName.trim()) profileUpdates.bank_name = bankName.trim();
              if (accountName.trim()) profileUpdates.account_name = accountName.trim();
              if (accountNumber.trim()) profileUpdates.account_number = accountNumber.trim();
            }
            await supabase.from('profiles').update(profileUpdates).eq('id', data.user.id);
          } catch (e) {
            console.warn("Could not sync extra fields to profile table:", e);
          }
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
        setSuccess(true);
      } else {
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

              <div className="mb-6">
                <OTPInput 
                  length={6} 
                  value={otpToken} 
                  onChange={(val) => setOtpToken(val)} 
                  disabled={loading} 
                />
              </div>

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

        {/* Progress Step Indicator */}
        <div className="flex items-center justify-between px-2">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-emerald-400' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step === 1 ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-gray-400 border border-slate-700'}`}>1</span>
            <span className="text-[10px] font-black uppercase tracking-wider">Account Details</span>
          </div>
          <div className="h-[2px] w-8 bg-slate-800"></div>
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-emerald-400' : 'text-gray-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step === 2 ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-gray-500 border border-slate-700'}`}>2</span>
            <span className="text-[10px] font-black uppercase tracking-wider">Work Profile (Optional)</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-start gap-3">
            <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleGoToStep2} className="space-y-4">
            <div className="space-y-3.5">
              <input 
                required value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-4 px-6 text-white font-bold outline-none transition-all placeholder-gray-500 text-sm"
                placeholder="Full Name"
              />
              <div className="space-y-1">
                <input 
                  required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-4 px-6 text-white font-bold outline-none transition-all placeholder-gray-500 text-sm"
                  placeholder="WhatsApp Number (e.g. 080...)"
                />
                <p className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider px-4 leading-relaxed">
                  * Required. Other users connect with you here directly to close deals.
                </p>
              </div>
              <input 
                required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-4 px-6 text-white font-bold outline-none transition-all placeholder-gray-500 text-sm"
                placeholder="Email Address"
              />
              
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-4 px-6 text-white font-bold outline-none transition-all placeholder-gray-500 text-sm"
                  placeholder="Password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400">
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>

              <PasswordStrengthValidator password={password} />

              <div className="relative">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-4 px-6 text-white font-bold outline-none transition-all placeholder-gray-500 text-sm"
                  placeholder="Confirm Password"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400">
                  <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>

              <div className="relative">
                <input 
                  type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800/50 border-2 border-transparent focus:border-emerald-500 focus:bg-slate-900 rounded-[28px] py-4 px-6 text-white font-bold outline-none transition-all placeholder-gray-500 uppercase tracking-widest text-xs"
                  placeholder="Referral Code (Optional)"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 mt-3 mb-2 px-2">
              <div className="flex items-center h-5">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-4 h-4 bg-slate-800 border-gray-600 rounded text-emerald-500 focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                  required
                />
              </div>
              <label htmlFor="consent" className="text-[10px] text-slate-400 font-bold leading-relaxed cursor-pointer">
                I consent to transactional service emails and agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-bold">Terms of Service</a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-bold">Privacy Policy</a>.
              </label>
            </div>

            <div className="space-y-2 pt-2">
              <button 
                type="submit" 
                disabled={loading || password.length < 6 || !consent} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-[28px] font-black uppercase text-xs tracking-[1.5px] shadow-xl shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Work Profile (Optional)</span>
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </button>

              <button 
                type="button"
                onClick={() => handleSignUp(true)}
                disabled={loading || password.length < 6 || !consent}
                className="w-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 py-3.5 rounded-[28px] font-black uppercase text-[10px] tracking-wider transition-all active:scale-95 border border-slate-700/60 hover:border-slate-600 cursor-pointer"
              >
                {loading ? 'Processing...' : 'Or Create Account Directly'}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Optional Professional & Location Setup */
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-wand-magic-sparkles"></i> Artisan / Work Setup
                </span>
                <span className="text-[8px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  Optional / Skippable
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                Add your skill, location, and payout bank details now to appear in marketplace searches immediately, or skip to finish later in Profile.
              </p>
            </div>

            <div className="space-y-3">
              {/* Location Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 px-1">State</label>
                  <select 
                    value={state} 
                    onChange={e => { setState(e.target.value); setLga(''); setArea(''); }} 
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 px-1">LGA</label>
                  <select 
                    value={lga} 
                    onChange={e => { setLga(e.target.value); setArea(''); }} 
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">Select LGA (Optional)</option>
                    {NIGERIA_LGAS[state]?.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Area / Commercial Hub */}
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 px-1">Specific Area / Neighborhood</label>
                {getPopularAreas(state, lga).length > 0 ? (
                  <select
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Popular Area in {lga} (Optional)</option>
                    {getPopularAreas(state, lga).map(a => <option key={a} value={a}>{a}</option>)}
                    <option value="other">Custom Neighborhood...</option>
                  </select>
                ) : (
                  <input
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    placeholder="e.g. Royal Market Road, Ikeja"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-xs font-bold text-white outline-none placeholder-gray-500 focus:border-emerald-500"
                  />
                )}
              </div>

              {/* Trade Category & Specialization */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 px-1">Trade Category</label>
                  <select 
                    value={category} 
                    onChange={e => { setCategory(e.target.value); setSubcategory(''); }} 
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Trade (Optional)</option>
                    {Object.keys(CATEGORY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 px-1">Specialization</label>
                  <select 
                    value={subcategory} 
                    onChange={e => setSubcategory(e.target.value)} 
                    disabled={!category}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500 disabled:opacity-50"
                  >
                    <option value="">Select Specialization...</option>
                    {category && CATEGORY_MAP[category]?.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Payout Bank Details */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block px-1">
                  <i className="fa-solid fa-building-columns text-emerald-400 mr-1.5"></i>
                  Direct Payout Account (Optional)
                </span>
                <input 
                  type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3 px-5 text-white font-bold text-xs outline-none placeholder-gray-500 focus:border-emerald-500"
                  placeholder="Bank Name (e.g. GTBank, OPay, FirstBank)"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3 px-5 text-white font-bold text-xs outline-none placeholder-gray-500 focus:border-emerald-500"
                    placeholder="Account Name"
                  />
                  <input 
                    type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3 px-5 text-white font-bold text-xs outline-none placeholder-gray-500 focus:border-emerald-500"
                    placeholder="10-digit Account No."
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3">
              <button 
                type="button" 
                onClick={() => handleSignUp(false)}
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 rounded-[28px] font-black uppercase text-xs tracking-[1.5px] shadow-xl shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? 'Registering Account...' : 'Complete & Register Account'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="py-3 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-[24px] font-bold text-[10px] uppercase tracking-wider transition-all border border-slate-700/60 cursor-pointer"
                >
                  ← Back
                </button>
                <button 
                  type="button"
                  onClick={() => handleSignUp(true)}
                  disabled={loading}
                  className="py-3 bg-slate-800/60 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded-[24px] font-bold text-[10px] uppercase tracking-wider transition-all border border-slate-700/60 cursor-pointer"
                >
                  Skip for Now →
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-4 px-4">
            <div className="h-[1px] flex-1 bg-slate-800"></div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">OR</span>
            <div className="h-[1px] flex-1 bg-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin,
                  },
                });
                if (error) throw error;
              } catch (err: any) {
                setError(err.message || 'Error initializing Google Sign-Up.');
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-white py-5 rounded-[28px] font-black uppercase text-xs tracking-[2px] transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <i className="fa-brands fa-google text-red-500 text-base"></i>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <button type="button" onClick={onToggle} className="text-center text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors">
            Already have an account? <span className="text-emerald-400">Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => openWhatsAppHelper("Hello Velgo Support, I need assistance registering my account.")}
            className="flex items-center gap-2 text-emerald-400/80 hover:text-emerald-400 text-[11px] font-bold py-1 px-3 rounded-full hover:bg-emerald-500/10 transition-all cursor-pointer"
          >
            <i className="fa-brands fa-whatsapp text-sm text-[#25D366]"></i>
            <span>Need Help Signing Up? Chat on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
