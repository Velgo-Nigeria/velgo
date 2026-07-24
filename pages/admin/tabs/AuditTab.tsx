import React from 'react';
import { TIERS } from '../../../lib/constants';
import { openWhatsAppHelper } from '../../../lib/whatsapp';
export interface AuditTabProps {
  auditLogs: any;
}

export const AuditTab: React.FC<AuditTabProps> = ({
  auditLogs
}) => {
  return (
    (
              <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                      <div>
                          <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">Admin Audit Logs</h3>
                          <p className="text-[10px] text-slate-500 mt-1">Immutable record of all administrative actions for transparency.</p>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-black text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
                          {auditLogs.length} Records
                      </div>
                  </div>
                  {auditLogs.length === 0 ? (
                      <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                          <i className="fa-solid fa-clipboard-list text-4xl text-slate-300 dark:text-slate-600 mb-4"></i>
                          <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">No Logs Recorded</p>
                          <p className="text-[10px] text-gray-500 mt-2">No administrative actions have been captured yet.</p>
                      </div>
                  ) : (
                      <div className="grid gap-3">
                          {auditLogs.map((log) => (
                              <div key={log.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center shrink-0">
                                          {log.admin_profile?.avatar_url ? (
                                              <img src={log.admin_profile.avatar_url} alt="Admin" className="w-full h-full object-cover rounded-full" />
                                          ) : (
                                              <i className="fa-solid fa-user-shield text-slate-400 text-[10px]"></i>
                                          )}
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-2">
                                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                  {log.admin_profile?.full_name || 'Unknown Admin'}
                                              </span>
                                              <span className="bg-brand/10 text-brand text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full">
                                                  {log.action_type.replace(/_/g, ' ')}
                                              </span>
                                          </div>
                                          <p className="text-[10px] text-slate-500 mt-1">
                                              Target ID: <span className="font-mono">{log.target_id || 'System'}</span>
                                          </p>
                                          {log.details && Object.keys(log.details).length > 0 && (
                                              <div className="mt-2 text-[9px] font-mono text-slate-400 break-all bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                  {JSON.stringify(log.details)}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                      <p className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                                          {new Date(log.created_at).toLocaleString()}
                                      </p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )
  );
};
