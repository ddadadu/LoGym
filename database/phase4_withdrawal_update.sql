-- =========================================================================
-- [완벽한 영구 회원탈퇴 (Hard Delete) 지원 시스템 SQL]
-- 이 스크립트는 프론트엔드에서 보안 정책(RLS)을 뚫고 안전하게 
-- 자기 자신의 Auth 코어 계정을 날려버릴 수 있는 자폭 버튼 기능을 만듭니다.
-- =========================================================================

-- 기존에 파편화 된 탈퇴 함수가 있다면 충돌을 막기 위해 덮어씁니다.
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- (핵심) 함수를 실행하는 사람의 권한이 아닌, 데이터베이스 관리자(슈퍼유저)의 높은 권한으로 함수를 강제 실행하게 만듭니다.
AS $$
BEGIN
  -- 1. [완벽 안전장치] 내가 올렸던 댓글, 좋아요 등 다른 테이블들에서
  -- 외래키(Foreign Key) CASCADE 설정이 되어있지 않을 경우를 대비해
  -- 확실하게 public.users(명부) 부터 파기합니다.
  DELETE FROM public.users WHERE id = auth.uid();
  
  -- 2. [가장 중요] Supabase의 인증 서버 코어(Authentication)에서 나를 박멸합니다.
  -- 이 코드가 실행되는 순간 같은 이메일/소셜 아이디로 새로 회원가입 할 수 있는 상태가 됩니다.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
