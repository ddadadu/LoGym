import { Flame, Target, Trophy, CalendarDays, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import PullToRefreshWrapper from '../components/PullToRefreshWrapper'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function HomePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // 기존의 Mock 데이터 (향후 주간/월간 등도 DB 연동 예정)
  const [dashboardData, setDashboardData] = useState({
    todayCompleted: false,
    weeklyGoal: 4,
    weeklyCurrent: 2,
    currentStreak: 5,
    thisMonthCount: 12,
  });

  // DB에서 최근 3일 치 조회
  const fetchRecentLogs = async (user) => {
    try {
      setIsLoading(true);
      
      const today = new Date();
      // 시간대를 로컬(한국시간) 기준으로 yyyy-mm-dd 파싱
      const formatDate = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
      };
      
      const todayStr = formatDate(today);
      const threeDaysAgoStr = formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000));

      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout_log_items (
            equipment_id,
            custom_exercise_id,
            equipments ( name ),
            user_custom_exercises ( name )
          )
        `)
        .eq('user_id', user.id)
        .gte('date', threeDaysAgoStr)
        .lte('date', todayStr)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // 3일치 기본 틀 생성 (어제, 그저께 등 데이터가 없으면 휴식으로 처리)
      const baseDays = [
        { label: '오늘', dateVal: todayStr },
        { label: '어제', dateVal: formatDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)) },
        { label: '그저께', dateVal: threeDaysAgoStr },
      ];
      
      const mappedLogs = baseDays.map(bd => {
        const found = data?.find(d => d.date === bd.dateVal);
        if (!found) return { ...bd, hasData: false };
        
        // 종목명 추출 (최대 3개 정도만 보여주고 외 X개)
        const exerciseNames = found.workout_log_items.map(item => 
          item.equipments?.name || item.user_custom_exercises?.name || '알 수 없는 운동'
        );
        const uniqueNames = [...new Set(exerciseNames)];
        
        return {
          ...bd,
          hasData: true,
          duration: found.duration_seconds,
          photo_url: found.photo_url,
          exercises: uniqueNames
        };
      });

      setRecentLogs(mappedLogs);
      
      // 오늘 목표 갱신
      setDashboardData(prev => ({ ...prev, todayCompleted: mappedLogs[0].hasData }));

    } catch (err) {
      console.error("Fetch home logs error", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchRecentLogs(user);
      }
    });
  }, []);

  return (
    <PullToRefreshWrapper onRefresh={async () => console.log('피드 리프레시')}>
      <div className="flex h-full flex-col space-y-6 px-2 py-2">
        
        {/* 헤더 영역 */}
        <div className="mb-2">
          <h2 className="text-[24px] font-extrabold tracking-tight text-[#191f28]">안녕하세요! 👋</h2>
          <p className="mt-1 text-sm font-medium text-[#8b95a1]">오늘의 운동 현황을 확인해 볼까요?</p>
        </div>

        {/* 오늘 운동상황 카드 */}
        <div className="rounded-2xl border border-[#e5e8eb] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#191f28]">오늘 운동상황</h3>
            {dashboardData.todayCompleted ? (
              <span className="flex items-center gap-1 text-sm font-bold text-[#3182f6]">
                <CheckCircle2 className="h-4 w-4" /> 오운완!
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm font-bold text-[#f04452]">
                <Flame className="h-4 w-4" /> 아직 미완료
              </span>
            )}
          </div>
          <button 
            onClick={() => {
              if (!dashboardData.todayCompleted) {
                navigate('/workout', { state: { autoStart: true } });
              }
            }}
            className={`w-full rounded-xl py-3.5 font-bold transition-transform active:scale-[0.98] ${
              dashboardData.todayCompleted 
                ? 'cursor-not-allowed bg-[#f2f4f6] text-[#8b95a1]' 
                : 'bg-[#3182f6] text-white shadow-sm'
            }`}
          >
            {dashboardData.todayCompleted ? '이미 오늘 운동을 완료했어요' : '오늘 운동 시작하기'}
          </button>
        </div>

        {/* 주간 및 월간 기록 요약 (그리드) */}
        <div className="grid grid-cols-2 gap-4">
          {/* 연속일수 (Streak) */}
          <div className="flex flex-col justify-center rounded-2xl border border-[#e5e8eb] bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-[#8b95a1]">
              <Flame className="h-4 w-4 text-[#f04452]" />
              <span className="text-xs font-bold">연속일수</span>
            </div>
            <div className="text-[22px] font-extrabold tracking-tight text-[#191f28]">
              {dashboardData.currentStreak}일째 🔥
            </div>
          </div>

          {/* 주간 목표 */}
          <div className="flex flex-col justify-center rounded-2xl border border-[#e5e8eb] bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-[#8b95a1]">
              <Target className="h-4 w-4 text-[#3182f6]" />
              <span className="text-xs font-bold">주간목표 ({dashboardData.weeklyCurrent}/{dashboardData.weeklyGoal})</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-[#f2f4f6]">
              <div 
                className="h-2 rounded-full bg-[#3182f6] transition-all duration-500" 
                style={{ width: `${(dashboardData.weeklyCurrent / dashboardData.weeklyGoal) * 100}%` }}
              ></div>
            </div>
            <p className="mt-2 text-right text-[10px] font-medium text-[#c2c9d2]">
              {dashboardData.weeklyGoal - dashboardData.weeklyCurrent}회 남았어요!
            </p>
          </div>
          
          {/* 최근 3일 요약 (NEW) */}
          <div className="col-span-2 rounded-2xl border border-[#e5e8eb] bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-[#191f28] mb-4">최근 운동</h3>
            <div className="space-y-3">
              {isLoading ? (
                <div className="animate-pulse text-center text-sm font-bold text-[#8b95a1] py-4">
                  기록을 불러오는 중...
                </div>
              ) : (
                recentLogs.map((log, i) => (
                  <div key={i} className="flex gap-3 items-center border border-[#f2f4f6] rounded-xl p-3 bg-[#f9fafb]">
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-[#8b95a1] mb-1">{log.label} <span className="font-medium text-[#b0b8c1] ml-1">{log.dateVal.slice(5)}</span></p>
                      {log.hasData ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[14px] font-extrabold text-[#191f28]">완료!</span>
                            <span className="text-[12px] font-bold text-[#3182f6] bg-[#e8f3ff] px-1.5 py-0.5 rounded-md">
                              {Math.floor(log.duration / 60)}분 {log.duration % 60}초
                            </span>
                          </div>
                          <p className="text-[12px] text-[#4e5968] font-medium line-clamp-1">
                            {log.exercises.length > 2 
                              ? `${log.exercises[0]}, ${log.exercises[1]} 외 ${log.exercises.length - 2}개` 
                              : log.exercises.join(', ')}
                          </p>
                        </>
                      ) : (
                        <p className="text-[14px] font-extrabold text-[#b0b8c1] mt-1">휴식 🍃</p>
                      )}
                    </div>
                    {/* 우측 썸네일 */}
                    {log.hasData && log.photo_url ? (
                      <div className="w-16 h-16 rounded-xl bg-white shadow-sm border border-[#e5e8eb] overflow-hidden shrink-0">
                        <img src={log.photo_url} alt="오운완" className="w-full h-full object-cover" />
                      </div>
                    ) : (log.hasData && !log.photo_url && (
                      <div className="w-16 h-16 rounded-xl bg-white shadow-sm border border-[#e5e8eb] flex items-center justify-center shrink-0">
                        <ImageIcon className="w-6 h-6 text-[#d1d6db]" />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </PullToRefreshWrapper>
  )
}
