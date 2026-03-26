import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Building2, Search, Dumbbell } from 'lucide-react'

export default function StoreRegisterPage() {
  const navigate = useNavigate()
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 })

  useEffect(() => {
    // 실제 GPS 위치 수신
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        }
      )
    }
  }, [])

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-gray-50">
      
      {/* 관리자용 헤더 */}
      <header className="absolute left-0 right-0 top-0 z-20 flex h-14 items-center justify-center bg-white shadow-sm border-b border-[#e5e8eb]">
        <h1 className="text-[17px] font-bold text-[#191f28]">내 점포 등록</h1>
      </header>

      {/* 백그라운드 카카오 지도 */}
      <div className="absolute bottom-0 left-0 right-0 top-14 z-0 bg-gray-200">
        <Map center={center} style={{ width: '100%', height: '100%' }} level={5}>
          <MapMarker position={center} />
          {/* TODO: 점포 관리자용 덤벨 마커 리스트 표시 영역 */}
        </Map>
      </div>

      {/* 플로팅 검색창 */}
      <div className="absolute top-18 left-4 right-4 z-10 flex items-center rounded-xl bg-white px-4 py-3 shadow-md border border-[#e5e8eb]/50 mt-4">
        <Search className="h-5 w-5 text-[#8b95a1]" />
        <input 
          type="text" 
          placeholder="운영하시는 헬스장 이름을 검색하세요..." 
          className="ml-3 flex-1 bg-transparent text-[14px] font-medium text-[#191f28] placeholder-[#8b95a1] outline-none"
        />
      </div>

      {/* 점포 선택 바텀 시트 */}
      <div className="absolute bottom-8 left-4 right-4 z-10 rounded-[24px] bg-white p-6 shadow-2xl border border-[#e5e8eb]">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#191f28] text-white">
            <Building2 className="h-7 w-7" />
          </div>
        </div>
        <h3 className="text-center text-[19px] font-bold tracking-tight text-[#191f28]">운영 중인 점포를 선택해주세요</h3>
        <p className="mt-2 text-center text-sm font-medium text-[#8b95a1] leading-relaxed">
          지도에서 본인의 헬스장을 찾아 선택한 후<br/>해당 점포의 관리자(운영자)로 권한을 등록합니다.
        </p>

        <button 
          onClick={() => navigate('/store')}
          className="mt-6 w-full rounded-2xl bg-[#191f28] py-4 font-bold text-white shadow-md transition-transform active:scale-[0.98]"
        >
          로짐 피트니스(시청점) 관리자로 시작
        </button>
      </div>
    </div>
  )
}
