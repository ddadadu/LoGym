-- phase8_dashboard_goals.sql
-- users 테이블에 일일/주간 목표(분 단위) 및 주간 운동 횟수 목표 컬럼을 추가합니다.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS daily_goal_minutes INT DEFAULT 60,
ADD COLUMN IF NOT EXISTS weekly_goal_minutes INT DEFAULT 200,
ADD COLUMN IF NOT EXISTS weekly_goal_count INT DEFAULT 5;

-- 기존 유저들에게도 기본값을 할당하기 위해 NULL인 경우 업데이트
UPDATE public.users SET daily_goal_minutes = 60 WHERE daily_goal_minutes IS NULL;
UPDATE public.users SET weekly_goal_minutes = 200 WHERE weekly_goal_minutes IS NULL;
UPDATE public.users SET weekly_goal_count = 5 WHERE weekly_goal_count IS NULL;

-- 사용자 프로필 정보 수정 시 해당 컬럼들도 수정할 수 있게 보안 정책(RLS)은 기존 users 테이블의 정책을 그대로 따릅니다.
