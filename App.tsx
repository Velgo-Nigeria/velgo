
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { supabase } from './lib/supabaseClient';
import { Profile } from './lib/types';

// Critical Pages (Keep Static for instant first paint)
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

// Lazy Load Secondary Pages (Reduces initial bundle size significantly)
const Home = React.lazy(() => import('./pages/Home'));
const Activity = React.lazy(() => import('./pages/Activity'));
const Overview = React.lazy(() => import('./pages/Overview'));
const ProfilePage = React.lazy(() => import('./pages/Profile'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const WorkerDetail = React.lazy(() => import('./pages/WorkerDetail'));
const TaskDetail = React.lazy(() => import('./pages/TaskDetail'));
const Settings = React.lazy(() => import('./pages/Settings'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const PostTask = React.lazy(() => import('./pages/PostTask'));
const CompleteProfile = React.lazy(() => import('./pages/CompleteProfile'));
const Legal = React.lazy(() => import('./pages/Legal'));
const Safety = React.lazy(() => import('./pages/Safety'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const About = React.lazy(() => import('./pages/About'));

import { VelgoLogo } from './components/Brand';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPWA } from './components/InstallPWA';
import { NotificationToast } from './components/NotificationToast';
import { UserGuide } from './components/UserGuide';
import { SuspendedScreen } from './components/SuspendedScreen';
import { NotificationPanel } from './components/NotificationPanel';

// Extracted Skeleton for reuse in Suspense fallback
const PageSkeleton = () => (
  <div className="h-screen w-full flex flex-col md:flex-row bg-white dark:bg-gray-900 overflow-hidden animate-pulse">
      <div className="hidden md:flex w-72 border-r border-gray-100 dark:border-gray-800 p-6 flex-col gap-8">
         <div className="h-10 w-32 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
         <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-12 w-full bg-gray-50 dark:bg-gray-800 rounded-xl"></div>)}
         </div>
      </div>
      <div className="flex-1 p-6 space-y-8">
         <div className="md:hidden flex justify-between items-center mb-8">
            <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
            <div className="flex gap-2">
               <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-2xl"></div>
               <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-2xl"></div>
            </div>
         </div>
         <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-[32px]"></div>
         <div className="space-y-4">
            {[1,2,3].map(i => (
                <div key={i} className="h-24 w-full bg-gray-50 dark:bg-gray-800 rounded-[24px]"></div>
            ))}
         </div>
      </div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitializingProfile, setIsInitializingProfile] = useState(false);
  const [view, setView] = useState<any>(() => {
    try {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/privacy' || pathname === '/privacy-policy' || pathname === '/terms' || pathname === '/terms-of-service') {
        return 'legal';
      }

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('view') === 'legal') {
        return 'legal';
      }
    } catch (e) {
      console.warn('Error parsing initial view query param/pathname:', e);
    }
    return 'landing';
  });
  const [viewData, setViewData] = useState<any>(() => {
    try {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/privacy' || pathname === '/privacy-policy') {
        return 'privacy';
      }
      if (pathname === '/terms' || pathname === '/terms-of-service') {
        return 'tos';
      }

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('view') === 'legal') {
        const tab = urlParams.get('tab');
        return tab === 'privacy' ? 'privacy' : (tab === 'terms' ? 'tos' : 'tos');
      }
    } catch (e) {
      console.warn('Error parsing initial viewData query param/pathname:', e);
    }
    return null;
  });
  
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'info' | 'success' | 'alert' }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [hasActivityBadge, setHasActivityBadge] = useState(false);

  const fetchActivityBadgeStatus = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const uid = session.user.id;
      
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, client_id, worker_id, status, task_id, rating, client_rating')
        .or(`client_id.eq.${uid},worker_id.eq.${uid}`);

      const bData = bookingsData || [];

      const hasPendingHiringRequests = bData.some(b => b.client_id === uid && b.status === 'pending' && b.task_id != null);
      const hasPendingWorkingRequests = bData.some(b => b.worker_id === uid && b.status === 'pending' && b.task_id == null);

      const hasOngoingBookings = bData.some(b => b.status === 'accepted');

      const hasUnratedHiringCompleted = bData.some(b => b.client_id === uid && b.status === 'completed' && !b.rating);
      const hasUnratedWorkingCompleted = bData.some(b => b.worker_id === uid && b.status === 'completed' && !b.client_rating);

      const { data: tasksData } = await supabase
        .from('posted_tasks')
        .select('id, status')
        .or(`client_id.eq.${uid},assigned_worker_id.eq.${uid}`)
        .eq('status', 'assigned');

      const ongoingTasksCount = (tasksData || []).length;

      const isActive = hasPendingHiringRequests || 
                       hasPendingWorkingRequests || 
                       hasOngoingBookings || 
                       hasUnratedHiringCompleted || 
                       hasUnratedWorkingCompleted || 
                       ongoingTasksCount > 0;

      setHasActivityBadge(isActive);
    } catch (err) {
      console.warn('Error fetching activity badge status:', err);
    }
  }, [session?.user?.id]);

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadNotificationsCount(count);
      }
    } catch (err) {
      console.warn('Error fetching unread notifications count, table may not exist yet:', err);
    }
  }, [session?.user?.id]);

  const recentLocalToastsRef = useRef<Array<{ title: string; message: string }>>([]);

  const addToast = useCallback((msg: string, type: 'info' | 'success' | 'alert' = 'info', skipDbPersist = false) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message: msg, type }]);

    if (!skipDbPersist && session?.user?.id) {
      let title = 'System Notice';
      if (type === 'success') title = 'Success Alert';
      if (type === 'alert') title = 'Action Warning';

      recentLocalToastsRef.current.push({ title, message: msg });

      // Clear after 5 seconds to prevent list accretion
      setTimeout(() => {
        recentLocalToastsRef.current = recentLocalToastsRef.current.filter(
          (t) => !(t.title === title && t.message === msg)
        );
      }, 5000);

      supabase
        .from('notifications')
        .insert({
          user_id: session.user.id,
          title,
          message: msg,
          type
        })
        .then(({ error }) => {
          if (error) {
            console.warn('Silent database write notification issue:', error);
          }
          fetchUnreadCount();
        })
        .catch((err) => {
          console.warn('Caught silent DB warning:', err);
        });
    }
  }, [session?.user?.id, fetchUnreadCount]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    window.alert = (message: string) => {
      if (!message) return;
      let type: 'info' | 'success' | 'alert' = 'info';
      const lowercase = String(message).toLowerCase();
      
      const isSuccess = lowercase.includes('success') || 
                        lowercase.includes('completed') || 
                        lowercase.includes('approved') || 
                        lowercase.includes('saved') || 
                        lowercase.includes('great') || 
                        lowercase.includes('done') || 
                        lowercase.includes('thank') ||
                        lowercase.includes('successfully') ||
                        lowercase.includes('copied');
                        
      const isAlert = lowercase.includes('fail') || 
                      lowercase.includes('error') || 
                      lowercase.includes('denied') || 
                      lowercase.includes('reject') || 
                      lowercase.includes('invalid') || 
                      lowercase.includes('prohibited') || 
                      lowercase.includes('forbidden') || 
                      lowercase.includes('required') || 
                      lowercase.includes('safety') || 
                      lowercase.includes('scam') ||
                      lowercase.includes('violate') ||
                      lowercase.includes('exceeds') ||
                      lowercase.includes('cannot');

      if (isSuccess) {
        type = 'success';
      } else if (isAlert) {
        type = 'alert';
      }
      
      addToast(message, type);
    };

    (window as any).showToast = (msg: string, type: 'info' | 'success' | 'alert' = 'info') => {
      addToast(msg, type);
    };
  }, [addToast]);

  const [showGuide, setShowGuide] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const viewRef = useRef(view);
  const hasLoadedProfileRef = useRef(false);

  useEffect(() => { 
    viewRef.current = view; 
  }, [view]);

  // Initial deep-link query parameter parser on application startup
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const jobIdParam = urlParams.get('jobId');
      const workerIdParam = urlParams.get('workerId');
      const refParam = urlParams.get('ref');
      let redirectHappened = false;

      if (refParam) {
        localStorage.setItem('velgo_referrer_id', refParam);
        redirectHappened = true;
      }
      if (jobIdParam) {
        localStorage.setItem('velgo_redirect_job_id', jobIdParam);
        redirectHappened = true;
      }
      if (workerIdParam) {
        localStorage.setItem('velgo_redirect_worker_id', workerIdParam);
        redirectHappened = true;
      }

      if (redirectHappened) {
        // Clean up search query for visual aesthetic
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({ view: 'landing', data: null }, '', newUrl);
      }
    } catch (e) {
      console.warn("Deep-link capture error:", e);
    }
  }, []);

  // Consume deep-link redirect once authenticated user profile is fully active
  useEffect(() => {
    if (profile && profile.role && profile.phone_number) {
      const pendingJobId = localStorage.getItem('velgo_redirect_job_id');
      if (pendingJobId) {
        localStorage.removeItem('velgo_redirect_job_id');
        setView('task-detail');
        setViewData(pendingJobId);
        window.history.replaceState({ view: 'task-detail', data: pendingJobId }, '', '');
        return;
      }

      const pendingWorkerId = localStorage.getItem('velgo_redirect_worker_id');
      if (pendingWorkerId) {
        localStorage.removeItem('velgo_redirect_worker_id');
        setView('worker-detail');
        setViewData(pendingWorkerId);
        window.history.replaceState({ view: 'worker-detail', data: pendingWorkerId }, '', '');
      }
    }
  }, [profile]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
        const pathname = window.location.pathname.toLowerCase();
        let initialView = 'landing';
        let initialData = null;
        if (pathname === '/privacy' || pathname === '/privacy-policy') {
          initialView = 'legal';
          initialData = 'privacy';
        } else if (pathname === '/terms' || pathname === '/terms-of-service') {
          initialView = 'legal';
          initialData = 'tos';
        } else {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('view') === 'legal') {
              initialView = 'legal';
              const tab = urlParams.get('tab');
              initialData = tab === 'privacy' ? 'privacy' : (tab === 'terms' ? 'tos' : 'tos');
            }
          } catch (e) {}
        }
        window.history.replaceState({ view: initialView, data: initialData }, '', '');
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
    let url = '';
    if (newView === 'legal') {
      url = data === 'privacy' ? '/privacy' : '/terms';
    } else if (newView === 'landing') {
      url = '/';
    }
    window.history.pushState({ view: newView, data }, '', url);
    setView(newView);
    setViewData(data);
    window.scrollTo(0, 0);
  };

  const handleBackNavigation = (fallbackView: string) => {
     if (window.history.state && view !== 'home' && view !== 'landing') {
         window.history.back();
     } else {
         setView(fallbackView);
         const url = fallbackView === 'landing' ? '/' : '';
         window.history.replaceState({ view: fallbackView, data: null }, '', url);
     }
  };

  const fetchProfile = useCallback(async (uid: string, retries = 2, silent = false) => {
    if (!silent) setIsInitializingProfile(true);
    
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    
    if (data) {
      setProfile(data);
      hasLoadedProfileRef.current = true;
      setIsInitializingProfile(false);
    } else if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      fetchProfile(uid, retries - 1, silent);
    } else {
      setProfile(null);
      setIsInitializingProfile(false);
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
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            fetchProfile(currentSession.user.id, 2, hasLoadedProfileRef.current);
            if (viewRef.current === 'login' || viewRef.current === 'signup' || viewRef.current === 'landing') {
                setView('home');
                window.history.replaceState({ view: 'home', data: null }, '', '');
            }
        }
      } else {
        setProfile(null);
        hasLoadedProfileRef.current = false;
        if (viewRef.current !== 'reset-password' && viewRef.current !== 'change-password') {
            setView('landing');
            window.history.replaceState({ view: 'landing', data: null }, '', '');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]); 

  // Handle linking incoming referrer and clear from localStorage upon success
  useEffect(() => {
    if (profile && profile.id) {
      const storedReferrer = localStorage.getItem('velgo_referrer_id');
      if (storedReferrer && storedReferrer !== profile.id && !profile.referrer_id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(storedReferrer)) {
          supabase
            .from('profiles')
            .update({ referrer_id: storedReferrer })
            .eq('id', profile.id)
            .then(({ error }) => {
              if (error) {
                console.warn("Failed to update referrer_id for profile:", error.message);
              } else {
                console.log("Successfully linked referrer:", storedReferrer);
                localStorage.removeItem('velgo_referrer_id');
                fetchProfile(profile.id, 1, true); // Silent reload
              }
            });
        } else {
          localStorage.removeItem('velgo_referrer_id');
        }
      }
    }
  }, [profile, fetchProfile]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`profile-updates-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`
        },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchUnreadCount();

    const nChannel = supabase
      .channel(`notifications-realtime-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          fetchUnreadCount();
          
          if (payload.eventType === 'INSERT') {
            const notif = payload.new;

            // Deduplicate if we ourselves stored it locally
            const isSelfInitiated = recentLocalToastsRef.current.some(
              (t) => t.title === notif.title && t.message === notif.message
            );
            
            if (isSelfInitiated) {
              const idx = recentLocalToastsRef.current.findIndex(
                (t) => t.title === notif.title && t.message === notif.message
              );
              if (idx > -1) {
                recentLocalToastsRef.current.splice(idx, 1);
              }
              return;
            }

            // Play a real-time toast notification!
            addToast(`${notif.title}: ${notif.message}`, notif.type || 'info', true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(nChannel);
    };
  }, [session?.user?.id, fetchUnreadCount, addToast]);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchActivityBadgeStatus();

    const bChannel = supabase
      .channel(`bookings-badge-realtime-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          fetchActivityBadgeStatus();
        }
      )
      .subscribe();

    const tChannel = supabase
      .channel(`tasks-badge-realtime-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posted_tasks'
        },
        () => {
          fetchActivityBadgeStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bChannel);
      supabase.removeChannel(tChannel);
    };
  }, [session?.user?.id, fetchActivityBadgeStatus]);

  // Skeleton Loader for Initialization
  if (loading || isInitializingProfile) return <PageSkeleton />;

  const renderContent = () => {
    // 1. Not Logged In
    if (!session) {
      switch (view) {
        case 'login': return <Login onToggle={() => navigate('signup')} />;
        case 'signup': return <SignUp onToggle={() => navigate('login')} />;
        // Wrapped in Suspense just in case, though usually static
        case 'reset-password': return <Suspense fallback={<PageSkeleton />}><ResetPassword onSuccess={() => navigate('login')} onBack={() => handleBackNavigation('login')} /></Suspense>;
        case 'legal': return <Suspense fallback={<PageSkeleton />}><Legal initialTab={viewData} onBack={() => handleBackNavigation('landing')} /></Suspense>;
        case 'about': return <Suspense fallback={<PageSkeleton />}><About profile={null} onBack={() => handleBackNavigation('landing')} /></Suspense>;
        default: return <Landing onGetStarted={() => navigate('signup')} onLogin={() => navigate('login')} onViewLegal={(tab) => navigate('legal', tab)} onViewAbout={() => navigate('about')} />;
      }
    }

    // Intercept Blocked / Suspended Accounts instantly
    if (profile && profile.is_blocked) {
      return (
        <SuspendedScreen 
          profile={profile} 
          onCheckStatus={() => fetchProfile(session.user.id, 1, false)} 
          onLogOut={async () => {
             await supabase.auth.signOut();
          }} 
        />
      );
    }

    // 2. Logged In but Profile Record Missing or Incomplete
    if (!profile || !profile.role || !profile.phone_number) {
      return <Suspense fallback={<PageSkeleton />}><CompleteProfile session={session} onComplete={() => fetchProfile(session.user.id)} /></Suspense>;
    }

    // 3. Authenticated & Profile Fully Synced
    // NOTE: Suspense wrapper added to main content to handle lazy loading
    switch (view) {
      case 'home': return <Home profile={profile} onViewWorker={(id) => navigate('worker-detail', id)} onViewTask={(id) => navigate('task-detail', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} onPostTask={() => navigate('post-task')} onShowGuide={() => setShowGuide(true)} onShowNotifications={() => setShowNotifications(true)} unreadCount={unreadNotificationsCount} />;
      case 'activity': return <Activity profile={profile} onOpenChat={(id) => navigate('overview')} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} onViewTask={(id) => navigate('task-detail', id)} onViewWorker={(id) => navigate('worker-detail', id)} onShowNotifications={() => setShowNotifications(true)} unreadCount={unreadNotificationsCount} />;
      case 'overview': return <Overview profile={profile} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} onViewLegal={(tab) => navigate('legal', tab)} onShowGuide={() => setShowGuide(true)} onShowNotifications={() => setShowNotifications(true)} unreadCount={unreadNotificationsCount} />;
      case 'profile': return <ProfilePage profile={profile} onRefreshProfile={() => fetchProfile(session.user.id)} onSubscription={() => navigate('subscription')} onSettings={() => navigate('settings')} onShowNotifications={() => setShowNotifications(true)} unreadCount={unreadNotificationsCount} />;
      case 'subscription': return <Subscription profile={profile} onRefreshProfile={() => fetchProfile(session.user.id)} onBack={() => handleBackNavigation('profile')} />;
      case 'worker-detail': return <WorkerDetail profile={profile} workerId={viewData} onBack={() => handleBackNavigation('home')} onBook={(id) => navigate('overview')} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} />;
      case 'task-detail': return <TaskDetail profile={profile} taskId={viewData} onBack={() => handleBackNavigation('home')} onUpgrade={() => navigate('subscription')} />;
      case 'settings': return <Settings profile={profile} onBack={() => handleBackNavigation('profile')} onNavigate={navigate} onRefreshProfile={() => fetchProfile(session.user.id, 2, true)} onShowGuide={() => setShowGuide(true)} onShowNotifications={() => setShowNotifications(true)} unreadCount={unreadNotificationsCount} />;
      case 'change-password': return <ResetPassword onSuccess={() => { addToast('Password updated!', 'success'); handleBackNavigation('settings'); }} onBack={() => handleBackNavigation('settings')} />;
      case 'post-task': return <PostTask profile={profile} onRefreshProfile={() => fetchProfile(session.user.id)} onBack={() => handleBackNavigation('home')} onUpgrade={() => navigate('subscription')} />;
      case 'legal': return <Legal initialTab={viewData} onBack={() => handleBackNavigation('settings')} />;
      case 'safety': return <Safety profile={profile} onBack={() => handleBackNavigation('settings')} />;
      case 'about': return <About profile={profile} onBack={() => handleBackNavigation('settings')} />;
      case 'admin': return <AdminDashboard onBack={() => handleBackNavigation('settings')} />;
      default: return <Home profile={profile} onViewWorker={(id) => navigate('worker-detail', id)} onViewTask={(id) => navigate('task-detail', id)} onRefreshProfile={() => fetchProfile(session.user.id)} onUpgrade={() => navigate('subscription')} onPostTask={() => navigate('post-task')} onShowGuide={() => setShowGuide(true)} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200 flex flex-col md:flex-row overflow-x-hidden">
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-[#FF3B30] text-white text-center py-2 px-4 text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg backdrop-blur-md bg-opacity-90">
            <i className="fa-solid fa-triangle-exclamation"></i>
            Offline Mode
          </div>
        )}
        {session && profile && !['admin', 'chat', 'reset-password', 'change-password'].includes(view) && (
            <aside className={`hidden md:flex flex-col w-72 border-r border-gray-100 dark:border-gray-800 h-screen sticky top-0 p-6 bg-white dark:bg-gray-900 z-40 ${!isOnline ? 'pt-14' : ''}`}>
                <div className="mb-10 pl-2"><VelgoLogo /></div>
                <nav className="space-y-3 flex-1">
                    <SidebarItem icon="fa-house-chimney" label="Marketplace" active={['home', 'worker-detail', 'task-detail', 'post-task'].includes(view)} onClick={() => navigate('home')} />
                    <SidebarItem icon="fa-bolt-lightning" label="My Activities" active={view === 'activity'} onClick={() => navigate('activity')} hasBadge={hasActivityBadge} />
                    <SidebarItem icon="fa-compass" label="My Hub" active={view === 'overview'} onClick={() => navigate('overview')} />
                    <SidebarItem icon="fa-user-ninja" label="Profile" active={['profile', 'subscription', 'settings', 'legal', 'safety', 'about', 'change-password'].includes(view)} onClick={() => navigate('profile')} />
                </nav>
            </aside>
        )}
        <main className={`flex-1 w-full relative ${session ? 'max-w-md mx-auto md:max-w-none md:mx-0' : 'w-full'} ${!isOnline ? 'pt-8' : ''}`}>
          <div className={`${session ? 'md:max-w-6xl md:mx-auto md:p-6 md:pb-12' : 'w-full'}`}>
            {/* Suspense Wrapper handles the loading state for lazy components */}
            <Suspense fallback={<PageSkeleton />}>
                {renderContent()}
            </Suspense>
          </div>
        </main>
        {toasts.length > 0 && <NotificationToast toasts={toasts} onRemove={removeToast} />}
        {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}
        <NotificationPanel 
          isOpen={showNotifications} 
          onClose={() => setShowNotifications(false)} 
          userId={session?.user?.id}
          onRefreshUnread={fetchUnreadCount}
        />
        <InstallPWA />
        
        {/* Global Floating Action Button */}
        {session && profile && !['admin', 'chat', 'post-task', 'reset-password', 'change-password'].includes(view) && (
            <button 
                onClick={() => navigate('post-task')}
                className="fixed bottom-28 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-brand text-white rounded-full shadow-2xl shadow-brand/40 flex items-center justify-center z-50 active:scale-90 transition-transform animate-fadeIn hover:scale-105"
                title="Post a Job"
            >
                <i className="fa-solid fa-plus text-xl"></i>
            </button>
        )}

        {session && profile && !['admin', 'chat', 'reset-password', 'change-password'].includes(view) && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 flex justify-around items-center h-20 safe-bottom z-50 shadow-lg transition-colors duration-200">
            <button onClick={() => navigate('home')} className={`flex flex-col items-center flex-1 ${['home', 'worker-detail', 'task-detail', 'post-task'].includes(view) ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-house-chimney text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">Market</span>
            </button>
            <button onClick={() => navigate('activity')} className={`flex flex-col items-center flex-1 relative ${view === 'activity' ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <span className="relative inline-block">
                <i className="fa-solid fa-bolt-lightning text-xl"></i>
                {hasActivityBadge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-950"></span>
                )}
              </span>
              <span className="text-[9px] font-black uppercase mt-1">Activities</span>
            </button>
             <button onClick={() => navigate('overview')} className={`flex flex-col items-center flex-1 ${view === 'overview' ? 'text-brand' : 'text-gray-300 dark:text-gray-600'}`}>
              <i className="fa-solid fa-compass text-xl"></i>
              <span className="text-[9px] font-black uppercase mt-1">My Hub</span>
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

const SidebarItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void; hasBadge?: boolean }> = ({ icon, label, active, onClick, hasBadge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-xl transition-all group ${active ? 'bg-brand text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
      <div className="flex items-center gap-4">
          <i className={`fa-solid ${icon} text-lg ${active ? 'text-white' : 'text-gray-400 group-hover:text-brand'}`}></i>
          <span className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
      </div>
      {hasBadge && (
          <span className={`w-2 h-2 rounded-full bg-red-500 animate-pulse ${active ? 'ring-2 ring-white/30' : ''}`}></span>
      )}
  </button>
);

export default App;
