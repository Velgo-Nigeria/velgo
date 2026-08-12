
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile, NotificationPreferences } from '../lib/types';
import { subscribeToPush, unsubscribeFromPush, checkSubscriptionStatus } from '../lib/pushManager';
import { RateAppModal } from '../components/RateAppModal';
import { openWhatsAppHelper } from '../lib/whatsapp';

interface SettingsProps { 
  profile: Profile | null; 
  onBack: () => void; 
  onNavigate: (view: string, data?: any) => void;
  onRefreshProfile: () => Promise<void> | void;
  onShowGuide?: () => void;
  onShowNotifications?: () => void;
  unreadCount?: number;
}

type ReAuthMode = 'bank' | null;

const Settings: React.FC<SettingsProps> = ({ profile, onBack, onNavigate, onRefreshProfile, onShowGuide, onShowNotifications, unreadCount }) => {
  // UI State
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(profile?.theme_mode || 'auto');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  
  // Detailed Notifications
  const defaultNotifs = {
    jobAlerts: true,
    renewals: true,
    reviews: true,
    security: true,
    promotions: false
  };
  const [notifications, setNotifications] = useState<NotificationPreferences>(profile?.notification_preferences || defaultNotifs);
  
  // Re-Authentication Modal State
  const [reAuthMode, setReAuthMode] = useState<ReAuthMode>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null); 
  const [isVerified, setIsVerified] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean>(true);

  // Editable Fields
  const [settingFullName, setSettingFullName] = useState(profile?.full_name || '');
  const [nameSaving, setNameSaving] = useState(false);

  const [newBankName, setNewBankName] = useState(profile?.bank_name || '');
  const [newAccountNum, setNewAccountNum] = useState(profile?.account_number || '');
  const [newAccountName, setNewAccountName] = useState(profile?.account_name || '');
  const [bankSaving, setBankSaving] = useState(false);
  
  const [emergencyName, setEmergencyName] = useState(profile?.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(profile?.emergency_contact_phone || '');
  const [emergencySaving, setEmergencySaving] = useState(false);
  
  const [signingOut, setSigningOut] = useState(false);

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const DELETE_REASONS = [
    'Found another service',
    'Privacy concerns',
    'App / Technical issues',
    'High data cost / network problems',
    'No longer need it',
    'Other'
  ];

  const resetDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmation('');
    setDeleteReason('');
    setCustomDeleteReason('');
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError(null);
  };

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.email === 'admin.velgo@gmail.com'; 

  const checkIdentities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const hasEmailProvider = user.identities?.some(id => id.provider === 'email') ?? false;
        setHasPassword(hasEmailProvider);
      }
    } catch (e) {
      console.warn("Error checking auth user identities:", e);
    }
  };

  // Check if user has an email identity (password set) on mount or whenever they access Settings
  useEffect(() => {
    checkIdentities();
  }, []);

  // Check Push Status on Mount
  useEffect(() => {
      const initPushState = async () => {
          const isSubscribed = await checkSubscriptionStatus();
          setPushEnabled(isSubscribed);
      };
      initPushState();
  }, []);

  const handleClearCache = async () => {
    if(window.confirm("This will reset the app and log you out. Continue?")) {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for(let registration of registrations) {
                registration.unregister();
            }
        }
        await supabase.auth.signOut();
        window.location.reload();
    }
  };

  const handleSignOut = async () => {
      setSigningOut(true);
      await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
      setDeleteError(null);

      if (!deleteReason) {
          setDeleteError('Please select a reason for leaving.');
          return;
      }

      if (hasPassword) {
          if (!deletePassword) {
              setDeleteError('Please enter your account password.');
              return;
          }
      } else {
          if (deleteConfirmation !== 'DELETE') {
              setDeleteError('Please type "DELETE" to confirm.');
              return;
          }
      }

      setIsDeleting(true);

      try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const userEmail = (profile?.email || authUser?.email || '').trim();

          // Verify password if account uses password authentication
          if (hasPassword) {
              if (!userEmail) {
                  setDeleteError('Could not verify account email for password validation.');
                  setIsDeleting(false);
                  return;
              }

              const { error: signInError } = await supabase.auth.signInWithPassword({
                  email: userEmail,
                  password: deletePassword,
              });

              if (signInError) {
                  setDeleteError('Incorrect password. Please verify your current password.');
                  setIsDeleting(false);
                  return;
              }
          }

          // 1. Archive account details into deleted_accounts table for security audit & blacklist
          if (profile) {
              const fullReason = `[${deleteReason}]${customDeleteReason.trim() ? ` - ${customDeleteReason.trim()}` : ''}`;
              const archivePayload = {
                  user_id: profile.id,
                  full_name: profile.full_name || '',
                  email: userEmail.toLowerCase(),
                  phone_number: (profile.phone_number || '').trim(),
                  role: profile.role || 'user',
                  reason: fullReason,
                  metadata: {
                      is_verified: profile.is_verified || false,
                      completed_jobs_count: profile.completed_jobs_count || 0,
                      average_rating: profile.average_rating || 0,
                      created_at: profile.created_at || new Date().toISOString()
                  },
                  deleted_at: new Date().toISOString()
              };

              try {
                  const { error: archiveError } = await supabase
                      .from('deleted_accounts')
                      .insert([archivePayload]);
                  
                  if (archiveError) {
                      console.warn("Client-side archive warning (SQL trigger may handle this):", archiveError.message);
                  }
              } catch (archCatch) {
                  console.warn("Client-side archive catch:", archCatch);
              }
          }

          // 2. Execute deletion RPC
          const { error } = await supabase.rpc('delete_own_account');
          
          if (error) {
              console.error("Delete Account Error:", error);
              throw error;
          }

          localStorage.clear();
          sessionStorage.clear();
          if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(key => caches.delete(key)));
          }
          await supabase.auth.signOut();
          window.location.href = '/'; 
      } catch (err: any) {
          setDeleteError(`Failed to delete account: ${err.message || 'Unknown Error'}`);
          setIsDeleting(false);
      }
  };

  const handleSubmitReview = async () => {
      if (!profile?.is_verified) {
          alert('You need to be verified to submit an app review.');
          return;
      }
      if (!reviewText.trim()) return;

      setSubmittingReview(true);
      const { error } = await supabase.from('app_reviews').insert([{
          user_id: profile.id,
          rating: reviewRating,
          review_text: reviewText
      }]);
      setSubmittingReview(false);

      if (error) {
          alert("Error submitting review: " + error.message);
      } else {
          alert("Thank you for your review!");
          setShowReviewModal(false);
          setReviewText('');
          setReviewRating(5);
      }
  };

  const updatePreference = async (updates: Partial<Profile>) => {
      if(!profile) return;
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      await onRefreshProfile();
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'auto') => {
      setThemeMode(mode);
      updatePreference({ theme_mode: mode });
      const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  };

  const toggleNotif = (key: keyof NotificationPreferences) => {
      const updated = { ...notifications, [key]: !notifications[key] };
      setNotifications(updated);
      updatePreference({ notification_preferences: updated });
  };
  
  const handlePushToggle = async () => {
      if (!profile || pushLoading) return;
      setPushLoading(true);

      try {
          if (pushEnabled) {
              // Turn OFF
              const success = await unsubscribeFromPush(profile.id);
              if (success) {
                  setPushEnabled(false);
              } else {
                  alert("Failed to disable notifications. Please try again.");
              }
          } else {
              // Turn ON
              const result = await subscribeToPush(profile.id);
              
              if (result.success) {
                  setPushEnabled(true);
                  alert("Success! You will now receive alerts on this device.");
              } else {
                  alert(`Could not enable notifications.\n\nError: ${result.error}`);
              }
          }
      } catch (err: any) {
          alert("System Error: " + err.message);
      } finally {
          setPushLoading(false);
      }
  };

  const handleReAuth = async () => {
    if (!profile?.id) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) {
            setAuthError("Could not verify user identity. Please relogin.");
            setAuthLoading(false);
            return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: password });
        if (error) {
            setAuthError("Incorrect password. Please try again.");
            setAuthLoading(false);
        } else {
            setIsVerified(true);
            setAuthLoading(false);
        }
    } catch (e) {
        setAuthError("Verification failed due to network error.");
        setAuthLoading(false);
    }
  };

  const saveBankDetails = async () => {
    if (!profile?.id) return;
    if (!newAccountName || !newAccountNum || !newBankName) {
        alert("Please fill in all bank details.");
        return;
    }
    setBankSaving(true);
    const { error } = await supabase.from('profiles').update({
        bank_name: newBankName,
        account_number: newAccountNum,
        account_name: newAccountName
    }).eq('id', profile.id);
    setBankSaving(false);
    if (!error) {
        alert("Bank details updated securely.");
        await onRefreshProfile();
        setReAuthMode(null);
        setPassword('');
        setIsVerified(false);
    } else {
        alert("Failed: " + error.message);
    }
  };

  const saveFullName = async () => {
    if (!profile?.id) return;
    const trimmed = settingFullName.trim();
    if (!trimmed) {
      alert("Please enter a valid full name.");
      return;
    }
    const nameChanged = profile.full_name !== trimmed;
    const isNameLocked = !!(profile.is_verified || profile.nin_image_url);

    if (isNameLocked) {
      alert("Your official profile name is locked because your account is verified or pending ID verification. Please contact the Velgo Verification Desk on WhatsApp to request an official name change.");
      return;
    }

    setNameSaving(true);

    const updates: any = {
      full_name: trimmed,
      updated_at: new Date().toISOString()
    };

    if (profile.is_verified && nameChanged) {
      updates.is_verified = false;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
    if (error) {
      alert("Failed to update name: " + error.message);
    } else {
      try {
        await supabase.auth.updateUser({ data: { full_name: trimmed } });
      } catch (authErr) {
        console.warn("Auth user_metadata sync failed:", authErr);
      }

      if (profile.is_verified && nameChanged) {
        alert("Name updated! Because your official profile name was changed, your ID verification status has been reset. Please re-upload your ID matching your new name.");
      } else {
        alert("Profile name updated successfully!");
      }
      await onRefreshProfile();
    }
    setNameSaving(false);
  };

  const saveEmergencyContact = async () => {
      if (!profile?.id) return;
      setEmergencySaving(true);
      const { error } = await supabase.from('profiles').update({
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone
      }).eq('id', profile.id);
      setEmergencySaving(false);
      if (!error) {
          alert("Emergency contact updated.");
          await onRefreshProfile();
      } else {
          alert("Error saving contact: " + error.message);
      }
  };

  const ThemeIcon = () => {
      if (themeMode === 'auto') return <i className="fa-solid fa-circle-half-stroke text-gray-400"></i>;
      if (themeMode === 'dark') return <i className="fa-solid fa-moon text-purple-500"></i>;
      return <i className="fa-solid fa-sun text-orange-400"></i>;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-40 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-900 px-6 pt-10 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
              <i className="fa-solid fa-chevron-left text-gray-500"></i>
          </button>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Settings</h1>
        </div>
        {onShowNotifications && (
          <button 
            onClick={onShowNotifications} 
            className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white relative hover:scale-105 transition-transform"
          >
            <i className="fa-solid fa-bell"></i>
            {unreadCount !== undefined && unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 bg-brand text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            ) : null}
          </button>
        )}
      </div>

      <div className="p-6 space-y-8 relative z-10">
        {isAdmin && (
            <button onClick={() => onNavigate('admin')} className="w-full bg-gray-900 text-white p-5 rounded-[24px] shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><i className="fa-solid fa-shield-halved text-xs"></i></div>
                    <span className="text-sm font-black uppercase">Admin Dashboard</span>
                </div>
                <i className="fa-solid fa-arrow-right"></i>
            </button>
        )}

        <section>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Personal Identity</h3>
            <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Official Profile Name</h4>
                        <p className="text-[10px] text-gray-400 font-medium">Must match your government ID document.</p>
                    </div>
                    {profile?.is_verified ? (
                        <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                            <i className="fa-solid fa-circle-check text-[10px]"></i> Verified
                        </span>
                    ) : profile?.nin_image_url ? (
                        <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                            <i className="fa-solid fa-hourglass-half text-[10px]"></i> ID Pending
                        </span>
                    ) : (
                        <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                            <i className="fa-solid fa-clock text-[10px]"></i> Unverified
                        </span>
                    )}
                </div>
                <div className="space-y-3">
                    <input 
                        disabled={!!(profile?.is_verified || profile?.nin_image_url)}
                        value={settingFullName} 
                        onChange={e => setSettingFullName(e.target.value)} 
                        placeholder="Full Name" 
                        className="w-full bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-xl text-xs font-bold outline-none dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" 
                    />
                    {profile?.is_verified || profile?.nin_image_url ? (
                        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                                <i className="fa-solid fa-lock text-amber-600"></i>
                                <span>Name Locked for Security</span>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                                Profile names are locked once an ID is submitted or verified. To request an official name change, contact the Velgo Verification Desk with legal proof.
                            </p>
                            <button 
                                type="button"
                                onClick={() => openWhatsAppHelper(
                                  `Hello Velgo Verification Desk, I would like to request an official name change for my account.\nUser ID: ${profile?.id}\nCurrent Registered Name: ${profile?.full_name}`,
                                  '2349167799600',
                                  'Velgo Verification Desk'
                                )}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                                <i className="fa-brands fa-whatsapp text-sm"></i> Request Change via WhatsApp
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={saveFullName} 
                            disabled={nameSaving || !settingFullName.trim() || settingFullName.trim() === profile?.full_name} 
                            className="w-full bg-brand text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-opacity"
                        >
                            {nameSaving ? 'Saving...' : 'Update Official Name'}
                        </button>
                    )}
                </div>
            </div>
        </section>

        <section>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Account Security</h3>
            <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <button onClick={() => onNavigate('change-password')} className="w-full p-5 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><i className="fa-solid fa-lock text-xs"></i></div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Change Password</span>
                    </div>
                    <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
                </button>
                <button 
                  onClick={async () => {
                    await checkIdentities();
                    setReAuthMode('bank'); 
                    setIsVerified(false); 
                    setPassword(''); 
                    setAuthError(null); 
                  }} 
                  className="w-full p-5 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><i className="fa-solid fa-building-columns text-xs"></i></div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Bank Details</span>
                    </div>
                    <i className="fa-solid fa-pen text-gray-300 text-xs"></i>
                </button>
            </div>
        </section>

        <section>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Safety Protocols</h3>
            <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
                <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0"><i className="fa-solid fa-kit-medical text-xs"></i></div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Emergency Contact</h4>
                        <p className="text-[10px] text-gray-400 font-medium">We'll contact this person if you flag an emergency.</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Contact Name" className="w-full bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-xl text-xs font-bold outline-none dark:text-white" />
                    <input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="Contact Phone" type="tel" className="w-full bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-xl text-xs font-bold outline-none dark:text-white" />
                    <button onClick={saveEmergencyContact} disabled={emergencySaving} className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest">{emergencySaving ? 'Saving...' : 'Update Contact'}</button>
                </div>
            </div>
        </section>

        <section>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">App Experience</h3>
            <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-5 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ThemeIcon />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Appearance</span>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button onClick={() => handleThemeChange('light')} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${themeMode === 'light' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}>Light</button>
                        <button onClick={() => handleThemeChange('dark')} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${themeMode === 'dark' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}>Dark</button>
                        <button onClick={() => handleThemeChange('auto')} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${themeMode === 'auto' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}>Auto</button>
                    </div>
                </div>

                {/* Job Alerts (Visual only, logic tied to push) */}
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <i className="fa-solid fa-bell text-gray-400"></i>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Job Alerts</span>
                     </div>
                     <button onClick={() => toggleNotif('jobAlerts')} className={`w-10 h-6 rounded-full transition-colors relative ${notifications.jobAlerts ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}>
                         <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notifications.jobAlerts ? 'left-5' : 'left-1'}`} />
                     </button>
                </div>
                
                {/* Push Notification Toggle - FUNCTIONAL */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-mobile-screen text-gray-400"></i>
                        <div>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block leading-none">Push Notifications</span>
                            <span className="text-[9px] text-gray-400">Get alerts on this device</span>
                        </div>
                    </div>
                    <button 
                        onClick={handlePushToggle} 
                        disabled={pushLoading}
                        className={`w-10 h-6 rounded-full transition-colors relative ${pushEnabled ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                         <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${pushEnabled ? 'left-5' : 'left-1'}`} />
                    </button>
                </div>

                {onShowGuide && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-book-open text-gray-400"></i>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">App Guide</span>
                        </div>
                        <button onClick={onShowGuide} className="text-[10px] font-black uppercase text-brand bg-brand/10 px-3 py-1.5 rounded-lg hover:bg-brand hover:text-white transition-colors">View</button>
                    </div>
                )}

                 <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <i className="fa-solid fa-broom text-gray-400"></i>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Reset App</span>
                     </div>
                     <button onClick={handleClearCache} className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">Clear Data</button>
                </div>

                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <i className="fa-solid fa-star text-yellow-400"></i>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Rate Velgo</span>
                     </div>
                     <button onClick={() => setShowReviewModal(true)} className="text-[10px] font-black uppercase text-brand bg-brand/10 hover:bg-brand hover:text-white transition-colors px-3 py-1.5 rounded-lg">Review App</button>
                </div>
            </div>
        </section>

        {/* Legal & Community */}
        <section>
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Legal</h3>
             <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {['Terms of Service', 'Privacy Policy', 'Worker Guidelines'].map((item, i) => (
                    <button key={i} onClick={() => onNavigate('legal', item === 'Terms of Service' ? 'tos' : item === 'Privacy Policy' ? 'privacy' : 'guidelines')} className="w-full p-5 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 last:border-0 active:bg-gray-50 dark:active:bg-gray-700">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{item}</span>
                        <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
                    </button>
                ))}
                <button onClick={() => onNavigate('safety')} className="w-full p-5 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-700">
                        <span className="text-sm font-bold text-red-500">Safety Center</span>
                        <i className="fa-solid fa-chevron-right text-red-300 text-xs"></i>
                </button>
             </div>
        </section>

        {/* Sign Out Button */}
        <button 
            onClick={handleSignOut} 
            disabled={signingOut} 
            className="w-full bg-red-50 dark:bg-red-900/20 p-5 rounded-[32px] flex items-center justify-between border border-red-100 dark:border-red-800 group active:scale-95 transition-all mt-4"
        >
            <span className="font-black text-red-600 dark:text-red-400 text-sm group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
                {signingOut ? 'Signing Out...' : 'Log Out'}
            </span>
            <i className="fa-solid fa-right-from-bracket text-red-400 dark:text-red-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors"></i>
        </button>

        {/* Delete Account */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 ml-2">Danger Zone</h3>
            <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full bg-red-50 dark:bg-red-900/10 p-5 rounded-[32px] flex items-center justify-between border border-red-100 dark:border-red-900/30 group active:scale-95 transition-all"
            >
                <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                        <i className="fa-solid fa-trash-can text-red-600 dark:text-red-400 text-xs"></i>
                     </div>
                     <div className="text-left">
                        <span className="block text-sm font-black text-red-600 dark:text-red-400 group-hover:text-red-700 transition-colors">Delete Account</span>
                        <span className="text-[9px] text-red-400 font-medium">Irreversible action</span>
                     </div>
                </div>
                <i className="fa-solid fa-chevron-right text-red-300 text-xs"></i>
            </button>
        </div>

        <div className="pt-8 text-center">
            <p className="text-[10px] text-gray-300 font-mono uppercase">Version 1.0.8 (Push Enabled)</p>
        </div>

      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 w-full max-w-md space-y-5 text-left border-2 border-red-100 dark:border-red-900/30 max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-3">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 text-lg">
                              <i className="fa-solid fa-triangle-exclamation"></i>
                          </div>
                          <div>
                              <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">Delete Account</h3>
                              <p className="text-[10px] text-red-500 font-bold">Irreversible Action</p>
                          </div>
                      </div>
                      <button 
                          onClick={resetDeleteModal} 
                          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-200"
                      >
                          <i className="fa-solid fa-xmark text-sm"></i>
                      </button>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                      This will <b>permanently erase</b> your profile, booking history, ratings, and active listings from Velgo.
                  </p>

                  {deleteError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold rounded-2xl flex items-start gap-2">
                          <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
                          <span>{deleteError}</span>
                      </div>
                  )}

                  {/* 1. Reason Selection */}
                  <div className="space-y-2">
                      <label className="text-[11px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider block">
                          1. Reason for leaving <span className="text-red-500">*</span>
                      </label>
                      <select
                          value={deleteReason}
                          onChange={(e) => {
                              setDeleteReason(e.target.value);
                              setDeleteError(null);
                          }}
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-3.5 rounded-2xl text-xs font-bold outline-none text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20"
                      >
                          <option value="">-- Select Reason --</option>
                          {DELETE_REASONS.map((r) => (
                              <option key={r} value={r}>
                                  {r}
                              </option>
                          ))}
                      </select>

                      {deleteReason !== '' && (
                          <textarea
                              value={customDeleteReason}
                              onChange={(e) => setCustomDeleteReason(e.target.value)}
                              placeholder="Additional details or feedback (optional)..."
                              rows={2}
                              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-3 rounded-2xl text-xs font-medium outline-none text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500/20 resize-none mt-2"
                          />
                      )}
                  </div>

                  {/* 2. Security Verification */}
                  <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                      <label className="text-[11px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider block">
                          2. Security Verification <span className="text-red-500">*</span>
                      </label>

                      {hasPassword ? (
                          <div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                                  Enter your current password to authorize account erasure:
                              </p>
                              <div className="relative">
                                  <input
                                      type={showDeletePassword ? 'text' : 'password'}
                                      value={deletePassword}
                                      onChange={(e) => {
                                          setDeletePassword(e.target.value);
                                          setDeleteError(null);
                                      }}
                                      placeholder="Account Password"
                                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-3.5 rounded-2xl text-xs font-bold outline-none text-gray-900 dark:text-white placeholder-gray-400 pr-12 focus:ring-2 focus:ring-red-500/20"
                                  />
                                  <button
                                      type="button"
                                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                  >
                                      <i className={`fa-solid ${showDeletePassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-2">
                              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl text-[11px] text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                                  <i className="fa-brands fa-google text-blue-500 shrink-0"></i>
                                  <span>Google Account. Type <b>DELETE</b> below to confirm.</span>
                              </div>
                              <input
                                  value={deleteConfirmation}
                                  onChange={(e) => {
                                      setDeleteConfirmation(e.target.value);
                                      setDeleteError(null);
                                  }}
                                  placeholder="Type DELETE"
                                  className="w-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-3.5 rounded-2xl text-center text-xs font-black outline-none text-red-600 placeholder-red-300 focus:ring-2 focus:ring-red-500/20 uppercase"
                              />
                          </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                          onClick={resetDeleteModal}
                          disabled={isDeleting}
                          className="py-3.5 rounded-2xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-all"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={handleDeleteAccount}
                          disabled={isDeleting || !deleteReason || (hasPassword ? !deletePassword : deleteConfirmation !== 'DELETE')}
                          className="py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                          {isDeleting ? (
                              <>
                                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                                  <span>Erasing...</span>
                              </>
                          ) : (
                              'Delete Forever'
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Re-Auth / Bank Modal */}
      {reAuthMode === 'bank' && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 w-full max-w-sm space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">Bank Details</h3>
                      <button onClick={() => { setReAuthMode(null); setPassword(''); setAuthError(null); }} className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300"><i className="fa-solid fa-xmark"></i></button>
                  </div>

                  {!isVerified ? (
                      !hasPassword ? (
                          <div className="space-y-4 text-center">
                              <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl leading-relaxed text-left flex items-start gap-2">
                                  <i className="fa-solid fa-lock mt-0.5 shrink-0"></i>
                                  <span>You signed up using Google and don't have an account password set yet. To protect your sensitive bank details, please create a secure password first.</span>
                              </p>
                              
                              <button 
                                  onClick={() => {
                                      setReAuthMode(null);
                                      onNavigate('change-password');
                                  }} 
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-900/10 active:scale-95 transition-all text-center block"
                              >
                                  Create Account Password
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 p-3 rounded-xl">
                                  <i className="fa-solid fa-lock mr-2"></i>Security Check Required
                              </p>
                              
                              {authError && <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl border border-red-100 flex items-start gap-2"><i className="fa-solid fa-circle-exclamation mt-0.5"></i> <span>{authError}</span></div>}

                              <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    placeholder="Enter Password" 
                                    className="w-full bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl text-sm font-bold outline-none dark:text-white dark:placeholder-gray-400 pr-12" 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                              </div>
                              
                              <button 
                                  onClick={handleReAuth} 
                                  disabled={authLoading || !password} 
                                  className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50"
                              >
                                  {authLoading ? 'Verifying...' : 'Unlock'}
                              </button>
                          </div>
                      )
                  ) : (
                      <div className="space-y-3">
                          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest text-center mb-2">Identity Verified</p>
                          <input value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="Bank Name (e.g. GTBank)" className="w-full bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl text-sm font-bold outline-none dark:text-white dark:placeholder-gray-400" />
                          <input value={newAccountNum} onChange={e => setNewAccountNum(e.target.value)} placeholder="Account Number" type="tel" className="w-full bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl text-sm font-bold outline-none dark:text-white dark:placeholder-gray-400" />
                          <input value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="Account Name" className="w-full bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl text-sm font-bold outline-none dark:text-white dark:placeholder-gray-400" />
                          <button 
                              onClick={saveBankDetails} 
                              disabled={bankSaving} 
                              className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50"
                          >
                              {bankSaving ? 'Saving...' : 'Save Details'}
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Rate App Modal */}
      <RateAppModal 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        profile={profile}
      />
    </div>
  );
};

export default Settings;
