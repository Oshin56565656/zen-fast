let waterSettings = {
  enabled: false,
  interval: 1,
  startHour: 8,
  endHour: 23,
  lastReminder: 0,
  waterGoal: 2000,
  todayTotal: 0
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_WATER_SETTINGS') {
    waterSettings = { ...waterSettings, ...event.data.payload };
    console.log('SW: Water settings synced', waterSettings);
  }
});

async function checkWaterReminders() {
  const { enabled, interval, startHour, endHour, lastReminder, waterGoal, todayTotal } = waterSettings;
  
  if (!enabled || todayTotal >= waterGoal) return;

  const now = new Date();
  const hour = now.getHours();
  const currentTimestamp = now.getTime();

  if (hour < startHour || hour > endHour) return;

  const intervalMs = interval * 3600 * 1000;
  if (currentTimestamp - lastReminder >= intervalMs) {
    const title = 'Stay Hydrated! 💧';
    const options = {
      body: `It's time for some water. You've had ${todayTotal}ml today!`,
      icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
      badge: 'https://cdn-icons-png.flaticon.com/192/3242/3242257.png',
      tag: 'hydration-reminder',
      renotify: true
    };
    
    await self.registration.showNotification(title, options);
    waterSettings.lastReminder = currentTimestamp;
  }
}

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

// Periodic Sync attempt (requires PWA installation and support)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'water-reminder') {
    event.waitUntil(checkWaterReminders());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
