import { useState, useRef } from 'react';
import { Camera, ImagePlus, X, Flame } from 'lucide-react';

export default function WorkoutFinishModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

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
    // 부모의 DB 저장 함수 호출 (선택된 파일을 넘김)
    onSubmit(selectedFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* 백그라운드 터치 시 닫기 (업로드 중엔 막음) */}
      <div className="absolute inset-0" onClick={() => !isSubmitting && onClose()} />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl pb-10 
        animate-in slide-in-from-bottom-full duration-300"
      >
        <button 
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 bg-[#f2f4f6] rounded-full text-[#8b95a1] active:scale-95 transition-transform disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mt-2 mb-6">
          <div className="w-16 h-16 bg-[#fff0f0] rounded-full flex items-center justify-center mx-auto mb-3">
            <Flame className="w-8 h-8 text-[#f04452]" />
          </div>
          <h2 className="text-[22px] font-extrabold text-[#191f28]">오운완 인증📸</h2>
          <p className="mt-1 text-[13px] font-medium text-[#8b95a1]">
            오늘의 땀방울을 사진으로 남겨보세요!
          </p>
        </div>

        {/* 이미지 업로더 영역 */}
        <div className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[#e5e8eb] bg-[#f9fafb] relative overflow-hidden flex flex-col items-center justify-center mb-6">
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
              selectedFile ? '사진과 함께 기록 완료' : '사진 앨범 열기'
            )}
          </button>
          
          {/* 사진 없이 건너뛰기 기능 */}
          {!selectedFile && (
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl text-[#8b95a1] font-bold text-[15px] active:bg-[#f2f4f6]"
            >
              사진 없이 텍스트만 저장할래요
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
