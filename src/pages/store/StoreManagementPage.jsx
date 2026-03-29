import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Dumbbell, UserCheck, Settings2, Save } from 'lucide-react';

const CATEGORIES = ['전체', '유산소', '웨이트', '머신'];
const CONDITION_LABELS = {
  excellent: { label: '양호', color: '#00c471', bg: '#e8faf0' },
  good: { label: '보통', color: '#f59e0b', bg: '#fef3c7' },
  maintenance: { label: '점검필요', color: '#f04452', bg: '#fef2f2' },
};

const TRAINER_FALLBACK = "https://images.unsplash.com/photo-1750698545009-679820502908?auto=format&fit=crop&q=80&w=150&h=150";

export default function StoreManagementPage() {
  const { profile } = useOutletContext();
  const gymId = profile?.home_gym_id;

  const [tab, setTab] = useState('equipment'); // 'equipment' | 'trainer' | 'infra'
  
  // Data States
  const [equipmentList, setEquipmentList] = useState([]);
  const [trainerList, setTrainerList] = useState([]);
  const [masterEquipments, setMasterEquipments] = useState([]);
  const [infraForm, setInfraForm] = useState({
    operating_hours: '', closed_day: '', monthly_fee: '',
    registration_fee: '', description: ''
  });

  // UI States
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [expandedTrainer, setExpandedTrainer] = useState(null);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showAddTrainer, setShowAddTrainer] = useState(false);
  const [isSavingInfra, setIsSavingInfra] = useState(false);

  // Forms
  const [newEquip, setNewEquip] = useState({ category: '유산소', name: '', quantity: 1, brand: '', condition: 'good' });
  const [newTrainer, setNewTrainer] = useState({ name: '', specialty: '', experience: '', schedule: '', certs: '' });

  useEffect(() => {
    if (gymId) fetchData();
  }, [gymId]);

  const fetchData = async () => {
    // 1. Equipments
    const { data: geData } = await supabase
      .from('gym_equipments')
      .select('*, equipments(name, category)')
      .eq('gym_id', gymId);
      
    if (geData) {
      setEquipmentList(geData.map(item => ({
        id: item.equipment_id,
        category: item.equipments?.category || '기타',
        name: item.equipments?.name || '알 수 없음',
        quantity: item.quantity || 1,
        condition: item.condition || 'good',
        brand: item.brand || '',
      })));
    }

    // 2. Trainers
    const { data: trData } = await supabase.from('gym_trainers').select('*').eq('gym_id', gymId);
    if (trData) setTrainerList(trData);

    // 3. Master Equipments (for autocomplete/matching)
    const { data: meData } = await supabase.from('equipments').select('*');
    if (meData) setMasterEquipments(meData);

    // 4. Infra
    const { data: gymData } = await supabase.from('gyms').select('*').eq('id', gymId).single();
    if (gymData) {
      setInfraForm({
        operating_hours: gymData.operating_hours || '',
        closed_day: gymData.closed_day || '',
        monthly_fee: gymData.monthly_fee || '',
        registration_fee: gymData.registration_fee || '',
        description: gymData.description || ''
      });
    }
  };

  const handleAddEquipment = async () => {
    if (!newEquip.name) return;
    
    // Find or Create Master Equipment
    let eqId = masterEquipments.find(e => e.name === newEquip.name)?.id;
    if (!eqId) {
      const { data: newEq, error } = await supabase.from('equipments').insert({ 
        name: newEquip.name, category: newEquip.category
      }).select().single();
      if (!error && newEq) eqId = newEq.id;
    }

    if (eqId) {
      await supabase.from('gym_equipments').upsert({
        gym_id: gymId,
        equipment_id: eqId,
        quantity: newEquip.quantity,
        condition: newEquip.condition,
        brand: newEquip.brand
      }, { onConflict: 'gym_id, equipment_id' });
      
      setNewEquip({ category: '유산소', name: '', quantity: 1, brand: '', condition: 'good' });
      setShowAddEquipment(false);
      fetchData();
    }
  };

  const deleteEquipment = async (eqId) => {
    if(!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('gym_equipments').delete().match({ gym_id: gymId, equipment_id: eqId });
    fetchData();
  };

  const handleAddTrainer = async () => {
    if (!newTrainer.name) return;
    const certArray = newTrainer.certs.split(',').map(s => s.trim()).filter(Boolean);
    
    // Note: If 'name' column is missing in DB, this will fail. We save it inside specialty string if needed, 
    // but optimally the DB has 'name'. We will try to insert relying on the updated schema.
    const payload = {
      gym_id: gymId,
      name: newTrainer.name, // Will work if ALTER TABLE was successful, else might throw an error.
      specialty: newTrainer.specialty,
      experience: newTrainer.experience,
      schedule: newTrainer.schedule,
      certifications: certArray,
      rating: 5.0
    };

    const { error } = await supabase.from('gym_trainers').insert(payload);
    if (!error) {
      setNewTrainer({ name: '', specialty: '', experience: '', schedule: '', certs: '' });
      setShowAddTrainer(false);
      fetchData();
    } else {
      console.warn("Trainer insert error:", error);
      alert('저장 실패: ' + error.message);
    }
  };

  const deleteTrainer = async (trId) => {
    if(!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('gym_trainers').delete().match({ id: trId });
    fetchData();
  };

  const saveInfra = async () => {
    setIsSavingInfra(true);
    await supabase.from('gyms').update(infraForm).eq('id', gymId);
    setIsSavingInfra(false);
    alert('인프라 정보가 성공적으로 저장되었습니다.');
  };

  const filteredEquipment = equipmentList.filter(e => selectedCategory === '전체' || e.category === selectedCategory);

  return (
    <div className="min-h-full pb-10">
      {/* Header & Tabs */}
      <div className="bg-white px-5 pt-8 pb-4 lg:px-10 lg:pt-10 shadow-[0_1px_0_0_#e5e8eb]">
        <div className="max-w-3xl">
          <h1 className="text-[#191f28] text-[22px] tracking-[-0.03em]" style={{ fontWeight: 800 }}>점포 상세 관리</h1>
          <p className="text-[#8b95a1] text-[13px] mt-0.5">핵심 자산과 운영 정보를 관리하세요</p>
          
          <div className="flex gap-1 mt-4 bg-[#f2f4f6] rounded-xl p-1 overflow-x-auto">
            {[
              { key: 'equipment', label: '🏋️ 기구', count: equipmentList.length },
              { key: 'trainer', label: '👤 트레이너', count: trainerList.length },
              { key: 'infra', label: '🏢 인프라', count: null },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-shrink-0 min-w-[90px] flex-1 py-2.5 rounded-lg text-[14px] transition-all ${
                  tab === t.key ? 'bg-white text-[#191f28] shadow-sm' : 'text-[#8b95a1]'
                }`}
                style={{ fontWeight: tab === t.key ? 600 : 400 }}
              >
                {t.label}
                {t.count !== null && (
                  <span className="ml-1.5 text-[12px]" style={{ color: tab === t.key ? '#3182f6' : '#c2c9d2' }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 lg:px-10 py-5 max-w-3xl">
        {/* ───── EQUIPMENT TAB ───── */}
        {tab === 'equipment' && (
          <div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#3182f6] text-white'
                      : 'bg-white text-[#4e5968] border border-[#e5e8eb]'
                  }`}
                  style={{ fontWeight: selectedCategory === cat ? 600 : 400 }}
                >
                  {cat}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => setShowAddEquipment(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#3182f6] text-white text-[13px]"
                style={{ fontWeight: 600 }}
              >
                <Plus className="w-3.5 h-3.5" /> 추가
              </button>
            </div>

            {/* Add Equipment Form */}
            {showAddEquipment && (
              <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] mb-4 p-5 border-2 border-[#3182f6]/20">
                <h4 className="text-[15px] text-[#191f28] mb-4" style={{ fontWeight: 600 }}>기구 추가</h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[12px] text-[#8b95a1] mb-1 block">카테고리</label>
                    <select
                      value={newEquip.category}
                      onChange={(e) => setNewEquip({ ...newEquip, category: e.target.value })}
                      className="w-full h-10 bg-[#f2f4f6] rounded-xl px-3 text-[14px] outline-none"
                    >
                      {['유산소', '웨이트', '머신', '기타'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] text-[#8b95a1] mb-1 block">기구명 *</label>
                    <input
                      value={newEquip.name}
                      onChange={(e) => setNewEquip({ ...newEquip, name: e.target.value })}
                      placeholder="예: 러닝머신"
                      className="w-full h-10 bg-[#f2f4f6] rounded-xl px-3 text-[14px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-[#8b95a1] mb-1 block">수량 (대)</label>
                    <input
                      type="number" min={1}
                      value={newEquip.quantity}
                      onChange={(e) => setNewEquip({ ...newEquip, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full h-10 bg-[#f2f4f6] rounded-xl px-3 text-[14px] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-[#8b95a1] mb-1 block">상태</label>
                    <select
                      value={newEquip.condition}
                      onChange={(e) => setNewEquip({ ...newEquip, condition: e.target.value })}
                      className="w-full h-10 bg-[#f2f4f6] rounded-xl px-3 text-[14px] outline-none"
                    >
                      <option value="excellent">양호</option>
                      <option value="good">보통</option>
                      <option value="maintenance">점검필요</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddEquipment(false)} className="flex-1 h-10 rounded-xl bg-[#f2f4f6] text-[#4e5968] text-[14px]" style={{ fontWeight: 500 }}>취소</button>
                  <button onClick={handleAddEquipment} className="flex-1 h-10 rounded-xl bg-[#3182f6] text-white text-[14px]" style={{ fontWeight: 600 }}>추가하기</button>
                </div>
              </div>
            )}

            {/* List */}
            {['유산소', '웨이트', '머신', '기타'].map((cat) => {
              const items = filteredEquipment.filter(e => e.category === cat);
              if(items.length === 0) return null;
              return (
                <div key={cat} className="mb-5">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[13px] text-[#8b95a1]" style={{ fontWeight: 600 }}>{cat}</span>
                    <span className="text-[12px] text-[#c2c9d2]">{items.length}종</span>
                  </div>
                  <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {items.map((eq, idx) => {
                      const cond = CONDITION_LABELS[eq.condition] || CONDITION_LABELS.good;
                      return (
                        <div key={eq.id} className={`flex items-center gap-3 px-4 py-3.5 ${idx < items.length - 1 ? 'border-b border-[#f7f8fa]' : ''}`}>
                          <div className="w-9 h-9 rounded-xl bg-[#ebf4ff] flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="w-4.5 h-4.5 text-[#3182f6]" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] text-[#191f28]" style={{ fontWeight: 600 }}>{eq.name}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: cond.color, backgroundColor: cond.bg, fontWeight: 500 }}>
                                {cond.label}
                              </span>
                            </div>
                            <p className="text-[12px] text-[#8b95a1] mt-0.5">{eq.quantity}대 보유</p>
                          </div>
                          <button onClick={() => deleteEquipment(eq.id)} className="w-8 h-8 rounded-lg hover:bg-[#fef2f2] flex items-center justify-center transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-[#f04452]" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ───── TRAINER TAB ───── */}
        {tab === 'trainer' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] text-[#8b5cf6]" style={{ fontWeight: 600 }}>총 {trainerList.length}명</span>
              <button onClick={() => setShowAddTrainer(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8b5cf6] text-white text-[13px]" style={{ fontWeight: 600 }}>
                <Plus className="w-3.5 h-3.5" /> 추가
              </button>
            </div>

            {showAddTrainer && (
              <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] mb-4 p-5 border-2 border-[#8b5cf6]/20">
                <h4 className="text-[15px] text-[#191f28] mb-4" style={{ fontWeight: 600 }}>새 트레이너</h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[12px] text-[#8b95a1] mb-1 block">이름 *</label>
                    <input value={newTrainer.name} onChange={e => setNewTrainer({...newTrainer, name: e.target.value})} className="w-full h-10 bg-[#f2f4f6] rounded-xl px-3 text-[14px]" />
                  </div>
                  <div>
                    <label className="text-[12px] text-[#8b95a1] mb-1 block">전문 분야</label>
                    <input value={newTrainer.specialty} onChange={e => setNewTrainer({...newTrainer, specialty: e.target.value})} className="w-full h-10 bg-[#f2f4f6] rounded-xl px-3 text-[14px]" />
                  </div>
                  <div>
                    <label className="text-[12px] text-[#8b95a1] mb-1 block">경력 (예: 5년)</label>
                    <input value={newTrainer.experience} onChange={e => setNewTrainer({...newTrainer, experience: e.target.value})} className="w-full h-10 bg-[#f2f4f6] rounded-xl px-3 text-[14px]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[12px] text-[#8b95a1] mb-1 block">근무 스케줄</label>
                    <input value={newTrainer.schedule} onChange={e => setNewTrainer({...newTrainer, schedule: e.target.value})} className="w-full h-10 bg-[#f2f4f6] rounded-xl px-3 text-[14px]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[12px] text-[#8b95a1] mb-1 block">자격증 (쉼표로 구분)</label>
                    <input value={newTrainer.certs} onChange={e => setNewTrainer({...newTrainer, certs: e.target.value})} className="w-full h-10 bg-[#f2f4f6] rounded-xl px-3 text-[14px]" placeholder="생활스포츠지도사, CPR" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddTrainer(false)} className="flex-1 h-10 rounded-xl bg-[#f2f4f6] text-[#4e5968] text-[14px]" style={{ fontWeight: 500 }}>취소</button>
                  <button onClick={handleAddTrainer} className="flex-1 h-10 rounded-xl bg-[#8b5cf6] text-white text-[14px]" style={{ fontWeight: 600 }}>저장하기</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {trainerList.map(trainer => (
                <div key={trainer.id} className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={trainer.profile_image || TRAINER_FALLBACK} alt="trainer" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[16px] text-[#191f28]" style={{ fontWeight: 700 }}>{trainer.name || '이름 없음'}</h3>
                      <p className="text-[13px] text-[#8b95a1]">{trainer.specialty || '분야 미지정'}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] px-2 py-0.5 bg-[#f3f0ff] text-[#8b5cf6] rounded-full">경력 {trainer.experience || '-'}</span>
                        <span className="text-[11px] text-[#8b95a1]">{trainer.schedule}</span>
                      </div>

                      {trainer.certifications && trainer.certifications.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {trainer.certifications.map(c => (
                            <span key={c} className="text-[11px] px-2 py-1 bg-[#f7f8fa] border border-[#e5e8eb] rounded-lg text-[#4e5968]">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteTrainer(trainer.id)} className="w-8 h-8 rounded-lg hover:bg-[#fef2f2] flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-[#f04452]" />
                    </button>
                  </div>
                </div>
              ))}
              {trainerList.length === 0 && !showAddTrainer && (
                <div className="py-10 text-center text-[#8b95a1] text-[14px]">등록된 트레이너가 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {/* ───── INFRA TAB ───── */}
        {tab === 'infra' && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] text-[#191f28]" style={{ fontWeight: 600 }}>영업 기반 정보</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[12px] text-[#8b95a1] mb-1 block">운영 시간</label>
                <input value={infraForm.operating_hours || ''} onChange={e => setInfraForm({...infraForm, operating_hours: e.target.value})} placeholder="예: 평일 06:00 - 23:00 / 주말 09:00 - 18:00" className="w-full h-11 bg-[#f2f4f6] rounded-xl px-3 text-[14px]" />
              </div>
              <div>
                <label className="text-[12px] text-[#8b95a1] mb-1 block">지정 휴무일</label>
                <input value={infraForm.closed_day || ''} onChange={e => setInfraForm({...infraForm, closed_day: e.target.value})} placeholder="예: 매월 1,3주차 일요일" className="w-full h-11 bg-[#f2f4f6] rounded-xl px-3 text-[14px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-[#8b95a1] mb-1 block">월 기본 이용료 (원)</label>
                  <input value={infraForm.monthly_fee || ''} onChange={e => setInfraForm({...infraForm, monthly_fee: e.target.value})} type="number" className="w-full h-11 bg-[#f2f4f6] rounded-xl px-3 text-[14px]" />
                </div>
                <div>
                  <label className="text-[12px] text-[#8b95a1] mb-1 block">가입비/등록비 (원)</label>
                  <input value={infraForm.registration_fee || ''} onChange={e => setInfraForm({...infraForm, registration_fee: e.target.value})} type="number" className="w-full h-11 bg-[#f2f4f6] rounded-xl px-3 text-[14px]" />
                </div>
              </div>
              <div>
                <label className="text-[12px] text-[#8b95a1] mb-1 block">공지 또는 인사말</label>
                <textarea rows={3} value={infraForm.description || ''} onChange={e => setInfraForm({...infraForm, description: e.target.value})} className="w-full bg-[#f2f4f6] rounded-xl p-3 text-[14px] resize-none" />
              </div>

              <button
                onClick={saveInfra}
                disabled={isSavingInfra}
                className="w-full h-[52px] rounded-2xl bg-[#191f28] text-white flex items-center justify-center gap-2 mt-4 transition-all active:scale-[0.98]"
                style={{ fontWeight: 600 }}
              >
                {isSavingInfra ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                변경 내용 저장하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
