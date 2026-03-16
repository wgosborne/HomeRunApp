"use client";

import { useEffect } from "react";
import { setCached } from "@/lib/client-cache";

/**
 * Prefetches all tab data on app load (fires once at startup, not per-page)
 * Populates client-side cache so tabs load instantly
 */
export function DataPrefetcher() {
  useEffect(() => {
    // Prefetch Scores
    fetch("/api/games/today")
      .then((r) => r.ok && r.json())
      .then((data) => data && setCached("scores-today", data))
      .catch(() => {});

    // Prefetch Leagues
    fetch("/api/leagues")
      .then((r) => r.ok && r.json())
      .then((data) => data && setCached("leagues-list", data))
      .catch(() => {});

    // Prefetch HR Leaders (all players)
    fetch("/api/players?limit=5000")
      .then((r) => r.ok && r.json())
      .then((data) => data && setCached("hr-leaders", data))
      .catch(() => {});
  }, []);

  return null;
}
