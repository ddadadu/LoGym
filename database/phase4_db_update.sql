-- Phase 4: 커뮤니티 고급화 (선택 발행 및 좋아요/댓글 기능) DB 마이그레이션

-- 1. 피드 옵션 저장 공간 추가 (사진 숨김, 선택된 특정 종목 UUID들 보관용)
ALTER TABLE community_feeds
  ADD COLUMN IF NOT EXISTS feed_options JSONB DEFAULT '{}'::jsonb;
  
-- 2. 좋아요 중복 통제 및 기록 보관 테이블
CREATE TABLE IF NOT EXISTS community_feed_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  feed_id UUID REFERENCES community_feeds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(feed_id, user_id) -- 한 사람이 여러 번 누르는 것 방지
);

-- 3. 개별 피드 댓글 전용 테이블
CREATE TABLE IF NOT EXISTS community_feed_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  feed_id UUID REFERENCES community_feeds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS (보안 정책) 활성화 방지 및 앱 내 자유 접근 허용
ALTER TABLE community_feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public likes viewable by everyone" ON community_feed_likes FOR SELECT USING (true);
CREATE POLICY "Public comments viewable by everyone" ON community_feed_comments FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON community_feed_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON community_feed_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can create comments" ON community_feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON community_feed_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON community_feed_comments FOR DELETE USING (auth.uid() = user_id);
