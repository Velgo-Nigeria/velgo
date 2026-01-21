
import React, { useState, useEffect, useRef } from 'react';
import { supabase, safeFetch } from '../lib/supabaseClient';
import { Profile, SubscriptionTier, Broadcast } from '../lib/types';
import { TIERS } from '../lib/constants';

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'safety' | 'support' | 'verify' | 'broadcast'>('verify');
  const [safetyReports, setSafetyReports] = useState<any[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Broadcast Form
  const [bTitle, setBTitle] = useState('');
  const [bMessage, setBMessage] = useState('');
  const [bTarget, setBTarget] = useState<'all' | 'worker' | 'client'>('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [selectedTicketUser, setSelectedTicketUser] = useState<any>(null);
  const [adminReply, setAdminReply] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, [activeTab]);

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

        if (activeTab === 'users' || activeTab === 'verify') {
            result = await safeFetch(() => supabase.from('profiles').select('*').order('created_at', { ascending: false }));
        } else if (activeTab === 'safety') {
            result = await safeFetch(() => supabase
                .from('safety_reports')
                .select('*, profiles(full_name, phone_number, id, email, avatar_url)')
                .order('created_at', { ascending: false }));
        } else if (activeTab === 'broadcast') {
            result = await safeFetch(() => supabase.from('broadcasts').select('*').order('created_at', { ascending: false }));
        } else {
            result = await safeFetch(() => supabase
                .from('support_messages')
                .select('*, profiles(full_name, email, avatar_url, id)')
                .order('created_at', { ascending: true }));
        }

        if (result.error) {
            setErrorMsg(`Data Error: ${result.error.message}`);
        }

        if (activeTab === 'users' || activeTab === 'verify') setUsers(result.data || []);
        else if (activeTab === 'safety') setSafetyReports(result.data || []);
        else if (activeTab === 'broadcast') setBroadcasts(result.data || []);
        else setSupportMessages(result.data || []);

    } catch (err: any) {
        setErrorMsg(err.message || "Unknown system error occurred.");
    } finally {
        setLoading(false);
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

          // Push logic: Ideally triggers an Edge Function. 
          // Here we just save it. The backend trigger handles the actual push.
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

  const handleVerify = async (e: React.MouseEvent, id: string, approve: boolean) => {
      e.preventDefault();
      e.stopPropagation(); 
      if (processingId) return;
      if(!window.confirm(approve ? "Approve this user?" : "Reject verification?")) return;
      
      setProcessingId(id);
      try {
          const updates = approve ? { is_verified: true, nin_image_url: null } : { nin_image_url: null };
          const { error } = await supabase.from('profiles').update(updates).eq('id', id); 
          if (error) throw error;
          setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
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
        const { error } = await supabase.from('profiles').update({
            subscription_tier: newTier,
            subscription_end_date: endDate.toISOString(),
            task_count: 0 
        }).eq('id', userId);
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_tier: newTier } : u));
      } catch (error: any) {
          alert("Failed to update tier: " + error?.message);
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

  const pendingVerifications = users.filter(u => u.nin_image_url && !u.is_verified);
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
          {['verify', 'users', 'safety', 'support', 'broadcast'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab as any); setSelectedTicketUser(null); }} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === tab ? 'bg-brand text-white' : 'bg-white/10 text-gray-400'}`}>{tab}</button>
          ))}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {loading ? <div className="text-center py-20 text-gray-400">Loading data...</div> : 
         errorMsg ? <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-center border border-red-100 animate-fadeIn"><p className="text-xs font-bold">{errorMsg}</p></div> :

         activeTab === 'broadcast' ? (
             <div className="space-y-6">
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[3px] text-brand">New Broadcast</h3>
                    <div className="space-y-3">
                        <input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="Title (e.g. Server Maintenance)" className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl text-sm font-bold outline-none dark:text-white" />
                        <textarea value={bMessage} onChange={e => setBMessage(e.target.value)} placeholder="Message text..." rows={3} className="w-full bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl text-sm font-medium outline-none dark:text-white resize-none" />
                        <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
                            {['all', 'worker', 'client'].map(t => (
                                <button key={t} onClick={() => setBTarget(t as any)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${bTarget === t ? 'bg-white dark:bg-slate-600 text-brand shadow-sm' : 'text-gray-400'}`}>{t}</button>
                            ))}
                        </div>
                        <button onClick={handleSendBroadcast} disabled={sendingBroadcast || !bTitle || !bMessage} className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50">
                            {sendingBroadcast ? 'Broadcasting...' : 'Send to All Phones'}
                        </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 ml-2">Recent Broadcasts</h3>
                    {broadcasts.length === 0 ? <p className="text-center text-xs text-gray-400 italic">No history yet.</p> :
                     broadcasts.map(b => (
                        <div key={b.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{b.title}</h4>
                                <span className="text-[9px] font-black text-brand uppercase">{b.target_role}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{b.message}</p>
                            <p className="text-[8px] text-gray-300 dark:text-slate-600 mt-2 font-bold">{new Date(b.created_at).toLocaleString()}</p>
                        </div>
                     ))}
                 </div>
             </div>
         ) : 

         activeTab === 'verify' ? (
             pendingVerifications.length === 0 ? <div className="text-center py-20 text-gray-400 text-sm font-bold">No pending verifications.</div> :
             pendingVerifications.map(u => (
                 <div key={u.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm space-y-4 mb-4">
                     <h3 className="font-bold dark:text-white">{u.full_name}</h3>
                     <img src={u.nin_image_url || ''} className="w-full h-48 object-contain bg-gray-100 dark:bg-slate-900 rounded-xl border dark:border-slate-700" />
                     <div className="flex gap-2">
                         <button onClick={(e) => handleVerify(e, u.id, false)} className="flex-1 bg-red-100 text-red-600 py-4 rounded-xl font-black text-xs uppercase">REJECT</button>
                         <button onClick={(e) => handleVerify(e, u.id, true)} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-black text-xs uppercase">APPROVE</button>
                     </div>
                 </div>
             ))
         ) : 
         
         activeTab === 'users' ? (
            <div className="space-y-4">
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search users..." className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-brand" />
                <div className="space-y-3">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user.full_name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                {user.is_verified && <i className="fa-solid fa-check-circle text-blue-500 text-lg"></i>}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-slate-700">
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${user.role === 'worker' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{user.role}</span>
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
         ) : null
        }
      </div>
    </div>
  );
};
export default AdminDashboard;
