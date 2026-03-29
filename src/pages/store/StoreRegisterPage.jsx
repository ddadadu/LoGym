import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk'
import { Building2, Search, LocateFixed, XCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'

export default function StoreRegisterPage() {
  const navigate = useNavigate()
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_API_KEY,
    libraries: ['services', 'clusterer'],
  })

  // 지도 코어 상태
  const [map, setMap] = useState(null)
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 })
  const [myLocation, setMyLocation] = useState({ lat: 37.5665, lng: 126.9780 })
  const [places, setPlaces] = useState([])
  const [selectedGym, setSelectedGym] = useState(null)

  // 터치/드래그, 검색 UI 상태
  const [isListExpanded, setIsListExpanded] = useState(true)
  const [touchY, setTouchY] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')

  // Supabase 처리
  const [currentUser, setCurrentUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. 유저 정보
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user)
    })
  }, [])

  // 2. 주변 검색
  useEffect(() => {
    if (loading || error || !window.kakao || !window.kakao.maps.services) return
    if (keyword) return 

    const ps = new window.kakao.maps.services.Places()
    const searchOption = {
      location: new window.kakao.maps.LatLng(center.lat, center.lng),
      radius: 2000,
      sort: window.kakao.maps.services.SortBy.DISTANCE,
    }

    ps.keywordSearch('헬스장', (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setPlaces(data)
      } else {
        setPlaces([])
      }
    }, searchOption)
  }, [center, loading, error, keyword])

  // 3. 내 위치 초기화
  const fetchMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude }
          setMyLocation(loc)
          setCenter(loc)
          if (map) map.panTo(new window.kakao.maps.LatLng(loc.lat, loc.lng))
        },
        (err) => console.error('GPS 에러:', err)
      )
    }
  }

  useEffect(() => { fetchMyLocation() }, [])

  // 4. 지도 컨테이너 리사이즈 자동 반영
  useEffect(() => {
    if (!map) return;
    const container = document.getElementById('map-container');
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
      map.relayout()
      map.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng))
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [map, center]);

  const handleTouchStart = (e) => setTouchY(e.touches[0].clientY)
  const handleTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY
    if (endY - touchY > 30) setIsListExpanded(false)
    else if (touchY - endY > 30) setIsListExpanded(true)
  }

  // 6. 커스텀 키워드 검색
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      setKeyword('');
      if (map) map.panTo(new window.kakao.maps.LatLng(center.lat, center.lng));
      return;
    }
    
    setKeyword(searchInput.trim());
    setSelectedGym(null);
    if (!window.kakao || !window.kakao.maps.services) return;
    
    const ps = new window.kakao.maps.services.Places();
    const formattedKeyword = 
      searchInput.includes('헬스') || searchInput.includes('짐') || searchInput.includes('피트니스') 
        ? searchInput 
        : `${searchInput} 헬스장`;

    let collectedPlaces = [];
    
    const placesSearchCB = (data, status, pagination) => {
      if (status === window.kakao.maps.services.Status.OK) {
        collectedPlaces = [...collectedPlaces, ...data];
        
        if (pagination.hasNextPage && collectedPlaces.length < 50) {
          pagination.nextPage();
        } else {
          const finalData = collectedPlaces.slice(0, 50);
          setPlaces(finalData);
          setIsListExpanded(true);
          
          if (map && finalData.length > 0) {
            const bounds = new window.kakao.maps.LatLngBounds();
            finalData.slice(0, 15).forEach(place => bounds.extend(new window.kakao.maps.LatLng(place.y, place.x)));
            map.setBounds(bounds);
            setCenter({ lat: map.getCenter().getLat(), lng: map.getCenter().getLng() });
          }
        }
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        setPlaces([]);
      }
    };
    
    ps.keywordSearch(formattedKeyword, placesSearchCB);
  };

  // 7. 내 점포로 인증/등록 로직
  const handleRegisterStore = async (place) => {
    if (!currentUser) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1: gyms 테이블 업서트
      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .upsert({
          kakao_place_id: place.id,
          name: place.place_name,
          address: place.road_address_name || place.address_name,
          latitude: parseFloat(place.y),
          longitude: parseFloat(place.x)
        }, { onConflict: 'kakao_place_id' })
        .select()
        .single();

      if (gymError) throw gymError;

      // 2: users 테이블에 home_gym_id 업데이트
      const { data: updatedUsers, error: updateError } = await supabase
        .from('users')
        .update({ home_gym_id: gymData.id })
        .eq('id', currentUser.id)
        .select();

      if (updateError) throw updateError;

      // 신규가입 과정에서 row가 누락된 예외 방어코드
      if (updatedUsers.length === 0) {
        const defaultName = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || `관리자_${currentUser.id.substring(0,5)}`;
        const { error: insertError } = await supabase.from('users').insert({
          id: currentUser.id,
          home_gym_id: gymData.id,
          username: defaultName,
          is_manager: true
        });
        if (insertError) throw insertError;
      }

      alert(`'${place.place_name}'의 관리자로 성공적으로 등록되었습니다!\n점포 대시보드로 이동합니다.`);
      navigate('/store'); // 성공 시 대시보드 진입
    } catch (err) {
      console.error('Store Registration Error:', err);
      alert('점포 인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-full w-full items-center justify-center text-[#8b95a1]">지도를 불러오는 중입니다...</div>
  if (error) return <div className="flex h-full w-full items-center justify-center text-red-500 text-sm">지도 로딩 에러</div>

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#f9fafb]">
      <header className="absolute left-0 right-0 top-0 z-20 flex h-14 items-center justify-center bg-white shadow-sm border-b border-[#e5e8eb]">
         <h1 className="text-[17px] font-bold text-[#191f28]">내 점포 등록</h1>
       </header>

      <div 
        id="map-container"
        className={`relative w-full shrink-0 transition-[height] duration-500 ease-in-out mt-14 ${
          isListExpanded ? 'h-[40vh]' : 'h-[calc(100vh-150px)]'
        }`}
      >
        <Map
          center={center}
          style={{ width: '100%', height: '100%' }}
          level={4}
          onCreate={setMap}
          onDragEnd={(map) => setCenter({ lat: map.getCenter().getLat(), lng: map.getCenter().getLng() })}
        >
          <CustomOverlayMap position={myLocation}>
            <div className="relative flex h-8 w-8 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#191f28] opacity-60"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-[#191f28] border-2 border-white shadow-md"></span>
            </div>
          </CustomOverlayMap>
          
          {places.map((place) => {
            const isSelected = selectedGym?.id === place.id;
            return (
              <CustomOverlayMap
                key={place.id}
                position={{ lat: place.y, lng: place.x }}
                clickable={true}
              >
                <div 
                  className={`flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-full shadow-lg transition-all ${
                    isSelected ? 'bg-[#191f28] scale-110 ring-4 ring-[#191f28]/30' : 'bg-white hover:scale-105 ring-2 ring-[#e5e8eb]'
                  }`}
                  onClick={() => {
                    setSelectedGym(place);
                    setIsListExpanded(true);
                    if (map) map.panTo(new window.kakao.maps.LatLng(place.y, place.x));
                  }}
                  title={place.place_name}
                >
                  <Building2 className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-[#8b95a1]'}`} strokeWidth={2} />
                </div>
              </CustomOverlayMap>
            )
          })}
        </Map>

        <button 
          onClick={() => {
            if (map && myLocation) {
               map.panTo(new window.kakao.maps.LatLng(myLocation.lat, myLocation.lng))
               setCenter(myLocation)
            } else {
               fetchMyLocation()
            }
          }}
          className="absolute right-4 top-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-[#e5e8eb]/50 bg-white text-[#191f28] shadow-md transition-transform active:scale-95"
          title="내 위치로 이동"
        >
          <LocateFixed className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <form 
          onSubmit={handleSearch}
          className="absolute left-4 right-16 top-4 z-10 flex items-center rounded-2xl border border-[#e5e8eb]/50 bg-white px-4 py-3 shadow-lg"
        >
          <Search className="h-5 w-5 text-[#8b95a1]" />
          <input 
            type="text" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="상호명 검색 (예: 마곡동 헬스장)" 
            className="ml-3 flex-1 bg-transparent text-[15px] font-medium text-[#191f28] placeholder-[#8b95a1] outline-none"
          />
          {searchInput && (
            <button 
              type="button" 
              onClick={() => {
                setSearchInput('');
                setKeyword(''); 
              }}
              className="ml-2 flex h-6 w-6 cursor-pointer items-center justify-center text-[#8b95a1] hover:text-[#191f28]"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      <div className="relative z-10 -mt-6 flex flex-1 flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <div 
          className="cursor-pointer shrink-0 bg-white px-5 pb-3 pt-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setIsListExpanded(!isListExpanded)}
        >
          <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#e5e8eb]"></div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#191f28]">
              {keyword ? '검색된 점포' : '주변 점포'} 
              <span className="ml-1 text-[#3182f6]">{places.length}</span>
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-20">
          <div className="flex flex-col gap-3">
            {places.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#8b95a1]">
                <Building2 className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">검색된 점포가 없습니다.</p>
              </div>
            ) : (
              places.map((place) => {
                const isSelected = selectedGym?.id === place.id;

                return (
                  <div 
                    key={place.id}
                    onClick={() => {
                      setSelectedGym(place);
                      if (map) map.panTo(new window.kakao.maps.LatLng(place.y, place.x));
                    }}
                    className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all ${
                      isSelected ? 'border-[#191f28] bg-[#f9fafb] shadow-sm ring-1 ring-[#191f28]' : 'border-[#e5e8eb] bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between p-4">
                      <div className="flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="rounded bg-[#f2f4f6] px-1.5 py-0.5 text-[10px] font-bold text-[#8b95a1]">
                            {place.distance ? `${place.distance}m` : '위치'}
                          </span>
                          <h3 className="text-base font-bold tracking-tight text-[#191f28]">{place.place_name}</h3>
                        </div>
                        <p className="text-xs text-[#8b95a1]">{place.road_address_name || place.address_name}</p>
                      </div>
                      {isSelected && (
                        <div className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#191f28] shadow-sm">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {isSelected && (
                      <div className="animate-in slide-in-from-top-2 border-t border-[#191f28]/10 px-4 py-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRegisterStore(place); }}
                          disabled={isSubmitting}
                          className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-sm outline-none border-none transition-transform bg-[#191f28] hover:bg-black active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                        >
                          {isSubmitting ? '점장 권한 활성화 중...' : '이곳의 점포 관리자로 인증/시작하기'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
