import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ChevronLeft, Dumbbell, MapPin, Clock, UserCheck, ClipboardList, CheckCircle2, XCircle, AlertCircle, Phone, CheckSquare, RefreshCw, ChevronDown, User } from 'lucide-react';
import BrandSelectorModal from '../components/BrandSelectorModal';

const CATEGORIES = ['전체', '유산소', '웨이트', '머신'];

const CONDITION_LABELS = {
  excellent: { label: '양호', color: '#00c471', bg: '#e8faf0' },
  good: { label: '보통', color: '#f59e0b', bg: '#fef3c7' },
  maintenance: { label: '수리 중', color: '#f04452', bg: '#fef2f2' },
};
const TRAINER_FALLBACK = "https://images.unsplash.com/photo-1750698545009-679820502908?auto=format&fit=crop&q=80&w=150&h=150";

export default function MyGymDetailPage() {
  const navigate = useNavigate();
  const [gymId, setGymId] = useState(null);
  const [gymData, setGymData] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('equipment'); // equipment, trainer, request
  const [selectedCategory, setSelectedCategory] = useState('전체');

  // 제보 모달
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [editReqId, setEditReqId] = useState(null); // 수정 중인 제보 ID
  const [reqForm, setReqForm] = useState({ name: '', quantity: '', condition: 'maintenance', message: '', brand_id: null, custom_brand_name: '', brand_display: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMyGym();
  }, []);

  const fetchMyGym = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login', { replace: true }); return; }
    setCurrentUser(user);

    const { data: uData } = await supabase.from('users').select('home_gym_id').eq('id', user.id).single();
    if (!uData || !uData.home_gym_id) {
      alert("등록된 헬스장이 없습니다.");
      navigate('/mygym', { replace: true });
      return;
    }

    const hId = uData.home_gym_id;
    setGymId(hId);

    // 1. Gym Data
    const { data: gData } = await supabase.from('gyms').select('*').eq('id', hId).single();
    setGymData(gData);

    // 2. Equipments
    const { data: eqData } = await supabase
      .from('gym_equipments')
      .select('*, equipments(name, category), equipment_brands(name_ko, logo_url)')
      .eq('gym_id', hId);
    if (eqData) {
      setEquipments(eqData.map(item => ({
        id: item.equipment_id,
        category: item.equipments?.category || '기타',
        name: item.equipments?.name || '알 수 없음',
        quantity: item.quantity || 1,
        condition: item.condition || 'good',
        brand: item.equipment_brands ? item.equipment_brands.name_ko : (item.custom_brand_name || ''),
        brandLogo: item.equipment_brands?.logo_url || null
      })));
    }

    // 3. Trainers
    const { data: trData } = await supabase.from('gym_trainers').select('*').eq('gym_id', hId);
    if (trData) setTrainers(trData);

    // 4. My Requests
    const { data: reqData } = await supabase.from('infrastructure_requests')
      .select('*')
      .eq('gym_id', hId)
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false });
    if (reqData) setMyRequests(reqData);

    setIsLoading(false);
  };

  const submitRequest = async () => {
    if (!reqForm.name) { alert("기구명을 입력해주세요."); return; }
    setIsSubmitting(true);

    const payload = {
      type: '기구제보',
      name: reqForm.name,
      quantity: reqForm.quantity,
      condition: reqForm.condition,
      message: reqForm.message,
      brand_id: reqForm.brand_id,
      custom_brand_name: reqForm.custom_brand_name
    };

    let error;

    if (editReqId) {
      // 제보 수정 (pending 상태일 때만 가능)
      const { error: updateError } = await supabase.from('infrastructure_requests').update({
        equipment_name: reqForm.name,
        equipment_brand_id: reqForm.brand_id || null,
        custom_brand_name: reqForm.custom_brand_name || null,
        request_payload: payload
      }).eq('id', editReqId);
      error = updateError;
    } else {
      // 신규 제보
      const { error: insertError } = await supabase.from('infrastructure_requests').insert({
        gym_id: gymId,
        requested_by: currentUser.id,
        equipment_name: reqForm.name,
        equipment_brand_id: reqForm.brand_id || null,
        custom_brand_name: reqForm.custom_brand_name || null,
        request_type: '기구',
        request_payload: payload,
        status: 'pending'
      });
      error = insertError;
    }

    setIsSubmitting(false);
    if (!error) {
      alert(editReqId ? "제보가 성공적으로 수정되었습니다." : "제보가 성공적으로 접수되었습니다. 관리자 검토 후 반영됩니다.");
      closeRequestModal();
      fetchMyGym(); // reload requests
      setTab('request');
    } else {
      console.error("Supabase Request Error:", error);
      alert(`제보 처리 중 오류가 발생했습니다: ${error.message || JSON.stringify(error)}`);
    }
  };

  const openRequestModal = () => {
    setEditReqId(null);
    setReqForm({ name: '', quantity: '', condition: 'maintenance', message: '', brand_id: null, custom_brand_name: '', brand_display: '' });
    setShowRequestModal(true);
  };

  const openEditModal = (req) => {
    const p = req.request_payload || {};
    setEditReqId(req.id);
    setReqForm({
      name: p.name || '',
      quantity: p.quantity || '',
      condition: p.condition || 'maintenance',
      message: p.message || '',
      brand_id: p.brand_id || null,
      custom_brand_name: p.custom_brand_name || '',
      brand_display: p.custom_brand_name ? p.custom_brand_name : (p.brand_id ? '브랜드 유지됨 (선택)' : '') // Note: We might not have the actual brand name here easily unless fetched, but we can set a placeholder or fetch it if needed.
    });
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setEditReqId(null);
    setReqForm({ name: '', quantity: '', condition: 'maintenance', message: '', brand_id: null, custom_brand_name: '', brand_display: '' });
  };

  const deleteRequest = async (reqId) => {
    if (!confirm("정말로 이 제보를 취소하시겠습니까?")) return;

    const { error } = await supabase.from('infrastructure_requests').delete().eq('id', reqId);
    if (!error) {
      alert("제보가 취소되었습니다.");
      fetchMyGym();
    } else {
      console.error("Supabase Delete Error:", error);
      alert("제보 취소 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><span className="animate-spin w-8 h-8 border-2 border-[#3182f6]/30 border-t-[#3182f6] rounded-full" /></div>;
  }

  return (
    <div className="min-h-[100dvh] pb-24 bg-[#f7f8fa] font-sans">
      <header className="flex h-14 items-center justify-between px-4 bg-white shadow-sm shrink-0 sticky top-0 z-40">
        <div className="flex items-center">
          <button onClick={() => navigate('/mygym?change=true')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-6 h-6 text-[#191f28]" />
          </button>
          <h1 className="text-[17px] font-bold text-[#191f28] ml-1">내 헬스장 정보</h1>
        </div>
        <button
          onClick={() => navigate('/mygym?change=true')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f2f4f6] text-[#4e5968] rounded-lg text-[13px] font-bold hover:bg-[#e5e8eb] active:scale-95 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#8b95a1]" strokeWidth={2.5} />
          점포 변경
        </button>
      </header>

      {/* Hero Section */}
      <div className="bg-white px-5 pt-6 pb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f3f0ff] rounded-full mb-3">
          <Dumbbell className="w-3.5 h-3.5 text-[#8b5cf6]" />
          <span className="text-[11px] font-bold text-[#8b5cf6]">재직/이용 중인 점포</span>
        </div>
        <h2 className="text-[24px] font-extrabold tracking-tight text-[#191f28] leading-tight mb-2">
          {gymData?.name || '알 수 없는 점포'}
        </h2>
        <div className="flex items-center gap-1.5 text-[#8b95a1] mb-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[13px]">{gymData?.address || '주소 정보 없음'}</span>
        </div>
        {(gymData?.operating_hours || gymData?.phone) && (
          <div className="flex items-center gap-3 text-[#8b95a1] mt-3 pt-3 border-t border-[#f2f4f6]">
            {gymData?.operating_hours && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[12px]">{gymData.operating_hours}</span>
              </div>
            )}
            {gymData?.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span className="text-[12px]">{gymData.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white px-5 border-b border-[#e5e8eb] sticky top-14 z-30 shadow-sm">
        {[
          { key: 'equipment', label: '보유 기구', icon: Dumbbell },
          { key: 'trainer', label: '트레이너', icon: UserCheck },
          { key: 'request', label: '나의 제보', icon: ClipboardList },
        ].map((t) => {
          const TabIcon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3.5 text-[14px] transition-colors relative flex items-center justify-center gap-1.5 ${tab === t.key ? 'text-[#191f28]' : 'text-[#8b95a1]'
                }`}
              style={{ fontWeight: tab === t.key ? 700 : 500 }}
            >
              <TabIcon className="w-4 h-4" />
              {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t bg-[#191f28]" />}
            </button>
          );
        })}
      </div>

      <div className="p-4 flex-1">
        {/* 기구 탭 */}
        {tab === 'equipment' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[13px] text-[#4e5968] font-bold">총 {equipments.length}종 등록됨</span>
              <button
                onClick={openRequestModal}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#fee2e2] text-[#f04452] text-[12px] rounded-lg hover:bg-[#fecaca] font-semibold transition-colors active:scale-95"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                정보 오류/누락 제보
              </button>
            </div>

            {/* Category Selector */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] transition-colors ${selectedCategory === cat
                      ? 'bg-[#191f28] text-white'
                      : 'bg-white text-[#4e5968] border border-[#e5e8eb]'
                    }`}
                  style={{ fontWeight: selectedCategory === cat ? 600 : 400 }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {['유산소', '웨이트', '머신', '기타'].map((cat) => {
              const filteredBySelection = equipments.filter(e => selectedCategory === '전체' || e.category === selectedCategory);
              const items = filteredBySelection.filter(e => e.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-5">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[12px] text-[#8b95a1] font-bold">{cat}</span>
                    <span className="text-[11px] text-[#c2c9d2] font-medium">{items.length}종</span>
                  </div>
                  <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden border border-[#e5e8eb]/50">
                    {items.map((eq, idx) => {
                      const cond = CONDITION_LABELS[eq.condition] || CONDITION_LABELS.good;
                      return (
                        <div key={eq.id} className={`flex items-center gap-3 px-4 py-3.5 ${idx < items.length - 1 ? 'border-b border-[#f7f8fa]' : ''}`}>
                          <div className="w-10 h-10 rounded-xl bg-[#ebf4ff] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {eq.brandLogo ? (
                              <img src={eq.brandLogo} alt="brand" className="w-full h-full object-cover" />
                            ) : (
                              <Dumbbell className="w-5 h-5 text-[#3182f6]" strokeWidth={2} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[15px] text-[#191f28] truncate" style={{ fontWeight: 600 }}>{eq.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: cond.color, backgroundColor: cond.bg, fontWeight: 700 }}>
                                {cond.label}
                              </span>
                            </div>
                            <p className="text-[12px] text-[#8b95a1] truncate">{eq.quantity}대 보유 {eq.brand ? `· ${eq.brand}` : ''}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}

            {equipments.length === 0 && (
              <div className="py-12 text-center text-[#8b95a1] text-[13px]">등록된 기구 정보가 없습니다.</div>
            )}

            {equipments.length > 0 && equipments.filter(e => selectedCategory === '전체' || e.category === selectedCategory).length === 0 && (
              <div className="py-12 text-center text-[#8b95a1] text-[13px]">선택한 카테고리에 해당하는 기구가 없습니다.</div>
            )}
          </div>
        )}

        {/* 트레이너 탭 */}
        {tab === 'trainer' && (
          <div className="animate-in fade-in duration-300 space-y-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[13px] text-[#4e5968] font-bold">소속 트레이너 {trainers.length}명</span>
              <span className="text-[10px] text-[#8b95a1] bg-[#f2f4f6] px-2 py-1 rounded-md font-medium">일반 회원은 열람만 임시 허용됩니다.</span>
            </div>
            {trainers.map(trainer => (
              <div key={trainer.id} className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 border border-[#e5e8eb]/50">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#f2f4f6] flex items-center justify-center flex-shrink-0">
                    {trainer.profile_image ? (
                      <img src={trainer.profile_image} alt="trainer" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-[#d1d6db]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[16px] text-[#191f28] leading-tight" style={{ fontWeight: 800 }}>{trainer.name || '이름 없음'}</h3>
                    <p className="text-[12px] text-[#8b95a1] mt-0.5">{trainer.specialty || '세부분야 미지정'}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="text-[10px] px-2 py-0.5 bg-[#f3f0ff] text-[#8b5cf6] rounded-full font-bold">경력 {trainer.experience || '-'}</span>
                      <span className="text-[11px] text-[#4e5968]">{trainer.schedule}</span>
                    </div>
                    {trainer.certifications && trainer.certifications.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-[#f7f8fa]">
                        {trainer.certifications.map(c => (
                          <span key={c} className="text-[10px] px-2 py-1 bg-[#f7f8fa] border border-[#e5e8eb] rounded-lg text-[#4e5968]">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {trainers.length === 0 && (
              <div className="py-12 text-center text-[#8b95a1] text-[13px]">등록된 트레이너가 없습니다.</div>
            )}
          </div>
        )}

        {/* 제보 내역 탭 */}
        {tab === 'request' && (
          <div className="animate-in fade-in duration-300 space-y-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[13px] text-[#4e5968] font-bold">내가 헬스장 점장님께 제보한 내역</span>
            </div>
            {myRequests.map(req => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const p = req.request_payload || {};
              return (
                <div key={req.id} className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 border border-[#e5e8eb]/50">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[11px] px-2.5 py-1 bg-[#ebf4ff] text-[#3182f6] rounded-full font-bold">{req.request_type || '기구'} 제보</span>
                    <span className={`text-[12px] font-bold flex items-center gap-1 ${isPending ? 'text-[#f59e0b]' : isApproved ? 'text-[#00c471]' : 'text-[#f04452]'}`}>
                      {isPending ? <Clock className="w-3.5 h-3.5" /> : isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {isPending ? '점장 검토중' : isApproved ? '승인 및 앱 반영완료' : '반려됨'}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[#191f28] mb-1.5">{p.name || '알 수 없는 기구'}</h4>
                  <p className="text-[13px] text-[#4e5968] line-clamp-2">요청 상태: <span className="font-semibold">{p.condition === 'maintenance' ? '고장/수리요청' : p.condition === 'excellent' ? '새로운 기구 입고됨' : '상태변경'}</span></p>
                  <p className="text-[13px] text-[#4e5968] line-clamp-2">수량/대수: <span className="font-semibold">{p.quantity || 1}대</span></p>
                  {p.message && <p className="text-[12px] text-[#8b95a1] bg-[#f7f8fa] p-2 rounded-lg mt-2 italic">"{p.message}"</p>}
                  <p className="text-[11px] text-[#c2c9d2] font-semibold mt-3 block w-full pt-3 border-t border-[#f7f8fa]">본 제보일: {new Date(req.created_at).toLocaleDateString()}</p>

                  {isPending && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f7f8fa]">
                      <button
                        onClick={() => openEditModal(req)}
                        className="flex-1 py-1.5 text-[12px] font-bold text-[#4e5968] bg-[#f2f4f6] rounded-lg hover:bg-[#e5e8eb] transition-colors"
                      >
                        수정하기
                      </button>
                      <button
                        onClick={() => deleteRequest(req.id)}
                        className="flex-1 py-1.5 text-[12px] font-bold text-[#f04452] bg-[#fef2f2] rounded-lg hover:bg-[#fee2e2] transition-colors"
                      >
                        제보 취소
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {myRequests.length === 0 && (
              <div className="py-16 text-center border border-dashed border-[#e5e8eb] bg-white rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-[#f2f4f6] flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-6 h-6 text-[#c2c9d2]" />
                </div>
                <p className="text-[14px] font-bold text-[#4e5968] mb-1">제보하신 내역이 없습니다.</p>
                <p className="text-[12px] text-[#8b95a1]">기구 고장이나 누락을 제보하면 여기에 표시됩니다.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 제보 팝업 시트 */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#191f28]/60 sm:items-center">
          <div className="w-full h-[85vh] sm:h-auto sm:max-h-[85vh] max-w-md bg-white rounded-t-3xl sm:rounded-2xl px-6 pt-5 pb-8 overflow-y-auto animate-in slide-in-from-bottom-2 sm:slide-in-from-bottom-0 sm:fade-in duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#e5e8eb] sm:hidden"></div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-extrabold text-[#191f28]">{editReqId ? '기구 제보 수정하기' : '기구 제보하기'}</h3>
              <button onClick={closeRequestModal} className="p-1 -mr-1"><XCircle className="w-7 h-7 text-[#8b95a1] hover:text-[#191f28] transition-colors" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[13px] text-[#4e5968] font-bold mb-1.5 block">어떤 기구인가요? (필수)</label>
                <input value={reqForm.name} onChange={e => setReqForm({ ...reqForm, name: e.target.value })} placeholder="예: 레그 익스텐션 투인원" className="w-full h-12 bg-[#f2f4f6] rounded-xl px-4 text-[15px] outline-none border-2 border-transparent focus:border-[#3182f6] transition-colors text-[#191f28]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] text-[#4e5968] font-bold mb-1.5 block">수량 (필수)</label>
                  <input value={reqForm.quantity} onChange={e => setReqForm({ ...reqForm, quantity: e.target.value })} type="number" placeholder="예: 2" className="w-full h-12 bg-[#f2f4f6] rounded-xl px-4 text-[15px] outline-none border-2 border-transparent focus:border-[#3182f6] text-[#191f28]" />
                </div>
                <div>
                  <label className="text-[13px] text-[#4e5968] font-bold mb-1.5 block">브랜드 (선택)</label>
                  <button
                    onClick={() => setShowBrandSelector(true)}
                    className="w-full h-12 bg-[#f2f4f6] hover:bg-[#e8ebed] rounded-xl px-4 text-[14px] text-left flex items-center justify-between transition-colors border-2 border-transparent focus:border-[#3182f6]"
                  >
                    <span className={reqForm.brand_display ? "text-[#191f28] font-bold" : "text-[#8b95a1]"}>
                      {reqForm.brand_display || '브랜드 선택'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#8b95a1]" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[13px] text-[#4e5968] font-bold mb-1.5 block">기구 상태 (중요)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'good', label: '사용가능/보통', color: '#f59e0b', bg: '#fef3c7', activeBg: '#f59e0b' },
                    { value: 'maintenance', label: '단선·고장', color: '#f04452', bg: '#fef2f2', activeBg: '#f04452' },
                    { value: 'excellent', label: '새로 입고됨!', color: '#00c471', bg: '#e8faf0', activeBg: '#00c471' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReqForm({ ...reqForm, condition: opt.value })}
                      className="h-12 rounded-xl text-[13px] transition-all active:scale-95 border-2"
                      style={reqForm.condition === opt.value
                        ? { backgroundColor: opt.activeBg, color: '#fff', borderColor: opt.activeBg, fontWeight: 700 }
                        : { backgroundColor: '#f2f4f6', color: '#4e5968', borderColor: 'transparent', fontWeight: 500 }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[13px] text-[#4e5968] font-bold mb-1.5 block">상세 설명 남기기</label>
                <textarea value={reqForm.message} onChange={e => setReqForm({ ...reqForm, message: e.target.value })} placeholder="점장님이 보실 수 있도록 특이사항을 적어주세요. (예: 손잡이가 덜덜 떨립니다.)" rows={3} className="w-full bg-[#f2f4f6] rounded-xl p-4 text-[15px] outline-none border-2 border-transparent focus:border-[#3182f6] resize-none text-[#191f28] placeholder-[#8b95a1]" />
              </div>
            </div>

            <div className="bg-[#fff1f2] rounded-xl p-4 mt-5 mb-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#f04452] mt-0.5 shrink-0" />
                <p className="text-[12px] text-[#f04452] leading-snug font-medium">허위 사실이나 욕설이 포함된 제보는 서비스 이용 제재의 원인이 될 수 있습니다.</p>
              </div>
            </div>

            <button
              onClick={submitRequest}
              disabled={isSubmitting || !reqForm.name}
              className="w-full h-14 rounded-2xl bg-[#3182f6] text-white font-bold text-[16px] mt-2 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#3182f6]/20"
            >
              {isSubmitting ? <span className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full" /> : null}
              {isSubmitting ? (editReqId ? '수정 중...' : '점포로 전송 중...') : (editReqId ? '제보 수정 완료' : '관리자에게 헬스장 데이터 제보하기')}
            </button>
          </div>
        </div>
      )}

      <BrandSelectorModal
        isOpen={showBrandSelector}
        onClose={() => setShowBrandSelector(false)}
        onSelect={(brandInfo) => {
          setReqForm(prev => ({
            ...prev,
            brand_id: brandInfo.isCustom ? null : brandInfo.id,
            custom_brand_name: brandInfo.isCustom ? brandInfo.name : '',
            brand_display: brandInfo.name
          }));
        }}
      />
    </div>
  );
}
