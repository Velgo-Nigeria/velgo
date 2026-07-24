import React from 'react';
import { TIERS } from '../../../lib/constants';
import { openWhatsAppHelper } from '../../../lib/whatsapp';
export interface VerifyTabProps {
  pendingVerifications: any;
  setLightboxUser: any;
  setZoom: any;
  setRotate: any;
  setPanX: any;
  setPanY: any;
}

export const VerifyTab: React.FC<VerifyTabProps> = ({
  pendingVerifications,
  setLightboxUser,
  setZoom,
  setRotate,
  setPanX,
  setPanY
}) => {
  return (
    (
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
         )
  );
};
