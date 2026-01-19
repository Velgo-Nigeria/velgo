
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserRole, ClientType } from '../types';
import { VelgoLogo } from '../components/Brand';

interface SignUpProps {
  onToggle: () => void;
  initialRole?: UserRole;
}

// Fix: Completed the truncated SignUp component and ensured it returns JSX.
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { setRole(initialRole); }, [initialRole]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Frontend Validation
    if (password !== confirmPassword) { 
      setError("Passwords do not match."); 
      return; 
    }
    if (password.length < 6) { 
      setError("Password must be at least 6 characters."); 
      return; 
    }
    
    const cleanPhone = phone.replace(/\D/g, ''); 
    if (cleanPhone.length < 10) { 
      setError("Please enter a valid phone number."); 
      return; 
    }

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
        console.error("Signup Error:", authError);
        if (authError.message.includes("unique") || authError.message.includes("already registered")) {
            setError("Email already in use. Try logging in.");
        } else if (authError.message.includes("Password")) {
            setError("Password is too weak or common.");
        } else {
            setError(authError.message);
        }
      } else {
        if (data.session) {
             // Success - session handled by App component
        } else if (data.user && !data.session) {
            alert("Account created! Please check your email to verify your account.");
            onToggle();
        }
      }
    } catch (err: any) {
      setError("Network connection failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg px-8 py-12 flex flex-col justify-center items-center">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center animate-fadeIn">
          <VelgoLogo variant="light" className="h-12 mx-auto mb-6" />
          <h2 className="text-[32px] font-black text-white uppercase tracking-tighter leading-none">Sign Up</h2>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[2px] mt-3 opacity-80">Naija Gig Marketplace</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-500/10 text-red-400 text-[11px] font-bold rounded-2xl border border-red-500/20 mb-2 animate-fadeIn flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <div className="auth-toggle-container">
            <button 
              type="button" 
              onClick={() => setRole('client')} 
              className={`auth-toggle-btn ${role === 'client' ? 'auth-toggle-btn-active' : 'auth-toggle-btn-inactive'}`}
            >
              Hire Help
            </button>
            <button 
              type="button" 
              onClick={() => setRole('worker')} 
              className={`auth-toggle-btn ${role === 'worker' ? 'auth-toggle-btn-active' : 'auth-toggle-btn-inactive'}`}
            >
              Earn Money
            </button>
          </div>

          {role === 'client' && (
            <div className="flex justify-center gap-10 mb-8 animate-fadeIn">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${clientType === 'personal' ? 'border-brand' : 'border-gray-600'}`}>
                  {clientType === 'personal' && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
                </div>
                <input type="radio" className="hidden" checked={clientType === 'personal'} onChange={() => setClientType('personal')} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${clientType === 'personal' ? 'text-white' : 'text-gray-500'}`}>Personal</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${clientType === 'enterprise' ? 'border-brand' : 'border-gray-600'}`}>
                  {clientType === 'enterprise' && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
                </div>
                <input type="radio" className="hidden" checked={clientType === 'enterprise'} onChange={() => setClientType('enterprise')} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${clientType === 'enterprise' ? 'text-white' : 'text-gray-500'}`}>Business</span>
              </label>
            </div>
          )}

          <div className="auth-input-group">
            <input 
              required 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder=" " 
              className="auth-input-field" 
            />
            <label className="auth-label">
              {clientType === 'enterprise' && role === 'client' ? "Business Name" : "Full Name"}
            </label>
          </div>

          <div className="auth-input-group">
            <input 
              required 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder=" " 
              className="auth-input-field" 
            />
            <label className="auth-label">Phone Number</label>
          </div>

          <div className="auth-input-group">
            <input 
              required 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder=" " 
              className="auth-input-field" 
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

          <div className="auth-input-group">
            <div className="relative">
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input-field"
                placeholder=" "
              />
              <label className="auth-label">Confirm Password</label>
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-btn-primary mt-8">
            {loading ? 'Creating Account...' : 'SIGN UP'}
          </button>
          
          <button 
            type="button" 
            onClick={onToggle} 
            className="w-full text-center text-gray-500 font-black text-[11px] uppercase tracking-widest mt-8 opacity-40 hover:opacity-100 transition-opacity"
          >
            Already have an account? Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

// Fix: Added default export for SignUp module.
export default SignUp;
