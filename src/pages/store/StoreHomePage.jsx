import { useNavigate, useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Users, TrendingUp, Star, ChevronRight, Dumbbell, CheckSquare,
  UserCheck, ClipboardList, Settings2, Bell, MapPin, Clock, Phone
} from 'lucide-react';

export default function StoreHomePage() {
  const { profile } = useOutletContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMembers: 0,
    equipmentCount: 0,
    trainerCount: 0,
  });
  const [recentNotices, setRecentNotices] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.home_gym_id) return;

    const fetchDashboardData = async () => {
      // 1. Total members
      const { count: memberCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('home_gym_id', profile.home_gym_id);

      // 2. Equipment types count
      const { count: equipCount } = await supabase
        .from('gym_equipments')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', profile.home_gym_id);

      // 3. Trainer count
      const { count: trainerCount } = await supabase
        .from('gym_trainers')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', profile.home_gym_id);

      // 4. Recent Requests
      const { data: requests } = await supabase
        .from('infrastructure_requests')
        .select('*')
        .eq('gym_id', profile.home_gym_id)
        .order('created_at', { ascending: false })
        .limit(20);

      setStats({
        totalMembers: memberCount || 0,
        equipmentCount: equipCount || 0,
        trainerCount: trainerCount || 0,
      });

      const savedDismissed = localStorage.getItem(`dismissed_notices_${profile.home_gym_id}`);
      const parsedDismissed = savedDismissed ? JSON.parse(savedDismissed) : [];
      setDismissedIds(parsedDismissed);

      if (requests) {
        setRecentNotices(requests.map(req => {
          const p = req.request_payload || {};
          let statusText = '상태변경';
          if (p.condition === 'maintenance') statusText = '고장/수리요청';
          else if (p.condition === 'excellent') statusText = '새 입고됨';
          else if (req.status === 'approved') statusText = '처리 완료됨';
          else if (req.status === 'rejected') statusText = '반려됨';
          
          return {
            id: req.id,
            type: req.request_type || '회원제보',
            text: `"${p.name || req.equipment_name || '알 수 없는 기구'} - ${statusText}"`,
            date: new Date(req.created_at).toLocaleDateString(),
            dot: req.status === 'pending' ? '#f59e0b' : '#00c471',
            rawStatus: req.status
          };
        }));
      }

      setIsLoading(false);
    };

    fetchDashboardData();
  }, [profile]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center pt-20">
        <span className="w-8 h-8 border-2 border-[#191f28]/20 border-t-[#191f28] rounded-full animate-spin" />
      </div>
    );
  }

  const gym = profile?.gyms || {};
  const activeNotices = recentNotices.filter(n => !dismissedIds.includes(n.id));

  const handleDismiss = (id, e) => {
    e.stopPropagation();
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem(`dismissed_notices_${profile.home_gym_id}`, JSON.stringify(newDismissed));
  };

  return (
    <div className="min-h-full pb-8">
      {/* Header */}
      <div className="bg-white px-5 pt-8 pb-5 lg:px-10 lg:pt-10">
        <div className="max-w-3xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] text-[#8b95a1] mb-0.5">점포 관리자 대시보드</p>
              <h1 className="text-[#191f28] text-[22px] tracking-[-0.03em]" style={{ fontWeight: 800 }}>
                {gym.name || '알 수 없는 점포'}
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#8b95a1]" />
                <span className="text-[12px] text-[#8b95a1] truncate max-w-[200px] sm:max-w-xs">{gym.address}</span>
              </div>
            </div>
            <button 
              onClick={() => setShowNotifications(true)}
              className="w-10 h-10 rounded-full bg-[#f2f4f6] flex items-center justify-center relative hover:bg-[#e8eaed] transition-colors"
            >
              <Bell className="w-5 h-5 text-[#4e5968]" strokeWidth={1.8} />
              {activeNotices.some(n => n.rawStatus === 'pending') && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#f04452] border border-white" />
              )}
            </button>
          </div>

          {/* Store badge */}
          <div className="flex items-center gap-2 mt-4">
            <span className="px-2.5 py-1 bg-[#f3f0ff] text-[#3182f6] rounded-full text-[12px]" style={{ fontWeight: 600 }}>🏋️ {gym.business_code || 'P85010'}</span>
            <span className="px-2.5 py-1 bg-[#e8faf0] text-[#00c471] rounded-full text-[12px]" style={{ fontWeight: 600 }}>✅ 인증 점포</span>
          </div>
        </div>
      </div>

      <div className="px-5 lg:px-10 py-5 max-w-3xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] text-[#8b95a1] mb-1.5">우리스토어 가입 회원</p>
            <div className="flex items-end gap-1">
              <span className="text-[22px] tracking-tight" style={{ fontWeight: 700, color: '#3182f6' }}>{stats.totalMembers}</span>
              <span className="text-[12px] text-[#8b95a1] mb-0.5">명</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] text-[#8b95a1] mb-1.5">등록/보유 기구 종류</p>
            <div className="flex items-end gap-1">
              <span className="text-[22px] tracking-tight" style={{ fontWeight: 700, color: '#00c471' }}>{stats.equipmentCount}</span>
              <span className="text-[12px] text-[#8b95a1] mb-0.5">종</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] text-[#8b95a1] mb-1.5">스토어 등록 트레이너</p>
            <div className="flex items-end gap-1">
              <span className="text-[22px] tracking-tight" style={{ fontWeight: 700, color: '#8b5cf6' }}>{stats.trainerCount}</span>
              <span className="text-[12px] text-[#8b95a1] mb-0.5">명</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] opacity-50 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="text-[11px] bg-black/70 text-white px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>준비중</span>
            </div>
            <p className="text-[12px] text-[#8b95a1] mb-1.5">이번 달 매장 방문자</p>
            <div className="flex items-end gap-1">
              <span className="text-[22px] tracking-tight" style={{ fontWeight: 700, color: '#f59e0b' }}>-</span>
              <span className="text-[12px] text-[#8b95a1] mb-0.5">회</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-[16px] text-[#191f28]" style={{ fontWeight: 600 }}>빠른 실행 메뉴</h3>
          </div>
          <div className="grid grid-cols-3 gap-0 px-3 pb-5">
            {[
              { icon: Dumbbell, label: '기구 현황 관리', color: '#3182f6', bg: '#ebf4ff', path: '/store/management' },
              { icon: UserCheck, label: '트레이너 정보 관리', color: '#00c471', bg: '#e8faf0', path: '/store/management' },
              { icon: ClipboardList, label: '인프라/미해결 요청', color: '#8b5cf6', bg: '#f3f0ff', path: '/store/requests' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 py-4 rounded-xl hover:bg-[#f7f8fa] transition-colors active:scale-95"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: action.bg }}>
                    <Icon className="w-5 h-5" style={{ color: action.color }} strokeWidth={2.2} />
                  </div>
                  <span className="text-[12px] text-[#4e5968] text-center" style={{ fontWeight: 500 }}>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Store Info Summary */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4">
          <div className="flex items-center justify-between px-5 pt-5 pb-0">
            <h3 className="text-[16px] text-[#191f28]" style={{ fontWeight: 600 }}>점포 상세 현황</h3>
            <button onClick={() => navigate('/store/management')} className="text-[13px] text-[#3182f6] px-3 py-1.5 hover:bg-[#f2f4f6] rounded-lg transition-colors" style={{ fontWeight: 500 }}>
              수정하기
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: '운영 시간', value: gym.operating_hours || '정보 없음', icon: Clock, color: '#3182f6' },
              { label: '지정 휴무일', value: gym.closed_day || '정보 없음', icon: Settings2, color: '#f59e0b' },
              { label: '점포 연락처', value: gym.phone || '등록되지 않음', icon: Phone, color: '#00c471' },
              { label: '주요 편의 시설', value: gym.facilities ? Object.keys(gym.facilities).length + '개 시설 등록완료' : '편의시설 미설정', icon: CheckSquare, color: '#8b5cf6' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 bg-[#f7f8fa] rounded-xl p-3 border border-transparent hover:border-[#e5e8eb] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.color + '15' }}>
                    <Icon className="w-4 h-4" style={{ color: item.color }} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#8b95a1] mb-0.5">{item.label}</p>
                    <p className="text-[14px] text-[#191f28] truncate" style={{ fontWeight: 600 }}>{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-8 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-[16px] text-[#191f28]" style={{ fontWeight: 600 }}>최근 접수된 제보</h3>
            <button onClick={() => navigate('/store/requests')} className="text-[13px] text-[#8b95a1] hover:text-[#4e5968] transition-colors">전체 요청 보기</button>
          </div>
          <div className="pb-2">
            {activeNotices.slice(0, 4).length > 0 ? activeNotices.slice(0, 4).map((notice, idx) => (
              <button
                key={notice.id}
                onClick={() => navigate('/store/requests')}
                className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#f7f8fa] transition-colors text-left ${
                  idx < Math.min(activeNotices.length, 4) - 1 ? 'border-b border-[#f7f8fa]' : ''
                }`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: notice.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[#191f28] truncate" style={{ fontWeight: 500 }}>{notice.text}</p>
                  <p className="text-[12px] text-[#8b95a1] mt-0.5">{notice.date}</p>
                </div>
                <span className="text-[11px] px-2.5 py-1 bg-[#f2f4f6] text-[#4e5968] rounded-full flex-shrink-0" style={{ fontWeight: 500 }}>
                  {notice.type}
                </span>
                <ChevronRight className="w-4 h-4 text-[#d1d6db] ml-1 flex-shrink-0" />
              </button>
            )) : (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#f2f4f6] flex items-center justify-center mb-2">
                  <ClipboardList className="w-5 h-5 text-[#c2c9d2]" />
                </div>
                <p className="text-[13px] text-[#8b95a1]">미처리된 유저 제보 사항이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Drawer Overlay */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-50 bg-[#191f28]/40 transition-opacity"
          onClick={() => setShowNotifications(false)}
        >
          {/* Drawer Panel */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-[300px] sm:w-[360px] bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-[#e5e8eb]">
              <h2 className="text-[18px] text-[#191f28]" style={{ fontWeight: 800 }}>알림 리스트</h2>
              <button 
                onClick={() => setShowNotifications(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f2f4f6] transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8b95a1]"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-[#f7f8fa] p-4 space-y-3">
              {activeNotices.length > 0 ? (
                activeNotices.map(notice => (
                  <div key={notice.id} className="bg-white rounded-xl p-4 shadow-sm relative group border border-[#e5e8eb]/50">
                    <button 
                      onClick={(e) => handleDismiss(notice.id, e)}
                      className="absolute right-3 top-3 w-6 h-6 flex items-center justify-center rounded-full bg-[#f2f4f6] text-[#8b95a1] hover:bg-[#e5e8eb] hover:text-[#4e5968] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <p className="text-[12px] text-[#3182f6] mb-1" style={{ fontWeight: 700 }}>{notice.type}</p>
                    <p className="text-[14px] text-[#191f28] pr-6" style={{ fontWeight: 500 }}>{notice.text}</p>
                    <p className="text-[11px] text-[#8b95a1] mt-2">{notice.date}</p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
                    <Bell className="w-6 h-6 text-[#c2c9d2]" />
                  </div>
                  <p className="text-[14px] text-[#4e5968]" style={{ fontWeight: 600 }}>새로운 알림이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
