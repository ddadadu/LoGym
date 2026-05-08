import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 이미 어드민 로그인 상태인지 확인
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (data?.is_admin) {
          navigate('/admin', { replace: true });
        }
      }
    };
    checkAdmin();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Trick: 'admin' 입력 시 'admin@logym.com'으로, '0423' 입력 시 '04230423'으로 치환하여 시도
    // 혹은 정확히 매칭될 때만 치환
    let loginEmail = adminId;
    let loginPassword = password;

    if (adminId.toLowerCase() === 'admin') loginEmail = 'admin@logym.com';
    if (password === '0423') loginPassword = '04230423';

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) throw signInError;

      // 추가로 admin 권한이 맞는지 확인
      if (data?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', data.user.id)
          .single();

        if (!profile?.is_admin) {
          await supabase.auth.signOut();
          throw new Error('관리자 권한이 없는 계정입니다.');
        }

        navigate('/admin', { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError('로그인 실패: 아이디 또는 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#191f28] px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#3182f6] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#3182f6]/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">LoGym Admin</h1>
          <p className="text-[#8b95a1] text-sm mt-1">시스템 관리자 전용 접속</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#b0b8c1] ml-1">Admin ID</label>
            <input 
              type="text" 
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="아이디를 입력하세요"
              className="w-full rounded-2xl bg-[#222933] border border-[#333d4b] text-white px-4 py-3.5 focus:border-[#3182f6] focus:ring-1 focus:ring-[#3182f6] outline-none transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#b0b8c1] ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full rounded-2xl bg-[#222933] border border-[#333d4b] text-white px-4 py-3.5 focus:border-[#3182f6] focus:ring-1 focus:ring-[#3182f6] outline-none transition-colors"
            />
          </div>

          {error && <p className="text-sm font-bold text-[#f04452] text-center pt-2">{error}</p>}

          <button 
            type="submit"
            disabled={isLoading || !adminId || !password}
            className="w-full h-14 rounded-2xl bg-[#3182f6] text-white font-bold text-[16px] mt-6 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors hover:bg-[#1b64da]"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
