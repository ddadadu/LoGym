-- 1. 사용자별 부위별 최대 볼륨 저장 테이블
CREATE TABLE user_muscle_max_volume (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muscle_group  TEXT NOT NULL,
  max_volume    NUMERIC NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, muscle_group)
);

-- 2. RLS 활성화
ALTER TABLE user_muscle_max_volume ENABLE ROW LEVEL SECURITY;

-- 3. 본인 데이터만 접근 가능한 정책 생성
CREATE POLICY "user_muscle_max_volume_self"
  ON user_muscle_max_volume
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
