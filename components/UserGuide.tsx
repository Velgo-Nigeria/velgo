import React, { useState, useEffect } from 'react';
import { VelgoLogo } from './Brand';

interface UserGuideProps {
  onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onClose }) => {
  const [role, setRole] = useState<'employer' | 'worker' | null>(null);
  const [step, setStep] = useState(0);

  // SIMULATOR STATES for Employer slides
  const [marketTab, setMarketTab] = useState<'market' | 'post'>('market');
  const [hasPostedJob, setHasPostedJob] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const [chatMessages, setChatMessages] = useState<{ sender: 'client' | 'worker'; text: string }[]>([]);
  const [chosenReply, setChosenReply] = useState<string | null>(null);
  const [isWorkerTyping, setIsWorkerTyping] = useState(false);

  const [safetToggle, setSafetyToggle] = useState<'risky' | 'safe'>('risky');

  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankMatchState, setBankMatchState] = useState<'unverified' | 'matching' | 'matched'>('unverified');

  const [taskStatus, setTaskStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [showRatingSuccess, setShowRatingSuccess] = useState(false);

  const [showNinTooltip, setShowNinTooltip] = useState(false);

  // SIMULATOR STATES for Worker slides
  const [isPremiumProfile, setIsPremiumProfile] = useState(false);

  const [ninInput, setNinInput] = useState('');
  const [isNinVerifying, setIsNinVerifying] = useState(false);
  const [isNinVerified, setIsNinVerified] = useState(false);

  const [hasAppliedToJob, setHasAppliedToJob] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [bidAmount, setBidAmount] = useState(15000);

  const [travelChecks, setTravelChecks] = useState({ transport: false, address: false, supplies: false });

  const [isBankSaving, setIsBankSaving] = useState(false);
  const [bankAccountVerified, setBankAccountVerified] = useState(false);

  const [locationShared, setLocationShared] = useState(false);
  const [safetyCheckset, setSafetyCheckset] = useState(false);

  // Drive direct-to-WhatsApp simulated redirect and chat in the user guide
  const [waView, setWaView] = useState<'invite' | 'redirecting' | 'whatsapp_chat'>('invite');

  // Reset simulator states whenever step or role changes to keep them clean
  useEffect(() => {
    // Employer reset
    setMarketTab('market');
    setHasPostedJob(false);
    setIsPosting(false);
    setChatMessages([
      { sender: 'worker', text: "Hello boss! I saw your request. I can fix this electric issue today." }
    ]);
    setChosenReply(null);
    setIsWorkerTyping(false);
    setSafetyToggle('risky');
    setBankMatchState('unverified');
    setIsVerifyingBank(false);
    setTaskStatus('in_progress');
    setSelectedRating(0);
    setShowRatingSuccess(false);
    setShowNinTooltip(false);

    // Worker reset
    setIsPremiumProfile(false);
    setNinInput('');
    setIsNinVerifying(false);
    setIsNinVerified(false);
    setHasAppliedToJob(false);
    setIsApplying(false);
    setBidAmount(15000);
    setTravelChecks({ transport: false, address: false, supplies: false });
    setIsBankSaving(false);
    setBankAccountVerified(false);
    setLocationShared(false);
    setSafetyCheckset(false);
    setWaView('invite');
  }, [step, role]);

  const clientSlides = [
    {
      title: "1. Choose How to Hire",
      text: "Open the Velgo app and browse high-rated local professionals inside the 'Market', or post your job requirement for free. Top verified workers in your neighborhood will respond immediately.",
      subtitle: "Click the toggle in the simulator on the right to see or test how easy it is to search for talent or post a new request!"
    },
    {
      title: "2. Connect Directly on WhatsApp",
      text: "Velgo utilizes secure direct-connect WhatsApp redirects to let you chat with the professional instantly. Discuss custom requirements, agree on the final labor cost, expected timeline, and transport fees pre-transit.",
      subtitle: "Tap the WhatsApp action in the simulator to see how our prefilled message redirects you instantly and securely."
    },
    {
      title: "3. Materials Protocol",
      text: "To avoid financial risks, buy materials yourself at your local market or accompany the worker. Never send cash upfront for supplies to workers with low ratings.",
      subtitle: "Toggle between the Risky Way and the Velgo Safe Way on the right to grasp our core financial safety habits."
    },
    {
      title: "4. Verify Bank Names",
      text: "When paying via bank transfer, double-check that the recipient's name in your banking app matches the verified bank transfer name shown in their Velgo profile EXACTLY.",
      subtitle: "Tap the verify button in the simulator to see how matching bank ledger names stops impersonation and secures your funds."
    },
    {
      title: "5. Safe Payment & Rating",
      text: "Never pay fully in advance. Transfer funds directly to the worker once they safely complete the job to your satisfaction. Once done, mark the job complete and rate them.",
      subtitle: "Try the task tracker on the right. Tap 'Confirm Job Completion' to mark it complete and cast your rating!"
    },
    {
      title: "6. Trust the Verification Badge",
      text: "Prioritize workers carrying the blue checkmark. These professionals have submitted government-authenticated NIN identity documents verified by our secure security network.",
      subtitle: "Hover or tap on Suleiman's blue verification checkmark in the simulator to inspect his security details."
    }
  ];

  const workerSlides = [
    {
      title: "1. Clean High-Grade Profile",
      text: "Professionals with bright, professional photos of their work and detailed services receive up to 4x more direct hires. Make your biography informative and clear.",
      subtitle: "Tap the toggle in the simulator to see how professional photos and honest tags transform your hire rates."
    },
    {
      title: "2. Register your NIN Document",
      text: "Unlock the verified trust badge by typing your 11-Digit National Identification Number (NIN) inside Settings. Customers filter and hire verified professionals first.",
      subtitle: "Test the document verification on the right. Put in your number and tap verify to get your checkmark!"
    },
    {
      title: "3. Direct Token Applications",
      text: "Check direct invitations and public neighborhood requests daily under your 'Marketplace' tab. Use your daily token credits to instantly apply to job posts in real-time. Fast replies get you noticed first.",
      subtitle: "A public gig just surfaced! Give it a go: tap 'Submit Direct Application' in the marketplace feed."
    },
    {
      title: "4. Clarify Travel & Parts",
      text: "Before transiting, verify the exact project address in chat. Make sure you and the client are in 100% agreement on travel cost refunds and who buys materials.",
      subtitle: "Complete the mandatory safety and logistics checklist in the simulator on the right before you start moving."
    },
    {
      title: "5. Get Direct Bank Payments",
      text: "Securely input your bank account in Settings. Velgo operates on zero-commission, meaning clients transfer 100% of agreed fees directly to your verified bank account.",
      subtitle: "Input your payment details and resolve your verified name directly from the bank database."
    },
    {
      title: "6. Safe Site Guidelines",
      text: "Your safety is paramount. Share your live transit location with emergency contacts inside Settings, stay alert in isolated locations, and rely on our 24/7 Safety Center.",
      subtitle: "Test our rapid emergency widget. Activate location sharing and check-ins to make sure family can track your location."
    }
  ];

  const activeSlides = role === 'employer' ? clientSlides : workerSlides;

  // Render the current active simulated smartphone screen
  const renderSimulatedApp = () => {
    if (role === 'employer') {
      switch (step) {
        case 0: // Choose how to hire
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              {/* Phone Header */}
              <div className="bg-brand text-white p-3 pt-4 flex justify-between items-center text-xs font-black">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-bolt text-[10px]"></i>
                  <span>Velgo Markets</span>
                </div>
                <span className="text-[10px] opacity-75">Benin City</span>
              </div>

              {/* Toggle Selector */}
              <div className="flex bg-white dark:bg-gray-800 p-2 m-2 rounded-xl shadow-sm gap-1 border border-gray-150 dark:border-gray-700">
                <button
                  onClick={() => setMarketTab('market')}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${marketTab === 'market' ? 'bg-brand text-white' : 'text-gray-400 dark:text-gray-500'}`}
                >
                  <i className="fa-solid fa-search mr-1.5"></i>Market
                </button>
                <button
                  onClick={() => setMarketTab('post')}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${marketTab === 'post' ? 'bg-brand text-white' : 'text-gray-400 dark:text-gray-500'}`}
                >
                  <i className="fa-solid fa-plus-circle mr-1.5"></i>Post a Job
                </button>
              </div>

              {/* Mock Content */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {marketTab === 'market' ? (
                  <>
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-black text-white text-[10px]">AO</div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-black dark:text-white">Adekunle O.</span>
                            <i className="fa-solid fa-circle-check text-blue-500 text-[10px]"></i>
                          </div>
                          <span className="text-[9px] text-gray-400 font-bold">⚡ Electrician • Benin City</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-amber-500"><i className="fa-solid fa-star mr-1"></i>4.9</span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-black text-white text-[10px]">P</div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-black dark:text-white">Precious I.</span>
                            <i className="fa-solid fa-circle-check text-blue-500 text-[10px]"></i>
                          </div>
                          <span className="text-[9px] text-gray-400 font-bold">🚰 Plumber • GRA, Benin</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-amber-500"><i className="fa-solid fa-star mr-1"></i>4.8</span>
                    </div>
                  </>
                ) : (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                    <p className="text-[10px] font-black dark:text-white mb-1">Create Job Post</p>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="e.g. Broken wall socket"
                        disabled
                        value="Fix bedroom socket and wire a generator feed"
                        className="w-full bg-slate-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-750 text-[10px] p-2 rounded-lg font-medium outline-none text-gray-500"
                      />
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-gray-900 p-2 border border-gray-100 dark:border-gray-750 rounded-lg">
                        <span className="text-[9px] text-gray-400 font-bold">Budget Estimation</span>
                        <span className="text-[10px] font-black text-brand">₦15,000</span>
                      </div>
                    </div>

                    {hasPostedJob ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-2 rounded-lg text-center text-[9px] font-black uppercase tracking-widest animate-fadeIn">
                        Job Posted Successfully! ✓
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsPosting(true);
                          setTimeout(() => {
                            setIsPosting(false);
                            setHasPostedJob(true);
                          }, 1000);
                        }}
                        disabled={isPosting}
                        className="w-full bg-brand text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-brand/10 hover:opacity-90 active:scale-95 transition-all"
                      >
                        {isPosting ? <i className="fa-solid fa-spinner animate-spin"></i> : "Submit Job Post"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
         case 1: // Connect Directly on WhatsApp
          if (waView === 'invite') {
            return (
              <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3 justify-between">
                <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-100 dark:border-gray-750 space-y-3 shadow-sm text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center font-black text-white text-base mx-auto">AO</div>
                  <div>
                    <h4 className="text-[12px] font-black dark:text-white flex items-center justify-center gap-1">
                      Adekunle O.
                      <i className="fa-solid fa-circle-check text-blue-500 text-[10px]"></i>
                    </h4>
                    <p className="text-[9px] text-gray-400 font-extrabold uppercase mt-0.5">⚡ Electrician • 4.9 Rating</p>
                  </div>
                  
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 p-2.5 rounded-xl text-left">
                    <p className="text-[9px] font-black text-emerald-850 dark:text-emerald-300 uppercase tracking-widest"><i className="fa-brands fa-whatsapp mr-1 text-[11px]"></i> Direct Connection</p>
                    <p className="text-[8.5px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed mt-1">
                      To eliminate middlemen and maintain 100% zero commissions, Velgo redirects you directly to the professional's WhatsApp line.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setWaView('redirecting');
                    }}
                    className="w-full bg-[#25D366] text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 active:scale-95 transition-all"
                  >
                    <i className="fa-brands fa-whatsapp text-sm"></i> Chat on WhatsApp
                  </button>
                  <p className="text-[8px] text-gray-400 font-bold text-center">Click button to practice safe redirection</p>
                </div>
              </div>
            );
          } else if (waView === 'redirecting') {
            return (
              <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-955 border-t border-gray-100 dark:border-gray-800 p-3 justify-center items-center">
                <div className="bg-white dark:bg-gray-850 rounded-[28px] p-4 w-full text-center shadow-lg border border-gray-100 dark:border-gray-750/70 space-y-4 relative overflow-hidden animate-fadeIn">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-[#25D366]"></div>
                  
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto text-[#25D366] text-xl animate-pulse">
                    <i className="fa-brands fa-whatsapp"></i>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider">Secure Direct Chat</h3>
                    <p className="text-[7.5px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full w-max mx-auto">Redirecting to WhatsApp...</p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-normal font-bold pt-1.5">
                      Opening direct conversation with <span className="text-gray-900 dark:text-white font-black">Adekunle O.</span>
                    </p>
                  </div>

                  <div className="border-t border-gray-50 dark:border-gray-700/50 pt-3 flex flex-col items-center justify-center gap-1">
                    <p className="text-[7px] uppercase tracking-widest text-gray-400 font-extrabold">Prefilled Message Context:</p>
                    <p className="text-[8px] text-gray-500 dark:text-gray-400 font-medium italic border border-dashed border-gray-100 dark:border-gray-700/60 p-1.5 rounded-lg max-w-[180px] overflow-hidden whitespace-nowrap text-ellipsis">
                      "Hello Adekunle! I got your application for my Electrician task on Velgo..."
                    </p>
                    
                    <button
                      onClick={() => setWaView('whatsapp_chat')}
                      className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-2"
                    >
                      <i className="fa-brands fa-whatsapp text-sm"></i> Open Chat Now
                    </button>
                  </div>
                </div>
              </div>
            );
          } else {
            // Simulated WhatsApp Chat Interface
            return (
              <div className="flex flex-col h-full bg-[#efeae2] dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
                {/* Simulated WhatsApp Header */}
                <div className="bg-[#075e54] text-white p-2 pt-3 flex items-center justify-between text-xs font-black">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setWaView('invite')} className="text-white hover:opacity-80 active:scale-90 p-0.5">
                      <i className="fa-solid fa-arrow-left text-[9px]"></i>
                    </button>
                    <div className="w-5 h-5 rounded-full bg-emerald-650 flex items-center justify-center text-[7px] text-white">AO</div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black text-white">Adekunle O.</span>
                        <i className="fa-solid fa-circle text-[4px] text-green-400 animate-pulse"></i>
                      </div>
                      <span className="text-[6.5px] opacity-75 font-semibold block leading-none">WhatsApp Business • Online</span>
                    </div>
                  </div>
                  <div className="flex gap-2 text-white/80">
                    <i className="fa-solid fa-video text-[8px]"></i>
                    <i className="fa-solid fa-phone text-[8px]"></i>
                    <i className="fa-solid fa-ellipsis-vertical text-[8px]"></i>
                  </div>
                </div>

                {/* Chat message bubbles */}
                <div className="flex-1 p-2 space-y-1.5 overflow-y-auto text-[9px] font-medium">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[85%] p-2 rounded-xl text-[9px] leading-tight animate-fadeIn shadow-[0_1px_0.5px_rgba(0,0,0,0.1)] relative ${msg.sender === 'worker' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 self-start float-left border border-gray-100 dark:border-gray-700/30' : 'bg-[#d9fdd3] dark:bg-emerald-950/20 text-gray-850 dark:text-white self-end float-right'}`}
                      style={{ clear: 'both' }}
                    >
                      {msg.text}
                      <span className="text-[6px] text-gray-400 dark:text-gray-500 font-bold block text-right mt-1">14:09 ✓✓</span>
                    </div>
                  ))}

                  {isWorkerTyping && (
                    <div className="bg-white dark:bg-gray-800 border p-1.5 rounded-xl text-[8px] text-gray-400 font-bold max-w-[40%] self-start float-left animate-pulse" style={{ clear: 'both' }}>
                      typing...
                    </div>
                  )}
                </div>

                {/* Simulated Multi-Replies Options styled as customized quick-chat actions */}
                <div className="bg-[#f0f2f5] dark:bg-gray-900 p-1.5 border-t border-gray-200 dark:border-gray-800">
                  {!chosenReply ? (
                    <div className="space-y-1">
                      <p className="text-[7.5px] font-black text-gray-450 uppercase tracking-wider text-center">Conclude safe WhatsApp terms:</p>
                      <button
                        onClick={() => {
                          setChosenReply('materials');
                          const clientMsg = "How will we purchase components safely?";
                          setChatMessages(prev => [...prev, { sender: 'client', text: clientMsg }]);
                          setIsWorkerTyping(true);
                          setTimeout(() => {
                            setIsWorkerTyping(false);
                            setChatMessages(prev => [
                              ...prev,
                              { sender: 'worker', text: "Let's co-buy material near Alaba market or I provide direct retail vendor invoices. It's safe so you don't overspend." }
                            ]);
                          }, 1000);
                        }}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 p-1.5 rounded-lg text-left text-[8.5px] font-black text-gray-700 dark:text-gray-300 active:scale-[0.98] duration-150"
                      >
                        "How will we purchase components safely?"
                      </button>
                      <button
                        onClick={() => {
                          setChosenReply('deal');
                          const clientMsg = "I agree to ₦12k labor work + ₦1.5k logistics fuel. It is a deal.";
                          setChatMessages(prev => [...prev, { sender: 'client', text: clientMsg }]);
                          setIsWorkerTyping(true);
                          setTimeout(() => {
                            setIsWorkerTyping(false);
                            setChatMessages(prev => [
                              ...prev,
                              { sender: 'worker', text: "Perfect boss! Packing my electric diagnostic set, will send my verified location. On my way! ✓" }
                            ]);
                          }, 1000);
                        }}
                        className="w-full bg-emerald-600/10 hover:bg-emerald-650/20 p-1.5 rounded-lg text-left text-[8.5px] font-black text-emerald-650 dark:text-emerald-450 active:scale-[0.98] duration-150"
                      >
                        "Agree with ₦12k labor & ₦1.5k transport"
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-0.5">
                      <button
                        onClick={() => {
                          setChatMessages([{ sender: 'worker', text: "Hello boss! I saw your request. I can fix this electric issue today." }]);
                          setChosenReply(null);
                        }}
                        className="text-[7.5px] font-black uppercase text-brand bg-brand/10 px-2.5 py-1 rounded-lg active:scale-95 duration-100"
                      >
                        Restart Chat Demo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

        case 2: // Materials Protocol
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
              <div className="p-3 bg-white dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 flex justify-between items-center">
                <span className="text-[10px] font-black dark:text-white">Safety Settings</span>
                <div className="flex bg-slate-100 dark:bg-gray-800 rounded-lg p-0.5 border dark:border-gray-700">
                  <button
                    onClick={() => setSafetyToggle('risky')}
                    className={`text-[8px] font-black px-2 py-1 rounded-md transition-all ${safetToggle === 'risky' ? 'bg-red-550 text-white shadow-sm' : 'text-gray-400'}`}
                  >
                    Risky
                  </button>
                  <button
                    onClick={() => setSafetyToggle('safe')}
                    className={`text-[8px] font-black px-2 py-1 rounded-md transition-all ${safetToggle === 'safe' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400'}`}
                  >
                    Velgo Safe
                  </button>
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-center">
                {safetToggle === 'risky' ? (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-4 rounded-2xl space-y-2.5 animate-fadeIn text-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/60 flex items-center justify-center text-red-650 mx-auto text-sm animate-pulse">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-red-800 dark:text-red-300">Materials Cash Advance Risks</p>
                      <p className="text-[9px] text-red-600/80 dark:text-red-400/80 font-semibold leading-normal mt-1">
                        Sending cash for electrical components or plumbing pipes upfront to an unverified handler often results in inflated receipts or lost contacts.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-4 rounded-2xl space-y-2.5 animate-fadeIn text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-650 mx-auto text-sm">
                      <i className="fa-solid fa-circle-check"></i>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 text-center">Velgo Co-Buying Strategy</p>
                      <p className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold leading-normal mt-1">
                        Meet the verified professional near local markets (e.g., Alaba, Oshodi, or local market structures). Standardize buying by paying dealers yourself and keeping original receipts!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );

        case 3: // Verify bank names
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              {/* Top Velgo Account Details UI */}
              <div className="p-3 bg-white dark:bg-gray-850 m-2 rounded-xl border border-gray-100 dark:border-gray-750 space-y-2 shadow-sm">
                <div className="flex items-center gap-1.5 border-b border-gray-50 dark:border-gray-700/50 pb-1.5">
                  <VelgoLogo className="h-3" />
                  <span className="text-[8px] font-black text-brand uppercase tracking-wider">Verified Receiver Account</span>
                </div>
                <div className="text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold text-[9px]">Bank Family:</span>
                    <span className="font-extrabold dark:text-gray-200">Guaranty Trust Bank (GTB)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold text-[9px]">Account ID:</span>
                    <span className="font-extrabold text-blue-500 underline decoration-dotted">0124859372</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold text-[9px]">Official Name:</span>
                    <span className="font-black text-slate-800 dark:text-white uppercase">AMINA BALOGUN SUNDAY</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Bank App Simulator Screen */}
              <div className="flex-1 bg-slate-900 p-3 m-2 rounded-xl text-white flex flex-col justify-between text-xs font-semibold relative">
                <div className="border-b border-white/10 pb-1 flex justify-between items-center">
                  <span className="text-[8px] tracking-widest uppercase font-black text-white/50">Simulated Bank App</span>
                  <i className="fa-solid fa-lock text-[8px] text-white/45"></i>
                </div>

                <div className="my-auto space-y-2 text-center py-2">
                  <div className="bg-white/5 p-2 rounded-lg border border-white/10 space-y-1">
                    <p className="text-[8px] text-white/50">Sending Fund</p>
                    <p className="text-[14px] font-black text-emerald-400">₦13,500.00</p>
                    <p className="text-[8px] text-white/70 italic bg-white/5 py-1 rounded">GTBank • 0124859372</p>
                  </div>

                  {bankMatchState === 'unverified' && (
                    <button
                      onClick={() => {
                        setIsVerifyingBank(true);
                        setBankMatchState('matching');
                        setTimeout(() => {
                          setIsVerifyingBank(false);
                          setBankMatchState('matched');
                        }, 1200);
                      }}
                      className="w-full bg-emerald-600 py-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wide duration-200 hover:brightness-110 active:scale-95"
                    >
                      Retrieve Bank Name
                    </button>
                  )}

                  {bankMatchState === 'matching' && (
                    <div className="text-[9px] text-emerald-300 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                      <i className="fa-solid fa-spinner animate-spin"></i> Loading account logs...
                    </div>
                  )}

                  {bankMatchState === 'matched' && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <p className="text-[8px] text-white/60">Bank ledger name returned:</p>
                      <p className="text-[10px] bg-emerald-500/10 text-emerald-400 font-black tracking-wide border border-emerald-500/20 py-1 rounded">
                        ✓ AMINA BALOGUN SUNDAY
                      </p>
                      <span className="text-[8px] text-emerald-300 font-black block leading-tight">
                        MATCHES VELGO PROFILE RECORD! Safe to Send.
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[7px] text-white/40">
                  <span>Zero-cost Ledger Validation</span>
                  {bankMatchState === 'matched' && (
                    <button
                      onClick={() => setBankMatchState('unverified')}
                      className="text-[7px] font-bold text-white/60 underline uppercase active:scale-95 transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          );

        case 4: // Safe Escrow & Completion
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3 justify-between">
              <div className="bg-white dark:bg-gray-850 p-3 rounded-2xl border border-gray-100 dark:border-gray-750 space-y-3 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-700/50 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Active Task</span>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${taskStatus === 'in_progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 animate-pulse'}`}>
                    {taskStatus === 'in_progress' ? "In Progress" : "Completed"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <h4 className="text-[11px] font-black dark:text-white">DB Box Cable Setup</h4>
                    <p className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">Professional: Tunde Alao</p>
                  </div>
                  <div className="flex justify-between bg-slate-50 dark:bg-gray-900 p-2 border border-gray-100 dark:border-gray-750 rounded-lg text-[9px] font-bold text-gray-500">
                    <span>Labor Budget</span>
                    <span className="font-black text-brand">₦15,000</span>
                  </div>
                </div>

                {taskStatus === 'in_progress' ? (
                  <button
                    onClick={() => {
                      setTaskStatus('completed');
                    }}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-lg hover:opacity-95"
                  >
                    Confirm Job Completion ✓
                  </button>
                ) : (
                  <div className="space-y-3 border-t border-gray-50 dark:border-gray-700/50 pt-2.5 animate-fadeIn">
                    {!showRatingSuccess ? (
                      <>
                        <p className="text-[9px] text-center font-black uppercase tracking-wider text-gray-400 mb-1">Rate Suleiman's Work</p>
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setSelectedRating(star)}
                              className={`text-sm ${star <= selectedRating ? 'text-amber-500 animate-bounce' : 'text-gray-200 dark:text-gray-700'}`}
                            >
                              <i className="fa-solid fa-star"></i>
                            </button>
                          ))}
                        </div>
                        {selectedRating > 0 && (
                          <button
                            onClick={() => setShowRatingSuccess(true)}
                            className="w-full bg-brand text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest motion-safe:animate-pulse mt-1"
                          >
                            Submit Rating
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-100 dark:border-emerald-900 p-3 rounded-xl text-center space-y-1 animate-fadeIn">
                        <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-300">Rating cast: {selectedRating}/5 Stars! ✓</p>
                        <p className="text-[8px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold leading-normal">
                          Feedback securely registered to build Nigerian professional history!
                        </p>
                        <button
                          onClick={() => {
                            setTaskStatus('in_progress');
                            setSelectedRating(0);
                            setShowRatingSuccess(false);
                          }}
                          className="text-[7px] text-emerald-700 dark:text-emerald-300 font-extrabold uppercase hover:underline block mx-auto pt-1.5"
                        >
                          Restart Flow
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[8px] text-center text-gray-400 font-bold italic leading-tight">
                "Direct payments build immediate local trust."
              </div>
            </div>
          );

        case 5: // Trust verification badge
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-905 border-t border-gray-100 dark:border-gray-800 p-3 justify-center relative">
              <div className="bg-white dark:bg-gray-855 p-4 rounded-[28px] border border-gray-100 dark:border-gray-750 space-y-3.5 shadow-md max-w-[240px] mx-auto text-center">
                <div className="relative w-14 h-14 mx-auto">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white text-lg">
                    SY
                  </div>
                  {/* Verified checkmark badge */}
                  <button
                    onClick={() => setShowNinTooltip(!showNinTooltip)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white dark:border-gray-800 shadow animate-bounce focus:outline-none"
                    title="Click for safety details"
                  >
                    <i className="fa-solid fa-circle-check text-xs"></i>
                  </button>
                </div>

                <div>
                  <h3 className="text-xs font-black dark:text-white">Suleiman Yusuf</h3>
                  <p className="text-[9px] text-gray-400 font-extrabold uppercase">🪚 Professional Carpenter</p>
                </div>

                <div className="flex justify-center gap-1 text-[9px] font-black text-amber-500">
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                  <span className="text-gray-400 font-bold ml-1">(12 Hires)</span>
                </div>

                {showNinTooltip && (
                  <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/30 text-left space-y-1 animate-fadeIn">
                    <p className="text-[9px] font-black text-blue-800 dark:text-blue-300"><i className="fa-solid fa-shield-halved mr-1"></i> NIMC Verified NIN</p>
                    <p className="text-[8px] text-blue-600/95 dark:text-blue-400 font-semibold leading-relaxed">
                      Suleiman's government identity bio has been checked against federal registers, locking-down digital trust during home visits.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowNinTooltip(!showNinTooltip)}
                  className="text-[8px] font-black uppercase text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all w-full"
                >
                  {showNinTooltip ? "Dismiss" : "Tap checkmark details"}
                </button>
              </div>
            </div>
          );

        default:
          return null;
      }
    } else {
      // Worker Slides simulator screens
      switch (step) {
        case 0: // Clean high-grade profile
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="p-2.5 bg-white dark:bg-gray-850 m-2 rounded-xl border border-gray-100 dark:border-gray-750 flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-gray-400">Profile Blueprint</span>
                <button
                  onClick={() => setIsPremiumProfile(!isPremiumProfile)}
                  className={`text-[8px] font-black px-2.5 py-1.5 rounded-lg transition-all ${isPremiumProfile ? 'bg-brand text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white/70'}`}
                >
                  {isPremiumProfile ? "Premium View (Hires x4)" : "Ordinary Profile"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {!isPremiumProfile ? (
                  <div className="bg-white dark:bg-gray-850 p-3 rounded-xl border border-gray-100 dark:border-gray-750 space-y-2 text-center text-gray-400">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto text-sm">—</div>
                    <div>
                      <p className="text-[11px] font-black text-gray-600 dark:text-white">Alhaji Musa</p>
                      <p className="text-[8px] font-semibold italic text-red-400">Incomplete bio & missing categories</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-gray-900 p-2 border border-gray-100 dark:border-gray-750 text-left rounded-lg text-[9px] leading-tight">
                      "i do AC wiring work call me 080..."
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-850 p-3 rounded-xl border border-brand/20 dark:border-brand/35 space-y-2.5 text-center animate-fadeIn shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center mx-auto text-white text-xs font-black ring-2 ring-brand/10">AM</div>
                    <div>
                      <div className="flex items-center justify-center gap-1 leading-none">
                        <p className="text-[11px] font-black text-gray-800 dark:text-white">Alhaji Musa</p>
                        <i className="fa-solid fa-circle-check text-blue-500 text-[10px]"></i>
                      </div>
                      <p className="text-[8px] text-brand uppercase font-black tracking-widest mt-0.5">AC repair & refrigeration specialist</p>
                    </div>

                    <div className="flex justify-center gap-1">
                      <span className="bg-brand/10 text-brand px-1.5 py-0.5 rounded text-[7px] font-black">⚡ Cooling Systems</span>
                      <span className="bg-slate-100 dark:bg-gray-800 text-slate-500 px-1.5 py-0.5 rounded text-[7px] font-bold">⚡ Rewiring</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-gray-900 p-2 border border-gray-100 dark:border-gray-755 text-left rounded-lg text-[9px] text-gray-600 dark:text-gray-300 leading-normal font-medium">
                      "NIMIC Verified AC technician with 8 years of workshop field experience in Benin. Specialists in split units and central chillers."
                    </div>
                  </div>
                )}
              </div>
            </div>
          );

        case 1: // NIN Document
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3 justify-between">
              <div className="bg-white dark:bg-gray-850 p-3 rounded-xl border border-gray-100 dark:border-gray-750 space-y-2 shadow-sm text-center">
                <i className="fa-solid fa-id-card text-brand text-2xl"></i>
                <h4 className="text-[11px] font-black dark:text-white">NIMC Identity Linkage</h4>
                <p className="text-[9px] text-gray-400 font-semibold leading-relaxed">
                  Enter your 11-digit NIN safely. Your data is verified through encrypted secure pipelines in compliance with security guidelines.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-850 p-3 rounded-xl border border-gray-100 dark:border-gray-750 space-y-2.5">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">National ID Number (NIN)</span>
                  <input
                    type="text"
                    maxLength={11}
                    value={ninInput}
                    onChange={(e) => setNinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 11-digit NIN"
                    disabled={isNinVerifying || isNinVerified}
                    className="w-full bg-slate-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-700 rounded-lg p-2 text-[10px] font-mono outline-none text-gray-800 dark:text-white placeholder-gray-400"
                  />
                </div>

                {!isNinVerified ? (
                  <button
                    onClick={() => {
                      if (ninInput.length < 11) return;
                      setIsNinVerifying(true);
                      setTimeout(() => {
                        setIsNinVerifying(false);
                        setIsNinVerified(true);
                      }, 1305);
                    }}
                    disabled={isNinVerifying || ninInput.length < 11}
                    className="w-full bg-brand text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 duration-200 active:scale-95 disabled:opacity-50"
                  >
                    {isNinVerifying ? (
                      <>
                        <i className="fa-solid fa-circle-notch animate-spin"></i> Checking NIMC...
                      </>
                    ) : (
                      "Confirm & Link Identity"
                    )}
                  </button>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-100 dark:border-emerald-900 p-2.5 rounded-xl text-center space-y-1 animate-fadeIn">
                    <p className="text-[10px] font-black text-emerald-850 dark:text-emerald-300">
                      <i className="fa-solid fa-circle-check-check mr-1.5"></i> Verification Approved!
                    </p>
                    <span className="text-[8px] text-emerald-600/90 dark:text-emerald-400/90 font-bold block">
                      Verified Identity badge is now publicly highlighted in search results to attract clients.
                    </span>
                  </div>
                )}
              </div>

              <div className="text-center">
                {!isNinVerified ? (
                  <p className="text-[8px] text-gray-400 font-bold">Type 11 numbers above to practice.</p>
                ) : (
                  <button onClick={() => { setNinInput(''); setIsNinVerified(false); }} className="text-[7px] font-extrabold uppercase text-gray-400 tracking-wider hover:underline">Reset demo</button>
                )}
              </div>
            </div>
          );

        case 2: // Direct Token Applications
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="p-2.5 bg-brand text-white text-xs font-black">
                📍 Jobs Open in Gbagada
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {!hasAppliedToJob ? (
                  <div className="bg-white dark:bg-gray-850 p-3 rounded-xl border border-gray-100 dark:border-gray-750 space-y-2.5 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">Appliance Fix</span>
                      <span className="text-[9px] font-extrabold text-brand">₦15,000</span>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black dark:text-white">Fridge compressor leaking gas</h4>
                      <p className="text-[8px] text-gray-400 font-semibold mt-0.5">Wande Street, Gbagada • 2 km away</p>
                    </div>

                    {!isApplying ? (
                      <button
                        onClick={() => {
                          setIsApplying(true);
                          setTimeout(() => {
                            setIsApplying(false);
                            setHasAppliedToJob(true);
                          }, 1205);
                        }}
                        className="w-full bg-brand text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-brand/10"
                      >
                        Submit Direct Application
                      </button>
                    ) : (
                      <div className="text-[9px] text-brand font-bold text-center animate-pulse">
                        <i className="fa-solid fa-circle-notch animate-spin"></i> Dispatching application...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-100 dark:border-emerald-900 p-4 rounded-xl text-center space-y-2.5 animate-fadeIn">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-800 dark:text-emerald-300 mx-auto">
                      ✓
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-300">Application Dispatched! ✓</p>
                      <p className="text-[8px] text-emerald-600/80 dark:text-emerald-400/80 font-semibold leading-normal">
                        Your professional profile is shared. The client is notified and can tap to connect with you on WhatsApp!
                      </p>
                    </div>
                    <button
                      onClick={() => setHasAppliedToJob(false)}
                      className="text-[7px] font-black uppercase text-emerald-700 dark:text-emerald-300 hover:underline mx-auto block pt-1"
                    >
                      Reset demo
                    </button>
                  </div>
                )}
              </div>
            </div>
          );

        case 3: // Clarify travel & parts
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3 justify-between">
              <div className="bg-white dark:bg-gray-850 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750 shadow-sm space-y-1 text-center">
                <i className="fa-solid fa-map-location-dot text-brand text-lg"></i>
                <h4 className="text-[10px] font-black dark:text-white">Pre-Transit Checklist</h4>
                <p className="text-[8px] text-gray-400 font-semibold">
                  Complete these safety habits before starting transport to any location in Nigeria.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-850 p-3 rounded-xl border border-gray-150 dark:border-gray-750 space-y-2">
                <label className="flex items-start gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-gray-900 rounded-lg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={travelChecks.transport}
                    onChange={(e) => setTravelChecks(prev => ({ ...prev, transport: e.target.checked }))}
                    className="mt-0.5 rounded text-brand focus:ring-brand h-3 w-3"
                  />
                  <div>
                    <p className="text-[9px] font-black dark:text-gray-200">Clarified Transport Fee</p>
                    <p className="text-[7.5px] text-gray-400 font-semibold">Agreed on fare in case client cancels job on-site.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-gray-900 rounded-lg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={travelChecks.address}
                    onChange={(e) => setTravelChecks(prev => ({ ...prev, address: e.target.checked }))}
                    className="mt-0.5 rounded text-brand focus:ring-brand h-3 w-3"
                  />
                  <div>
                    <p className="text-[9px] font-black dark:text-gray-200">Confirmed House Address</p>
                    <p className="text-[7.5px] text-gray-400 font-semibold">Verified exact street landmark in active Chat.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-gray-900 rounded-lg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={travelChecks.supplies}
                    onChange={(e) => setTravelChecks(prev => ({ ...prev, supplies: e.target.checked }))}
                    className="mt-0.5 rounded text-brand focus:ring-brand h-3 w-3"
                  />
                  <div>
                    <p className="text-[9px] font-black dark:text-gray-200">Materials Responsibility</p>
                    <p className="text-[7.5px] text-gray-400 font-semibold">Decided who funds supplies upfront.</p>
                  </div>
                </label>
              </div>

              {travelChecks.transport && travelChecks.address && travelChecks.supplies ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-100 dark:border-emerald-900 p-2 rounded-lg text-center text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest animate-fadeIn animate-bounce">
                  🚀 Ready to Move Safely!
                </div>
              ) : (
                <p className="text-[8px] text-center text-gray-450 font-bold italic">
                  Tap all checklist circles to practice prep strategy.
                </p>
              )}
            </div>
          );

        case 4: // Bank pay
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3 justify-between">
              <div className="bg-white dark:bg-gray-850 p-3 rounded-xl border border-gray-100 dark:border-gray-750 shadow-sm text-center space-y-1">
                <i className="fa-solid fa-building-columns text-brand text-xl"></i>
                <h4 className="text-[10px] font-black dark:text-white">Naira Settlement Bank</h4>
                <p className="text-[8px] text-gray-400 font-semibold">
                  Velgo is zero commission. Set your correct banking parameters below so clients pay you directly.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-855 p-3 rounded-xl border border-gray-150 dark:border-gray-750 space-y-2">
                <div className="space-y-1">
                  <span className="text-[7.5px] font-black text-gray-400 uppercase">Deposit Bank</span>
                  <select disabled className="w-full bg-slate-50 dark:bg-gray-900 border text-[9px] p-2 rounded-lg font-black outline-none text-gray-700 dark:text-gray-300">
                    <option>Zenith Bank Plc</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[7.5px] font-black text-gray-400 uppercase">Account Code</span>
                  <input
                    type="text"
                    disabled
                    value="2109485736"
                    className="w-full bg-slate-50 dark:bg-gray-900 border text-[9px] p-2 rounded-lg font-bold outline-none text-gray-500"
                  />
                </div>

                {bankAccountVerified ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-100 dark:border-emerald-900 p-2.5 rounded-lg text-center space-y-1 animate-fadeIn">
                    <p className="text-[9px] font-black text-emerald-800 dark:text-emerald-300">✓ Account linked!</p>
                    <p className="text-[7.5px] text-gray-450 dark:text-gray-400 uppercase font-black tracking-wide leading-none">MUSA IBRAHIM ABIOLA</p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsBankSaving(true);
                      setTimeout(() => {
                        setIsBankSaving(false);
                        setBankAccountVerified(true);
                      }, 1100);
                    }}
                    disabled={isBankSaving}
                    className="w-full bg-brand text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 duration-200"
                  >
                    {isBankSaving ? <i className="fa-solid fa-spinner animate-spin"></i> : "Resolve Bank details"}
                  </button>
                )}
              </div>

              {bankAccountVerified && (
                <button
                  onClick={() => setBankAccountVerified(false)}
                  className="text-[7.5px] font-bold text-gray-400 underline uppercase hover:text-gray-650 tracking-wider block mx-auto"
                >
                  Configure alternative
                </button>
              )}
            </div>
          );

        case 5: // Physical Safety Habits
          return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-904 border-t border-gray-100 dark:border-gray-800 p-3 justify-between">
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100/40 dark:border-red-900/30 p-2.5 rounded-xl text-center space-y-1">
                <p className="text-[10px] font-black text-red-800 dark:text-red-300"><i className="fa-solid fa-shield-heart-pulse mr-1"></i> Velgo Safety Center</p>
                <p className="text-[8px] text-red-600/90 dark:text-red-400/90 font-semibold leading-relaxed">
                  Protecting local workforce partners via real-time tracking widgets and secure contacts.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setLocationShared(!locationShared)}
                  className={`w-full p-2.5 rounded-xl border text-[9px] font-black uppercase text-left flex justify-between items-center transition-all ${locationShared ? 'bg-emerald-600 text-white border-transparent shadow shadow-emerald-500/20' : 'bg-white dark:bg-gray-850 dark:border-gray-750 text-gray-700 dark:text-gray-300 border-gray-150'}`}
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-location-arrow"></i>
                    {locationShared ? "Live location is Sharing" : "Share Live location"}
                  </span>
                  {locationShared ? "Active ✓" : "Off"}
                </button>

                <button
                  onClick={() => setSafetyCheckset(!safetyCheckset)}
                  className={`w-full p-2.5 rounded-xl border text-[9px] font-black uppercase text-left flex justify-between items-center transition-all ${safetyCheckset ? 'bg-yellow-500 text-slate-900 border-transparent shadow shadow-yellow-500/20' : 'bg-white dark:bg-gray-855 dark:border-gray-750 text-gray-700 dark:text-gray-300 border-gray-150'}`}
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left"></i>
                    {safetyCheckset ? "Check-in Alarm armed" : "Arm Safe-Check Timer"}
                  </span>
                  {safetyCheckset ? "Active ✓" : "Armed"}
                </button>
              </div>

              <div className="text-[7.5px] text-center text-gray-400 font-bold leading-normal italic">
                {locationShared ? "Emergency contacts can track your transit routes in real-time." : "Emergency widgets can be activated with a single tap in settings."}
              </div>
            </div>
          );

        default:
          return null;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fadeIn">
      {/* Premium wider container on desktop for beautiful split panels, max-w-sm on mobile */}
      <div className="bg-white dark:bg-gray-800 rounded-[32px] md:rounded-[40px] w-full max-w-sm md:max-w-3xl overflow-hidden shadow-2xl relative min-h-[500px] flex flex-col md:flex-row transition-all duration-300 border border-gray-100 dark:border-gray-700/50">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-40 w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 text-gray-850 dark:text-white flex items-center justify-center hover:bg-black/20 focus:outline-none transition-colors"
          aria-label="Close Guide"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {!role ? (
          /* Landing Screen: Choose Role to view guide */
          <div className="p-8 md:p-12 flex flex-col items-center justify-center flex-1 space-y-6 text-center w-full">
            <VelgoLogo className="h-12 mb-2" />
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Velgo Step-by-Step Guide</h2>
              <p className="text-xs md:text-sm text-gray-400 dark:text-gray-400 font-extrabold uppercase tracking-widest mt-1">High-Fidelity Interactive Tour</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-450 font-medium max-w-md mx-auto leading-relaxed">
              Understand our security mechanics, pre-transit safety checklists, and direct-to-bank validation protocols. Pure client-pro trust.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl pt-4">
              <button 
                onClick={() => setRole('employer')} 
                className="bg-brand text-white p-6 rounded-[24px] shadow-xl shadow-brand/15 hover:shadow-brand/25 active:scale-95 transition-all text-left flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform"><i className="fa-solid fa-user-tie"></i></div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-75 text-white/80">Guide for</p>
                  <p className="text-lg font-black">Hiring Pro-Talent</p>
                </div>
              </button>

              <button 
                onClick={() => setRole('worker')} 
                className="bg-gray-900 dark:bg-gray-700 text-white p-6 rounded-[24px] shadow-xl hover:bg-gray-850 dark:hover:bg-gray-650 active:scale-95 transition-all text-left flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center text-xl group-hover:scale-110 transition-transform"><i className="fa-solid fa-helmet-safety"></i></div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-75 text-white/80">Guide for</p>
                  <p className="text-lg font-black">Earning Money</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Slide View with Interactive Simulator Split Screen on Desktop */
          <>
            {/* Left Panel: Instructions with navigation */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-750/70 bg-white dark:bg-gray-800 transition-colors">
              <div className="space-y-4 pt-4 md:pt-6">
                {/* Back to Role Selection */}
                <button 
                  onClick={() => { setRole(null); setStep(0); }} 
                  className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-850 text-gray-500 dark:text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 w-fit"
                >
                  <i className="fa-solid fa-arrow-left"></i> Switch Role
                </button>

                {/* Counter indicator */}
                <div className="inline-flex items-center gap-2 bg-brand/10 text-brand dark:bg-brand/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-ping"></div>
                  <span>Step {step + 1} of {activeSlides.length}</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{activeSlides[step].title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                    {activeSlides[step].text}
                  </p>
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 p-4 rounded-2xl flex gap-3 my-4 items-start">
                <i className="fa-solid fa-wand-magic-sparkles text-amber-500 text-sm mt-0.5 animate-pulse"></i>
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Interactive Demo instruction</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                    {activeSlides[step].subtitle}
                  </p>
                </div>
              </div>

              {/* Progress dots & Next buttons */}
              <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700/50 pt-4 mt-auto">
                <button 
                  onClick={() => { if (step > 0) setStep(step - 1); }} 
                  disabled={step === 0}
                  className={`text-gray-400 font-black text-[10px] uppercase tracking-widest p-2 focus:outline-none ${step === 0 ? 'opacity-20 pointer-events-none' : 'hover:text-gray-600 dark:hover:text-white'}`}
                >
                  Back
                </button>

                {/* Sliders progress line */}
                <div className="flex gap-1.5">
                  {activeSlides.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setStep(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-brand' : 'w-1.5 bg-gray-200 dark:bg-gray-700'}`}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                </div>

                <button 
                  onClick={() => {
                    if (step < activeSlides.length - 1) setStep(step + 1);
                    else onClose();
                  }}
                  className="px-6 py-3 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-brand/10 hover:opacity-90 active:scale-95 transition-all"
                >
                  {step === activeSlides.length - 1 ? "Start Using App" : "Next"}
                </button>
              </div>
            </div>

            {/* Right Panel: Beautiful Simulated phone viewport */}
            <div className="w-full md:w-1/2 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6 md:p-8 select-none transition-colors">
              {/* Sleek Device frame */}
              <div className="bg-slate-950 p-2.5 rounded-[38px] shadow-2xl border-4 border-slate-900 w-full max-w-[260px] aspect-[9/18] min-h-[420px] flex flex-col overflow-hidden relative">
                {/* Dynamic Camera Notch & Speaker Grill */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-b-[18px] z-50 flex justify-center items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-900"></div>
                  <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
                </div>

                {/* Internal UI Container simulating real app screen */}
                <div className="bg-white dark:bg-gray-900 rounded-[28px] overflow-hidden flex-1 flex flex-col relative pt-4 text-gray-900 dark:text-gray-100 transition-colors duration-200">
                  
                  {/* Smartphone Top Status Bar info */}
                  <div className="bg-transparent px-4 py-1.5 flex justify-between items-center text-[8px] font-black opacity-60 absolute top-0 left-0 w-full z-40 text-gray-600 dark:text-gray-400">
                    <span>14:07</span>
                    <div className="flex items-center gap-1">
                      <i className="fa-solid fa-wifi text-[7px]"></i>
                      <div className="flex items-center gap-0.5">
                        <i className="fa-solid fa-battery-three-quarters text-[8px]"></i>
                        <span>82%</span>
                      </div>
                    </div>
                  </div>

                  {/* Body area containing active simulated step screen view */}
                  <div className="flex-1 overflow-hidden pt-1">
                    {renderSimulatedApp()}
                  </div>

                  {/* Smartphone Bottom home indicator pill */}
                  <div className="h-4 bg-transparent flex justify-center items-center pb-1">
                    <div className="w-16 h-1 bg-gray-305 dark:bg-gray-750 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
