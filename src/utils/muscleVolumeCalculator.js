import { EXERCISE_MUSCLE_MAP } from '../constants/exerciseMuscleMap';

/**
 * activeExercises 배열을 받아 근육별 가중치 적용 볼륨 합산
 * @param {Array} activeExercises - 현재 세션 운동 목록
 * @returns {Object} { 'chest': 3000, 'triceps': 1500, ... }
 */
export function calcSessionMuscleVolume(activeExercises) {
  const volumeMap = {};

  activeExercises.forEach(ex => {
    // 사용자가 선택한 커스텀 타겟(customTarget)이 있으면 우선 사용, 없으면 sub_category 사용
    const targetKey = ex.customTarget || ex.sub_category;
    const muscleContributions = EXERCISE_MUSCLE_MAP[targetKey] || [
      { muscle: targetKey, weight: 1.0 }  // 매핑 없으면 해당 부위에 100% 기여
    ];

    const exVolume = ex.sets.reduce((acc, s) => {
      if (!s.done) return acc;  // 완료(체크) 처리된 세트만 집계
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps) || 0;
      return acc + (w * r);
    }, 0);

    muscleContributions.forEach(({ muscle, weight }) => {
      volumeMap[muscle] = (volumeMap[muscle] || 0) + (exVolume * weight);
    });
  });

  return volumeMap;
}
