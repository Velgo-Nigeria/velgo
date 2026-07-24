import React from 'react';
import { openWhatsAppHelper } from '../../lib/whatsapp';
import { SavedBookmarksWidget } from "../../components/SavedBookmarksWidget";
export interface DashboardTabProps {
  onViewLegal?: any;
  onNavigate?: any;
  totalPointsCompleted: any;
  completedCount: any;
  checklistItems: any;
  handleActionClick: any;
  profile: any;
  viewsCount: any;
  activeJobsCount: any;
  completedJobsCount: any;
  messages: any;
  isTyping: any;
  chatEndRef: any;
  handleSendMessage: any;
  chatInput: any;
  setChatInput: any;
  setCopiedLink: any;
  copiedLink: any;
  setCopiedCode: any;
  copiedCode: any;
  setIsShareModalOpen: any;
  referredCount: any;
  nextMilestone: any;
  promoCodes: any;
  handleSafetySubmit: any;
  reportSuccess: any;
  setIncidentType: any;
  incidentType: any;
  details: any;
  setDetails: any;
  handleFileChange: any;
  evidencePreview: any;
  evidenceFile: any;
  submittingReport: any;
  setGuideTab: any;
  guideTab: any;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  onViewLegal,
  onNavigate,
  totalPointsCompleted,
  completedCount,
  checklistItems,
  handleActionClick,
  profile,
  viewsCount,
  activeJobsCount,
  completedJobsCount,
  messages,
  isTyping,
  chatEndRef,
  handleSendMessage,
  chatInput,
  setChatInput,
  setCopiedLink,
  copiedLink,
  setCopiedCode,
  copiedCode,
  setIsShareModalOpen,
  referredCount,
  nextMilestone,
  promoCodes,
  handleSafetySubmit,
  reportSuccess,
  setIncidentType,
  incidentType,
  details,
  setDetails,
  handleFileChange,
  evidencePreview,
  evidenceFile,
  submittingReport,
  setGuideTab,
  guideTab
}) => {
  return (
    (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-1">
        
        {/* LEFT COLUMN: Professional Stats & AI Chat Concierge  (7/12 cols) */}
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

          {/* SAVED LISTINGS / BOOKMARKS */}
          {profile?.id && (
            <SavedBookmarksWidget userId={profile.id} onNavigate={onNavigate} />
          )}

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
              <label className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block">Your Referral Code / Link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={profile?.referral_code ? `${window.location.origin}?code=${profile.referral_code}` : `${window.location.origin}?ref=${profile?.id || 'guest'}`}
                  className="flex-1 bg-black/20 text-[10px] font-mono p-3 rounded-xl outline-none border border-white/5 text-slate-300 truncate select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    const stringToCopy = profile?.referral_code ? `${window.location.origin}?code=${profile.referral_code}` : `${window.location.origin}?ref=${profile?.id}`;
                    navigator.clipboard.writeText(stringToCopy);
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
              {profile?.referral_code && (
                <div className="mt-4 border-t border-white/5 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold">Your Short Code:</span>
                    <span className="text-emerald-400 font-mono text-[12px] font-black tracking-widest bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-500/20 shadow-inner select-all">{profile.referral_code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(profile.referral_code!);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${copiedCode ? 'bg-[#25D366] text-white' : 'bg-slate-700 hover:bg-slate-600 text-white active:scale-95'}`}
                  >
                    {copiedCode ? (
                      <><i className="fa-solid fa-check"></i> Copied!</>
                    ) : (
                      <><i className="fa-regular fa-copy"></i> Copy Code</>
                    )}
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-share-nodes text-xs"></i>
                  Share Premium Graphic Card
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
                    <p><b>Filter by Verification:</b> Browse professional listings using our certified verified metrics badge filter for security and NIN matched guarantee.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                    <p><b>Clear Payment Milestones:</b> Never pay a professional a 100% upfront deposit. Always establish fractional progress steps and pay only upon proof of performance.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-500 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                    <p><b>WhatsApp Redirection:</b> Communicate with the professional over the prefilled WhatsApp invitation to finalize scope, pricing agreements, and visual specs easily.</p>
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
      )
  );
};
