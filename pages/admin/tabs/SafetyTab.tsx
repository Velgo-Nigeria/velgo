import React from 'react';
import { SafetyReportRelationsCard } from '../AdminComponents';
import { TIERS } from '../../../lib/constants';
import { openWhatsAppHelper } from '../../../lib/whatsapp';
export interface SafetyTabProps {
  safetyReports: any;
  setActiveTab: any;
  setSelectedTicketUser: any;
  handleSafetyAction: any;
}

export const SafetyTab: React.FC<SafetyTabProps> = ({
  safetyReports,
  setActiveTab,
  setSelectedTicketUser,
  handleSafetyAction
}) => {
  return (
    (
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
         )
  );
};
