
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { Profile } from './types';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import Activity from './pages/Activity';
import Messages from './pages/Messages';
import ProfilePage from './pages/Profile';
import Subscription from './pages/Subscription';
import Chat from './pages/Chat';
import WorkerDetail from './pages/WorkerDetail';
import TaskDetail from './pages/TaskDetail';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';
import PostTask from './pages/PostTask';
import CompleteProfile from './pages/CompleteProfile';
import Legal from './pages/Legal';
import Safety from './pages/Safety';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/About';
import { ShieldIcon, VelgoLogo } from './components/Brand';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPWA } from './components/InstallPWA';
import { NotificationToast } from './components/NotificationToast';
import { UserGuide } from './components/UserGuide';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [view, setView] = useState<any>('landing');
  const [viewData, setViewData] = useState<any>(null);
  
  // Notification State
  const [toast, setToast] = useState<{msg: string, type: 'info'|'success'|'alert'} | null>(null);
  
  // User Guide State
  const [showGuide, setShowGuide] = useState(false);

  const viewRef = useRef(view);
  const viewDataRef = useRef(viewData);

  useEffect(() => { 
    viewRef.current = view; 
    viewDataRef.current = viewData;
  }, [view, viewData]);

  // Apply Theme Effect
  useEffect(() => {
    const applyTheme = (mode: string) => {
      const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (profile?.theme_mode) {
      applyTheme(profile.theme_mode);
    } else {
      applyTheme('auto'); // Default
    }
  }, [profile?.theme_mode]);

  // BROWSER HISTORY & BACK BUTTON LOGIC
  useEffect(() => {
    // 1. Set initial history state on load
    if (!window.history.state) {
        window.history.replaceState({ view: 'landing', data: null }, '', '');
    }

    // 2. Listen for Back Button (PopState)
    const handlePopState = (event: PopStateEvent) => {
        if (event.state && event.state.view) {
            // Internal state update without pushing new history
            setView(event.state.view);
            setViewData(event.state.data);
        } else {
            // Fallback if state is missing
            setView('landing');
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update navigate to push history state
  const navigate = (newView: string, data: any = null) => {
    window.history.pushState({ view: newView, data }, '', '');
    setView(newView);
    setViewData(data);
    window.scrollTo(0, 0);
  };

  // Helper for UI "Back" buttons to behave naturally
  const handleBackNavigation = (fallbackView: string) => {
     // If we have history to go back to, use it. Otherwise, force a view change.
     // Checking history.length is unreliable, so we rely on the fact that if we are here, we likely pushed state.
     // For safety in this specific app structure, we can check if we are deep in navigation.
     if (window.history.state && view !== 'home' && view !== 'landing') {
         window.history.back();
     } else {
         // Fallback replace (don't push to avoid stack loops on home)
         setView(fallbackView);
         window.history.replaceState({ view: fallbackView, data: null }, '', '');
     }
  };


  const fetchProfile = useCallback(async (uid: string, retries = 3) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    
    if (error) {
      if (error.message && (error.message.includes('recursion') || error.message.includes('policy'))) {
         console.error("Critical Policy Error:", error);
         setSystemError("Database Policy Error. Please run the provided SQL script in Supabase.");
         setLoading(false);
         return;
      }
    }

    if (data) {
      setProfile(data);
      setProfileError(false);
      setSystemError(null);
      
      const created = new Date(data.created_at || Date.now()).getTime();
      if (Date.now() - created < 5 * 60 * 1000) {
          if (!localStorage.getItem('guideShown')) {
              setShowGuide(true);
              localStorage.setItem('guideShown', 'true');
          }
      }
    } else {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 500));
        fetchProfile(uid, retries - 1);
      } else {
        setProfileError(true);
      }
    }
  }, []);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const initialSession = data.session;
        setSession(initialSession);
        
        if (initialSession) {
          fetchProfile(initialSession.user.id);
          // If at auth screens, redirect to home and replace history so back button doesn't go to login
          if (['landing', 'login', 'signup'].includes(viewRef.current)) {
              setView('home');
              window.history.replaceState({ view: 'home', data: null }, '', '');
          }
        }
      } catch (err) {
        console.warn("Network error during session init:", err);
      } finally {
        setLoading(false);
      }
    };
    
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      
      if (event === 'PASSWORD_RECOVERY') {
         navigate('reset-password');
      }
      else if (currentSession) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
           fetchProfile(currentSession.user.id, 3);
           if (viewRef.current === 'landing' || viewRef.current === 'login' || viewRef.current === 'signup') {
              // Replace history to prevent backing into login
              setView('home');
              window.history.replaceState({ view: 'home', data: null }, '', '');
           }
        }
      } else {
        setProfile(null);
        setProfileError(false);
        setSystemError(null);
        if (viewRef.current !== 'reset-password') {
            setView('landing');
            window.history.replaceState({ view: 'landing', data: null }, '', '');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]); 

  // REALTIME NOTIFICATIONS
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase.channel('realtime_notifications')
        // Chat Messages
        .on(
            'postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` }, 
            (payload) => {
                if (viewRef.current === 'chat' && viewDataRef.current === payload.new.sender_id) return;
                setToast({ msg: 'New Message Received', type: 'info' });
            }
        )
        // Client: Worker applied to my job
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'bookings', filter: `client_id=eq.${session.user.id}` }, 
            (payload) => {
               if (payload.new.client_id === session.user.id) {
                   setToast({ msg: 'New Job Request!', type: 'success' });
               }
            }
        )
        // Client: Worker Accepted my Direct Request
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `client_id=eq.${session.user.id}` },
            (payload) => {
                if (payload.new.status === 'accepted') setToast({ msg: 'Worker Accepted Your Job!', type: 'success' });
            }
        )
        // Worker: Application Status Updates (Accepted or Declined)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `worker_id=eq.${session.user.id}` },
            (payload) => {
                const status = payload.new.status;
                if (status === 'accepted') {
                  setToast({ msg: 'Hooray! Application Accepted.', type: 'success' });
                } else if (status === 'cancelled') {
                  // 'cancelled' usually means Declined by client in this context
                  setToast({ msg: 'Update: Application Declined.', type: 'alert' });
                }
            }
        )
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
      <ShieldIcon className="h-20 animate-pulse text-brand" />
      <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-[4px]">Velgo Hub Edo</p>
    </div>
  );

  if (systemError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500 animate-pulse">
                <i className="fa-solid fa-server text-2xl"></i>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">System Update Needed</h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">{systemError}</p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button onClick={() => window.location.reload()} className="w-full px-6 py-4 bg-gray-900 text-white rounded-2xl text-xs font-bold uppercase shadow-lg">
                    Retry Connection
                </button>
                <button 
                    onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} 
                    className="w-full px-6 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-bold uppercase"
                >
                    Log Out
                </button>
            </div>
        </div>
      );
  }

  const renderContent = () => {
    if (!session) {
      switch (view) {
        case 'login': return <Login onToggle={() => navigate('signup')} />;
        case 'signup': return <SignUp onToggle={() => navigate('login')} initialRole={viewData || 'client'} />;
        case 'reset-password': return <ResetPassword onSuccess={() => navigate('login')} />;
        case 'legal': return <Legal initialTab={viewData} onBack={() => handleBackNavigation('landing')} />;
        case 'about': return <About onBack={() => handleBackNavigation('landing')} />;
        default: return <Landing onGetStarted={(role) => navigate('signup', role)} onLogin={() => navigate('login')} onViewLegal={(tab) => navigate('legal', tab)} onViewAbout={() => navigate('about')} />;
      }
    }

    const isProfileIncomplete = profile && (!profile.role || !profile.phone_number);
    if ((profileError && !profile) || isProfileIncomplete) {
      return <CompleteProfile session={session} onComplete={() => fetchProfile(session.user.id, 5)} />;
    }

    switch (view) {
      case 'home': return <Home profile={profile} onViewWorker={(id) => navigate('worker-detail', id)} onViewTask={(id) => navigate('task-detail', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} onPostTask={() => navigate('post-task')} onShowGuide={() => setShowGuide(true)} />;
      case 'activity': return <Activity profile={profile} onOpenChat={(id) => navigate('chat', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} />;
      case 'messages': return <Messages profile={profile} onOpenChat={(id) => navigate('chat', id)} />;
      case 'profile': return <ProfilePage profile={profile} onRefreshProfile={() => fetchProfile(session.user.id)} onSubscription={() => navigate('subscription')} onSettings={() => navigate('settings')} />;
      case 'subscription': return <Subscription profile={profile} sessionEmail={session?.user?.email} onRefreshProfile={() => fetchProfile(session.user.id)} onBack={() => handleBackNavigation('profile')} />;
      case 'chat': return <Chat profile={profile} partnerId={viewData} onBack={() => handleBackNavigation('messages')} />;
      case 'worker-detail': return <WorkerDetail profile={profile} workerId={viewData} onBack={() => handleBackNavigation('home')} onBook={(id) => navigate('chat', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} />;
      case 'task-detail': return <TaskDetail profile={profile} taskId={viewData} onBack={() => handleBackNavigation('home')} onUpgrade={() => navigate('subscription')} />;
      case 'settings': return <Settings profile={profile} onBack={() => handleBackNavigation('profile')} onNavigate={navigate} onRefreshProfile={() => fetchProfile(session.user.id)} />;
      case 'post-task': return <PostTask profile={profile} onRefreshProfile={() => fetchProfile(session.user.id)} onBack={() => handleBackNavigation('home')} onUpgrade={() => navigate('subscription')} />;
      case 'legal': return <Legal initialTab={viewData} onBack={() => handleBackNavigation('settings')} />;
      case 'safety': return <Safety profile={profile} onBack={() => handleBackNavigation('settings')} />;
      case 'about': return <About onBack={() => handleBackNavigation('settings')} />;
      case 'admin': return <AdminDashboard onBack={() => handleBackNavigation('settings')} />;
      case 'change-password': return <ResetPassword onSuccess={() => { alert('Password Updated'); navigate('settings'); }} />;
      case 'reset-password': return <ResetPassword onSuccess={() => { alert('Password Updated. Please log in.'); navigate('login'); }} />;
      default: return <Home profile={profile} onViewWorker={(id) => navigate('worker-detail', id)} onViewTask={(id) => navigate('task-detail', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} onPostTask={() => navigate('post-task')} onShowGuide={() => setShowGuide(true)} />;
    }
  };

  const SidebarItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
     <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all group ${active ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
         <i className={`fa-solid ${icon} text-lg ${active ? 'text-white' : 'text-gray-400 group-hover:text-brand'}`}></i>
         <span className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
     </button>
  );

  // Helper for Sidebar navigation (replaces history if switching main tabs to keep stack clean, optional preference)
  const navToTab = (tab: string) => {
      // If we are already on a main tab, we can push. 
      // Or we can replaceState to treat tabs as parallel roots. 
      // Let's use pushState for simplicity so back button works across tabs.
      navigate(tab);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200 flex flex-col md:flex-row overflow-x-hidden">
        
        {/* DESKTOP SIDEBAR */}
        {session && profile && view !== 'admin' && view !== 'chat' && view !== 'reset-password' && (
            <aside className="hidden md:flex flex-col w-72 border-r border-gray-100 dark:border-gray-800 h-screen sticky top-0 p-6 bg-white dark:bg-gray-900 z-50">
                <div className="mb-10 pl-2">
                    <VelgoLogo />
                </div>
                <nav className="space-y-3 flex-1">
                    <SidebarItem icon="fa-house-chimney" label="Marketplace" active={['home', 'worker-detail', 'task-detail', 'post-task'].includes(view)} onClick={() => navToTab('home')} />
                    <SidebarItem icon="fa-bolt-lightning" label="My Gigs" active={view === 'activity'} onClick={() => navToTab('activity')} />
                    <SidebarItem icon="fa-comments" label="Messages" active={['messages', 'chat'].includes(view)} onClick={() => navToTab('messages')} />
                    <SidebarItem icon="fa-user-ninja" label="Profile & Settings" active={['profile', 'subscription', 'settings', 'legal', 'safety', 'about'].includes(view)} onClick={() => navToTab('profile')} />
                </nav>
                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                         <img src={profile?.avatar_url} className="w-10 h-10 rounded-full bg-gray-100 object-cover" />
                         <div className="flex-1 min-w-0">
                             <p className="text-sm font-bold truncate dark:text-white">{profile?.full_name}</p>
                             <p className="text-xs text-gray-500 truncate capitalize">{profile?.role}</p>
                         </div>
                    </div>
                </div>
            </aside>
        )}

        {/* MAIN CONTENT AREA */}
        <main className={`flex-1 w-full relative ${session ? 'max-w-md mx-auto md:max-w-none md:mx-0' : 'w-full'}`}>
          {/* Constrain content width on Desktop to prevent stretching */}
          <div className={`${session ? 'md:max-w-6xl md:mx-auto md:p-6 md:pb-12' : 'w-full'}`}>
             {renderContent()}
          </div>
        </main>
        
        {toast && <NotificationToast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}
        <InstallPWA />

        {/* MOBILE BOTTOM NAV */}
        {session && profile && view !== 'admin' && view !== 'chat' && view !== 'reset-password' && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 flex justify-around items-center h-20 safe-bottom z-50 transition-colors duration-200 shadow-lg">
            <button onClick={() => navToTab('home')} className={`flex flex-col items-center flex-1 transition-all active:scale-90 ${['home', 'worker-detail', 'task-detail', 'post-task'].includes(view) ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-house-chimney text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">Market</span>
            </button>
            <button onClick={() => navToTab('activity')} className={`flex flex-col items-center flex-1 transition-all active:scale-90 ${['activity'].includes(view) ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-bolt-lightning text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">Gigs</span>
            </button>
             <button onClick={() => navToTab('messages')} className={`flex flex-col items-center flex-1 transition-all active:scale-90 ${['messages', 'chat'].includes(view) ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-comments text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">Chats</span>
            </button>
            <button onClick={() => navToTab('profile')} className={`flex flex-col items-center flex-1 transition-all active:scale-90 ${['profile', 'subscription', 'settings', 'legal', 'safety', 'about', 'change-password'].includes(view) ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-user-ninja text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">Profile</span>
            </button>
          </nav>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
