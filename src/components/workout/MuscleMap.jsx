import React from 'react';

// 향후 SVG 인체 모델(전/후면)과 각 부위별 Path가 적용될 플레이스홀더입니다.
export default function MuscleMap({ targetMuscles = [] }) {
  // targetMuscles 예: ['chest', 'front-delt']
  
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4 flex flex-col items-center justify-center min-h-[200px] border border-[#e5e8eb]">
      <div className="text-center mb-3">
        <h3 className="text-[16px] text-[#191f28]" style={{ fontWeight: 700 }}>자극 타겟 부위</h3>
        <p className="text-[13px] text-[#8b95a1] mt-1">곧 3D/SVG 인체 모델이 추가될 예정입니다.</p>
      </div>
      
      {/* 임시 SVG 플레이스홀더 */}
      <div className="relative w-[120px] h-[120px] bg-[#f2f4f6] rounded-full flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#b0b8c1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="3" />
          <line x1="12" y1="22" x2="12" y2="8" />
          <path d="M5 12H2a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4h-3" />
          <line x1="9" y1="22" x2="15" y2="22" />
        </svg>
      </div>
      
      {targetMuscles.length > 0 && (
        <div className="flex gap-2 mt-4">
          {targetMuscles.map(m => (
            <span key={m} className="text-[12px] bg-[#ffecf2] text-[#f04452] px-2.5 py-1 rounded-full font-bold">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
