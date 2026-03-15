'use client';

import { useEffect } from 'react';

/**
 * Client-side component to register service worker
 * Must be wrapped in SessionProvider for proper lifecycle
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register service worker in browser environment
    if (typeof window === 'undefined') return;

    // Skip service worker registration in development to avoid stale cache during dev
    if (process.env.NODE_ENV === 'development') return;

    // Check if browser supports service workers
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Workers not supported in this browser');
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      })
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully:', registration.scope);

        // Check for updates periodically (every hour)
        setInterval(() => {
          registration.update().catch((err) => {
            console.error('[SW] Error checking for updates:', err);
          });
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });

    // Notify user if new service worker is available
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Service Worker controller changed (app updated)');
        // Could show toast notification here to prompt user to reload
      });
    }
  }, []);

  return null;
}
