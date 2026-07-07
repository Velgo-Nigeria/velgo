
import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile, SubscriptionTier, Broadcast } from '../lib/types';
import { TIERS } from '../lib/constants';
import { openWhatsAppHelper } from '../lib/whatsapp';

interface SparkChartProps {
    data: { label: string; count: number }[];
    color: string;
    gradientId: string;
    type?: 'line' | 'bar';
}

const SparkChart: React.FC<SparkChartProps> = ({ data, color, gradientId, type = 'line' }) => {
    if (data.length === 0) return <div className="h-40 flex items-center justify-center text-xs text-gray-400">No data</div>;
    const maxVal = Math.max(...data.map(d => d.count), 5);
    const height = 180;
    const width = 500;
    const padding = { top: 20, right: 20, bottom: 25, left: 35 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (type === 'bar') {
        const barGap = 16;
        const totalGaps = data.length - 1;
        const barWidth = totalGaps > 0 ? (chartWidth - (totalGaps * barGap)) / data.length : chartWidth;

        const bars = data.map((d, i) => {
            const barHeight = (d.count / maxVal) * chartHeight;
            const x = padding.left + i * (barWidth + barGap);
            const y = padding.top + chartHeight - barHeight;
            return { x, y, barHeight, label: d.label, count: d.count };
        });

        return (
            <div className="w-full relative group">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible font-sans">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.3} />
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

                    {/* Bars and labels */}
                    {bars.map((bar, idx) => (
                        <g key={idx} className="group/bar cursor-pointer animate-fadeIn">
                            {/* Bar Rect */}
                            <rect 
                                x={bar.x} 
                                y={bar.y} 
                                width={barWidth} 
                                height={Math.max(bar.barHeight, bar.count > 0 ? 3 : 0)} 
                                rx={Math.min(barWidth / 2, 4)} 
                                fill={`url(#${gradientId})`}
                                className="transition-all duration-150 hover:opacity-90" 
                            />
                            
                            {/* Label */}
                            <text 
                                x={bar.x + barWidth / 2} 
                                y={height - 6} 
                                className="fill-gray-400 dark:fill-gray-500 font-bold text-[8px] uppercase tracking-wider"
                                textAnchor="middle"
                            >
                                {bar.label}
                            </text>

                            {/* Tooltip on Hover */}
                            <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <rect 
                                    x={bar.x + barWidth / 2 - 22} 
                                    y={bar.y - 24} 
                                    width={44} 
                                    height={16} 
                                    rx={4} 
                                    className="fill-slate-950/90 dark:fill-white" 
                                />
                                <text 
                                    x={bar.x + barWidth / 2} 
                                    y={bar.y - 13} 
                                    className="fill-white dark:fill-slate-950 font-black text-[8px] text-center"
                                    textAnchor="middle"
                                >
                                    {bar.count}
                                </text>
                            </g>
                        </g>
                    ))}
                </svg>
            </div>
        );
    }

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

const SafetyReportRelationsCard: React.FC<{ report: any }> = ({ report }) => {
  const [reportedUser, setReportedUser] = useState<any>(null);
  const [relatedTask, setRelatedTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRelations = async () => {
      if (!report.reported_user_id && !report.related_task_id) return;
      setLoading(true);
      try {
        if (report.reported_user_id) {
          const { data } = await supabase.from('profiles').select('id, full_name, category, phone_number, email').eq('id', report.reported_user_id).single();
          if (active && data) setReportedUser(data);
        }
        if (report.related_task_id) {
          const { data } = await supabase.from('posted_tasks').select('id, title, budget, client_id').eq('id', report.related_task_id).single();
          if (active && data) setRelatedTask(data);
        }
      } catch (err) {
        console.warn("Failed fetching safety extra details:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchRelations();
    return () => { active = false; };
  }, [report.reported_user_id, report.related_task_id]);

  if (loading) {
    return <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide shrink-0 animate-pulse mt-2 p-3 bg-red-50/20 rounded-xl">Analysing Connections...</div>;
  }

  if (!reportedUser && !relatedTask) return null;

  return (
    <div className="mt-3.5 p-3 bg-red-50/50 dark:bg-slate-900/40 border border-red-100/45 dark:border-red-950/20 rounded-xl space-y-2 mb-4">
      <h4 className="text-[9px] font-black uppercase text-red-600 dark:text-red-400 tracking-wider">Report Connections (Interactive Audit)</h4>
      
      {reportedUser && (
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-red-100/30">
          <div>
            <p className="text-[8px] font-black uppercase text-gray-400">Reported Profile (Accused)</p>
            <p className="text-xs font-bold text-gray-950 dark:text-gray-100">{reportedUser.full_name}</p>
            <p className="text-[9px] text-gray-500 font-medium">{reportedUser.category || 'Client Account'}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
             <a 
               href={`tel:${reportedUser.phone_number}`} 
               className="w-7 h-7 bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center rounded-lg text-xs" 
               title="Call Accused User"
             >
               <i className="fa-solid fa-phone"></i>
             </a>
             <button 
               type="button"
               onClick={() => {
                 const accusedWaMessage = `Hello ${reportedUser.full_name}, this is the Velgo Nigeria Safety Desk. We received an automated incident report regarding your conduct on the platform. Please assist us in verifying the details.`;
                 openWhatsAppHelper(accusedWaMessage, reportedUser.phone_number);
               }}
               className="w-7 h-7 bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center rounded-lg text-xs animate-fadeIn" 
               title="WhatsApp Accused User"
             >
               <i className="fa-brands fa-whatsapp text-sm"></i>
             </button>
          </div>
        </div>
      )}

      {relatedTask && (
        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-red-100/30 flex justify-between items-center">
          <div>
            <p className="text-[8px] font-black uppercase text-gray-400">Linked Job Post</p>
            <p className="text-xs font-bold text-gray-950 dark:text-gray-100">{relatedTask.title}</p>
            <p className="text-[9px] font-black text-brand uppercase">Budget: ₦{(relatedTask.budget || 0).toLocaleString()}</p>
          </div>
          <p className="text-[8px] text-gray-400 font-mono">ID: {relatedTask.id.substring(0,8)}...</p>
        </div>
      )}
    </div>
  );
};

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'verify' | 'safety' | 'support' | 'broadcast' | 'reviews' | 'stats' | 'errors'>('users');
  const [safetyReports, setSafetyReports] = useState<any[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<Profile[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [pendingReplies, setPendingReplies] = useState<any[]>([]);
  const [appErrors, setAppErrors] = useState<any[]>([]);
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

  // Lightbox & Audit UX States
  const [lightboxUser, setLightboxUser] = useState<Profile | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotate, setRotate] = useState<number>(0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  const [selectedTicketUser, setSelectedTicketUser] = useState<any>(null);
  const [blockedBookings, setBlockedBookings] = useState<any[]>([]);
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
                const { data: allProfiles, error: pErr } = await supabase.from('profiles').select('role, is_verified, subscription_tier, created_at, tokens, updated_at, category, subscription_end_date');
                const { data: allTasks, error: tErr } = await supabase.from('posted_tasks').select('status, budget, created_at, category');
                const { data: allBookings, error: bErr } = await supabase.from('bookings').select('status, created_at, task_id');

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
                    // Only count 'basic' tier as bought if they have a non-null subscription_end_date
                    if (tier === 'lite') {
                        tiers.lite++;
                    } else if (tier === 'standard') {
                        tiers.standard++;
                    } else if (tier === 'pro') {
                        tiers.pro++;
                    } else if (tier === 'basic' && p.subscription_end_date) {
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

                // Calculate direct bookings vs applications
                const totalApplications = bookingsList.filter(b => b.task_id != null).length;
                const totalDirectBookings = bookingsList.filter(b => b.task_id == null).length;

                // Group User Growth by Week (last 8 weeks)
                const userGrowthMap: Record<string, number> = {};
                const weekStartTimes: { label: string; start: number; end: number }[] = [];
                const now = new Date();
                
                for (let i = 7; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - (i * 7));
                    d.setHours(0, 0, 0, 0);
                    // Start of week (Sunday)
                    const dayOfWeek = d.getDay();
                    const weekStart = new Date(d);
                    weekStart.setDate(d.getDate() - dayOfWeek);
                    weekStart.setHours(0, 0, 0, 0);
                    
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 7);
                    
                    const label = `${weekStart.getDate()} ${weekStart.toLocaleString('default', { month: 'short' })}`;
                    userGrowthMap[label] = 0;
                    weekStartTimes.push({ label, start: weekStart.getTime(), end: weekEnd.getTime() });
                }

                profilesList.forEach((p: any) => {
                    if (!p.created_at) return;
                    const t = new Date(p.created_at).getTime();
                    const matched = weekStartTimes.find(w => t >= w.start && t < w.end);
                    if (matched) {
                        userGrowthMap[matched.label]++;
                    }
                });

                // Group Job Traffic (Posts & Direct Bookings) by Day (last 7 days window)
                const dailyPostMap: Record<string, number> = {};
                const dayStartTimes: { label: string; start: number; end: number }[] = [];
                
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    d.setHours(0, 0, 0, 0);
                    
                    const dayEnd = new Date(d);
                    dayEnd.setDate(d.getDate() + 1);
                    
                    const label = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                    dailyPostMap[label] = 0;
                    dayStartTimes.push({ label, start: d.getTime(), end: dayEnd.getTime() });
                }

                tasksList.forEach((t: any) => {
                    if (!t.created_at) return;
                    const time = new Date(t.created_at).getTime();
                    const matched = dayStartTimes.find(d => time >= d.start && time < d.end);
                    if (matched) {
                        dailyPostMap[matched.label]++;
                    }
                });

                bookingsList.forEach((b: any) => {
                    if (b.task_id != null) return; // Count only direct bookings (marketplace tasks are already counted)
                    if (!b.created_at) return;
                    const time = new Date(b.created_at).getTime();
                    const matched = dayStartTimes.find(d => time >= d.start && time < d.end);
                    if (matched) {
                        dailyPostMap[matched.label]++;
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
                    totalApplications,
                    totalDirectBookings,
                    userGrowth: Object.entries(userGrowthMap).map(([label, count]) => ({ label, count })),
                    taskVolumeWeekly: Object.entries(dailyPostMap).map(([label, count]) => ({ label, count }))
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
                .select('*, profiles:reporter_id(full_name, phone_number, id, email, avatar_url)')
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
        } else if (activeTab === 'support') {
            result = await safeFetch(() => supabase
                .from('support_messages')
                .select('*, profiles(full_name, email, avatar_url, id)')
                .order('created_at', { ascending: true }));
        } else if (activeTab === 'errors') {
            result = await safeFetch(() => supabase
                .from('app_errors')
                .select('*')
                .order('timestamp', { ascending: false }));
        } else {
            result = { data: [], error: null };
        }

        if (result.error) {
            if (result.error.message?.includes('admin_reply') || result.error.message?.includes('support_messages')) {
                setErrorMsg("Database Schema Realignment Required: Please run the SQL migration script located in `/supabase/fix_support_messages_schema.sql` inside your Supabase SQL Editor to provision the Support Desk columns and resolve the connection crash.");
            } else if (result.error.message?.includes('app_errors')) {
                setErrorMsg("Database Schema Required: The 'app_errors' table does not exist. Please run the SQL migration script to create it.");
            } else {
                setErrorMsg(`Data Error: ${result.error.message}`);
            }
        }

        if (activeTab === 'users') setUsers(result.data || []);
        else if (activeTab === 'verify') setPendingVerifications(result.data || []);
        else if (activeTab === 'safety') setSafetyReports(result.data || []);
        else if (activeTab === 'broadcast') setBroadcasts(result.data || []);
        else if (activeTab === 'reviews') setPendingReplies(result.data || []);
        else if (activeTab === 'support') setSupportMessages(result.data || []);
        else if (activeTab === 'errors') setAppErrors(result.data || []);

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
        let supportPendingCount = 0;
        try {
            const { data: supportMsgs, error: supportErr } = await supabase
                .from('support_messages')
                .select('id, admin_reply, user_id, created_at, profiles:user_id(id)');
            
            if (supportErr) {
                console.warn("Support messages table query error (likely pending schema update):", supportErr.message);
            } else if (supportMsgs) {
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
        } catch (supportCatchErr) {
            console.error("Critical error in support ticket count check:", supportCatchErr);
        }

        // 4. Artisan Replies count (where worker_reply is set but not yet approved)
        const { count: rCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .not('worker_reply', 'is', null)
            .neq('worker_reply', '')
            .or('worker_reply_approved.is.null,worker_reply_approved.eq.false');

        // 5. Fetch blocked/impeded pending matches where client has 0 tokens remaining
        try {
            const { data: bData } = await supabase
                .from('bookings')
                .select(`
                    id,
                    created_at,
                    client:client_id(id, full_name, email, tokens),
                    worker:worker_id(id, full_name, email),
                    posted_tasks:task_id(id, title)
                `)
                .eq('status', 'pending');

            const impeded = (bData || []).filter((b: any) => (b.client?.tokens ?? 0) < 1);
            setBlockedBookings(impeded);
        } catch (bErr) {
            console.error("Failed auditing blocked matches:", bErr);
        }

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

  const handleDownloadPdf = () => {
    if (!stats) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(15, 23, 42); // slate-900 background for a sleek header card
    doc.rect(10, 10, 190, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("VELGO NIGERIA compliance desk", 15, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`PLATFORM AUDIT & METRICS REPORT • GENERATED ON: ${new Date().toLocaleString()}`, 15, 28);
    
    // Section 1: Core User Stats
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("1. USER BASE & REGISTRATION METRICS", 12, 45);
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(10, 48, 200, 48);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    
    doc.text(`Total Registered Users: ${stats.totalUsers}`, 15, 55);
    doc.text(`Verified Users (NIN Badging): ${stats.verifiedCount} (${Math.round((stats.verifiedCount / (stats.totalUsers || 1)) * 100)}%)`, 15, 61);
    doc.text(`Weekly Active Users (7-day activity window): ${stats.weeklyActiveCount}`, 15, 67);
    
    // User Role Distribution table
    doc.text("User Roles Breakdown:", 120, 55);
    doc.text(`- Clients (Hiring accounts): ${stats.roles.client}`, 125, 61);
    doc.text(`- Artisans / Workers (Providing services): ${stats.roles.worker}`, 125, 67);
    doc.text(`- Platform Administrators: ${stats.roles.admin}`, 125, 73);
    
    // Section 2: Finances and Token Sales
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("2. PREMIUM TOKEN CONVERSION & REVENUE ANALYSIS", 12, 85);
    doc.line(10, 88, 200, 88);
    
    // Total Revenue
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Cumulative Revenue: NGN ${stats.revenueMRR.toLocaleString()}`, 15, 96);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text("(Based solely on standard token packages purchased by platform members)", 15, 102);
    
    // Package breakdown table
    doc.text(`- Starter Pack (NGN 900 • 1 Token): ${stats.tiers.basic || 0} packs sold (NGN ${((stats.tiers.basic || 0) * 900).toLocaleString()})`, 15, 110);
    doc.text(`- Standard Pack (NGN 3,999 • 5 Tokens): ${stats.tiers.lite || 0} packs sold (NGN ${((stats.tiers.lite || 0) * 3999).toLocaleString()})`, 15, 116);
    doc.text(`- Pro Pack (NGN 6,999 • 10 Tokens): ${stats.tiers.standard || 0} packs sold (NGN ${((stats.tiers.standard || 0) * 6999).toLocaleString()})`, 15, 122);
    doc.text(`- Power Pack (NGN 9,999 • 15 Tokens): ${stats.tiers.pro || 0} packs sold (NGN ${((stats.tiers.pro || 0) * 9999).toLocaleString()})`, 15, 128);
    
    // Section 3: Job Flow & Posting Volume
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("3. MARKETPLACE FLOWS & JOB METRICS", 12, 140);
    doc.line(10, 143, 200, 143);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    
    doc.text(`Unified Task Flow (Total Volume): ${stats.totalTasks + (stats.totalDirectBookings || 0)}`, 15, 150);
    doc.text(`- Marketplace Job Postings: ${stats.totalTasks}`, 15, 156);
    doc.text(`- Direct Artisan Bookings/Hires: ${stats.totalDirectBookings || 0}`, 15, 162);
    doc.text(`- Applications / Bidding Volume: ${stats.totalApplications || 0}`, 15, 168);
    doc.text(`- Active/Completed Matches: ${stats.totalBookings}`, 15, 174);
    
    // Right col: financial metrics
    doc.text("Job Metrics Overview:", 120, 150);
    doc.text(`- Mean Client Budget: NGN ${stats.averageBudget.toLocaleString()}`, 125, 156);
    doc.text(`- Current Open Listings: ${stats.taskStatus.open || 0} tasks`, 125, 162);
    doc.text(`- Successful Matches (Completed): ${stats.bookingStatus.completed || 0} jobs`, 125, 168);
    
    // Section 4: Industry Categories
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("4. TOP DEMAND CATEGORIES & SECTORS", 12, 185);
    doc.line(10, 188, 200, 188);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    
    const sortedCats = Object.entries(stats.categoryDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
      
    let yOffset = 195;
    sortedCats.forEach(([cat, count], idx) => {
      const share = Math.round((count / (stats.totalTasks || 1)) * 100);
      if (yOffset <= 270) {
        doc.text(`${idx + 1}. ${cat}: ${count} posts (${share}% of platform traffic)`, 15, yOffset);
        yOffset += 6;
      }
    });
    
    // Footer notice
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 278, 200, 278);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Confidential Internal Document. Designed for Velgo compliance desks & administrators in Nigeria.", 15, 283);
    doc.text("Velgo Nigeria Corp © 2026", 170, 283);
    
    doc.save(`Velgo-Nigeria-System-Audit-${new Date().toISOString().split('T')[0]}.pdf`);
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
      
      // Find reporter profile id to trigger automated notification
      const report = safetyReports.find((r: any) => r.id === reportId);
      const recipientId = report?.reporter_id || report?.profiles?.id;

      const { error } = await supabase.from('safety_reports').update({ status }).eq('id', reportId);
      if (error) {
          alert("Failed: " + error.message);
      } else {
          // If resolving, send an instant database-backed push/in-app notification to the reporter
          if (action === 'resolve' && recipientId) {
              try {
                  await supabase.from('notifications').insert({
                      user_id: recipientId,
                      title: '🛡️ Safety Case Resolved',
                      message: `Your security report regarding "${report?.type || 'incident'}" has been inspected and resolved by Velgo Compliance. Thank you for keeping our community safe.`,
                      type: 'success'
                  });
              } catch (notifErr: any) {
                  console.error("Warning: Notification sync failed", notifErr.message);
              }
          }
          fetchData();
      }
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
          // Send automatic in-app notification to the customer's PWA notification tray
          try {
              await supabase.from('notifications').insert({
                  user_id: selectedTicketUser.id,
                  title: '💬 New Help Desk Reply',
                  message: `A Velgo support operator has replied: "${adminReply.length > 50 ? adminReply.substring(0, 50) + '...' : adminReply}"`,
                  type: 'info'
              });
          } catch (notifErr: any) {
              console.error("Warning: Notification sync failed", notifErr.message);
          }

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

  const filteredUsers = users.filter(u => 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          {['users', 'verify', 'safety', 'support', 'broadcast', 'reviews', 'stats', 'errors'].map(tab => {
            const badgeCount = counts[tab as keyof typeof counts] || 0;
            return (
              <button 
                key={tab} 
                onClick={() => { setActiveTab(tab as any); setSelectedTicketUser(null); }} 
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all duration-150 ${activeTab === tab ? 'bg-brand text-white font-black' : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-white'}`}
              >
                <span>{tab === 'reviews' ? 'Artisan Replies' : tab === 'stats' ? 'Metrics & Stats' : tab === 'errors' ? 'Error Logs' : tab}</span>
                {badgeCount > 0 && (
                  <span className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded-full tracking-tight shrink-0 ${
                    activeTab === tab ? 'bg-white text-gray-950 font-black' : 'bg-red-50 text-white animate-pulse'
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
         {/* Active Token Expiry Matches Impediment Overlay */}
         {!loading && blockedBookings.length > 0 && (
             <div className="mb-6 bg-amber-500/10 dark:bg-amber-950/20 rounded-[24px] border border-amber-500/20 p-5 space-y-3 font-sans">
                 <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2.5">
                         <div className="w-9 h-9 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center shrink-0">
                             <i className="fa-solid fa-triangle-exclamation animate-pulse"></i>
                         </div>
                         <div>
                             <h4 className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                                 ⚠️ Token-Impeded Booking Matches ({blockedBookings.length})
                             </h4>
                             <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                                 These matches are currently stuck on hold because the client has depleted their remaining tokens.
                             </p>
                         </div>
                     </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                     {blockedBookings.slice(0, 6).map((b: any) => (
                         <div key={b.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-xl p-3 flex flex-col justify-between text-xs space-y-2 shadow-sm">
                             <div>
                                 <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider text-gray-400">
                                     <span>Task: {b.posted_tasks?.title || 'Direct Hire'}</span>
                                     <span>{new Date(b.created_at).toLocaleDateString()}</span>
                                 </div>
                                 <p className="font-extrabold text-[11px] text-gray-800 dark:text-gray-200 mt-1">
                                     Client: <span className="text-amber-500 font-black">{b.client?.full_name || b.client?.email || 'N/A'}</span> (0 Tokens)
                                 </p>
                                 <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                                     Ready Worker: <span className="text-slate-900 dark:text-white font-extrabold">{b.worker?.full_name || b.worker?.email || 'N/A'}</span>
                                 </p>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {loading ? <div className="text-center py-20 text-gray-400">Loading data...</div> : 
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
                             <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-4">
                                     <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}`} className="w-12 h-12 rounded-full object-cover" />
                                     <div>
                                         <h4 className="font-bold text-gray-900 dark:text-white">{user.full_name}</h4>
                                         <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-0.5">{user.role}</p>
                                     </div>
                                 </div>
                                 <span className="bg-amber-50 dark:bg-amber-950/20 text-[9px] font-black uppercase text-amber-600 px-3 py-1.5 rounded-full border border-amber-100/40 tracking-wider flex items-center gap-1 animate-pulse">
                                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> PENDING REVIEW
                                 </span>
                             </div>

                             <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-slate-900/60 p-3.5 rounded-2xl text-[11px] font-medium border border-gray-100/60 dark:border-slate-800">
                                 <div>
                                     <span className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 block mb-0.5">RESIDENCE LOCATION</span>
                                     <p className="text-gray-900 dark:text-gray-100 font-bold uppercase truncate">{user.lga || 'N/A'}, {user.state || 'N/A'}</p>
                                 </div>
                                 <div>
                                     <span className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 block mb-0.5">TELECOM CONTACT</span>
                                     <p className="text-gray-950 dark:text-gray-100 font-mono font-bold truncate">{user.phone_number || 'N/A'}</p>
                                 </div>
                             </div>
                             
                             <div className="bg-gray-100 dark:bg-black rounded-2xl overflow-hidden aspect-video relative group border border-gray-200 dark:border-slate-800">
                                 <img src={user.nin_image_url} className="w-full h-full object-contain" alt="User ID" />
                                 <button 
                                     onClick={() => {
                                         setLightboxUser(user);
                                         setZoom(1);
                                         setRotate(0);
                                         setPanX(0);
                                         setPanY(0);
                                     }}
                                     className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white font-bold text-xs uppercase tracking-widest transition-opacity gap-2"
                                 >
                                     <i className="fa-solid fa-expand text-2xl text-emerald-400 animate-pulse"></i>
                                     <span>Click to Audit ID Workspace</span>
                                     <p className="text-[9px] text-slate-400 font-black uppercase mt-1 tracking-widest">Supports scale, spin & match comparison</p>
                                 </button>
                             </div>

                             <div className="flex gap-2">
                                 <button 
                                     onClick={() => {
                                         setLightboxUser(user);
                                         setZoom(1);
                                         setRotate(0);
                                         setPanX(0);
                                         setPanY(0);
                                     }}
                                     className="flex-1 bg-brand text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-brand/90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                 >
                                     <i className="fa-solid fa-microscope text-xs"></i> Open Inspection Suite
                                 </button>
                                 
                                 {user.phone_number && (
                                    <button 
                                        onClick={() => {
                                            const testMsg = `Hello ${user.full_name}, this is the Velgo support desk regarding your document verification upload request. Can you chat right now?`;
                                            openWhatsAppHelper(testMsg, user.phone_number);
                                        }}
                                        className="w-12 h-12 bg-green-500 hover:bg-green-600 text-slate-950 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
                                        title="Direct verification support chat via WhatsApp"
                                    >
                                        <i className="fa-brands fa-whatsapp text-2xl"></i>
                                    </button>
                                 )}
                             </div>
                         </div>
                     ))
                 )}
             </div>
         ) : 
         
         activeTab === 'users' ? (
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, ID, email, or phone number..." className="flex-1 p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-brand" />
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

                            {/* Referral Analytics Diagnostic block */}
                            <div className="bg-gray-50 dark:bg-slate-900/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300 space-y-1.5 font-sans mt-1">
                                <p className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Referral Analytics & Control</p>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div>
                                        <span className="text-gray-400 dark:text-gray-500 font-bold uppercase block text-[8px] leading-tight">Referred By Parent</span>
                                        <span className="font-mono text-[9px] truncate block mt-0.5 select-all" title={user.referrer_id || 'Direct Signup'}>
                                            {user.referrer_id ? user.referrer_id.substring(0, 18) + '...' : 'Direct Signup'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-gray-400 dark:text-gray-500 font-bold uppercase block text-[8px] leading-tight">Actions</span>
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigator.clipboard.writeText(`${window.location.origin}?ref=${user.id}`);
                                                alert("Referral link copied for this user: " + user.full_name);
                                            }}
                                            className="text-brand text-[9px] font-black uppercase tracking-wider hover:underline mt-1 bg-brand/5 dark:bg-brand/10 px-2 py-0.5 rounded border border-brand/10 inline-block"
                                        >
                                            <i className="fa-solid fa-copy mr-1"></i> Promo Link
                                        </button>
                                    </div>
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

                        {/* Interactive Accused Profile/Task audit segment */}
                        <SafetyReportRelationsCard report={report} />

                        <div className="flex gap-2">
                            <button onClick={() => { setActiveTab('support'); setSelectedTicketUser(report.profiles); }} className="flex-1 bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-3 rounded-xl font-black text-[10px] uppercase">Message</button>
                            
                            {report.profiles?.phone_number && (
                                <button 
                                    onClick={() => {
                                        const waMessage = `Hello ${report.profiles?.full_name}, this is the Velgo Nigeria Safety Desk regarding the ${report.type || 'security'} report you submitted. We are actively investigating this transaction and want to ask a few clarifying questions. Please let us know if you are available to chat right now.`;
                                        openWhatsAppHelper(waMessage, report.profiles.phone_number);
                                    }}
                                    className="px-4 bg-green-500 hover:bg-green-600 text-slate-950 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0 animate-fade-in"
                                    title="Contact reporter directly via WhatsApp"
                                >
                                    <i className="fa-brands fa-whatsapp text-lg"></i>
                                </button>
                            )}

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
              <>
              {/* Executive Header Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm">
                  <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                          <i className="fa-solid fa-chart-line text-indigo-500"></i> Velgo Compliance Analytics
                      </h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Metrics and compliance telemetry overview</p>
                  </div>
                  <button 
                      onClick={handleDownloadPdf}
                      className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white py-2.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                      title="Generate official audit PDF"
                  >
                      <i className="fa-solid fa-file-pdf text-sm"></i> Download PDF Report
                  </button>
              </div>
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
                              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.totalTasks + (stats.totalDirectBookings || 0)}</h3>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 mt-2">
                              <span>{stats.totalDirectBookings || 0} Direct / {stats.totalTasks} Market</span>
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
                              <span>Packs Sold Count</span>
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
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Registered profiles over last 8 weeks (weekly intervals)</p>
                          </div>
                          <div className="pt-2">
                              <SparkChart data={stats.userGrowth} color="#4f46e5" gradientId="userGrowthGrad" type="bar" />
                          </div>
                      </div>

                      {/* Chart 2: Task Volume Monthly */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Job Traffic & Posting Volume</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Posted task submissions & direct bookings over last 7 days</p>
                          </div>
                          <div className="pt-2">
                              <SparkChart data={stats.taskVolumeWeekly} color="#10b981" gradientId="taskVolumeGrad" type="bar" />
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
                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Ecosystem Activity breakdown</p>
                          </div>
                          <div className="space-y-3 text-xs pt-1.5">
                              <div className="flex justify-between items-center py-2.5 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Mean Client Budget</span>
                                  <span className="font-black text-gray-900 dark:text-white text-sm">₦{stats.averageBudget.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center py-2.5 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Marketplace Listings</span>
                                  <span className="font-bold text-gray-950 dark:text-gray-100">{stats.totalTasks} postings</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Direct Bookings (No Post)</span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{stats.totalDirectBookings || 0} hires</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Artisan Applications</span>
                                  <span className="font-bold text-blue-500">{stats.totalApplications || 0} bids</span>
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
              </>
          ) : activeTab === 'stats' ? (
              <div className="text-center py-20 text-gray-400 animate-pulse font-sans">
                  <i className="fa-solid fa-cloud-arrow-down text-4xl mb-3 text-indigo-500 animate-bounce"></i>
                  <p className="font-black uppercase tracking-wider text-xs">Fetching & Compiling Analytics...</p>
              </div>
          ) : activeTab === 'errors' ? (
              <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30">
                      <div>
                          <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">System Error Logs</h3>
                          <p className="text-[10px] text-slate-500 mt-1">Real-time captured crashes and unhandled exceptions.</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-black text-xs px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/50">
                          {appErrors.length} Logs Found
                      </div>
                  </div>

                  {appErrors.length === 0 ? (
                      <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                          <i className="fa-solid fa-check-circle text-4xl text-emerald-500 mb-4 opacity-50"></i>
                          <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">No Errors Recorded</p>
                          <p className="text-[10px] text-gray-500 mt-2">The system is running smoothly.</p>
                      </div>
                  ) : (
                      <div className="grid gap-3">
                          {appErrors.map((err) => (
                              <div key={err.id} className="bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 p-4 rounded-xl shadow-sm relative overflow-hidden group">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                  <div className="flex justify-between items-start mb-2 pl-2">
                                      <div className="pr-4">
                                          <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest border border-red-200 dark:border-red-800">
                                              Exception
                                          </span>
                                          <h4 className="font-bold text-slate-900 dark:text-white mt-2 font-mono text-sm break-all">
                                              {err.error_message}
                                          </h4>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap shrink-0">
                                          {new Date(err.timestamp).toLocaleString()}
                                      </span>
                                  </div>
                                  
                                  <div className="pl-2 mt-3 space-y-2">
                                      {err.source && (
                                          <div className="flex items-start gap-2 text-xs">
                                              <i className="fa-solid fa-link text-slate-400 mt-0.5"></i>
                                              <span className="text-slate-600 dark:text-slate-300 break-all">{err.source} {err.line_number ? `(Line ${err.line_number})` : ''}</span>
                                          </div>
                                      )}
                                      
                                      {err.user_agent && (
                                          <div className="flex items-start gap-2 text-[10px] text-slate-500">
                                              <i className="fa-solid fa-desktop mt-0.5"></i>
                                              <span className="break-words">{err.user_agent}</span>
                                          </div>
                                      )}

                                      {err.error_stack && (
                                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                              <details className="text-xs group-details">
                                                  <summary className="font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer select-none outline-none">
                                                      View Stack Trace
                                                  </summary>
                                                  <pre className="mt-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto text-[9px] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                                                      {err.error_stack}
                                                  </pre>
                                              </details>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          ) : null
        }
      </div>

      {/* Modern High-Contrast Lightbox Modal Visual Workspace with Rotate, Zoom, Pan & State Comparison */}
      {lightboxUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col md:flex-row items-stretch select-none overflow-hidden animate-fadeIn">
          
          {/* Left Panel: Clinical ID Visual Workspace */}
          <div className="flex-1 bg-slate-900 border-r border-slate-800 flex flex-col p-6 min-h-0 relative">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[3px] block">Security Verification Suite</span>
                <h3 className="text-white font-bold text-sm">INTERACTIVE GOVERNMENT ID AUDIT</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md cursor-default">
                  ID: {lightboxUser.id.substring(0, 8)}...
                </span>
                <button 
                  onClick={() => setLightboxUser(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-550 text-white flex items-center justify-center transition-colors shadow"
                  title="Close Visual Workspace"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800/80 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <img 
                  src={lightboxUser.nin_image_url || ''} 
                  alt="NIN Government issued ID document scan" 
                  draggable={false}
                  className="max-w-[90%] max-h-[85%] object-contain select-none shadow-2xl transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotate}deg) translate(${panX}px, ${panY}px)`
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>

              {(panX !== 0 || panY !== 0 || zoom !== 1 || rotate !== 0) && (
                <div className="absolute top-4 left-4 bg-slate-900/85 px-3 py-1.5 rounded-lg border border-slate-800 text-[9px] font-semibold text-slate-400 tracking-wider">
                  SCALE: {zoom.toFixed(2)}x | ACC: {rotate}° { (panX !== 0 || panY !== 0) && `| PAN: ${panX}px, ${panY}px` }
                </div>
              )}

              <div className="absolute bottom-4 right-4 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800/80 grid grid-cols-3 gap-1 shadow-2xl">
                <div />
                <button onClick={() => setPanY(prev => prev - 20)} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white text-[9px] flex items-center justify-center border border-slate-700 active:scale-95"><i className="fa-solid fa-chevron-up"></i></button>
                <div />
                <button onClick={() => setPanX(prev => prev - 20)} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white text-[9px] flex items-center justify-center border border-slate-700 active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
                <button onClick={() => { setPanX(0); setPanY(0); setZoom(1); setRotate(0); }} className="w-6 h-6 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[9px] flex items-center justify-center active:scale-95"><i className="fa-solid fa-arrows-to-dot"></i></button>
                <button onClick={() => setPanX(prev => prev + 20)} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white text-[9px] flex items-center justify-center border border-slate-700 active:scale-95"><i className="fa-solid fa-chevron-right"></i></button>
                <div />
                <button onClick={() => setPanY(prev => prev + 20)} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white text-[9px] flex items-center justify-center border border-slate-700 active:scale-95"><i className="fa-solid fa-chevron-down"></i></button>
                <div />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow">
              <button 
                onClick={() => setZoom(prev => Math.min(prev + 0.25, 4))}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-black uppercase text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-magnifying-glass-plus text-emerald-500"></i> Zoom In
              </button>
              <button 
                onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-black uppercase text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-magnifying-glass-minus text-amber-500"></i> Zoom Out
              </button>
              <button 
                onClick={() => setRotate(prev => prev - 90)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-black uppercase text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-rotate-left text-indigo-400"></i> Spin Left
              </button>
              <button 
                onClick={() => setRotate(prev => prev + 90)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-black uppercase text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-rotate-right text-indigo-400"></i> Spin Right
              </button>
              <button 
                onClick={() => { setZoom(1); setRotate(0); setPanX(0); setPanY(0); }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-black uppercase text-slate-400 hover:text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-arrows-to-dot text-amber-500"></i> Reset
              </button>
            </div>
          </div>

          {/* Right Panel: Decision & Profile Audit comparison deck */}
          <div className="w-full md:w-[420px] bg-slate-950 p-6 overflow-y-auto flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[3px] block">Database Comparison Index</span>
                <h3 className="text-white font-black text-sm">PROFILE STATE MATCHING MATRIX</h3>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Registered Name (Velgo Profile)</span>
                      <p className="text-white text-xs font-black mt-1 uppercase tracking-tight">{lightboxUser.full_name}</p>
                    </div>
                    <div className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-xs" title="Matches Database Name">
                      <i className="fa-solid fa-check"></i>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Verify this text matches the exact spelling, ordering, and picture identity on the ID document.
                  </p>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Contact Phone Number</span>
                      <p className="text-white text-xs font-mono font-bold mt-1">{lightboxUser.phone_number || 'N/A'}</p>
                    </div>
                    {lightboxUser.phone_number && (
                      <button 
                        onClick={() => {
                          const tempText = `Hello ${lightboxUser.full_name},\n\nWe are currently checking your loaded government ID card on the Velgo Verification platform. Can you confirm if you have your physical card or paper slip? Thank you.`;
                          openWhatsAppHelper(tempText, lightboxUser.phone_number);
                        }}
                        className="w-8 h-8 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-slate-950 rounded-full flex items-center justify-center text-xs transition-colors shrink-0" 
                        title="WhatsApp Direct Contact"
                      >
                        <i className="fa-brands fa-whatsapp text-lg"></i>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    DND bypass routing. Click the WhatsApp badge to query this user directly with zero telco delay.
                  </p>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-805">
                  <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Registered Residence State & LGA</span>
                  <p className="text-white text-xs font-black mt-1 uppercase tracking-tight">
                    {lightboxUser.state || 'N/A'} STATE • {lightboxUser.lga || 'N/A'} LGA
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Typically checked on standard Nigerian NIMC NIN slips or Permanent Voter Cards.
                  </p>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Velgo Category Scope & Tier</span>
                  <p className="text-white text-xs font-black mt-1 uppercase tracking-tight">
                    ROLE: {lightboxUser.role.toUpperCase()} | TIER: {(lightboxUser.subscription_tier || 'basic').toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div>
                  <span className="text-[10px] font-black uppercase text-rose-400 tracking-[3px] block">Moderate Document Status</span>
                  <h4 className="text-white font-bold text-xs mt-0.5">Biometrics Decision Deck</h4>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Nigerian Reject Presets
                  </label>
                  <select 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setRejectionReasons(prev => ({ ...prev, [lightboxUser.id]: val }));
                    }}
                    className="w-full text-xs p-3 rounded-xl bg-slate-900 text-white border border-slate-800 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value="">-- Choose rejection preset template --</option>
                    <option value="Photo of NIN slip is too blurry or captured in dark environment. Please upload a clear photo taken in daylight.">NIN photo too blurry/dark</option>
                    <option value="Name on the ID document does not match the Velgo registered profile name. Ensure you upload your own personal ID.">Name mismatch with profile</option>
                    <option value="Invalid document class. We require formal government IDs (NIN standard slip, Voter's Card, Driver's License, or Passport).">Invalid ID document class</option>
                    <option value="Only frontpage was uploaded but details are cutoff. Please upload a full-face scan of your NIN ID.">Cut-off scan boundaries</option>
                    <option value="The document looks like a photocopy but we require the original color plastic card or paper slip.">Photocopy instead of color slip</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Custom Decision Reason (req. if rejecting)
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Specify manual rejection parameters if presets do not apply..."
                    value={rejectionReasons[lightboxUser.id] || ''}
                    onChange={(e) => setRejectionReasons(prev => ({ ...prev, [lightboxUser.id]: e.target.value }))}
                    className="w-full text-xs p-3 rounded-xl bg-slate-900 text-white border border-slate-800 outline-none focus:border-indigo-500 resize-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={async () => {
                      const reason = rejectionReasons[lightboxUser.id]?.trim();
                      if (!reason) {
                        alert("Please choose a Preset rejection template or write a Custom Reason.");
                        return;
                      }
                      const confirmMsg = `Reject and clear ${lightboxUser.full_name}'s ID? Send corrective guidelines?`;
                      if (!window.confirm(confirmMsg)) return;

                      await handleVerificationDecision(lightboxUser.id, 'reject');
                      
                      const waNotify = `Hello ${lightboxUser.full_name},\n\nThis is the Velgo ID verification desk. Unfortunately, we could not approve your verification request at this time. Reason:\n\n👉 *${reason}*\n\nPlease log in to the Velgo app to re-upload clear credentials so we can verify you fast! Thank you.`;
                      const originalUser = lightboxUser;
                      setLightboxUser(null);
                      
                      setTimeout(() => {
                        if (window.confirm("Would you like to dispatch this ID Rejection notice instantly via WhatsApp?")) {
                          openWhatsAppHelper(waNotify, originalUser.phone_number);
                        }
                      }, 300);
                    }}
                    disabled={processingId === lightboxUser.id}
                    className="py-3.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 text-rose-500 font-extrabold text-[11px] uppercase border border-rose-900/60 transition-colors shadow flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-ban"></i> Reject ID
                  </button>

                  <button 
                    onClick={async () => {
                      await handleVerificationDecision(lightboxUser.id, 'approve');
                      const waNotify = `Hello ${lightboxUser.full_name}! 👋\n\nFantastic news! Your Velgo NIN / Identification Verification request has been *Successfully Approved*! 🎉\n\nYou now have the verified badge on your profile. Log in to check out your updated status.\n\nBest regards,\nVelgo Team`;
                      const originalUser = lightboxUser;
                      setLightboxUser(null);
                      
                      setTimeout(() => {
                        if (window.confirm("Approve complete! Would you like to dispatch the WhatsApp congratulations message too?")) {
                          openWhatsAppHelper(waNotify, originalUser.phone_number);
                        }
                      }, 300);
                    }}
                    disabled={processingId === lightboxUser.id}
                    className="py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] uppercase transition-all shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-circle-check"></i> Approve ID
                  </button>
                </div>
                
                {lightboxUser.phone_number && (
                  <button 
                    onClick={() => {
                      const tempMsg = `Hello ${lightboxUser.full_name},\n\nThis is the Velgo verification desk. I am looking at your uploaded ID document right now, and had a quick question regarding the details:\n\n`;
                      openWhatsAppHelper(tempMsg, lightboxUser.phone_number);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 mt-2 transition-all"
                  >
                    <i className="fa-brands fa-whatsapp text-green-400 text-sm"></i> Launch Direct Verification Chat
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;