import React from 'react';
import { openWhatsAppHelper } from '../../lib/whatsapp';
export interface VerificationLightboxProps {
  lightboxUser: any;
  setLightboxUser: any;
  zoom: any;
  rotate: any;
  panX: any;
  panY: any;
  setPanY: any;
  setPanX: any;
  setZoom: any;
  setRotate: any;
  setRejectionReasons: any;
  rejectionReasons: any;
  handleVerificationDecision: any;
  processingId: any;
}

export const VerificationLightbox: React.FC<VerificationLightboxProps> = ({
  lightboxUser,
  setLightboxUser,
  zoom,
  rotate,
  panX,
  panY,
  setPanY,
  setPanX,
  setZoom,
  setRotate,
  setRejectionReasons,
  rejectionReasons,
  handleVerificationDecision,
  processingId
}) => {
  return (
    (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col md:flex-row items-stretch select-none overflow-hidden animate-fadeIn">
          
          {/* Left Panel: Clinical ID Visual Workspace */}
          <div className="h-[50vh] md:h-auto md:flex-1 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col p-4 md:p-6 min-h-0 shrink-0 relative">
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

            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mt-3 md:mt-4 bg-slate-950 p-2 md:p-3 rounded-xl md:rounded-2xl border border-slate-800 shadow shrink-0">
              <button 
                onClick={() => setZoom(prev => Math.min(prev + 0.25, 4))}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-magnifying-glass-plus text-emerald-500"></i> Zoom In
              </button>
              <button 
                onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-magnifying-glass-minus text-amber-500"></i> Zoom Out
              </button>
              <button 
                onClick={() => setRotate(prev => prev - 90)}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-rotate-left text-indigo-400"></i> Spin Left
              </button>
              <button 
                onClick={() => setRotate(prev => prev + 90)}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-rotate-right text-indigo-400"></i> Spin Right
              </button>
              <button 
                onClick={() => { setZoom(1); setRotate(0); setPanX(0); setPanY(0); }}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase text-slate-400 hover:text-white flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <i className="fa-solid fa-arrows-to-dot text-amber-500"></i> Reset
              </button>
            </div>
          </div>

          {/* Right Panel: Decision & Profile Audit comparison deck */}
          <div className="flex-1 md:flex-none w-full md:w-[420px] bg-slate-950 p-4 md:p-6 overflow-y-auto flex flex-col border-l-0 md:border-l border-slate-800">
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
                    <option value="Your submitted ID photo is blurry, obscured by glare, or captured in poor lighting. Please re-upload a crisp, clear photo taken in bright daylight.">1. Blurry / Poor Lighting</option>
                    <option value="The name on the ID document does not exactly match your Velgo registered profile name. We require your own valid personal ID to ensure platform security.">2. Name Mismatch</option>
                    <option value="Invalid document class. For security reasons, we strictly require formal Nigerian Government IDs (Standard NIN Slip, Permanent Voter's Card, Driver's License, or International Passport).">3. Invalid ID Type</option>
                    <option value="The ID scan is cut-off. Essential details such as your face, document number, or full name are outside the photo frame. Please upload a full-frame scan.">4. Cut-off Scan Boundaries</option>
                    <option value="The uploaded document appears to be a black-and-white photocopy or a digital screenshot. We require a photo of the original color physical card or original colored printout.">5. Photocopy / Screenshot</option>
                    <option value="The uploaded ID document appears to be expired. Please upload an active, unexpired government-issued identification.">6. Expired Document</option>
                    <option value="Your face on the ID document is not clearly visible or does not seem to match your profile picture. Please upload an ID with a clear facial portrait.">7. Facial Recognition Mismatch</option>
                    <option value="We detected signs of digital manipulation or forgery in the uploaded document. Your verification request has been rejected for security reasons.">8. Suspected Forgery / Manipulation</option>
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
      )
  );
};
