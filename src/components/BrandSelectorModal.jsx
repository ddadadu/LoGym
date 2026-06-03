import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, X, Plus, ImageIcon } from 'lucide-react';

export default function BrandSelectorModal({ isOpen, onClose, onSelect }) {
  const [brands, setBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 직접 입력 모드 상태
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customBrandName, setCustomBrandName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchBrands();
    }
  }, [isOpen]);

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment_brands')
        .select('*')
        .order('name_ko', { ascending: true });

      if (error) throw error;
      setBrands(data || []);
    } catch (err) {
      console.error('브랜드 조회 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBrand = (brand) => {
    onSelect({
      id: brand.id,
      name: brand.name_ko,
      isCustom: false
    });
    onClose();
  };

  const handleCustomSubmit = () => {
    if (!customBrandName.trim()) return;
    onSelect({
      id: null,
      name: customBrandName.trim(),
      isCustom: true
    });
    setCustomBrandName('');
    setShowCustomInput(false);
    onClose();
  };

  if (!isOpen) return null;

  const filteredBrands = brands.filter(b =>
    b.name_ko.includes(searchQuery) ||
    b.name_en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-[#191f28]/60 transition-opacity">
      <div className="w-full h-[75vh] bg-white rounded-t-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#f2f4f6]">
          <h3 className="text-xl font-extrabold text-[#191f28]">기구 브랜드 선택</h3>
          <button onClick={onClose} className="p-1 -mr-1"><X className="w-7 h-7 text-[#8b95a1]" /></button>
        </div>

        {showCustomInput ? (
          /* 직접 입력 뷰 */
          <div className="p-5 flex-1 flex flex-col">
            <button onClick={() => setShowCustomInput(false)} className="text-sm font-bold text-[#3182f6] mb-5 text-left">
              ← 브랜드 리스트로 돌아가기
            </button>
            <h4 className="text-lg font-bold text-[#191f28] mb-4">브랜드 직접 입력</h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-[#4e5968] mb-1.5 block">브랜드명</label>
                <input
                  value={customBrandName}
                  onChange={e => setCustomBrandName(e.target.value)}
                  autoFocus
                  className="w-full h-14 bg-[#f2f4f6] rounded-xl px-4 text-[16px] outline-none font-medium focus:border-2 focus:border-[#3182f6] focus:bg-white"
                />
              </div>
            </div>
            <div className="mt-auto pb-5">
              <button
                onClick={handleCustomSubmit}
                disabled={!customBrandName.trim()}
                className="w-full h-14 rounded-2xl bg-[#191f28] text-white font-bold text-[16px] active:scale-95 transition-transform disabled:opacity-30 disabled:active:scale-100"
              >
                입력 완료
              </button>
            </div>
          </div>
        ) : (
          /* 마스터 브랜드 리스트 뷰 */
          <>
            {/* 검색 */}
            <div className="px-5 py-3 bg-white">
              <div className="flex items-center bg-[#f2f4f6] rounded-2xl px-4 py-3">
                <Search className="w-5 h-5 text-[#8b95a1] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="브랜드명 검색 (한글/영문)..."
                  className="ml-2 w-full bg-transparent outline-none text-[#191f28] placeholder-[#8b95a1]"
                />
              </div>
            </div>

            {/* 리스트업 */}
            <div className="flex-1 overflow-y-auto px-5 py-2 min-h-0">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <span className="animate-spin w-8 h-8 rounded-full border-2 border-[#3182f6] border-t-transparent" />
                </div>
              ) : filteredBrands.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#8b95a1]">
                  <p className="text-sm font-medium mb-1">검색된 브랜드가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2 pb-5">
                  {filteredBrands.map(brand => (
                    <button
                      key={brand.id}
                      onClick={() => handleSelectBrand(brand)}
                      className="w-full flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors border border-[#e5e8eb] bg-white hover:bg-[#f9fafb] active:scale-[0.98]"
                    >
                      <div className="w-[50px] h-[50px] shrink-0 bg-white border border-[#f2f4f6] rounded-xl flex items-center justify-center overflow-hidden p-1 shadow-sm">
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt={brand.name_ko} className="w-full h-full object-contain" loading="lazy" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-[#d1d6db]" />
                        )}
                      </div>
                      <div className="flex flex-col text-left flex-1">
                        <span className="text-[16px] font-bold text-[#191f28]">{brand.name_ko}</span>
                        <span className="text-[12px] text-[#8b95a1] font-medium mt-0.5">{brand.name_en}</span>
                      </div>
                    </button>
                  ))}

                  {/* 직접 입력 (기타) 아이템 */}
                  <div className="pt-4 mt-4 border-t border-[#f2f4f6]">
                    <button
                      onClick={() => setShowCustomInput(true)}
                      className="w-full p-4 rounded-2xl border-2 border-dashed border-[#d1d6db] text-[#4e5968] flex items-center justify-center gap-2 hover:bg-[#f9fafb] hover:text-[#191f28] hover:border-[#8b95a1] transition-colors active:scale-[0.98]"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="font-bold text-[15px]">리스트에 브랜드가 없나요? 직접 입력</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
