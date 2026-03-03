"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { DraftTimer } from "./DraftTimer";
import { PlayerSearch } from "./PlayerSearch";
import { DevPanel } from "./DevPanel";
import { DraftTeamsRoster } from "./DraftTeamsRoster";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch draft status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/draft/${leagueId}/status`);
      if (!response.ok) {
        throw new Error("Failed to fetch draft status");
      }
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching status");
    }
  }, [leagueId]);

  // Initial load
  useEffect(() => {
    fetchStatus();
    setLoading(false);
    // Reset content loaded state when fresh load occurs
    setAllContentLoaded(false);
  }, [fetchStatus]);

  // Polling: refresh status every 20 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 20000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Pusher real-time subscription
  useEffect(() => {
    const channel = pusherClient.subscribe(`draft-${leagueId}`);

    // Listen for pick made events
    const handlePickMade = (data: any) => {
      console.log("Pick made event received", data);
      fetchStatus();
    };

    // Listen for draft state change events
    const handleDraftStateChange = (data: any) => {
      console.log("Draft state changed", data);
      fetchStatus();
    };

    // Listen for draft reset
    const handleDraftReset = (data: any) => {
      console.log("Draft reset event received", data);
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

  // Determine if all UI content has loaded (for timer display)
  useEffect(() => {
    if (playersLoaded && status) {
      setAllContentLoaded(true);
    }
  }, [playersLoaded, status]);

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
    if (!status?.isDraftActive || status.currentPickerId !== userId) {
      setSubmitError("It's not your turn to pick");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
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

      // Fetch updated status
      await fetchStatus();
      setSubmitError(null);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Error submitting pick"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading draft room...</div>;
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

          {/* Sidebar Toggle (Mobile Only) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              padding: "8px",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
            className="lg:hidden"
            aria-label="Toggle sidebar"
          >
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
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

      {/* Main Content */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px 16px",
        }}
      >
        {isDraftComplete && (
          <div
            style={{
              backgroundColor: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontWeight: 700,
                color: "#86efac",
              }}
            >
              ✓ Draft Complete!
            </div>
          </div>
        )}

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

        <div className="lg:grid-cols-3" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
          {/* Main Area - Player Selection or Current Picker Info */}
          <div className="lg:col-span-2" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {!isDraftComplete ? (
              <>
                {/* Current Picker Info */}
                <div
                  style={{
                    borderRadius: "20px",
                    padding: "20px",
                    background: "linear-gradient(145deg, #0e2a6e 0%, #1a3f9c 55%, #0f2660 100%)",
                    boxShadow: `
                      0 2px 0 rgba(255,255,255,0.06) inset,
                      0 -2px 0 rgba(0,0,0,0.4) inset,
                      0 8px 16px rgba(0,0,0,0.4),
                      0 16px 40px rgba(14,51,134,0.45),
                      0 32px 64px rgba(14,51,134,0.2),
                      0 1px 0 rgba(255,255,255,0.04)
                    `,
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
                      marginBottom: "8px",
                    }}
                  >
                    Current Picker
                  </div>
                  <div
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "32px",
                      fontWeight: 800,
                      color: isCurrentPicker ? "#CC3433" : "white",
                      marginBottom: "4px",
                      textShadow: isCurrentPicker ? "0 0 12px rgba(204,52,51,0.6)" : "0 2px 8px rgba(0,0,0,0.5)",
                    }}
                  >
                    {status?.currentPickerName}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {isCurrentPicker ? "🎯 It's your turn to pick!" : "⏳ Waiting for their selection..."}
                  </div>
                </div>

                {/* Timer - Only show after all content is loaded */}
                {allContentLoaded ? (
                  <div
                    style={{
                      borderRadius: "20px",
                      padding: "20px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow:
                        "0 4px 12px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.06) inset",
                    }}
                  >
                    <DraftTimer
                      timeRemainingSeconds={status?.timeRemainingSeconds || 0}
                      isCurrentPicker={isCurrentPicker}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: "20px",
                      padding: "20px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      Loading draft content...
                    </div>
                  </div>
                )}

                {/* Player Search - Full Width on Mobile */}
                {isCurrentPicker && (
                  <div>
                    <PlayerSearch
                      leagueId={leagueId}
                      onPlayerSelected={handlePlayerSelected}
                      isCurrentPicker={true}
                      isLoading={isSubmitting}
                      onLoadingComplete={handlePlayersLoaded}
                    />
                  </div>
                )}

                {!isCurrentPicker && (
                  <div
                    style={{
                      borderRadius: "20px",
                      padding: "20px",
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
                      ⏳ Waiting for {status?.currentPickerName}
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
              </>
            ) : (
              <div
                style={{
                  borderRadius: "20px",
                  padding: "40px",
                  backgroundColor: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  textAlign: "center",
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
                  ✓ Draft Complete!
                </div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: "24px",
                  }}
                >
                  All {status?.completedPicks} picks have been made. Great draft! 🎉
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
          </div>

          {/* Sidebar - Collapsible on Mobile */}
          <div
            className={`${
              sidebarOpen ? "block" : "hidden"
            } lg:block space-y-4 sm:space-y-6`}
          >
            {/* Team Rosters */}
            {status && (
              <DraftTeamsRoster
                leagueId={leagueId}
                members={status.members}
                currentPickerId={status.currentPickerId}
              />
            )}

            {/* Members List */}
            {status && (
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
                <div
                  style={{
                    padding: "16px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "3px",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.28)",
                      textShadow: "0 0 16px rgba(204,52,51,0.35), 0 0 32px rgba(204,52,51,0.15)",
                      margin: 0,
                    }}
                  >
                    Managers ({status.members.length})
                  </h3>
                </div>

                <div
                  style={{
                    maxHeight: "384px",
                    overflowY: "auto",
                  }}
                >
                  {status.members.map((member) => (
                    <div
                      key={member.userId}
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid rgba(255,255,255,0.07)",
                        background:
                          member.userId === status.currentPickerId
                            ? "linear-gradient(145deg, rgba(204,52,51,0.2), rgba(204,52,51,0.1))"
                            : "transparent",
                        transition: "background 0.2s",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        if (member.userId !== status.currentPickerId) {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "rgba(255,255,255,0.04)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (member.userId !== status.currentPickerId) {
                          (e.currentTarget as HTMLDivElement).style.background = "transparent";
                        }
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Exo 2', sans-serif",
                          fontWeight: 700,
                          fontSize: "14px",
                          color:
                            member.userId === status.currentPickerId
                              ? "#CC3433"
                              : "white",
                          marginBottom: "4px",
                        }}
                      >
                        {member.userName}
                      </div>
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "12px",
                          color: "rgba(255,255,255,0.4)",
                          marginBottom: "8px",
                        }}
                      >
                        {member.teamName}
                      </div>
                      {member.userId === status.currentPickerId && (
                        <div
                          style={{
                            fontFamily: "'Exo 2', sans-serif",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#CC3433",
                            textShadow: "0 0 8px rgba(204,52,51,0.4)",
                          }}
                        >
                          🎯 Currently picking
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
