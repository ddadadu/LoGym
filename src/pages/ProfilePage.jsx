import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { LogOut, Trash2 } from 'lucide-react'

export default function ProfilePage() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleWithdrawal = async () => {
    const confirmDelete = window.confirm("정말 탈퇴하시겠습니까? 기록된 모든 정보가 삭제되며 복구할 수 없습니다.");
    if (!confirmDelete) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete user profile (effectively resetting the account in this app)
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;

      await supabase.auth.signOut();
      alert("회원 탈퇴 처리가 완료되었습니다.");
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert("탈퇴 처리 중 문제가 발생했습니다.");
    }
  }

  return (
    <div className="min-h-full bg-[#f7f8fa] flex flex-col font-sans">
      <header className="flex h-14 items-center px-5 bg-white shadow-sm shrink-0 sticky top-0">
        <h1 className="text-lg font-bold text-[#191f28]">마이페이지</h1>
      </header>

      <div className="p-5 flex-1 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-[16px] font-bold text-[#191f28] mb-4">계정 설정</h3>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-between py-3 border-b border-[#f2f4f6] text-[#4e5968] hover:bg-[#f9fafb] transition-colors"
          >
            <span className="text-[14px] font-medium">로그아웃</span>
            <LogOut className="w-4 h-4 text-[#8b95a1]" />
          </button>
          
          <button 
            onClick={handleWithdrawal}
            className="w-full flex items-center justify-between py-3 pt-4 text-[#f04452] hover:bg-[#fef2f2] transition-colors rounded-b-xl"
          >
            <span className="text-[14px] font-bold">서비스 회원 탈퇴</span>
            <Trash2 className="w-4 h-4 text-[#f04452]" />
          </button>
        </div>
      </div>
    </div>
  )
}
