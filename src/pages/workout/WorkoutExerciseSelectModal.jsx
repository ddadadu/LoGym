import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, X, Check, Dumbbell, Tag, Plus } from 'lucide-react';

const CATEGORIES = ['프리웨이트', '머신', '유산소', '맨몸운동'];
const SUB_CATEGORIES = ['가슴', '등', '어깨', '팔', '하체', '복근', '전신'];

export default function WorkoutExerciseSelectModal({ isOpen, onClose, onSelectComplete, userGymId }) {
  const [activeCategory, setActiveCategory] = useState('맨몸운동');
  const [activeSubCategory, setActiveSubCategory] = useState('가슴');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [exercises, setExercises] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]); // [{id, name, isCustom}, ...]
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // 커스텀 입력 플래그 및 폼
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', category: '기타', sub_category: '기타' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, []);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchExercises();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeCategory, activeSubCategory, currentUser]);

  const fetchExercises = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. 유저의 커스텀 운동 (전체 혹은 카테고리 필터)
      const { data: customData, error: cError } = await supabase
        .from('user_custom_exercises')
        .select('*')
        .eq('user_id', currentUser?.id);
        
      if (cError) throw cError;

      // 2. 마스터 운동 (equipments)
      let query = supabase.from('equipments').select('*');
      if (activeCategory) query = query.eq('category', activeCategory);
      if (activeSubCategory && activeCategory !== '유산소') query = query.eq('sub_category', activeSubCategory);
      
      const { data: masterData, error: mError } = await query;
      if (mError) throw mError;
      
      const cData = customData ? customData.map(d => ({ ...d, isCustom: true })) : [];
      let mData = masterData ? masterData.map(d => ({ ...d, isCustom: false })) : [];
      
      setExercises([...mData, ...cData.filter(c => c.category === activeCategory && c.sub_category === activeSubCategory)]);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || '운동 데이터를 불러오는데 실패했습니다. (DB 연결 오류)');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, item];
    });
  };

  const handleCustomSubmit = async () => {
    if (!customForm.name.trim() || !currentUser) return;
    try {
      const { data, error } = await supabase
        .from('user_custom_exercises')
        .insert({
          user_id: currentUser.id,
          name: customForm.name.trim(),
          category: customForm.category,
          sub_category: customForm.sub_category
        })
        .select()
        .single();
        
      if (error) {
        if (error.code === '23505') alert('이미 동일한 이름의 커스텀 운동이 존재합니다.');
        else alert('추가 중 오류가 발생했습니다.');
        return;
      }
      
      // 새로 추가된 항목을 즉시 선택 목록에 넣고 리로드
      setSelectedItems(prev => [...prev, { ...data, isCustom: true }]);
      setCustomForm({ name: '', category: '기타', sub_category: '기타' });
      setShowCustomForm(false);
      fetchExercises();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const filteredExercises = exercises.filter(ex => ex.name.includes(searchQuery));

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#191f28]/60 transition-opacity">
      <div className="w-full h-[85vh] bg-white rounded-t-3xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-xl font-extrabold text-[#191f28]">종목 선택</h3>
          <button onClick={onClose} className="p-1 -mr-1"><X className="w-7 h-7 text-[#8b95a1]" /></button>
        </div>

        {showCustomForm ? (
          /* 커스텀 직접 입력 뷰 */
          <div className="p-5 flex-1 overflow-y-auto">
             <button onClick={() => setShowCustomForm(false)} className="text-sm font-bold text-[#3182f6] mb-5">← 마스터 목록으로 돌아가기</button>
             <h4 className="text-lg font-bold text-[#191f28] mb-4">나만의 커스텀 운동 추가 ✍️</h4>
             <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-[#4e5968] mb-1.5 block">운동 이름</label>
                  <input value={customForm.name} onChange={e=>setCustomForm({...customForm, name: e.target.value})} placeholder="예: 언더핸드 케이블 로우" className="w-full h-12 bg-[#f2f4f6] rounded-xl px-4 text-[15px] outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold text-[#4e5968] mb-1.5 block">대분류</label>
                    <select value={customForm.category} onChange={e=>setCustomForm({...customForm, category: e.target.value})} className="w-full h-12 bg-[#f2f4f6] rounded-xl px-4 text-[15px] outline-none">
                      <option value="기타">기타</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#4e5968] mb-1.5 block">소분류</label>
                    <select value={customForm.sub_category} onChange={e=>setCustomForm({...customForm, sub_category: e.target.value})} className="w-full h-12 bg-[#f2f4f6] rounded-xl px-4 text-[15px] outline-none">
                      <option value="기타">기타</option>
                      {SUB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
             </div>
             <button onClick={handleCustomSubmit} className="mt-8 w-full h-14 rounded-2xl bg-[#3182f6] text-white font-bold text-lg active:scale-95 transition-transform">추가하고 선택하기</button>
          </div>
        ) : (
          /* 일반 마스터 리스트 뷰 */
          <>
            {/* 검색 */}
            <div className="px-5 mb-3">
              <div className="flex items-center bg-[#f2f4f6] rounded-2xl px-4 py-3">
                <Search className="w-5 h-5 text-[#8b95a1] shrink-0" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="운동 검색..." 
                  className="ml-2 w-full bg-transparent outline-none text-[#191f28] placeholder-[#8b95a1]"
                />
              </div>
            </div>

            {/* 필터 칩 */}
            <div className="px-5 pb-2">
              <div className="flex space-x-2 overflow-x-auto scrollbar-hide py-1">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => { setActiveCategory(cat); setActiveSubCategory('가슴'); }}
                    className={`shrink-0 px-4 py-2 rounded-full text-[14px] font-bold transition-colors ${
                      activeCategory === cat ? 'bg-[#191f28] text-white shadow-md' : 'bg-white border border-[#e5e8eb] text-[#4e5968] hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex space-x-2 overflow-x-auto scrollbar-hide mt-3 py-1 pl-1">
                {SUB_CATEGORIES.map(sub => (
                  <button 
                    key={sub} 
                    onClick={() => setActiveSubCategory(sub)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-colors ${
                      activeSubCategory === sub ? 'bg-[#e8f3ff] text-[#3182f6]' : 'bg-transparent text-[#8b95a1] hover:text-[#4e5968]'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-[#f2f4f6] w-full" />

            {errorMsg && (
              <div className="mx-5 mt-3 p-3 bg-[#fef2f2] rounded-xl text-[13px] text-[#f04452] font-bold">
                🚨 {errorMsg}
              </div>
            )}

            {/* 리스트업 */}
            <div className="flex-1 overflow-y-auto px-5 py-2 relative">
              {isLoading ? (
                <div className="flex justify-center py-10"><span className="animate-spin w-8 h-8 rounded-full border-2 border-[#3182f6] border-t-transparent" /></div>
              ) : filteredExercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#8b95a1]">
                  <Dumbbell className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium mb-1">조건에 맞는 운동이 없습니다.</p>
                  <button onClick={() => setShowCustomForm(true)} className="mt-4 px-4 py-2 bg-[#f2f4f6] rounded-xl text-sm font-bold text-[#3182f6] flex items-center gap-1">
                    <Plus className="w-4 h-4"/> 직접 등록하기
                  </button>
                </div>
              ) : (
                <div className="space-y-1 pb-20">
                  {filteredExercises.map(ex => {
                    const isSelected = selectedItems.find(i => i.id === ex.id);
                    return (
                      <div 
                        key={ex.id}
                        onClick={() => toggleItem(ex)}
                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#e8f3ff]' : 'bg-white hover:bg-[#f9fafb]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-[#3182f6] border-[#3182f6]' : 'border-[#d1d6db] bg-white'}`}>
                            {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[16px] font-bold ${isSelected ? 'text-[#3182f6]' : 'text-[#191f28]'}`}>{ex.name}</span>
                              {ex.isCustom && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#fef3c7] text-[#d97706] font-bold">Custom</span>}
                            </div>
                            <span className="text-[12px] text-[#8b95a1] font-medium">{ex.category} · {ex.sub_category}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <button onClick={() => setShowCustomForm(true)} className="w-full mt-2 p-4 rounded-2xl border-2 border-dashed border-[#e5e8eb] text-[#8b95a1] flex items-center justify-center gap-2 hover:bg-[#f9fafb] transition-colors">
                    <Plus className="w-5 h-5"/>
                    <span className="font-bold text-sm">찾는 운동이 없나요? 직접 등록하기</span>
                  </button>
                </div>
              )}
            </div>

            {/* 하단 완료버튼 */}
            {selectedItems.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-[#f2f4f6] animate-in slide-in-from-bottom-5">
                <button 
                  onClick={() => {
                    onSelectComplete(selectedItems);
                    onClose();
                  }}
                  className="w-full h-14 rounded-2xl bg-[#191f28] text-white font-bold text-[16px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                >
                  <span className="w-6 h-6 rounded-full bg-[#3182f6] text-white text-sm flex items-center justify-center">{selectedItems.length}</span>
                  선택 완료
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
