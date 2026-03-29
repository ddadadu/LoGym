import { supabase } from '../../supabaseClient'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { LogOut, Trash2, Store } from 'lucide-react'

export default function StoreProfilePage() {
  const navigate = useNavigate()
  const { profile } = useOutletContext();
  const gym = profile?.gyms;

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleWithdrawal = async () => {
    const confirmDelete = window.confirm("정말 탈퇴하시겠습니까?\n관리자 권한을 잃게 되며 되돌릴 수 없습니다.\n(단, 점포 데이터 자체는 삭제되지 않고 안전하게 보존됩니다.)");
    if (!confirmDelete) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete user profile -> removes manager access. Gym remains in DB.
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;

      await supabase.auth.signOut();
      alert("관리자 회원 탈퇴 처리가 완료되었습니다.");
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert("탈퇴 처리 중 문제가 발생했습니다.");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#f7f8fa] flex flex-col font-sans pb-20 lg:pb-0">
      <header className="flex h-14 items-center px-5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] shrink-0 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-[#191f28]">점포 관리자 프로필</h1>
      </header>

      <div className="p-5 flex-1 space-y-4 max-w-2xl mx-auto w-full mt-2">
        
        {/* 점포 정보 요약 */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-2 border border-[#e5e8eb]/50">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 rounded-full bg-[#ebf4ff] flex items-center justify-center flex-shrink-0">
               <Store className="w-6 h-6 text-[#3182f6]" strokeWidth={2.2} />
             </div>
             <div>
               <p className="text-[12px] text-[#8b95a1] font-bold mb-0.5">운영 중인 점포</p>
               <h3 className="text-[18px] font-extrabold text-[#191f28] leading-tight">{gym?.name || '등록된 점포 없음'}</h3>
               <p className="text-[12px] text-[#4e5968] mt-1">{profile?.full_name || profile?.username || '관리자'} 님 환영합니다.</p>
             </div>
          </div>
        </div>

        {/* 계정 설정 */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb]/50">
          <h3 className="text-[15px] font-bold text-[#191f28] mb-4 pl-1">계정 관리</h3>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-between py-3.5 px-2 border-b border-[#f2f4f6] text-[#4e5968] hover:bg-[#f9fafb] transition-colors rounded-t-lg"
          >
            <span className="text-[14px] font-bold">로그아웃</span>
            <LogOut className="w-4 h-4 text-[#8b95a1]" />
          </button>
          
          <button 
            onClick={handleWithdrawal}
            className="w-full flex items-center justify-between py-3.5 px-2 mt-1 text-[#f04452] hover:bg-[#fef2f2] transition-colors rounded-b-lg"
          >
            <span className="text-[14px] font-bold">점포 관리자 탈퇴하기</span>
            <Trash2 className="w-4 h-4 text-[#f04452]" />
          </button>
          
          <div className="mt-4 bg-[#f9fafb] p-3.5 rounded-xl border border-[#e5e8eb]/50 flex gap-2">
             <div className="shrink-0 mt-0.5">
               <Store className="w-4 h-4 text-[#8b95a1]" />
             </div>
             <p className="text-[12px] text-[#8b95a1] leading-relaxed font-medium">
                탈퇴 시 해당 관리자 계정만 삭제되며, 공들여 등록해 둔 점포의 기구/트레이너/인프라 정보는 저희 시스템에 <b>아무 손상 없이 안전하게 보존</b>됩니다.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
