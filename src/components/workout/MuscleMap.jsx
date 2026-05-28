import React, { useState, useMemo } from 'react';
import Model from 'react-body-highlighter';
import { FlipHorizontal } from 'lucide-react';

// LoGym 근육 명칭(한글/영문)을 react-body-highlighter 표준 명칭으로 매핑하는 유틸리티
const mapToStandardMuscles = (targets) => {
  const mapped = [];
  targets.forEach(t => {
    const term = t.toLowerCase();
    // 가슴
    if (term.includes('가슴') || term.includes('chest')) mapped.push('chest');
    
    // 등
    if (term.includes('등') || term.includes('back')) mapped.push('upper-back', 'lower-back', 'trapezius');
    if (term.includes('광배') || term.includes('lats')) mapped.push('upper-back');
    if (term.includes('승모') || term.includes('traps')) mapped.push('trapezius');
    if (term.includes('기립근')) mapped.push('lower-back');
    
    // 어깨
    if (term.includes('어깨') || term.includes('shoulder')) mapped.push('front-deltoids', 'back-deltoids');
    if (term.includes('전면삼각')) mapped.push('front-deltoids');
    if (term.includes('후면삼각')) mapped.push('back-deltoids');
    if (term.includes('측면삼각')) mapped.push('front-deltoids', 'back-deltoids');
    
    // 하체
    if (term.includes('하체') || term.includes('legs')) mapped.push('quadriceps', 'hamstring', 'calves', 'gluteal');
    if (term.includes('대퇴사두') || term.includes('quad')) mapped.push('quadriceps');
    if (term.includes('햄스트링') || term.includes('대퇴이두')) mapped.push('hamstring');
    if (term.includes('종아리') || term.includes('calv')) mapped.push('calves');
    if (term.includes('둔근') || term.includes('엉덩이') || term.includes('glute')) mapped.push('gluteal');
    
    // 팔
    if (term.includes('이두') || term.includes('bicep')) mapped.push('biceps');
    if (term.includes('삼두') || term.includes('tricep')) mapped.push('triceps');
    if (term.includes('전완') || term.includes('forearm')) mapped.push('forearm');
    
    // 코어
    if (term.includes('복근') || term.includes('abs') || term.includes('코어')) mapped.push('abs', 'obliques');
  });
  return [...new Set(mapped)]; // 중복 제거
};

export default function MuscleMap({ heatmapData = [] }) {
  const [viewType, setViewType] = useState('anterior'); // 'anterior' (앞) | 'posterior' (뒤)

  const toggleView = () => {
    setViewType(prev => prev === 'anterior' ? 'posterior' : 'anterior');
  };

  // highlightedColors는 data 배열의 순서대로 매핑됨
  const colors = heatmapData.length > 0 ? heatmapData.map(d => d.color) : ['#f04452'];

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4 border border-[#e5e8eb]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[16px] text-[#191f28]" style={{ fontWeight: 700 }}>자극 타겟 히트맵</h3>
          <p className="text-[13px] text-[#8b95a1] mt-1">타겟 근육 부위가 활성화됩니다.</p>
        </div>
        <button 
          onClick={toggleView}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#f2f4f6] text-[#4e5968] rounded-[10px] hover:bg-[#e5e8eb] transition-colors text-[13px] font-medium"
        >
          <FlipHorizontal size={14} />
          {viewType === 'anterior' ? '뒷면 보기' : '앞면 보기'}
        </button>
      </div>
      
      <div className="relative w-full flex justify-center items-center py-2 min-h-[160px]">
        {heatmapData.length > 0 ? (
          <Model
            type={viewType}
            data={heatmapData}
            style={{ width: '11rem' }}
            highlightedColors={colors}
            bodyColor="#e5e8eb" // 비활성 근육 색상
          />
        ) : (
          <Model
            type={viewType}
            data={[]}
            style={{ width: '11rem', opacity: 0.5 }}
            bodyColor="#e5e8eb"
          />
        )}
      </div>
    </div>
  );
}
