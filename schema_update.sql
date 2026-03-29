-- 1. gyms (점포 정보) 테이블 확장
ALTER TABLE gyms 
  ADD COLUMN IF NOT EXISTS operating_hours TEXT, -- 운영 시간 텍스트 (예: 06:00 - 23:00)
  ADD COLUMN IF NOT EXISTS facilities JSONB DEFAULT '{}'::jsonb, -- 부가시설 (샤워실 등 키-값 매핑)
  ADD COLUMN IF NOT EXISTS programs JSONB DEFAULT '{}'::jsonb, -- 운영 프로그램 (PT/GX 등 키-값 매핑)
  ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC, -- 월 이용료
  ADD COLUMN IF NOT EXISTS registration_fee NUMERIC, -- 등록비(가입비)
  ADD COLUMN IF NOT EXISTS closed_day TEXT, -- 휴무일
  ADD COLUMN IF NOT EXISTS description TEXT; -- 원장님 남길 말씀 등 기타 정보

-- 2. gym_equipments (보유 기구) 테이블 확장
ALTER TABLE gym_equipments
  -- 상태값: 양호(excellent), 보통(good), 점검필요(maintenance) 만 허용하는 구조
  ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'maintenance')),
  ADD COLUMN IF NOT EXISTS brand TEXT, -- 기구 브랜드 (LifeFitness 등)
  ADD COLUMN IF NOT EXISTS purchase_year INT; -- 구입 연도

-- 3. gym_trainers (트레이너) 테이블 확장
ALTER TABLE gym_trainers
  ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb, -- 자격증 문자열 배열
  ADD COLUMN IF NOT EXISTS experience TEXT, -- 경력 (예: '7년')
  ADD COLUMN IF NOT EXISTS schedule TEXT; -- 근무 시간표

-- 4. infrastructure_requests (제보/요청) 테이블 확장
-- 기존엔 equipment_name만 필수였으나, 이제 인프라 전체(시간, 시설 등)를 제보하므로 제약 조건을 너그럽게 품
ALTER TABLE infrastructure_requests
  ALTER COLUMN equipment_name DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT '기구', -- 요청 데이터 종류 판별
  ADD COLUMN IF NOT EXISTS request_payload JSONB DEFAULT '{}'::jsonb, -- 변경 폼 전체 데이터 덩어리
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id); -- 이 요청을 승인한 점포 관리자 ID
