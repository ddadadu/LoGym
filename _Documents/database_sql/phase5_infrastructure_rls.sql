-- 1. infrastructure_requests 테이블 RLS 활성화
ALTER TABLE infrastructure_requests ENABLE ROW LEVEL SECURITY;

-- 2. 로그인한 유저는 누구나 자신의 제보(요청)를 등록할 수 있다.
DROP POLICY IF EXISTS "Users can insert own requests" ON infrastructure_requests;
CREATE POLICY "Users can insert own requests" 
ON infrastructure_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = requested_by);

-- 3. 로그인한 유저는 자신이 올린 제보(요청)를 조회할 수 있다.
DROP POLICY IF EXISTS "Users can view own requests" ON infrastructure_requests;
CREATE POLICY "Users can view own requests" 
ON infrastructure_requests 
FOR SELECT 
TO authenticated 
USING (auth.uid() = requested_by);

-- 4. 헬스장 관리자(gym manager)는 자기 점포에 접수된 모든 제보를 조회할 수 있다.
DROP POLICY IF EXISTS "Gym owners can view requests for their gym" ON infrastructure_requests;
DROP POLICY IF EXISTS "Gym managers can view requests for their gym" ON infrastructure_requests;
CREATE POLICY "Gym managers can view requests for their gym" 
ON infrastructure_requests 
FOR SELECT 
TO authenticated 
USING (
  gym_id IN (
    SELECT home_gym_id FROM users WHERE id = auth.uid() AND is_manager = true
  )
);

-- 5. 헬스장 관리자(gym manager)는 자기 점포에 접수된 제보 상태를 업데이트할 수 있다.
DROP POLICY IF EXISTS "Gym owners can update requests for their gym" ON infrastructure_requests;
DROP POLICY IF EXISTS "Gym managers can update requests for their gym" ON infrastructure_requests;
CREATE POLICY "Gym managers can update requests for their gym" 
ON infrastructure_requests 
FOR UPDATE 
TO authenticated 
USING (
  gym_id IN (
    SELECT home_gym_id FROM users WHERE id = auth.uid() AND is_manager = true
  )
);
