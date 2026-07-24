import React from 'react';
import { Profile } from '../../lib/types';

export interface AlertsTabProps {
  hubNotifications: any;
  handleMarkAllReadHub: any;
  setHubFilter: any;
  hubFilter: any;
  loadingNotifications: any;
  handleToggleReadHub: any;
  handleDeleteHub: any;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({
  hubNotifications,
  handleMarkAllReadHub,
  setHubFilter,
  hubFilter,
  loadingNotifications,
  handleToggleReadHub,
  handleDeleteHub
}) => {
  return (
    (
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
      )
  );
};
