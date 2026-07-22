import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../lib/types';

interface VisualPortfolioGalleryProps {
  profile: Profile;
  onRefreshProfile: () => void;
  isOwner: boolean;
}

export const VisualPortfolioGallery: React.FC<VisualPortfolioGalleryProps> = ({ profile, onRefreshProfile, isOwner }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const images = profile.portfolio_images || [];
  const MAX_IMAGES = 4;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (images.length >= MAX_IMAGES) {
        alert(`You can only upload a maximum of ${MAX_IMAGES} portfolio images.`);
        return;
    }
    
    const file = e.target.files[0];
    setUploading(true);
    
    try {
        const options = {
            maxSizeMB: 0.1, // 100kb
            maxWidthOrHeight: 800,
            useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);
        
        const fileExt = compressedFile.name.split('.').pop() || 'jpg';
        const fileName = `portfolio-${profile.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('task-images') // Reusing the same public bucket for simplicity
            .upload(fileName, compressedFile);
            
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
            .from('task-images')
            .getPublicUrl(fileName);
            
        const newImages = [...images, publicUrl];
        
        const { error: updateError } = await supabase.from('profiles')
            .update({ portfolio_images: newImages })
            .eq('id', profile.id);
            
        if (updateError) throw updateError;
        
        onRefreshProfile();
    } catch (err: any) {
        console.error("Upload error:", err);
        alert("Failed to upload image. Please try again.");
    } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (urlToRemove: string) => {
      if (!confirm("Are you sure you want to delete this portfolio image?")) return;
      
      try {
          const newImages = images.filter(url => url !== urlToRemove);
          const { error } = await supabase.from('profiles')
            .update({ portfolio_images: newImages })
            .eq('id', profile.id);
            
          if (error) throw error;
          onRefreshProfile();
      } catch (err) {
          alert("Failed to delete image.");
      }
  };

  if (!isOwner && images.length === 0) return null;

  return (
    <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visual Portfolio ({images.length}/{MAX_IMAGES})</h3>
            {isOwner && images.length < MAX_IMAGES && (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-[10px] font-black uppercase tracking-widest text-brand hover:text-brand-dark bg-brand/10 px-3 py-1.5 rounded-full"
                >
                    {uploading ? 'Compressing...' : '+ Add Photo'}
                </button>
            )}
        </div>
        
        <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
        />
        
        {images.length === 0 && isOwner ? (
            <div className="bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-center">
                <i className="fa-solid fa-images text-gray-400 text-3xl mb-3"></i>
                <p className="text-xs text-gray-500 font-medium">Upload photos of your past work to earn the Silver Badge and increase client trust!</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-3">
                {images.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100 dark:bg-gray-800">
                        <img src={url} alt="Portfolio item" className="w-full h-full object-cover" />
                        {isOwner && (
                            <button 
                                onClick={() => handleDelete(url)}
                                className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
