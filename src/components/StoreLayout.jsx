import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Store, Settings2, ClipboardList, User, LogOut } from 'lucide-react';

const navItems = [
  { path: '/store', icon: Store, label: '내 점포' },
  { path: '/store/management', icon: Settings2, label: '점포 관리' },
  { path: '/store/requests', icon: ClipboardList, label: '요청 관리' },
  { path: '/store/profile', icon: User, label: '프로필' },
];

export default function StoreLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      
      const { data } = await supabase
        .from('users')
        .select('*, gyms(name)')
        .eq('id', user.id)
        .single();
        
      setProfile(data);
      
      if (data && !data.is_manager) {
        navigate('/', { replace: true });
        return;
      }
      
      if (data && data.is_manager && !data.home_gym_id) {
        navigate('/store/register', { replace: true });
        return;
      }

      if (data && data.is_manager && data.home_gym_id) {
        const { data: managerData } = await supabase
          .from('store_managers')
          .select('status')
          .eq('manager_id', user.id)
          .eq('gym_id', data.home_gym_id)
          .maybeSingle();

        const status = managerData?.status;
        
        setIsLoading(false);

        if (!status) {
          navigate('/store/request-approval', { replace: true });
        } else if (status === 'pending' || status === 'rejected') {
          navigate('/store/approval-status', { replace: true });
        }
      }
    };
    
    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#f7f8fa]">
        <span className="w-8 h-8 border-2 border-[#191f28]/20 border-t-[#191f28] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.home_gym_id) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-[#f7f8fa]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] bg-white flex-col shadow-[1px_0_0_0_#e5e8eb] z-50">
        <div className="px-7 pt-8 pb-5">
          <h1 className="text-[22px] tracking-[-0.04em]" style={{ fontWeight: 800 }}>
            <span className="text-[#3182f6]">Lo</span>
            <span className="text-[#191f28]">Gym</span>
          </h1>
          <div className="mt-3 px-3 py-2 bg-[#f3f0ff] rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#3182f6] flex items-center justify-center">
                <Store className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-[#3182f6]" style={{ fontWeight: 600 }}>점포 관리자</p>
                <p className="text-[11px] text-[#8b95a1] truncate">{profile.gyms?.name || '등록된 점포'}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-0.5 transition-all duration-200 ${
                  isActive ? 'bg-[#3182f6] text-white' : 'text-[#4e5968] hover:bg-[#f2f4f6]'
                }`}
              >
                <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[15px]" style={{ fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#8b95a1] hover:bg-[#f2f4f6] transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
            <span className="text-[14px]" style={{ fontWeight: 500 }}>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="pb-[72px] lg:pb-0 lg:ml-[240px] flex-1 w-full relative">
        <Outlet context={{ profile }} />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-50 shadow-[0_-1px_0_0_#e5e8eb]">
        <div className="flex justify-around items-center h-[60px] max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1 flex-1 transition-colors ${
                  isActive ? 'text-[#3182f6]' : 'text-[#8b95a1]'
                }`}
              >
                <Icon className="w-[24px] h-[24px] mb-1" strokeWidth={isActive ? 2.2 : 1.6} />
                <span className="text-[10px]" style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </nav>
    </div>
  );
}
