import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk'
import { MapPin, Search, Dumbbell, LocateFixed, XCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'

// 두 위경도 좌표 간의 거리(m)를 구면 반경 기준으로 계산하는 함수 (Haversine Formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // 지구 반경 (m)
  const toRad = value => value * Math.PI / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export default function MyGymPage() {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Supabase 로직 상태 추가
  const [currentUser, setCurrentUser] = useState(null)
  const [myGymId, setMyGymId] = useState(null) // 현재 내 헬스장의 '카카오 고유 ID'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // 1. 로그인 유저 정보 및 '이미 등록된 내 헬스장' 판단 (초기 1회)
  useEffect(() => {
    const fetchUserProfile = async () => {
      // 로그인 사용자 체크
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        // 외래키(foreign key)를 이용해 내 home_gym_id가 연결된 gyms 테이블의 kakao_place_id를 즉시 JOIN해서 꺼내옴
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('home_gym_id, gyms(kakao_place_id)')
          .eq('id', user.id)
          .single()

        if (!userError && userData?.gyms?.kakao_place_id) {
          setMyGymId(userData.gyms.kakao_place_id)
          
          // 강제 변경(?change=true) 파라미터가 없으면 즉시 내 헬스장 상세 페이지로 이동
          const queryParams = new URLSearchParams(location.search);
          if (queryParams.get('change') !== 'true') {
            navigate('/mygym/info', { replace: true });
            return;
          }
        }
      }
      // 리다이렉트가 일어나지 않은 경우에만 로딩 해제 (맵 렌더링 시작)
      setIsInitializing(false)
    }
    fetchUserProfile()
  }, [navigate, location])

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

  useEffect(() => {
    fetchMyLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 4. 지도 컨테이너 자동 반영체계
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

  // 5. 스와이프
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

  // 7. 내 헬스장 서버 통신 등재 로직
  const handleRegisterGym = async (place) => {
    if (!currentUser) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      // DB STEP 1: 해당 헬스장을 우리 점포 마스터(gyms) 테이블에 존재하는지 확인 후 업서트(없으면 생성)
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

      // DB STEP 2: 유저(users) 테이블에 home_gym_id 업데이트
      // (upsert를 쓰면 비어있는 username 값이 덮어씌워지며 발생하는 NOT NULL 에러 방지)
      const { data: updatedUsers, error: updateError } = await supabase
        .from('users')
        .update({ home_gym_id: gymData.id })
        .eq('id', currentUser.id)
        .select();

      if (updateError) throw updateError;

      // 만약 아직 users 테이블에 내 로우(행)가 아예 생성조차 안 되어있다면? (업데이트 실패)
      if (updatedUsers.length === 0) {
        // 카카오/구글 소셜 로그인 정보에서 이름을 꺼내 임시 username으로 넣고 최초 생성(insert) 처리
        const defaultName = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || `회원_${currentUser.id.substring(0, 5)}`;

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: currentUser.id,
            home_gym_id: gymData.id,
            username: defaultName // NOT NULL 제약조건 통과를 위한 닉네임 자동생성
          });

        if (insertError) throw insertError;
      }

      // STEP 3: 브라우저 UI 단 실시간 반영 및 알림창
      setMyGymId(place.id);
      alert(`'${place.place_name}'이(가) 내 헬스장으로 성공적으로 등록/변경되었습니다! 🔥`);
    } catch (err) {
      console.error('Gym Registration Error:', err);
      alert('등록을 처리하는 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitializing) {
    return <div className="flex h-[100dvh] w-full items-center justify-center bg-[#f9fafb]">
      <span className="animate-spin w-8 h-8 rounded-full border-2 border-[#3182f6]/30 border-t-[#3182f6]" />
    </div>
  }

  if (loading) {
    return <div className="flex h-[100dvh] w-full items-center justify-center text-[#8b95a1]">지도를 불러오는 중입니다...</div>
  }

  if (error) {
    return <div className="flex h-[100dvh] w-full items-center justify-center text-red-500 text-sm">지도 로딩 에러 (API 키 및 도메인을 확인하세요)</div>
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#f9fafb]">
      {/* 상단 맵 공간 */}
      <div
        id="map-container"
        className={`relative w-full shrink-0 transition-[height] duration-500 ease-in-out ${isListExpanded ? 'h-[40vh]' : 'h-[calc(100vh-150px)]'
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
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3182f6] opacity-60"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-[#3182f6] border-2 border-white shadow-md"></span>
            </div>
          </CustomOverlayMap>

          {places.map((place) => {
            const isSelected = selectedGym?.id === place.id;
            const isMyGym = myGymId === place.id; // 선택상관 없이 내 헬스장 마커면 표시
            return (
              <CustomOverlayMap
                key={place.id}
                position={{ lat: place.y, lng: place.x }}
                clickable={true}
              >
                <div
                  className={`flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-full shadow-lg transition-all ${
                    // 이미 내 헬스장인 곳은 황금색(또는 진한색 별도 강조)
                    isMyGym && !isSelected ? 'bg-[#191f28] ring-2 ring-[#faca15]' :
                      isSelected ? 'bg-[#1b64da] scale-110 ring-4 ring-[#3182f6]/30' : 'bg-[#3182f6] hover:scale-105 ring-2 ring-white'
                    }`}
                  onClick={() => {
                    setSelectedGym(place);
                    setIsListExpanded(true);
                    if (map) map.panTo(new window.kakao.maps.LatLng(place.y, place.x));
                  }}
                  title={place.place_name}
                >
                  <Dumbbell className={`h-6 w-6 ${isMyGym && !isSelected ? 'text-[#faca15]' : 'text-white'}`} strokeWidth={2} />
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
          className="absolute right-4 top-20 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-[#e5e8eb]/50 bg-white text-[#3182f6] shadow-md transition-transform active:scale-95"
          title="내 위치로 이동"
        >
          <LocateFixed className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <form
          onSubmit={handleSearch}
          className="absolute left-4 right-4 top-4 z-10 flex items-center rounded-2xl border border-[#e5e8eb]/50 bg-white px-4 py-3 shadow-lg"
        >
          <Search className="h-5 w-5 text-[#8b95a1]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="상호명 또는 지역 검색 (예: 공덕역 헬스장)"
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

      {/* 하단 리스트 영역 */}
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
              {keyword ? '검색 결과' : '주변 헬스장'}
              <span className="ml-1 text-[#3182f6]">{places.length}</span>
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-20">
          <div className="flex flex-col gap-3">
            {places.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#8b95a1]">
                <Dumbbell className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">검색된 헬스장이 없습니다.</p>
              </div>
            ) : (
              places.map((place) => {
                const isSelected = selectedGym?.id === place.id;
                const isMyGym = myGymId === place.id;

                // 내 위치(myLocation) 기준으로 마커와의 실제 직선 거리 재계산
                const calcDistance = calculateDistance(myLocation?.lat, myLocation?.lng, place.y, place.x);
                const displayDistance = calcDistance !== null
                  ? (calcDistance >= 1000 ? `${(calcDistance / 1000).toFixed(1)}km` : `${calcDistance}m`)
                  : (place.distance ? `${place.distance}m` : '위치 검색');

                return (
                  <div
                    key={place.id}
                    onClick={() => {
                      setSelectedGym(place);
                      if (map) map.panTo(new window.kakao.maps.LatLng(place.y, place.x));
                    }}
                    className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all ${isSelected
                        ? 'border-[#3182f6] bg-[#3182f6]/5 shadow-sm ring-1 ring-[#3182f6]'
                        : (isMyGym ? 'border-[#191f28]/10 bg-[#f9fafb]' : 'border-[#e5e8eb] bg-white hover:bg-gray-50')
                      }`}
                  >
                    <div className="flex items-start justify-between p-4">
                      <div className="flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="rounded bg-[#f2f4f6] px-1.5 py-0.5 text-[10px] font-bold text-[#8b95a1]">
                            {displayDistance}
                          </span>
                          {isMyGym && (
                            <span className="rounded bg-[#191f28] px-1.5 py-0.5 text-[10px] font-bold text-[#faca15]">
                              ★ 내 헬스장
                            </span>
                          )}
                          <h3 className="text-base font-bold tracking-tight text-[#191f28]">{place.place_name}</h3>
                        </div>
                        <p className="text-xs text-[#8b95a1]">{place.road_address_name || place.address_name}</p>
                      </div>
                      {isSelected && (
                        <div className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3182f6] shadow-sm">
                          <MapPin className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="animate-in slide-in-from-top-2 border-t border-[#3182f6]/10 px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isMyGym) navigate('/mygym/info');
                            else handleRegisterGym(place);
                          }}
                          disabled={(!isMyGym && isSubmitting)}
                          className={`w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-sm outline-none border-none transition-transform ${isMyGym
                              ? 'bg-[#191f28] hover:bg-black active:scale-[0.98]'
                              : 'bg-[#3182f6] hover:bg-blue-600 active:scale-[0.98]'
                            }`}
                        >
                          {isMyGym
                            ? '내 헬스장 상세 정보 보기'
                            : isSubmitting
                              ? '등록 통신 중...'
                              : (myGymId ? '이 헬스장으로 변경하기' : "이곳을 '내 헬스장'으로 등록")
                          }
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
