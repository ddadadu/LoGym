import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Building2, AlertCircle, CheckCircle2, Loader2, Mail, KeyRound } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function RegisterPage() {
  const navigate = useNavigate()

  // 폼 상태
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  
  // UI 상태
  const [viewMode, setViewMode] = useState('select') // 'select' | 'email'
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Email/PW 발송, 2: OTP 확인, 3: 세부 프로필 및 권한지정
  
  // 아이디 유효성
  const [usernameError, setUsernameError] = useState('')
  const [usernameValid, setUsernameValid] = useState(false)
  const [isCheckingUser, setIsCheckingUser] = useState(false)

  // Oauth 핸들러
  const handleOAuthRegister = async (provider) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin + '/role-select'
        }
      })
      if (error) throw error
    } catch (error) {
      console.error(error.message)
      alert('소셜 인증 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  // 아이디 중복 체크 디바운스
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!username) {
        setUsernameError('')
        setUsernameValid(false)
        return
      }
      const sanitized = username.toLowerCase().replace(/[^a-z0-9_.]/g, '')
      if (sanitized !== username) setUsername(sanitized)
      
      if (sanitized.length < 3) {
        setUsernameError('아이디는 영/숫자 3자 이상')
        setUsernameValid(false)
        return
      }
      setIsCheckingUser(true)
      const { data } = await supabase.from('users').select('id').eq('username', sanitized).maybeSingle()
      setIsCheckingUser(false)
      
      if (data) {
        setUsernameError('이미 사용중인 아이디입니다')
        setUsernameValid(false)
      } else {
        setUsernameError('')
        setUsernameValid(true)
      }
    }
    const timer = setTimeout(checkDuplicate, 500)
    return () => clearTimeout(timer)
  }, [username])

  // ====================== [STEP 1] 인증번호 발송 ======================
  const sendVerificationEmail = async (e) => {
    e.preventDefault()
    if (!email || !password || password.length < 6) {
      alert('이메일과 6자리 이상의 비밀번호를 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      
      // 메일 전송 성공 시 2단계로 부드럽게 전환
      setStep(2)
      alert("입력하신 이메일로 6자리 인증번호가 발송되었습니다. 메일함을 확인해주세요!")
    } catch (error) {
      console.error('발송 에러:', error.message)
      alert('인증 메일 발송 중 문제가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ====================== [STEP 2] OTP 검증 ======================
  const verifyOtpCode = async (e) => {
    e.preventDefault()
    if (!otpToken || otpToken.length < 6) {
      alert('6자리 인증번호를 바르게 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpToken,
        type: 'signup'
      })
      if (error) throw error
      
      // OTP 성공 시 세션 생성됨, 마지막 3단계로 이동
      setStep(3)
    } catch (error) {
      console.error('검증 에러:', error.message)
      alert('인증번호 검증에 실패했습니다. 올바른 숫자를 입력했는지 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // ====================== [STEP 3] 최종 DB 동기화 및 권한 등록 ======================
  const handleFinalRegister = async (role) => {
    if (!usernameValid || !fullName.trim()) return

    setLoading(true)
    const isManager = role === 'manager'

    try {
      // 1. 이미 OTP 검증 통과했으므로 세션 유저를 가져옴
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증 세션이 만료되었습니다. 처음부터 다시 시도해주세요.')

      // 2. 단방향 패스워드 기록용 해시 로직 (Web Crypto API)
      const encoder = new TextEncoder()
      const pwdData = encoder.encode(password)
      const hashBuffer = await crypto.subtle.digest('SHA-256', pwdData)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // 3. public.users 테이블 명부 기록
      const { error: profileError } = await supabase.from('users').insert({
        id: user.id,
        username: username,
        full_name: fullName.trim(),
        is_manager: isManager,
        email: email,
        password_hash: passwordHash
      })
      
      if (profileError) throw profileError

      alert('가입이 완료되었습니다!\n만반의 준비가 끝났습니다. 환영합니다!')
      if (isManager) navigate('/store/register', { replace: true })
      else navigate('/', { replace: true })
      
    } catch (err) {
      console.error(err)
      alert(err.message || '프로필 설정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }


  // ============== 뷰 렌더링 파트 ==============

  // 1) 최초 선택 화면
  if (viewMode === 'select') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f7f8fa] p-4 font-sans">
        <div className="w-full max-w-sm rounded-[24px] bg-white p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#e5e8eb]">
          <div className="mb-8 text-center">
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#191f28]">회원가입</h1>
            <p className="mt-2 text-[14px] text-[#8b95a1]">어떤 방식으로 시작할까요?</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setViewMode('email')}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#3182f6] text-white py-4 font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mail className="w-5 h-5"/>
              이메일로 회원가입
            </button>
            <div className="my-3 flex items-center justify-center gap-4">
              <span className="h-[1px] w-full bg-[#f2f4f6]"></span>
              <span className="text-[12px] font-semibold text-[#b0b8c1] shrink-0">소셜 계정 연동</span>
              <span className="h-[1px] w-full bg-[#f2f4f6]"></span>
            </div>
            <button onClick={() => handleOAuthRegister('kakao')} className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#FEE500] py-3.5 font-bold text-[#191f28] transition-transform hover:scale-[1.02] active:scale-[0.98]">
              카카오로 회원가입
            </button>
            <button onClick={() => handleOAuthRegister('google')} className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#d1d6db] bg-white py-3.5 font-bold text-[#4e5968] transition-transform hover:bg-[#f9fafb] hover:scale-[1.02] active:scale-[0.98]">
              Google로 회원가입
            </button>
          </div>
          <div className="mt-8 text-center text-[13px] font-medium text-[#8b95a1]">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-bold text-[#3182f6] hover:underline">로그인하기</Link>
          </div>
        </div>
      </div>
    )
  }

  // 2) 이메일 진입 후 세부 폼
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f7f8fa] p-4 font-sans py-10">
      <div className="w-full max-w-sm">
        {step === 1 && (
          <button onClick={() => setViewMode('select')} className="text-[13px] font-bold text-[#8b95a1] mb-4 hover:text-[#191f28]">
            ← 가입 수단 다시 선택
          </button>
        )}

        <div className="rounded-[24px] bg-white p-6 md:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#e5e8eb] overflow-hidden relative">
          
          {/* ========== STEP 1: 이메일 인증 발송 ========== */}
          {step === 1 && (
            <form onSubmit={sendVerificationEmail} className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-[22px] font-extrabold text-[#191f28] mb-6">계정 정보 입력</h2>
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#8b95a1] ml-1">이메일 주소</label>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@email.com" className="w-full rounded-[16px] border border-[#e5e8eb] bg-[#f9fafb] px-4 py-3.5 text-[14px] font-medium text-[#191f28] outline-none transition-colors focus:border-[#3182f6] focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#8b95a1] ml-1">패스워드 (6자 이상)</label>
                <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호 설정" className="w-full rounded-[16px] border border-[#e5e8eb] bg-[#f9fafb] px-4 py-3.5 text-[14px] font-medium text-[#191f28] outline-none transition-colors focus:border-[#3182f6] focus:bg-white" />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-[16px] bg-[#3182f6] py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50">
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  인증번호 발송
                </button>
              </div>
            </form>
          )}

          {/* ========== STEP 2: 인본번호(OTP) 검증 ========== */}
          {step === 2 && (
            <form onSubmit={verifyOtpCode} className="space-y-4 animate-in slide-in-from-right-8 duration-300">
              <div className="w-12 h-12 rounded-full bg-[#e8f3ff] flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-[#3182f6]" strokeWidth={2.5} />
              </div>
              <h2 className="text-[20px] font-extrabold text-[#191f28] leading-tight">이메일로<br/>번호를 발송했어요</h2>
              <p className="text-[13px] text-[#4e5968] mb-6 whitespace-pre-wrap"><span className="font-bold">{email}</span> 주소로 전송된 6자리 인증 코드를 입력해주세요.</p>
              
              <div className="space-y-1.5">
                <input type="text" maxLength={6} required value={otpToken} onChange={e=>setOtpToken(e.target.value)} placeholder="000000" className="w-full rounded-[16px] border border-[#e5e8eb] bg-[#f9fafb] px-4 py-4 text-center text-[24px] tracking-[0.5em] font-extrabold text-[#3182f6] outline-none transition-colors focus:border-[#3182f6] focus:bg-white focus:ring-4 focus:ring-[#3182f6]/10" />
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button type="submit" disabled={loading || otpToken.length < 6} className="w-full flex items-center justify-center gap-2 rounded-[16px] bg-[#3182f6] py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  인증하고 다음으로
                </button>
                <button type="button" onClick={sendVerificationEmail} disabled={loading} className="py-2 text-[13px] font-bold text-[#8b95a1] hover:text-[#191f28]">
                  다시 발송하기
                </button>
              </div>
            </form>
          )}

          {/* ========== STEP 3: 프로필 완성 및 역할 부여 ========== */}
          {step === 3 && (
            <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center gap-2 mb-2 text-[#00c471] bg-[#e6fbf2] px-3 py-1.5 rounded-full w-max">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[12px] font-bold">인증 완료</span>
              </div>
              <h2 className="text-[22px] font-extrabold text-[#191f28] mb-6">프로필 설정</h2>

              <div className="space-y-4 mb-6">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#8b95a1] ml-1 flex justify-between">
                    <span>사용자 고유 아이디</span>
                    <span className={usernameValid ? 'text-green-500' : 'text-red-400'}>{usernameError || (usernameValid && '사용가능')}</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#b0b8c1]">@</span>
                    <input type="text" required value={username} onChange={e=>setUsername(e.target.value)} placeholder="logym_user" className="w-full rounded-[16px] border border-[#e5e8eb] bg-[#f9fafb] px-4 py-3.5 pl-9 text-[14px] font-bold text-[#191f28] outline-none transition-colors focus:border-[#3182f6] focus:bg-white" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isCheckingUser && <Loader2 className="h-4 w-4 animate-spin text-[#b0b8c1]" />}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#8b95a1] ml-1">이름 또는 닉네임</label>
                  <input type="text" required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="김로짐 (중복가능)" className="w-full rounded-[16px] border border-[#e5e8eb] bg-[#f9fafb] px-4 py-3.5 text-[14px] font-bold text-[#191f28] outline-none transition-colors focus:border-[#3182f6] focus:bg-white" />
                </div>
              </div>

              <div className="pt-2 border-t border-[#f2f4f6]">
                <p className="text-[13px] font-bold text-[#8b95a1] mt-4 mb-3">계정 역할을 선택하여 가입을 완료하세요</p>
                <button onClick={() => handleFinalRegister('user')} disabled={loading || !usernameValid || !fullName.trim()} className="flex w-full items-center gap-4 rounded-[20px] bg-white p-5 border border-[#e5e8eb] transition-all hover:border-[#3182f6] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 mb-3">
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#f2f4f6] text-[#3182f6]">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-extrabold text-[#191f28] text-[15px]">일반 회원 시작</div>
                  </div>
                </button>

                <button onClick={() => handleFinalRegister('manager')} disabled={loading || !usernameValid || !fullName.trim()} className="flex w-full items-center gap-4 rounded-[20px] bg-[#191f28] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-extrabold text-white text-[15px]">점포 관리자 시작</div>
                  </div>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
