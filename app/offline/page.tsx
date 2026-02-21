'use client';

/**
 * Offline Fallback Page
 * Shown when user tries to access a route that isn't cached
 * Service worker will serve this page when offline
 */

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center text-white">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-indigo-400 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16.332a8 8 0 017.778 0M12 20v.01M12 12a4 4 0 100-8 4 4 0 000 8z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold mb-2">You're Offline</h1>

        {/* Description */}
        <p className="text-indigo-100 mb-6">
          This page isn't available offline. Check your internet connection and try again.
        </p>

        {/* Helpful content */}
        <div className="bg-indigo-500 bg-opacity-30 rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold mb-2 text-indigo-100">What you can do:</h2>
          <ul className="text-sm text-indigo-100 space-y-1">
            <li>✓ View cached leagues and standings</li>
            <li>✓ Check your roster</li>
            <li>✗ Draft players (requires connection)</li>
            <li>✗ Create new leagues (requires connection)</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-white text-indigo-600 font-semibold py-3 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Go Back
          </button>
          <a
            href="/"
            className="block w-full bg-indigo-500 text-white font-semibold py-3 rounded-lg hover:bg-indigo-600 transition-colors text-center"
          >
            Go Home
          </a>
        </div>

        {/* Connection status */}
        <div className="mt-8 pt-6 border-t border-indigo-400 border-opacity-30">
          <p className="text-xs text-indigo-200">
            The app will automatically resume when your connection is restored.
          </p>
        </div>
      </div>
    </div>
  );
}
