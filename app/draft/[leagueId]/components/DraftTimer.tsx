"use client";

import { useEffect, useState } from "react";

interface DraftTimerProps {
  timeRemainingSeconds: number; // Server-provided remaining time
  isCurrentPicker: boolean;
}

export function DraftTimer({
  timeRemainingSeconds,
  isCurrentPicker,
}: DraftTimerProps) {
  const [displayTime, setDisplayTime] = useState(timeRemainingSeconds);

  useEffect(() => {
    // Initialize with server time
    setDisplayTime(timeRemainingSeconds);

    // Update locally every second (client-side countdown between server updates)
    const interval = setInterval(() => {
      setDisplayTime((prev) => {
        const nextTime = prev - 1;
        return nextTime >= 0 ? nextTime : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemainingSeconds]);

  // Color changes based on time remaining
  let colorClass = "text-green-500";
  if (displayTime <= 10) {
    colorClass = "text-red-500";
  } else if (displayTime <= 20) {
    colorClass = "text-yellow-500";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm font-semibold text-gray-600">Time Remaining</div>
      <div className={`text-5xl font-bold ${colorClass} font-mono`}>
        {displayTime}s
      </div>
      {!isCurrentPicker && (
        <div className="text-xs text-gray-500 italic">Waiting for other picker...</div>
      )}
    </div>
  );
}
