import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { subscribeToPush } from '../utils/pushNotification';
import { 
  Bell, Shield, LogOut, User, Ruler, Target, Settings, ChevronRight, 
  CheckCircle2, AlertCircle, XCircle 
} from 'lucide-react';


export default function ProfilePage() {
  const navigate = useNavigate();
  
  // 기본 사용자 정보 (Auth)
  const [authUser, setAuthUser] = useState(null);
  
  // 화면 표시 및 편집을 위한 프로필 상태
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    height: '',
    weight: '',
    target_weight: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // 알림 설정 (DB 연동)
  const [notifSettings, setNotifSettings] = useState({
    notify_likes: true,
    notify_comments: true,
    notify_follows: true,
  });
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  
  // 모달 제어용 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ ...profile });
  const [usernameValid, setUsernameValid] = useState(true);
  const [usernameError, setUsernameError] = useState('');

  // 1. Supabase에서 사용자 정보 가져오기
  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login', { replace: true }); return; }
      setAuthUser(user);

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData) {
        setProfile({
          username: userData.username || '',
          full_name: userData.full_name || '',
          height: userData.height || '',
          weight: userData.weight || '',
          target_weight: userData.target_weight || '',
        });
      }

      // 알림 설정 불러오기
      const { data: ns } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (ns) setNotifSettings({ notify_likes: ns.notify_likes, notify_comments: ns.notify_comments, notify_follows: ns.notify_follows });

      // 현재 push 권한 상태 확인
      if ('Notification' in window) {
        setIsPushEnabled(Notification.permission === 'granted');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // 2. 모달창 데이터 동기화
  useEffect(() => {
    if (showEditModal) {
      setEditForm({ ...profile });
      setUsernameValid(true);
      setUsernameError('');
    }
  }, [showEditModal, profile]);

  // 3. 아이디 고유성 검사 (Debounced)
  useEffect(() => {
    if (!showEditModal || editForm.username === profile.username) return;

    const checkDuplicate = async () => {
      const sanitized = editForm.username.toLowerCase().replace(/[^a-z0-9_.]/g, '');
      if (sanitized.length < 3) {
        setUsernameError('아이디는 3자 이상이어야 합니다.');
        setUsernameValid(false);
        return;
      }
      const { data } = await supabase.from('users').select('id').eq('username', sanitized).maybeSingle();
      if (data && data.id !== authUser.id) {
        setUsernameError('이미 사용 중인 아이디입니다.');
        setUsernameValid(false);
      } else {
        setUsernameError('');
        setUsernameValid(true);
      }
    };
    
    const timer = setTimeout(checkDuplicate, 400);
    return () => clearTimeout(timer);
  }, [editForm.username, showEditModal, profile.username, authUser]);

  // 4. 정보 저장 트리거
  const handleSaveProfile = async () => {
    if (!usernameValid) { alert("아이디를 확인해주세요."); return; }
    if (!editForm.full_name.trim()) { alert("활동명(이름)을 입력해주세요."); return; }
    
    setIsSaving(true);
    
    // Auth 이메일 메타데이터 업데이트 (선택 사항이나 보통 별도 처리)
    // 여기 테이블 users만 업데이트
    const sanitizedUsername = editForm.username.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    
    const { error } = await supabase
      .from('users')
      .update({
        username: sanitizedUsername,
        full_name: editForm.full_name.trim(),
        height: editForm.height ? parseInt(editForm.height) : null,
        weight: editForm.weight ? parseFloat(editForm.weight) : null,
        target_weight: editForm.target_weight ? parseFloat(editForm.target_weight) : null,
      })
      .eq('id', authUser.id);
      
    setIsSaving(false);
    
    if (error) {
      alert("정보 저장 중 오류가 발생했습니다. (DB 테이블에 컬럼이 준비되었는지 확인하세요)");
      console.error(error);
    } else {
      setShowEditModal(false);
      fetchProfile(); // 뷰 새로고침
    }
  };

  const handleNotifToggle = async (key) => {
    const newVal = !notifSettings[key];
    setNotifSettings(prev => ({ ...prev, [key]: newVal }));
    if (!authUser) return;
    await supabase.from('notification_settings').upsert(
      { user_id: authUser.id, ...notifSettings, [key]: newVal },
      { onConflict: 'user_id' }
    );
  };

  const handleEnablePush = async () => {
    if (!authUser) return;
    const ok = await subscribeToPush(authUser.id);
    setIsPushEnabled(ok);
    if (!ok) alert('알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const handleWithdrawal = async () => {
    const confirmDelete = window.confirm("정말 탈퇴하시겠습니까? 기록된 모든 정보가 삭제되며 복구할 수 없습니다.");
    if (!confirmDelete) return;
    try {
      if (authUser) {
        // [수정됨] 단일 프로필 지우기가 아닌, 완벽 영구삭제 자폭(RPC) 함수를 서버로 원격 호출합니다.
        const { error } = await supabase.rpc('delete_user');
        if (error) {
          console.error(error);
          alert("서버 오류: 아직 관리자가 완벽 탈퇴 스위치(SQL)를 켜지 않았습니다.");
          return;
        }
        
        // 정상 파기 후 앱 브라우저에서도 토큰을 없애고 밖으로(로그아웃) 내보냅니다.
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
        alert("계정이 영구적으로 삭제되었습니다. 이용해 주셔서 감사합니다.");
      }
    } catch (err) {
      alert("탈퇴 처리 중 문제가 발생했습니다.");
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center bg-[#f7f8fa]"><span className="animate-spin w-8 h-8 rounded-full border-2 border-[#3182f6]/30 border-t-[#3182f6]" /></div>;
  }

  return (
    <div className="min-h-[100dvh] pb-24 bg-[#f7f8fa] font-sans">
      {/* Header Profile Summary */}
      <div className="bg-white px-6 pt-10 pb-6 lg:px-10 lg:pt-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-[#f2f4f6] ring-2 ring-[#f2f4f6] flex items-center justify-center">
            <User className="w-8 h-8 text-[#b0b8c1]" />
          </div>
          <div className="flex-1">
            <h1 className="text-[22px] font-extrabold text-[#191f28] tracking-tight">{profile.full_name || '이름 없음'}</h1>
            <p className="text-[13px] text-[#8b95a1] mt-0.5">@{profile.username || 'id_not_set'}</p>
          </div>
          <button onClick={() => setShowEditModal(true)} className="w-9 h-9 rounded-full bg-[#f2f4f6] hover:bg-[#e5e8eb] flex items-center justify-center transition-colors">
            <Settings className="w-[18px] h-[18px] text-[#8b95a1]" />
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <span className="px-3 py-1.5 bg-[#ebf4ff] text-[#3182f6] rounded-[8px] text-[12px] font-bold">
            LoGym 회원
          </span>
          <span className="px-3 py-1.5 bg-[#f3f0ff] text-[#8b5cf6] rounded-[8px] text-[12px] font-bold">
            {authUser?.email}
          </span>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4 max-w-sm mx-auto">
        {/* 신체 정보 카드 */}
        <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden border border-[#e5e8eb]">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <Ruler className="w-[18px] h-[18px] text-[#8b95a1]" />
              <h3 className="text-[16px] font-bold text-[#191f28]">신체 정보</h3>
            </div>
            <button onClick={() => setShowEditModal(true)} className="text-[12px] font-bold text-[#3182f6] bg-[#ebf4ff] px-2.5 py-1.5 rounded-lg active:scale-95">입력/수정</button>
          </div>
          <div className="grid grid-cols-3 gap-0 px-5 pb-5 mt-2">
            <div className="text-center py-2">
              <p className="text-[22px] font-extrabold text-[#191f28]">{profile.height || '-'}</p>
              <p className="text-[12px] text-[#8b95a1] mt-0.5 font-medium">키 (cm)</p>
            </div>
            <div className="text-center py-2 border-x border-[#f2f4f6]">
              <p className="text-[22px] font-extrabold text-[#191f28]">{profile.weight || '-'}</p>
              <p className="text-[12px] text-[#8b95a1] mt-0.5 font-medium">체중 (kg)</p>
            </div>
            <div className="text-center py-2 relative">
              <p className="text-[22px] font-extrabold text-[#3182f6]">{profile.target_weight || '-'}</p>
              <p className="text-[12px] text-[#8b95a1] mt-0.5 font-medium">목표 (kg)</p>
              <Target className="absolute top-0 right-2 w-3.5 h-3.5 text-[#3182f6]/20" />
            </div>
          </div>
        </div>

        {/* 알림 설정 카드 */}
        <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb] overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <Bell className="w-[18px] h-[18px] text-[#8b95a1]" />
            <h3 className="text-[16px] font-bold text-[#191f28]">알림 설정</h3>
          </div>

          {/* 푸시 알림 활성화 버튼 */}
          {!isPushEnabled && (
            <div className="mx-5 mb-3 p-3 bg-[#fffbeb] border border-[#fde68a] rounded-xl flex items-center justify-between gap-3">
              <p className="text-[12px] font-medium text-[#92400e]">알림을 받으려면 브라우저 권한이 필요해요.</p>
              <button
                onClick={handleEnablePush}
                className="shrink-0 px-3 py-1.5 bg-[#f59e0b] text-white text-[12px] font-bold rounded-lg active:scale-95"
              >
                알림 허용
              </button>
            </div>
          )}

          {[
            { key: 'notify_follows', label: '팔로워 추가 알림', desc: '누군가 나를 팔로우하면 알림' },
            { key: 'notify_likes',   label: '좋아요 알림',      desc: '내 피드에 좋아요가 달리면 알림' },
            { key: 'notify_comments',label: '댓글 알림',        desc: '내 피드에 댓글이 달리면 알림' },
          ].map(({ key, label, desc }, idx, arr) => (
            <div key={key} className={`flex items-center justify-between px-5 py-4 ${idx < arr.length - 1 ? 'border-b border-[#f2f4f6]' : ''}`}>
              <div>
                <p className="text-[15px] font-bold text-[#191f28]">{label}</p>
                <p className="text-[12px] text-[#8b95a1] mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => handleNotifToggle(key)}
                className={`w-12 h-7 rounded-full p-[3px] transition-colors duration-200 ${
                  notifSettings[key] ? 'bg-[#3182f6]' : 'bg-[#e5e8eb]'
                }`}
              >
                <div className={`w-[22px] h-[22px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  notifSettings[key] ? 'translate-x-[22px]' : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}
        </div>

        {/* 계정 관리 액션 */}
        <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden border border-[#e5e8eb]">
          <button onClick={() => setShowEditModal(true)} className="w-full flex items-center justify-between px-5 py-4 border-b border-[#f2f4f6] active:bg-[#f7f8fa] transition-colors">
            <div className="flex items-center gap-3">
              <User className="w-[18px] h-[18px] text-[#191f28]" />
              <span className="text-[15px] font-bold text-[#191f28]">내 개인정보 수정</span>
            </div>
            <ChevronRight className="w-[18px] h-[18px] text-[#d1d6db]" />
          </button>
          
          <button onClick={handleLogout} className="w-full flex items-center justify-between px-5 py-4 border-b border-[#f2f4f6] active:bg-[#f7f8fa] transition-colors">
            <div className="flex items-center gap-3">
              <LogOut className="w-[18px] h-[18px] text-[#8b95a1]" />
              <span className="text-[15px] font-bold text-[#4e5968]">로그아웃</span>
            </div>
          </button>
          
          <button onClick={handleWithdrawal} className="w-full flex items-center justify-between px-5 py-4 active:bg-[#f7f8fa] transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="w-[18px] h-[18px] text-[#f04452]" />
              <span className="text-[15px] font-bold text-[#f04452]">계정 영구 삭제(탈퇴)</span>
            </div>
          </button>
        </div>
      </div>

      {/* 정보 수정 팝업 모달 */}
      {showEditModal && (
         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl pb-8 px-5 pt-5 animate-in slide-in-from-bottom-2 sm:slide-in-from-bottom-0 sm:fade-in duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#e5e8eb] sm:hidden"></div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] font-extrabold text-[#191f28]">개인정보 수정</h2>
              <button onClick={() => setShowEditModal(false)}><XCircle className="w-7 h-7 text-[#8b95a1]"/></button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              <div>
                <label className="text-[13px] font-bold text-[#4e5968] block mb-1.5">아이디 (username)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#8b95a1]">@</span>
                  <input 
                    value={editForm.username} 
                    onChange={e => setEditForm({...editForm, username: e.target.value})} 
                    className={`w-full bg-[#f2f4f6] text-[15px] font-bold text-[#191f28] outline-none rounded-xl py-3.5 pl-9 pr-4 border-2 transition-colors ${
                      usernameError ? 'border-red-400' : 'border-transparent focus:border-[#3182f6]'
                    }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameValid && editForm.username.length >= 3 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                </div>
                {usernameError && <p className="text-[11px] font-bold text-red-500 mt-1">{usernameError}</p>}
                {!usernameError && <p className="text-[11px] text-[#8b95a1] mt-1">영문/숫자, 타인과 중복 불가</p>}
              </div>
              
              <div>
                <label className="text-[13px] font-bold text-[#4e5968] block mb-1.5">표시 이름</label>
                <input 
                  value={editForm.full_name} 
                  onChange={e => setEditForm({...editForm, full_name: e.target.value})} 
                  placeholder="예: 김로짐"
                  className="w-full bg-[#f2f4f6] text-[15px] font-bold text-[#191f28] outline-none border-2 border-transparent focus:border-[#3182f6] rounded-xl px-4 py-3.5 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-[#f2f4f6]">
                <div>
                  <label className="text-[13px] font-bold text-[#4e5968] block mb-1.5">키 (cm)</label>
                  <input 
                    type="number"
                    value={editForm.height} 
                    onChange={e => setEditForm({...editForm, height: e.target.value})} 
                    placeholder="175"
                    className="w-full bg-[#f2f4f6] text-[15px] font-bold text-[#191f28] outline-none border-2 border-transparent focus:border-[#3182f6] rounded-xl px-4 py-3.5"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-[#4e5968] block mb-1.5">체중 (kg)</label>
                  <input 
                    type="number"
                    value={editForm.weight} 
                    onChange={e => setEditForm({...editForm, weight: e.target.value})} 
                    placeholder="70"
                    className="w-full bg-[#f2f4f6] text-[15px] font-bold text-[#191f28] outline-none border-2 border-transparent focus:border-[#3182f6] rounded-xl px-4 py-3.5"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[13px] font-bold text-[#4e5968] block mb-1.5">목표 체중 (kg)</label>
                <input 
                  type="number"
                  value={editForm.target_weight} 
                  onChange={e => setEditForm({...editForm, target_weight: e.target.value})} 
                  placeholder="65"
                  className="w-full bg-[#f2f4f6] text-[15px] font-bold text-[#3182f6] outline-none border-2 border-transparent focus:border-[#3182f6] rounded-xl px-4 py-3.5"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveProfile}
              disabled={isSaving || !usernameValid}
              className="w-full h-14 mt-6 bg-[#3182f6] text-white font-bold text-[16px] rounded-2xl active:scale-98 disabled:opacity-60 transition-transform"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
         </div>
      )}
    </div>
  );
}
