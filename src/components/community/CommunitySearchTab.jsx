import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, UserPlus, UserMinus, User } from 'lucide-react';
import UserListModal from './UserListModal';

export default function CommunitySearchTab({ currentUser }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [followingMap, setFollowingMap] = useState({}); // { [userId]: true/false }
  const [isSearching, setIsSearching] = useState(false);
  const [countsMap, setCountsMap] = useState({}); // { [userId]: { followers: n, following: m } }
  
  // 모달 제어 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState(null);
  const [modalType, setModalType] = useState('followers'); // 'followers' | 'following'

  useEffect(() => {
    // 마운트 시 내가 팔로우하는 전체 목록을 가져와서 Map 구성
    const fetchMyFollowing = async () => {
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id);
      if (data) {
        const map = {};
        data.forEach(f => map[f.following_id] = true);
        setFollowingMap(map);
      }
    };
    fetchMyFollowing();
  }, [currentUser.id]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsSearching(true);
    // 이름이나 username 둘 중 하나에 포함되는지 검색 (ilike)
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, gyms(name)')
      .neq('id', currentUser.id)
      .or(`full_name.ilike.%${keyword}%,username.ilike.%${keyword}%`)
      .limit(30);

    setIsSearching(false);
    if (!error && data) {
      setResults(data);
      fetchCounts(data.map(u => u.id));
    }
  };

  const fetchCounts = async (userIds) => {
    if (userIds.length === 0) return;

    // 팔로워 수 가져오기
    const { data: followers } = await supabase
      .from('follows')
      .select('following_id')
      .in('following_id', userIds);
    
    // 팔로잉 수 가져오기
    const { data: following } = await supabase
      .from('follows')
      .select('follower_id')
      .in('follower_id', userIds);

    const newCounts = {};
    userIds.forEach(id => newCounts[id] = { followers: 0, following: 0 });

    followers?.forEach(f => {
      if (newCounts[f.following_id]) newCounts[f.following_id].followers++;
    });
    following?.forEach(f => {
      if (newCounts[f.follower_id]) newCounts[f.follower_id].following++;
    });

    setCountsMap(newCounts);
  };

  const openListModal = (targetId, type) => {
    setModalTarget(targetId);
    setModalType(type);
    setModalOpen(true);
  };

  const toggleFollow = async (targetId) => {
    const isFollowing = followingMap[targetId];

    // 낙관적 UI 업데이트
    setFollowingMap(prev => ({ ...prev, [targetId]: !isFollowing }));

    if (isFollowing) {
      // 언팔로우
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
    } else {
      // 팔로우
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetId });
    }
  };

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-300">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b95a1]" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="아이디 또는 이름으로 친구 검색"
          className="w-full bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb] py-4 pl-12 pr-4 text-[15px] font-bold text-[#191f28] outline-none focus:border-[#3182f6] transition-colors"
        />
        <button type="submit" className="hidden" />
      </form>

      <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb] overflow-hidden min-h-[50vh]">
        {isSearching ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-[#3182f6]/30 border-t-[#3182f6] rounded-full animate-spin"></div></div>
        ) : results.length === 0 ? (
           <div className="py-16 text-center text-[#8b95a1]">
             <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
             <p className="text-[14px] font-bold">검색 결과가 없습니다.</p>
           </div>
        ) : (
          <div className="divide-y divide-[#f2f4f6]">
             {results.map((u) => {
                const isFollowing = !!followingMap[u.id];
                return (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-[#f9fafb] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#f2f4f6] flex items-center justify-center shrink-0">
                         <User className="w-6 h-6 text-[#b0b8c1]" />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-extrabold text-[#191f28] leading-none mb-1">{u.full_name}</h4>
                        <p className="text-[12px] text-[#8b95a1] font-medium">@{u.username} {u.gyms?.name ? `· ${u.gyms.name}` : ''}</p>
                        
                        <div className="flex items-center gap-2 mt-1.5">
                          <button 
                            onClick={() => openListModal(u.id, 'followers')}
                            className="text-[11px] font-bold text-[#4e5968] hover:text-[#3182f6] transition-colors"
                          >
                            팔로워 <span className="text-[#3182f6]">{countsMap[u.id]?.followers || 0}</span>
                          </button>
                          <div className="w-[1px] h-2.5 bg-[#e5e8eb]" />
                          <button 
                            onClick={() => openListModal(u.id, 'following')}
                            className="text-[11px] font-bold text-[#4e5968] hover:text-[#3182f6] transition-colors"
                          >
                            팔로잉 <span className="text-[#3182f6]">{countsMap[u.id]?.following || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => toggleFollow(u.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 border ${
                        isFollowing ? 'bg-[#f2f4f6] text-[#4e5968] border-transparent' : 'bg-[#e8f3ff] text-[#3182f6] border-[#3182f6]/20 hover:bg-[#3182f6] hover:text-white'
                      }`}
                    >
                      {isFollowing ? <UserMinus className="w-4 h-4"/> : <UserPlus className="w-4 h-4"/>}
                      {isFollowing ? '언팔로우' : '팔로우'}
                    </button>
                  </div>
                )
             })}
          </div>
        )}
      </div>

      <UserListModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={modalTarget}
        type={modalType}
        currentUser={currentUser}
      />
    </div>
  );
}
