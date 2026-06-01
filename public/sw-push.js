// public/sw-push.js
// VitePWA의 기본 SW에 추가로 주입되는 Push 이벤트 핸들러

self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'LoGym', body: event.data.text() };
  }

  const title = data.title || 'LoGym';
  const options = {
    body: data.body || '새 알림이 있습니다.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: {
      type: data.type,
      feedId: data.feedId,
      url: data.type === 'follow' ? '/community' : '/community',
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
