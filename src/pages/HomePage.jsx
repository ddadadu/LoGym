import { Flame, Target, Trophy, CalendarDays, CheckCircle2 } from 'lucide-react'
import PullToRefreshWrapper from '../components/PullToRefreshWrapper'

export default function HomePage() {
  // 백엔드 연결 전 UI 확인을 위한 Mock(가짜) 데이터
  const dashboardData = {
    todayCompleted: false, // 오늘 운동 완료 여부
    weeklyGoal: 4,         // 이번 주 목표 횟수
    weeklyCurrent: 2,      // 이번 주 달성 횟수
    currentStreak: 5,      // 연속 출석 일수
    thisMonthCount: 12,    // 이번 달 출석 누적
  }

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
          
          {/* 이번달 성과 */}
          <div className="col-span-2 flex items-center justify-between rounded-2xl border border-[#e5e8eb] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3182f6]/10">
                <CalendarDays className="h-5 w-5 text-[#3182f6]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#8b95a1]">이번달 로짐 출석</p>
                <p className="text-lg font-extrabold text-[#191f28]">{dashboardData.thisMonthCount}회</p>
              </div>
            </div>
            <Trophy className="h-8 w-8 text-[#faca15] opacity-30" />
          </div>

        </div>
      </div>
    </PullToRefreshWrapper>
  )
}
