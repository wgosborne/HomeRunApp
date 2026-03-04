"use client";

import { useState } from "react";

interface DevPanelProps {
  leagueId: string;
  currentState?: {
    round: number;
    pickNumber: number;
    pickerName: string;
    timeRemainingSeconds: number;
  };
  onStatusChange?: () => void;
}

export function DevPanel({ leagueId, currentState, onStatusChange }: DevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Only show in development mode
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleAction = async (action: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/draft/${leagueId}/${action}`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} draft`);
      }

      onStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg hover:bg-amber-600 font-bold text-lg"
        title="Dev Panel"
      >
        🛠️
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg p-4 w-80 border-2 border-amber-500 max-h-96 overflow-y-auto">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 mb-2">Dev Panel</h3>
            <p className="text-xs text-gray-600 mb-3">League ID: {leagueId}</p>

            {/* Current State Display */}
            {currentState && (
              <div className="bg-gray-50 rounded p-2 mb-3 text-xs font-mono">
                <div>Round: <span className="font-bold">{currentState.round}</span></div>
                <div>Pick: <span className="font-bold">{currentState.pickNumber}</span></div>
                <div>Picker: <span className="font-bold">{currentState.pickerName}</span></div>
                <div>Time: <span className="font-bold">{currentState.timeRemainingSeconds}s</span></div>
                <div>Server Time: <span className="font-bold">{new Date().toLocaleTimeString()}</span></div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => handleAction("pause")}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? "..." : "Pause"}
            </button>

            <button
              onClick={() => handleAction("resume")}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? "..." : "Resume"}
            </button>

            <button
              onClick={() => handleAction("autopick")}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
            >
              {loading ? "..." : "Auto-Pick"}
            </button>

            <button
              onClick={() => {
                if (confirm("Reset draft? This will delete all picks.")) {
                  handleAction("reset");
                }
              }}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              {loading ? "..." : "Reset"}
            </button>
          </div>

          {/* Divider */}
          <hr className="my-3" />

          {/* Debug Info */}
          <div className="text-xs text-gray-600">
            <p className="font-semibold mb-1">Debug Info:</p>
            <p>NODE_ENV: {process.env.NODE_ENV}</p>
            <p>Dev Mode: {process.env.NODE_ENV === "development" ? "ON" : "OFF"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
