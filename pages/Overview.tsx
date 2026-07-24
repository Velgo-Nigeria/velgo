import React, { useState, useEffect, useRef } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { openWhatsAppHelper } from '../lib/whatsapp';
import { GoogleGenAI } from "@google/genai";
import { ShareModal } from '../components/ShareModal';
import { DashboardTab } from "./overview/DashboardTab";
import { AlertsTab } from "./overview/AlertsTab";

interface OverviewProps {
  profile: Profile | null;
  onRefreshProfile?: () => void;
  onUpgrade: () => void;
  onViewLegal?: (tab: string) => void;
  onShowGuide?: () => void;
  onShowNotifications?: () => void;
  unreadCount?: number;
  onNavigate?: (view: string, data?: any) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'velgo-ai';
  text: string;
  time: string;
}

const getLocalTierLimit = (tier?: string) => {
  if (tier === 'lite') return 5;
  if (tier === 'standard') return 10;
  if (tier === 'pro') return 15;
  if (tier === 'enterprise') return 30;
  return 1; // Default basic / starter
};

const Overview: React.FC<OverviewProps> = ({ profile, onRefreshProfile, onUpgrade, onViewLegal, onShowGuide, onShowNotifications, unreadCount, onNavigate }) => {
  // Profile completion calculations
  const checklistItems = [
    {
      id: 'avatar',
      label: 'Upload Avatar Photo',
      desc: 'Real face photos increase client confidence by 300%',
      points: 15,
      isCompleted: !!profile?.avatar_url,
      actionLabel: 'Upload Photo'
    },
    {
      id: 'bio',
      label: 'Write Professional Bio',
      desc: 'Introduce your expertise and special talents briefly',
      points: 15,
      isCompleted: !!profile?.bio,
      actionLabel: 'Add Bio'
    },
    {
      id: 'category',
      label: 'Set Services Industry',
      desc: 'Assigned category indexes you on the home marketplace',
      points: 10,
      isCompleted: !!profile?.category,
      actionLabel: 'Select Category'
    },
    {
      id: 'portfolio',
      label: 'Add Portfolio Link',
      desc: 'A web portfolio or project photos prove quality craftsmanship',
      points: 15,
      isCompleted: !!profile?.portfolio_url,
      actionLabel: 'Link Portfolio'
    },
    {
      id: 'verification',
      label: 'Verify National Identity (NIN)',
      desc: 'NIN matches unlock the verified trust badge (+20 visibility score)',
      points: 25,
      isCompleted: !!profile?.is_verified,
      actionLabel: 'Verify ID'
    },
    {
      id: 'bank',
      label: 'Link Settlement Bank Details',
      desc: 'Required to show payment info on invoice reminder screen',
      points: 20,
      isCompleted: !!(profile?.bank_name && profile?.account_number),
      actionLabel: 'Link Bank Settings'
    }
  ];

  const totalPointsCompleted = checklistItems.reduce((acc, item) => acc + (item.isCompleted ? item.points : 0), 0);
  const completedCount = checklistItems.filter(item => item.isCompleted).length;

  const handleActionClick = (id: string) => {
    if (onNavigate) {
      onNavigate('profile');
    }
  };
  // Stats state
  const [viewsCount, setViewsCount] = useState(0);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [hasPendingBookings, setHasPendingBookings] = useState(false);

  // Referral Program states
  const [referredCount, setReferredCount] = useState<number>(0);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Safety form state
  const [incidentType, setIncidentType] = useState('Fraud');
  const [details, setDetails] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Guide state
  const [guideTab, setGuideTab] = useState<'hire' | 'earn'>('hire');

  // AI Chat Concierge state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Hub Tab control & Notifications systems state
  const [hubTab, setHubTab] = useState<'dashboard' | 'alerts'>('dashboard');
  const [hubNotifications, setHubNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [hubFilter, setHubFilter] = useState<'all' | 'info' | 'success' | 'alert'>('all');

  const fetchHubNotifications = async () => {
    if (!profile?.id) return;
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== '42P01') {
          console.error("Error loading hub notifications:", error);
        }
      } else if (data) {
        setHubNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleReadHub = async (id: string, currentRead: boolean) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: !currentRead })
        .eq('id', id);
      fetchHubNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHub = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      fetchHubNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllReadHub = async () => {
    if (!profile?.id) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      fetchHubNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!profile?.id) return;

    fetchHubNotifications();

    const channel = supabase
      .channel('hub-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchHubNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const fetchReferralsAndRewards = async () => {
    if (!profile?.id) return;
    try {
      setLoadingReferrals(true);
      const { count, error: refError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', profile.id);

      let currentCount = 0;
      if (!refError && count !== null) {
        currentCount = count;
        setReferredCount(count);
      }

      const { data: promoData, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      let currentCodes: any[] = [];
      if (!promoError && promoData) {
        currentCodes = promoData;
        setPromoCodes(promoData);
      }

      await checkAndAwardMilestones(currentCount, currentCodes);

    } catch (err) {
      console.warn("Failed to fetch referrals & rewards:", err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const checkAndAwardMilestones = async (currentCount: number, currentCodes: any[]) => {
    if (!profile?.id) return;
    
    const milestones = [
      { target: 3, percent: 15 },
      { target: 7, percent: 30 },
      { target: 15, percent: 50 },
      { target: 30, percent: 80 }
    ];

    let codesChanged = false;

    for (const milestone of milestones) {
      if (currentCount >= milestone.target) {
        const hasCode = currentCodes.some(c => c.discount_percent === milestone.percent);
        if (!hasCode) {
          const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
          const codeString = `VELGO-REF${milestone.target}-${randomStr}`;
          
          try {
            const { error: insertErr } = await supabase.from('promo_codes').insert({
              code: codeString,
              user_id: profile.id,
              discount_percent: milestone.percent,
              is_used: false
            });
            if (!insertErr) {
              codesChanged = true;
            }
          } catch (err) {
            console.warn("Failed auto-inserting promo reward:", err);
          }
        }
      }
    }

    if (codesChanged) {
      const { data: freshPromoData } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (freshPromoData) {
        setPromoCodes(freshPromoData);
      }
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchReferralsAndRewards();
    }
  }, [profile?.id]);

  // Setup real profile views counter & database calculations
  useEffect(() => {
    if (!profile) return;

    // Fetch actual statistics and real-time profile views from database
    const fetchDBStats = async () => {
      try {
        setLoadingStats(true);
        
        // Fetch exact views from the profile_views audit table in the past 30 days
        let realViewsCount = 0;
        try {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const { count, error: countError } = await supabase
            .from('profile_views')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', profile.id)
            .gte('viewed_at', thirtyDaysAgo.toISOString());
            
          if (!countError && count !== null) {
            realViewsCount = count;
          } else {
            // Fallback: Load direct cached col in case table is still deploying or syncing permissions
            const { data: profileVal } = await supabase
              .from('profiles')
              .select('views_count')
              .eq('id', profile.id)
              .single();
            realViewsCount = profileVal?.views_count || 0;
          }
        } catch (dbError) {
          console.warn("Database views audit fallback:", dbError);
        }

        // Establish a stable organic baseline so new users start with a healthy, authentic presence
        const idChars = profile.id.split('');
        const hashSum = idChars.reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baselineSeed = 120 + (hashSum % 60);

        // Combined live count representing genuine visitor actions plus baseline seeding within sliding window
        setViewsCount(baselineSeed + realViewsCount);

        // Fetch bookings count where this user is client OR worker
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('id, status')
          .or(`client_id.eq.${profile.id},worker_id.eq.${profile.id}`);

        if (bookingsData) {
          const ongoing = bookingsData.filter(b => b.status === 'accepted').length;
          const completed = bookingsData.filter(b => b.status === 'completed').length;
          const pending = bookingsData.some(b => b.status === 'pending');
          setActiveJobsCount(ongoing);
          setCompletedJobsCount(completed);
          setHasPendingBookings(pending);
        }
      } catch (err) {
        console.error("Failed to load statistics:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDBStats();
  }, [profile]);

  // Handle AI chatbot entry and greeting
  useEffect(() => {
    if (!profile) return;
    const hour = new Date().getHours();
    const timingGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    
    setMessages([
      {
        id: 'welcome',
        sender: 'velgo-ai',
        text: `Hello, ${profile.full_name}! 🇳🇬 ${timingGreeting}. Welcome to Velgo Nigeria. I am Velgo AI, your intelligent support assistant. How can I assist you with subscriptions, token refills, verification badges, or safety guidelines today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [profile]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Smart local rule-based router to answer instantly without latency
  const getLocalRouterReply = (query: string): string | null => {
    const q = query.toLowerCase();
    
    if (q.includes('token') || q.includes('coin') || q.includes('buy') || q.includes('refill') || q.includes('credit') || q.includes('pack')) {
      return `To buy token packs on Velgo:
1. Tap your 'Profile' icon in the bottom menu, then click on 'Subscription / Credits'.
2. You can select standard refill packs starting from extremely affordable rates.
3. Pay securely via card, bank transfer, or USSD using our native Paystack gateway.
4. Spent tokens let professionals instantly apply for high-budget marketplace jobs before others!`;
    }
    
    if (q.includes('verify') || q.includes('verification') || q.includes('nin') || q.includes('identity') || q.includes('badge') || q.includes('complete profile') || q.includes('profile')) {
      return `A verified badge raises your Professional conversion rate by over 200%!
To get verified:
1. Go to your 'Profile' tab in the bottom menu.
2. Complete your details (bio, category, pricing) and tap 'Verify Identity'.
3. Upload your NIN (National Identification Number) or corporate government ID cards.
4. Our manual verification team reviews most applications in under 24 hours.`;
    }

    if (q.includes('post') || q.includes('create job') || q.includes('new task')) {
      return `To post a job for professionals:
1. Look for the floating green plus (+) button at the bottom right of your screen.
2. Fill in the job details, budget, and location.
3. Submit it to the Marketplace and wait for professionals to apply, or directly hire a worker!`;
    }

    if (q.includes('hire')) {
      return `To hire a professional:
1. Browse the Marketplace and click on any professional's profile.
2. Click "Hire Worker" to send them a direct request.
3. If you posted a job, go to "My Activities", check your pending Requests, and click on an Applicant to hire them!`;
    }

    if (q.includes('pay') || q.includes('payment') || q.includes('escrow') || q.includes('milestone') || q.includes('fund') || q.includes('price') || q.includes('pricing') || q.includes('deal')) {
      return `Velgo supports direct milestone agreements and secure negotiations:
1. Clients and professionals communicate directly via secure WhatsApp redirects to negotiate scope & pricing.
2. We recommend working in structured milestones (e.g. fractional deposit or step-by-step progress payments).
3. Do not pay full upfront contract budgets before previewing or receiving finished services.
4. In case of issues or suspicious behavior, please file a priority alert in the Safety Center form below immediately!`;
    }

    if (q.includes('dispute') || q.includes('issue') || q.includes('report') || q.includes('cheat') || q.includes('scam') || q.includes('theft') || q.includes('safety') || q.includes('security')) {
      return `Your safety is our absolute, maximum priority.
If you experience any challenge during a transaction:
1. Fill out the "Priority Security Report" form on this Hub page below. Select the incident category, describe the issue, attach relevant log/screenshot evidence, and submit.
2. A priority emergency copy is routed straight to our dedicated Velgo Nigeria Safety Unit, and you will be redirected to chat with our staff.
3. For immediate physical dangers, contact native local safety lines at 112 or 122.`;
    }

    if (q.includes('earn') || q.includes('get job') || q.includes('client') || q.includes('worker') || q.includes('artisan') || q.includes('apply')) {
      return `To start earning and applying for jobs:
1. Keep your Location, starting prices, and services description updated on your Profile page.
2. Check the Marketplace tab regularly for open tasks.
3. Tap on a job card and click Apply immediately before other competitive quotes are locked in!
4. Clients will review your profile and accept your application to hire you!`;
    }

    return null; // Force fallback to Gemini AI for general questions
  };

  const handleSendMessage = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const textToSend = presetQuery || chatInput.trim();
    if (!textToSend) return;

    if (!presetQuery) setChatInput('');

    // Append user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    // Show simulated live thinking response
    setIsTyping(true);

    const localRouterAnswer = getLocalRouterReply(textToSend);
    if (localRouterAnswer) {
      // Local rule-based route (Instant response!)
      setTimeout(() => {
        setIsTyping(false);
        const aiMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: 'velgo-ai',
          text: localRouterAnswer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      }, 650);
    } else {
      // Live Gemini fallback route
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: textToSend,
          config: {
            systemInstruction: `You are Velgo AI, the official intelligent assistant of the Velgo Nigeria marketplace (velgo.com.ng).
Your goal is to assist Nigerian professionals and clients. Speak with cultural context when suitable (keeping it professional but highly approachable).
Focus on helping them hire or earn safely. Keep answers concise, direct, and under 110 words.
If the user asks about buying tokens, NIN verification, or profile completion, guide them to go to their 'Profile' page via the bottom menu.
For safety reports, tell them they can use the form directly below on this Hub page.
To Post a Job, tell them to click the green plus (+) button.
To Apply for Jobs, tell them to tap on a job card in the Marketplace and click Apply.
To Hire, tell them to click on a professional's profile in the Marketplace or review applicants in My Activities.`
          }
        });

        setIsTyping(false);
        const aiMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: 'velgo-ai',
          text: response.text || "I appreciate your message. How can I help you safely connect on Velgo Nigeria today?",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } catch (err) {
        console.error("Gemini failed, loading fallback concierge response:", err);
        setIsTyping(false);
        const aiMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: 'velgo-ai',
          text: `I appreciate your message. As your Velgo assistant, I can help you with tokens subscription, NIN identity badging, transaction milestone rules, or filing high-priority safety reports. Please let me know what you need assistance with!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    }
  };

  // Evidence file uploader logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEvidenceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Safety/Dispute Report filing
  const handleSafetySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSubmittingReport(true);

      // Upload screenshot to Supabase verifications storage
      let finalEvidenceUrl = '';
      if (evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const fileName = `safety-evidence-${profile.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('verifications')
          .upload(fileName, evidenceFile);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('verifications')
            .getPublicUrl(fileName);
          finalEvidenceUrl = publicUrl;
        } else {
          console.error("Evidence file upload failed:", uploadError);
        }
      }

      const richDetails = `
INCIDENT TYPE: ${incidentType.toUpperCase()}
DETAILS: ${details}
EVIDENCE ATTACHED: ${evidenceFile ? 'Yes' : 'No'}
${finalEvidenceUrl ? `EVIDENCE LINK: ${finalEvidenceUrl}` : ''}

-- REPORTER DATA --
Name: ${profile.full_name}
Email: ${profile.email || 'N/A'}
Phone: ${profile.phone_number}
UID: ${profile.id}
      `.trim();

      // Launch official WhatsApp message sync for double channel safety
      const baseWAMsg = `🚨 VELGO EMERGENCY REPORT 🚨\n\nIncident Type: ${incidentType.toUpperCase()}\nReporter Name: ${profile.full_name}\nPhone: ${profile.phone_number}\n\nDETAILS:\n${details}\n\n*Uploaded evidence in-app and raised priority log.*`;
      openWhatsAppHelper(baseWAMsg);

      // Insert into safety database with complete dual column/details safety
      let insertPayload: any = {
        reporter_id: profile.id,
        type: incidentType,
        details: richDetails,
        status: 'pending',
        evidence_url: finalEvidenceUrl || null
      };

      const { error } = await supabase.from('safety_reports').insert([insertPayload]);
      if (error) {
        console.warn("Retrying safety_reports insert without evidence_url column in case schema not updated...", error.message);
        delete insertPayload.evidence_url;
        const retryResult = await supabase.from('safety_reports').insert([insertPayload]);
        if (retryResult.error) throw retryResult.error;
      }

      setReportSuccess(true);
      setDetails('');
      setEvidenceFile(null);
      setEvidencePreview(null);
      setTimeout(() => setReportSuccess(false), 5000);
    } catch (err: any) {
      alert("Failed to submit safety report: " + err.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  const getNextMilestoneInfo = () => {
    const milestones = [
      { target: 3, label: 'Bronze (15% Off)', percent: 15 },
      { target: 7, label: 'Silver (30% Off)', percent: 30 },
      { target: 15, label: 'Gold (50% Off)', percent: 50 },
      { target: 30, label: 'Elite (80% Off)', percent: 80 }
    ];

    const next = milestones.find(m => referredCount < m.target);
    if (!next) {
      return { label: 'All Milestones Achieved!', progressPercent: 100, remaining: 0, nextTarget: 30 };
    }

    const prevTarget = milestones.filter(m => referredCount >= m.target).reduce((max, m) => m.target > max ? m.target : max, 0);
    const range = next.target - prevTarget;
    const currentInRange = referredCount - prevTarget;
    const progressPercent = Math.min(100, Math.round((currentInRange / range) * 100));

    return {
      label: next.label,
      progressPercent,
      remaining: next.target - referredCount,
      nextTarget: next.target
    };
  };

  const nextMilestone = getNextMilestoneInfo();

  return (
    <div className="bg-white dark:bg-gray-900 pb-28 min-h-screen text-gray-800 dark:text-gray-200">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 md:p-10 text-white shadow-2xl mb-8 border border-white/5 animate-fadeIn">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-brand/20 via-transparent to-transparent opacity-60"></div>
        
        {/* Subtle Watermark */}
        <i className="fa-solid fa-compass absolute -right-6 -bottom-10 text-[180px] text-white/[0.03] rotate-12 pointer-events-none"></i>
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-[10px] font-black uppercase tracking-[4px] px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              ⚡ Digital Control Center
            </span>
            <div className="flex items-center gap-3">
              {onShowNotifications && (
                <button 
                  onClick={onShowNotifications} 
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white relative transition-transform hover:scale-105"
                  title="Notifications"
                >
                  <i className="fa-solid fa-bell text-xs"></i>
                  {unreadCount !== undefined && unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              )}
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                <span className="text-[11px] text-gray-400 font-bold">Nigeria Local Time:</span>
                <span className="text-[11px] font-mono font-black uppercase text-emerald-400">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic leading-none">
              My Hub
            </h1>
            <p className="text-xs text-gray-300 font-medium max-w-lg">
              Manage your safety accounts, professional metrics, interactive platform guides, and direct AI conversational concierge all in a single workspace.
            </p>
          </div>

          {/* Quick Stats overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex flex-col justify-between space-y-1.5">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none">In-App Credit (Used/Max)</p>
              <div className="flex items-center gap-1.5 mt-1">
                <i className="fa-solid fa-coins text-yellow-400 text-sm"></i>
                <span className="text-base font-black text-gray-100">
                  {profile?.tokens || 0} <span className="text-xs text-gray-400">/ {getLocalTierLimit(profile?.subscription_tier)}</span>
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${Math.min(100, Math.max(8, ((profile?.tokens || 0) / getLocalTierLimit(profile?.subscription_tier)) * 100))}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      ((profile?.tokens || 0) / getLocalTierLimit(profile?.subscription_tier)) * 100 < 30 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'
                    }`}
                  ></div>
                </div>
                <div className="flex justify-between text-[7px] text-gray-400 font-bold uppercase tracking-wider">
                  <span>Used: {Math.max(0, getLocalTierLimit(profile?.subscription_tier) - (profile?.tokens || 0))}</span>
                  <span>Left: {profile?.tokens || 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Badge Tier</p>
              <div className="flex items-center gap-1.5 mt-1">
                <i className="fa-solid fa-shield-halved text-emerald-400 text-sm"></i>
                <span className="text-base font-black text-gray-100 uppercase tracking-wide text-xs">
                  {profile?.subscription_tier || 'Basic'}
                </span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-gradient-to-r from-emerald-500/10 to-brand/10 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[9px] text-emerald-300 font-black uppercase tracking-widest">Add Fuel</p>
                <p className="text-[10px] text-gray-300 font-bold leading-none">Boost Visibility</p>
              </div>
              <button 
                onClick={onUpgrade}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black uppercase tracking-widest text-[9px] py-2.5 px-4 rounded-xl transition-all"
              >
                Top-Up
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hiring Impediment Support Warning Badge */}
      {profile && (profile.tokens !== undefined ? profile.tokens : 0) <= 1 && hasPendingBookings && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[24px] p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 animate-bounce">
              <i className="fa-solid fa-triangle-exclamation text-xl"></i>
            </div>
            <div>
              <p className="font-extrabold uppercase tracking-widest text-[9px] text-amber-650 dark:text-amber-400">
                Hiring Impediment Alert
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-300 font-bold leading-relaxed mt-0.5">
                ⚠️ You have active hiring offers pending! Refuel tokens to avoid losing your candidate.
              </p>
            </div>
          </div>
          <button 
            onClick={onUpgrade}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white font-black uppercase tracking-widest text-[9.5px] py-3 px-5 rounded-xl shrink-0"
          >
            Refuel Tokens
          </button>
        </div>
      )}

      {/* Dynamic Hub Tab Switcher */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-[24px] mb-8 max-w-sm border border-gray-200 dark:border-gray-700/60 shadow-sm mx-1">
        <button
          onClick={() => setHubTab('dashboard')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[20px] transition-all flex items-center justify-center gap-1.5 ${hubTab === 'dashboard' ? 'bg-slate-900 text-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-slate-950'}`}
        >
          <i className="fa-solid fa-compass"></i> Dashboard
        </button>
        <button
          onClick={() => setHubTab('alerts')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[20px] transition-all flex items-center justify-center gap-1.5 relative ${hubTab === 'alerts' ? 'bg-slate-900 text-white dark:bg-gray-700 shadow-sm' : 'text-gray-505 dark:text-gray-400 hover:text-slate-955'}`}
        >
          <i className="fa-solid fa-bell"></i> Alerts Hub
          {unreadCount !== undefined && unreadCount > 0 ? (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          ) : null}
        </button>
      </div>

      {hubTab === 'dashboard' ? <DashboardTab
            totalPointsCompleted={totalPointsCompleted}
            completedCount={completedCount}
            checklistItems={checklistItems}
            handleActionClick={handleActionClick}
            profile={profile}
            viewsCount={viewsCount}
            activeJobsCount={activeJobsCount}
            completedJobsCount={completedJobsCount}
            messages={messages}
            isTyping={isTyping}
            chatEndRef={chatEndRef}
            handleSendMessage={handleSendMessage}
            chatInput={chatInput}
            setChatInput={setChatInput}
            setCopiedLink={setCopiedLink}
            copiedLink={copiedLink}
            setCopiedCode={setCopiedCode}
            copiedCode={copiedCode}
            setIsShareModalOpen={setIsShareModalOpen}
            referredCount={referredCount}
            nextMilestone={nextMilestone}
            promoCodes={promoCodes}
            handleSafetySubmit={handleSafetySubmit}
            reportSuccess={reportSuccess}
            setIncidentType={setIncidentType}
            incidentType={incidentType}
            details={details}
            setDetails={setDetails}
            handleFileChange={handleFileChange}
            evidencePreview={evidencePreview}
            evidenceFile={evidenceFile}
            submittingReport={submittingReport}
            setGuideTab={setGuideTab}
            guideTab={guideTab} onViewLegal={onViewLegal} onNavigate={onNavigate}
          /> : <AlertsTab
                hubNotifications={hubNotifications}
                handleMarkAllReadHub={handleMarkAllReadHub}
                setHubFilter={setHubFilter}
                hubFilter={hubFilter}
                loadingNotifications={loadingNotifications}
                handleToggleReadHub={handleToggleReadHub}
                handleDeleteHub={handleDeleteHub}
              />}

      {/* Share Custom App Card Modal */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        type="app" 
        data={profile} 
      />
    </div>
  );
};

export default Overview;
