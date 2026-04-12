import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleOAuthLogin = async (provider) => {
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
      alert('소셜 로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      // Navigate to home logic is handled by ProtectedRoute auto-detection,
      // but just in case, we redirect here manually if no error.
      // Or go to /role-select so it checks profile validity.
      navigate('/role-select', { replace: true })
      
    } catch (error) {
      console.error(error.message)
      // Supabase에서 보내는 정확한 원인을 보여주도록 변경
      const isNotConfirmed = error.message.includes('Email not confirmed');
      setErrorMsg(isNotConfirmed ? '이메일 본인인증이 완료되지 않았습니다.' : '로그인 정보가 올바르지 않습니다.');
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f7f8fa] p-4 font-sans">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#e5e8eb]">
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#191f28]">LoGym</h1>
          <p className="mt-2 text-[14px] text-[#8b95a1]">이메일 또는 소셜로 로그인하세요</p>
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4 mb-6">
          <div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일 주소"
              className="w-full rounded-[16px] border border-[#e5e8eb] bg-[#f9fafb] px-4 py-3.5 text-[15px] font-medium text-[#191f28] outline-none transition-colors focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#3182f6]/20"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full rounded-[16px] border border-[#e5e8eb] bg-[#f9fafb] px-4 py-3.5 text-[15px] font-medium text-[#191f28] outline-none transition-colors focus:border-[#3182f6] focus:bg-white focus:ring-2 focus:ring-[#3182f6]/20"
            />
          </div>
          
          {errorMsg && (
            <p className="text-[13px] font-bold text-red-500 text-center">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-[16px] bg-[#3182f6] py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '이메일로 로그인'}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#f2f4f6]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 px-3 text-[12px] font-semibold text-[#b0b8c1]">또는 간편 로그인</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleOAuthLogin('kakao')}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#FEE500] py-3.5 font-bold text-[#191f28] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            카카오로 계속하기
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#d1d6db] bg-white py-3.5 font-bold text-[#4e5968] transition-transform hover:bg-[#f9fafb] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            Google로 계속하기
          </button>
        </div>

        <div className="mt-8 text-center text-[13px] font-medium text-[#8b95a1]">
          아직 회원이 아니신가요?{' '}
          <Link to="/register" className="font-bold text-[#3182f6] hover:underline">
            회원가입하기
          </Link>
        </div>
      </div>
    </div>
  )
}
