/**
 * 1. 대분류별 세부 타겟 옵션 (토글 UI용)
 * 옵션이 2개 이상인 경우에만 화면에 토글 버튼이 노출됨
 */
export const TARGET_OPTIONS = {
  '등': [
    { id: 'upper-back', label: '상부/광배' },
    { id: 'lower-back', label: '중하부/기립근' },
    { id: 'trapezius', label: '승모근' }
  ],
  '어깨': [
    { id: 'front-deltoids', label: '전·측면' },
    { id: 'back-deltoids', label: '후면' }
  ],
  '하체': [
    { id: 'quadriceps', label: '대퇴사두(앞)' },
    { id: 'hamstring', label: '햄스트링(뒤)' },
    { id: 'gluteal', label: '둔근(엉덩이)' }
  ],
  // 가슴, 이두, 삼두, 복근 등은 단일 부위로 취급하여 토글 생략
};

/**
 * 2. 각 세부 타겟(또는 단일 대분류)별 근육 기여도 가중치
 * 1.0 = 주동근, 0.5 = 협동근, 0.3 = 보조근
 */
export const EXERCISE_MUSCLE_MAP = {
  // 등 세부
  'upper-back': [{ muscle: 'upper-back', weight: 1.0 }, { muscle: 'biceps', weight: 0.5 }, { muscle: 'trapezius', weight: 0.5 }],
  'lower-back': [{ muscle: 'lower-back', weight: 1.0 }, { muscle: 'gluteal', weight: 0.3 }],
  'trapezius': [{ muscle: 'trapezius', weight: 1.0 }, { muscle: 'upper-back', weight: 0.3 }],
  
  // 어깨 세부
  'front-deltoids': [{ muscle: 'front-deltoids', weight: 1.0 }, { muscle: 'triceps', weight: 0.3 }],
  'back-deltoids': [{ muscle: 'back-deltoids', weight: 1.0 }, { muscle: 'upper-back', weight: 0.3 }],
  
  // 하체 세부
  'quadriceps': [{ muscle: 'quadriceps', weight: 1.0 }, { muscle: 'gluteal', weight: 0.5 }, { muscle: 'calves', weight: 0.3 }],
  'hamstring': [{ muscle: 'hamstring', weight: 1.0 }, { muscle: 'gluteal', weight: 0.5 }],
  'gluteal': [{ muscle: 'gluteal', weight: 1.0 }, { muscle: 'hamstring', weight: 0.3 }, { muscle: 'quadriceps', weight: 0.3 }],
  
  // 단일 부위 (토글 없는 항목들)
  '가슴': [{ muscle: 'chest', weight: 1.0 }, { muscle: 'front-deltoids', weight: 0.3 }, { muscle: 'triceps', weight: 0.5 }],
  '이두': [{ muscle: 'biceps', weight: 1.0 }, { muscle: 'forearm', weight: 0.5 }],
  '삼두': [{ muscle: 'triceps', weight: 1.0 }, { muscle: 'forearm', weight: 0.3 }],
  '복근': [{ muscle: 'abs', weight: 1.0 }, { muscle: 'obliques', weight: 0.5 }],
  
  // 예외 처리 (기존 데이터 호환성을 위함)
  '팔': [{ muscle: 'biceps', weight: 0.5 }, { muscle: 'triceps', weight: 0.5 }, { muscle: 'forearm', weight: 0.3 }],
};
