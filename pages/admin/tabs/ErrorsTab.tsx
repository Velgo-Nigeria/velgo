import React from 'react';
import { TIERS } from '../../../lib/constants';
import { openWhatsAppHelper } from '../../../lib/whatsapp';
export interface ErrorsTabProps {
  appErrors: any;
}

export const ErrorsTab: React.FC<ErrorsTabProps> = ({
  appErrors
}) => {
  return (
    (
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
          )
  );
};
