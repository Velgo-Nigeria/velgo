import React from 'react';
import { TIERS } from '../../../lib/constants';
import { openWhatsAppHelper } from '../../../lib/whatsapp';
export interface BroadcastTabProps {
  currentUserProfile: any;
  bTitle: any;
  setBTitle: any;
  bMessage: any;
  setBMessage: any;
  setBTarget: any;
  bTarget: any;
  handleSendBroadcast: any;
  sendingBroadcast: any;
  broadcasts: any;
  handleDeleteBroadcast: any;
}

export const BroadcastTab: React.FC<BroadcastTabProps> = ({
  currentUserProfile,
  bTitle,
  setBTitle,
  bMessage,
  setBMessage,
  setBTarget,
  bTarget,
  handleSendBroadcast,
  sendingBroadcast,
  broadcasts,
  handleDeleteBroadcast
}) => {
  return (
    (
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
                         )
  );
};
