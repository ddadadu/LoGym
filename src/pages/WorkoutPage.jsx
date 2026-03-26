import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { ko } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PullToRefreshWrapper from '../components/PullToRefreshWrapper'

export default function WorkoutPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())

  // 임시 출석일 표기 (테스트용 하드코딩 데이터)
  const attendedDays = [
    new Date(2026, 2, 6),
    new Date(2026, 2, 7),
    new Date(2026, 2, 13),
    new Date(2026, 2, 14),
  ]

  // 체중 그래프 테스트용 데이터
  const weightData = [
    { date: '1주차', weight: 75.2 },
    { date: '2주차', weight: 74.8 },
    { date: '3주차', weight: 74.5 },
    { date: '4주차', weight: 74.0 },
  ]

  return (
    <PullToRefreshWrapper onRefresh={async () => console.log('리프레시 완료')}>
      <div className="flex h-full flex-col space-y-6 px-2 py-4 pb-12 overflow-x-hidden">
        
        {/* 헤더 */}
        <div className="mb-2 px-2">
          <h2 className="text-[24px] font-extrabold tracking-tight text-[#191f28]">운동상황 📊</h2>
          <p className="mt-1 text-sm font-medium text-[#8b95a1]">나의 노력과 변화를 확인하세요</p>
        </div>

        {/* 캘린더 (출석) */}
        <div className="mx-2 rounded-2xl border border-[#e5e8eb] bg-white p-4 shadow-sm flex flex-col items-center">
          <h3 className="w-full text-left text-lg font-bold text-[#191f28] mb-2 pl-2">출석 달력</h3>
          <style>{`
            .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #3182f6; --rdp-background-color: #e8f3ff; margin: 0; }
            .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #3182f6; color: white; }
          `}</style>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ko}
            modifiers={{ attended: attendedDays }}
            modifiersStyles={{
              attended: { fontWeight: 'bold', backgroundColor: '#e8f3ff', color: '#3182f6', borderRadius: '100%' }
            }}
          />
        </div>

        {/* 체중 변화 그래프 (Recharts) */}
        <div className="mx-2 rounded-2xl border border-[#e5e8eb] bg-white p-5 shadow-sm">
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
    </PullToRefreshWrapper>
  )
}
