/**
 * Highly robust utility to trigger deep links to native WhatsApp.
 * Optimized for Progressive Web Apps (PWAs), mobile web, and desktop browsers.
 */
export const openWhatsAppHelper = (message: string, phoneNumber: string = '2349167799600') => {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  
  // Use api.whatsapp.com which triggers deep-linking handlers more reliably on some devices
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  
  // Open via a dynamic tag that forces exit from standalone web container bounds
  const link = document.createElement('a');
  link.href = waUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
