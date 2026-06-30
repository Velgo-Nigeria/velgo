import React, { useState, useRef, useEffect } from 'react';
import { ShieldIcon, VelgoLogo } from './Brand';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'app' | 'worker' | 'task';
  data: any; // Worker profile, Posted task, or User Profile
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, type, data }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Set up the shareable URL and text descriptions
  let shareUrl = window.location.origin;
  let textDesc = "Connect with verified local artisans on Velgo Nigeria!";
  let title = "Velgo Nigeria";

  if (type === 'worker' && data) {
    shareUrl = `${window.location.origin}/?workerId=${data.id}`;
    textDesc = `Hire ${data.full_name} (${data.category || 'Professional Artisan'}) on Velgo Nigeria. Verified local expertise.`;
    title = `Artisan: ${data.full_name}`;
  } else if (type === 'task' && data) {
    shareUrl = `${window.location.origin}/?jobId=${data.id}`;
    textDesc = `New Job on Velgo Nigeria: "${data.title}" - Category: ${data.category || 'Artisan'}. Check details and apply.`;
    title = `Job Post: ${data.title}`;
  } else if (type === 'app') {
    const referralCode = data?.referral_code;
    shareUrl = referralCode 
      ? `${window.location.origin}/?code=${referralCode}` 
      : (data?.id ? `${window.location.origin}/?ref=${data.id}` : window.location.origin);
    textDesc = `Join Velgo Nigeria to find and book verified local artisans near you! Use my referral link.`;
    title = "Join Velgo Nigeria";
  }

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

  // Draw procedural QR-like code on canvas
  const drawProceduralQRCode = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, size, size);
    
    // Draw outer dark frame
    ctx.strokeStyle = '#022c22';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

    const drawCornerPattern = (cx: number, cy: number, pSize: number) => {
      ctx.fillStyle = '#022c22';
      // Outer box
      ctx.fillRect(cx, cy, pSize, pSize);
      // Inner white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + pSize/6, cy + pSize/6, pSize - (pSize/3), pSize - (pSize/3));
      // Inner dark center
      ctx.fillStyle = '#022c22';
      ctx.fillRect(cx + pSize/3, cy + pSize/3, pSize - (pSize*2/3), pSize - (pSize*2/3));
    };

    const patternSize = size * 0.28;
    // Draw 3 standard corner boxes
    drawCornerPattern(x + 4, y + 4, patternSize); // Top-left
    drawCornerPattern(x + size - patternSize - 4, y + 4, patternSize); // Top-right
    drawCornerPattern(x + 4, y + size - patternSize - 4, patternSize); // Bottom-left

    // Draw tiny random modules (reproducible using coordinates)
    ctx.fillStyle = '#022c22';
    const numBlocks = 18;
    const blockSize = (size - 8) / numBlocks;

    for (let col = 0; col < numBlocks; col++) {
      for (let row = 0; row < numBlocks; row++) {
        // Skip corner areas where patterns are drawn
        const inTopLeft = col < 6 && row < 6;
        const inTopRight = col > numBlocks - 7 && row < 6;
        const inBottomLeft = col < 6 && row > numBlocks - 7;
        
        if (!inTopLeft && !inTopRight && !inBottomLeft) {
          // Semi-random deterministic grid
          const seed = (col * 31 + row * 17) % 100;
          if (seed > 45) {
            ctx.fillRect(
              x + 4 + col * blockSize,
              y + 4 + row * blockSize,
              blockSize + 0.5,
              blockSize + 0.5
            );
          }
        }
      }
    }
  };

  // Generate and download the custom PNG image using HTML5 Canvas
  const handleDownloadImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 800;
      const height = 500;
      canvas.width = width;
      canvas.height = height;

      // 1. Draw Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      if (type === 'worker') {
        gradient.addColorStop(0, '#022c22'); // Deep emerald
        gradient.addColorStop(0.5, '#064e3b'); 
        gradient.addColorStop(1, '#022c22');
      } else if (type === 'task') {
        gradient.addColorStop(0, '#0f172a'); // Midnight slate
        gradient.addColorStop(0.6, '#1e1b4b'); // Deep indigo accent
        gradient.addColorStop(1, '#0f172a');
      } else {
        gradient.addColorStop(0, '#022c22'); // Rich Velgo gold-emerald
        gradient.addColorStop(0.5, '#0f172a');
        gradient.addColorStop(1, '#111827');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add elegant visual background accents
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 200, height);
        ctx.stroke();
      }

      // 2. Draw Velgo Logo text & tagline at top left
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 italic 32px sans-serif';
      ctx.fillText('VELGO', 45, 65);

      ctx.fillStyle = '#10b981'; // Emerald
      ctx.font = '900 12px sans-serif';
      ctx.fillText('NIGERIA', 45, 82);

      // Draw subtle separator line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(45, 105);
      ctx.lineTo(width - 45, 105);
      ctx.stroke();

      // 3. Draw Main Graphic Content
      if (type === 'worker') {
        // --- WORKER GRAPHIC ---
        // Profile Circle Badge
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(110, 230, 60, 0, Math.PI * 2);
        ctx.fill();

        // White border around avatar
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Worker Initials inside Avatar
        const initials = data?.full_name ? data.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'VA';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(initials, 110, 242);
        ctx.textAlign = 'left'; // Reset

        // Worker Name and Category
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 30px sans-serif';
        ctx.fillText(data?.full_name || 'Verified Artisan', 195, 215);

        ctx.fillStyle = '#a7f3d0'; // Soft emerald text
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(data?.category || 'Professional Service', 195, 242);

        // Verification Badge Tag
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fillRect(195, 255, 180, 28);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('✓ VERIFIED NIGERIAN ARTISAN', 205, 273);

        // Grid Metrics Info boxes
        const drawMetricBox = (x: number, y: number, label: string, val: string, isAccent = false) => {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.fillRect(x, y, 140, 75);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.strokeRect(x, y, 140, 75);

          ctx.fillStyle = '#9ca3af';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(label.toUpperCase(), x + 12, y + 25);

          ctx.fillStyle = isAccent ? '#10b981' : '#ffffff';
          ctx.font = '900 18px sans-serif';
          ctx.fillText(val, x + 12, y + 55);
        };

        drawMetricBox(45, 340, 'Starting At', `₦${data?.starting_price || '0'}`);
        drawMetricBox(195, 340, 'Rating', `${data?.worker_avg_rating || '5.0'} ★`);
        drawMetricBox(345, 340, 'Trust Score', `${data?.trust_score || '0'} Pts`, true);

      } else if (type === 'task') {
        // --- JOB / TASK GRAPHIC ---
        // Status chip
        ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
        ctx.fillRect(45, 140, 160, 28);
        ctx.fillStyle = '#818cf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('✦ VERIFIED JOB OPENING', 55, 158);

        // Job Title (word wrap)
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px sans-serif';
        const titleStr = data?.title || 'Job Request';
        if (titleStr.length > 35) {
          ctx.fillText(titleStr.substring(0, 32) + '...', 45, 215);
        } else {
          ctx.fillText(titleStr, 45, 215);
        }

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '600 18px sans-serif';
        ctx.fillText(`Category: ${data?.category || 'General Labor'}`, 45, 250);

        // Budget Card
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(45, 285, 220, 130);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeRect(45, 285, 220, 130);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('ESTIMATED BUDGET', 60, 315);

        ctx.fillStyle = '#10b981'; // Emerald Green Price
        ctx.font = '900 28px sans-serif';
        ctx.fillText(`₦${data?.budget ? Number(data.budget).toLocaleString() : 'Negotiable'}`, 60, 355);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '500 12px sans-serif';
        ctx.fillText(data?.address_city ? `📍 ${data.address_city}, ${data.address_state || 'Nigeria'}` : '📍 Lagos, Nigeria', 60, 395);

        // Job details point list on the right
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 14px sans-serif';
        ctx.fillText('✓ Direct, verified client interaction', 300, 310);
        ctx.fillText('✓ Transparent work milestones & updates', 300, 345);
        ctx.fillText('✓ Connect directly on WhatsApp/Phone', 300, 380);

      } else {
        // --- GENERAL APP SHARE GRAPHIC ---
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px sans-serif';
        ctx.fillText("Nigeria's Trusted Artisan Hub", 45, 160);

        ctx.fillStyle = '#a7f3d0';
        ctx.font = '500 16px sans-serif';
        ctx.fillText("Directly find, book, and chat with 100% verified local professionals.", 45, 195);

        // Core App Features Points
        const drawFeatureBullet = (y: number, title: string, desc: string) => {
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(60, y + 5, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 15px sans-serif';
          ctx.fillText(title, 80, y + 10);

          ctx.fillStyle = '#9ca3af';
          ctx.font = '500 13px sans-serif';
          ctx.fillText(desc, 320, y + 10);
        };

        drawFeatureBullet(240, 'NIN-Verified Professionals', 'Full background & identity validation');
        drawFeatureBullet(285, 'Direct WhatsApp Integration', 'No platform middlemen, connect instantly');
        drawFeatureBullet(330, 'Milestone Tracking', 'Easy coordination of project updates');
        drawFeatureBullet(375, 'Zero Platform Commissions', 'Keep 100% of your earnings');
      }

      // 4. Draw QR Code and Brand Call-To-Action on Right Edge
      const qrX = width - 180;
      const qrY = height - 195;
      const qrSize = 135;
      drawProceduralQRCode(ctx, qrX, qrY, qrSize);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('SCAN TO CONNECT', qrX + 22, qrY + qrSize + 20);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('velgo.ng', qrX + 42, qrY + qrSize + 35);

      // 5. Finalize Download trigger
      const dataUrl = canvas.toDataURL('image/png');
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
            
            {/* HTML Rendering of Graphic Card */}
            <div className={`relative overflow-hidden rounded-[24px] p-6 text-white border text-left aspect-[1.6/1] w-full flex flex-col justify-between shadow-lg ${
              type === 'worker' 
                ? 'bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-950 border-emerald-500/20' 
                : type === 'task'
                  ? 'bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-950 border-indigo-500/20'
                  : 'bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-950 border-emerald-500/20'
            }`}>
              
              {/* Background fine lines decoration */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              {/* Top Row: Velgo Brand and Mini Shield Logo */}
              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                    <img 
                      src="https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png" 
                      className="w-5 h-5 object-contain"
                      alt="Velgo"
                    />
                  </div>
                  <div>
                    <h4 className="font-black italic tracking-tighter text-sm leading-none">VELGO</h4>
                    <span className="text-emerald-500 text-[8px] font-black uppercase tracking-wider leading-none block mt-0.5">NIGERIA</span>
                  </div>
                </div>
                
                {/* Visual verified badge or indicator */}
                <div className="bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[8px] uppercase tracking-widest font-black text-slate-200">
                    {type === 'worker' ? 'Verified Expert' : type === 'task' ? 'Verified Job' : 'Platform Hub'}
                  </span>
                </div>
              </div>

              {/* Middle Row: Content */}
              <div className="my-4 z-10 flex-1 flex flex-col justify-center">
                {type === 'worker' && data && (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-700 text-white rounded-full flex items-center justify-center font-black text-lg border-2 border-emerald-400/50 shadow-inner">
                      {data.full_name ? data.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'VA'}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black tracking-tight text-white line-clamp-1">{data.full_name}</h3>
                      <p className="text-xs text-emerald-300 font-bold tracking-wide">{data.category || 'Professional Service'}</p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-black tracking-widest uppercase">
                        ✓ Identity Checked
                      </span>
                    </div>
                  </div>
                )}

                {type === 'task' && data && (
                  <div className="space-y-1.5">
                    <span className="text-[8px] uppercase tracking-widest font-black text-indigo-400">Task Title</span>
                    <h3 className="text-lg font-black tracking-tight text-white line-clamp-1">{data.title}</h3>
                    <p className="text-xs text-slate-300 font-bold tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {data.category || 'Professional Labor'}
                    </p>
                  </div>
                )}

                {type === 'app' && (
                  <div className="space-y-1">
                    <h3 className="text-base font-black tracking-tight text-white leading-tight">Nigeria's Trusted Artisan Hub</h3>
                    <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                      Connect directly on WhatsApp with vetted, identity-verified local plumbers, electricians, painters & and technicians!
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Row: Details and QR Code representation */}
              <div className="flex justify-between items-end border-t border-white/5 pt-3 z-10">
                <div className="flex items-center gap-4 text-left">
                  {type === 'worker' && (
                    <div className="flex gap-4">
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">Starts at</span>
                        <span className="text-xs font-black text-white">₦{data?.starting_price || '0'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">Rating</span>
                        <span className="text-xs font-black text-white flex items-center gap-0.5">{data?.worker_avg_rating || '5.0'} <i className="fa-solid fa-star text-yellow-400 text-[10px]"></i></span>
                      </div>
                      <div>
                        <span className="text-[8px] text-emerald-400 uppercase tracking-widest block font-bold">Trust Score</span>
                        <span className="text-xs font-black text-emerald-400">{data?.trust_score || '0'} Pts</span>
                      </div>
                    </div>
                  )}

                  {type === 'task' && (
                    <div className="flex gap-4">
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">Budget</span>
                        <span className="text-xs font-black text-emerald-400">₦{data?.budget ? Number(data.budget).toLocaleString() : 'Negotiable'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">Location</span>
                        <span className="text-xs font-black text-white truncate max-w-[100px] block">
                          {data?.address_city ? `${data.address_city}, ${data.address_state || ''}` : 'Lagos, NG'}
                        </span>
                      </div>
                    </div>
                  )}

                  {type === 'app' && (
                    <div>
                      {data?.referral_code ? (
                        <div>
                          <span className="text-[8px] text-emerald-400 uppercase tracking-widest block font-bold">Invite Code</span>
                          <span className="text-xs font-black text-emerald-400 tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25">{data.referral_code}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">Scan to visit</span>
                          <span className="text-xs font-black text-emerald-400">velgo.ng</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* QR Code Graphic Mockup */}
                <div className="w-12 h-12 bg-white rounded-lg p-1 border border-white/20 flex items-center justify-center">
                  <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-90">
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-transparent"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    
                    <div className="bg-transparent"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-transparent"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-transparent"></div>
                    
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-transparent"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
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
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-sm py-4 px-6 rounded-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-arrow-down text-base"></i>
                  Download PNG Card
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

          {/* Hidden Canvas used to compile the actual downloadable high-res image */}
          <canvas ref={canvasRef} className="hidden" />

        </div>

        {/* Modal Footer disclaimer */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-medium">
          ✦ Premium visual shares from Velgo Nigeria. Trusted services. Zero commissions.
        </div>

      </div>
    </div>
  );
};
