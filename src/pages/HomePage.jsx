import { Flame, Target, Trophy, CalendarDays, CheckCircle2, Image as ImageIcon, Clock, ChevronRight, Zap, Settings } from 'lucide-react'
import PullToRefreshWrapper from '../components/PullToRefreshWrapper'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import GoalSettingModal from '../components/GoalSettingModal'

export default function HomePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 기존의 Mock 데이터 및 추가 데이터 (향후 백엔드 고도화 예정)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // 대시보드 상태
  const [dashboardData, setDashboardData] = useState({
    todayCompleted: false,
    dailyGoal: 60,
    weeklyGoal: 200,
    weeklyGoalCount: 5,
    weeklyMinutes: 0,
    weeklyCount: 0,
    weeklyCalories: 0,
    currentStreak: 0,
    thisMonthCount: 0,
    todayCalories: 0,
    todayMinutes: 0,
    userWeight: 70
  });

  // DB에서 최근 3일 치 조회
  const fetchDashboardData = async (user) => {
    try {
      setIsLoading(true);

      // 1. 유저 프로필(체중, 목표치) 가져오기
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, weight, daily_goal_minutes, weekly_goal_minutes, weekly_goal_count')
        .eq('id', user.id)
        .single();

      const weight = profile?.weight || 70;
      const dGoal = profile?.daily_goal_minutes || 60;
      const wGoal = profile?.weekly_goal_minutes || 200;
      const wGoalCount = profile?.weekly_goal_count || 5;

      // 2. 날짜 계산
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 주간 계산 (월요일 시작)
      const dayOfWeek = today.getDay(); // 0(일) ~ 6(토)
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
      monday.setHours(0, 0, 0, 0);

      const formatDate = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
      };

      const todayStr = formatDate(today);
      const startOfMonthStr = formatDate(firstDayOfMonth);
      const mondayStr = formatDate(monday);
      const threeDaysAgoStr = formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000));

      // 3. 로그 가져오기 (이번 달 전체 로그 + 스트릭 확인용 추가 과거 데이터)
      // 스트릭 계산을 위해 넉넉히 최근 60일치 가져옴
      const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgoStr = formatDate(sixtyDaysAgo);

      const { data: allLogs, error } = await supabase
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
        .gte('date', sixtyDaysAgoStr)
        .order('date', { ascending: false });

      if (error) throw error;

      // 통계 계산 — 같은 날 다중 세션 합산 (옵션 B: 세션 기준 카운트)
      const todayLogs = allLogs.filter(l => l.date === todayStr);
      const monthLogs = allLogs.filter(l => l.date >= startOfMonthStr);
      const weekLogs = allLogs.filter(l => l.date >= mondayStr);

      // 스트릭 계산 (날짜 유니크 기준)
      let streak = 0;
      const uniqueDates = [...new Set(allLogs.map(l => l.date))].sort().reverse();

      let checkDate = todayStr;
      const hasToday = uniqueDates.includes(todayStr);
      const yesterday = formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000));
      const hasYesterday = uniqueDates.includes(yesterday);

      if (hasToday || hasYesterday) {
        let current = hasToday ? new Date(today.getTime()) : new Date(today.getTime() - 24 * 60 * 60 * 1000);
        while (uniqueDates.includes(formatDate(current))) {
          streak++;
          current.setDate(current.getDate() - 1);
        }
      }

      // 주간 총합 (시간, 칼로리, 세션 횟수)
      let wMins = 0;
      let wCals = 0;
      const wCount = weekLogs.length; // 세션 기준 카운트 (옵션 B)
      weekLogs.forEach(l => {
        wMins += Math.floor(l.duration_seconds / 60);
        wCals += Math.floor(5.0 * weight * (l.duration_seconds / 3600));
      });

      // 오늘 통계 합산 (다중 세션)
      let todayTotalSeconds = 0;
      todayLogs.forEach(l => { todayTotalSeconds += l.duration_seconds; });
      const todayMins = Math.floor(todayTotalSeconds / 60);
      const todayCals = Math.floor(5.0 * weight * (todayTotalSeconds / 3600));

      // 최근 3일 요약 (UI용) — 같은 날 다중 세션 합산
      const baseDays = [
        { label: '오늘', dateVal: todayStr },
        { label: '어제', dateVal: yesterday },
        { label: '그저께', dateVal: formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)) },
      ];

      const mappedLogs = baseDays.map(bd => {
        const dayLogs = allLogs.filter(l => l.date === bd.dateVal);
        if (dayLogs.length === 0) return { ...bd, hasData: false };
        // 합산
        const totalDuration = dayLogs.reduce((sum, l) => sum + l.duration_seconds, 0);
        const allNames = dayLogs.flatMap(l => l.workout_log_items.map(i => i.equipments?.name || i.user_custom_exercises?.name || '운동'));
        const uniqueNames = [...new Set(allNames)];
        return { ...bd, hasData: true, duration: totalDuration, photo_url: dayLogs[0].photo_url, exercises: uniqueNames, sessionCount: dayLogs.length };
      });

      setRecentLogs(mappedLogs);
      setDashboardData({
        todayCompleted: todayLogs.length > 0,
        dailyGoal: dGoal,
        weeklyGoal: wGoal,
        weeklyGoalCount: wGoalCount,
        weeklyMinutes: wMins,
        weeklyCount: wCount,
        weeklyCalories: wCals,
        currentStreak: streak,
        thisMonthCount: monthLogs.length, // 세션 기준 카운트 (옵션 B)
        todayMinutes: todayMins,
        todayCalories: todayCals,
        userWeight: weight,
        userName: profile?.full_name
      });

    } catch (err) {
      console.error("Fetch dashboard error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGoals = async (dGoal, wGoal, wGoalCount) => {
    if (!currentUser) return;
    setIsSavingGoal(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ daily_goal_minutes: dGoal, weekly_goal_minutes: wGoal, weekly_goal_count: wGoalCount })
        .eq('id', currentUser.id);

      if (error) throw error;

      setDashboardData(prev => ({ ...prev, dailyGoal: dGoal, weeklyGoal: wGoal, weeklyGoalCount: wGoalCount }));
      setIsModalOpen(false);
    } catch (err) {
      alert('목표 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchDashboardData(user);
      }
    });
  }, []);

  // Circular progress 계산 (반반)
  const dailyProgress = useMemo(() => {
    const p = Math.round((dashboardData.todayMinutes / dashboardData.dailyGoal) * 100) || 0;
    return p > 100 ? 100 : p;
  }, [dashboardData.todayMinutes, dashboardData.dailyGoal]);

  const weeklyProgress = useMemo(() => {
    const p = Math.round((dashboardData.weeklyMinutes / dashboardData.weeklyGoal) * 100) || 0;
    return p > 100 ? 100 : p;
  }, [dashboardData.weeklyMinutes, dashboardData.weeklyGoal]);

  const r = 54;
  const circumference = 2 * Math.PI * r;
  const halfCircumference = circumference / 2;

  // 일일 목표 (왼쪽 반원) - 시계 반대방향/시계방향 회전에 맞춰 조정
  // 여기서는 단순히 반원 중 얼마나 채울지 계산
  const dailyOffset = halfCircumference - (dailyProgress / 100) * halfCircumference;
  // 주간 목표 (오른쪽 반원)
  const weeklyOffset = halfCircumference - (weeklyProgress / 100) * halfCircumference;

  const stats = [
    { icon: Flame, label: '칼로리', value: dashboardData.weeklyCalories, unit: 'kcal', color: '#ff6b35', bg: '#fff4ef' },
    { icon: Target, label: '주간 목표', value: `${dashboardData.weeklyCount}/${dashboardData.weeklyGoalCount}`, unit: '회', color: '#3182f6', bg: '#ebf4ff' },
    { icon: Trophy, label: '연속', value: dashboardData.currentStreak, unit: '일', color: '#f59e0b', bg: '#fff8eb' },
    { icon: CalendarDays, label: '이번 달', value: dashboardData.thisMonthCount, unit: '회', color: '#8b5cf6', bg: '#f3f0ff' },
  ];

  return (
    <>
      <PullToRefreshWrapper onRefresh={async () => currentUser && fetchDashboardData(currentUser)}>
        <div className="min-h-screen bg-[#f7f8fa] pb-24">
          {/* Greeting - Toss style */}
          <div className="px-6 pt-5 pb-3">
            <p className="text-[#8b95a1] text-[14px] mb-1">
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
            <h1 className="text-[26px] tracking-[-0.04em] text-[#191f28]" style={{ fontWeight: 700 }}>
              {dashboardData.userName || currentUser?.user_metadata?.name || '회원'}님, 오늘도 화이팅!
            </h1>
          </div>

          <div className="px-5">
            {/* Daily Progress Card - Toss circular style */}
            <div className="bg-white rounded-[24px] p-6 mt-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative">
              <button
                onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                className="absolute top-4 right-4 z-10 p-2 text-[#8b95a1] hover:text-[#191f28] transition-colors active:scale-90"
              >
                <Settings className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] text-[#191f28] mb-1" style={{ fontWeight: 600 }}>운동 현황</h3>
                  <p className="text-[14px] text-[#8b95a1]">
                    {dashboardData.todayCompleted ? '오늘 운동을 완료했어요!' : '오늘도 꾸준히 달성해봐요'}
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-[13px] text-[#4e5968]">
                      <span className="w-2 h-2 rounded-full bg-[#3182f6]" />
                      일일: {dashboardData.todayMinutes} / {dashboardData.dailyGoal}분, {dashboardData.todayCalories}kcal
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] text-[#4e5968]">
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                      주간: {dashboardData.weeklyMinutes} / {dashboardData.weeklyGoal}분, {dashboardData.weeklyCalories}kcal
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    {/* 배경 원 */}
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#f2f4f6" strokeWidth="8" />

                    {/* 일일 목표 (좌측 반원) */}
                    <circle
                      cx="60" cy="60" r="54" fill="none"
                      stroke="#3182f6" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${halfCircumference} ${circumference}`}
                      strokeDashoffset={dailyOffset + halfCircumference}
                      transform="rotate(90 60 60)"
                      className="transition-all duration-700"
                    />

                    {/* 주간 목표 (우측 반원) */}
                    <circle
                      cx="60" cy="60" r="54" fill="none"
                      stroke="#f59e0b" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${halfCircumference} ${circumference}`}
                      strokeDashoffset={weeklyOffset + halfCircumference}
                      transform="rotate(-90 60 60)"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[12px] text-[#8b95a1] font-bold">전체</span>
                    <span className="text-[22px] text-[#191f28]" style={{ fontWeight: 700 }}>
                      {Math.round((dailyProgress + weeklyProgress) / 2)}%
                    </span>
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
                              {log.sessionCount > 1 ? `${log.sessionCount}세션` : '오운완'}
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
      <GoalSettingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDaily={dashboardData.dailyGoal}
        initialWeekly={dashboardData.weeklyGoal}
        initialWeeklyCount={dashboardData.weeklyGoalCount}
        onSave={handleSaveGoals}
        isSubmitting={isSavingGoal}
      />
    </>
  )
}
