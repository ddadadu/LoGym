-- 1. gym_trainers 테이블 스키마 보완
ALTER TABLE gym_trainers 
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) DEFAULT 5.0;

-- 2. RLS(Row Level Security) 활성화
ALTER TABLE gym_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_trainers ENABLE ROW LEVEL SECURITY;

-- 3. gym_equipments RLS 정책

-- 3-1. 누구나 조회 가능 (헬스장 정보 확인용)
DROP POLICY IF EXISTS "Anyone can view gym equipments" ON gym_equipments;
CREATE POLICY "Anyone can view gym equipments" 
ON gym_equipments FOR SELECT 
USING (true);

-- 3-2. 점포 관리자는 자신의 점포 기구만 관리 가능
DROP POLICY IF EXISTS "Gym managers can manage own gym equipments" ON gym_equipments;
CREATE POLICY "Gym managers can manage own gym equipments" 
ON gym_equipments FOR ALL 
TO authenticated
USING (
  gym_id IN (
    SELECT home_gym_id FROM users WHERE id = auth.uid() AND is_manager = true
  )
)
WITH CHECK (
  gym_id IN (
    SELECT home_gym_id FROM users WHERE id = auth.uid() AND is_manager = true
  )
);

-- 4. gym_trainers RLS 정책

-- 4-1. 누구나 조회 가능
DROP POLICY IF EXISTS "Anyone can view gym trainers" ON gym_trainers;
CREATE POLICY "Anyone can view gym trainers" 
ON gym_trainers FOR SELECT 
USING (true);

-- 4-2. 점포 관리자는 자신의 점포 트레이너만 관리 가능
DROP POLICY IF EXISTS "Gym managers can manage own gym trainers" ON gym_trainers;
CREATE POLICY "Gym managers can manage own gym trainers" 
ON gym_trainers FOR ALL 
TO authenticated
USING (
  gym_id IN (
    SELECT home_gym_id FROM users WHERE id = auth.uid() AND is_manager = true
  )
)
WITH CHECK (
  gym_id IN (
    SELECT home_gym_id FROM users WHERE id = auth.uid() AND is_manager = true
  )
);
