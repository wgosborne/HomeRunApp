/**
 * Service Worker for Fantasy Homerun Tracker PWA
 * Handles push notifications, offline caching, and network strategies
 */

// Cache names with versioning
const STATIC_CACHE = 'homerun-static-v1';
const API_CACHE = 'homerun-api-v1';
const OFFLINE_PAGE = '/offline';

// Assets to cache on install (static resources)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/badge-72x72.png',
  '/offline',
];

// Log service worker lifecycle
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
        // Don't fail install if some assets fail
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
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
 * Cache strategies for different request types
 */

// Cache-first strategy: Use cache, fallback to network
function cacheFirst(request) {
  return caches.match(request).then((response) => {
    if (response) {
      return response;
    }
    return fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const cache = caches.open(STATIC_CACHE);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => {
        // Offline and no cache
        if (request.destination === 'document') {
          return caches.match(OFFLINE_PAGE);
        }
        return null;
      });
  });
}

// Network-first strategy: Try network, fallback to cache
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      // Cache successful API responses
      if (response && response.status === 200 && request.method === 'GET') {
        const cache = caches.open(API_CACHE);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => {
      // Network failed, try cache
      return caches.match(request).then((response) => {
        if (response) {
          console.log('[SW] Serving from cache:', request.url);
          return response;
        }
        // No cache and offline
        if (request.destination === 'document') {
          return caches.match(OFFLINE_PAGE);
        }
        return null;
      });
    });
}

/**
 * Fetch event handler
 * Routes requests to appropriate caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API endpoints: network-first (try network, fallback to cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (CSS, JS, fonts, images): cache-first
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages: network-first
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(request));
});
