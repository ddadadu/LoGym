import { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';

export default function GoalSettingModal({ isOpen, onClose, initialDaily, initialWeekly, initialWeeklyCount, onSave, isSubmitting }) {
  const [daily, setDaily] = useState(60);
  const [weekly, setWeekly] = useState(200);
  const [weeklyCount, setWeeklyCount] = useState(5);

  useEffect(() => {
    if (isOpen) {
      setDaily(initialDaily || 60);
      setWeekly(initialWeekly || 200);
      setWeeklyCount(initialWeeklyCount || 5);
    }
  }, [isOpen, initialDaily, initialWeekly, initialWeeklyCount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
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
          <div className="w-16 h-16 bg-[#ebf4ff] rounded-full flex items-center justify-center mx-auto mb-3">
            <Target className="w-8 h-8 text-[#3182f6]" />
          </div>
          <h2 className="text-[22px] font-extrabold text-[#191f28]">목표 설정</h2>
          <p className="mt-1 text-[13px] font-medium text-[#8b95a1]">
            나에게 맞는 일일/주간 운동 목표를 설정해 보세요.
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="bg-[#f9fafb] p-4 rounded-2xl border border-[#e5e8eb]">
            <label className="text-[13px] font-bold text-[#8b95a1] mb-2 block">일일 목표 운동 시간</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={daily}
                onChange={e => setDaily(Number(e.target.value))}
                className="w-full bg-white border border-[#e5e8eb] p-3 rounded-xl text-[18px] font-extrabold text-[#191f28] outline-none focus:border-[#3182f6]"
              />
              <span className="text-[#8b95a1] font-bold shrink-0">분</span>
            </div>
          </div>

          <div className="bg-[#f9fafb] p-4 rounded-2xl border border-[#e5e8eb]">
            <label className="text-[13px] font-bold text-[#8b95a1] mb-2 block">주간 목표 총 운동 시간</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={weekly}
                onChange={e => setWeekly(Number(e.target.value))}
                className="w-full bg-white border border-[#e5e8eb] p-3 rounded-xl text-[18px] font-extrabold text-[#191f28] outline-none focus:border-[#3182f6]"
              />
              <span className="text-[#8b95a1] font-bold shrink-0">분</span>
            </div>
            <p className="text-[11px] text-[#b0b8c1] mt-2">월~일 한 주 동안 총 몇 분을 운동할지 설정하세요.</p>
          </div>

          <div className="bg-[#f9fafb] p-4 rounded-2xl border border-[#e5e8eb]">
            <label className="text-[13px] font-bold text-[#8b95a1] mb-2 block">주간 목표 운동 횟수</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={weeklyCount}
                onChange={e => setWeeklyCount(Number(e.target.value))}
                className="w-full bg-white border border-[#e5e8eb] p-3 rounded-xl text-[18px] font-extrabold text-[#191f28] outline-none focus:border-[#3182f6]"
              />
              <span className="text-[#8b95a1] font-bold shrink-0">회</span>
            </div>
            <p className="text-[11px] text-[#b0b8c1] mt-2">이번 주에 몇 번 운동할지 목표를 설정하세요.</p>
          </div>
        </div>

        <button
          onClick={() => onSave(daily, weekly, weeklyCount)}
          disabled={isSubmitting}
          className="w-full h-14 rounded-2xl bg-[#3182f6] text-white font-bold text-[16px] shadow-lg shadow-[#3182f6]/30 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-70"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              저장 중...
            </span>
          ) : (
            '목표 저장하기'
          )}
        </button>
      </div>
    </div>
  );
}
