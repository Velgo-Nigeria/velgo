
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../lib/types';
import { CATEGORY_MAP, getTierLimit } from '../lib/constants';
import { GoogleGenAI, Type } from "@google/genai";
import { NIGERIA_STATES, NIGERIA_LGAS } from '../lib/locations';

interface PostTaskProps { profile: Profile | null; onBack: () => void; onUpgrade: () => void; onRefreshProfile: () => void; }

const PostTask: React.FC<PostTaskProps> = ({ profile, onBack, onUpgrade, onRefreshProfile }) => {
  const ONLINE_CATEGORIES = [
    "Technology, Data & Digital Services",
    "Business, Finance & Legal",
    "Education, Training & Coaching"
  ];

  const PHYSICAL_CATEGORIES = [
    "Construction, Engineering & Real Estate",
    "Artisan Services, Repairs & Maintenance",
    "Domestic, Personal & Errands",
    "Events, Hospitality & Entertainment",
    "Agriculture & Farming",
    "Manufacturing & Industrial",
    "Education, Training & Coaching",
    "Business, Finance & Legal"
  ];

  const [jobLocationType, setJobLocationType] = useState<'physical' | 'online'>('physical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [category, setCategory] = useState(PHYSICAL_CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedState, setSelectedState] = useState('Lagos');
  const [selectedLGA, setSelectedLGA] = useState(NIGERIA_LGAS['Lagos']?.[0] || '');
  const [taskAddress, setTaskAddress] = useState('');

  const handleJobLocationTypeChange = (type: 'physical' | 'online') => {
    setJobLocationType(type);
    const availableCategories = type === 'online' ? ONLINE_CATEGORIES : PHYSICAL_CATEGORIES;
    if (!availableCategories.includes(category)) {
      setCategory(availableCategories[0]);
    }
  };
  
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [processingAudio, setProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [idLoading, setIdLoading] = useState(false);
  const idFileInputRef = useRef<HTMLInputElement>(null);

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !profile) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `id_${profile.id}_${Date.now()}.${fileExt}`;

    setIdLoading(true);
    
    const { error: uploadError } = await supabase.storage.from('verifications').upload(fileName, file);

    if (uploadError) {
      alert("Error uploading ID: " + uploadError.message);
      setIdLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('verifications').getPublicUrl(fileName);

    const { error: updateError } = await supabase.from('profiles').update({ nin_image_url: publicUrl, id_rejection_reason: null }).eq('id', profile.id);

    if (updateError) {
      alert("Failed to update profile: " + updateError.message);
    } else {
      alert("ID Uploaded successfully! Your verification is now pending.");
      onRefreshProfile();
    }
    setIdLoading(false);
  };

  useEffect(() => {
    if (NIGERIA_LGAS[selectedState]) {
        if (!NIGERIA_LGAS[selectedState].includes(selectedLGA)) {
             setSelectedLGA(NIGERIA_LGAS[selectedState][0] || '');
        }
    } else {
        setSelectedLGA('');
    }
  }, [selectedState]);

  if (profile && !profile.is_verified) {
    const isPending = !!profile.nin_image_url;
    const isRejected = !profile.is_verified && !!profile.id_rejection_reason;

    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-24 relative flex flex-col">
        {/* Simple Header */}
        <div className="px-6 pt-10 pb-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 sticky top-0 z-10">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <i className="fa-solid fa-chevron-left text-gray-500"></i>
          </button>
          <h1 className="text-xl font-black">Post a Job</h1>
        </div>

        {/* Outer body */}
        <div className="flex-1 p-6 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-2xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-gray-800 text-center space-y-6 flex flex-col items-center">
            
            {/* Status Icons */}
            {isPending ? (
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-2xl animate-pulse">
                <i className="fa-solid fa-user-clock"></i>
              </div>
            ) : isRejected ? (
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center text-2xl">
                <i className="fa-solid fa-circle-exclamation"></i>
              </div>
            ) : (
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-2xl">
                <i className="fa-solid fa-user-shield animate-pulse"></i>
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {isPending ? "ID Review in Progress" : isRejected ? "ID Card Rejected" : "Verification Required"}
              </h2>
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                {isPending 
                  ? "Our safety division is currently reviewing your uploaded ID. Most reviews in Nigeria take under 15 minutes. We will notify you once approved."
                  : isRejected
                  ? `Your verification ID was declined. Reason: "${profile.id_rejection_reason}". Please upload a clean photo of your legitimate NIMC Slip, Green Card, or Driver's License.`
                  : "To secure our Nigerian marketplace, eliminate ghost budgets, and prevent worker exploitation, Velgo requires clients to provide an official ID card before posting jobs."}
              </p>
            </div>

            {/* Actions Panel */}
            <div className="w-full pt-4">
              {isPending ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 py-3 rounded-2xl text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 tracking-wider">
                     ⚡ Speed Review Enabled
                  </div>
                  <button onClick={onBack} className="w-full bg-gray-900 text-white dark:bg-gray-800 py-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">
                    Return to Marketplace
                  </button>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  <input ref={idFileInputRef} type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                  
                  <button 
                    onClick={() => idFileInputRef.current?.click()} 
                    disabled={idLoading}
                    className="w-full bg-brand text-white py-4 rounded-[20px] text-xs font-black uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {idLoading ? (
                      <>
                        <i className="fa-solid fa-circle-notch animate-spin"></i> Uploading ID...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up"></i> {isRejected ? "Re-upload Clean ID" : "Upload NIN / ID Card"}
                      </>
                    )}
                  </button>

                  <button onClick={onBack} className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-white py-4 rounded-[20px] text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Visual Indicators */}
            <div className="flex gap-4 border-t border-gray-100 dark:border-gray-800 pt-5 w-full justify-center">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">+20 XP</p>
                <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">Visibility Booster</p>
              </div>
              <div className="w-[1px] h-6 bg-gray-100 dark:bg-gray-800"></div>
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">100%</p>
                <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">Scam-Free Ecosystem</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large. Max 5MB.");
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    let imageUrl = null;

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `task-${profile.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('task-images')
          .upload(fileName, imageFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('task-images')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl;
      }

      const fullLocation = jobLocationType === 'online' ? 'Remote / Online' : `${selectedLGA}, ${selectedState}`;

      // Security check: No phone numbers or WhatsApp links in task address
      if (jobLocationType === 'physical' && taskAddress.trim()) {
        const cleanedAddress = taskAddress.replace(/[\s\-\(\)\+]/g, '');
        const phoneRegex = /(070|080|090|081|071|091|01)\d{7,8}/;
        if (phoneRegex.test(cleanedAddress)) {
          alert("Safety Filter: Please do not include phone numbers or direct contact lines in the job address field. This protects our system security.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from('posted_tasks').insert([{
        client_id: profile.id,
        title,
        description,
        budget: parseInt(budget) || 0,
        location: fullLocation,
        address: jobLocationType === 'online' ? '' : taskAddress.trim(),
        category,
        subcategory,
        urgency,
        due_date: dueDate ? dueDate : null,
        image_url: imageUrl
      }]);

      if (error) throw error;

      onRefreshProfile();
      alert("Job Posted Successfully!");
      onBack();

    } catch (error: any) {
      alert("Error posting job: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAiEnhance = async () => {
    if (!description.trim()) return;
    setIsEnhancing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Rewrite this task description to be clear, engaging, and professional for a gig marketplace in Nigeria. Keep the tone urgent but polite if needed. Limit to 60 words: "${description}"`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      if (response.text) {
        setDescription(response.text.trim());
      }
    } catch (e) {
      console.error(e);
      alert("AI enhancement failed. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        chunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await processAudioWithGemini(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (e) {
        alert("Microphone access denied. Please allow permissions.");
      }
    }
  };

  const processAudioWithGemini = async (audioBlob: Blob) => {
      setProcessingAudio(true);
      try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
              const base64data = reader.result?.toString().split(',')[1];
              if (!base64data) return;

              const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
              
              const response = await ai.models.generateContent({
                  model: "gemini-3-flash-preview",
                  contents: {
                      parts: [
                          { inlineData: { mimeType: 'audio/webm', data: base64data } },
                          { text: "Extract job details into JSON: title, description (detailed), budget (number), urgency (normal/urgent/emergency), due_date (YYYY-MM-DDTHH:mm), state (Nigeria), lga (Nigeria), category. Map vague inputs to the nearest valid Nigerian State/LGA and Category." }
                      ]
                  },
                  config: {
                      responseMimeType: "application/json",
                      responseSchema: {
                          type: Type.OBJECT,
                          properties: {
                              title: { type: Type.STRING },
                              description: { type: Type.STRING },
                              budget: { type: Type.INTEGER },
                              urgency: { type: Type.STRING },
                              due_date: { type: Type.STRING },
                              state: { type: Type.STRING },
                              lga: { type: Type.STRING },
                              category: { type: Type.STRING }
                          }
                      }
                  }
              });

              if (response.text) {
                  const data = JSON.parse(response.text);
                  if (data.title) setTitle(data.title);
                  if (data.description) setDescription(data.description);
                  if (data.budget) setBudget(data.budget.toString());
                  if (data.urgency && ['normal', 'urgent', 'emergency'].includes(data.urgency.toLowerCase())) setUrgency(data.urgency.toLowerCase());
                  if (data.due_date) setDueDate(data.due_date);
                  
                  if (data.category && CATEGORY_MAP[data.category]) {
                      const isOnline = ONLINE_CATEGORIES.includes(data.category);
                      setJobLocationType(isOnline ? 'online' : 'physical');
                      setCategory(data.category);
                  }
                  if (data.state && NIGERIA_STATES.includes(data.state)) {
                      setSelectedState(data.state);
                      if (data.lga) {
                           setTimeout(() => {
                               if (NIGERIA_LGAS[data.state]?.includes(data.lga)) setSelectedLGA(data.lga);
                           }, 100);
                      }
                  }
              }
              setProcessingAudio(false);
          };
      } catch (e) {
          console.error(e);
          alert("Could not process audio. Please try again.");
          setProcessingAudio(false);
      }
  };

  return (
    <div className="bg-white min-h-screen pb-24 relative">
      <div className="px-6 pt-10 pb-4 border-b border-gray-50 flex items-center gap-4 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center"><i className="fa-solid fa-chevron-left text-gray-500"></i></button>
        <h1 className="text-2xl font-black">Post a Job</h1>
      </div>

      <div className="px-6 pt-4">
          <button 
            type="button" 
            onClick={handleVoiceInput} 
            disabled={processingAudio}
            className={`w-full py-6 rounded-[28px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                isRecording 
                ? 'bg-red-50 text-red-600 animate-pulse border border-red-200' 
                : (processingAudio ? 'bg-gray-100 text-gray-400' : 'bg-brand/5 text-brand border border-brand/20 hover:bg-brand/10')
            }`}
          >
            {processingAudio ? (
                <>
                    <i className="fa-solid fa-circle-notch animate-spin"></i> Processing Audio...
                </>
            ) : isRecording ? (
                <>
                    <i className="fa-solid fa-stop"></i> Stop Recording
                </>
            ) : (
                <>
                    <i className="fa-solid fa-microphone"></i> Tap to Speak Job Details
                </>
            )}
          </button>
          <p className="text-center text-[9px] text-gray-400 font-bold mt-2 uppercase">"I need a carpenter in Yaba to fix my door, budget 5k"</p>
      </div>

      {/* Modern Location Type Toggle */}
      <div className="px-6 pt-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Job Execution Style</label>
        <div className="bg-gray-100 p-1 rounded-2xl grid grid-cols-2 gap-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => handleJobLocationTypeChange('physical')}
            className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all focus:outline-none ${
              jobLocationType === 'physical'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white'
                : 'text-gray-400 bg-transparent hover:text-gray-650 dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-location-dot text-brand"></i>
            Physical / Local
          </button>
          <button
            type="button"
            onClick={() => handleJobLocationTypeChange('online')}
            className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all focus:outline-none ${
              jobLocationType === 'online'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white'
                : 'text-gray-400 bg-transparent hover:text-gray-650 dark:text-gray-500'
            }`}
          >
            <i className="fa-solid fa-laptop text-brand"></i>
            Online / Virtual
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Job Title</label>
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fix my kitchen sink" className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20" />
        </div>

        <div>
           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Photo (Optional)</label>
           {previewUrl ? (
             <div className="relative w-full h-48 rounded-2xl overflow-hidden group">
               <img src={previewUrl} className="w-full h-full object-cover" />
               <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-95">
                 <i className="fa-solid fa-xmark"></i>
               </button>
             </div>
           ) : (
             <div onClick={() => fileInputRef.current?.click()} className="h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand/50 hover:bg-brand/5 transition-all">
               <i className="fa-solid fa-camera text-2xl text-gray-300 mb-2"></i>
               <p className="text-xs font-bold text-gray-400">Upload</p>
               <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
             </div>
           )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1 ml-1">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Description</label>
             <button type="button" onClick={handleAiEnhance} disabled={isEnhancing || !description} className="text-[10px] font-black uppercase tracking-widest text-brand flex items-center gap-1 disabled:opacity-50">
               <i className={`fa-solid fa-wand-magic-sparkles ${isEnhancing ? 'animate-spin' : ''}`}></i> {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
             </button>
          </div>
          <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what you need..." className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20 resize-none" />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Industry Sector</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none appearance-none">
            {(jobLocationType === 'online' ? ONLINE_CATEGORIES : PHYSICAL_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Role / Specialization</label>
          <select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none appearance-none">
            <option value="">General / Any</option>
            {CATEGORY_MAP[category]?.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Budget (₦)</label>
          <input required type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="5000" className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20" />
        </div>

        <div>
           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Urgency</label>
           <div className="flex gap-2">
             {['normal', 'urgent', 'emergency'].map(u => (
               <button key={u} type="button" onClick={() => setUrgency(u)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${urgency === u ? 'bg-brand text-white' : 'bg-gray-50 text-gray-400'}`}>
                 {u}
               </button>
             ))}
           </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Due Date (Optional)</label>
          <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 text-gray-700" />
        </div>

        {jobLocationType === 'physical' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">State</label>
                <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none appearance-none">
                    {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">LGA</label>
                <select value={selectedLGA} onChange={e => setSelectedLGA(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none appearance-none" disabled={!NIGERIA_LGAS[selectedState]}>
                    {NIGERIA_LGAS[selectedState]?.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Workplace Street Address / Landmark</label>
              <input 
                required 
                type="text" 
                value={taskAddress} 
                onChange={e => setTaskAddress(e.target.value)} 
                placeholder="e.g. 15 Adeniran Ogunsanya St, near Shoprite" 
                className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand/20 placeholder-gray-300" 
              />
              <p className="text-[9px] text-gray-450 text-gray-400 font-bold uppercase tracking-wider mt-1.5 px-1 leading-snug">
                💡 Add street name or nearby landmark only. Avoid exact house/apartment numbers for your general safety before a worker is confirmed.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-brand/5 border border-brand/10 p-5 rounded-2xl flex gap-3.5 items-start">
            <span className="text-brand text-base mt-0.5"><i className="fa-solid fa-earth-africa"></i></span>
            <div className="space-y-0.5 text-left">
              <p className="text-[10px] font-black uppercase text-brand tracking-widest">Virtual Location Activated</p>
              <p className="text-[11px] text-gray-500 font-bold leading-relaxed">This task will be marked as remote and open for any artisan or digital freelancer across Nigeria. Location fields are disabled.</p>
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-5 rounded-[28px] font-black uppercase tracking-widest shadow-xl mt-4">
          {loading ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </div>
  );
};

export default PostTask;
