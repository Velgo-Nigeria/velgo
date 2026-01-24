import React from 'react';

// ---------------------------------------------------------------------------
// REPLACE THE URL BELOW WITH THE DIRECT LINK TO YOUR UPLOADED IMAGE
// Example: "https://i.ibb.co/your-image-id/logo.png"
// ---------------------------------------------------------------------------
const LOGO_IMAGE_URL = "https://ui-avatars.com/api/?name=V&background=008000&color=fff&size=512&font-size=0.5&length=1&rounded=true&bold=true&format=png";

export const ShieldIcon: React.FC<{ className?: string }> = ({ className = "h-12 w-auto" }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <img 
        src={LOGO_IMAGE_URL} 
        className="w-full h-full object-contain drop-shadow-md" 
        alt="Velgo Shield"
    />
  </div>
);

export const VelgoLogo: React.FC<{ variant?: 'light' | 'dark', className?: string }> = ({ variant = 'dark', className = "h-12 w-auto" }) => {
  const textColor = variant === 'dark' ? 'text-gray-900 dark:text-white' : 'text-white';
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-full aspect-square relative">
         <img 
            src={LOGO_IMAGE_URL} 
            className="w-full h-full object-contain drop-shadow-sm" 
            alt="Velgo Logo"
         />
      </div>
      <div className="flex flex-col justify-center">
        <span className={`text-2xl font-black italic tracking-tighter leading-none ${textColor}`}>VELGO</span>
        <span className="text-[#008000] text-[10px] font-black uppercase tracking-[3px] leading-none mt-0.5">NIGERIA</span>
      </div>
    </div>
  );
};