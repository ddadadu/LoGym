import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ClipboardList, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function StoreInfoRequestPage() {
  const { profile } = useOutletContext();
  const gymId = profile?.home_gym_id;
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (gymId) fetchRequests();
  }, [gymId]);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('infrastructure_requests')
      .select('*, users!infrastructure_requests_requested_by_fkey(full_name, username)')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });
    
    if (error) console.error("Fetch requests error:", error);
    if (data) setRequests(data);
    setIsLoading(false);
  };

  const handleAction = async (reqId, action, payload) => {
    if (!confirm(action === 'approved' ? '승인하시겠습니까? 데이터베이스에 즉시 반영됩니다.' : '해당 요청을 반려하시겠습니까?')) return;

    // 만약 승인이고 페이로드가 있다면 실제 기구 데이터 업데이트
    if (action === 'approved' && payload) {
      const { equipment_id, name, category, quantity, condition, brand_id, custom_brand_name } = payload;
      let eqId = equipment_id;

      // 마스터 기구 ID가 없다면(신규 기구명) 직접 생성 후 연동
      if (!eqId && name) {
        const { data: ext } = await supabase.from('equipments').select('id').eq('name', name).single();
        if (ext) {
          eqId = ext.id;
        } else {
          const { data: newEq } = await supabase.from('equipments').insert({ name, category: category || '기타' }).select().single();
          if (newEq) eqId = newEq.id;
        }
      }

      if (eqId) {
        await supabase.from('gym_equipments').upsert({
          gym_id: gymId,
          equipment_id: eqId,
          quantity: quantity ? parseInt(quantity) : 1,
          condition: condition || 'good',
          brand_id: brand_id || null,
          custom_brand_name: custom_brand_name || null
        }, { onConflict: 'gym_id, equipment_id' });
      }
    }

    // 상태 업데이트
    const { error } = await supabase
      .from('infrastructure_requests')
      .update({ status: action, resolved_by: profile.id })
      .eq('id', reqId);

    if (!error) {
      alert('정상적으로 처리되었습니다.');
      fetchRequests();
    } else {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center pt-20">
        <span className="animate-spin w-8 h-8 border-2 border-[#3182f6]/30 border-t-[#3182f6] rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-10 px-5 lg:px-10 pt-8 lg:pt-10 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[#191f28] text-[22px] tracking-[-0.03em]" style={{ fontWeight: 800 }}>회원 제보 관리</h1>
          <p className="text-[#8b95a1] text-[13px] mt-1">우리 헬스장 회원들이 올린 기구 오작동 및 누락 제보를 검토합니다.</p>
        </div>
      </div>

      <div className="space-y-4">
        {requests.map((req) => {
          const isPending = req.status === 'pending';
          const isApproved = req.status === 'approved';
          const p = req.request_payload || {};
          
          return (
            <div key={req.id} className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb]/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    req.request_type === '기구' ? 'bg-[#ebf4ff] text-[#3182f6]' : 'bg-[#f3f0ff] text-[#8b5cf6]'
                  }`}>
                    {req.request_type || '기구'} 제보
                  </span>
                  <span className="text-[12px] text-[#8b95a1]">{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
                <div className={`flex items-center gap-1 text-[12px] font-bold ${
                  isPending ? 'text-[#f59e0b]' : isApproved ? 'text-[#00c471]' : 'text-[#f04452]'
                }`}>
                  {isPending ? <Clock className="w-3.5 h-3.5"/> : isApproved ? <CheckCircle2 className="w-3.5 h-3.5"/> : <XCircle className="w-3.5 h-3.5"/>}
                  {isPending ? '검토 대기중' : isApproved ? '승인 및 반영됨' : '반려됨'}
                </div>
              </div>

              <div className="bg-[#f7f8fa] p-4 rounded-xl mb-4">
                <p className="text-[13px] text-[#8b95a1] mb-2 font-medium">
                  제보자 <span className="text-[#191f28] ml-1">{req.users?.full_name || req.users?.username || '알 수 없음'}</span>
                </p>
                <div className="text-[14px] text-[#4e5968] space-y-1.5 bg-white p-3 rounded-lg shadow-sm border border-[#e5e8eb]/50">
                  {p.name && <p className="flex justify-between"><span className="text-[#8b95a1]">대상 기구</span><span className="font-bold text-[#191f28]">{p.name}</span></p>}
                  {p.quantity && <p className="flex justify-between"><span className="text-[#8b95a1]">요청 보유량</span><span className="font-semibold text-[#3182f6]">{p.quantity}대</span></p>}
                  {p.condition && (
                    <p className="flex justify-between">
                      <span className="text-[#8b95a1]">기구 상태</span>
                      <span className={`font-semibold ${p.condition === 'excellent' ? 'text-[#00c471]' : p.condition === 'maintenance' ? 'text-[#f04452]' : 'text-[#f59e0b]'}`}>
                        {p.condition === 'excellent' ? '양호' : p.condition === 'maintenance' ? '점검필요/고장' : '보통'}
                      </span>
                    </p>
                  )}
                  {p.message && (
                    <div className="pt-2 mt-2 border-t border-[#f2f4f6]">
                      <span className="text-[11px] text-[#8b95a1] block mb-1">상세 제보 코멘트</span>
                      <p className="text-[13px] text-[#4e5968] bg-[#f9fafb] p-2 rounded-md">"{p.message}"</p>
                    </div>
                  )}
                </div>
              </div>

              {isPending && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAction(req.id, 'rejected')}
                    className="flex-1 h-11 rounded-xl bg-[#fef2f2] text-[#f04452] font-semibold text-[14px] transition-colors hover:bg-[#fee2e2]"
                  >
                    반려하기
                  </button>
                  <button 
                    onClick={() => handleAction(req.id, 'approved', p)}
                    className="flex-1 h-11 rounded-xl bg-[#191f28] text-white font-semibold text-[14px] transition-colors hover:bg-black active:scale-[0.98] shadow-md"
                  >
                    승인 및 데이터 반영
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {requests.length === 0 && !isLoading && (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-[#e5e8eb]">
            <div className="w-14 h-14 bg-[#f2f4f6] rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-7 h-7 text-[#c2c9d2]" />
            </div>
            <p className="text-[15px] font-bold text-[#4e5968] mb-1">접수된 유저 제보가 없습니다</p>
            <p className="text-[13px] text-[#8b95a1]">새로운 제보가 들어오면 이곳에 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
