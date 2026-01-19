
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile, Message } from '../lib/types';

interface ChatProps { profile: Profile | null; partnerId: string; onBack: () => void; }

const Chat: React.FC<ChatProps> = ({ profile, partnerId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [partner, setPartner] = useState<Profile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const isSupport = partnerId === 'support';

  useEffect(() => {
    if (isSupport) {
      setPartner({
        id: 'support',
        full_name: 'Velgo Support Team',
        avatar_url: 'https://ui-avatars.com/api/?name=Support&background=008000&color=fff',
        role: 'admin',
        is_verified: true
      } as any);
      
      supabase.from('support_messages').select('*').eq('user_id', profile?.id).order('created_at', { ascending: true })
        .then(({data}) => {
             const formattedMsgs = (data || []).map((m: any) => ({
                 id: m.id,
                 sender_id: m.admin_reply ? 'support' : profile?.id,
                 receiver_id: m.admin_reply ? profile?.id : 'support',
                 content: m.content,
                 created_at: m.created_at
             }));
             setMessages(formattedMsgs.length === 0 ? [{
                id: 'welcome', sender_id: 'support', receiver_id: profile?.id || '', content: 'Ndeewọ! How can we help you today?', created_at: new Date().toISOString()
              }] : formattedMsgs);
        });
    } else {
      supabase.from('profiles').select('*').eq('id', partnerId).single().then(({data}) => setPartner(data));
      supabase.from('messages').select('*').or(`and(sender_id.eq.${profile?.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${profile?.id})`).order('created_at', { ascending: true }).then(({data}) => setMessages(data || []));
      
      const channel = supabase.channel('chat_realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message;
        if ((msg.sender_id === partnerId && msg.receiver_id === profile?.id) || (msg.sender_id === profile?.id && msg.receiver_id === partnerId)) {
          setMessages(prev => [...prev, msg]);
        }
      }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [profile?.id, partnerId, isSupport]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage('');
    if (!isSupport) {
      await supabase.from('messages').insert([{ sender_id: profile.id, receiver_id: partnerId, content }]);
    } else {
      await supabase.from('support_messages').insert([{ user_id: profile.id, content, status: 'open' }]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <div className="flex items-center gap-3">
                  <img src={partner?.avatar_url || `https://ui-avatars.com/api/?name=${partner?.full_name}&background=008000&color=fff`} className="w-10 h-10 rounded-2xl border-2 border-white shadow-sm object-cover" />
                  <div>
                      <h3 className="font-black text-[15px] text-gray-900 dark:text-white leading-none">{partner?.full_name || 'Chat'}</h3>
                      <span className="text-[10px] text-brand font-bold uppercase tracking-widest">{partner?.role === 'admin' ? 'Official' : 'Verified'}</span>
                  </div>
              </div>
          </div>
          <div className="w-10 h-10 flex items-center justify-center opacity-20">
              <i className="fa-solid fa-shield-halved text-brand"></i>
          </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 dark:bg-gray-900">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === profile?.id ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[85%] p-4 rounded-[24px] text-sm shadow-sm ${m.sender_id === profile?.id ? 'bg-brand text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'}`}>
              {m.content}
              <p className={`text-[9px] mt-1 opacity-50 text-right ${m.sender_id === profile?.id ? 'text-white' : 'text-gray-400'}`}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 safe-bottom">
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto">
            <input 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              placeholder="Type your message..." 
              className="flex-1 bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-brand/20 dark:text-white rounded-[24px] px-6 py-4 text-sm outline-none transition-all" 
            />
            <button type="submit" className="bg-brand text-white w-14 h-14 rounded-2xl shadow-xl shadow-brand/20 active:scale-95 transition-transform flex items-center justify-center shrink-0">
              <i className="fa-solid fa-paper-plane"></i>
            </button>
        </form>
      </div>
    </div>
  );
};
export default Chat;
