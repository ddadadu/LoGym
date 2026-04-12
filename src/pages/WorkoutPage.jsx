import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ko } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Pause, Square, Plus, Dumbbell, Trash2, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import PullToRefreshWrapper from '../components/PullToRefreshWrapper';
import useStopwatch from '../hooks/useStopwatch';
import WorkoutExerciseSelectModal from './workout/WorkoutExerciseSelectModal';
import WorkoutFinishModal from './workout/WorkoutFinishModal';
import MuscleMap from '../components/workout/MuscleMap';
import { supabase } from '../supabaseClient';
import { useLocation } from 'react-router-dom';

export default function WorkoutPage() {
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);
  
  // 캘린더 데이터용
  const [attendedDays, setAttendedDays] = useState([]);
  const [selectedWorkoutDetail, setSelectedWorkoutDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
  // 스톱워치 훅 연동
  const { elapsedTime, formattedTime, isRunning, start, pause, reset } = useStopwatch();
  
  // 운동 상태
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [activeExercises, setActiveExercises] = useState([]); 
  // 구조: [{ id, name, isCustom, category, sets: [{ setIdx: 1, weight: '', reps: '', done: false }] }]
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 임시 차트용 데이터
  const weightData = [
    { date: '1주차', weight: 75.2 }, { date: '2주차', weight: 74.8 },
    { date: '3주차', weight: 74.5 }, { date: '4주차', weight: 74.0 }
  ];

  const fetchAttendance = async (user) => {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('date')
        .eq('user_id', user.id);
      if (error) throw error;
      
      // 타임존 보정: yyyy-mm-dd 문자열을 딱 맞는 날짜 객체로 변환
      const dates = data.map(log => {
        const [y, m, d] = log.date.split('-');
        return new Date(y, m - 1, d);
      });
      setAttendedDays(dates);
    } catch (err) {
      console.error("Attendence fetch error", err);
    }
  };

  const fetchWorkoutDetail = async (dateObj, user) => {
    setIsDetailLoading(true);
    setSelectedWorkoutDetail(null);
    try {
      // 로컬 타임존 완벽 보정 (yyyy-mm-dd)
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const targetDate = `${y}-${m}-${d}`;

      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout_log_items (
            order_index,
            sets,
            equipments ( name, category, sub_category ),
            user_custom_exercises ( name, category )
          )
        `)
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // 가장 최근(혹은 유일한) 레코드
      if (data && data.length > 0) {
        setSelectedWorkoutDetail(data[0]);
      }
    } catch(err) {
      console.error("Detail fetch error", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchAttendance(user);
        fetchWorkoutDetail(selectedDate, user); // 최초 로드 시 오늘 날짜 상세
      }
    });
  }, []);

  // 달력 클릭 시 날짜 변경 및 해당일 상세 조회
  const handleDateSelect = (newDate) => {
    if (!newDate) return;
    setSelectedDate(newDate);
    if (currentUser) fetchWorkoutDetail(newDate, currentUser);
  };

  // 로컬스토리지에 스톱워치가 돌고있었다면 (백그라운드 복귀 시) 자동 활성화
  useEffect(() => {
    if (elapsedTime > 0) {
      setIsWorkoutActive(true);
    } else if (location.state?.autoStart && !isWorkoutActive) {
      // HomePage에서 '오늘 운동 시작하기'로 진입 시 자동 타이머 시작
      handleStartWorkout();
    }
  }, [elapsedTime, location.state]);

  // --- 운동 핸들러 ---
  const handleStartWorkout = () => {
    setIsWorkoutActive(true);
    start();
  };

  const handleAddExercises = (selectedItems) => {
    const newEx = selectedItems
      .filter(newItem => !activeExercises.some(ex => ex.id === newItem.id)) // 중복 추가 방지
      .map(item => ({
        ...item,
        sets: [{ setIdx: 1, weight: '', reps: '', done: false }]
      }));
    setActiveExercises(prev => [...prev, ...newEx]);
  };

  const handleAddSet = (exIndex) => {
    setActiveExercises(prev => prev.map((ex, i) => {
      if (i === exIndex) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { 
            setIdx: ex.sets.length + 1, 
            weight: lastSet ? lastSet.weight : '', // 이전 세트 무게 복사
            reps: lastSet ? lastSet.reps : '',     // 이전 세트 횟수 복사
            done: false 
          }]
        };
      }
      return ex;
    }));
  };

  const handleUpdateSet = (exIndex, setIndex, field, value) => {
    setActiveExercises(prev => prev.map((ex, i) => {
      if (i === exIndex) {
        const newSets = ex.sets.map((s, si) => si === setIndex ? { ...s, [field]: value } : s);
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };
  
  const handleRemoveSet = (exIndex, setIndex) => {
    setActiveExercises(prev => prev.map((ex, i) => {
      if (i === exIndex) {
        const newSets = ex.sets.filter((_, si) => si !== setIndex).map((s, idx) => ({ ...s, setIdx: idx + 1 }));
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  const handleRemoveExercise = (exIndex) => {
    if (window.confirm('이 종목을 삭제하시겠습니까?')) {
      setActiveExercises(prev => prev.filter((_, i) => i !== exIndex));
    }
  };

  // --- 통합 기록 완료 처리 (팝업 띄우기) ---
  const handleFinishWorkout = async () => {
    if (activeExercises.length === 0) {
      if (window.confirm('추가된 운동이 없습니다. 이대로 기록을 남기지 않고 운동을 취소/종료할까요?')) {
        pause();
        reset();
        setIsWorkoutActive(false);
      }
      return;
    }
    
    // 수행 완료되지 않은(체크안된) 세트가 있으면 경고 안내
    const hasUndoneSets = activeExercises.some(ex => ex.sets.some(s => !s.done));
    if (hasUndoneSets) {
      const proceed = window.confirm('아직 완료 체크되지 않은 세트가 있습니다. 그래도 운동을 마칠까요?');
      if (!proceed) return;
    }
    
    pause();
    setIsFinishModalOpen(true);
  };

  // --- 실제 DB 제출 로직 (업로드 포함) ---
  const submitWorkout = async (photoFile) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("유저 정보를 찾을 수 없습니다.");
      
      const { data: userData } = await supabase.from('users').select('home_gym_id').eq('id', user.id).single();
      
      let uploadedPhotoUrl = null;

      // 1. 사진이 있다면 Cloudinary 에 먼저 업로드
      if (photoFile) {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        
        if (!cloudName || !uploadPreset) {
          throw new Error("🚨 .env.local에 VITE_CLOUDINARY_CLOUD_NAME 과 VITE_CLOUDINARY_UPLOAD_PRESET 설정이 누락되었습니다!");
        }

        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('upload_preset', uploadPreset);

        // 기본 unsigend upload API 엔드포인트
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });
        const clData = await res.json();
        
        if (clData.error) throw new Error("이미지 업로드 실패: " + clData.error.message);
        uploadedPhotoUrl = clData.secure_url; // https URL
      }

      // 일지 저장 시 확실한 날짜(한국 로컬 시간 보정) 주입
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      
      // 2. workout_logs 생성
      const { data: logData, error: logError } = await supabase
        .from('workout_logs')
        .insert({
          user_id: user.id,
          gym_id: userData?.home_gym_id || null,
          date: `${y}-${m}-${d}`,
          duration_seconds: elapsedTime,
          photo_url: uploadedPhotoUrl
        })
        .select()
        .single();
        
      if (logError) throw logError;

      // 3. 종목마다 세트 데이터를 workout_log_items 에 bulk insert
      const itemsPayload = activeExercises.map((ex, idx) => {
        const isCustom = ex.isCustom;
        return {
          workout_log_id: logData.id,
          equipment_id: isCustom ? null : ex.id,
          custom_exercise_id: isCustom ? ex.id : null,
          order_index: idx + 1,
          sets: ex.sets // JSONB 그대로 저장
        };
      });

      const { error: itemsError } = await supabase.from('workout_log_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      alert('오운완 성공! 🎉 메인 뷰/달력 업데이트는 다음 작업에서 적용됩니다.');
      
      setIsFinishModalOpen(false);
      reset(); 
      setIsWorkoutActive(false);
      setActiveExercises([]);
      
      // 방금 끝난 운동 즉각 반영
      fetchAttendance(currentUser);
      fetchWorkoutDetail(new Date(), currentUser);
    } catch (err) {
      console.error("Save Error:", err);
      alert(`기록 저장 중 오류 발생 🚨\n에러 내용: ${err.message || JSON.stringify(err)}\n(콘솔 로그도 확인해주세요)`);
      if (!isWorkoutActive) start(); // 팝업 닫고 타이머 원복
      setIsFinishModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PullToRefreshWrapper onRefresh={async () => { /* 패치 로직 */ }}>
      <div className="flex h-full flex-col bg-[#f7f8fa] overflow-x-hidden min-h-screen pb-20">
        
        {/* 상단 통합 스톱워치 / 헤더 */}
        <div className="sticky top-0 z-30 bg-white shadow-sm px-5 py-3 border-b border-[#e5e8eb] flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-extrabold tracking-tight text-[#191f28]">
              {isWorkoutActive ? '진행 중인 운동 🔥' : '운동상황 📊'}
            </h2>
            {!isWorkoutActive && <p className="text-[13px] font-medium text-[#8b95a1] mt-0.5">나의 노력과 변화를 확인하세요</p>}
          </div>
          
          {isWorkoutActive && (
            <div className="flex items-center gap-2">
              <div className="text-[22px] font-mono font-bold tracking-tight text-[#191f28] mr-1">
                {formattedTime}
              </div>
              {/* 일시정지/재개 버튼 */}
              <button 
                onClick={isRunning ? pause : start}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${isRunning ? 'bg-[#fef2f2] text-[#f04452]' : 'bg-[#e8f3ff] text-[#3182f6]'}`}
              >
                {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              {/* 종료(중지) 버튼 */}
              <button 
                onClick={handleFinishWorkout}
                disabled={isSubmitting}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${activeExercises.length > 0 ? 'bg-[#191f28] text-white' : 'bg-[#e5e8eb] text-[#8b95a1]'}`}
              >
                {isSubmitting ? (
                  <span className="animate-spin w-4 h-4 rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Square className="w-4 h-4 fill-current" />
                )}
              </button>
            </div>
          )}
        </div>

        {isWorkoutActive ? (
          // =======================
          // 라이브 운동 진행 모드 UI
          // =======================
          <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
            
            {/* 근육 자극 맵 (신규) */}
            <MuscleMap targetMuscles={activeExercises.map(ex => ex.category).filter((v, i, a) => a.indexOf(v) === i)} />

            <div className="space-y-4">
              {activeExercises.map((ex, exIdx) => (
                <div key={ex.id} className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e5e8eb] overflow-hidden">
                  {/* 종목별 헤더 */}
                  <div className="px-4 py-3 border-b border-[#f2f4f6] flex justify-between items-center bg-[#f9fafb]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#191f28] flex items-center justify-center">
                         <span className="text-white font-bold text-sm">{exIdx + 1}</span>
                      </div>
                      <div>
                        <h4 className="text-[16px] font-bold text-[#191f28]">{ex.name}</h4>
                        <span className="text-[11px] text-[#8b95a1] font-medium">{ex.category} · {ex.sub_category}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveExercise(exIdx)} className="p-2 -mr-2 text-[#8b95a1] hover:text-[#f04452]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 세트 테이블 */}
                  <div className="px-4 pt-2 pb-4">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[12px] font-bold text-[#8b95a1] border-b border-[#f2f4f6]">
                          <th className="py-2.5 w-12 text-center">세트</th>
                          <th className="py-2.5 px-2">kg</th>
                          <th className="py-2.5 px-2">회</th>
                          <th className="py-2.5 w-16 text-center">완료</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ex.sets.map((setObj, setIdx) => (
                          <tr key={setIdx} className={`border-b border-[#f2f4f6] transition-colors ${setObj.done ? 'bg-[#f3fae8]' : ''}`}>
                            <td className="py-2">
                              <button onClick={() => setObj.done || handleRemoveSet(exIdx, setIdx)} className="w-8 h-8 mx-auto rounded-full bg-[#f2f4f6] text-[13px] font-bold text-[#4e5968] flex items-center justify-center hover:bg-[#ffebed] hover:text-[#f04452] transition-colors">
                                {setObj.setIdx}
                              </button>
                            </td>
                            <td className="py-2 px-1">
                              <input 
                                type="number" 
                                disabled={setObj.done}
                                value={setObj.weight} 
                                onChange={(e) => handleUpdateSet(exIdx, setIdx, 'weight', e.target.value)}
                                className="w-full text-center h-9 bg-[#f2f4f6] rounded-lg text-[15px] font-bold text-[#191f28] outline-none focus:ring-2 focus:ring-[#3182f6] disabled:opacity-50"
                                placeholder="0"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input 
                                type="number" 
                                disabled={setObj.done}
                                value={setObj.reps} 
                                onChange={(e) => handleUpdateSet(exIdx, setIdx, 'reps', e.target.value)}
                                className="w-full text-center h-9 bg-[#f2f4f6] rounded-lg text-[15px] font-bold text-[#191f28] outline-none focus:ring-2 focus:ring-[#3182f6] disabled:opacity-50"
                                placeholder="0"
                              />
                            </td>
                            <td className="py-2 text-center">
                              <button 
                                onClick={() => handleUpdateSet(exIdx, setIdx, 'done', !setObj.done)}
                                className={`w-10 h-9 mx-auto rounded-lg flex items-center justify-center transition-colors shadow-sm ${setObj.done ? 'bg-[#00c471] text-white' : 'bg-[#e5e8eb] text-[#8b95a1]'}`}
                              >
                                <Check className="w-5 h-5" strokeWidth={3}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <button 
                      onClick={() => handleAddSet(exIdx)}
                      className="w-full mt-3 h-10 rounded-xl border-2 border-dashed border-[#e5e8eb] flex items-center justify-center gap-1.5 text-[14px] font-bold text-[#8b95a1] hover:bg-[#f9fafb] active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4"/> 세트 추가
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 텅 빈 상태 */}
            {activeExercises.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-[#8b95a1] bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-dashed border-[#d1d6db]">
                <Dumbbell className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-[15px] font-bold text-[#4e5968] mb-1">아직 추가된 운동이 없습니다</p>
                <p className="text-[13px]">아래 버튼을 눌러 운동을 시작하세요.</p>
              </div>
            )}

            {/* 하단 플로팅 액션 버트들 */}
            <div className="flex gap-3 pt-6 pb-4">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full h-14 rounded-2xl bg-[#e8f3ff] text-[#3182f6] font-bold text-[16px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Plus className="w-5 h-5" />
                운동 종목 추가하기
              </button>
            </div>

          </div>
        ) : (
          // =======================
          // 휴식/기본 모드 UI
          // =======================
          <div className="p-4 space-y-6">
            
            <button 
              onClick={handleStartWorkout}
              className="w-full h-16 rounded-2xl bg-[#3182f6] text-white font-bold text-[18px] flex items-center justify-center gap-2 shadow-lg shadow-[#3182f6]/30 active:scale-95 transition-all"
            >
              <Play className="w-6 h-6 fill-current" />
              오늘의 운동 시작하기
            </button>

            {/* 캘린더 (출석) */}
            <div className="rounded-[24px] border border-[#e5e8eb] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col items-center">
              <h3 className="w-full text-left text-lg font-bold text-[#191f28] mb-2 pl-2">출석 달력</h3>
              <style>{`
                .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #3182f6; --rdp-background-color: #e8f3ff; margin: 0; }
                .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #3182f6; color: white; }
              `}</style>
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={ko}
                modifiers={{ attended: attendedDays }}
                modifiersStyles={{
                  attended: { fontWeight: 'bold', backgroundColor: '#e8f3ff', color: '#3182f6', borderRadius: '100%' }
                }}
              />
            </div>
            
            {/* 선택된 날짜의 운동 브리핑 카드 */}
            <div className="rounded-[24px] border border-[#e5e8eb] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <h3 className="text-lg font-bold text-[#191f28] mb-4">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일의 운동
              </h3>
              
              {isDetailLoading ? (
                <div className="py-10 text-center animate-pulse text-[#8b95a1] text-sm font-bold">기록을 불러오는 중...</div>
              ) : selectedWorkoutDetail ? (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex gap-4 items-center">
                    {/* 사진 영역 */}
                    <div className="w-24 h-24 shrink-0 rounded-2xl bg-[#f2f4f6] overflow-hidden border border-[#e5e8eb]">
                      {selectedWorkoutDetail.photo_url ? (
                        <img src={selectedWorkoutDetail.photo_url} alt="인증샷" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#d1d6db]"><Dumbbell className="w-8 h-8" /></div>
                      )}
                    </div>
                    {/* 요약 텍스트 */}
                    <div className="flex flex-col justify-center">
                      <div className="text-[13px] font-bold text-[#3182f6] bg-[#e8f3ff] px-2 py-1 rounded-lg self-start mb-2">
                        ⏱️ {Math.floor(selectedWorkoutDetail.duration_seconds / 60)}분 {selectedWorkoutDetail.duration_seconds % 60}초
                      </div>
                      <p className="text-[15px] font-extrabold text-[#191f28]">총 {selectedWorkoutDetail.workout_log_items?.length || 0}종목 진행</p>
                    </div>
                  </div>
                  
                  {/* 종목별 간략 히스토리 리스트 */}
                  <div className="mt-2 space-y-2">
                    {selectedWorkoutDetail.workout_log_items?.map((item, idx) => {
                      const exName = item.equipments?.name || item.user_custom_exercises?.name || '커스텀 종목';
                      const setTotal = item.sets?.length || 0;
                      // JSONB 배열에서 최대 무게와 반복 합산
                      let maxWeight = 0, totalReps = 0;
                      if (Array.isArray(item.sets)) {
                        item.sets.forEach(s => {
                          if (s.done) {
                            if (parseFloat(s.weight) > maxWeight) maxWeight = parseFloat(s.weight);
                            totalReps += parseInt(s.reps || 0);
                          }
                        });
                      }
                      
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-[#f9fafb] border border-[#f2f4f6]">
                          <div>
                            <p className="text-[14px] font-bold text-[#191f28]">{exName}</p>
                            <p className="text-[12px] font-medium text-[#8b95a1]">{setTotal}세트 · 총 {totalReps}회</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-[#b0b8c1]">MAX</span>
                            <p className="text-[15px] font-extrabold text-[#3182f6]">{maxWeight}kg</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center flex flex-col items-center justify-center text-[#8b95a1]">
                  <Dumbbell className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm font-bold text-[#4e5968]">운동 기록이 없습니다</p>
                  <p className="text-xs mt-1">이날은 푹 쉬었거나 아직 기록하지 않았군요!</p>
                </div>
              )}
            </div>

            {/* 체중 변화 그래프 */}
            <div className="rounded-[24px] border border-[#e5e8eb] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-bold text-[#191f28] mb-4">최근 체중 변화</h3>
              <div className="h-48 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e8eb" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#8b95a1'}} dy={10} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{fill: '#8b95a1'}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="weight" stroke="#3182f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        
        {/* 종목 선택 바텀시트 모달 (Z-index 처리) */}
        <WorkoutExerciseSelectModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSelectComplete={handleAddExercises} 
        />
        
      </div>
      <WorkoutFinishModal 
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        onSubmit={submitWorkout}
        isSubmitting={isSubmitting}
      />
    </PullToRefreshWrapper>
  );
}
