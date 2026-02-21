/**
 * Service Worker for Fantasy Homerun Tracker PWA
 * Handles push notifications and offline functionality
 */

// Log service worker lifecycle
self.addEventListener('install', () => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

/**
 * Handle incoming push notifications
 * Displays notification with title, body, icon, and badge
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push event with no data');
    return;
  }

  try {
    const data = event.data.json();
    const {
      title = 'Fantasy Homerun Tracker',
      body = 'New notification',
      icon = '/icon-192x192.png',
      badge = '/badge-72x72.png',
      tag = 'homerun-tracker',
      leagueId,
      playerId,
      eventType,
    } = data;

    const options = {
      body,
      icon,
      badge,
      tag, // Groups notifications of same type
      requireInteraction: false, // Auto-dismiss after timeout
      data: {
        leagueId,
        playerId,
        eventType,
        url: `/league/${leagueId}`,
      },
      // Web Notification API supports these visual options
      actions: [
        {
          action: 'open',
          title: 'Open',
          icon: '/icon-action-open.png',
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-action-close.png',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title, options).catch((err) => {
        console.error('[SW] Error showing notification:', err);
      })
    );

    console.log('[SW] Push notification displayed:', { title, body, eventType });
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }
});

/**
 * Handle notification clicks
 * Navigate user to relevant page
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, data } = event;
  const { url, leagueId } = data || {};

  // Determine which URL to navigate to based on action
  let targetUrl = url || '/';
  if (action === 'close') {
    // Do nothing, just close
    return;
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if window already open to this league
        for (const client of clientList) {
          if (client.url.includes(`/league/${leagueId}`) && 'focus' in client) {
            return client.focus();
          }
        }

        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
      .catch((err) => {
        console.error('[SW] Error handling notification click:', err);
      })
  );
});

/**
 * Handle notification close (optional)
 * Can log analytics or clean up state
 */
self.addEventListener('notificationclose', (event) => {
  const { data } = event.notification;
  console.log('[SW] Notification closed:', { data });
});

/**
 * Fetch event handler for offline support (optional)
 * Can be extended to cache resources and serve from cache when offline
 */
self.addEventListener('fetch', (event) => {
  // For now, just let requests pass through
  // This can be enhanced later for offline PWA support (Week 5)
});
