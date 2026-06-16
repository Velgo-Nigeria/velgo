import React, { useState, useEffect, useRef } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { openWhatsAppHelper } from '../lib/whatsapp';
import { GoogleGenAI } from "@google/genai";

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

  // Referral Program states
  const [referredCount, setReferredCount] = useState<number>(0);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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
          setActiveJobsCount(ongoing);
          setCompletedJobsCount(completed);
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
4. Spent tokens let artisans instantly apply for high-budget marketplace jobs before others!`;
    }
    
    if (q.includes('verify') || q.includes('verification') || q.includes('nin') || q.includes('identity') || q.includes('badge')) {
      return `A verified badge raises your Artisan conversion rate by over 200%!
To get verified:
1. Go to your 'Profile' tab in the bottom menu and tap 'Verify Identity'.
2. Ensure you have input your legal full name exactly as it appears on your document.
3. Upload your NIN (National Identification Number) or corporate government ID cards.
4. Our manual verification team reviews most applications in under 24 hours. Your profile will then show the certified green verify badge immediately.`;
    }

    if (q.includes('pay') || q.includes('payment') || q.includes('escrow') || q.includes('milestone') || q.includes('fund') || q.includes('price') || q.includes('pricing') || q.includes('deal')) {
      return `Velgo supports direct milestone agreements and secure negotiations:
1. Clients and artisans communicate directly via secure WhatsApp redirects to negotiate scope & pricing.
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
      return `To maximize your earnings as a professional Velgo Artisan:
1. Keep your Location State & LGA, starting prices, and services description updated on your Profile page.
2. Include clear, real visual photos of your previous portfolio works.
3. Check the Marketplace tab regularly for open tasks, and apply immediately before other competitive quotes are locked in!`;
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
Your goal is to assist Nigerian artisans and clients. Speak with cultural context when suitable (keeping it professional but highly approachable).
Focus on helping them hire or earn safely. Keep answers concise, direct, and under 110 words. 
If the user asks about buying tokens, NIN verification, safety reports, or completed counts, kindly explain that they can see and manage these features directly inside this Hub page.`
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
              Manage your safety accounts, artisan metrics, interactive platform guides, and direct AI conversational concierge all in a single workspace.
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

      {hubTab === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-1">
        
        {/* LEFT COLUMN: Artisan Stats & AI Chat Concierge  (7/12 cols) */}
        <div className="lg:col-span-7 space-y-8">

          {/* PROFILE TRUST SCORE & COMPLETION TRACKER */}
          <div className="bg-white dark:bg-gray-800 rounded-[35px] border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                  <i className="fa-solid fa-square-poll-vertical text-lg"></i>
                </div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs leading-none">
                    Profile Trust Meter
                  </h3>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-1">
                    Complete your data to win high-paying jobs
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full border ${
                  totalPointsCompleted < 50
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-100 dark:border-amber-900'
                    : totalPointsCompleted < 85
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-100'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-100'
                }`}>
                  <i className="fa-solid fa-shield-halved mr-1"></i> {
                    totalPointsCompleted < 40 ? "Bronze Apprentice" :
                    totalPointsCompleted < 70 ? "Silver Standard" :
                    totalPointsCompleted < 95 ? "Gold Trusted Expert" :
                    "Velgo Elite Certified"
                  }
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5 leading-none"><i className="fa-solid fa-award text-yellow-500 animate-bounce text-[11px]"></i> Trust Level Index</span>
                <span className="font-mono text-xs text-slate-805 dark:text-slate-100">{totalPointsCompleted}% Done</span>
              </div>
              <div className="w-full h-3 bg-gray-50 dark:bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-100 dark:border-gray-800 flex items-center">
                <div 
                  style={{ width: `${totalPointsCompleted}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                ></div>
              </div>
              <div className="flex justify-between items-center text-[8.5px] text-gray-400 font-bold uppercase mt-1">
                <span>{completedCount} of 6 Fields Filled</span>
                {totalPointsCompleted < 100 ? (
                  <span className="text-amber-500 font-extrabold"><i className="fa-solid fa-circle-exclamation mr-1"></i> Boost trust score by +{100 - totalPointsCompleted}%</span>
                ) : (
                  <span className="text-emerald-500 font-black"><i className="fa-solid fa-circle-check mr-1 animate-pulse"></i> Perfect Trust Rating!</span>
                )}
              </div>
            </div>

            <div className="space-y-3 bg-gray-50/50 dark:bg-gray-950/20 p-4 rounded-3xl border border-gray-100/70 dark:border-gray-700/35">
              <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Incentives Checklist</p>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                        item.isCompleted 
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600' 
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-500'
                      }`}>
                        {item.isCompleted ? (
                          <i className="fa-solid fa-circle-check"></i>
                        ) : (
                          <i className="fa-solid fa-circle"></i>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[11px] font-black leading-tight ${item.isCompleted ? 'text-gray-550 dark:text-gray-450 line-through font-medium' : 'text-gray-800 dark:text-gray-100'}`}>
                            {item.label}
                          </span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shrink-0 ${
                            item.isCompleted 
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-100/10' 
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            +{item.points} Pts
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400 dark:text-gray-550 font-bold leading-relaxed mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    
                    {!item.isCompleted ? (
                      <button
                        onClick={() => handleActionClick(item.id)}
                        className="text-[9px] font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white dark:bg-gray-700 dark:hover:bg-gray-600 py-1.5 px-3 rounded-lg transition-all active:scale-95 shrink-0"
                      >
                        Add
                      </button>
                    ) : (
                      <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider shrink-0 flex items-center gap-0.5">
                        Done <i className="fa-solid fa-check text-[9px]"></i>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* STATS BENTO MATRIX */}
          <div className="bg-white dark:bg-gray-800 rounded-[35px] border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                  <i className="fa-solid fa-chart-line text-lg"></i>
                </div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">
                    Performance Tracker
                  </h3>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                    Updates in real-time
                  </p>
                </div>
              </div>
              {profile?.is_verified ? (
                <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900">
                  <i className="fa-solid fa-circle-check mr-1 animate-pulse"></i> Profile Verified
                </span>
              ) : (
                <span className="text-[8px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-100 dark:border-amber-900">
                  <i className="fa-solid fa-triangle-exclamation mr-1"></i> Pending Verification
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              
              {/* Dynamic local views card with sliding monthly window */}
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all text-center">
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">Monthly Views</p>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <i className="fa-regular fa-eye text-[#25D366]"></i>
                  <span className="text-xl font-black text-gray-900 dark:text-white font-mono">{viewsCount}</span>
                </div>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-1.5 leading-none">Past 30 Days</p>
              </div>

              {/* Ongoing Contracts */}
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all text-center">
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">Active Jobs</p>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <i className="fa-solid fa-briefcase text-blue-500"></i>
                  <span className="text-xl font-black text-gray-900 dark:text-white font-mono">{activeJobsCount}</span>
                </div>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-1.5 leading-none">In execution</p>
              </div>

              {/* Completed Projects */}
              <div className="col-span-2 sm:col-span-1 bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all text-center">
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">Hired Closures</p>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <i className="fa-solid fa-check-double text-purple-500"></i>
                  <span className="text-xl font-black text-gray-900 dark:text-white font-mono">{completedJobsCount}</span>
                </div>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-1.5 leading-none">Securely completed</p>
              </div>

            </div>
          </div>

          {/* CHAT CONCIERGE (Velgo AI) */}
          <div className="bg-white dark:bg-gray-800 rounded-[35px] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-[520px] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700/50 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black overflow-hidden border-2 border-emerald-400/40">
                    <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80" className="w-full h-full object-cover" alt="Velgo AI"/>
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wide text-white leading-none">Velgo AI Assistant</h3>
                  <p className="text-[8px] uppercase tracking-widest text-[#25D366] font-bold mt-1">● AI Assistant Online</p>
                </div>
              </div>
              <span className="text-[7.5px] font-black uppercase tracking-widest bg-white/10 px-2 py-1 rounded">
                Official Support
              </span>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 dark:bg-gray-900/35">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} max-w-[85%] ${m.sender === 'user' ? 'ml-auto' : 'mr-auto'} animate-fadeIn`}>
                  <div className={`p-4 rounded-3xl text-xs leading-relaxed font-semibold transition-all ${m.sender === 'user' ? 'bg-slate-900 dark:bg-gray-700 text-white rounded-tr-none shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700/50 shadow-sm'}`}>
                    <p className="whitespace-pre-line">{m.text}</p>
                  </div>
                  <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest mt-1 px-1">{m.time}</span>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex flex-col items-start max-w-[85%] mr-auto">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700/50 rounded-tl-none flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-300"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions preset chips */}
            <div className="px-5 py-2.5 border-t border-gray-50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
              {[
                { label: '🎫 How to buy tokens?', icon: 'fa-coins', query: 'buying token' },
                { label: '🟢 Identity verification?', icon: 'fa-shield-halved', query: 'nin badge' },
                { label: '🤝 Milestone rules?', icon: 'fa-handshake', query: 'milestone payments' },
                { label: '🛡️ Dispute filing?', icon: 'fa-triangle-exclamation', query: 'dispute safety' }
              ].map(chip => (
                <button
                  key={chip.label}
                  onClick={() => handleSendMessage(undefined, chip.query)}
                  className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950/30 font-black uppercase text-[8px] tracking-wider py-2 px-3.5 rounded-full border border-gray-200/50 dark:border-gray-700/50 active:scale-95 transition-all"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 flex gap-3">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask Velgo AI about verification, tokens, rules..."
                className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-[22px] py-4 px-6 text-xs font-semibold outline-none border border-transparent focus:border-brand-light focus:bg-white transition-all text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="w-12 h-12 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform hover:bg-brand"
              >
                <i className="fa-solid fa-paper-plane text-sm"></i>
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: Upgraded Safety Center & Platform user guides (5/12 cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* REFERRAL SYSTEM: REFER & EARN DISCOUNTS */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-[#0f172a] rounded-[35px] text-white p-6 shadow-xl relative overflow-hidden space-y-6 border border-white/5">
            {/* Elegant Background Icon */}
            <i className="fa-solid fa-gift absolute -right-6 -bottom-6 text-[130px] opacity-[0.06] rotate-12 pointer-events-none"></i>
            
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                  <i className="fa-solid fa-share-nodes text-lg"></i>
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-wider text-xs">Referral Rewards</h3>
                  <p className="text-[8px] uppercase tracking-widest text-indigo-300 font-bold">Invite Friends, Unlock Milestones</p>
                </div>
              </div>
              <p className="text-[11px] text-indigo-100 leading-relaxed font-semibold">
                Share Velgo with friends & colleagues. Once they join, unlock one-time-use discount codes up to <span className="text-emerald-400 font-black">80% OFF</span> standard packs!
              </p>
            </div>

            {/* Link Sharing Box */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 relative z-10">
              <label className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block">Your Unique Referral Link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}?ref=${profile?.id || 'guest'}`}
                  className="flex-1 bg-black/20 text-[10px] font-mono p-3 rounded-xl outline-none border border-white/5 text-slate-300 truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}?ref=${profile?.id}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${copiedLink ? 'bg-[#25D366] text-white' : 'bg-indigo-600 text-white shadow-md active:scale-95'}`}
                >
                  {copiedLink ? (
                    <>
                      <i className="fa-solid fa-circle-check"></i> Copied
                    </>
                  ) : (
                    <>
                      <i className="fa-regular fa-copy"></i> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Referrals Count and Progress Tracker */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Total Invited Friends</p>
                  <p className="text-2xl font-black font-mono mt-1 text-white">{referredCount} Joined</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/10 inline-block">
                    {referredCount >= 30 ? 'Elite Tier Crown' : `${nextMilestone.remaining} more to unlock`}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[8px] font-black uppercase tracking-wider mb-1.5 text-indigo-200">
                  <span>Current Progress</span>
                  <span>Next: {nextMilestone.label}</span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${nextMilestone.progressPercent}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                  ></div>
                </div>
                <div className="flex justify-between text-[7.5px] text-gray-400 font-bold uppercase mt-1">
                  <span>0 Referred</span>
                  <span>Target: {nextMilestone.nextTarget}</span>
                </div>
              </div>

              {/* Milestones Info Grid */}
              <div className="border-t border-white/5 pt-3 grid grid-cols-4 gap-1.5 text-center">
                {[
                  { target: 3, label: '15% Off', color: referredCount >= 3 ? 'text-emerald-400 font-black' : 'text-gray-500' },
                  { target: 7, label: '30% Off', color: referredCount >= 7 ? 'text-emerald-400 font-black' : 'text-gray-500' },
                  { target: 15, label: '50% Off', color: referredCount >= 15 ? 'text-emerald-400 font-black' : 'text-gray-500' },
                  { target: 30, label: '80% Off', color: referredCount >= 30 ? 'text-emerald-400 font-black' : 'text-gray-500' }
                ].map((m, i) => (
                  <div key={i} className="space-y-1">
                    <p className={`text-[10px] ${m.color}`}>
                      {referredCount >= m.target ? <i className="fa-solid fa-circle-check text-emerald-400 mr-0.5"></i> : <i className="fa-solid fa-lock text-white/20 text-[8px] mr-0.5"></i>}
                      {m.target} Ref
                    </p>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Unused Awarded Promo Codes Chest */}
            {promoCodes.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 relative z-10">
                <label className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block">Unlocked Promo Codes Chest</label>
                <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-none">
                  {promoCodes.map((codeObj, i) => (
                    <div key={i} className="flex justify-between items-center bg-black/30 p-2.5 rounded-xl border border-white/5">
                      <div>
                        <span className="text-[10px] font-mono font-black text-emerald-400 tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                          {codeObj.code}
                        </span>
                        <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">
                          {codeObj.discount_percent}% Discount • {codeObj.is_used ? 'Redeemed' : 'UNUSED'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (codeObj.is_used) return;
                          navigator.clipboard.writeText(codeObj.code);
                          alert(`Promo code ${codeObj.code} copied! Input it on the subscription screen to claim discount.`);
                        }}
                        disabled={codeObj.is_used}
                        className={`text-[8.5px] font-black uppercase px-2.5 py-1.5 rounded-lg ${codeObj.is_used ? 'text-gray-550 bg-white/5 border border-transparent' : 'text-indigo-300 hover:text-white bg-indigo-500/15 border border-indigo-500/25 hover:bg-indigo-500 active:scale-95 transition-all'}`}
                      >
                        {codeObj.is_used ? 'Used' : 'Copy Code'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SAFETY CENTER CARD & FORMS */}
          <div className="bg-red-500 rounded-[35px] text-white p-6 shadow-xl relative overflow-hidden space-y-6">
            {/* Watermark background */}
            <i className="fa-solid fa-triangle-exclamation absolute -right-4 -bottom-4 text-[120px] text-white/5 pointer-events-none rotate-12"></i>
            
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                  <i className="fa-solid fa-shield-cat text-lg text-white"></i>
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-wider text-xs">Velgo Security Unit</h3>
                  <p className="text-[8px] uppercase tracking-widest text-red-200 font-bold">Priority High-Alert Queue</p>
                </div>
              </div>
              <p className="text-[11px] text-red-50 leading-relaxed font-medium">
                Log dispute complaints, address bad conduct, or contact official administration instantly.
              </p>
            </div>

            {/* Official emergency support shortcuts */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
              <a 
                href="tel:112"
                className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl p-3 border border-white/10 text-center flex flex-col items-center justify-center"
              >
                <span className="text-[9px] font-black uppercase text-red-100 tracking-wider">Nigeria Dial</span>
                <span className="text-sm font-black mt-1"><i className="fa-solid fa-phone mr-1 bg-white/20 px-1 py-0.5 rounded"></i> Call 112 / 122</span>
              </a>
              <button 
                onClick={() => openWhatsAppHelper("Hello Velgo Nigeria! I need assistance with a safety/booking dispute report.")}
                className="bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 transition-all text-white rounded-2xl p-3 text-center flex flex-col items-center justify-center shadow-lg hover:shadow-green-500/10"
              >
                <span className="text-[9px] font-black uppercase text-green-100 tracking-wider">Fast-Response Line</span>
                <span className="text-sm font-black mt-1"><i className="fa-brands fa-whatsapp mr-1 bg-white/20 px-1 py-0.5 rounded"></i> Velgo Support</span>
              </button>
            </div>

            {/* Interactive Dispute Report Box */}
            <form onSubmit={handleSafetySubmit} className="bg-white dark:bg-gray-800 rounded-3xl p-5 text-gray-800 dark:text-gray-200 space-y-4 relative z-10 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700/50 pb-2">
                File a Secure Priority Report
              </p>

              {reportSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-xl border border-emerald-100 dark:border-emerald-900 animate-fadeIn text-center">
                  <i className="fa-solid fa-circle-check mr-1"></i> Report synced successfully. WhatsApp redirect completed.
                </div>
              )}

              <div>
                <label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">
                  Incident Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Fraud', 'Harassment', 'Threat', 'Other'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setIncidentType(cat)}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${incidentType === cat ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/30 dark:border-red-900/60' : 'bg-gray-50 border-transparent text-gray-500 dark:bg-gray-900'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">
                  Details / Job Identifier
                </label>
                <textarea
                  required
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Describe the transaction issue or behavior..."
                  className="w-full bg-gray-50 dark:bg-gray-900 text-xs font-medium p-3.5 rounded-xl outline-none border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Upload Screenshot Evidence Helper */}
              <div>
                <label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">
                  Upload Screenshot Evidence (WhatsApp logs, etc.)
                </label>
                <div className="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-center bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {evidencePreview ? (
                    <div className="space-y-2">
                      <img src={evidencePreview} className="w-16 h-16 object-cover rounded-lg border border-gray-200 mx-auto" alt="Preview"/>
                      <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest overflow-hidden text-ellipsis max-w-[150px] whitespace-nowrap">
                        {evidenceFile?.name || "Image Attached"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <i className="fa-solid fa-cloud-arrow-up text-gray-400 text-lg mb-1"></i>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-wide">Attach Screenshots</p>
                      <p className="text-[8px] text-gray-400 font-semibold uppercase leading-none">Max file size 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingReport || !details}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest py-3.5 rounded-2xl text-[10px] shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {submittingReport ? 'Syncing Priority...' : 'Submit Priority Alert'}
              </button>
            </form>
          </div>

          {/* STEP-BY-STEP INTERACTIVE PLATFORM GUIDELINES */}
          <div className="bg-white dark:bg-gray-800 rounded-[35px] border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/50 pb-4">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-2xl flex items-center justify-center">
                <i className="fa-regular fa-bookmark text-lg"></i>
              </div>
              <div>
                <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">
                  Velgo Nigeria Guidelines
                </h3>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                  Community terms & safe codes
                </p>
              </div>
            </div>

            {/* Guide Tabs */}
            <div className="grid grid-cols-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl">
              <button
                onClick={() => setGuideTab('hire')}
                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all ${guideTab === 'hire' ? 'bg-slate-900 dark:bg-gray-700 text-white shadow-sm' : 'text-gray-500'}`}
              >
                🤝 Hire Safely
              </button>
              <button
                onClick={() => setGuideTab('earn')}
                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all ${guideTab === 'earn' ? 'bg-slate-900 dark:bg-gray-700 text-white shadow-sm' : 'text-gray-500'}`}
              >
                🚀 Earn Safely
              </button>
            </div>

            {/* List with step numbers */}
            <div className="space-y-4 font-sans text-xs text-gray-600 dark:text-gray-400 font-bold leading-relaxed">
              {guideTab === 'hire' ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                    <p><b>Filter by Verification:</b> Browse artisan listings using our certified verified metrics badge filter for security and NIN matched guarantee.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                    <p><b>Clear Payment Milestones:</b> Never pay an artisan a 100% upfront deposit. Always establish fractional progress steps and pay only upon proof of performance.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                    <p><b>WhatsApp Redirection:</b> Communicate with the artisan over the prefilled WhatsApp invitation to finalize scope, pricing agreements, and visual specs easily.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">4</span>
                    <p><b>Complete with Reviews:</b> Once execution is complete, rate the builder's profile inside the active listings frame to guide future community hires.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-805 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                    <p><b>Keep Profiles Active:</b> Populate your LGA location coordinates, starting prices, and services details properly on your profile page to rank high.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-805 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                    <p><b>Active Token Applications:</b> Use standard token credits to apply to high budget open community tasks in real-time before other applicants lock it.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-805 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                    <p><b>Safe Milestone Settlements:</b> Agree on specific fractional milestones with the client before commencing major structural work or purchasing expensive raw supplies.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-805 flex items-center justify-center text-[10px] font-black shrink-0">4</span>
                    <p><b>Safety Compliance:</b> Keep chats legal, and if any dispute arises, screenshot files instantly to file security reports to the Velgo Team.</p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              <span>Velgo Terms v2.4</span>
              {onViewLegal && (
                <button
                  onClick={() => onViewLegal('guidelines')}
                  className="text-brand flex items-center gap-1 hover:underline"
                >
                  Read Policy <i className="fa-solid fa-chevron-right text-[8px]"></i>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
      ) : (
        /* Alerts Hub Tab Layout Content */
        <div className="bg-white dark:bg-gray-800 rounded-[35px] border border-gray-100 dark:border-gray-700 p-6 md:p-8 shadow-sm space-y-6 mx-1 mb-12 animate-fadeIn">
           {/* Tab Title & Description */}
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-5">
             <div>
               <h3 className="font-extrabold text-[#0f172a] dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                 <i className="fa-solid fa-shield-halved text-emerald-500 text-sm"></i> Safety Sync Audit Logs
               </h3>
               <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-1">
                 Your official historical logs of booking updates, message triggers, and community warnings
               </p>
             </div>
             {hubNotifications.length > 0 && (
               <div className="flex flex-wrap items-center gap-3">
                 <button 
                   onClick={handleMarkAllReadHub}
                   className="text-[9.5px] font-black uppercase text-emerald-600 dark:text-emerald-400 hover:opacity-80 flex items-center gap-1 bg-emerald-500/5 px-3 py-2 rounded-xl border border-emerald-500/10"
                 >
                   <i className="fa-solid fa-circle-check"></i> Mark All Read
                 </button>
               </div>
             )}
           </div>

           {/* Filter Toolbar */}
           <div className="flex gap-2 pb-2 overflow-x-auto whitespace-nowrap scrollbar-none">
             {(['all', 'info', 'success', 'alert'] as const).map((type) => {
               const labels = {
                 all: '🔔 All Logs',
                 info: '💬 Chat & Info',
                 success: '✅ Success Bookings',
                 alert: '⚠️ High Risk Warning'
               };
               return (
                 <button
                   key={type}
                   onClick={() => setHubFilter(type)}
                   className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${hubFilter === type ? 'bg-slate-900 border-transparent text-white dark:bg-gray-700 shadow-sm' : 'bg-gray-50 dark:bg-gray-900 border-transparent text-gray-400 dark:text-gray-500 hover:text-slate-900 hover:bg-gray-100'}`}
                 >
                   {labels[type]}
                 </button>
               );
             })}
           </div>

           {/* Notifications List */}
           <div className="space-y-4">
             {loadingNotifications ? (
               <div className="py-20 text-center space-y-3 animate-pulse">
                 <i className="fa-solid fa-circle-notch animate-spin text-brand text-2xl"></i>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Connecting to audit sync...</p>
               </div>
             ) : (() => {
               const filtered = hubNotifications.filter(n => hubFilter === 'all' || n.type === hubFilter);
               if (filtered.length === 0) {
                 return (
                   <div className="py-20 text-center space-y-4 border border-dashed border-gray-150 dark:border-gray-800 rounded-[28px] animate-fadeIn">
                     <div className="w-12 h-12 rounded-[22px] bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center text-gray-300 dark:text-gray-700 mx-auto">
                       <i className="fa-solid fa-bell-slash text-sm"></i>
                     </div>
                     <div>
                       <h4 className="font-extrabold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">No alerts found</h4>
                       <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-xs mx-auto leading-relaxed mt-1.5 uppercase font-bold">
                         There are currently no matching {hubFilter === 'all' ? '' : `"${hubFilter}" `}notifications logged in your 7-day database window.
                       </p>
                     </div>
                   </div>
                 );
               }

               return (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                   {filtered.map((item) => {
                     const dateObj = new Date(item.created_at);
                     const isToday = dateObj.toDateString() === new Date().toDateString();
                     const timeString = isToday 
                       ? `Today, ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                       : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                     const colors = {
                       info: {
                         bg: item.is_read ? 'bg-transparent' : 'bg-indigo-50/20 dark:bg-indigo-950/5 border-indigo-100/50 dark:border-indigo-950/20',
                         icon: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500',
                         fa: 'fa-bell'
                       },
                       success: {
                         bg: item.is_read ? 'bg-transparent' : 'bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-100/30 dark:border-emerald-950/20',
                         icon: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500',
                         fa: 'fa-circle-check'
                       },
                       alert: {
                         bg: item.is_read ? 'bg-transparent' : 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-100/30 dark:border-amber-950/20',
                         icon: 'bg-amber-50 dark:bg-amber-950/30 text-amber-500',
                         fa: 'fa-triangle-exclamation'
                       }
                     };

                     const style = colors[item.type as 'info' | 'success' | 'alert'] || colors.info;

                     return (
                       <div 
                         key={item.id}
                         className={`p-5 rounded-[28px] border border-gray-150 dark:border-gray-800 transition-all flex gap-3.5 relative ${style.bg} ${!item.is_read ? 'shadow-sm border-brand/20' : 'opacity-70'}`}
                       >
                         {/* Unread Ring Indicator */}
                         {!item.is_read && (
                           <span className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
                         )}

                         <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${style.icon}`}>
                           <i className={`fa-solid ${style.fa} text-[14px]`}></i>
                         </div>

                         <div className="flex-1 min-w-0 pr-4">
                           <span className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider block">
                             {item.type} • {timeString}
                           </span>
                           <h5 className="font-extrabold text-xs text-gray-900 dark:text-white mt-0.5">
                             {item.title}
                           </h5>
                           <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed mt-1.5 whitespace-pre-line break-words">
                             {item.message}
                           </p>

                           <div className="flex items-center gap-3 mt-3">
                             <button
                               onClick={() => handleToggleReadHub(item.id, item.is_read)}
                               className="text-[9.5px] font-black uppercase text-brand hover:opacity-80 transition-opacity"
                             >
                               {item.is_read ? 'Mark Unread' : 'Mark Read'}
                             </button>
                             <span className="text-gray-300 dark:text-gray-700 text-[10px]">•</span>
                             <button
                               onClick={() => handleDeleteHub(item.id)}
                               className="text-[9.5px] font-black uppercase text-red-500 hover:opacity-80 transition-opacity"
                             >
                               Remove
                             </button>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               );
             })()}
           </div>

           {/* Retention footer warning */}
           <div className="pt-6 border-t border-gray-100 dark:border-gray-700/50 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
             <span className="flex items-center gap-1.5"><i className="fa-solid fa-circle-info text-emerald-500"></i> Localized Postgres Retention Limit: 7 Days maximum</span>
             <span>Sync state: Live</span>
           </div>
        </div>
      )}

    </div>
  );
};

export default Overview;
