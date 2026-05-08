import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Clock, CheckCircle2, XCircle, RefreshCcw, Building2, LogOut } from 'lucide-react';

export default function StoreApprovalStatusPage() {
  const navigate = useNavigate();
  const [statusData, setStatusData] = useState(null);
  const [gymData, setGymData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('home_gym_id, gyms(name, address)')
        .eq('id', user.id)
        .single();

      if (!profile?.home_gym_id) {
        navigate('/store/register', { replace: true });
        return;
      }
      
      setGymData(profile.gyms);
      
      const { data: managerData } = await supabase
        .from('store_managers')
        .select('*')
        .eq('manager_id', user.id)
        .eq('gym_id', profile.home_gym_id)
        .maybeSingle();
        
      if (!managerData) {
          navigate('/store/request-approval', { replace: true });
          return;
      }

      if (managerData.status === 'approved') {
          navigate('/store', { replace: true });
          return;
      }

      setStatusData(managerData);
      setIsLoading(false);
    };
    
    fetchStatus();
  }, [navigate]);

  const handleRetry = () => {
      // 반려된 경우 다시 서류 제출 페이지로 이동
      navigate('/store/request-approval');
  };

  const handleCancel = async () => {
      const confirmCancel = window.confirm('정말 승인 요청을 취소하시겠습니까? (선택한 점포 정보도 초기화됩니다)');
      if (!confirmCancel) return;

      const { data: { user } } = await supabase.auth.getUser();
      
      // store_managers 에서 해당 요청 삭제
      await supabase
        .from('store_managers')
        .delete()
        .eq('manager_id', user.id)
        .eq('gym_id', statusData.gym_id);
        
      // users 에서 home_gym_id 초기화
      await supabase
        .from('users')
        .update({ home_gym_id: null })
        .eq('id', user.id);

      alert('요청이 취소되었습니다.');
      navigate('/store/register', { replace: true });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#f7f8fa]">
        <span className="w-8 h-8 border-2 border-[#3182f6]/20 border-t-[#3182f6] rounded-full animate-spin" />
      </div>
    );
  }

  const isPending = statusData?.status === 'pending';
  const isRejected = statusData?.status === 'rejected';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f8fa]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-white shadow-sm border-b border-[#e5e8eb] px-4">
        <div className="w-8"></div>
        <h1 className="text-[17px] font-bold text-[#191f28]">점포 관리자 승인 상태</h1>
        <button onClick={handleLogout} className="text-[#8b95a1] hover:text-[#191f28] p-1">
           <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 p-5 max-w-lg mx-auto w-full flex flex-col items-center justify-center -mt-10">
        
        {isPending && (
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#e5e8eb] w-full text-center mb-6">
             <div className="w-20 h-20 rounded-full bg-[#e8f3ff] flex items-center justify-center mx-auto mb-5 relative">
                <Clock className="w-10 h-10 text-[#3182f6]" />
                <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                   <span className="relative flex h-3 w-3">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3182f6] opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3182f6]"></span>
                   </span>
                </div>
             </div>
             <h2 className="text-[22px] font-extrabold text-[#191f28] mb-2">승인 심사 대기 중</h2>
             <p className="text-[14px] text-[#4e5968] leading-relaxed mb-6">
                최고 관리자가 제출하신 서류를 확인하고 있습니다.<br/>확인이 완료되면 알림을 드립니다. (통상 1~2일 소요)
             </p>
             
             <div className="bg-[#f9fafb] p-4 rounded-2xl border border-[#f2f4f6] text-left">
                <div className="flex items-center gap-2 mb-2">
                   <Building2 className="w-4 h-4 text-[#8b95a1]" />
                   <span className="text-[12px] font-bold text-[#8b95a1]">신청 점포</span>
                </div>
                <p className="text-[15px] font-extrabold text-[#191f28]">{gymData?.name}</p>
                <p className="text-[12px] text-[#8b95a1] mt-0.5">{gymData?.address}</p>
             </div>
          </div>
        )}

        {isRejected && (
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#ffcdd2] w-full text-center mb-6">
             <div className="w-20 h-20 rounded-full bg-[#fff4f4] flex items-center justify-center mx-auto mb-5">
                <XCircle className="w-10 h-10 text-[#f04452]" />
             </div>
             <h2 className="text-[22px] font-extrabold text-[#191f28] mb-2">승인 반려됨</h2>
             <p className="text-[14px] text-[#4e5968] leading-relaxed mb-6">
                제출하신 서류 확인 결과 반려 처리되었습니다.<br/>아래 사유를 확인하고 다시 제출해 주세요.
             </p>
             
             <div className="bg-[#fff4f4] p-4 rounded-2xl text-left border border-[#ffcdd2]/50 mb-6">
                <p className="text-[12px] font-bold text-[#f04452] mb-1">반려 사유</p>
                <p className="text-[14px] font-bold text-[#191f28]">{statusData?.rejection_reason || '사유 미기재'}</p>
             </div>
             
             <button 
                onClick={handleRetry}
                className="w-full h-14 rounded-2xl bg-[#191f28] text-white font-bold text-[16px] shadow-sm flex items-center justify-center gap-2"
             >
                <RefreshCcw className="w-5 h-5" />
                서류 다시 제출하기
             </button>
          </div>
        )}

        <button 
           onClick={handleCancel}
           className="text-[13px] font-bold text-[#8b95a1] underline underline-offset-4 hover:text-[#191f28]"
        >
           요청 취소 및 점포 재선택
        </button>

      </main>
    </div>
  );
}
