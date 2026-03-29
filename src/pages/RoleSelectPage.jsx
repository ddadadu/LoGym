import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Building2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function RoleSelectPage() {
  const navigate = useNavigate()
  
  const [currentUser, setCurrentUser] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('') // 실제 이름(중복 가능)
  
  const [usernameError, setUsernameError] = useState('')
  const [usernameValid, setUsernameValid] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. 기존 유저 존재 여부 검사 (Auto-Redirect 로직)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login', { replace: true })
        return
      }
      setCurrentUser(user)
      
      // 이미 users 테이블에 등록되어 있는지 확인
      const { data: profile, error } = await supabase
        .from('users')
        .select('username, is_manager')
        .eq('id', user.id)
        .maybeSingle()
        
      if (profile && profile.username) {
        // 기존 회원이면 역할에 따라 홈/점포관리자로 곧장 패스 (온보딩 스킵)
        if (profile.is_manager) navigate('/store', { replace: true })
        else navigate('/', { replace: true })
      } else {
        // 미가입자면 온보딩 입력 폼 표시
        setInitialLoading(false)
      }
    }
    checkUser()
  }, [navigate])

  // 2. 인스타그램식 고유 ID(username) 중복 검사 (Debounce 로직)
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!username) {
        setUsernameError('')
        setUsernameValid(false)
        return
      }
      
      // 영문 소문자, 숫자, 밑줄, 마침표만 허용하는 제약 (인스타그램 감성 정규식)
      const sanitized = username.toLowerCase().replace(/[^a-z0-9_.]/g, '')
      if (sanitized !== username) setUsername(sanitized)
      
      if (sanitized.length < 3) {
        setUsernameError('아이디는 영문/숫자 3자 이상이어야 합니다.')
        setUsernameValid(false)
        return
      }

      setIsChecking(true)
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', sanitized)
        .maybeSingle()
        
      setIsChecking(false)
      
      if (data) {
        setUsernameError('이미 누군가가 사용 중인 아이디입니다.')
        setUsernameValid(false)
      } else {
        setUsernameError('')
        setUsernameValid(true)
      }
    }

    const timer = setTimeout(checkDuplicate, 500) // 사용자가 입력을 멈추고 0.5초 뒤에 검사
    return () => clearTimeout(timer)
  }, [username])

  // 3. 회원가입 완료 및 역할 부여 DB 업데이트
  const selectRole = async (role) => {
    if (!usernameValid) {
      alert('사용하실 고유 아이디를 올바르게 입력해 주세요.')
      return
    }
    if (!fullName.trim()) {
      alert('이름 또는 닉네임을 입력해 주세요.')
      return
    }
    
    setIsSubmitting(true)
    const isManager = role === 'manager'
    
    const { error } = await supabase
      .from('users')
      .insert({
        id: currentUser.id,
        username: username,
        full_name: fullName.trim(), // 새로 추가해야 할 non-unique 속성
        is_manager: isManager
      })
      
    setIsSubmitting(false)
    
    if (error) {
      console.error(error)
      alert('회원가입 처리 중 오류가 발생했습니다. (Supabase 에 full_name 컬럼이 있는지 확인해 주세요!)')
      return
    }
    
    // 최종 가입 성공 후 라우팅
    if (isManager) navigate('/store/register', { replace: true })
    else navigate('/', { replace: true })
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f8fa]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3182f6]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center space-y-8 bg-[#f7f8fa] p-6 font-sans">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-extrabold text-[#191f28]">프로필 설정</h1>
        <p className="text-[#8b95a1]">LoGym에서 사용할 프로필을 만들어 주세요</p>
      </div>

      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-sm border border-[#e5e8eb]">
        {/* 고유 ID (username) 입력란 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#8b95a1] ml-1">
            사용자 고유 아이디
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#b0b8c1]">@</span>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="logym_user"
              className={`w-full rounded-2xl border bg-[#f9fafb] py-3.5 pl-9 pr-4 text-[15px] font-bold text-[#191f28] outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-[#3182f6]/20 ${
                usernameError ? 'border-red-400 focus:border-red-500' : 
                usernameValid ? 'border-green-500 focus:border-green-500' : 'border-[#e5e8eb] focus:border-[#3182f6]'
              }`}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {isChecking && <Loader2 className="h-4 w-4 animate-spin text-[#b0b8c1]" />}
              {!isChecking && usernameValid && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {!isChecking && usernameError && <AlertCircle className="h-5 w-5 text-red-500" />}
            </div>
          </div>
          <div className="flex justify-between items-center px-1">
            <p className="text-[11px] font-bold text-[#b0b8c1]">영문/숫자 허용, 중복 불가</p>
            {usernameError && <p className="text-[11px] font-bold text-red-500">{usernameError}</p>}
            {usernameValid && <p className="text-[11px] font-bold text-green-500">사용 가능한 아이디입니다</p>}
          </div>
        </div>

        {/* 이름/닉네임 (full_name) 입력란 */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#8b95a1] ml-1">
            이름 또는 닉네임 (상태 메세지용)
          </label>
          <input 
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="김로짐"
            className="w-full rounded-2xl border border-[#e5e8eb] bg-[#f9fafb] py-3.5 px-4 text-[15px] font-bold text-[#191f28] outline-none transition-colors focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#3182f6]/20"
          />
          <p className="text-[11px] font-bold text-[#b0b8c1] ml-1">중복 가능. 프로필에 표시되는 예쁜 이름입니다.</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <p className="text-center text-sm font-bold text-[#8b95a1]">어떤 계정으로 접속하시겠습니까?</p>
        
        {/* 일반 클릭 */}
        <button
          onClick={() => selectRole('user')}
          disabled={!usernameValid || !fullName.trim() || isSubmitting}
          className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-all active:scale-[0.98] border border-[#e5e8eb] disabled:opacity-50 disabled:active:scale-100"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3182f6]/10 text-[#3182f6] shadow-sm">
            <User className="h-6 w-6" />
          </div>
          <div className="text-left flex-1">
            <div className="font-bold text-[#191f28] text-lg">일반 회원</div>
            <div className="text-xs font-medium text-[#8b95a1] mt-0.5">운동 상황 기록 및 소셜 커뮤니티 이용</div>
          </div>
        </button>

        {/* 점포 관리자 클릭 */}
        <button
          onClick={() => selectRole('manager')}
          disabled={!usernameValid || !fullName.trim() || isSubmitting}
          className="flex w-full items-center gap-4 rounded-2xl bg-[#191f28] p-5 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white shadow-sm">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="text-left flex-1">
            <div className="font-bold text-white text-lg">점포 관리자</div>
            <div className="text-xs font-medium text-gray-400 mt-0.5">내 헬스장의 인프라 정보 인증 및 관리</div>
          </div>
        </button>
      </div>
    </div>
  )
}
