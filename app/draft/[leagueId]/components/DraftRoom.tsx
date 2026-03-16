"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { LoadingScreen } from "@/app/components/LoadingScreen";
import { PlayerSearch } from "./PlayerSearch";
import { DevPanel } from "./DevPanel";
import { DraftTeamsRoster } from "./DraftTeamsRoster";
import { DraftOrderTab } from "./DraftOrderTab";

interface Player {
  id: string;
  mlbId: number;
  name: string;
  position: string;
  team: string;
  homeRuns?: number;
  rank?: number;
}

interface DraftStatus {
  leagueId: string;
  isDraftActive: boolean;
  currentRound: number;
  currentPickNumber: number;
  currentPickerId: string;
  currentPickerName: string;
  timeRemainingSeconds: number;
  timeStarted: number;
  totalPicks: number;
  completedPicks: number;
  draftStartedAt: string | null;
  memberCount: number;
  members: Array<{
    userId: string;
    userName: string;
    teamName: string;
  }>;
}

interface Pick {
  round: number;
  pickNumber: number;
  pickerName: string;
  playerName: string;
  timestamp: number;
}

interface DraftRoomProps {
  leagueId: string;
  userId: string;
}

export function DraftRoom({ leagueId, userId }: DraftRoomProps) {
  const router = useRouter();
  const [status, setStatus] = useState<DraftStatus | null>(null);
  const [_picks, _setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [allContentLoaded, setAllContentLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"picks" | "rosters" | "order">("picks");
  const [displayTime, setDisplayTime] = useState(0);
  const [autopickFiredForPick, setAutopickFiredForPick] = useState<number | null>(null); // Track which pick triggered autopick

  // Fetch draft status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/draft/${leagueId}/status`);
      if (!response.ok) {
        throw new Error("Failed to fetch draft status");
      }
      const data = await response.json();
      console.log(`[DRAFT-ROOM] Fetched status: pick ${data.currentPickNumber}/${data.totalPicks}, time=${data.timeRemainingSeconds}s, picker=${data.currentPickerName}`);
      setStatus(data);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error fetching status";
      console.error("[DRAFT-ROOM] Error fetching status:", errMsg);
      setError(errMsg);
    }
  }, [leagueId]);

  // Initial load - wait for fetchStatus to complete before clearing loading state
  useEffect(() => {
    const load = async () => {
      await fetchStatus();
      setLoading(false);
      // Reset content loaded state when fresh load occurs
      setAllContentLoaded(false);
    };
    load();
  }, [fetchStatus]);

  // Polling: refresh status every 20 seconds
  useEffect(() => {
    console.log("[DRAFT-ROOM] Starting status polling every 20s");
    const interval = setInterval(() => {
      console.log("[DRAFT-ROOM] Polling status...");
      fetchStatus();
    }, 20000);
    return () => {
      console.log("[DRAFT-ROOM] Stopped status polling");
      clearInterval(interval);
    };
  }, [fetchStatus]);

  // Pusher real-time subscription
  useEffect(() => {
    const channel = pusherClient.subscribe(`draft-${leagueId}`);

    // Listen for pick made events
    const handlePickMade = (data: any) => {
      console.log("[PUSHER] Pick made event received:", {
        playerName: data.playerName,
        pickerName: data.pickerName,
        pickNumber: data.pickNumber,
        isAutoPick: data.isAutoPick,
      });
      fetchStatus();
    };

    // Listen for draft state change events
    const handleDraftStateChange = (data: any) => {
      console.log("[PUSHER] Draft state changed:", data);
      fetchStatus();
    };

    // Listen for draft reset
    const handleDraftReset = (data: any) => {
      console.log("[PUSHER] Draft reset event received", data);
      setTimeout(() => {
        router.push(`/league/${leagueId}`);
      }, 1000);
    };

    channel.bind("pick-made", handlePickMade);
    channel.bind("draft:paused", handleDraftStateChange);
    channel.bind("draft:resumed", handleDraftStateChange);
    channel.bind("draft:completed", handleDraftStateChange);
    channel.bind("draft:reset", handleDraftReset);

    return () => {
      channel.unbind("pick-made", handlePickMade);
      channel.unbind("draft:paused", handleDraftStateChange);
      channel.unbind("draft:resumed", handleDraftStateChange);
      channel.unbind("draft:completed", handleDraftStateChange);
      channel.unbind("draft:reset", handleDraftReset);
    };
  }, [leagueId, router, fetchStatus]);

  // Client-side autopick trigger: Fire exactly when timer hits 0
  useEffect(() => {
    // Only trigger if:
    // 1. Draft is active
    // 2. Timer hit 0
    // 3. We haven't already fired autopick for this pick
    // 4. It's not the current user's turn (they can still pick manually)
    if (
      status &&
      status.isDraftActive &&
      status.timeRemainingSeconds === 0 &&
      status.currentPickNumber &&
      autopickFiredForPick !== status.currentPickNumber &&
      status.currentPickerId !== userId // Don't autopick if it's your turn
    ) {
      console.log(
        `[DRAFT-ROOM-AUTOPICK] ⏱️ TIMER HIT 0! Triggering autopick for pick ${status.currentPickNumber}`
      );

      setAutopickFiredForPick(status.currentPickNumber); // Mark this pick as processed

      (async () => {
        try {
          console.log(
            `[DRAFT-ROOM-AUTOPICK] Calling /api/draft/${leagueId}/autopick`
          );
          const response = await fetch(`/api/draft/${leagueId}/autopick`, {
            method: "POST",
          });

          if (!response.ok) {
            const errorData = await response.json();
            // Could fail if pick already made by cron, that's ok
            console.log(
              `[DRAFT-ROOM-AUTOPICK] Autopick request returned ${response.status}: ${
                errorData.error || "Unknown error"
              }`
            );
            return;
          }

          const result = await response.json();
          console.log("[DRAFT-ROOM-AUTOPICK] Client-side autopick successful:", result);

          // Fetch updated status to show the new pick
          setTimeout(() => {
            console.log(
              "[DRAFT-ROOM-AUTOPICK] Fetching updated status after autopick"
            );
            fetchStatus();
          }, 100);
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : "Unknown error";
          console.error("[DRAFT-ROOM-AUTOPICK] Error triggering autopick:", errMsg);
          // Don't show error to user - this is a backup trigger, if it fails the cron will handle it
        }
      })();
    }
  }, [status, userId, leagueId, autopickFiredForPick, fetchStatus]);

  // Determine if all UI content has loaded (for timer display)
  useEffect(() => {
    if (playersLoaded && status) {
      setAllContentLoaded(true);
    }
  }, [playersLoaded, status]);

  // Client-side timer countdown (local state between server updates)
  useEffect(() => {
    if (!status?.isDraftActive) {
      return;
    }

    // Initialize display time when status changes
    setDisplayTime(status.timeRemainingSeconds);
    console.log(`[TIMER] Initialized with ${status.timeRemainingSeconds}s`);

    // Countdown every second locally
    const interval = setInterval(() => {
      setDisplayTime((prev) => {
        const nextTime = prev - 1;
        if (nextTime === 0) {
          console.log("[TIMER] Countdown reached 0");
        }
        return nextTime >= 0 ? nextTime : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.timeRemainingSeconds, status?.isDraftActive]);

  // Notify service worker that user is actively drafting
  useEffect(() => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      // Notify SW user is in draft room (suppress notifications)
      navigator.serviceWorker.controller.postMessage({
        type: 'DRAFTING_ACTIVE',
        leagueId,
      });

      // Cleanup: notify SW user left draft room
      return () => {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'DRAFTING_INACTIVE',
            leagueId,
          });
        }
      };
    }
  }, [leagueId]);

  // Memoize onLoadingComplete callback to prevent re-fetches
  const handlePlayersLoaded = useCallback(() => {
    setPlayersLoaded(true);
  }, []);

  // Handle player selection
  const handlePlayerSelected = async (player: Player) => {
    console.log(`[DRAFT-ROOM] Player selected: ${player.name} (${player.id})`);

    if (!status?.isDraftActive || status.currentPickerId !== userId) {
      const errMsg = "It's not your turn to pick";
      console.warn("[DRAFT-ROOM]", errMsg);
      setSubmitError(errMsg);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log(`[DRAFT-ROOM] Submitting pick for ${player.name}...`);
      const response = await fetch(`/api/draft/${leagueId}/pick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: player.id,
          playerName: player.name,
          position: player.position,
          mlbId: player.mlbId,
          mlbTeam: player.team,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit pick");
      }

      const result = await response.json();
      console.log("[DRAFT-ROOM] Pick submitted successfully:", result);

      // Fetch updated status
      await fetchStatus();
      setSubmitError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error submitting pick";
      console.error("[DRAFT-ROOM] Error submitting pick:", errMsg);
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-700">Error: {error}</div>
      </div>
    );
  }

  if (!status) {
    return <div className="text-center py-8 text-gray-600">Draft not found</div>;
  }

  const isCurrentPicker = status.currentPickerId === userId;
  const isDraftComplete = !status.isDraftActive && status.completedPicks > 0;

  return (
    <div>
      {/* Dev Panel */}
      <DevPanel
        leagueId={leagueId}
        currentState={
          status
            ? {
                round: status.currentRound,
                pickNumber: status.currentPickNumber,
                pickerName: status.currentPickerName,
                timeRemainingSeconds: status.timeRemainingSeconds,
              }
            : undefined
        }
        onStatusChange={fetchStatus}
      />

      {/* Sticky Header */}
      <div
        className="sticky top-0 z-30"
        style={{
          backgroundColor: "#0f1923",
          paddingTop: "18px",
          paddingBottom: "14px",
          paddingLeft: "18px",
          paddingRight: "18px",
          borderBottom: "1px solid rgba(204,52,51,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            height: "24px",
            marginBottom: "8px",
          }}
        >
          {/* Back Button */}
          <button
            onClick={() => router.push(`/league/${leagueId}`)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: "#6BAED6",
              background: "none",
              border: "none",
              cursor: "pointer",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
            }}
          >
            ← Back to League
          </button>

          {/* Round/Pick Info */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "20px",
                fontWeight: 800,
                color: "white",
                margin: "0",
                textShadow: "0 2px 12px rgba(14,51,134,0.4)",
              }}
            >
              Round {status?.currentRound} • Pick {status?.currentPickNumber}
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "rgba(255,255,255,0.4)",
                margin: "4px 0 0 0",
              }}
            >
              {status?.memberCount} teams • {status?.totalPicks} total picks
            </p>
          </div>
        </div>

        {/* Decorative line at bottom */}
        <div
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(204,52,51,0.5), transparent)",
            margin: "16px 0 0",
          }}
        />
      </div>

      {/* Persistent Banner - Always visible above tabs */}
      {!isDraftComplete && status && allContentLoaded && (
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {/* Current Picker Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "rgba(255,255,255,0.4)",
                marginBottom: "4px",
              }}
            >
              Current Picker
            </div>
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "16px",
                fontWeight: 700,
                color: isCurrentPicker ? "#CC3433" : "white",
              }}
            >
              {status.currentPickerName}
            </div>
          </div>

          {/* Timer */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: "32px",
                fontWeight: 800,
                color:
                  displayTime <= 10
                    ? "#CC3433"
                    : displayTime <= 20
                      ? "#FBBF24"
                      : "#6BAED6",
                textShadow: `0 0 12px ${
                  displayTime <= 10
                    ? "#CC343340"
                    : displayTime <= 20
                      ? "#FBBF2440"
                      : "#6BAED640"
                }`,
              }}
            >
              {displayTime}
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              seconds
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      {!isDraftComplete && (
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.01)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            paddingLeft: "18px",
            paddingRight: "18px",
          }}
        >
          {(["picks", "rosters", "order"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: "0 0 auto",
                padding: "16px 24px",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color:
                  activeTab === tab
                    ? "white"
                    : "rgba(255,255,255,0.4)",
                borderBottom:
                  activeTab === tab
                    ? "2px solid #CC3433"
                    : "2px solid transparent",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(255,255,255,0.6)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(255,255,255,0.4)";
                }
              }}
            >
              {tab === "picks"
                ? "Available Players"
                : tab === "rosters"
                  ? "Rosters"
                  : "Order"}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          maxWidth: "100%",
          padding: "16px 18px",
        }}
      >
        {isDraftComplete && (
          <div
            style={{
              backgroundColor: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "12px",
              padding: "40px",
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "32px",
                fontWeight: 800,
                marginBottom: "8px",
                color: "#86efac",
                textShadow: "0 0 12px rgba(34,197,94,0.5)",
              }}
            >
              Draft Complete!
            </div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "rgba(255,255,255,0.6)",
                marginBottom: "24px",
              }}
            >
              All {status?.completedPicks} picks have been made. Great draft!
            </p>
            <button
              onClick={() => router.push(`/league/${leagueId}`)}
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                paddingTop: "12px",
                paddingBottom: "12px",
                paddingLeft: "24px",
                paddingRight: "24px",
                backgroundColor: "#CC3433",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(204,52,51,0.5), 0 1px 0 rgba(255,255,255,0.15) inset",
                minHeight: "44px",
                transition: "transform 0.1s",
              }}
              onMouseDown={(e) => {
                (e.target as HTMLButtonElement).style.transform = "translateY(2px)";
              }}
              onMouseUp={(e) => {
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              View League
            </button>
          </div>
        )}

        {!isDraftComplete && (
          <>
            {submitError && (
              <div
                style={{
                  backgroundColor: "rgba(204,52,51,0.1)",
                  border: "1px solid rgba(204,52,51,0.3)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    color: "#fca5a5",
                  }}
                >
                  {submitError}
                </div>
              </div>
            )}

            {/* PICKS TAB */}
            {activeTab === "picks" && (
              <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                {isCurrentPicker ? (
                  <div>
                    <PlayerSearch
                      leagueId={leagueId}
                      onPlayerSelected={handlePlayerSelected}
                      isCurrentPicker={true}
                      isLoading={isSubmitting}
                      onLoadingComplete={handlePlayersLoaded}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: "20px",
                      padding: "40px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: "18px",
                        fontWeight: 700,
                        marginBottom: "8px",
                        color: "white",
                      }}
                    >
                      Waiting for {status?.currentPickerName}
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      You'll pick in round {status ? Math.max(status.currentRound, Math.ceil((status.currentPickNumber + 1) / status.memberCount)) : "?"}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ROSTERS TAB */}
            {activeTab === "rosters" && status && (
              <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <DraftTeamsRoster
                  leagueId={leagueId}
                  members={status.members}
                  currentPickerId={status.currentPickerId}
                />
              </div>
            )}

            {/* ORDER TAB */}
            {activeTab === "order" && status && (
              <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <div
                  style={{
                    borderRadius: "20px",
                    overflow: "hidden",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow:
                      "0 4px 12px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.06) inset",
                  }}
                >
                  <DraftOrderTab
                    leagueId={leagueId}
                    currentPickNumber={status.currentPickNumber}
                    completedPicks={status.completedPicks}
                    totalPicks={status.totalPicks}
                    memberCount={status.memberCount}
                    members={status.members}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
