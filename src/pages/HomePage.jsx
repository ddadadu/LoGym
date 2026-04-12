import { Flame, Target, Trophy, CalendarDays, CheckCircle2, Image as ImageIcon, Clock, ChevronRight, Zap } from 'lucide-react'
import PullToRefreshWrapper from '../components/PullToRefreshWrapper'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function HomePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 기존의 Mock 데이터 및 추가 데이터 (향후 백엔드 고도화 예정)
  const [dashboardData, setDashboardData] = useState({
    todayCompleted: false,
    weeklyGoal: 4,
    weeklyCurrent: 2,
    currentStreak: 5,
    thisMonthCount: 12,
    todayCalories: 0,
    todayMinutes: 0
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
      
      const baseDays = [
        { label: '오늘', dateVal: todayStr },
        { label: '어제', dateVal: formatDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)) },
        { label: '그저께', dateVal: threeDaysAgoStr },
      ];
      
      const mappedLogs = baseDays.map(bd => {
        const found = data?.find(d => d.date === bd.dateVal);
        if (!found) return { ...bd, hasData: false };
        
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
      
      // 오늘 통계 갱신
      setDashboardData(prev => ({ 
        ...prev, 
        todayCompleted: mappedLogs[0].hasData,
        todayMinutes: mappedLogs[0].hasData ? Math.floor(mappedLogs[0].duration / 60) : 0,
        todayCalories: mappedLogs[0].hasData ? Math.floor((mappedLogs[0].duration / 60) * 6) : 0
      }));

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

  // Circular progress 계산
  const progress = dashboardData.todayCompleted ? 100 : Math.round((dashboardData.todayMinutes / 75) * 100) || 0;
  const progressClamped = progress > 100 ? 100 : progress;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progressClamped / 100) * circumference;

  const stats = [
    { icon: Flame, label: '칼로리', value: dashboardData.todayCalories, unit: 'kcal', color: '#ff6b35', bg: '#fff4ef' },
    { icon: Target, label: '주간 목표', value: `${dashboardData.weeklyCurrent}/${dashboardData.weeklyGoal}`, unit: '운동', color: '#3182f6', bg: '#ebf4ff' },
    { icon: Trophy, label: '연속', value: dashboardData.currentStreak, unit: '일', color: '#f59e0b', bg: '#fff8eb' },
    { icon: CalendarDays, label: '이번 달', value: dashboardData.thisMonthCount, unit: '회', color: '#8b5cf6', bg: '#f3f0ff' },
  ];

  return (
    <PullToRefreshWrapper onRefresh={async () => currentUser && fetchRecentLogs(currentUser)}>
      <div className="min-h-screen bg-[#f7f8fa] pb-24">
        {/* Greeting - Toss style */}
        <div className="px-6 pt-5 pb-3">
          <p className="text-[#8b95a1] text-[14px] mb-1">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <h1 className="text-[26px] tracking-[-0.04em] text-[#191f28]" style={{ fontWeight: 700 }}>
            {currentUser?.user_metadata?.name || '회원'}님, 오늘도 화이팅!
          </h1>
        </div>

        <div className="px-5">
          {/* Daily Progress Card - Toss circular style */}
          <div className="bg-white rounded-[24px] p-6 mt-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[17px] text-[#191f28] mb-1" style={{ fontWeight: 600 }}>일일 목표</h3>
                <p className="text-[14px] text-[#8b95a1]">
                  {dashboardData.todayCompleted ? '오늘 운동을 완료했어요! 🎉' : '아직 완료되지 않았어요'}
                </p>
                <div className="mt-4 flex gap-3">
                  <div className="flex items-center gap-1.5 text-[13px] text-[#4e5968]">
                    <Clock className="w-[14px] h-[14px] text-[#8b95a1]" />
                    {dashboardData.todayMinutes}분 운동
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] text-[#4e5968]">
                    <Flame className="w-[14px] h-[14px] text-[#8b95a1]" />
                    {dashboardData.todayCalories} kcal
                  </div>
                </div>
              </div>
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#f2f4f6" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke={dashboardData.todayCompleted ? "#00c471" : "#3182f6"} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 60 60)"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[26px] text-[#191f28]" style={{ fontWeight: 700 }}>{progressClamped}%</span>
                </div>
              </div>
            </div>
            {!dashboardData.todayCompleted && (
              <button 
                onClick={() => navigate('/workout', { state: { autoStart: true } })}
                className="w-full mt-5 bg-[#3182f6] text-white rounded-[16px] py-4 text-[16px] font-bold active:scale-[0.98] transition-transform shadow-sm"
              >
                오늘 운동 시작하기
              </button>
            )}
          </div>

          {/* Stats - Toss style compact grid */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-[20px] p-4 flex flex-col items-center text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2.5"
                    style={{ backgroundColor: stat.bg }}
                  >
                    <Icon className="w-[18px] h-[18px]" style={{ color: stat.color }} />
                  </div>
                  <span className="text-[17px] text-[#191f28]" style={{ fontWeight: 700 }}>
                    {stat.value}
                  </span>
                  <span className="text-[12px] text-[#8b95a1] mt-0.5">{stat.label}</span>
                </div>
              );
            })}
          </div>

          {/* Recent Workouts - Toss list style */}
          <div className="mt-8 mb-6">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-[19px] text-[#191f28]" style={{ fontWeight: 700 }}>최근 운동</h2>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                <div className="animate-pulse text-center text-sm font-bold text-[#8b95a1] py-4 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  기록을 불러오는 중...
                </div>
              ) : (
                recentLogs.map((log, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[20px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center p-4 gap-4"
                  >
                    <div className="w-[60px] h-[60px] rounded-2xl bg-[#f2f4f6] overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#e5e8eb]">
                      {log.hasData && log.photo_url ? (
                        <img src={log.photo_url} alt="오운완" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-[#d1d6db]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-[15px] text-[#191f28] truncate" style={{ fontWeight: 600 }}>
                          {log.label} <span className="text-[13px] text-[#8b95a1] ml-1 font-normal">{log.dateVal.slice(5)}</span>
                        </h4>
                        {log.hasData && (
                          <span className="text-[12px] text-[#3182f6] px-2 py-0.5 bg-[#ebf4ff] rounded-full flex-shrink-0" style={{ fontWeight: 600 }}>
                            오운완
                          </span>
                        )}
                      </div>
                      {log.hasData ? (
                        <p className="text-[13px] text-[#4e5968] truncate mt-1">
                          {Math.floor(log.duration / 60)}분 · {log.exercises.length > 2 
                            ? `${log.exercises[0]} 외 ${log.exercises.length - 1}개` 
                            : log.exercises.join(', ')}
                        </p>
                      ) : (
                         <p className="text-[13px] text-[#8b95a1] mt-1">이날은 휴식을 취했어요 🍃</p>
                      )}
                    </div>
                    {log.hasData && (
                      <button className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#f2f4f6] text-[#8b95a1] transition-colors active:bg-[#e5e8eb]">
                         <ChevronRight className="w-[18px] h-[18px]" />
                      </button>
                    )}
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
