-- Phase 2: 프로필 신체 정보 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS height integer;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight numeric(5,1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_weight numeric(5,1);

-- Phase 3: 소셜 커뮤니티용 Follows, Feeds 테이블 추가
CREATE TABLE IF NOT EXISTS follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references users(id) on delete cascade not null,
  followed_id uuid references users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(follower_id, followed_id)
);

CREATE TABLE IF NOT EXISTS community_feeds (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) on delete cascade not null,
  workout_log_id uuid references workout_logs(id) on delete cascade,
  content text,
  likes_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS(Row Level Security) 강제 활성화 방지 및 접근 권한 열어두기 (퍼블릭 베타 수준 허용)
----------
-- ※ 필요시 RLS 정책을 활성화하되, 현재는 빠른 개발을 위해 접근 가능한 구조로 권한 부여
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_feeds ENABLE ROW LEVEL SECURITY;

-- 누구나 피드를 볼 수 있음
CREATE POLICY "Public profiles are viewable by everyone." ON follows FOR SELECT USING (true);
CREATE POLICY "Public feeds are viewable by everyone." ON community_feeds FOR SELECT USING (true);

-- 자기 자신의 팔로우 액션/피드만 Insert, Update, Delete 가능
CREATE POLICY "Users can insert their own follows." ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete their own follows." ON follows FOR DELETE USING (auth.uid() = follower_id);

CREATE POLICY "Users can create their own feeds." ON community_feeds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own feeds." ON community_feeds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own feeds." ON community_feeds FOR DELETE USING (auth.uid() = user_id);
