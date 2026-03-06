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
    console.log(`[DRAFT-TIMER] Initialized with ${timeRemainingSeconds}s remaining`);

    // Update locally every second (client-side countdown between server updates)
    const interval = setInterval(() => {
      setDisplayTime((prev) => {
        const nextTime = prev - 1;
        if (nextTime === 0) {
          console.log("[DRAFT-TIMER] COUNTDOWN REACHED 0 - AUTOPICK SHOULD FIRE");
        }
        if (nextTime < 0) {
          console.log("[DRAFT-TIMER] COUNTDOWN WENT NEGATIVE - Capping at 0");
        }
        return nextTime >= 0 ? nextTime : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemainingSeconds]);

  // Color changes based on time remaining
  let timerColor = "#6BAED6";
  let pulseClass = "";
  if (displayTime <= 10) {
    timerColor = "#CC3433";
    pulseClass = "pulse-live";
  } else if (displayTime <= 20) {
    timerColor = "#FBBF24";
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div
        style={{
          fontFamily: "'Exo 2', sans-serif",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
          textShadow: "0 0 16px rgba(204,52,51,0.35), 0 0 32px rgba(204,52,51,0.15)",
        }}
      >
        Time Remaining
      </div>
      <div
        className={pulseClass}
        style={{
          fontFamily: "'Courier Prime', monospace",
          fontSize: "72px",
          fontWeight: 800,
          color: timerColor,
          lineHeight: "1",
          textShadow: `0 0 12px ${timerColor}40`,
          letterSpacing: "2px",
        }}
      >
        {displayTime}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "12px",
          color: "rgba(255,255,255,0.3)",
          fontStyle: "italic",
        }}
      >
        {!isCurrentPicker ? "Waiting for other picker..." : isCurrentPicker && displayTime <= 10 ? "Hurry!" : ""}
      </div>
    </div>
  );
}
