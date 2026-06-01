import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { sendNotification } from '../../utils/pushNotification';
import { X, User, UserPlus, UserMinus } from 'lucide-react';

export default function UserListModal({ isOpen, onClose, userId, type, currentUser }) {
  const [userList, setUserList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserList();
      fetchMyFollowing();
    }
  }, [isOpen, userId, type]);

  const fetchMyFollowing = async () => {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id);

    if (data) {
      const map = {};
      data.forEach(f => map[f.following_id] = true);
      setFollowingMap(map);
    }
  };

  const fetchUserList = async () => {
    setIsLoading(true);
    let query;

    if (type === 'followers') {
      // 나를 팔로우하는 사람들
      query = supabase
        .from('follows')
        .select('follower:users!follows_follower_id_fkey(id, username, full_name, gyms(name))')
        .eq('following_id', userId);
    } else {
      // 내가 팔로우하는 사람들
      query = supabase
        .from('follows')
        .select('followed:users!follows_following_id_fkey(id, username, full_name, gyms(name))')
        .eq('follower_id', userId);
    }

    const { data, error } = await query;
    setIsLoading(false);

    if (!error && data) {
      const users = data.map(item => type === 'followers' ? item.follower : item.followed);
      setUserList(users);
    }
  };

  const toggleFollow = async (targetId) => {
    if (targetId === currentUser.id) return;

    const isFollowing = followingMap[targetId];
    setFollowingMap(prev => ({ ...prev, [targetId]: !isFollowing }));

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetId });
      // 팔로우 알림 발송
      const actorName = currentUser.full_name || currentUser.user_metadata?.name || '누군가';
      sendNotification({
        userId: targetId,
        actorId: currentUser.id,
        type: 'follow',
        message: `${actorName}님이 회원님을 팔로우하기 시작했습니다.`,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[24px] shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f2f4f6] flex items-center justify-between shrink-0">
          <h2 className="text-[18px] font-extrabold text-[#191f28]">
            {type === 'followers' ? '팔로워' : '팔로잉'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#f2f4f6] rounded-full transition-colors">
            <X className="w-6 h-6 text-[#8b95a1]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#3182f6]/30 border-t-[#3182f6] rounded-full animate-spin"></div>
            </div>
          ) : userList.length === 0 ? (
            <div className="py-16 text-center text-[#8b95a1]">
              <User className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-[14px] font-bold">표시할 사용자가 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f2f4f6]">
              {userList.map((u) => {
                if (!u) return null;
                const isFollowing = !!followingMap[u.id];
                const isMe = u.id === currentUser.id;

                return (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-[#f9fafb] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f2f4f6] flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-[#b0b8c1]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[15px] font-extrabold text-[#191f28] truncate">{u.full_name}</h4>
                        <p className="text-[12px] text-[#8b95a1] font-medium truncate">
                          @{u.username} {u.gyms?.name ? `· ${u.gyms.name}` : ''}
                        </p>
                      </div>
                    </div>

                    {!isMe && (
                      <button
                        onClick={() => toggleFollow(u.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-95 border ${isFollowing
                            ? 'bg-[#f2f4f6] text-[#4e5968] border-transparent'
                            : 'bg-[#e8f3ff] text-[#3182f6] border-[#3182f6]/20 hover:bg-[#3182f6] hover:text-white'
                          }`}
                      >
                        {isFollowing ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                        {isFollowing ? '언팔로우' : '팔로우'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
