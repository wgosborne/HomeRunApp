"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { DraftTimer } from "./DraftTimer";
import { PlayerSearch } from "./PlayerSearch";
import { DevPanel } from "./DevPanel";

interface Player {
  id: string;
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
  }, [fetchStatus]);

  // Polling: refresh status every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 5000);
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
    <div className="max-w-6xl mx-auto">
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

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Draft Room</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div>
            Round <span className="font-semibold">{status.currentRound}</span> of{" "}
            <span className="font-semibold">10</span>
          </div>
          <div>
            Pick <span className="font-semibold">{status.currentPickNumber}</span> of{" "}
            <span className="font-semibold">{status.totalPicks}</span>
          </div>
          <div>
            {status.memberCount} <span className="font-semibold">teams</span>
          </div>
        </div>
      </div>

      {isDraftComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-green-800 font-semibold">Draft Complete!</div>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-700">{submitError}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area - Player Selection or Current Picker Info */}
        <div className="lg:col-span-2">
          {!isDraftComplete ? (
            <>
              {/* Current Picker Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
                  Current Picker
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {status.currentPickerName}
                </div>
                <div className="text-gray-600">
                  {isCurrentPicker ? "It's your turn!" : "Waiting for their pick..."}
                </div>
              </div>

              {/* Timer - Only show after player list is loaded */}
              {playersLoaded ? (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <DraftTimer
                    timeRemainingSeconds={status.timeRemainingSeconds}
                    isCurrentPicker={isCurrentPicker}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="text-center text-gray-600">
                    Loading draft timer...
                  </div>
                </div>
              )}

              {/* Player Search */}
              {isCurrentPicker && (
                <div className="mb-6">
                  <PlayerSearch
                    leagueId={leagueId}
                    onPlayerSelected={handlePlayerSelected}
                    isCurrentPicker={true}
                    isLoading={isSubmitting}
                    onLoadingComplete={() => setPlayersLoaded(true)}
                  />
                </div>
              )}

              {!isCurrentPicker && (
                <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
                  <div className="text-lg font-semibold mb-2">Waiting for {status.currentPickerName}</div>
                  <div>You'll be able to pick in round {status.currentRound + (10 - status.currentRound)}</div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-green-50 rounded-lg p-8 text-center">
              <div className="text-3xl font-bold text-green-900 mb-2">
                Draft Complete!
              </div>
              <p className="text-green-700 mb-4">
                All {status.completedPicks} picks have been made.
              </p>
              <button
                onClick={() => router.push(`/league/${leagueId}`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                View League
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Recent Picks */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                Recent Picks ({status.completedPicks})
              </h3>
            </div>

            <div className="divide-y max-h-96 overflow-y-auto">
              {status.completedPicks === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No picks yet
                </div>
              ) : (
                // Display recent picks from status (we'd need to track this separately with Pusher)
                <div className="p-4 text-sm text-gray-600">
                  Picks will appear as they're made
                </div>
              )}
            </div>
          </div>

          {/* Members List */}
          <div className="bg-white rounded-lg shadow mt-6 overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Managers</h3>
            </div>

            <div className="divide-y">
              {status.members.map((member) => (
                <div
                  key={member.userId}
                  className={`p-4 ${
                    member.userId === status.currentPickerId
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : ""
                  }`}
                >
                  <div className="font-semibold text-gray-900">
                    {member.userName}
                  </div>
                  <div className="text-xs text-gray-600">{member.teamName}</div>
                  {member.userId === status.currentPickerId && (
                    <div className="text-xs font-semibold text-blue-600 mt-1">
                      Currently picking
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
