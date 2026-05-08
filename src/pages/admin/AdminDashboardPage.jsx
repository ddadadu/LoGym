import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ShieldCheck, LogOut, CheckCircle2, XCircle, FileText, ChevronRight, AlertTriangle } from 'lucide-react';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/admin/login', { replace: true });
        return;
      }
      const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
      if (!profile?.is_admin) {
        navigate('/admin/login', { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from('store_managers')
        .select(`
          id, manager_id, gym_id, status, business_registration_url, requested_at,
          users ( username, full_name, email ),
          gyms ( name, address )
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      if (error) console.error(error);
      else setRequests(data || []);
      setIsLoading(false);
    };

    fetchRequests();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  const handleApprove = async () => {
    if (!selectedReq || isProcessing) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('store_managers')
        .update({ 
            status: 'approved',
            reviewed_at: new Date().toISOString()
        })
        .eq('manager_id', selectedReq.manager_id)
        .eq('gym_id', selectedReq.gym_id);

      if (error) throw error;

      alert('승인 처리되었습니다.');
      setRequests(prev => prev.filter(req => req.manager_id !== selectedReq.manager_id || req.gym_id !== selectedReq.gym_id));
      setSelectedReq(null);
    } catch (err) {
      console.error(err);
      alert('승인 처리 중 오류 발생');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReq || isProcessing) return;
    if (!rejectReason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('store_managers')
        .update({ 
            status: 'rejected', 
            rejection_reason: rejectReason.trim(),
            reviewed_at: new Date().toISOString()
        })
        .eq('manager_id', selectedReq.manager_id)
        .eq('gym_id', selectedReq.gym_id);

      if (error) throw error;

      alert('반려 처리되었습니다.');
      setRequests(prev => prev.filter(req => req.manager_id !== selectedReq.manager_id || req.gym_id !== selectedReq.gym_id));
      setSelectedReq(null);
      setRejectReason('');
    } catch (err) {
      console.error(err);
      alert('반려 처리 중 오류 발생');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#191f28]">
        <span className="w-8 h-8 border-2 border-[#3182f6]/30 border-t-[#3182f6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-[#f7f8fa]">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-[280px] bg-[#191f28] flex-col text-white">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 bg-[#3182f6] rounded-xl flex items-center justify-center shadow-lg shadow-[#3182f6]/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">LoGym Admin</h1>
            <p className="text-[11px] text-[#8b95a1]">최고 관리자 콘솔</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#3182f6]/10 text-[#3182f6] rounded-xl font-bold transition-colors">
            <FileText className="w-5 h-5" />
            점포 승인 요청 <span className="ml-auto bg-[#3182f6] text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>
          </button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-[#8b95a1] hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors">
            <LogOut className="w-5 h-5" /> 로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden max-h-[100dvh]">
        {/* Mobile Header */}
        <header className="md:hidden flex h-14 items-center justify-between bg-[#191f28] text-white px-4 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#3182f6]" />
            <h1 className="text-[15px] font-bold">LoGym Admin</h1>
          </div>
          <button onClick={handleLogout} className="text-[#8b95a1] p-1">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6">
          
          {/* List Column */}
          <div className="w-full lg:w-1/3 flex flex-col min-h-0 bg-white rounded-3xl border border-[#e5e8eb] shadow-sm overflow-hidden">
             <div className="p-5 border-b border-[#f2f4f6] shrink-0">
               <h2 className="text-lg font-extrabold text-[#191f28]">대기 중인 요청 ({requests.length})</h2>
             </div>
             <div className="flex-1 overflow-y-auto p-2">
                {requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-[#8b95a1]">
                    <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm font-bold">처리할 요청이 없습니다</p>
                  </div>
                ) : (
                  requests.map((req) => (
                    <button 
                      key={`${req.manager_id}-${req.gym_id}`}
                      onClick={() => setSelectedReq(req)}
                      className={`w-full text-left p-4 rounded-2xl mb-2 transition-all flex items-center justify-between ${selectedReq?.manager_id === req.manager_id ? 'bg-[#e8f3ff] border-[#3182f6] border' : 'bg-white hover:bg-[#f9fafb] border border-transparent'}`}
                    >
                      <div>
                        <p className="text-[15px] font-bold text-[#191f28] mb-0.5">{req.gyms?.name}</p>
                        <p className="text-[13px] text-[#4e5968]">{req.users?.full_name} ({req.users?.username})</p>
                        <p className="text-[11px] text-[#8b95a1] mt-1.5">{new Date(req.requested_at).toLocaleString()}</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${selectedReq?.manager_id === req.manager_id ? 'text-[#3182f6]' : 'text-[#d1d6db]'}`} />
                    </button>
                  ))
                )}
             </div>
          </div>

          {/* Detail Column */}
          <div className="w-full lg:w-2/3 flex flex-col min-h-0 bg-white rounded-3xl border border-[#e5e8eb] shadow-sm overflow-hidden relative">
            {selectedReq ? (
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="p-6 md:p-8 border-b border-[#f2f4f6]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-[#191f28] mb-1">{selectedReq.gyms?.name}</h2>
                      <p className="text-[14px] text-[#8b95a1]">{selectedReq.gyms?.address}</p>
                    </div>
                    <div className="bg-[#f9fafb] px-4 py-2 rounded-xl border border-[#f2f4f6] text-right">
                       <p className="text-[11px] font-bold text-[#8b95a1] mb-0.5">신청자 정보</p>
                       <p className="text-[14px] font-bold text-[#191f28]">{selectedReq.users?.full_name}</p>
                       <p className="text-[12px] text-[#4e5968]">@{selectedReq.users?.username}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 flex-1 flex flex-col gap-6">
                   <div className="flex flex-col flex-1 min-h-[300px]">
                      <h3 className="text-[15px] font-bold text-[#191f28] mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#8b95a1]" /> 사업자등록증 사본
                      </h3>
                      <div className="flex-1 bg-[#f2f4f6] rounded-2xl border border-[#e5e8eb] overflow-hidden flex items-center justify-center p-2 relative group">
                         <img src={selectedReq.business_registration_url} alt="사업자등록증" className="w-full h-full object-contain" />
                         <a href={selectedReq.business_registration_url} target="_blank" rel="noreferrer" className="absolute bottom-4 right-4 bg-[#191f28]/80 text-white px-4 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                           새 창에서 크게 보기
                         </a>
                      </div>
                   </div>

                   <div className="bg-[#fff4f4] border border-[#ffcdd2] rounded-2xl p-5">
                      <h3 className="text-[14px] font-bold text-[#f04452] mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> 반려 시 사유 입력
                      </h3>
                      <input 
                        type="text" 
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="예: 사업자등록증 화질이 흐려 식별이 불가합니다."
                        className="w-full bg-white border border-[#ffcdd2]/50 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#f04452] focus:ring-1 focus:ring-[#f04452] transition-colors"
                      />
                   </div>
                </div>

                <div className="p-6 md:p-8 border-t border-[#f2f4f6] flex gap-3 bg-[#f9fafb] sticky bottom-0">
                   <button 
                     onClick={handleReject}
                     disabled={isProcessing || !rejectReason.trim()}
                     className="flex-1 py-4 rounded-2xl bg-white border border-[#ffcdd2] text-[#f04452] font-bold text-[15px] disabled:opacity-50 hover:bg-[#fff4f4] transition-colors"
                   >
                     반려하기
                   </button>
                   <button 
                     onClick={handleApprove}
                     disabled={isProcessing}
                     className="flex-[2] py-4 rounded-2xl bg-[#3182f6] text-white font-bold text-[15px] shadow-lg shadow-[#3182f6]/20 disabled:opacity-50 hover:bg-[#1b64da] transition-colors"
                   >
                     승인 완료
                   </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#8b95a1] p-8 text-center">
                 <ShieldCheck className="w-16 h-16 mb-4 opacity-10" />
                 <p className="text-lg font-bold text-[#4e5968] mb-1">요청을 선택해주세요</p>
                 <p className="text-sm">좌측 리스트에서 심사할 점포 관리자의 요청을 클릭하면 상세 내용을 볼 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
