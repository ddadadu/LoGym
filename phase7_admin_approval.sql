-- phase7_admin_approval.sql

-- 1. store_managers 테이블 확장
ALTER TABLE store_managers
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS business_registration_url TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- 2. 기존 데이터 마이그레이션 및 기본값 처리
UPDATE store_managers 
SET status = 'approved' 
WHERE is_approved = TRUE;

-- 기존 is_approved 컬럼은 더 이상 주력으로 사용하지 않고 status를 사용합니다.
-- 새로 들어오는 점포 관리자는 기본값이 pending이 되도록 설정
ALTER TABLE store_managers ALTER COLUMN is_approved SET DEFAULT FALSE;

-- 3. RLS 정책 업데이트 (필요한 경우)
-- store_managers의 경우 인증된 사용자면 조회 가능하도록, 
-- 하지만 본인의 것만 생성/수정 가능하도록 설정 (또는 어드민만 수정 가능하도록)
-- 여기서는 MVP를 위해 기존 정책을 유지하거나 느슨하게 둡니다.

-- Admin 권한 확인을 위해 users 테이블에 is_admin 컬럼 추가 (선택사항이나, role 관리를 위해)
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
