import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface DBNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert';
  is_read: boolean;
  created_at: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onRefreshUnread: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  userId,
  onRefreshUnread,
}) => {
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet, we will handle gracefully
        if (error.code === '42P01') {
          console.warn("Notifications table does not exist yet. Please run create_notifications_table.sql inside your Supabase Editor.");
        } else {
          console.error("Error fetching notifications:", error);
        }
      } else if (data) {
        setNotifications(data as DBNotification[]);
      }
    } catch (err) {
      console.error("Error connecting to database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchNotifications();
    }
  }, [isOpen, userId]);

  // Handle Real-time additions to immediately re-fetch/supplement inside the open panel
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications_panel_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
          onRefreshUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkAllRead = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      
      // Update local state and trigger app update
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      onRefreshUnread();
    } catch (err: any) {
      console.error("Error marking read:", err.message);
    }
  };

  const handleToggleRead = async (id: string, currentReadStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: !currentReadStatus })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: !currentReadStatus } : n))
      );
      onRefreshUnread();
    } catch (err: any) {
      console.error("Error toggling read status:", err.message);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      onRefreshUnread();
    } catch (err: any) {
      console.error("Error deleting notification:", err.message);
    }
  };

  const handleClearAll = async () => {
    if (!userId) return;
    if (!window.confirm("Are you sure you want to delete all historic notifications?")) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setNotifications([]);
      onRefreshUnread();
    } catch (err: any) {
      console.error("Error clearing notifications:", err.message);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Section */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#0f172a] h-full shadow-2xl flex flex-col z-10 animate-slideIn">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-slate-900 text-white pb-6 pt-12 md:pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <i className="fa-solid fa-bell text-emerald-400"></i>
            </div>
            <div>
              <h2 className="font-black text-sm uppercase tracking-wider text-white">Notification Center</h2>
              <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold mt-0.5">
                {unreadCount > 0 ? `${unreadCount} Unread Alert${unreadCount > 1 ? 's' : ''}` : 'No unread notifications'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Global Toolbar Action Controls */}
        {notifications.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-950 border-b border-gray-150 dark:border-gray-950/80 flex justify-between items-center text-[10px] uppercase font-black tracking-wider">
            <button 
              onClick={handleMarkAllRead}
              className="text-emerald-600 dark:text-emerald-400 hover:opacity-80 flex items-center gap-1"
            >
              <i className="fa-solid fa-circle-check"></i> Mark All as Read
            </button>
            <button 
              onClick={handleClearAll}
              className="text-red-500 hover:opacity-80 flex items-center gap-1"
            >
              <i className="fa-solid fa-trash-can"></i> Clear All History
            </button>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <i className="fa-solid fa-circle-notch animate-spin text-brand text-2xl"></i>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Accessing records...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-24 text-center space-y-4 px-6">
              <div className="w-16 h-16 rounded-[28px] bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600 mx-auto border border-gray-100 dark:border-gray-700/50">
                <i className="fa-solid fa-bell-slash text-2xl"></i>
              </div>
              <h4 className="font-extrabold text-sm text-gray-700 dark:text-gray-200 uppercase tracking-wider">In-App Notifications Empty</h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto leading-relaxed">
                You will receive alerts here in real-time when clients hire you, bookings are updated, or new messages arrive.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const dateObj = new Date(item.created_at);
              const isToday = dateObj.toDateString() === new Date().toDateString();
              const timeString = isToday 
                ? `Today, ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              const colors = {
                info: {
                  bg: item.is_read ? 'bg-transparent' : 'bg-indigo-50/20 dark:bg-indigo-950/5 border-indigo-100/50 dark:border-indigo-950/20',
                  icon: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500',
                  fa: 'fa-bell',
                },
                success: {
                  bg: item.is_read ? 'bg-transparent' : 'bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-100/30 dark:border-emerald-950/20',
                  icon: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500',
                  fa: 'fa-circle-check',
                },
                alert: {
                  bg: item.is_read ? 'bg-transparent' : 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-100/30 dark:border-amber-950/20',
                  icon: 'bg-amber-50 dark:bg-amber-950/30 text-amber-500',
                  fa: 'fa-triangle-exclamation',
                },
              };

              const style = colors[item.type] || colors.info;

              return (
                <div 
                  key={item.id}
                  className={`p-4 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all flex gap-3 relative group ${style.bg} ${!item.is_read ? 'shadow-sm' : 'opacity-75'}`}
                >
                  {/* Status Unread Ring Indicator dot */}
                  {!item.is_read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-brand animate-pulse" />
                  )}

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${style.icon}`}>
                    <i className={`fa-solid ${style.fa} text-[13px]`}></i>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1 px-0.5">
                      <span className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                        {item.type} • {timeString}
                      </span>
                    </div>
                    <h5 className="font-black text-xs text-gray-900 dark:text-white mt-0.5">
                      {item.title}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold leading-relaxed mt-1 whitespace-pre-line break-words">
                      {item.message}
                    </p>

                    {/* Single controls in the details spacing */}
                    <div className="flex items-center gap-3 mt-2">
                      <button 
                        onClick={() => handleToggleRead(item.id, item.is_read)}
                        className="text-[9px] font-black uppercase text-brand hover:opacity-80 transition-opacity"
                      >
                        {item.is_read ? 'Mark Unread' : 'Mark Read'}
                      </button>
                      <span className="text-gray-350 dark:text-gray-700 text-[10px]">•</span>
                      <button 
                        onClick={() => handleDeleteNotification(item.id)}
                        className="text-[9px] font-black uppercase text-red-500 hover:opacity-80 transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Footer info showing 14-days auto cleanup system status */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-center">
          <p className="text-[9.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <i className="fa-solid fa-shield-halved text-emerald-400"></i> Safety Pruner Status: ACTIVE (7-Day retention)
          </p>
        </div>
      </div>
    </div>
  );
};
