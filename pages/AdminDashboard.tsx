
import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile, SubscriptionTier, Broadcast } from '../lib/types';
import { TIERS } from '../lib/constants';
import { GoogleGenAI } from "@google/genai";

interface SparkChartProps {
    data: { label: string; count: number }[];
    color: string;
    gradientId: string;
}

const SparkChart: React.FC<SparkChartProps> = ({ data, color, gradientId }) => {
    if (data.length === 0) return <div className="h-40 flex items-center justify-center text-xs text-gray-400">No data</div>;
    const maxVal = Math.max(...data.map(d => d.count), 5);
    const height = 180;
    const width = 500;
    const padding = { top: 20, right: 20, bottom: 25, left: 35 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points = data.map((d, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (d.count / maxVal) * chartHeight;
        return { x, y, label: d.label, count: d.count };
    });

    const pathD = points.length > 0 
        ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
        : '';

    const areaD = points.length > 0
        ? `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
        : '';

    return (
        <div className="w-full relative group">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible font-sans">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                </defs>
                
                {/* Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = padding.top + chartHeight * ratio;
                    const val = Math.round(maxVal * (1 - ratio));
                    return (
                        <g key={idx}>
                            <line 
                                x1={padding.left} 
                                y1={y} 
                                x2={width - padding.right} 
                                y2={y} 
                                className="stroke-gray-100 dark:stroke-slate-800/80" 
                                strokeWidth={1} 
                                strokeDasharray="3 3" 
                            />
                            <text 
                                x={padding.left - 8} 
                                y={y + 3} 
                                className="fill-gray-400 dark:fill-gray-500 font-mono text-[8px] text-right font-bold"
                                textAnchor="end"
                            >
                                {val}
                            </text>
                        </g>
                    );
                })}

                {/* Vertical labels */}
                {points.map((p, idx) => (
                    <text 
                        key={idx}
                        x={p.x}
                        y={height - 6}
                        className="fill-gray-400 dark:fill-gray-500 font-black text-[8px] uppercase tracking-wider"
                        textAnchor="middle"
                    >
                        {p.label}
                    </text>
                ))}

                {/* Glowing Area Fill */}
                {areaD && (
                    <path 
                        d={areaD} 
                        fill={`url(#${gradientId})`} 
                    />
                )}

                {/* Spark Line */}
                {pathD && (
                    <path 
                        d={pathD} 
                        fill="none" 
                        stroke={color} 
                        strokeWidth={2} 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                    />
                )}

                {/* Interactive Points */}
                {points.map((p, idx) => (
                    <g key={idx} className="group/dot cursor-pointer">
                        <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={3.5} 
                            className="fill-white dark:fill-slate-900 stroke-2" 
                            stroke={color} 
                        />
                        <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={8} 
                            fill={color} 
                            className="opacity-0 group-hover/dot:opacity-15 transition-all duration-150" 
                        />
                        
                        {/* Tooltip on Hover */}
                        <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <rect 
                                x={p.x - 22} 
                                y={p.y - 24} 
                                width={44} 
                                height={16} 
                                rx={4} 
                                className="fill-slate-950/90 dark:fill-white" 
                            />
                            <text 
                                x={p.x} 
                                y={p.y - 13} 
                                className="fill-white dark:fill-slate-950 font-black text-[8px] text-center"
                                textAnchor="middle"
                            >
                                {p.count}
                            </text>
                        </g>
                    </g>
                ))}
            </svg>
        </div>
    );
};

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'verify' | 'safety' | 'support' | 'broadcast' | 'branding' | 'reviews' | 'stats'>('users');
  const [safetyReports, setSafetyReports] = useState<any[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<Profile[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [pendingReplies, setPendingReplies] = useState<any[]>([]);
  const [stats, setStats] = useState<{
      totalUsers: number;
      weeklyActiveCount: number;
      roles: { client: number; worker: number; admin: number };
      verifiedCount: number;
      tiers: { basic: number; lite: number; standard: number; pro: number };
      totalTasks: number;
      totalBudget: number;
      taskStatus: Record<string, number>;
      totalBookings: number;
      bookingStatus: Record<string, number>;
      revenueMRR: number;
      averageBudget: number;
      categoryDistribution: Record<string, number>;
      userGrowth: { label: string; count: number }[];
      taskVolumeWeekly: { label: string; count: number }[];
  } | null>(null);
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

  // Blocking Form states
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState<string>('');
  const [unblockConfirmId, setUnblockConfirmId] = useState<string | null>(null);

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

        if (activeTab === 'stats') {
            try {
                // Fetch stats datasets
                const { data: allProfiles, error: pErr } = await supabase.from('profiles').select('role, is_verified, subscription_tier, created_at, tokens, updated_at, category');
                const { data: allTasks, error: tErr } = await supabase.from('posted_tasks').select('status, budget, created_at, category');
                const { data: allBookings, error: bErr } = await supabase.from('bookings').select('status, created_at');

                if (pErr || tErr || bErr) {
                    throw new Error(pErr?.message || tErr?.message || bErr?.message || "Error fetching records");
                }

                const profilesList = allProfiles || [];
                const totalUsers = profilesList.length;
                const roles = { client: 0, worker: 0, admin: 0 };
                let verifiedCount = 0;
                const tiers = { basic: 0, lite: 0, standard: 0, pro: 0 };

                // Weekly active users calculation: profiles whose updated_at/created_at is within the last 7 days
                let weeklyActiveCount = 0;
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                profilesList.forEach((p: any) => {
                    const r = p.role || 'user';
                    if (r === 'admin') {
                        roles.admin++;
                    } else if (p.category) {
                        roles.worker++;
                    } else {
                        roles.client++;
                    }

                    if (p.is_verified) verifiedCount++;

                    const tier = p.subscription_tier || 'basic';
                    if (tier in tiers) {
                        tiers[tier as keyof typeof tiers]++;
                    } else {
                        tiers.basic++;
                    }

                    const lastActive = p.updated_at ? new Date(p.updated_at) : p.created_at ? new Date(p.created_at) : null;
                    if (lastActive && lastActive >= sevenDaysAgo) {
                        weeklyActiveCount++;
                    }
                });

                // Tier pricing definitions in NGN (Starter Pack, Standard Pack, Pro Pack, Power Pack)
                const tierPrices = { basic: 900, lite: 3999, standard: 6999, pro: 9999 };
                const revenueMRR = (tiers.basic * tierPrices.basic) + 
                                    (tiers.lite * tierPrices.lite) + 
                                    (tiers.standard * tierPrices.standard) + 
                                    (tiers.pro * tierPrices.pro);

                const tasksList = allTasks || [];
                const totalTasks = tasksList.length;
                let totalBudget = 0;
                const taskStatus: Record<string, number> = {};
                const categoryDistribution: Record<string, number> = {};

                tasksList.forEach((t: any) => {
                    totalBudget += t.budget || 0;
                    taskStatus[t.status] = (taskStatus[t.status] || 0) + 1;
                    categoryDistribution[t.category] = (categoryDistribution[t.category] || 0) + 1;
                });

                const averageBudget = totalTasks > 0 ? Math.round(totalBudget / totalTasks) : 0;

                const bookingsList = allBookings || [];
                const totalBookings = bookingsList.length;
                const bookingStatus: Record<string, number> = {};
                bookingsList.forEach((b: any) => {
                    bookingStatus[b.status] = (bookingStatus[b.status] || 0) + 1;
                });

                // Group User Growth by month (last 6 months)
                const userGrowthMap: Record<string, number> = {};
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const now = new Date();
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
                    userGrowthMap[key] = 0;
                }

                profilesList.forEach((p: any) => {
                    if (!p.created_at) return;
                    const d = new Date(p.created_at);
                    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
                    if (key in userGrowthMap) {
                        userGrowthMap[key]++;
                    }
                });

                // Group Task Volume by month (last 6 months)
                const taskVolMap: Record<string, number> = {};
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
                    taskVolMap[key] = 0;
                }

                tasksList.forEach((t: any) => {
                    if (!t.created_at) return;
                    const d = new Date(t.created_at);
                    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
                    if (key in taskVolMap) {
                        taskVolMap[key]++;
                    }
                });

                setStats({
                    totalUsers,
                    weeklyActiveCount,
                    roles,
                    verifiedCount,
                    tiers,
                    totalTasks,
                    totalBudget,
                    taskStatus,
                    totalBookings,
                    bookingStatus,
                    revenueMRR,
                    averageBudget,
                    categoryDistribution,
                    userGrowth: Object.entries(userGrowthMap).map(([label, count]) => ({ label, count })),
                    taskVolumeWeekly: Object.entries(taskVolMap).map(([label, count]) => ({ label, count }))
                });
            } catch (err: any) {
                console.error("Failed to compile stats: ", err);
                setErrorMsg("Failed to compile platform-wide metrics: " + err.message);
            } finally {
                setLoading(false);
            }
            return;
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

  const handleBlockUser = async (userId: string) => {
      const reason = blockReasonInput.trim();
      if (!reason) {
          alert("Please enter an official Reason for Block.");
          return;
      }
      setProcessingId(userId);
      try {
          const { error } = await supabase.from('profiles').update({
              is_blocked: true,
              block_reason: reason
          }).eq('id', userId);
          if (error) throw error;

          setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: true, block_reason: reason } : u));
          setBlockingUserId(null);
          setBlockReasonInput('');
          alert("User blocked successfully and session token revoked!");
      } catch (err: any) {
          alert("Failed to block user: " + err.message);
      } finally {
          setProcessingId(null);
      }
  };

  const handleUnblockUser = async (userId: string) => {
      setProcessingId(userId);
      try {
          const { error } = await supabase.from('profiles').update({
              is_blocked: false,
              block_reason: null
          }).eq('id', userId);
          if (error) throw error;

          setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: false, block_reason: null } : u));
          setUnblockConfirmId(null);
          alert("User unblocked successfully!");
      } catch (err: any) {
          alert("Failed to unblock user: " + err.message);
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

  const downloadUsersPDF = () => {
      if (!users || users.length === 0) {
          alert("No user records to export.");
          return;
      }

      // Initialize jsPDF in Landscape mode, A4 size
      const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2); // 267

      // Professional Palette matching Slate/Corporate style
      const brandPrimary = [15, 23, 42]; // Slate 900
      const textGray = [100, 116, 139]; // Slate 500
      const zebraBg = [248, 250, 252]; // Slate 50
      
      let pageNum = 1;

      // Draw reusable page header and table header
      const drawHeader = (docInstance: any, page: number) => {
          // Top solid header banner
          docInstance.setFillColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
          docInstance.rect(margin, margin, contentWidth, 18, 'F');

          // Left titles
          docInstance.setTextColor(255, 255, 255);
          docInstance.setFont('helvetica', 'bold');
          docInstance.setFontSize(14);
          docInstance.text("VELGO NIGERIA", margin + 6, margin + 11);
          
          docInstance.setFont('helvetica', 'normal');
          docInstance.setFontSize(9);
          docInstance.text("ADMINISTRATIVE USER DIRECTORY & RECORDS AUDIT", margin + 6, margin + 18 - 3);

          // Right metadata
          docInstance.setFontSize(8);
          docInstance.setTextColor(203, 213, 225); // Slate 300
          const dateStr = new Date().toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC';
          docInstance.text(`Generated: ${dateStr}`, margin + contentWidth - 6, margin + 9, { align: 'right' });
          docInstance.text(`Total Records: ${users.length} | Page ${page}`, margin + contentWidth - 6, margin + 14, { align: 'right' });

          // Table column header background
          const tableHeaderY = margin + 24;
          docInstance.setFillColor(241, 245, 249); // slate 100
          docInstance.rect(margin, tableHeaderY, contentWidth, 8, 'F');
          
          docInstance.setDrawColor(226, 232, 240); // border
          docInstance.setLineWidth(0.1);
          docInstance.line(margin, tableHeaderY + 8, margin + contentWidth, tableHeaderY + 8);

          docInstance.setTextColor(71, 85, 105); // text slate 600
          docInstance.setFont('helvetica', 'bold');
          docInstance.setFontSize(8);

          // Headers mapping
          let currentX = margin;
          
          docInstance.text("S/N", currentX + 3, tableHeaderY + 5.5);
          currentX += 12;
          
          docInstance.text("FULL NAME", currentX + 3, tableHeaderY + 5.5);
          currentX += 50;
          
          docInstance.text("EMAIL ADDRESS", currentX + 3, tableHeaderY + 5.5);
          currentX += 60;
          
          docInstance.text("PHONE", currentX + 3, tableHeaderY + 5.5);
          currentX += 38;
          
          docInstance.text("ROLE", currentX + 3, tableHeaderY + 5.5);
          currentX += 22;
          
          docInstance.text("STATE & LGA", currentX + 3, tableHeaderY + 5.5);
          currentX += 55;
          
          docInstance.text("STATUS", currentX + 3, tableHeaderY + 5.5);
      };

      // Draw first page header
      drawHeader(doc, pageNum);

      let y = margin + 38; // Initial row printing height

      users.forEach((u, index) => {
          // Check for vertical page overflow (Landscape A4 is 210mm high)
          if (y > pageHeight - 15) {
              doc.addPage();
              pageNum++;
              drawHeader(doc, pageNum);
              y = margin + 38;
          }

          // Alternating zebra row backgrounds
          if (index % 2 === 1) {
              doc.setFillColor(zebraBg[0], zebraBg[1], zebraBg[2]);
              doc.rect(margin, y - 6, contentWidth, 8, 'F');
          }

          // Row font & size
          doc.setTextColor(51, 65, 85); // Slate 700
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);

          let currentX = margin;

          // 1. Serial Number
          doc.text(String(index + 1), currentX + 3, y - 0.5);
          currentX += 12;

          // 2. Full Name (with safety limit string truncation)
          const name = u.full_name || 'N/A';
          doc.setFont('helvetica', 'bold');
          doc.text(name.length > 25 ? name.substring(0, 23) + '...' : name, currentX + 3, y - 0.5);
          doc.setFont('helvetica', 'normal');
          currentX += 50;

          // 3. Email Address
          const email = u.email || 'N/A';
          doc.text(email.length > 32 ? email.substring(0, 30) + '...' : email, currentX + 3, y - 0.5);
          currentX += 60;

          // 4. Phone Number
          const phone = u.phone_number || 'N/A';
          doc.text(phone, currentX + 3, y - 0.5);
          currentX += 38;

          // 5. Role
          const role = (u.role || 'client').toUpperCase();
          if (role === 'ADMIN') {
              doc.setTextColor(147, 51, 234); // Purple
              doc.setFont('helvetica', 'bold');
          } else if (role === 'WORKER') {
              doc.setTextColor(13, 148, 136); // Teal
          } else {
              doc.setTextColor(59, 130, 246); // Blue
          }
          doc.text(role, currentX + 3, y - 0.5);
          doc.setTextColor(51, 65, 85);
          doc.setFont('helvetica', 'normal');
          currentX += 22;

          // 6. Location (State & LGA)
          const location = `${u.state || 'N/A'}, ${u.lga || 'N/A'}`;
          doc.text(location.length > 28 ? location.substring(0, 26) + '...' : location, currentX + 3, y - 0.5);
          currentX += 55;

          // 7. Verification Status
          const isVerified = !!u.is_verified;
          if (isVerified) {
              doc.setTextColor(16, 185, 129); // Green 500
              doc.setFont('helvetica', 'bold');
              doc.text("VERIFIED", currentX + 3, y - 0.5);
          } else {
              doc.setTextColor(148, 163, 184); // Slate 400
              doc.text("UNVERIFIED", currentX + 3, y - 0.5);
          }

          // Post row horizontal border spacer
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.1);
          doc.line(margin, y + 2, margin + contentWidth, y + 2);

          y += 8; // Advance layout pointer
      });

      // Verify page placement space for stats footer
      if (y > pageHeight - 25) {
          doc.addPage();
          pageNum++;
          drawHeader(doc, pageNum);
          y = margin + 38;
      }

      // Close data table
      doc.setDrawColor(15, 23, 42); // deep slate
      doc.setLineWidth(0.3);
      doc.line(margin, y, margin + contentWidth, y);
      doc.line(margin, y + 0.8, margin + contentWidth, y + 0.8);

      // Auditing summary block
      y += 6;
      doc.setFillColor(248, 250, 252); // slate 50
      doc.rect(margin, y, contentWidth, 18, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 18, 'S');

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("REPORT SUMMARY STATISTICS", margin + 5, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const totalWorkers = users.filter(u => u.role === 'worker').length;
      const totalClients = users.filter(u => u.role === 'client' || u.role === 'user').length;
      const totalVerified = users.filter(u => u.is_verified).length;

      doc.text(`Total Registered Workers: ${totalWorkers}`, margin + 5, y + 10);
      doc.text(`Total Registered Clients/Consumers: ${totalClients}`, margin + 100, y + 10);
      doc.text(`Biometrics/NIN Verified Users: ${totalVerified}`, margin + 200, y + 10);
      doc.text("Velgo Nigeria Registry Database • Security & Integrity Verified.", margin + 5, y + 15);

      // Trigger standard local file download
      doc.save(`velgo_users_report_${new Date().toISOString().split('T')[0]}.pdf`);
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
          {['users', 'verify', 'safety', 'support', 'broadcast', 'branding', 'reviews', 'stats'].map(tab => {
            const badgeCount = counts[tab as keyof typeof counts] || 0;
            return (
              <button 
                key={tab} 
                onClick={() => { setActiveTab(tab as any); setSelectedTicketUser(null); }} 
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all duration-150 ${activeTab === tab ? 'bg-brand text-white font-black' : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-white'}`}
              >
                <span>{tab === 'reviews' ? 'Artisan Replies' : tab === 'stats' ? 'Metrics & Stats' : tab}</span>
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
                    <button 
                        onClick={downloadUsersPDF}
                        className="bg-rose-600 text-white px-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shrink-0"
                        title="Export current user list as printable PDF report"
                    >
                        <i className="fa-solid fa-file-pdf text-base"></i>
                        <span className="hidden sm:inline">Export PDF</span>
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
                            
                            {/* Emergency Blocking System (NDPR compliant) */}
                            {currentUserProfile && user.id !== currentUserProfile.id && (
                                <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-700/60 flex flex-col gap-2">
                                    {user.is_blocked ? (
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30 gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <i className="fa-solid fa-lock text-xs"></i>
                                                    <span>Emergency Blocked</span>
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-bold truncate italic" title={user.block_reason}>
                                                    Reason: {user.block_reason || 'N/A'}
                                                </p>
                                            </div>
                                            {unblockConfirmId === user.id ? (
                                                <div className="flex gap-2 shrink-0 items-center">
                                                    <button 
                                                        onClick={() => handleUnblockUser(user.id)}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all shadow-md shrink-0 focus:outline-none"
                                                    >
                                                        Confirm Unblock
                                                    </button>
                                                    <button 
                                                        onClick={() => setUnblockConfirmId(null)}
                                                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600 text-slate-700 px-2.5 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all shrink-0 focus:outline-none border border-slate-200 dark:border-slate-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => setUnblockConfirmId(user.id)}
                                                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all shadow-md shrink-0 focus:outline-none"
                                                >
                                                    Unblock User
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {blockingUserId === user.id ? (
                                                <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                        <i className="fa-solid fa-solid fa-circle-info text-rose-500"></i>
                                                        <span>Space Reason For Block</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Enter reason for suspension..." 
                                                            value={blockReasonInput} 
                                                            onChange={(e) => setBlockReasonInput(e.target.value)} 
                                                            className="flex-1 text-[11px] font-medium p-2.5 rounded-lg border dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:border-red-500"
                                                        />
                                                        <button 
                                                            onClick={() => handleBlockUser(user.id)}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shrink-0 active:scale-95"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button 
                                                            onClick={() => { setBlockingUserId(null); setBlockReasonInput(''); }}
                                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-[10px] font-black uppercase tracking-wider px-2"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={() => { setBlockingUserId(user.id); setBlockReasonInput(''); }}
                                                        className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all"
                                                    >
                                                        Emergency Block
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
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
                        
                        {/* Display Attached Evidence Screenshot */}
                        {(() => {
                            let imageUrl = report.evidence_url;
                            if (!imageUrl && report.details) {
                                const match = report.details.match(/EVIDENCE LINK:\s*(https?:\/\/\S+)/i);
                                if (match) {
                                    imageUrl = match[1];
                                }
                            }
                            if (imageUrl) {
                                return (
                                    <div className="mb-4">
                                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Attached Evidence</p>
                                        <div className="relative group overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700 max-w-sm bg-gray-50 dark:bg-slate-900 shadow-sm">
                                            <img 
                                                src={imageUrl} 
                                                alt="Attached evidence screenshot" 
                                                className="w-full h-auto max-h-60 object-contain hover:scale-105 transition-all duration-300 cursor-pointer" 
                                                onClick={() => window.open(imageUrl, '_blank')}
                                                referrerPolicy="no-referrer"
                                            />
                                            <a 
                                                href={imageUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="absolute bottom-2 right-2 bg-black/75 hover:bg-black text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                                            >
                                                <i className="fa-solid fa-expand"></i> Open Fullsize
                                            </a>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

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
          ) : 

          activeTab === 'stats' && stats ? (
              <div className="space-y-6 animate-fadeIn pb-12 font-sans max-w-6xl mx-auto">
                  {/* Overview Card Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Metric 1: Total Users */}
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                          <div>
                              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Registers</p>
                              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.totalUsers}</h3>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 mt-2">
                              <span>{stats.verifiedCount} Verified</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          </div>
                      </div>

                      {/* Metric 2: Weekly Active (WAU) */}
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                          <div>
                              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Weekly Active (WAU)</p>
                              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.weeklyActiveCount}</h3>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 mt-2">
                              <span>7-Day Active Index</span>
                              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                          </div>
                      </div>

                      {/* Metric 3: Jobs / Tasks Posted */}
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                          <div>
                              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Task Flow</p>
                              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.totalTasks}</h3>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 mt-2">
                              <span>{stats.totalBookings} Active Bookings</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          </div>
                      </div>

                      {/* Metric 4: Platform Estimated MRR */}
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                          <div>
                              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Monthly Revenue (MRR)</p>
                              <h3 className="text-2xl font-black text-amber-500 mt-1">₦{stats.revenueMRR.toLocaleString()}</h3>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 mt-2">
                              <span>Subscription Model</span>
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          </div>
                      </div>
                  </div>

                  {/* Visual Trendline Charts Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Chart 1: User Growth Monthly */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">User Growth Trend</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Registered profiles over last 6 months</p>
                          </div>
                          <div className="pt-2">
                              <SparkChart data={stats.userGrowth} color="#4f46e5" gradientId="userGrowthGrad" />
                          </div>
                      </div>

                      {/* Chart 2: Task Volume Monthly */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Job Traffic & Posting Volume</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Posted task submissions over last 6 months</p>
                          </div>
                          <div className="pt-2">
                              <SparkChart data={stats.taskVolumeWeekly} color="#10b981" gradientId="taskVolumeGrad" />
                          </div>
                      </div>
                  </div>

                  {/* Subscription split and transaction metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Grid Item 1: Tiers breakdown */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Subscription Split</h4>
                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Revenue generation channels</p>
                          </div>
                          <div className="space-y-3 pt-2">
                              {[
                                  { name: 'Starter Pack (₦900)', count: stats.tiers.basic, color: 'bg-slate-400' },
                                  { name: 'Standard Pack (₦3,999)', count: stats.tiers.lite, color: 'bg-blue-400' },
                                  { name: 'Pro Pack (₦6,999)', count: stats.tiers.standard, color: 'bg-indigo-400' },
                                  { name: 'Power Pack (₦9,999)', count: stats.tiers.pro, color: 'bg-purple-400' }
                              ].map((item, idx) => {
                                  const total = stats.tiers.basic + stats.tiers.lite + stats.tiers.standard + stats.tiers.pro || 1;
                                  const pct = Math.round((item.count / total) * 100);
                                  return (
                                      <div key={idx} className="space-y-1">
                                          <div className="flex justify-between items-center text-xs">
                                              <span className="font-bold text-gray-700 dark:text-gray-300">{item.name}</span>
                                              <span className="font-black text-gray-900 dark:text-white">{item.count} users ({pct}%)</span>
                                          </div>
                                          <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                              <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Grid Item 2: User Types Split */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Roles & Ecosystem Split</h4>
                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Ecosystem balance indices</p>
                          </div>
                          <div className="space-y-3 pt-2">
                              {[
                                  { label: 'Clients', count: stats.roles.client, icon: 'fa-user', color: 'bg-indigo-500' },
                                  { label: 'Artisans / Workers', count: stats.roles.worker, icon: 'fa-user-ninja', color: 'bg-emerald-500' },
                                  { label: 'Admins', count: stats.roles.admin, icon: 'fa-shield', color: 'bg-amber-500' }
                              ].map((r, idx) => {
                                  const total = stats.roles.client + stats.roles.worker + stats.roles.admin || 1;
                                  const pct = Math.round((r.count / total) * 100);
                                  return (
                                      <div key={idx} className="space-y-1">
                                          <div className="flex justify-between items-center text-xs">
                                              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                  <i className={`fa-solid ${r.icon} text-[10px]`}></i> {r.label}
                                              </span>
                                              <span className="font-black text-gray-900 dark:text-white">{r.count} ({pct}%)</span>
                                          </div>
                                          <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                              <div className={`h-full ${r.color} rounded-full`} style={{ width: `${pct}%` }} />
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Grid Item 3: Job Distribution Details */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Job Metrics Overview</h4>
                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Financial metrics per listing</p>
                          </div>
                          <div className="space-y-3 text-xs pt-1.5">
                              <div className="flex justify-between items-center py-2.5 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Mean Client Budget</span>
                                  <span className="font-black text-gray-900 dark:text-white text-sm">₦{stats.averageBudget.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center py-2.5 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Open Listings</span>
                                  <span className="font-black text-indigo-500 font-mono text-sm">{stats.taskStatus.open || 0} tasks</span>
                              </div>
                              <div className="flex justify-between items-center py-2.5">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Completed Bookings</span>
                                  <span className="font-black text-emerald-500 font-mono text-sm">{stats.bookingStatus.completed || 0} jobs</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Categories Leaderboard */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm">
                      <div className="mb-4">
                          <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Task Postings by Industry Category</h4>
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Ecosystem supply/demand indicators</p>
                      </div>
                      
                      {Object.keys(stats.categoryDistribution).length === 0 ? (
                          <div className="text-center py-6 text-xs text-gray-400">No postings recorded yet.</div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.entries(stats.categoryDistribution)
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 10)
                                  .map(([cat, count], idx) => {
                                      const total = stats.totalTasks || 1;
                                      const pct = Math.round((count / total) * 100);
                                      return (
                                          <div key={idx} className="bg-gray-50 dark:bg-slate-900/40 p-3.5 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-slate-800/60 font-sans">
                                              <div className="min-w-0 flex-1 pr-2">
                                                  <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{cat}</h5>
                                                  <div className="flex items-center gap-1 mt-1">
                                                      <div className="w-16 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                                                      </div>
                                                      <span className="text-[9px] text-gray-400 font-bold">{pct}%</span>
                                                  </div>
                                              </div>
                                              <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-black font-mono shrink-0">
                                                  {count} posts
                                              </span>
                                          </div>
                                      );
                                  })}
                          </div>
                      )}
                  </div>
              </div>
          ) : activeTab === 'stats' ? (
              <div className="text-center py-20 text-gray-400 animate-pulse font-sans">
                  <i className="fa-solid fa-cloud-arrow-down text-4xl mb-3 text-indigo-500 animate-bounce"></i>
                  <p className="font-black uppercase tracking-wider text-xs">Fetching & Compiling Analytics...</p>
              </div>
          ) : null
        }
      </div>
    </div>
  );
};
export default AdminDashboard;