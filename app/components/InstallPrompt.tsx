'use client';

import { useEffect, useState } from 'react';

/**
 * InstallPrompt Component
 * Detects when app is installable and shows install button
 * Works on Android/Chrome, limited on iOS Safari
 */
export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Check if already installed (display-mode: standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app install success
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setIsVisible(false);
      setInstallPrompt(null);
    });

    // Detect standalone mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', (e) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsVisible(false);
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      // Show the install prompt
      installPrompt.prompt();

      // Wait for user choice
      const { outcome } = await installPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        setIsVisible(false);
      } else {
        console.log('[PWA] User dismissed install prompt');
      }

      // Clear the prompt
      setInstallPrompt(null);
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Don't clear installPrompt, user can still install later
  };

  // Don't show if already installed or no install support
  if (isInstalled || !isVisible || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-xs bg-indigo-600 text-white rounded-lg shadow-lg p-4 z-50 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install App</h3>
          <p className="text-xs text-indigo-100">
            Add Fantasy Homerun Tracker to your home screen for quick access
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-indigo-200 hover:text-white transition-colors"
          aria-label="Dismiss install prompt"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 bg-white text-indigo-600 font-medium text-sm py-2 px-3 rounded hover:bg-indigo-50 transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 bg-indigo-700 text-white text-sm py-2 px-3 rounded hover:bg-indigo-800 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
