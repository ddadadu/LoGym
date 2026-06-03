import { useState, useRef, useEffect } from 'react';
import { Camera, ImagePlus, X, Flame, Target } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function WorkoutFinishModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [metrics, setMetrics] = useState({ height: '', weight: '' });
  const fileInputRef = useRef(null);

  // Fetch initial metrics when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchMetrics = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('height, weight')
            .eq('id', user.id)
            .single();

          if (data) {
            setMetrics({
              height: data.height || '',
              weight: data.weight || ''
            });
          }
        }
      };
      fetchMetrics();
    } else {
      // Reset state when closed
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 10MB 제한 (카메라 원본 제어)
      if (file.size > 10 * 1024 * 1024) {
        alert("10MB 이하의 사진만 업로드 가능합니다.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    // Pass the photo and the metrics to the parent
    onSubmit(selectedFile, metrics.height, metrics.weight);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      {/* 백그라운드 터치 시 닫기 (업로드 중엔 막음) */}
      <div className="absolute inset-0" onClick={() => !isSubmitting && onClose()} />

      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-[32px] p-6 shadow-2xl pb-10 
        max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-[100%] duration-300 ease-out"
      >
        <div className="w-12 h-1.5 bg-[#e5e8eb] rounded-full mx-auto mb-6" />

        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 bg-[#f2f4f6] rounded-full text-[#8b95a1] active:scale-95 transition-transform disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#fff0f0] rounded-full flex items-center justify-center mx-auto mb-3">
            <Flame className="w-8 h-8 text-[#f04452]" />
          </div>
          <h2 className="text-[22px] font-extrabold text-[#191f28]">오운완 기록</h2>
          <p className="mt-1 text-[13px] font-medium text-[#8b95a1]">
            오늘의 신체 변화와 땀방울을 기록해 보세요!
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="bg-[#f9fafb] p-4 rounded-2xl border border-[#e5e8eb]">
            <label className="text-[12px] font-bold text-[#8b95a1] mb-1 block">오늘의 체중 (kg)</label>
            <input
              type="number"
              value={metrics.weight}
              onChange={e => setMetrics({ ...metrics, weight: e.target.value })}
              placeholder="예: 70"
              className="w-full bg-transparent text-[22px] font-extrabold text-[#191f28] outline-none placeholder-[#d1d6db]"
            />
          </div>
          <div className="bg-[#f9fafb] p-4 rounded-2xl border border-[#e5e8eb]">
            <label className="text-[12px] font-bold text-[#8b95a1] mb-1 block">현재 신장 (cm)</label>
            <input
              type="number"
              value={metrics.height}
              onChange={e => setMetrics({ ...metrics, height: e.target.value })}
              placeholder="예: 175"
              className="w-full bg-transparent text-[22px] font-extrabold text-[#191f28] outline-none placeholder-[#d1d6db]"
            />
          </div>
        </div>

        {/* 이미지 업로더 영역 */}
        <div className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[#e5e8eb] bg-[#f9fafb] relative overflow-hidden flex flex-col items-center justify-center mb-6 shrink-0">
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
              <button
                onClick={handleCancelFile}
                disabled={isSubmitting}
                className="absolute top-3 right-3 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white text-[12px] font-bold shadow-lg"
              >
                다시 찍기
              </button>
            </>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#b0b8c1] active:bg-[#f2f4f6] transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#8b95a1]">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-[14px] font-bold">카메라 켜기 / 사진첩 읽기</span>
            </button>
          )}
          {/* 모바일 브라우저의 경우 accept="image/*"이면 사진앨범 & 카메라 옵션이 모두 뜹니다 */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 rounded-2xl bg-[#3182f6] text-white font-bold text-[16px] shadow-lg shadow-[#3182f6]/30 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-70 disabled:scale-100"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                기록 저장 중...
              </span>
            ) : (
              selectedFile ? '기록 완료하기' : '사진 앨범 열기'
            )}
          </button>

          {/* 사진 없이 건너뛰기 기능 */}
          {!selectedFile && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl text-[#8b95a1] font-bold text-[15px] active:bg-[#f2f4f6]"
            >
              텍스트 기록만 저장할래요
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
