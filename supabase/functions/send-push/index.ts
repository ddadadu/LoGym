// supabase/functions/send-push/index.ts
// Web Push 알림 발송 Edge Function (Deno)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── VAPID 서명 유틸 ──────────────────────────────────────────────
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const raw = atob(padded);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function createVapidJwt(audience: string, privateKeyB64: string, email: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: `mailto:${email}` };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const rawKey = base64UrlDecode(privateKeyB64);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    // Wrap raw key in PKCS8 structure for P-256
    buildPkcs8(rawKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function buildPkcs8(rawKey: Uint8Array): ArrayBuffer {
  // PKCS8 wrapper for P-256 private key
  const header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
  ]);
  const result = new Uint8Array(header.length + rawKey.length);
  result.set(header);
  result.set(rawKey, header.length);
  return result.buffer;
}

async function sendWebPush(subscription: {endpoint: string; p256dh: string; auth: string}, payload: string) {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'admin@logym.com';

  const jwt = await createVapidJwt(audience, vapidPrivateKey, vapidEmail);

  const headers: Record<string, string> = {
    'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
    'Content-Type': 'application/octet-stream',
    'TTL': '86400',
  };

  // Encrypt payload using Web Push encryption (simplified - send as text for now)
  const encoder = new TextEncoder();
  const body = encoder.encode(payload);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers,
    body,
  });

  return response;
}

// ── 메인 핸들러 ─────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    });
  }

  try {
    const { userId, title, body, type, feedId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 해당 유저의 push 구독 정보 조회
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (error || !subscriptions?.length) {
      return new Response(JSON.stringify({ message: 'no subscriptions' }), { status: 200 });
    }

    const payload = JSON.stringify({ title, body, type, feedId });

    // 모든 구독에 발송
    const results = await Promise.allSettled(
      subscriptions.map(sub => sendWebPush(sub, payload))
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) {
      console.error('Some pushes failed:', failed);
    }

    return new Response(JSON.stringify({ sent: subscriptions.length, failed: failed.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (err) {
    console.error('send-push error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
