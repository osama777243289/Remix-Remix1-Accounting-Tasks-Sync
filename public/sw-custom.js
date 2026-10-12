// Custom Service Worker logic to handle system notification clicks and dismissal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;

  // Dismiss/remove the notification from the system tray
  notification.close();

  // Extract target view and ID details
  const data = notification.data || {};
  let targetUrl = '/';

  if (data.targetView) {
    targetUrl = '/?notifView=' + encodeURIComponent(data.targetView) +
                '&notifId=' + encodeURIComponent(data.targetId || '') +
                '&notifCode=' + encodeURIComponent(data.targetCode || '');
  } else if (data.url) {
    targetUrl = data.url;
  }

  // Handle opening or focusing the app and navigating to the specific item
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 1. Try to find an existing app window and navigate it
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const serviceWorkerUrl = new URL(self.registration.scope);
          if (clientUrl.origin === serviceWorkerUrl.origin) {
            return client.focus().then((focusedClient) => {
              return focusedClient.navigate(targetUrl);
            });
          }
        }
        // 2. If no window is open, open a new one with the target parameters
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
