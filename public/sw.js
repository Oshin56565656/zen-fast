self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'AllRound';
  const options = {
    body: data.body ?? '',
    icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
    badge: 'https://cdn-icons-png.flaticon.com/192/3242/3242257.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
