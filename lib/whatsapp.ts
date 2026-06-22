/**
 * Highly robust utility to trigger deep links to native WhatsApp.
 * Optimized for Progressive Web Apps (PWAs), mobile web, and desktop browsers.
 */
export const formatNigerianPhoneForWhatsApp = (phoneNumber: string): string => {
  // 1. Remove all non-numeric characters
  let clean = phoneNumber.replace(/[^0-9]/g, '');

  // 2. If it starts with '0' (but not '00') and has length of 10 or 11 (standard Nigerian local numbers):
  //    e.g. '09167799600' -> strip the leading '0' and prepend '234'
  if (clean.startsWith('0') && !clean.startsWith('00')) {
    clean = '234' + clean.slice(1);
  }

  // 3. If it has 10 digits and starts with a standard Nigerian mobile digit (7, 8, 9),
  //    it means it was entered without the leading zero (e.g., '9167799600'). Prepend '234'.
  if (clean.length === 10 && (clean.startsWith('7') || clean.startsWith('8') || clean.startsWith('9'))) {
    clean = '234' + clean;
  }

  // 4. If it starts with '2340' (mistaken duplicate country code + local leading zero):
  //    e.g. '23409167799600' -> convert to '2349167799600'
  if (clean.startsWith('2340')) {
    clean = '234' + clean.slice(4);
  }

  return clean;
};

export const openWhatsAppHelper = (message: string, phoneNumber: string = '2349167799600', partnerName: string = 'Velgo Support') => {
  const cleanPhone = formatNigerianPhoneForWhatsApp(phoneNumber);
  const encodedText = encodeURIComponent(message);
  
  // Use api.whatsapp.com which triggers deep-linking handlers more reliably on some devices
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  
  // Create modal element dynamically
  const modalId = 'velgo-whatsapp-redirect-overlay';
  
  // Safely remove any existing overlay to prevent duplicates
  const existing = document.getElementById(modalId);
  if (existing) {
    document.body.removeChild(existing);
  }
  
  const overlay = document.createElement('div');
  overlay.id = modalId;
  overlay.className = 'fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center p-6 backdrop-blur-md animate-fadeIn font-sans';
  
  let countdown = 3;
  
  overlay.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-[40px] p-8 w-full max-w-sm text-center shadow-2xl border border-gray-100 dark:border-gray-700 space-y-6 relative overflow-hidden transition-all duration-300 transform scale-95 opacity-0" id="velgo-redirect-card">
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-[#25D366]"></div>
      
      <!-- WhatsApp Icon Wrapper with Pulse/Bounce -->
      <div class="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-[#25D366] text-3xl animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16" class="animate-bounce mt-1">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.948h.003c4.368 0 7.927-3.559 7.93-7.93a7.897 7.897 0 0 0-2.333-5.592M7.994 14.522a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.98c-.202-.1-1.194-.59-1.371-.653-.177-.062-.307-.094-.438.096-.13.19-.507.653-.622.784-.114.13-.23.147-.432.047-.202-.1-1.025-.378-1.954-1.206-.726-.647-1.216-1.448-1.36-1.697-.143-.248-.015-.383.11-.483.11-.09.252-.292.378-.438.113-.146.153-.25.23-.417.076-.166.038-.31-.019-.41-.059-.1-1.178-2.841-1.371-3.3-.18-.435-.363-.377-.498-.383-.127-.006-.275-.008-.423-.008-.148 0-.388.056-.59.278-.204.22-.78.761-.78 1.854 0 1.093.796 2.147.907 2.3.111.15 1.565 2.39 3.791 3.354.529.227.94.362 1.258.463.53.169.102.145.71.055.672-.1 1.371-.56 1.564-1.1.192-.54.192-1.002.135-1.1-.057-.1-.212-.19-.415-.29M14 0a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1z"/>
        </svg>
      </div>
  
      <div class="space-y-2 font-sans text-center">
        <h3 class="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Secure Direct Chat</h3>
        <p class="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full w-max mx-auto" id="velgo-redirect-status">
          Redirecting in ${countdown}s...
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-bold pt-2">
          Opening safe and direct conversation thread with <span class="text-gray-900 dark:text-white font-black">${partnerName}</span>.
        </p>
      </div>
  
      <div class="border-t border-gray-100 dark:border-gray-700/50 pt-4 flex flex-col items-center justify-center gap-1 font-sans">
        <p class="text-[8px] uppercase tracking-widest text-gray-400 font-extrabold mb-1">Prefilled Message Context:</p>
        <p class="text-[9px] text-gray-500 dark:text-gray-400 font-medium italic border border-dashed border-gray-100 dark:border-gray-700/60 p-2.5 rounded-lg max-w-[250px] overflow-hidden whitespace-nowrap text-ellipsis mb-4" title="${message}">
          "${message}"
        </p>
        
        <button id="velgo-wa-btn-open" class="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
          <svg class="w-4 h-4 animate-bounce" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.948h.003c4.368 0 7.927-3.559 7.93-7.93a7.897 7.897 0 0 0-2.333-5.592M7.994 14.522a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.98c-.202-.1-1.194-.59-1.371-.653-.177-.062-.307-.094-.438.096-.13.19-.507.653-.622.784-.114.13-.23.147-.432.047-.202-.1-1.025-.378-1.954-1.206-.726-.647-1.216-1.448-1.36-1.697-.143-.248-.015-.383.11-.483.11-.09.252-.292.378-.438.113-.146.153-.25.23-.417.076-.166.038-.31-.019-.41-.059-.1-1.178-2.841-1.371-3.3-.18-.435-.363-.377-.498-.383-.127-.006-.275-.008-.423-.008-.148 0-.388.056-.59.278-.204.22-.78.761-.78 1.854 0 1.093.796 2.147.907 2.3.111.15 1.565 2.39 3.791 3.354.529.227.94.362 1.258.463.53.169.102.145.71.055.672-.1 1.371-.56 1.564-1.1.192-.54.192-1.002.135-1.1-.057-.1-.212-.19-.415-.29M14 0a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1z"/></svg>
          Open Chat Now
        </button>
        <button id="velgo-wa-btn-cancel" class="mt-2 text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 tracking-wider transition-colors pt-2 cursor-pointer">
          Stay on Velgo
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Clean entrance animation
  const card = document.getElementById('velgo-redirect-card');
  setTimeout(() => {
    if (card) {
      card.classList.remove('scale-95', 'opacity-0');
      card.classList.add('scale-100', 'opacity-100');
    }
  }, 10);
  
  // Native deep link trigger function
  const doRedirect = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = (window.navigator as any).standalone === true || 
                         window.matchMedia('(display-mode: standalone)').matches;
    const isSafari = navigator.userAgent.toLowerCase().includes('safari') && 
                      !navigator.userAgent.toLowerCase().includes('chrome') && 
                      !navigator.userAgent.toLowerCase().includes('chromium');
  
    if (isIOS || isStandalone || isSafari) {
      window.location.href = waUrl;
    } else {
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  // Setup real-time timer
  const interval = setInterval(() => {
    countdown -= 1;
    const badge = document.getElementById('velgo-redirect-status');
    if (badge) {
      badge.innerHTML = `Redirecting in ${countdown}s...`;
    }
    
    if (countdown <= 0) {
      clearInterval(interval);
      doRedirect();
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }
  }, 1000);
  
  // Synchronous buttons logic
  const btnOpen = document.getElementById('velgo-wa-btn-open');
  if (btnOpen) {
    btnOpen.onclick = () => {
      clearInterval(interval);
      doRedirect();
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };
  }
  
  const btnCancel = document.getElementById('velgo-wa-btn-cancel');
  if (btnCancel) {
    btnCancel.onclick = () => {
      clearInterval(interval);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };
  }
};

