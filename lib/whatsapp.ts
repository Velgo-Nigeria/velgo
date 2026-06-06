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

export const openWhatsAppHelper = (message: string, phoneNumber: string = '2349167799600') => {
  const cleanPhone = formatNigerianPhoneForWhatsApp(phoneNumber);
  const encodedText = encodeURIComponent(message);
  
  // Use api.whatsapp.com which triggers deep-linking handlers more reliably on some devices
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  
  // Detect Safari, iOS, or standalone PWA environment
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = (window.navigator as any).standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
  const isSafari = navigator.userAgent.toLowerCase().includes('safari') && 
                    !navigator.userAgent.toLowerCase().includes('chrome') && 
                    !navigator.userAgent.toLowerCase().includes('chromium');

  if (isIOS || isStandalone || isSafari) {
    // WebKit popup blockers in standalone mode block synthetic clicks inside timeouts,
    // and target="_blank" opens stuck screens inside standalone/Safari contexts.
    // Setting window.location.href forces iOS to intercept the universal link and hand-off to native WhatsApp.
    window.location.href = waUrl;
  } else {
    // Open via a dynamic tag that forces exit from standalone web container bounds
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

