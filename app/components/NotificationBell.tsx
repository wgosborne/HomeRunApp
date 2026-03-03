'use client';

import { useEffect, useState } from 'react';

interface NotificationBellProps {
  leagueId: string;
  className?: string;
}

export function NotificationBell({ leagueId, className = '' }: NotificationBellProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check notification support on mount
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);
    setPermissionStatus(Notification.permission);

    if (supported) {
      // Check if already subscribed
      checkSubscriptionStatus();
    }
  }, [leagueId]);

  /**
   * Check if user has an active subscription for this league
   */
  async function checkSubscriptionStatus() {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // We have a subscription - assume it's active
        // In production, you might verify with backend
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }

  /**
   * Request notification permission and subscribe
   */
  async function handleSubscribe() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Step 1: Request notification permission
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);

        if (permission !== 'granted') {
          setErrorMessage(
            permission === 'denied'
              ? 'Notifications permission denied. Check your browser settings.'
              : 'Please grant notification permission to continue.'
          );
          setIsLoading(false);
          return;
        }
      } else if (Notification.permission === 'denied') {
        setErrorMessage('Notification permission denied. Please enable in browser settings.');
        setIsLoading(false);
        return;
      }

      // Step 2: Get service worker registration
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      const registration = await navigator.serviceWorker.ready;

      // Step 3: Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      // Step 4: Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Step 5: Send subscription to backend
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueId,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: arrayBufferToBase64(subscription.getKey('auth')),
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save subscription');
      }

      setIsSubscribed(true);
      setShowMenu(false);
      setErrorMessage(null);

      // Show confirmation
      new Notification('Dingerz', {
        body: 'You are now subscribed to notifications for this league!',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to subscribe');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async function handleUnsubscribe() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        throw new Error('No subscription found');
      }

      // Notify backend to remove subscription
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueId,
          endpoint: subscription.endpoint,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unsubscribe');
      }

      // Unsubscribe from push manager
      await subscription.unsubscribe();
      setIsSubscribed(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to unsubscribe');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isSupported) {
    return null; // Don't show bell if notifications not supported
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        title="Notification settings"
        disabled={isLoading}
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Notification dot if subscribed */}
        {isSubscribed && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full" />
        )}
      </button>

      {/* Menu */}
      {showMenu && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4">
            {/* Title */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setShowMenu(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Status */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">
                Status:{' '}
                <span
                  className={isSubscribed ? 'text-green-600 font-semibold' : 'text-gray-600'}
                >
                  {isSubscribed ? 'Enabled' : 'Disabled'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isSubscribed
                  ? 'You will receive notifications for homeruns, your draft turn, and trades.'
                  : 'Enable notifications to stay updated on important league events.'}
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Permission Info */}
            {permissionStatus === 'denied' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Notification permission is blocked. Please check your browser settings.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!isSubscribed ? (
                <button
                  onClick={handleSubscribe}
                  disabled={isLoading || permissionStatus === 'denied'}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  {isLoading ? 'Enabling...' : 'Enable Notifications'}
                </button>
              ) : (
                <button
                  onClick={handleUnsubscribe}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  {isLoading ? 'Disabling...' : 'Disable Notifications'}
                </button>
              )}
            </div>

            {/* Footer Info */}
            <p className="text-xs text-gray-500 mt-4">
              Notifications use your browser's push notification system. Your data is never shared.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Convert URL-safe base64 to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
