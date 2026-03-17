/**
 * Service Worker for Fantasy Homerun Tracker PWA
 * Handles push notifications, offline caching, and network strategies
 */

// Cache names with versioning
const STATIC_CACHE = 'homerun-static-v1';
const API_CACHE = 'homerun-api-v1';
const OFFLINE_PAGE = '/offline';

// Track which leagues user is actively drafting in (suppress draft notifications)
const activeDraftingLeagues = new Set();

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
 * Handle messages from client about active drafting
 * Suppresses draft notifications when user is actively in the draft room
 */
self.addEventListener('message', (event) => {
  const { type, leagueId } = event.data || {};

  if (type === 'DRAFTING_ACTIVE') {
    console.log('[SW] User is actively drafting in league:', leagueId);
    activeDraftingLeagues.add(leagueId);
  } else if (type === 'DRAFTING_INACTIVE') {
    console.log('[SW] User left draft room for league:', leagueId);
    activeDraftingLeagues.delete(leagueId);
  }
});

/**
 * Handle incoming push notifications
 * Displays notification with title, body, icon, and badge
 * Suppresses draft turn notifications if user is actively drafting
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

    // Suppress draft turn notifications if user is actively drafting
    if (eventType === 'turn' && activeDraftingLeagues.has(leagueId)) {
      console.log('[SW] Suppressed draft turn notification (user is actively drafting)', {
        leagueId,
        eventType,
      });
      return;
    }

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

    // Guard against browsers without Notification API (iOS Chrome, etc.)
    if (typeof Notification !== 'undefined') {
      event.waitUntil(
        self.registration.showNotification(title, options).catch((err) => {
          console.error('[SW] Error showing notification:', err);
        })
      );

      console.log('[SW] Push notification displayed:', { title, body, eventType });
    } else {
      console.log('[SW] Notification API not supported, skipping notification display');
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }
});

/**
 * Handle notification clicks
 * Navigate user to relevant page based on eventType
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const data = event.notification.data || {};
  const { leagueId, eventType, playerId } = data;

  if (action === 'close') return;

  // Determine deep link based on event type
  let targetUrl = '/scores'; // default fallback

  if (eventType === 'homerun' && leagueId) {
    targetUrl = `/league/${leagueId}?tab=leaderboard`;
  } else if (eventType === 'turn' && leagueId) {
    targetUrl = `/draft/${leagueId}`;
  } else if (eventType === 'trade' && leagueId) {
    targetUrl = `/league/${leagueId}?tab=trades`;
  } else if (eventType === 'league_update' && leagueId) {
    targetUrl = `/league/${leagueId}`;
  } else if (leagueId) {
    targetUrl = `/league/${leagueId}`;
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus and navigate
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        // App not open — open new window
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
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, responseClone));
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
        const responseClone = response.clone();
        caches.open(API_CACHE).then((c) => c.put(request, responseClone));
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
