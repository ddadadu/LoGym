-- 1. 로그인한 유저는 자신이 올린 "대기 중(pending)"인 제보를 수정할 수 있다.
CREATE POLICY "Users can update own pending requests" 
ON infrastructure_requests 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = requested_by AND status = 'pending');

-- 2. 로그인한 유저는 자신이 올린 "대기 중(pending)"인 제보를 취소(삭제)할 수 있다.
CREATE POLICY "Users can delete own pending requests" 
ON infrastructure_requests 
FOR DELETE 
TO authenticated 
USING (auth.uid() = requested_by AND status = 'pending');
