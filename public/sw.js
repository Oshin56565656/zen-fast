// v2 - Force update
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'FastTrack';
  const options = {
    body: data.body ?? '',
    icon: 'https://cdn-icons-png.flaticon.com/512/9165/9165743.png?v=2',
    badge: 'https://cdn-icons-png.flaticon.com/192/9165/9165743.png?v=2',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
