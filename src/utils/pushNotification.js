// src/utils/pushNotification.js
// Web Push 구독 등록 / 저장 / 알림 발송 유틸

import { supabase } from '../supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** URL-safe base64 → Uint8Array 변환 (VAPID 공개키 파싱용) */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/**
 * 브라우저 Web Push 구독 등록 후 Supabase에 저장
 * @returns {boolean} 성공 여부
 */
export async function subscribeToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint, keys } = subscription.toJSON();

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, { onConflict: 'user_id, endpoint' });

    if (error) {
      console.error('Push subscription save error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Push subscription error:', err);
    return false;
  }
}

/**
 * 알림 기록 저장 + Edge Function을 통해 Web Push 발송
 * @param {object} params
 * @param {string} params.userId      - 알림 받을 사람 ID
 * @param {string} params.actorId     - 알림 발생시킨 사람 ID
 * @param {string} params.type        - 'like' | 'comment' | 'follow'
 * @param {string} params.message     - 알림 메시지
 * @param {string} [params.feedId]    - 관련 피드 ID (옵션)
 */
export async function sendNotification({ userId, actorId, type, message, feedId }) {
  // 자기 자신에게는 알림 미발송
  if (userId === actorId) return;

  try {
    // 1. 수신자 알림 설정 확인
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('notify_likes, notify_comments, notify_follows')
      .eq('user_id', userId)
      .maybeSingle();

    if (settings) {
      if (type === 'like' && !settings.notify_likes) return;
      if (type === 'comment' && !settings.notify_comments) return;
      if (type === 'follow' && !settings.notify_follows) return;
    }

    // 2. notifications 테이블에 기록
    await supabase.from('notifications').insert({
      user_id: userId,
      actor_id: actorId,
      type,
      message,
      feed_id: feedId || null,
    });

    // 3. Edge Function 호출해서 Web Push 발송
    await supabase.functions.invoke('send-push', {
      body: { userId, title: 'LoGym', body: message, type, feedId },
    });
  } catch (err) {
    // 알림 실패는 조용히 처리 (메인 기능에 영향 없게)
    console.warn('Notification send failed:', err);
  }
}
