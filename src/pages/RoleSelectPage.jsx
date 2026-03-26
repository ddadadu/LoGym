import { useNavigate } from 'react-router-dom'
import { User, Building2 } from 'lucide-react'

export default function RoleSelectPage() {
  const navigate = useNavigate()

  const selectRole = (role) => {
    if (role === 'user') {
      navigate('/')
    } else {
      // 헬스장 등록 전
      navigate('/store/register') 
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center space-y-8 bg-[#f7f8fa] p-6 font-sans">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-[#191f28] mb-2">시작하기</h1>
        <p className="text-[#8b95a1]">어떤 계정으로 접속하시겠습니까?</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <button
          onClick={() => selectRole('user')}
          className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm transition-transform active:scale-[0.98] border border-[#e5e8eb]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3182f6]/10 text-[#3182f6]">
            <User className="h-6 w-6" />
          </div>
          <div className="text-left">
            <div className="font-bold text-[#191f28] text-lg">일반 회원</div>
            <div className="text-sm text-[#8b95a1]">운동 상황 기록 및 커뮤니티 이용</div>
          </div>
        </button>

        <button
          onClick={() => selectRole('manager')}
          className="flex items-center gap-4 rounded-2xl bg-[#191f28] p-6 shadow-sm transition-transform active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="text-left">
            <div className="font-bold text-white text-lg">점포 관리자</div>
            <div className="text-sm text-gray-400">내 헬스장 운영 및 정보 관리</div>
          </div>
        </button>
      </div>
    </div>
  )
}
