/**
 * Highly robust utility to trigger deep links to native WhatsApp.
 * Optimized for Progressive Web Apps (PWAs), mobile web, and desktop browsers.
 */
export const openWhatsAppHelper = (message: string, phoneNumber: string = '2349167799600') => {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  
  // 1. Detect if running in standalone PWA display mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as any).standalone 
    || document.referrer.includes('android-app://');
    
  // 2. Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isStandalone || isMobile) {
    // For installed PWA or mobile, window.location.href forces system protocol handler to open the native WhatsApp client
    window.location.href = waUrl;
  } else {
    // For desktop web browser, opening in a clean new tab is optimal
    const newWindow = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = waUrl;
    }
  }
};
