const COLOR_STAGES = [
  { threshold: 0.30, color: '#fde68a' },  // 0~30%: 연노랑
  { threshold: 0.60, color: '#fb923c' },  // 31~60%: 주황
  { threshold: 0.80, color: '#ef4444' },  // 61~80%: 빨강
  { threshold: Infinity, color: '#991b1b' }, // 81~+: 진한 빨강
];

/**
 * 근육별 세션 볼륨과 최대 볼륨을 받아 react-body-highlighter용 data 배열 생성
 * @param {Object} sessionVolume   - { 'chest': 2500, ... }
 * @param {Object} maxVolumeMap    - { 'chest': 5000, ... } (DB에서 로드)
 * @returns {Object} { data: Array, coldStartMuscles: Array }
 */
export function buildHeatmapData(sessionVolume, maxVolumeMap) {
  const stageGroups = {
    '#fde68a': [], '#fb923c': [], '#ef4444': [], '#991b1b': []
  };
  const coldStartMuscles = [];  // 최대 볼륨 데이터가 없는 근육

  Object.entries(sessionVolume).forEach(([muscle, vol]) => {
    // vol이 0이면 무시
    if (vol <= 0) return;

    const maxVol = maxVolumeMap[muscle];

    // DB에 최대 볼륨 기록이 없거나 0인 경우 (Cold Start)
    if (!maxVol || maxVol <= 0) {
      coldStartMuscles.push(muscle);
      return;
    }

    const pct = vol / maxVol;
    const stage = COLOR_STAGES.find(s => pct <= s.threshold);
    if (stage) {
      stageGroups[stage.color].push(muscle);
    }
  });

  const data = Object.entries(stageGroups)
    .filter(([, muscles]) => muscles.length > 0)
    .map(([color, muscles]) => ({ name: color, muscles, color }));

  // Cold Start 근육은 회색 고정 (기본 bodyColor로 처리되므로 data에 미포함)
  return { data, coldStartMuscles };
}
