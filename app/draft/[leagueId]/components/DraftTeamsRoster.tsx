"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [expandedTeam, setExpandedTeam] = useState<string | null>(
    currentPickerId || null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize teams with empty rosters
    const initialTeams = members.map((member) => ({
      userId: member.userId,
      userName: member.userName,
      teamName: member.teamName,
      roster: [],
      isLoading: true,
    }));
    setTeams(initialTeams);

    // Fetch rosters for all members
    const fetchAllRosters = async () => {
      try {
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
      } catch (error) {
        console.error("Failed to fetch rosters", error);
        setTeams(initialTeams.map((t) => ({ ...t, isLoading: false })));
      } finally {
        setLoading(false);
      }
    };

    fetchAllRosters();
    // Only fetch once when component mounts - don't refetch on every parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  // Update expanded team when currentPickerId changes
  useEffect(() => {
    if (currentPickerId) {
      setExpandedTeam(currentPickerId);
    }
  }, [currentPickerId]);

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
          maxHeight: "96",
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
              {/* Team Header - Accordion Toggle */}
              <button
                onClick={() =>
                  setExpandedTeam(
                    expandedTeam === team.userId ? null : team.userId
                  )
                }
                style={{
                  width: "100%",
                  padding: "16px",
                  textAlign: "left",
                  background:
                    team.userId === currentPickerId
                      ? "linear-gradient(145deg, rgba(204,52,51,0.2), rgba(204,52,51,0.1))"
                      : expandedTeam === team.userId
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
                  if (team.userId !== currentPickerId && expandedTeam !== team.userId) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (team.userId !== currentPickerId && expandedTeam !== team.userId) {
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
                        expandedTeam === team.userId ? "rotate-180" : ""
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
                    🎯 PICKING NOW
                  </div>
                )}
              </button>

              {/* Team Roster - Expanded Content */}
              {expandedTeam === team.userId && (
                <div className="bg-gray-50 divide-y">
                  {team.isLoading ? (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Loading roster...
                    </div>
                  ) : team.roster.length === 0 ? (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      No players drafted yet
                    </div>
                  ) : (
                    team.roster.map((player) => (
                      <Link
                        key={player.playerId}
                        href={player.mlbId ? `/player/${player.mlbId}?leagueId=${leagueId}` : "#"}
                        className={player.mlbId ? "block hover:bg-white transition-colors" : "pointer-events-none"}
                      >
                        <div className="p-3 text-sm flex items-start gap-2">
                          <PlayerAvatar
                            mlbId={player.mlbId}
                            playerName={player.playerName}
                            size="sm"
                            className="flex-shrink-0 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">
                              {player.playerName}
                            </div>
                            <div className="text-xs text-gray-600">
                              {player.position} • R{player.draftedRound}P
                              {player.draftedPickNumber}
                            </div>
                            {player.homeruns > 0 && (
                              <div className="text-xs font-semibold text-blue-600 mt-1">
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
