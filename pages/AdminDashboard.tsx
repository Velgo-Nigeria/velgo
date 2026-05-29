
import React, { useState, useEffect, useRef } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile, SubscriptionTier, Broadcast } from '../lib/types';
import { TIERS } from '../lib/constants';
import { GoogleGenAI } from "@google/genai";

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'verify' | 'safety' | 'support' | 'broadcast' | 'branding' | 'reviews'>('users');
  const [safetyReports, setSafetyReports] = useState<any[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<Profile[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [pendingReplies, setPendingReplies] = useState<any[]>([]);
  const [counts, setCounts] = useState<{
      verify: number;
      safety: number;
      support: number;
      reviews: number;
  }>({ verify: 0, safety: 0, support: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  // Broadcast Form
  const [bTitle, setBTitle] = useState('');
  const [bMessage, setBMessage] = useState('');
  const [bTarget, setBTarget] = useState<'all' | 'user' | 'admin'>('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Branding / Logo Gen
  const [logoPrompt, setLogoPrompt] = useState(JSON.stringify({
    subject: "A high-end, 3D corporate logo centered on a stylized 'V' that doubles as a checkmark",
    composition: "The 'V' is sharp and aerodynamic with deep beveled edges. Two sweeping orbital rings wrap around it, creating a sense of motion.",
    materials: "Polished chrome and brushed steel with a glossy finish.",
    colors: "Gradient transitioning from Deep Teal (#008080) to Electric Cyan (#00FFFF) and Cobalt Blue (#2E5BFF). Cool silver highlights.",
    lighting: "Studio rim lighting, volumetric glow, high contrast against a pure black background.",
    style: "Professional, industrial, sleek, Octane Render, 8k resolution, Unreal Engine 5 style."
  }, null, 2));
  const [generatingLogo, setGeneratingLogo] = useState(false);
  const [generatedLogoUrl, setGeneratedLogoUrl] = useState<string | null>(null);

  const [selectedTicketUser, setSelectedTicketUser] = useState<any>(null);
  const [adminReply, setAdminReply] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    fetchData(); 
    fetchCounts();
  }, [activeTab]);

  useEffect(() => {
    if (selectedTicketUser && chatScrollRef.current) {
        chatScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [supportMessages, selectedTicketUser]);

  const fetchData = async () => {
    if (activeTab === 'branding') return; 
    
    setLoading(true);
    setErrorMsg(null);
    
    try {
        let result: { data: any, error: any } = { data: null, error: null };

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setErrorMsg("Session expired. Please re-login.");
            setLoading(false);
            return;
        }

        // Fetch current user's profile to inspect database-level role
        const { data: curProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (curProfile) {
            setCurrentUserProfile(curProfile);
        }

        if (activeTab === 'users') {
            result = await safeFetch(() => supabase.from('profiles').select('*').order('created_at', { ascending: false }));
        } else if (activeTab === 'verify') {
            // Fetch users who have an uploaded ID but are NOT yet verified
            result = await safeFetch(() => supabase.from('profiles').select('*').not('nin_image_url', 'is', null).eq('is_verified', false).order('updated_at', { ascending: false }));
        } else if (activeTab === 'safety') {
            result = await safeFetch(() => supabase
                .from('safety_reports')
                .select('*, profiles(full_name, phone_number, id, email, avatar_url)')
                .order('created_at', { ascending: false }));
        } else if (activeTab === 'broadcast') {
            result = await safeFetch(() => supabase.from('broadcasts').select('*').order('created_at', { ascending: false }));
        } else if (activeTab === 'reviews') {
            result = await safeFetch(() => supabase
                .from('bookings')
                .select(`
                    id,
                    review,
                    rating,
                    worker_reply,
                    worker_reply_at,
                    worker_reply_approved,
                    client:client_id(full_name, avatar_url),
                    worker:worker_id(full_name, avatar_url)
                `)
                .not('worker_reply', 'is', null)
                .neq('worker_reply', '')
                .order('worker_reply_at', { ascending: false }));
        } else {
            result = await safeFetch(() => supabase
                .from('support_messages')
                .select('*, profiles(full_name, email, avatar_url, id)')
                .order('created_at', { ascending: true }));
        }

        if (result.error) {
            setErrorMsg(`Data Error: ${result.error.message}`);
        }

        if (activeTab === 'users') setUsers(result.data || []);
        else if (activeTab === 'verify') setPendingVerifications(result.data || []);
        else if (activeTab === 'safety') setSafetyReports(result.data || []);
        else if (activeTab === 'broadcast') setBroadcasts(result.data || []);
        else if (activeTab === 'reviews') setPendingReplies(result.data || []);
        else setSupportMessages(result.data || []);

    } catch (err: any) {
        setErrorMsg(err.message || "Unknown system error occurred.");
    } finally {
        setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
        // 1. Pending Verifications count
        const { count: vCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .not('nin_image_url', 'is', null)
            .eq('is_verified', false);

        // 2. Active Safety Reports count (unresolved / undismissed)
        const { data: sData } = await supabase
            .from('safety_reports')
            .select('status');
        const sCount = sData ? sData.filter((r: any) => r.status !== 'resolved' && r.status !== 'dismissed').length : 0;

        // 3. Support Tickets count (where client sent last message and admin didn't reply yet)
        const { data: supportMsgs } = await supabase
            .from('support_messages')
            .select('id, admin_reply, user_id, created_at, profiles:user_id(id)');
        let supportPendingCount = 0;
        if (supportMsgs) {
            const grouped = supportMsgs.reduce((acc: any, msg) => {
                if (!msg.profiles) return acc;
                const uid = msg.profiles.id;
                if (!acc[uid]) acc[uid] = { lastMsg: msg };
                if (new Date(msg.created_at) > new Date(acc[uid].lastMsg.created_at)) {
                    acc[uid].lastMsg = msg;
                }
                return acc;
            }, {});
            supportPendingCount = Object.values(grouped).filter((ticket: any) => !ticket.lastMsg.admin_reply).length;
        }

        // 4. Artisan Replies count (where worker_reply is set but not yet approved)
        const { count: rCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .not('worker_reply', 'is', null)
            .neq('worker_reply', '')
            .or('worker_reply_approved.is.null,worker_reply_approved.eq.false');

        setCounts({
            verify: vCount || 0,
            safety: sCount,
            support: supportPendingCount,
            reviews: rCount || 0
        });
    } catch (e) {
        console.error("Error fetching admin counts:", e);
    }
  };

  const handleGenerateLogo = async () => {
      setGeneratingLogo(true);
      setGeneratedLogoUrl(null);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          let promptText = logoPrompt;
          try {
              const json = JSON.parse(logoPrompt);
              promptText = `Generate an image: ${json.subject}. ${json.composition}. Materials: ${json.materials}. Colors: ${json.colors}. Lighting: ${json.lighting}. Style: ${json.style}`;
          } catch (e) {
              // Use raw text if JSON parse fails
          }

          const response = await ai.models.generateContent({
              model: 'gemini-3-pro-image-preview',
              contents: { parts: [{ text: promptText }] },
              config: {
                  imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
              }
          });

          if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                  if (part.inlineData) {
                      setGeneratedLogoUrl(`data:image/png;base64,${part.inlineData.data}`);
                      break;
                  }
              }
          } else {
              alert("No image generated. Try adjusting the prompt.");
          }
      } catch (err: any) {
          alert("Generation failed: " + err.message);
      } finally {
          setGeneratingLogo(false);
      }
  };

  const handleSendBroadcast = async () => {
      if (!bTitle || !bMessage) return;
      setSendingBroadcast(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const { error } = await supabase.from('broadcasts').insert({
              admin_id: user?.id,
              title: bTitle,
              message: bMessage,
              target_role: bTarget
          });
          
          if (error) throw error;

          alert("Broadcast sent successfully to " + bTarget + " users!");
          setBTitle('');
          setBMessage('');
          fetchData();
      } catch (err: any) {
          alert("Failed to broadcast: " + err.message);
      } finally {
          setSendingBroadcast(false);
      }
  };

  const handleDeleteBroadcast = async (id: string) => {
      if (!window.confirm("Delete this broadcast?")) return;
      const { error } = await supabase.from('broadcasts').delete().eq('id', id);
      if (error) alert("Could not delete: " + error.message);
      else setBroadcasts(prev => prev.filter(b => b.id !== id));
  };

  // Process Verification from Verify Tab
  const handleVerificationDecision = async (userId: string, decision: 'approve' | 'reject') => {
      const reason = rejectionReasons[userId]?.trim();
      if (decision === 'reject' && !reason) {
          alert("Please provide a Reason for Rejection so the user knows what to correct.");
          return;
      }

      setProcessingId(userId);
      try {
          const updates = decision === 'approve' 
            ? { is_verified: true, id_rejection_reason: null } 
            : { nin_image_url: null, is_verified: false, id_rejection_reason: reason }; // Clear image on reject so user can re-upload

          const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
          if (error) throw error;

          setPendingVerifications(prev => prev.filter(u => u.id !== userId));
          setRejectionReasons(prev => {
              const copy = { ...prev };
              delete copy[userId];
              return copy;
          });
          alert(`User ${decision}d successfully.`);
          fetchCounts();
      } catch (err: any) {
          alert("Action failed: " + err.message);
      } finally {
          setProcessingId(null);
      }
  };

  const handleManualTierUpdate = async (userId: string, newTier: SubscriptionTier) => {
      setProcessingId(userId);
      try {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        
        const addedTokens = TIERS.find(t => t.id === newTier)?.limit || 0;
        await supabase.rpc('add_tokens', { p_user_id: userId, p_amount: addedTokens });

        const { error } = await supabase.from('profiles').update({
            subscription_tier: newTier,
            subscription_end_date: endDate.toISOString()
        }).eq('id', userId);
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_tier: newTier } : u));
      } catch (error: any) {
          alert("Failed to update tier: " + error?.message);
      } finally {
        setProcessingId(null);
      }
  };

  const handleReviewReplyApprove = async (bookingId: string) => {
      setProcessingId(bookingId);
      try {
          const { error } = await supabase
              .from('bookings')
              .update({ worker_reply_approved: true })
              .eq('id', bookingId);
          if (error) throw error;
          
          setPendingReplies(prev => prev.map(item => item.id === bookingId ? { ...item, worker_reply_approved: true } : item));
          alert("Artisan reply approved! It is now live on their profile.");
          fetchCounts();
      } catch (err: any) {
          alert("Action failed: " + err.message);
      } finally {
          setProcessingId(null);
      }
  };

  const handleReviewReplyReject = async (bookingId: string) => {
      if (!window.confirm("Are you sure you want to delete and reset this artisan reply? The artisan will be allowed to submit a new response.")) return;
      setProcessingId(bookingId);
      try {
          const { error } = await supabase
              .from('bookings')
              .update({ 
                  worker_reply: null, 
                  worker_reply_at: null, 
                  worker_reply_approved: false 
              })
              .eq('id', bookingId);
          if (error) throw error;
          
          setPendingReplies(prev => prev.filter(item => item.id !== bookingId));
          alert("Artisan reply rejected & deleted.");
          fetchCounts();
      } catch (err: any) {
          alert("Action failed: " + err.message);
      } finally {
          setProcessingId(null);
      }
  };

  const handleSafetyAction = async (reportId: string, action: 'resolve' | 'dismiss') => {
      const status = action === 'resolve' ? 'resolved' : 'dismissed';
      const { error } = await supabase.from('safety_reports').update({ status }).eq('id', reportId);
      if (error) alert("Failed: " + error.message);
      else fetchData();
  };

  const sendAdminReply = async () => {
      if (!selectedTicketUser || !adminReply.trim()) return;
      const { error } = await supabase.from('support_messages').insert({
          user_id: selectedTicketUser.id,
          content: adminReply,
          admin_reply: true, 
          status: 'open'
      });
      if (!error) {
          setAdminReply('');
          fetchData();
      } else {
          alert("Failed: " + error.message);
      }
  };

  const downloadUsersCSV = () => {
      if (!users || users.length === 0) {
          alert("No user records to download.");
          return;
      }

      // Column Headers
      const headers = [
          'ID',
          'Full Name',
          'Email',
          'Phone Number',
          'Role',
          'Address',
          'State',
          'LGA',
          'Verification Status',
          'ID Card URL',
          'Subscription Tier',
          'Tokens Balance',
          'Profile Score',
          'Created At'
      ];

      // Format Rows
      const rows = users.map(u => [
          u.id || '',
          u.full_name || '',
          u.email || '',
          u.phone_number || '',
          u.role || '',
          u.address || '',
          u.state || '',
          u.lga || '',
          u.is_verified ? 'Verified' : 'Unverified',
          u.nin_image_url || '',
          u.subscription_tier || 'basic',
          u.tokens ?? 0,
          u.profile_score ?? 0,
          u.updated_at || ''
      ]);

      // Utility to escape quotes and commas
      const escapeValue = (val: any) => {
          const stringified = String(val).replace(/"/g, '""');
          if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n') || stringified.includes('\r')) {
              return `"${stringified}"`;
          }
          return stringified;
      };

      const csvContent = [
          headers.map(escapeValue).join(','),
          ...rows.map(row => row.map(escapeValue).join(','))
      ].join('\n');

      // Generate blob with UTF-8 BOM so Excel opens it with the correct encoding automatically
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `velgo_users_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  const groupedSupport = supportMessages.reduce((acc: any, msg) => {
      if (!msg.profiles) return acc;
      const uid = msg.profiles.id;
      if (!acc[uid]) acc[uid] = { user: msg.profiles, messages: [], lastMsg: msg };
      acc[uid].messages.push(msg);
      if (new Date(msg.created_at) > new Date(acc[uid].lastMsg.created_at)) acc[uid].lastMsg = msg;
      return acc;
  }, {});

  const sortedSupportTickets = Object.values(groupedSupport).sort((a: any, b: any) => 
      new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime()
  );

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen pb-24 flex flex-col transition-colors duration-200">
      <div className="px-6 pt-10 pb-4 bg-gray-900 sticky top-0 z-20 text-white shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack}><i className="fa-solid fa-chevron-left"></i></button>
                <h1 className="text-2xl font-black">Admin Panel</h1>
            </div>
            <button onClick={fetchData} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
            </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['users', 'verify', 'safety', 'support', 'broadcast', 'branding', 'reviews'].map(tab => {
            const badgeCount = counts[tab as keyof typeof counts] || 0;
            return (
              <button 
                key={tab} 
                onClick={() => { setActiveTab(tab as any); setSelectedTicketUser(null); }} 
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all duration-150 ${activeTab === tab ? 'bg-brand text-white font-black' : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-white'}`}
              >
                <span>{tab === 'reviews' ? 'Artisan Replies' : tab}</span>
                {badgeCount > 0 && (
                  <span className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded-full tracking-tight shrink-0 ${
                    activeTab === tab ? 'bg-white text-gray-950 font-black' : 'bg-red-500 text-white animate-pulse'
                  }`}>
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab !== 'branding' && loading ? <div className="text-center py-20 text-gray-400">Loading data...</div> : 
         errorMsg ? (
             activeTab === 'broadcast' && (errorMsg.includes('broadcasts') || errorMsg.includes('schema cache')) ? (
                 <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[32px] border border-amber-200 dark:border-slate-800 space-y-6 animate-fadeIn font-sans max-w-xl mx-auto">
                     <div className="flex items-start gap-4">
                         <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shrink-0 text-xl">
                             <i className="fa-solid fa-circle-exclamation animate-bounce"></i>
                         </div>
                         <div>
                             <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">📢 Activate Admin Broadcasts</h3>
                             <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                 The <code>public.broadcasts</code> table was not found in your Supabase database schema cache. This table stores public announcements sent to students, clients, or artisans.
                             </p>
                         </div>
                     </div>

                     <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/60 space-y-3">
                         <p className="text-xs font-bold text-slate-700 dark:text-gray-200 flex items-center gap-1.5"><i className="fa-solid fa-magic text-amber-500"></i> How to initialize in 10 seconds:</p>
                         <ol className="list-decimal pl-4 text-xs text-slate-500 dark:text-gray-400 space-y-1.5">
                             <li>Open your <strong>Supabase Dashboard</strong>.</li>
                             <li>Go to the <strong>SQL Editor</strong> in the left sidebar.</li>
                             <li>Click <strong>New Query</strong>, paste the script below, and click <strong>Run</strong>.</li>
                             <li>Refresh this dashboard tab to start broadcasting!</li>
                         </ol>
                     </div>

                     <div className="space-y-2">
                         <div className="flex justify-between items-center px-1">
                             <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">SQL Setup Script</span>
                             <button 
                                 onClick={() => {
                                     const sql = `CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access" ON public.broadcasts;
CREATE POLICY "Admins have full access" ON public.broadcasts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role::text = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users view targeted" ON public.broadcasts;
CREATE POLICY "Users view targeted" ON public.broadcasts
    FOR SELECT USING (
        target_role = 'all' OR 
        target_role = (SELECT role::text FROM public.profiles WHERE id = auth.uid())
    );

GRANT ALL ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;`;
                                     navigator.clipboard.writeText(sql);
                                     alert("SQL setup code copied to clipboard! Paste and run it in your Supabase SQL Editor.");
                                 }}
                                 className="text-[9px] font-black uppercase tracking-wider px-3 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                             >
                                 <i className="fa-solid fa-copy"></i> Copy Script
                             </button>
                         </div>
                         <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-[10px] font-mono leading-relaxed overflow-x-auto border border-slate-800 max-h-52 overflow-y-auto">
{`CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access" ON public.broadcasts;
CREATE POLICY "Admins have full access" ON public.broadcasts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role::text = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users view targeted" ON public.broadcasts;
CREATE POLICY "Users view targeted" ON public.broadcasts
    FOR SELECT USING (
        target_role = 'all' OR 
        target_role = (SELECT role::text FROM public.profiles WHERE id = auth.uid())
    );

GRANT ALL ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;`}
                         </pre>
                     </div>
                 </div>
             ) : (
                 <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-center border border-red-100 animate-fadeIn"><p className="text-xs font-bold">{errorMsg}</p></div>
             )
         ) :

         activeTab === 'branding' ? (
             <div className="space-y-6 animate-fadeIn">
                 {/* Branding Tool Logic */}
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-700">
                     <div className="flex justify-between items-center mb-4">
                         <div>
                             <h3 className="text-lg font-black text-gray-900 dark:text-white">AI Logo Generator</h3>
                             <p className="text-xs text-gray-500 dark:text-gray-400">Generate high-end 3D assets for the platform.</p>
                         </div>
                         <div className="w-10 h-10 bg-brand/10 text-brand rounded-full flex items-center justify-center"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                     </div>
                     
                     <div className="space-y-4">
                         <div className="relative">
                             <textarea 
                                value={logoPrompt} 
                                onChange={e => setLogoPrompt(e.target.value)} 
                                rows={8} 
                                className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl text-xs font-mono border border-gray-100 dark:border-slate-700 outline-none focus:border-brand dark:text-gray-300 resize-y"
                             />
                             <div className="absolute top-2 right-2 text-[9px] font-bold text-gray-400 uppercase bg-white dark:bg-slate-800 px-2 py-1 rounded">JSON Config</div>
                         </div>
                         
                         <button 
                            onClick={handleGenerateLogo} 
                            disabled={generatingLogo} 
                            className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                         >
                             {generatingLogo ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                             {generatingLogo ? 'Rendering 3D Model...' : 'Generate Logo'}
                         </button>
                     </div>
                 </div>

                 {generatedLogoUrl && (
                     <div className="bg-black p-6 rounded-[32px] shadow-2xl border border-gray-800 text-center animate-fadeIn">
                         <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Preview Output</p>
                         <img src={generatedLogoUrl} className="w-full max-w-sm mx-auto rounded-2xl shadow-lg border border-white/10" alt="Generated Logo" />
                         
                         <div className="bg-gray-900 mt-6 p-4 rounded-xl border border-gray-700 text-left space-y-2">
                            <p className="text-[10px] font-black text-brand uppercase">Step 1: Save</p>
                            <a href={generatedLogoUrl} download="velgo-logo.png" className="block w-full bg-white text-black text-center py-2 rounded-lg font-bold text-xs">Download Image</a>
                         </div>

                         <div className="mt-6 flex justify-center">
                             <button onClick={() => setGeneratedLogoUrl(null)} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold text-xs uppercase">Dismiss</button>
                         </div>
                     </div>
                 )}
             </div>
         ) :

         activeTab === 'broadcast' ? (
             <div className="space-y-6 animate-fadeIn">
                 {/* Current Database Role Warning */}
                 {currentUserProfile && currentUserProfile.role !== 'admin' && (
                     <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-[28px] p-6 space-y-4 shadow-sm">
                         <div className="flex items-start gap-4">
                             <div className="w-11 h-11 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shrink-0 text-lg">
                                 <i className="fa-solid fa-triangle-exclamation animate-pulse"></i>
                             </div>
                             <div className="flex-1">
                                 <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider">Database Role Restriction Detected</h4>
                                 <p className="text-xs text-amber-700 dark:text-slate-300 leading-relaxed mt-1">
                                     Your logged-in account (<strong>{currentUserProfile.email}</strong>) has the database role <strong>"{currentUserProfile.role}"</strong> instead of <strong>"admin"</strong>. 
                                     Supabase Row Level Security (RLS) rules reject broadcast insertions from profiles that do not have the database-level <code>admin</code> role.
                                 </p>
                             </div>
                         </div>
                         <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-xl border border-amber-200/40 dark:border-amber-900/20 space-y-2">
                             <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">💡 Promote your profile role in the <strong>Supabase SQL Editor</strong> to fix this:</p>
                             <div className="flex items-center gap-2">
                                 <code className="flex-1 bg-slate-900 text-[10px] text-zinc-300 font-mono p-3 rounded-lg select-all break-all border border-slate-800">
                                     {`UPDATE public.profiles SET role = 'admin'::user_role WHERE id = '${currentUserProfile.id}';`}
                                 </code>
                                 <button 
                                     onClick={() => {
                                         navigator.clipboard.writeText(`UPDATE public.profiles SET role = 'admin'::user_role WHERE id = '${currentUserProfile.id}';`);
                                         alert("SQL statement copied! Paste and execute it in your Supabase SQL Editor, then refresh this panel.");
                                     }}
                                     className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0"
                                 >
                                     Copy SQL
                                 </button>
                             </div>
                         </div>
                     </div>
                 )}

                 {/* Create Broadcast */}
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[3px] text-brand">New Broadcast</h3>
                    <div className="space-y-3">
                        <input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="Title (e.g. Server Maintenance)" className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl text-sm font-bold outline-none dark:text-white" />
                        <textarea value={bMessage} onChange={e => setBMessage(e.target.value)} placeholder="Message text..." rows={3} className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl text-sm font-medium outline-none dark:text-white resize-none" />
                        <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
                            {['all', 'user', 'admin'].map(t => (
                                <button key={t} onClick={() => setBTarget(t as any)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${bTarget === t ? 'bg-white dark:bg-slate-600 text-brand shadow-sm' : 'text-gray-400'}`}>{t}</button>
                            ))}
                        </div>
                        <button onClick={handleSendBroadcast} disabled={sendingBroadcast || !bTitle || !bMessage} className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50">
                            {sendingBroadcast ? 'Broadcasting...' : 'Send to All Phones'}
                        </button>
                    </div>
                 </div>

                 {/* History List */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[3px] text-gray-400">Broadcast History</h3>
                        <span className="text-[10px] font-bold text-gray-300 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{broadcasts.length} sent</span>
                    </div>
                    
                    {broadcasts.length === 0 ? <p className="text-center text-xs text-gray-400 italic py-10">No history yet.</p> :
                     broadcasts.map(b => (
                        <div key={b.id} className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700 relative group transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-gray-900 dark:text-white text-sm tracking-tight">{b.title}</h4>
                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${b.target_role === 'all' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    To: {b.target_role}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium mb-3">{b.message}</p>
                            <div className="flex justify-between items-center border-t border-gray-50 dark:border-slate-700 pt-3">
                                <p className="text-[9px] text-gray-300 dark:text-slate-500 font-bold uppercase tracking-widest">{b.created_at ? new Date(b.created_at).toLocaleString() : 'Just now'}</p>
                                <button 
                                    onClick={() => handleDeleteBroadcast(b.id)} 
                                    className="text-gray-300 hover:text-red-500 transition-colors p-2 -mr-2"
                                    title="Delete from history"
                                >
                                    <i className="fa-solid fa-trash-can text-sm"></i>
                                </button>
                            </div>
                        </div>
                     ))}
                 </div>
             </div>
         ) :

         activeTab === 'verify' ? (
             <div className="space-y-6">
                 {pendingVerifications.length === 0 ? (
                     <div className="text-center py-20 opacity-30">
                         <i className="fa-solid fa-circle-check text-6xl mb-4"></i>
                         <p className="font-black uppercase tracking-widest text-xs">All clear! No pending IDs.</p>
                     </div>
                 ) : (
                     pendingVerifications.map(user => (
                         <div key={user.id} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                             <div className="flex items-center gap-4">
                                 <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}`} className="w-12 h-12 rounded-full object-cover" />
                                 <div>
                                     <h4 className="font-bold text-gray-900 dark:text-white">{user.full_name}</h4>
                                     <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">{user.role}</p>
                                 </div>
                             </div>
                             
                             <div className="bg-gray-100 dark:bg-black rounded-2xl overflow-hidden aspect-video relative group">
                                 <img src={user.nin_image_url} className="w-full h-full object-contain" alt="User ID" />
                                 <a href={user.nin_image_url} target="_blank" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs uppercase tracking-widest transition-opacity">
                                     View Full Image
                                 </a>
                             </div>

                             <div className="space-y-1.5 pt-1">
                                 <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                     Reason for Rejection (required only if rejecting)
                                 </label>
                                 <input 
                                     type="text" 
                                     placeholder="e.g. Image blurry, name mismatch, expired document..."
                                     value={rejectionReasons[user.id] || ''}
                                     onChange={(e) => setRejectionReasons(prev => ({ ...prev, [user.id]: e.target.value }))}
                                     className="w-full text-xs p-3 rounded-xl border border-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-red-400 dark:focus:border-red-500/50 transition-colors"
                                 />
                             </div>

                             <div className="grid grid-cols-2 gap-3">
                                 <button 
                                    onClick={() => handleVerificationDecision(user.id, 'reject')}
                                    disabled={processingId === user.id}
                                    className="py-3 rounded-xl bg-red-50 text-red-600 font-bold text-xs uppercase"
                                 >
                                     Reject
                                 </button>
                                 <button 
                                    onClick={() => handleVerificationDecision(user.id, 'approve')}
                                    disabled={processingId === user.id}
                                    className="py-3 rounded-xl bg-green-500 text-white font-bold text-xs uppercase shadow-lg"
                                 >
                                     Approve
                                 </button>
                             </div>
                         </div>
                     ))
                 )}
             </div>
         ) : 
         
         activeTab === 'users' ? (
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search users..." className="flex-1 p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-brand" />
                    <button 
                        onClick={downloadUsersCSV}
                        className="bg-brand text-white px-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand/90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shrink-0"
                        title="Download all user records as CSV"
                    >
                        <i className="fa-solid fa-file-csv text-base"></i>
                        <span className="hidden sm:inline">Download CSV</span>
                    </button>
                </div>
                <div className="space-y-3">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user.full_name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    {user.phone_number && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <a href={`tel:${user.phone_number}`} className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 hover:text-brand hover:underline">
                                                {user.phone_number}
                                            </a>
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    navigator.clipboard.writeText(user.phone_number);
                                                    alert("Phone copied!");
                                                }} 
                                                className="text-gray-400 hover:text-brand transition-colors"
                                                title="Copy Phone"
                                            >
                                                <i className="fa-regular fa-copy text-[10px]"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.is_verified ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {user.is_verified ? 'Verified' : 'Unverified'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-slate-700">
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{user.role}</span>
                                <div className="flex items-center gap-1">
                                    <select value={user.subscription_tier || 'basic'} onChange={(e) => handleManualTierUpdate(user.id, e.target.value as SubscriptionTier)} className="bg-gray-100 dark:bg-slate-700 text-[10px] font-bold py-1 px-2 rounded-lg outline-none dark:text-white">
                                        {TIERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         ) : 
         
         activeTab === 'safety' ? (
            <div className="space-y-4">
                {safetyReports.map(report => (
                    <div key={report.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-red-50 dark:border-red-900/20">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${report.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{report.status || 'pending'}</span>
                            <span className="text-[10px] text-gray-400">{new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="mb-3">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Reporter: {report.profiles?.full_name}</p>
                            <a href={`tel:${report.profiles?.phone_number}`} className="text-xs text-blue-600 font-bold underline">{report.profiles?.phone_number}</a>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl mb-4 whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{report.details}</div>
                        <div className="flex gap-2">
                            <button onClick={() => { setActiveTab('support'); setSelectedTicketUser(report.profiles); }} className="flex-1 bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-3 rounded-xl font-black text-[10px] uppercase">Message</button>
                            {report.status !== 'resolved' && (
                                <button onClick={() => handleSafetyAction(report.id, 'resolve')} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-black text-[10px] uppercase">Resolve</button>
                            )}
                        </div>
                    </div>
                 ))}
            </div>
         ) : 
         
         activeTab === 'support' ? (
             selectedTicketUser ? (
                 <div className="flex flex-col h-[70vh]">
                     <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-t-2xl border-b dark:border-slate-700 mb-2">
                         <button onClick={() => setSelectedTicketUser(null)} className="w-8 h-8 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center dark:text-white"><i className="fa-solid fa-arrow-left"></i></button>
                         <h3 className="font-bold text-gray-900 dark:text-white">{selectedTicketUser.full_name}</h3>
                     </div>
                     <div className="flex-1 overflow-y-auto space-y-3 p-2">
                         {groupedSupport[selectedTicketUser.id]?.messages.map((msg: any) => (
                                 <div key={msg.id} className={`flex ${msg.admin_reply ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${msg.admin_reply ? 'bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-bl-none'}`}>
                                         {msg.content}
                                     </div>
                                 </div>
                         ))}
                         <div ref={chatScrollRef} />
                     </div>
                     <div className="mt-2 flex gap-2 pt-2 border-t dark:border-slate-700">
                         <input value={adminReply} onChange={e => setAdminReply(e.target.value)} className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 p-3 rounded-xl text-sm outline-none dark:text-white" placeholder="Type reply..." />
                         <button onClick={sendAdminReply} className="bg-brand text-white px-6 rounded-xl font-black text-xs uppercase">Send</button>
                     </div>
                 </div>
             ) : (
                 <div className="space-y-3">
                     {sortedSupportTickets.map((ticket: any) => (
                         <div key={ticket.user.id} onClick={() => setSelectedTicketUser(ticket.user)} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer border border-gray-100 dark:border-slate-700">
                             <img src={ticket.user.avatar_url || `https://ui-avatars.com/api/?name=${ticket.user.full_name}`} className="w-10 h-10 rounded-full object-cover" />
                             <div className="flex-1 min-w-0">
                                 <div className="flex justify-between">
                                     <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{ticket.user.full_name}</h4>
                                     <span className="text-[9px] text-gray-400 font-bold">{new Date(ticket.lastMsg.created_at).toLocaleDateString()}</span>
                                 </div>
                                 <p className="text-xs text-gray-500 truncate mt-1">{ticket.lastMsg.content}</p>
                             </div>
                         </div>
                      ))}
                 </div>
             )
         ) :

          activeTab === 'reviews' ? (
              <div className="space-y-6 animate-fadeIn pb-12">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-[28px] border dark:border-slate-700">
                      <div>
                          <h3 className="text-sm font-black text-gray-900 dark:text-white">Artisan Reply Vetting</h3>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Reviewing professional conduct</p>
                      </div>
                      <span className="text-[11px] font-black bg-brand/10 text-brand px-3 py-1.5 rounded-xl">
                          {pendingReplies.filter(r => !r.worker_reply_approved).length} Pending
                      </span>
                  </div>

                  {pendingReplies.length === 0 ? (
                      <div className="text-center py-20 opacity-35 bg-white dark:bg-slate-800 rounded-[28px] border dark:border-slate-700">
                          <i className="fa-solid fa-circle-check text-6xl mb-4 text-emerald-500"></i>
                          <p className="font-black uppercase tracking-widest text-xs dark:text-white">All clear! No pending artisan replies.</p>
                      </div>
                  ) : (
                      <div className="space-y-4 font-sans">
                          {pendingReplies.map((reply) => (
                              <div key={reply.id} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700 shadow-sm space-y-4 relative overflow-hidden">
                                  {/* User details header */}
                                  <div className="flex justify-between items-center text-xs border-b pb-3 dark:border-slate-700">
                                      <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
                                              {reply.worker?.avatar_url ? <img src={reply.worker.avatar_url} className="w-full h-full object-cover" alt=""/> : <span className="font-bold text-gray-400 p-2 text-xs">U</span>}
                                          </div>
                                          <div>
                                              <p className="font-extrabold text-gray-800 dark:text-gray-200">{reply.worker?.full_name || 'Unknown Worker'}</p>
                                              <p className="text-[8px] font-black uppercase text-brand">Artisan / Worker</p>
                                          </div>
                                      </div>
                                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                          {reply.worker_reply_at ? new Date(reply.worker_reply_at).toLocaleDateString() : 'Unknown Date'}
                                      </span>
                                  </div>

                                  {/* The Original client Review info */}
                                  <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                                      <div className="flex justify-between items-center mb-1">
                                          <div className="flex items-center gap-1.5">
                                              <span className="text-[9px] font-bold text-gray-500 uppercase">Client Review by {reply.client?.full_name || 'Client'}</span>
                                          </div>
                                          <div className="flex text-yellow-400 text-[8px] gap-0.5">
                                              {Array(reply.rating || 5).fill(0).map((_, idx) => <i key={idx} className="fa-solid fa-star"></i>)}
                                          </div>
                                      </div>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{reply.review || 'No written review text'}"</p>
                                  </div>

                                  {/* The Worker's actual Reply */}
                                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/10 font-sans">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                                          <i className="fa-solid fa-reply"></i> Proposed Artisan Reply
                                      </p>
                                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">"{reply.worker_reply}"</p>
                                  </div>

                                  {/* Verification status and moderation action items */}
                                  <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
                                      <div className="flex items-center gap-1.5">
                                          {reply.worker_reply_approved ? (
                                              <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border border-green-100 dark:border-green-800/40">
                                                  <i className="fa-solid fa-circle-check mr-1"></i> Approved & Live
                                              </span>
                                          ) : (
                                              <span className="bg-yellow-50 dark:bg-yellow-905 text-yellow-600 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse border border-yellow-100 dark:border-yellow-900/30">
                                                  <i className="fa-solid fa-hourglass-half mr-1"></i> Pending Moderation
                                              </span>
                                          )}
                                      </div>

                                      <div className="flex gap-2">
                                          <button 
                                              disabled={processingId === reply.id}
                                              onClick={() => handleReviewReplyReject(reply.id)} 
                                              className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wide hover:bg-red-100 active:scale-95 transition-transform"
                                          >
                                              Reject & Delete
                                          </button>
                                          {!reply.worker_reply_approved && (
                                              <button 
                                                  disabled={processingId === reply.id}
                                                  onClick={() => handleReviewReplyApprove(reply.id)} 
                                                  className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wide shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 active:scale-95 transition-transform"
                                              >
                                                  Approve
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          ) : null
        }
      </div>
    </div>
  );
};
export default AdminDashboard;