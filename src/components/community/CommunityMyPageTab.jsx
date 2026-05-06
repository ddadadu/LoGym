import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Calendar as CalendarIcon, Upload, Trash2, CheckCircle2, Clock, Dumbbell, Heart, MessageSquare, Send, Users } from 'lucide-react';
import UserListModal from './UserListModal';

// 간이 날짜 포매터
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('ko-KR');

export default function CommunityMyPageTab({ currentUser }) {
  const [myLogs, setMyLogs] = useState([]);
  const [myFeeds, setMyFeeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 피드 발행 모달용 상태
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [feedContent, setFeedContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedOptions, setFeedOptions] = useState({ showPhoto: true, selectedItemIds: {} });
  
  // 댓글 토글 및 입력 상태
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  // 팔로워/팔로잉 상태
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('followers');

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. 내 운동 기록 (최근순 20개) 가져오기 + 모달에 띄울 종목 정보 조인
      const { data: logsData } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout_log_items(
            id,
            equipments(name),
            user_custom_exercises(name)
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
        
      // 2. 내 피드 
      const { data: feedsData } = await supabase
        .from('community_feeds')
        .select(`
          *,
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
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      setMyLogs(logsData || []);
      setMyFeeds(feedsData || []);

      // 팔로워/팔로잉 카운트 조회
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followed_id', currentUser.id);
      
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', currentUser.id);

      setCounts({ followers: followersCount || 0, following: followingCount || 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedLog) return;
    setIsPublishing(true);
    
    // 사용자가 체크한 운동 아이템의 ID만 배열로 축출
    const checkedItemIds = Object.keys(feedOptions.selectedItemIds).filter(id => feedOptions.selectedItemIds[id]);

    const { error } = await supabase.from('community_feeds').insert({
      user_id: currentUser.id,
      workout_log_id: selectedLog.id,
      content: feedContent,
      feed_options: {
        show_photo: feedOptions.showPhoto,
        selected_items: checkedItemIds
      }
    });
    
    setIsPublishing(false);
    if (!error) {
      alert("공개 피드에 발행되었습니다!");
      setShowPublishModal(false);
      setFeedContent('');
      fetchData(); // 새로고침
    } else {
      alert("발행 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteFeed = async (feedId) => {
    const confirm = window.confirm("이 피드를 삭제하시겠습니까? (운동 기록은 남아있습니다)");
    if (!confirm) return;
    
    await supabase.from('community_feeds').delete().eq('id', feedId);
    fetchData();
  };

  const submitComment = async (feedId) => {
    const text = commentInputs[feedId];
    if (!text || !text.trim()) return;

    // 즉시 상태 변경(낙관적 UI)
    const tempComment = {
      id: Math.random().toString(),
      content: text,
      created_at: new Date().toISOString(),
      users: { full_name: currentUser.full_name || '나' }
    };
    
    setMyFeeds(prev => prev.map(f => {
      if (f.id === feedId) {
        return { ...f, community_feed_comments: [...(f.community_feed_comments||[]), tempComment] };
      }
      return f;
    }));
    setCommentInputs(p => ({ ...p, [feedId]: '' }));

    // DB 등록
    await supabase.from('community_feed_comments').insert({
      feed_id: feedId,
      user_id: currentUser.id,
      content: text
    });
  };

  const openModal = (log) => {
    setSelectedLog(log);
    setFeedContent('');
    
    // 모달 띄울 때 해당 운동의 하위 종목들을 모두 '기본 체크(true)' 상태로 맵핑
    const initialItemMap = {};
    if (log.workout_log_items) {
      log.workout_log_items.forEach(item => {
        initialItemMap[item.id] = true;
      });
    }
    setFeedOptions({ showPhoto: !!log.photo_url, selectedItemIds: initialItemMap });
    
    setShowPublishModal(true);
  };

  if (isLoading) {
    return <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-[#3182f6]/30 border-t-[#3182f6] rounded-full animate-spin"></div></div>;
  }

  // feed 목록에 존재하는 workout_log_id 들의 set
  const feedLogIds = new Set(myFeeds.map(f => f.workout_log_id).filter(Boolean));

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-300">
      
      {/* 프로필 헤더 추가 */}
      <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb] p-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-[#f2f4f6] flex items-center justify-center mb-3">
          <Users className="w-10 h-10 text-[#b0b8c1]" />
        </div>
        <h2 className="text-[20px] font-extrabold text-[#191f28] mb-1">{currentUser.full_name}</h2>
        <p className="text-[14px] text-[#8b95a1] mb-5">@{currentUser.username}</p>
        
        <div className="flex items-center gap-8 border-t border-[#f2f4f6] pt-5 w-full justify-center">
          <button 
            onClick={() => { setModalType('followers'); setModalOpen(true); }}
            className="flex flex-col items-center gap-1 group"
          >
            <span className="text-[18px] font-extrabold text-[#191f28] group-hover:text-[#3182f6] transition-colors">{counts.followers}</span>
            <span className="text-[12px] font-bold text-[#8b95a1]">팔로워</span>
          </button>
          <div className="w-[1px] h-8 bg-[#f2f4f6]" />
          <button 
            onClick={() => { setModalType('following'); setModalOpen(true); }}
            className="flex flex-col items-center gap-1 group"
          >
            <span className="text-[18px] font-extrabold text-[#191f28] group-hover:text-[#3182f6] transition-colors">{counts.following}</span>
            <span className="text-[12px] font-bold text-[#8b95a1]">팔로잉</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb] p-5">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             <CalendarIcon className="w-5 h-5 text-[#8b95a1]" />
             <h3 className="text-[16px] font-bold text-[#191f28]">내 운동 기록 보관함</h3>
           </div>
           <span className="text-[12px] font-bold text-[#3182f6] bg-[#e8f3ff] px-2.5 py-1 rounded-full">최근 20개</span>
        </div>

        <div className="space-y-3">
          {myLogs.length === 0 ? (
            <p className="text-[13px] text-[#8b95a1] text-center py-6">운동 버튼을 눌러 첫 기록을 남겨보세요.</p>
          ) : myLogs.map(log => {
             const isPublished = feedLogIds.has(log.id);
             return (
               <div key={log.id} className="flex items-center justify-between p-3.5 bg-[#f9fafb] border border-[#f2f4f6] rounded-2xl">
                 <div>
                   <p className="text-[14px] font-extrabold text-[#191f28]">{formatDate(log.created_at)}</p>
                   <p className="text-[12px] text-[#8b95a1] mt-0.5">{Math.round((log.duration_seconds || 0) / 60)}분 소요</p>
                 </div>
                 {isPublished ? (
                    <div className="flex items-center gap-1 text-[#00c471]">
                      <CheckCircle2 className="w-4 h-4"/>
                      <span className="text-[12px] font-bold">발행됨</span>
                    </div>
                 ) : (
                    <button 
                      onClick={() => openModal(log)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e8eb] rounded-xl text-[12px] font-bold text-[#4e5968] hover:border-[#3182f6] hover:text-[#3182f6] active:scale-95 transition-all shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      피드로 발행
                    </button>
                 )}
               </div>
             )
          })}
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb] p-5">
        <h3 className="text-[16px] font-bold text-[#191f28] mb-4">발행한 피드 관리 ({myFeeds.length})</h3>
        <div className="space-y-3">
          {myFeeds.length === 0 ? (
            <p className="text-[13px] text-[#8b95a1] text-center py-6">아직 발행한 피드가 없습니다.</p>
          ) : myFeeds.map(feed => {
             const likesCount = feed.community_feed_likes?.length || 0;
             const isLikedByMe = feed.community_feed_likes?.some(l => l.user_id === currentUser.id);
             const commentsCount = feed.community_feed_comments?.length || 0;

             return (
              <div key={feed.id} className="bg-white border border-[#e5e8eb] rounded-2xl overflow-hidden shadow-sm">
               
               {feed.workout_logs && (
                 <div className="bg-[#fbfcff] mb-4 p-3.5 rounded-2xl border border-[#3182f6]/10 flex flex-col gap-2">
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
                 <div className="pb-3 pt-1">
                   <img src={feed.workout_logs.photo_url} alt="운동 인증" className="w-full h-auto rounded-xl object-contain border border-[#f2f4f6] max-h-80 bg-[#f9fafb]" />
                 </div>
               )}

               <div className="p-4 pt-1">
                 <p className="text-[14px] text-[#191f28] leading-relaxed whitespace-pre-wrap mb-3">{feed.content}</p>
                 <div className="flex items-center justify-between text-[12px] font-medium text-[#8b95a1]">
                   <span className="font-bold">{formatDate(feed.created_at)}</span>
                   <button onClick={() => handleDeleteFeed(feed.id)} className="flex items-center gap-1 text-[12px] text-[#f04452] font-bold hover:underline active:scale-95">
                     <Trash2 className="w-3.5 h-3.5" />
                     게시물 삭제
                   </button>
                 </div>
               </div>

               {/* 리액션 & 댓글 바 */}
               <div className="px-3 py-2 bg-[#f9fafb] flex items-center justify-between border-t border-[#f2f4f6]">
                  <div className="flex items-center gap-1">
                    <div className={`p-2 flex items-center gap-1.5 transition-colors rounded-xl ${isLikedByMe ? 'text-[#f04452]' : 'text-[#8b95a1]'}`}>
                      <Heart className="w-[18px] h-[18px]" strokeWidth={2.5} fill={isLikedByMe ? "currentColor" : "none"}/>
                      <span className="text-[12px] font-bold">{likesCount > 0 ? likesCount : '좋아요'}</span>
                    </div>
                    <button 
                      onClick={() => setExpandedComments(p => ({ ...p, [feed.id]: !p[feed.id] }))}
                      className={`p-2 flex items-center gap-1.5 transition-colors rounded-xl hover:bg-white active:scale-95 ${expandedComments[feed.id] ? 'text-[#3182f6]' : 'text-[#8b95a1] hover:text-[#3182f6]'}`}
                    >
                      <MessageSquare className="w-[18px] h-[18px]" strokeWidth={2.5}/>
                      <span className="text-[12px] font-bold">{commentsCount > 0 ? `댓글 ${commentsCount}` : '댓글보기'}</span>
                    </button>
                  </div>
               </div>

               {expandedComments[feed.id] && (
                  <div className="bg-[#f9fafb] px-4 pb-4 border-t border-[#f2f4f6]">
                    <div className="space-y-3 pt-3 mb-3">
                      {feed.community_feed_comments?.map(c => (
                        <div key={c.id} className="flex gap-2 text-[13px]">
                          <span className="font-bold text-[#191f28] shrink-0">{c.users?.full_name}</span>
                          <span className="text-[#4e5968] break-all">{c.content}</span>
                        </div>
                      ))}
                      {(!feed.community_feed_comments || feed.community_feed_comments.length === 0) && (
                        <p className="text-[12px] text-[#8b95a1] text-center py-2">등록된 댓글이 없습니다.</p>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        value={commentInputs[feed.id] || ''}
                        onChange={(e) => setCommentInputs(p => ({ ...p, [feed.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && submitComment(feed.id)}
                        placeholder="친구들에게 답글을 남겨보세요..."
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
      </div>

      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-[18px] font-extrabold text-[#191f28] mb-1">피드 작성</h2>
            <p className="text-[13px] text-[#8b95a1] mb-5">{formatDate(selectedLog?.created_at)}의 운동을 공유합니다.</p>
            
            <div className="mb-4 bg-[#f9fafb] p-3 rounded-xl border border-[#e5e8eb] max-h-48 overflow-y-auto">
              <p className="text-[12px] font-bold text-[#8b95a1] mb-2">공개할 내용을 선택하세요</p>
              
              {selectedLog?.photo_url && (
                <label className="flex items-center gap-2 mb-2 pb-2 border-b border-[#f2f4f6] cursor-pointer active:scale-95 transition-transform">
                  <input type="checkbox" checked={feedOptions.showPhoto} onChange={(e) => setFeedOptions(p => ({...p, showPhoto: e.target.checked}))} className="w-4 h-4 rounded text-[#3182f6] accent-[#3182f6]" />
                  <span className="text-[13px] font-bold text-[#191f28]">운동 인증샷 공개하기</span>
                </label>
              )}
              
              {selectedLog?.workout_log_items?.map((item, i) => {
                const exName = item.equipments?.name || item.user_custom_exercises?.name || '알 수 없는 종목';
                return (
                  <label key={item.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-[#f2f4f6] rounded px-1 -mx-1">
                    <input 
                       type="checkbox" 
                       checked={feedOptions.selectedItemIds[item.id] || false} 
                       onChange={(e) => setFeedOptions(p => ({
                         ...p, 
                         selectedItemIds: { ...p.selectedItemIds, [item.id]: e.target.checked }
                       }))} 
                       className="w-4 h-4 rounded accent-[#3182f6]" 
                    />
                    <span className="text-[13px] font-medium text-[#4e5968]">{exName}</span>
                  </label>
                )
              })}
            </div>

            <textarea 
              value={feedContent}
              onChange={e => setFeedContent(e.target.value)}
              placeholder="오늘 운동은 어떠셨나요?💪"
              rows={3}
              className="w-full bg-[#f2f4f6] rounded-xl p-4 text-[14px] outline-none focus:ring-2 focus:ring-[#3182f6]/20 transition-all resize-none text-[#191f28] border border-transparent focus:border-[#3182f6] shadow-inner mb-4"
            />
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPublishModal(false)}
                className="flex-1 py-3.5 rounded-xl bg-[#f2f4f6] text-[#4e5968] font-bold text-[15px] active:scale-95 transition-all"
              >취소</button>
              <button 
                onClick={handlePublish}
                disabled={isPublishing || !feedContent.trim()}
                className="flex-[2] py-3.5 rounded-xl bg-[#3182f6] text-white font-bold text-[15px] shadow-lg shadow-[#3182f6]/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isPublishing ? '발행 중...' : '친구들에게 공개'}
              </button>
            </div>
          </div>
        </div>
      )}

      <UserListModal 
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); fetchData(); }}
        userId={currentUser.id}
        type={modalType}
        currentUser={currentUser}
      />
    </div>
  );
}
