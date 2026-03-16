"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { pusherClient } from "@/lib/pusher-client";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";

interface RosterEntry {
  playerId: string;
  playerName: string;
  position: string | null;
  mlbId: number | null;
  homeruns: number;
  points: number;
  draftedRound: number | null;
  draftedPickNumber: number | null;
}

interface TeamRoster {
  userId: string;
  userName: string;
  teamName: string;
  roster: RosterEntry[];
  isLoading: boolean;
}

interface DraftTeamsRosterProps {
  leagueId: string;
  members: Array<{
    userId: string;
    userName: string;
    teamName: string;
  }>;
  currentPickerId?: string;
}

export function DraftTeamsRoster({
  leagueId,
  members,
  currentPickerId,
}: DraftTeamsRosterProps) {
  const [teams, setTeams] = useState<TeamRoster[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(
    new Set(currentPickerId ? [currentPickerId] : [])
  );
  const [loading, setLoading] = useState(true);

  // Fetch rosters for all members
  const fetchAllRosters = useCallback(async () => {
    try {
      const initialTeams = members.map((member) => ({
        userId: member.userId,
        userName: member.userName,
        teamName: member.teamName,
        roster: [] as RosterEntry[],
        isLoading: true,
      }));

      const rosterPromises = members.map((member) =>
        fetch(`/api/leagues/${leagueId}/roster?userId=${member.userId}`)
          .then((res) => res.json())
          .then((roster) => ({
            userId: member.userId,
            roster: roster || [],
          }))
          .catch(() => ({
            userId: member.userId,
            roster: [],
          }))
      );

      const rosters = await Promise.all(rosterPromises);

      // Update teams with fetched rosters
      const updatedTeams = initialTeams.map((team) => {
        const rosterData = rosters.find((r) => r.userId === team.userId);
        return {
          ...team,
          roster: rosterData?.roster || [],
          isLoading: false,
        };
      });

      setTeams(updatedTeams);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch rosters", error);
      setLoading(false);
    }
  }, [leagueId, members]);

  // Initial fetch on mount
  useEffect(() => {
    fetchAllRosters();
  }, [fetchAllRosters]);

  // Add current picker to expanded teams when it changes
  useEffect(() => {
    if (currentPickerId) {
      setExpandedTeams((prev) => new Set([...prev, currentPickerId]));
    }
  }, [currentPickerId]);

  // Subscribe to Pusher pick-made events to refetch rosters
  useEffect(() => {
    const channel = pusherClient.subscribe(`draft-${leagueId}`);

    const handlePickMade = (data: any) => {
      console.log("[DRAFT-TEAMS-ROSTER] Pick made, refetching rosters:", data);
      fetchAllRosters();
    };

    channel.bind("pick-made", handlePickMade);

    return () => {
      channel.unbind("pick-made", handlePickMade);
    };
  }, [leagueId, fetchAllRosters]);

  return (
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
          Team Rosters
        </h3>
      </div>

      <div
        style={{
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Loading rosters...
          </div>
        ) : teams.length === 0 ? (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            No teams yet
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.userId} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {/* Team Header - Toggle Expansion */}
              <button
                onClick={() => {
                  setExpandedTeams((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(team.userId)) {
                      newSet.delete(team.userId);
                    } else {
                      newSet.add(team.userId);
                    }
                    return newSet;
                  });
                }}
                style={{
                  width: "100%",
                  padding: "16px",
                  textAlign: "left",
                  background:
                    team.userId === currentPickerId
                      ? "linear-gradient(145deg, rgba(204,52,51,0.2), rgba(204,52,51,0.1))"
                      : expandedTeams.has(team.userId)
                        ? "rgba(204,52,51,0.1)"
                        : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
                onMouseEnter={(e) => {
                  if (team.userId !== currentPickerId && !expandedTeams.has(team.userId)) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (team.userId !== currentPickerId && !expandedTeams.has(team.userId)) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontWeight: 700,
                      fontSize: "14px",
                      color: team.userId === currentPickerId ? "#CC3433" : "white",
                      marginBottom: "4px",
                    }}
                  >
                    {team.userName}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    {team.teamName}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#6BAED6",
                    }}
                  >
                    {team.roster.length} players
                  </span>
                    <span
                      className={`transform transition-transform ${
                        expandedTeams.has(team.userId) ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                </div>
                {team.userId === currentPickerId && (
                  <div
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#CC3433",
                      marginTop: "8px",
                      textShadow: "0 0 8px rgba(204,52,51,0.4)",
                    }}
                  >
                    PICKING NOW
                  </div>
                )}
              </button>

              {/* Team Roster - Expanded Content */}
              {expandedTeams.has(team.userId) && (
                <div
                  style={{
                    backgroundColor: "rgba(0,0,0,0.15)",
                  }}
                >
                  {team.isLoading ? (
                    <div
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.3)",
                      }}
                    >
                      Loading roster...
                    </div>
                  ) : team.roster.length === 0 ? (
                    <div
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.3)",
                      }}
                    >
                      No players drafted yet
                    </div>
                  ) : (
                    team.roster.map((player) => (
                      <Link
                        key={player.playerId}
                        href={player.mlbId ? `/player/${player.mlbId}?leagueId=${leagueId}` : "#"}
                        style={{
                          display: player.mlbId ? "block" : "pointer-events-none",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <div
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid rgba(255,255,255,0.07)",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            fontSize: "14px",
                            backgroundColor: "transparent",
                            transition: "background 0.2s",
                            cursor: player.mlbId ? "pointer" : "default",
                          }}
                          onMouseEnter={(e) => {
                            if (player.mlbId) {
                              (e.currentTarget as HTMLDivElement).style.background =
                                "rgba(107,174,214,0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background = "transparent";
                          }}
                        >
                          <PlayerAvatar
                            mlbId={player.mlbId}
                            playerName={player.playerName}
                            size="sm"
                            className="flex-shrink-0 mt-0.5"
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: "'Exo 2', sans-serif",
                                fontWeight: 600,
                                color: "white",
                                marginBottom: "4px",
                              }}
                            >
                              {player.playerName}
                            </div>
                            <div
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: "12px",
                                color: "rgba(255,255,255,0.4)",
                              }}
                            >
                              {player.position} • R{player.draftedRound}P
                              {player.draftedPickNumber}
                            </div>
                            {player.homeruns > 0 && (
                              <div
                                style={{
                                  fontFamily: "'DM Sans', sans-serif",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: "#6BAED6",
                                  marginTop: "4px",
                                }}
                              >
                                {player.homeruns} HR
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
