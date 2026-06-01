// src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageSquare, UserPlus, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

const TYPE_ICON = {
  like:    { Icon: Heart,        color: 'text-[#f04452]', bg: 'bg-[#fef2f2]' },
  comment: { Icon: MessageSquare, color: 'text-[#3182f6]', bg: 'bg-[#ebf4ff]' },
  follow:  { Icon: UserPlus,     color: 'text-[#00c471]', bg: 'bg-[#e8faf0]' },
};

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:users!notifications_actor_id_fkey(full_name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setNotifications(data);
  };

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  // 실시간 구독
  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // 패널 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) markAllRead();
  };

  const formatTime = (iso) => {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#8b95a1] hover:bg-[#f2f4f6] transition-colors active:scale-90"
      >
        <Bell className="w-[22px] h-[22px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#f04452] rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-[340px] max-h-[480px] bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-[#e5e8eb] z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f2f4f6]">
            <h3 className="text-[15px] font-extrabold text-[#191f28]">알림</h3>
            <button onClick={() => setIsOpen(false)} className="p-1 text-[#8b95a1] hover:text-[#191f28]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-[#8b95a1]">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-[13px] font-medium">아직 알림이 없습니다.</p>
              </div>
            ) : (
              notifications.map(n => {
                const config = TYPE_ICON[n.type] || TYPE_ICON.like;
                const { Icon } = config;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[#f9fafb] transition-colors ${!n.is_read ? 'bg-[#f8fbff]' : 'bg-white'}`}
                  >
                    <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-[18px] h-[18px] ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#191f28] leading-snug">{n.message}</p>
                      <p className="text-[11px] text-[#8b95a1] mt-0.5">{formatTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#3182f6] shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
