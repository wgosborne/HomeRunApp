'use client';

import { useEffect, useState } from 'react';

/**
 * OfflineIndicator Component
 * Shows connection status when user is offline
 * Automatically hidden when connection restored
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[Offline] Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[Offline] Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only render on client side
  if (!mounted) return null;

  // Don't show when online
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-3 z-50 flex items-center gap-2">
      <div className="flex-shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.111 16.332a8 8 0 017.778 0M12 20v.01M12 12a4 4 0 100-8 4 4 0 000 8z"
          />
        </svg>
      </div>
      <span className="text-sm font-medium">You're offline. Some features may be limited.</span>
    </div>
  );
}
