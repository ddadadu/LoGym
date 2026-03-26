import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">마이페이지</h2>
      <p className="text-gray-500">내 정보 및 설정</p>
      
      <button 
        onClick={handleLogout}
        className="rounded-lg bg-red-500 px-4 py-2 font-bold text-white transition-colors hover:bg-red-600 active:bg-red-700"
      >
        로그아웃
      </button>
    </div>
  )
}
