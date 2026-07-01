import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { VelgoLogo } from './Brand';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'app' | 'worker' | 'task';
  data: any; // Worker profile, Posted task, or User Profile
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, type, data }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Force production domain for shared links and QR codes
  const baseUrl = "https://velgo.com.ng";

  // Set up the shareable URL and text descriptions
  let shareUrl = baseUrl;
  let textDesc = "Connect with verified local artisans on Velgo Nigeria!";
  let title = "Velgo Nigeria";

  if (type === 'worker' && data) {
    shareUrl = `${baseUrl}/?workerId=${data.id}`;
    textDesc = `Hire ${data.full_name} (${data.category || 'Professional Artisan'}) on Velgo Nigeria. Verified local expertise.`;
    title = `Artisan: ${data.full_name}`;
  } else if (type === 'task' && data) {
    shareUrl = `${baseUrl}/?jobId=${data.id}`;
    textDesc = `New Job on Velgo Nigeria: "${data.title}" - Category: ${data.category || 'Artisan'}. Check details and apply.`;
    title = `Job Post: ${data.title}`;
  } else if (type === 'app') {
    const referralCode = data?.referral_code;
    shareUrl = referralCode 
      ? `${baseUrl}/?code=${referralCode}` 
      : (data?.id ? `${baseUrl}/?ref=${data.id}` : baseUrl);
    textDesc = `Join Velgo Nigeria to find and book verified local artisans near you! Use my referral link.`;
    title = "Join Velgo Nigeria";
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=022c22&bgcolor=ffffff&data=${encodeURIComponent(shareUrl)}`;

  // Determine images
  const workerAvatar = data?.avatar_url || data?.nin_image_url;
  const taskImage = data?.image_url;

  // Copy link handler
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // Direct Web Share handler
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: textDesc,
          url: shareUrl
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Native share failed:", err);
        }
      }
    } else {
      // Fallback: whatsapp
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textDesc + '\n\nLink: ' + shareUrl)}`, '_blank');
    }
  };

  // Generate and download the custom PNG image using html-to-image
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      // html-to-image to extract the component.
      // We pass the actual width and height to force the correct canvas size, avoiding the scale bug.
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true, 
        pixelRatio: 2,
        width: 800,
        height: 420,
        style: {
          transform: 'none' // Ensure no transforms are applied to the captured node
        }
      });
      const link = document.createElement('a');
      link.download = `velgo_${type}_share_card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate and download canvas image:", err);
      alert("Unable to export sharing graphic directly. You can still share using the copy link button!");
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-[36px] max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all z-10"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-2 border-b border-slate-800 text-left">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <i className="fa-solid fa-share-nodes text-emerald-500"></i>
            Share Custom Card
          </h2>
          <p className="text-xs text-slate-400 mt-1">Export high-quality graphics and direct links for social media sharing</p>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Card Preview Area */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left">Live Graphic Preview</label>
            
            {/* THIS IS THE ACTUAL DOM RENDERED TO IMAGE. We wrap it in a scaling div for the preview so the target node itself is full size. */}
            <div className="overflow-hidden rounded-[24px] shadow-lg border border-slate-200 relative bg-slate-100" style={{ height: '220px' }}>
              
              <div style={{ transform: 'scale(0.48)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, width: '800px', height: '420px' }}>
                <div 
                  ref={cardRef}
                  className="bg-white text-slate-900 p-8 w-full flex flex-col justify-between"
                  style={{ width: '800px', height: '420px' }}
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                  
                  {/* Header: Logo and Brand */}
                  <div className="flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-emerald-950 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-500">
                        <VelgoLogo className="w-10 h-10" />
                      </div>
                      <div>
                        <h4 className="font-black italic tracking-tighter text-3xl leading-none text-emerald-950">VELGO</h4>
                        <span className="text-emerald-500 font-black uppercase tracking-[0.2em] text-xs leading-none block mt-1">NIGERIA</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100 flex items-center gap-2 shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-sm font-black uppercase tracking-widest">
                        {type === 'worker' ? 'Verified Artisan' : type === 'task' ? 'Verified Job' : 'Platform Hub'}
                      </span>
                    </div>
                  </div>

                  {/* Main Body */}
                  <div className="flex-1 flex items-center my-6 z-10">
                    {type === 'worker' && data && (
                      <div className="flex gap-6 items-center w-full">
                        {workerAvatar ? (
                          <img src={workerAvatar} className="w-32 h-32 rounded-full object-cover border-4 border-emerald-100 shadow-md" alt="Worker" />
                        ) : (
                          <div className="w-32 h-32 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-4xl font-black text-emerald-700 shadow-md">
                            {data.full_name ? data.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'VA'}
                          </div>
                        )}
                        <div className="flex-1">
                          <h2 className="text-4xl font-black text-slate-900 leading-tight mb-2">{data.full_name}</h2>
                          <p className="text-xl font-bold text-emerald-600 mb-3">{data.category || 'Professional Service'}</p>
                          <div className="flex gap-4 mt-4">
                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Starting At</p>
                              <p className="text-xl font-black text-slate-800">₦{data.starting_price || '0'}</p>
                            </div>
                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Rating</p>
                              <p className="text-xl font-black text-slate-800">{data.worker_avg_rating || '5.0'} ★</p>
                            </div>
                            <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Trust</p>
                              <p className="text-xl font-black text-emerald-700">{data.trust_score || '0'} Pts</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {type === 'task' && data && (
                      <div className="flex gap-6 items-center w-full">
                        <div className="flex-1">
                          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest rounded-md mb-4 border border-indigo-100">Task Opening</span>
                          <h2 className="text-4xl font-black text-slate-900 leading-tight mb-3 line-clamp-2">{data.title}</h2>
                          <p className="text-xl font-bold text-slate-600 flex items-center gap-2 mb-4">
                             {data.category || 'Professional Labor'}
                          </p>
                          <div className="flex gap-4 mt-2">
                            <div className="bg-emerald-50 px-5 py-3 rounded-xl border border-emerald-100">
                              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Estimated Budget</p>
                              <p className="text-2xl font-black text-emerald-700 mt-1">₦{data.budget ? Number(data.budget).toLocaleString() : 'Negotiable'}</p>
                            </div>
                          </div>
                        </div>
                        {taskImage && (
                          <img src={taskImage} className="w-40 h-40 object-cover rounded-2xl shadow-md border border-slate-100" alt="Task" />
                        )}
                      </div>
                    )}

                    {type === 'app' && (
                      <div className="flex-1 pr-10">
                        <h2 className="text-5xl font-black text-slate-900 leading-tight mb-4 tracking-tight">Nigeria's Trusted Artisan Hub</h2>
                        <p className="text-xl font-medium text-slate-600 leading-relaxed mb-6">
                          Connect directly on WhatsApp with vetted, identity-verified local plumbers, electricians, painters & technicians.
                        </p>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <i className="fa-solid fa-circle-check text-emerald-500 text-xl"></i>
                            <span className="font-bold text-slate-700 text-lg">Strict NIN & Identity Validation</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <i className="fa-solid fa-circle-check text-emerald-500 text-xl"></i>
                            <span className="font-bold text-slate-700 text-lg">Zero Platform Commissions</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Section: URL and QR */}
                  <div className="flex justify-between items-end border-t-2 border-slate-100 pt-6 z-10">
                    <div>
                      {type === 'app' && data?.referral_code && (
                        <div className="mb-2">
                          <span className="text-sm font-black text-slate-400 uppercase tracking-widest block">Invite Code</span>
                          <span className="text-2xl font-black text-emerald-600 tracking-widest">{data.referral_code}</span>
                        </div>
                      )}
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest block mb-1">Scan to Visit</span>
                      <span className="text-2xl font-black text-slate-900 tracking-tight">velgo.com.ng</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">Scan this QR Code</p>
                        <p className="text-xs font-medium text-slate-500">to view on your phone</p>
                      </div>
                      <img src={qrCodeUrl} className="w-24 h-24 rounded-xl shadow-sm border border-slate-200 p-1 bg-white" alt="QR Code" />
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Quick Share Link Box */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-4 space-y-2 text-left">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Direct Link to Copy</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-black/30 text-[10px] text-slate-300 font-mono p-3 rounded-xl outline-none border border-slate-800 truncate select-all"
              />
              <button 
                onClick={handleCopyLink}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl active:scale-95 transition-all whitespace-nowrap min-w-[85px] text-center"
              >
                {copied ? 'Copied! ✓' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Export Actions Area */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-sm py-4 px-6 rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg"
            >
              {downloading ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                  Exporting...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-image text-base"></i>
                  Save Image
                </>
              )}
            </button>

            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 text-white font-black text-sm py-4 px-6 rounded-2xl border border-slate-700 active:scale-95 transition-all"
            >
              <i className="fa-solid fa-arrow-up-from-bracket text-base"></i>
              Share Link
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

