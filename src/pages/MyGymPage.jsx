import { useState, useEffect } from 'react'
import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { MapPin, Search } from 'lucide-react'

export default function MyGymPage() {
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 }) // 서울 중심좌표

  useEffect(() => {
    // 실제 사용자의 현재 위치를 받아옵니다
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (err) => console.error('GPS 에러:', err)
      )
    }
  }, [])

  return (
    <div className="relative mx-[-16px] my-[-16px] flex h-[calc(100%+32px)] flex-col overflow-hidden">
      {/* 백그라운드 카카오 지도 */}
      <div className="absolute inset-0 z-0 h-full w-full bg-gray-200">
        <Map
          center={center}
          style={{ width: '100%', height: '100%' }}
          level={4}
        >
          {/* 내 위치 마커 */}
          <MapMarker position={center} />
          {/* TODO: Supabase에서 헬스장 마커를 불러와 렌더링할 영역 */}
        </Map>
      </div>

      {/* 플로팅 검색창 */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center rounded-2xl bg-white px-4 py-3 shadow-lg border border-[#e5e8eb]/50">
        <Search className="h-5 w-5 text-[#8b95a1]" />
        <input 
          type="text" 
          placeholder="주변 헬스장 검색..." 
          className="ml-3 flex-1 bg-transparent text-[15px] font-medium text-[#191f28] placeholder-[#8b95a1] outline-none"
        />
      </div>

      {/* 선택된 헬스장 정보 바텀 시트 */}
      <div className="absolute bottom-4 left-4 right-4 z-10 rounded-3xl bg-white p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] border border-[#e5e8eb]">
        <div className="flex items-start justify-between">
          <div>
            <span className="mb-1 inline-block rounded border border-[#3182f6]/20 bg-[#3182f6]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#3182f6]">
              120m
            </span>
            <h3 className="text-xl font-bold tracking-tight text-[#191f28]">로짐 피트니스 (시청점)</h3>
            <p className="mt-1 text-sm text-[#8b95a1]">서울 중구 세종대로 110</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f2f4f6]">
            <MapPin className="h-5 w-5 text-[#8b95a1]" />
          </div>
        </div>
        
        <button className="mt-5 w-full rounded-2xl bg-[#3182f6] py-3.5 font-bold text-white shadow-sm transition-transform active:scale-[0.98]">
          이 곳을 '내 헬스장'으로 등록
        </button>
      </div>
    </div>
  )
}
