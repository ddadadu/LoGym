import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Dumbbell, MessageSquare, Heart, Clock, Send } from 'lucide-react';

export default function CommunityHomeTab({ currentUser }) {
  const [feeds, setFeeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'following', 'gym'
  const [expandedComments, setExpandedComments] = useState({}); // { feedId: boolean }
  const [commentInputs, setCommentInputs] = useState({}); // { feedId: string }

  useEffect(() => {
    fetchFeeds();
  }, [filter]);

  const fetchFeeds = async () => {
    setIsLoading(true);
    try {
      // 1. 필요한 UUID 리스트 추출 (나, 팔로잉, 같은 헬스장)
      let followingIds = [];
      let gymUserIds = [];

      // 팔로잉 가져오기
      const { data: follows } = await supabase.from('follows').select('followed_id').eq('follower_id', currentUser.id);
      if (follows) followingIds = follows.map(f => f.followed_id);

      // 같은 헬스장 사람 가져오기
      if (currentUser.home_gym_id) {
        const { data: gymUsers } = await supabase.from('users').select('id').eq('home_gym_id', currentUser.home_gym_id);
        if (gymUsers) gymUserIds = gymUsers.map(u => u.id);
      }

      // 필터 적용
      let targetUserIds = [currentUser.id]; // 기본적으로 내 것도 포함
      if (filter === 'all') {
        targetUserIds = [...new Set([...targetUserIds, ...followingIds, ...gymUserIds])];
      } else if (filter === 'following') {
        targetUserIds = [...new Set([...targetUserIds, ...followingIds])];
      } else if (filter === 'gym') {
        targetUserIds = [...new Set([...targetUserIds, ...gymUserIds])];
      }

      // 해당 User들의 feed 가져오기.
      // (Supabase 설정상 in 연산자 사용)
      const { data: feedData, error } = await supabase
        .from('community_feeds')
        .select(`
          *,
          users(username, full_name),
          workout_logs(
            photo_url,
            duration_seconds,
            workout_log_items(
              id,
              sets,
              equipments(name),
              user_custom_exercises(name)
            )
          ),
          community_feed_likes(user_id),
          community_feed_comments(
            id, content, created_at,
            users(full_name)
          )
        `)
        .in('user_id', targetUserIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeeds(feedData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (feedId, isLiked) => {
    // 낙관적 UI
    setFeeds(prev => prev.map(f => {
      if (f.id === feedId) {
        let newLikes = f.community_feed_likes || [];
        if (isLiked) {
          newLikes = newLikes.filter(l => l.user_id !== currentUser.id);
        } else {
          newLikes = [...newLikes, { user_id: currentUser.id }];
        }
        return { ...f, community_feed_likes: newLikes };
      }
      return f;
    }));

    if (isLiked) {
      await supabase.from('community_feed_likes').delete().eq('feed_id', feedId).eq('user_id', currentUser.id);
    } else {
      await supabase.from('community_feed_likes').insert({ feed_id: feedId, user_id: currentUser.id });
    }
  };

  const submitComment = async (feedId) => {
    const text = commentInputs[feedId];
    if (!text || !text.trim()) return;

    // 즉시 임시 등록 (UI)
    const tempComment = {
      id: Math.random().toString(),
      content: text,
      created_at: new Date().toISOString(),
      users: { full_name: currentUser.full_name || '나' }
    };
    
    setFeeds(prev => prev.map(f => {
      if (f.id === feedId) {
        return { ...f, community_feed_comments: [...(f.community_feed_comments||[]), tempComment] };
      }
      return f;
    }));
    setCommentInputs(p => ({ ...p, [feedId]: '' }));

    // DB 삽입
    await supabase.from('community_feed_comments').insert({
      feed_id: feedId,
      user_id: currentUser.id,
      content: text
    });
    // 재조회 대신 낙관적 UI 유지
  };

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-300">
      {/* 필터 헤더 */}
      <div className="flex gap-2 pb-2">
        {[{id:'all', name:'전체 피드'}, {id:'following', name:'팔로잉'}, {id:'gym', name:'우리 헬스장'}].map(f => (
           <button 
             key={f.id}
             onClick={() => setFilter(f.id)}
             className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-colors border ${
               filter === f.id ? 'bg-[#191f28] text-white border-[#191f28]' : 'bg-white text-[#4e5968] border-[#e5e8eb] hover:bg-[#f9fafb]'
             }`}
           >
             {f.name}
           </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-[#3182f6]/30 border-t-[#3182f6] rounded-full animate-spin"></div></div>
      ) : feeds.length === 0 ? (
        <div className="py-20 text-center text-[#8b95a1] bg-white rounded-3xl border border-dashed border-[#d1d6db]">
          <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-[14px] font-bold">아직 표시할 피드가 없습니다.</p>
          <p className="text-[12px] mt-1">운동 기록을 피드에 자랑해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feeds.map(feed => {
             const likesCount = feed.community_feed_likes?.length || 0;
             const isLikedByMe = feed.community_feed_likes?.some(l => l.user_id === currentUser.id);
             const commentsCount = feed.community_feed_comments?.length || 0;

             return (
               <div key={feed.id} className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb] overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-[#f7f8fa]">
                  <div className="w-10 h-10 rounded-full bg-[#f2f4f6] flex items-center justify-center shrink-0">
                    <span className="text-[14px] font-bold text-[#8b95a1]">{feed.users?.full_name?.substring(0,1)}</span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-extrabold text-[#191f28] leading-none">{feed.users?.full_name}</h3>
                    <p className="text-[12px] text-[#8b95a1] mt-1">@{feed.users?.username} · {new Date(feed.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {feed.workout_logs && (
                  <div className="bg-[#fbfcff] mx-4 my-3 p-3.5 rounded-2xl border border-[#3182f6]/10 flex flex-col gap-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#e5e8eb]/70">
                      <Clock className="w-[18px] h-[18px] text-[#3182f6]" strokeWidth={2.5} />
                      <span className="text-[14px] font-extrabold text-[#191f28]">총 {Math.round((feed.workout_logs.duration_seconds || 0) / 60)}분 소요</span>
                    </div>

                    <div className="space-y-2 mt-1">
                      {feed.workout_logs.workout_log_items?.map((item, idx) => {
                        // 선택되지 않은 종목 스킵
                        if (feed.feed_options?.selected_items && Array.isArray(feed.feed_options.selected_items)) {
                          if (!feed.feed_options.selected_items.includes(item.id)) return null;
                        }
                        
                        const exerciseName = item.equipments?.name || item.user_custom_exercises?.name || '알 수 없는 운동';
                        const validSets = Array.isArray(item.sets) ? item.sets.filter(s => s.done) : [];
                        if (validSets.length === 0) return null;

                        return (
                          <div key={idx} className="bg-white rounded-xl p-3 border border-[#e5e8eb]/70 shadow-sm flex flex-col gap-2">
                            <p className="text-[14px] font-extrabold text-[#191f28] flex items-center gap-1.5 leading-none">
                              <Dumbbell className="w-4 h-4 text-[#8b95a1]" />
                              {exerciseName}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {validSets.map((s, sIdx) => (
                                <span key={sIdx} className="text-[12px] bg-[#f2f4f6] text-[#4e5968] px-2 py-1 rounded-md font-bold leading-none flex items-center h-6">
                                  {s.setIdx || s.set || (sIdx + 1)}세트 {s.weight > 0 ? `· ${s.weight}kg` : ''} · {s.reps}회
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {feed.workout_logs?.photo_url && feed.feed_options?.show_photo !== false && (
                  <div className="px-4 pb-3">
                    <img src={feed.workout_logs.photo_url} alt="운동 인증" className="w-full h-auto rounded-xl object-contain border border-[#f2f4f6] max-h-80 bg-[#f9fafb]" />
                  </div>
                )}

                <div className="px-5 pb-4 pt-1">
                  <p className="text-[14px] text-[#4e5968] leading-relaxed whitespace-pre-wrap">{feed.content}</p>
                </div>

                <div className="px-3 py-2 bg-[#f9fafb] flex items-center gap-1 border-t border-[#f2f4f6]">
                   <button 
                     onClick={() => handleLike(feed.id, isLikedByMe)}
                     className={`p-2 flex items-center gap-1.5 transition-colors rounded-xl hover:bg-white active:scale-95 ${isLikedByMe ? 'text-[#f04452]' : 'text-[#8b95a1] hover:text-[#f04452]'}`}
                   >
                     <Heart className="w-[18px] h-[18px]" strokeWidth={2.5} fill={isLikedByMe ? "currentColor" : "none"}/>
                     <span className="text-[12px] font-bold">{likesCount > 0 ? likesCount : '좋아요'}</span>
                   </button>
                   <button 
                     onClick={() => setExpandedComments(p => ({ ...p, [feed.id]: !p[feed.id] }))}
                     className={`p-2 flex items-center gap-1.5 transition-colors rounded-xl hover:bg-white active:scale-95 ${expandedComments[feed.id] ? 'text-[#3182f6]' : 'text-[#8b95a1] hover:text-[#3182f6]'}`}
                   >
                     <MessageSquare className="w-[18px] h-[18px]" strokeWidth={2.5}/>
                     <span className="text-[12px] font-bold">{commentsCount > 0 ? `댓글 ${commentsCount}` : '응원하기'}</span>
                   </button>
                </div>

                {expandedComments[feed.id] && (
                  <div className="bg-[#f9fafb] px-4 pb-4 border-t border-[#f2f4f6]">
                    {/* 댓글 리스트 */}
                    <div className="space-y-3 pt-3 mb-3">
                      {feed.community_feed_comments?.map(c => (
                        <div key={c.id} className="flex gap-2 text-[13px]">
                          <span className="font-bold text-[#191f28] shrink-0">{c.users?.full_name}</span>
                          <span className="text-[#4e5968] break-all">{c.content}</span>
                        </div>
                      ))}
                      {(!feed.community_feed_comments || feed.community_feed_comments.length === 0) && (
                        <p className="text-[12px] text-[#8b95a1] text-center py-2">첫 응원의 메시지를 남겨보세요!</p>
                      )}
                    </div>
                    {/* 입력창 */}
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        value={commentInputs[feed.id] || ''}
                        onChange={(e) => setCommentInputs(p => ({ ...p, [feed.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && submitComment(feed.id)}
                        placeholder="응원 메시지 입력..."
                        className="w-full bg-white border border-[#e5e8eb] rounded-full py-2.5 pl-4 pr-10 text-[13px] outline-none focus:border-[#3182f6] transition-colors shadow-sm"
                      />
                      <button 
                        onClick={() => submitComment(feed.id)}
                        className="absolute right-1.5 p-1.5 rounded-full text-[#3182f6] hover:bg-[#e8f3ff] transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
             </div>
             );
          })}
        </div>
      )}
    </div>
  );
}
