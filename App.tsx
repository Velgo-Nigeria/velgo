import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { Profile } from './lib/types';
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
import { subscribeToPush } from './lib/pushManager';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [view, setView] = useState<any>('landing');
  const [viewData, setViewData] = useState<any>(null);
  
  const [toast, setToast] = useState<{msg: string, type: 'info'|'success'|'alert'} | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const viewRef = useRef(view);

  useEffect(() => { 
    viewRef.current = view; 
  }, [view]);

  useEffect(() => {
    const applyTheme = (mode: string) => {
      const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyTheme(profile?.theme_mode || 'auto');
  }, [profile?.theme_mode]);

  useEffect(() => {
    if (!window.history.state) {
        window.history.replaceState({ view: 'landing', data: null }, '', '');
    }
    const handlePopState = (event: PopStateEvent) => {
        if (event.state && event.state.view) {
            setView(event.state.view);
            setViewData(event.state.data);
        } else {
            setView('landing');
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newView: string, data: any = null) => {
    window.history.pushState({ view: newView, data }, '', '');
    setView(newView);
    setViewData(data);
    window.scrollTo(0, 0);
  };

  const handleBackNavigation = (fallbackView: string) => {
     if (window.history.state && view !== 'home' && view !== 'landing') {
         window.history.back();
     } else {
         setView(fallbackView);
         window.history.replaceState({ view: fallbackView, data: null }, '', '');
     }
  };

  const fetchProfile = useCallback(async (uid: string, retries = 3) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      setProfile(data);
      setProfileError(false);
      setSystemError(null);
    } else if (retries > 0) {
      await new Promise(r => setTimeout(r, 500));
      fetchProfile(uid, retries - 1);
    } else {
      setProfileError(true);
    }
  }, []);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          fetchProfile(data.session.user.id);
          if (['landing', 'login', 'signup'].includes(viewRef.current)) {
              setView('home');
              window.history.replaceState({ view: 'home', data: null }, '', '');
          }
        }
      } catch (err) { console.warn(err); } finally { setLoading(false); }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
        if (viewRef.current !== 'reset-password' && viewRef.current !== 'change-password') {
            setView('landing');
            window.history.replaceState({ view: 'landing', data: null }, '', '');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]); 

  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
      <ShieldIcon className="h-20 animate-pulse text-brand" />
      <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-[4px]">Velgo Nigeria Hub</p>
    </div>
  );

  const renderContent = () => {
    if (!session) {
      switch (view) {
        case 'login': return <Login onToggle={() => navigate('signup')} />;
        case 'signup': return <SignUp onToggle={() => navigate('login')} initialRole={viewData || 'client'} />;
        case 'reset-password': return <ResetPassword onSuccess={() => navigate('login')} onBack={() => handleBackNavigation('login')} />;
        case 'legal': return <Legal initialTab={viewData} onBack={() => handleBackNavigation('landing')} />;
        case 'about': return <About onBack={() => handleBackNavigation('landing')} />;
        default: return <Landing onGetStarted={(role) => navigate('signup', role)} onLogin={() => navigate('login')} onViewLegal={(tab) => navigate('legal', tab)} onViewAbout={() => navigate('about')} />;
      }
    }

    if (profile && (!profile.role || !profile.phone_number)) {
      return <CompleteProfile session={session} onComplete={() => fetchProfile(session.user.id)} />;
    }

    switch (view) {
      case 'home': return <Home profile={profile} onViewWorker={(id) => navigate('worker-detail', id)} onViewTask={(id) => navigate('task-detail', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} onPostTask={() => navigate('post-task')} onShowGuide={() => setShowGuide(true)} />;
      case 'activity': return <Activity profile={profile} onOpenChat={(id) => navigate('chat', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} />;
      case 'messages': return <Messages profile={profile} onOpenChat={(id) => navigate('chat', id)} />;
      case 'profile': return <ProfilePage profile={profile} onRefreshProfile={() => fetchProfile(session.user.id)} onSubscription={() => navigate('subscription')} onSettings={() => navigate('settings')} />;
      case 'subscription': return <Subscription profile={profile} onRefreshProfile={() => fetchProfile(session.user.id)} onBack={() => handleBackNavigation('profile')} />;
      case 'chat': return <Chat profile={profile} partnerId={viewData} onBack={() => handleBackNavigation('messages')} />;
      case 'worker-detail': return <WorkerDetail profile={profile} workerId={viewData} onBack={() => handleBackNavigation('home')} onBook={(id) => navigate('chat', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} />;
      case 'task-detail': return <TaskDetail profile={profile} taskId={viewData} onBack={() => handleBackNavigation('home')} onUpgrade={() => navigate('subscription')} />;
      case 'settings': return <Settings profile={profile} onBack={() => handleBackNavigation('profile')} onNavigate={navigate} onRefreshProfile={() => fetchProfile(session.user.id)} onShowGuide={() => setShowGuide(true)} />;
      case 'change-password': return <ResetPassword onSuccess={() => { setToast({ msg: 'Password updated!', type: 'success' }); handleBackNavigation('settings'); }} onBack={() => handleBackNavigation('settings')} />;
      case 'post-task': return <PostTask profile={profile} onRefreshProfile={() => fetchProfile(session.user.id)} onBack={() => handleBackNavigation('home')} onUpgrade={() => navigate('subscription')} />;
      case 'legal': return <Legal initialTab={viewData} onBack={() => handleBackNavigation('settings')} />;
      case 'safety': return <Safety profile={profile} onBack={() => handleBackNavigation('settings')} />;
      case 'about': return <About onBack={() => handleBackNavigation('settings')} />;
      case 'admin': return <AdminDashboard onBack={() => handleBackNavigation('settings')} />;
      default: return <Home profile={profile} onViewWorker={(id) => navigate('worker-detail', id)} onViewTask={(id) => navigate('task-detail', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} onPostTask={() => navigate('post-task')} onShowGuide={() => setShowGuide(true)} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200 flex flex-col md:flex-row overflow-x-hidden">
        {session && profile && !['admin', 'chat', 'reset-password', 'change-password'].includes(view) && (
            <aside className="hidden md:flex flex-col w-72 border-r border-gray-100 dark:border-gray-800 h-screen sticky top-0 p-6 bg-white dark:bg-gray-900 z-50">
                <div className="mb-10 pl-2"><VelgoLogo /></div>
                <nav className="space-y-3 flex-1">
                    <SidebarItem icon="fa-house-chimney" label="Marketplace" active={['home', 'worker-detail', 'task-detail', 'post-task'].includes(view)} onClick={() => navigate('home')} />
                    <SidebarItem icon="fa-bolt-lightning" label="My Gigs" active={view === 'activity'} onClick={() => navigate('activity')} />
                    <SidebarItem icon="fa-comments" label="Messages" active={['messages', 'chat'].includes(view)} onClick={() => navigate('messages')} />
                    <SidebarItem icon="fa-user-ninja" label="Profile" active={['profile', 'subscription', 'settings', 'legal', 'safety', 'about', 'change-password'].includes(view)} onClick={() => navigate('profile')} />
                </nav>
            </aside>
        )}
        <main className={`flex-1 w-full relative ${session ? 'max-w-md mx-auto md:max-w-none md:mx-0' : 'w-full'}`}>
          <div className={`${session ? 'md:max-w-6xl md:mx-auto md:p-6 md:pb-12' : 'w-full'}`}>{renderContent()}</div>
        </main>
        {toast && <NotificationToast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}
        <InstallPWA />
        {session && profile && !['admin', 'chat', 'reset-password', 'change-password'].includes(view) && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 flex justify-around items-center h-20 safe-bottom z-50 shadow-lg transition-colors duration-200">
            <button onClick={() => navigate('home')} className={`flex flex-col items-center flex-1 ${['home', 'worker-detail', 'task-detail', 'post-task'].includes(view) ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-house-chimney text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">Market</span>
            </button>
            <button onClick={() => navigate('activity')} className={`flex flex-col items-center flex-1 ${view === 'activity' ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-bolt-lightning text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">Gigs</span>
            </button>
             <button onClick={() => navigate('messages')} className={`flex flex-col items-center flex-1 ${['messages', 'chat'].includes(view) ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-comments text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">Chats</span>
            </button>
            <button onClick={() => navigate('profile')} className={`flex flex-col items-center flex-1 ${['profile', 'subscription', 'settings', 'legal', 'safety', 'about', 'change-password'].includes(view) ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-user-ninja text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">Profile</span>
            </button>
          </nav>
        )}
      </div>
    </ErrorBoundary>
  );
};

const SidebarItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all group ${active ? 'bg-brand text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
      <i className={`fa-solid ${icon} text-lg ${active ? 'text-white' : 'text-gray-400 group-hover:text-brand'}`}></i>
      <span className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
  </button>
);

export default App;