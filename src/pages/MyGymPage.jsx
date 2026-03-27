import { useState, useEffect } from 'react'
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk'
import { MapPin, Search, Dumbbell, LocateFixed } from 'lucide-react'

export default function MyGymPage() {
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_API_KEY,
    libraries: ['services', 'clusterer'],
  })

  const [map, setMap] = useState(null)
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 }) // 현재 맵 중심좌표
  const [myLocation, setMyLocation] = useState({ lat: 37.5665, lng: 126.9780 }) // 실제 내 위치
  const [places, setPlaces] = useState([])
  const [selectedGym, setSelectedGym] = useState(null)

  useEffect(() => {
    if (loading || error || !window.kakao || !window.kakao.maps || !window.kakao.maps.services) return

    const ps = new window.kakao.maps.services.Places()
    const searchOption = {
      location: new window.kakao.maps.LatLng(center.lat, center.lng),
      radius: 2000, // 2km 이내 검색
      sort: window.kakao.maps.services.SortBy.DISTANCE,
    }

    ps.keywordSearch('헬스장', (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setPlaces(data)
      } else {
        setPlaces([])
      }
    }, searchOption)
  }, [center, loading, error])

  const fetchMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setMyLocation(loc)
          setCenter(loc)
          
          if (map) {
            map.panTo(new window.kakao.maps.LatLng(loc.lat, loc.lng))
          }
        },
        (err) => console.error('GPS 에러:', err)
      )
    }
  }

  useEffect(() => {
    fetchMyLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center text-[#8b95a1]">지도를 불러오는 중입니다...</div>
  }

  if (error) {
    return <div className="flex h-full w-full items-center justify-center text-red-500 text-sm">지도 로딩 에러 (API 키 및 도메인을 확인하세요)</div>
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-gray-200">
      {/* 백그라운드 카카오 지도 */}
      <Map
        center={center}
        style={{ width: '100%', height: '100%' }}
        level={4}
        onCreate={setMap}
        onDragEnd={(map) => setCenter({ lat: map.getCenter().getLat(), lng: map.getCenter().getLng() })}
      >
        {/* 내 위치 (맥박 애니메이션 블루 닷) */}
        <CustomOverlayMap position={myLocation}>
          <div className="relative flex h-8 w-8 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3182f6] opacity-60"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-[#3182f6] border-2 border-white shadow-md"></span>
          </div>
        </CustomOverlayMap>
        
        {/* 검색된 헬스장 마커 (파란색 덤벨 원형 배지) */}
        {places.map((place) => {
          const isSelected = selectedGym?.id === place.id;
          return (
            <CustomOverlayMap
              key={place.id}
              position={{ lat: place.y, lng: place.x }}
              clickable={true}
            >
              <div 
                className={`flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-full shadow-lg transition-all ${isSelected ? 'bg-[#1b64da] scale-110 ring-4 ring-[#3182f6]/30' : 'bg-[#3182f6] hover:scale-105 ring-2 ring-white'}`}
                onClick={() => setSelectedGym(place)}
                title={place.place_name}
              >
                <Dumbbell className="h-6 w-6 text-white" strokeWidth={2} />
              </div>
            </CustomOverlayMap>
          )
        })}
      </Map>

      {/* 내 위치로 중심 이동 버튼 */}
      <button 
        onClick={() => {
          if (map && myLocation) {
             map.panTo(new window.kakao.maps.LatLng(myLocation.lat, myLocation.lng))
             setCenter(myLocation)
          } else {
             fetchMyLocation()
          }
        }}
        className="absolute top-20 right-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-white shadow-md border border-[#e5e8eb]/50 transition-transform active:scale-95 text-[#3182f6]"
        title="내 위치로 이동"
      >
        <LocateFixed className="h-5 w-5" strokeWidth={2.5} />
      </button>

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
      {selectedGym && (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-3xl bg-white p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] border border-[#e5e8eb] animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="mb-1 inline-block rounded border border-[#3182f6]/20 bg-[#3182f6]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#3182f6]">
                {selectedGym.distance}m
              </span>
              <h3 className="text-xl font-bold tracking-tight text-[#191f28]">{selectedGym.place_name}</h3>
              <p className="mt-1 text-sm text-[#8b95a1]">{selectedGym.road_address_name || selectedGym.address_name}</p>
            </div>
            <button 
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f2f4f6] active:bg-gray-200 transition-colors cursor-pointer border-none outline-none"
              onClick={() => setSelectedGym(null)}
            >
              <MapPin className="h-5 w-5 text-[#8b95a1] fill-current" />
            </button>
          </div>
          
          <button className="mt-5 w-full rounded-2xl bg-[#3182f6] py-3.5 font-bold text-white shadow-sm transition-transform hover:bg-blue-600 active:scale-[0.98] border-none outline-none">
            이 곳을 '내 헬스장'으로 등록
          </button>
        </div>
      )}
    </div>
  )
}
