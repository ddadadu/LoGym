-- 1. 기존 users 테이블에 필요한 속성만 추가 (에러 무시)
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS profile_image TEXT,
  ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_weight NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS home_gym_id UUID,
  ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- 2. 없는 테이블만 골라서 안전하게 생성 (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,                 
  description TEXT,                    
  icon_url TEXT,                       
  condition_type TEXT NOT NULL,      
  condition_value INT NOT NULL         
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  is_displayed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS gyms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  kakao_place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,                  
  address TEXT,                        
  latitude NUMERIC,                    
  longitude NUMERIC,                   
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- users 테이블의 외래키 조건 추가 (이미 있다면 건너뜀)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_home_gym') THEN
    ALTER TABLE users ADD CONSTRAINT fk_home_gym FOREIGN KEY (home_gym_id) REFERENCES gyms(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS store_managers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  manager_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  is_approved BOOLEAN DEFAULT TRUE,
  UNIQUE(manager_id, gym_id)
);

CREATE TABLE IF NOT EXISTS equipments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('유산소', '프리웨이트', '머신', '기타')), 
  target_muscle TEXT,                  
  name TEXT NOT NULL,                  
  brand TEXT                           
);

CREATE TABLE IF NOT EXISTS gym_equipments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES equipments(id) ON DELETE CASCADE NOT NULL,
  quantity INT DEFAULT 1,              
  UNIQUE(gym_id, equipment_id)
);

CREATE TABLE IF NOT EXISTS gym_trainers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  profile_image TEXT,
  specialty TEXT,                      
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS infrastructure_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  equipment_name TEXT NOT NULL,        
  status TEXT DEFAULT 'pending',       
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, recorded_date)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gym_id UUID REFERENCES gyms(id),     
  photo_url TEXT,                      
  duration_minutes INT,                
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS feed_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  log_id UUID REFERENCES attendance_logs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(log_id, user_id)
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  log_id UUID REFERENCES attendance_logs(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES equipments(id) NOT NULL, 
  set_order INT NOT NULL,              
  weight_kg NUMERIC(5,2),              
  reps INT,                            
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);


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

-- ====================================================================================
-- Week 6: 운동 기록(CRUD) 및 종목 템플릿 관련 스키마 추가 사항
-- ====================================================================================

-- 5. equipments (마스터 기구/운동 사전) 테이블 (없을 경우 생성)
CREATE TABLE IF NOT EXISTS equipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL
);

-- 기존에 테이블이 존재할 경우 기존 데이터베이스에 컬럼이 없을 수 있으므로 직접 추가
ALTER TABLE equipments
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 기존 시스템의 type이 NOT NULL 이라서 발생하는 입력 오류를 방지
ALTER TABLE equipments ALTER COLUMN type DROP NOT NULL;

-- ON CONFLICT를 사용하기 위해 name 컬럼에 UNIQUE 제약조건 보장
ALTER TABLE equipments DROP CONSTRAINT IF EXISTS equipments_name_uniq;
ALTER TABLE equipments ADD CONSTRAINT equipments_name_uniq UNIQUE (name);

-- 5-1. 맨몸운동 마스터 데이터 기본 초기화 (CONFLICT 방지)
INSERT INTO equipments (name, category, sub_category) VALUES 
('푸쉬업', '맨몸운동', '가슴'), ('무릎 푸쉬업', '맨몸운동', '가슴'), ('다이아몬드 푸쉬업', '맨몸운동', '가슴'), ('와이드 푸쉬업', '맨몸운동', '가슴'), ('평행봉 딥스', '맨몸운동', '가슴'), 
('의자 딥스', '맨몸운동', '팔'), 
('파이크 푸쉬업', '맨몸운동', '어깨'), ('핸드스탠드 푸쉬업', '맨몸운동', '어깨'), ('플란체 연습', '맨몸운동', '어깨'),
('턱걸이', '맨몸운동', '등'), ('친업', '맨몸운동', '등'), ('인버티드 로우', '맨몸운동', '등'), ('머슬업', '맨몸운동', '등'),
('맨몸 스쿼트', '맨몸운동', '하체'), ('와이드 스쿼트', '맨몸운동', '하체'), ('점프 스쿼트', '맨몸운동', '하체'), ('워킹 런지', '맨몸운동', '하체'), ('리버스 런지', '맨몸운동', '하체'), ('사이드 런지', '맨몸운동', '하체'), ('불가리안 스플릿 스쿼트', '맨몸운동', '하체'), ('피스톨 스쿼트', '맨몸운동', '하체'), ('카프 레이즈', '맨몸운동', '하체'), ('글루트 브릿지', '맨몸운동', '하체'),
('기본 플랭크', '맨몸운동', '복근'), ('사이드 플랭크', '맨몸운동', '복근'), ('할로우 바디 홀드', '맨몸운동', '복근'), ('크런치', '맨몸운동', '복근'), ('레그 레이즈', '맨몸운동', '복근'), ('러시안 트위스트', '맨몸운동', '복근'), ('마운틴 클라이머', '맨몸운동', '복근'), ('행잉 레그 레이즈', '맨몸운동', '복근'),
('버피', '맨몸운동', '전신'), ('점핑 잭', '맨몸운동', '전신'), ('베어 크롤', '맨몸운동', '전신')
ON CONFLICT (name) DO NOTHING;

-- 6. user_custom_exercises (유저 전용 맞춤 종목 - 직접입력 백도어) 
CREATE TABLE IF NOT EXISTS user_custom_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT '기타',
  sub_category TEXT DEFAULT '기타',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name) -- 동일 유저가 같은 이름 두 번 생성 방지
);

-- 7. workout_logs (통합 운동 기록 - 하루 1개 기준)
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL, -- 오운완 거점
  date DATE DEFAULT CURRENT_DATE, -- 측정일
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0, -- 스톱워치 측정 소요시간
  photo_url TEXT, -- 인증 프사 (Cloudinary 연결용)
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- UNIQUE (user_id, date) -- 하루 여러번 운동(테스트 포함)을 위해 제약조건 해제
);

-- 기존에 UNIQUE(user_id, date) 제약조건이 걸려있다면 삭제하여 충돌 방지
ALTER TABLE workout_logs DROP CONSTRAINT IF EXISTS workout_logs_user_id_date_key;

-- 8. workout_log_items (단일 통합 기록 안의 각 '종목' 세트 기록)
CREATE TABLE IF NOT EXISTS workout_log_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE CASCADE,
  
  -- 둘 중 하나만 채워짐
  equipment_id UUID REFERENCES equipments(id) ON DELETE SET NULL,
  custom_exercise_id UUID REFERENCES user_custom_exercises(id) ON DELETE SET NULL,
  
  -- [{ "set": 1, "weight": 60, "reps": 10, "is_done": true }, ...] 구조
  sets JSONB DEFAULT '[]'::jsonb,
  
  order_index INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 추가: 보안 정책 (RLS) 해결 (모든 인증된 사용자에게 Insert 권한 부여)
-- 보통 Supabase 대시보드에서 테이블을 만들거나 수정할 때 RLS가 강제로 걸립니다.
-- =========================================================================
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_log_items ENABLE ROW LEVEL SECURITY;

-- 1. 기존의 안전방식: workout_logs는 본인 데이터만 등록/조회 가능
DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON workout_logs;
CREATE POLICY "Enable all access for users based on user_id" ON workout_logs
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. workout_log_items 보조 테이블 정책: 인증된 회원(앱 유저)이라면 등록/조회 허용
DROP POLICY IF EXISTS "Enable all for authenticated users" ON workout_log_items;
CREATE POLICY "Enable all for authenticated users" ON workout_log_items
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
