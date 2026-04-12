import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import CommunityHomeTab from '../components/community/CommunityHomeTab';
import CommunitySearchTab from '../components/community/CommunitySearchTab';
import CommunityMyPageTab from '../components/community/CommunityMyPageTab';
import { Users, Search, UserCircle2 } from 'lucide-react';

export default function CommunityPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    // `users` 테이블 정보까지 로드
    const { data: uData } = await supabase.from('users').select('*').eq('id', user.id).single();
    setCurrentUser(uData); // uData 안에는 home_gym_id 등 정보 포함
  };

  if (!currentUser) {
    return <div className="min-h-full flex items-center justify-center bg-[#f7f8fa]"><span className="animate-spin w-8 h-8 rounded-full border-2 border-[#3182f6]/30 border-t-[#3182f6]"></span></div>;
  }

  return (
    <div className="min-h-[100dvh] pb-24 bg-[#f7f8fa] font-sans flex flex-col">
      <header className="flex h-14 items-center px-5 bg-white shadow-sm shrink-0 sticky top-0 z-40">
        <h1 className="text-lg font-bold text-[#191f28]">소셜 커뮤니티</h1>
      </header>

      {/* 내부 탭 바 */}
      <div className="flex bg-white px-3 border-b border-[#e5e8eb] sticky top-14 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.04)] box-border">
        {[
          { key: 'home', label: '홈 피드', icon: Users },
          { key: 'search', label: '유저 탐색', icon: Search },
          { key: 'mypage', label: '내 관리', icon: UserCircle2 },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-3.5 flex items-center justify-center gap-1.5 text-[14px] transition-colors relative outline-none ${
              activeTab === t.key ? 'text-[#191f28]' : 'text-[#8b95a1]'
            }`}
            style={{ fontWeight: activeTab === t.key ? 700 : 500 }}
          >
             <t.icon className="w-[18px] h-[18px]" strokeWidth={2.5} />
             {t.label}
             {activeTab === t.key && <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#191f28]" />}
          </button>
        ))}
      </div>

      {/* 컨텐츠 렌더링 영역 */}
      <div className="flex-1 w-full overflow-y-auto">
        {activeTab === 'home' && <CommunityHomeTab currentUser={currentUser} />}
        {activeTab === 'search' && <CommunitySearchTab currentUser={currentUser} />}
        {activeTab === 'mypage' && <CommunityMyPageTab currentUser={currentUser} />}
      </div>
    </div>
  );
}
