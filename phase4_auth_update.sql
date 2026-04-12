-- ============== [관리자 명부 조회를 위한 스키마 추가] ==============
-- 1. users 테이블에 email 저장 컬럼 추가 (중복 불가)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- 2. users 테이블에 암호화된 비밀번호 저장 컬럼 추가 (소셜 이용자는 NULL 가능)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 3. 이메일을 통한 빠른 검색을 위한 인덱싱 처리
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 참고: 해당 데이터는 Supabase 보안 설정과 무관하게 오직 관리자 시구현용 명부 기능입니다.
-- 실제 사용자들의 로그인은 백그라운드 auth.users 를 통해 안전하게 수행됩니다.
