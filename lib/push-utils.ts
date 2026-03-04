/**
 * Push notification utilities for iOS and cross-platform support
 * Handles service worker registration, VAPID conversion, and subscription
 */

/**
 * Ensures service worker is registered and active
 * Waits for activation before returning the registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers not supported');
  }

  // Try to get existing registration
  const existingReg = await navigator.serviceWorker.getRegistration();
  if (existingReg) {
    // If already active, return it
    if (existingReg.active) {
      return existingReg;
    }

    // Wait for it to become active
    await new Promise<void>((resolve) => {
      const sw = existingReg.installing || existingReg.waiting;
      if (!sw) {
        resolve();
        return;
      }
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') {
          resolve();
        }
      });
    });

    return existingReg;
  }

  // Register fresh if no existing registration
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Converts VAPID public key from base64url to Uint8Array for browser API
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Converts ArrayBuffer to base64 string for sending to server
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Saves subscription to server via API
 */
export async function saveSubscriptionToServer(
  subscription: PushSubscription
): Promise<void> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error || 'Failed to save subscription to server'
    );
  }
}

/**
 * Subscribes user to push notifications after permission is granted
 * Requires service worker to be registered and Notification.permission === 'granted'
 */
export async function subscribeUserToPush(): Promise<PushSubscription> {
  try {
    const registration = await getServiceWorkerRegistration();

    // Check if already subscribed
    const existingSubscription =
      await registration.pushManager.getSubscription();
    if (existingSubscription) {
      // Send to server in case it wasn't saved
      await saveSubscriptionToServer(existingSubscription);
      return existingSubscription;
    }

    // Subscribe fresh
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      throw new Error('VAPID public key not configured');
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    await saveSubscriptionToServer(subscription);
    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    throw error;
  }
}

/**
 * Detects if user is on iOS Safari browser (not the installed app)
 * Returns true if on iOS but NOT in standalone mode (installed app)
 */
export function isIOSBrowser(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  return isIOS && !isInStandaloneMode;
}
