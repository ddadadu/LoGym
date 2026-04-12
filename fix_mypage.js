const fs = require('fs');
const path = './src/components/community/CommunityMyPageTab.jsx';

let content = fs.readFileSync(path, 'utf8');

// 1. 레이아웃 수정
content = content.replace(
  '<div key={idx} className="bg-white rounded-xl p-2.5 border border-[#e5e8eb]/70 shadow-sm">',
  '<div key={idx} className="bg-white rounded-xl p-3 border border-[#e5e8eb]/70 shadow-sm flex flex-col gap-2">'
);

content = content.replace(
  '<p className="text-[13px] font-extrabold text-[#191f28] mb-1.5 flex items-center gap-1.5">',
  '<p className="text-[14px] font-extrabold text-[#191f28] flex items-center gap-1.5 leading-none">'
);

content = content.replace(
  '<Dumbbell className="w-3.5 h-3.5 text-[#8b95a1]" />',
  '<Dumbbell className="w-4 h-4 text-[#8b95a1]" />'
);

content = content.replace(
  '<div className="flex flex-wrap gap-1.5">',
  '<div className="flex flex-wrap items-center gap-1.5">'
);

content = content.replace(
  '<span key={sIdx} className="text-[11px] bg-[#f2f4f6] text-[#4e5968] px-2 py-1 rounded-md font-bold">',
  '<span key={sIdx} className="text-[12px] bg-[#f2f4f6] text-[#4e5968] px-2 py-1 rounded-md font-bold leading-none flex items-center h-6">'
);

content = content.replace(
  '{s.set}세트 {s.weight > 0 ? `· ${s.weight}kg` : \'\'} · {s.reps}회',
  '{s.setIdx || s.set || (sIdx + 1)}세트 {s.weight > 0 ? `· ${s.weight}kg` : \'\'} · {s.reps}회'
);

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed layout in MyPageTab.");
