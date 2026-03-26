import { supabase } from '../supabaseClient'

export default function Login() {
  const handleLogin = async (provider) => {
    try {
      const options = {
        // 소셜 로그인 후 역할 선택화면으로 리다이렉트
        redirectTo: window.location.origin + '/role-select'
      }

      // Supabase OAuth 로그인 호출
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: options
      })
      if (error) throw error
    } catch (error) {
      console.error('Error logging in:', error.message)
      alert('로그인 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">LoGym</h1>
          <p className="mt-3 text-sm text-gray-500">당신의 피트니스 여정을 시작하세요</p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleLogin('kakao')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 py-3.5 font-bold text-[#000000] transition-transform hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            카카오 계정으로 시작하기
          </button>

          <button
            onClick={() => handleLogin('google')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3.5 font-bold text-gray-700 transition-transform hover:bg-gray-50 hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            Google 계정으로 시작하기
          </button>
        </div>
      </div>
    </div>
  )
}
