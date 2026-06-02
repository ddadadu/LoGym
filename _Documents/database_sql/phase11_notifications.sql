-- =============================================
-- 소셜 알림 시스템 스키마
-- =============================================

-- 1. 알림 기록 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 알림 받는 사람
  actor_id    uuid REFERENCES users(id) ON DELETE SET NULL,           -- 알림 발생시킨 사람
  type        text NOT NULL,   -- 'like' | 'comment' | 'follow'
  feed_id     uuid REFERENCES community_feeds(id) ON DELETE CASCADE,
  message     text NOT NULL,
  is_read     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- 2. Web Push 구독 정보 테이블
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- 3. 알림 설정 테이블 (소셜 알림 on/off 각각)
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id           uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_likes      boolean DEFAULT true,
  notify_comments   boolean DEFAULT true,
  notify_follows    boolean DEFAULT true,
  updated_at        timestamptz DEFAULT now()
);

-- RLS 정책
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- notifications: 본인 알림만 읽기/수정 가능
CREATE POLICY "notifications_self" ON notifications FOR ALL USING (auth.uid() = user_id);
-- service role은 insert 가능 (Edge Function)
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT WITH CHECK (true);

-- push_subscriptions: 본인 것만
CREATE POLICY "push_subscriptions_self" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);

-- notification_settings: 본인 것만
CREATE POLICY "notif_settings_self" ON notification_settings FOR ALL USING (auth.uid() = user_id);
