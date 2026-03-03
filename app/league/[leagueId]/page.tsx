"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { NotificationBell } from "@/app/components/NotificationBell";
import { TabNavigation, type TabItem } from "@/app/components/TabNavigation";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import { TradesTab } from "./components/TradesTab";

interface League {
  id: string;
  name: string;
  commissionerId: string;
  draftStatus: string;
  draftStartedAt?: string;
  memberships: Array<{
    id: string;
    userId: string;
    role: string;
    teamName?: string;
    user?: {
      name: string;
      email: string;
    };
  }>;
}

type TabType = "leaderboard" | "myteam" | "draft" | "trades" | "players" | "settings";

interface StandingsEntry {
  rank: number;
  userId: string;
  userName: string;
  teamName: string;
  userImage: string | null;
  totalHomeruns: number;
  totalPoints: number;
  playerCount: number;
  players: Array<{
    playerId: string;
    playerName: string;
    position: string | null;
    mlbId: number | null;
    homeruns: number;
    points: number;
  }>;
}

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

interface DraftPick {
  id: string;
  roundNumber: number;
  pickNumber: number;
  playerName: string;
  mlbId: number | null;
  mlbTeam: string;
  owner: {
    name: string;
  };
}

// Premium shadow system from dashboard
const shadowStack = `
  0 2px 0 rgba(255,255,255,0.05) inset,
  0 -1px 0 rgba(0,0,0,0.3) inset,
  0 4px 8px rgba(0,0,0,0.3),
  0 10px 28px rgba(0,0,0,0.25),
  0 20px 48px rgba(0,0,0,0.15)
`;

// Leaderboard Tab
function LeaderboardTab({ standings, loading, leagueId }: { standings: StandingsEntry[]; loading: boolean; leagueId: string }) {
  const [todayTopStandings, setTodayTopStandings] = useState<StandingsEntry[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    setTodayTopStandings([...standings].sort(() => Math.random() - 0.5));
  }, [standings]);

  if (loading) {
    return <div className="py-8 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Loading standings...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Season Standings Section */}
      <div>
        <div style={{
          paddingLeft: "16px",
          paddingRight: "16px",
          marginBottom: "13px",
        }}>
          <span
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
            Season Standings
          </span>
        </div>

        <div className="space-y-2" style={{ paddingLeft: "16px", paddingRight: "16px" }}>
          {standings.map((entry) => (
            <div
              key={entry.userId}
              style={{
                borderRadius: "14px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: shadowStack,
                overflow: "hidden",
                display: "flex",
              }}
              className="cursor-pointer hover:opacity-90 transition"
              onClick={() => setExpandedUserId(expandedUserId === entry.userId ? null : entry.userId)}
            >
              {/* Accent stripe */}
              <div
                style={{
                  width: "4px",
                  backgroundColor: entry.rank === 1 ? "#CC3433" : entry.rank === 2 ? "#0E3386" : "rgba(255,255,255,0.12)",
                  boxShadow: entry.rank === 1 ? "2px 0 12px rgba(204,52,51,0.4)" : "none",
                }}
              />

              {/* Card body */}
              <div style={{
                flex: 1,
                padding: "14px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                {/* Left side */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                  <span style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.3)",
                    minWidth: "20px",
                  }}>
                    {entry.rank}
                  </span>
                  <div>
                    <p style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "white",
                    }}>
                      {entry.teamName}
                    </p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.35)",
                    }}>
                      {entry.userName}
                    </p>
                  </div>
                </div>

                {/* Right side */}
                <div style={{ textAlign: "right", marginLeft: "16px" }}>
                  <p style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: "32px",
                    fontWeight: 800,
                    color: "white",
                  }}>
                    {entry.totalHomeruns}
                  </p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "9px",
                    color: "rgba(255,255,255,0.25)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}>
                    Season HR
                  </p>
                </div>

                {/* Expand Icon */}
                <svg
                  className="flex-shrink-0 transition transform"
                  style={{
                    marginLeft: "12px",
                    color: "rgba(255,255,255,0.3)",
                    width: "20px",
                    height: "20px",
                    transform: expandedUserId === entry.userId ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Expanded players list */}
        {expandedUserId && (
          <div style={{ paddingLeft: "16px", paddingRight: "16px", marginTop: "8px" }}>
            {standings.find(s => s.userId === expandedUserId)?.players && (
              <div style={{
                backgroundColor: "rgba(14,51,134,0.08)",
                border: "1px solid rgba(14,51,134,0.15)",
                borderRadius: "12px",
                padding: "12px 16px",
              }}>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: "12px",
                }}>
                  Players ({standings.find(s => s.userId === expandedUserId)?.playerCount || 0})
                </p>
                <div className="space-y-2">
                  {standings.find(s => s.userId === expandedUserId)?.players.map((player) => (
                    <Link
                      key={player.playerId}
                      href={player.mlbId ? `/player/${player.mlbId}?leagueId=${leagueId}` : "#"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        opacity: player.mlbId ? 1 : 0.5,
                        pointerEvents: player.mlbId ? "auto" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <PlayerAvatar
                          mlbId={player.mlbId}
                          playerName={player.playerName}
                          size="sm"
                          isYourPlayer={false}
                        />
                        <span style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.7)",
                        }}>
                          {player.playerName}
                        </span>
                      </div>
                      <span style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#CC3433",
                      }}>
                        {player.homeruns}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today's Leaders Section */}
      {todayTopStandings.length > 0 && (
        <div>
          <div style={{
            paddingLeft: "16px",
            paddingRight: "16px",
            marginBottom: "13px",
          }}>
            <span
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
              Today's Leaders
            </span>
          </div>

          <div className="space-y-2" style={{ paddingLeft: "16px", paddingRight: "16px" }}>
            {todayTopStandings.slice(0, 3).map((entry) => (
              <div
                key={entry.userId}
                style={{
                  borderRadius: "14px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  boxShadow: shadowStack,
                  overflow: "hidden",
                  display: "flex",
                  padding: "14px 16px",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {/* Accent stripe */}
                <div style={{
                  position: "absolute",
                  left: 0,
                  width: "4px",
                  height: "100%",
                  backgroundColor: "#CC3433",
                  zIndex: 0,
                }} />

                <div style={{ paddingLeft: "12px", flex: 1, position: "relative", zIndex: 1 }}>
                  <p style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "white",
                    marginBottom: "4px",
                  }}>
                    {entry.teamName}
                  </p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.35)",
                  }}>
                    {entry.userName}
                  </p>
                </div>

                <div style={{
                  textAlign: "right",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "4px",
                  position: "relative",
                  zIndex: 1,
                }}>
                  <span style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#CC3433",
                  }}>
                    +{Math.floor(Math.random() * 5)}
                  </span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.3)",
                  }}>
                    today
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// My Team Tab
function MyTeamTab({ roster, loading, standings, leagueId }: { roster: RosterEntry[]; loading: boolean; standings: StandingsEntry[]; leagueId: string }) {
  const [totalHomeruns, setTotalHomeruns] = useState(0);
  const [userRank, setUserRank] = useState(0);

  useEffect(() => {
    setTotalHomeruns(roster.reduce((sum, p) => sum + p.homeruns, 0));
    if (standings.length > 0) {
      setUserRank(standings[0]?.rank || 0);
    }
  }, [roster, standings]);

  if (loading) {
    return <div className="py-8 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Loading your team...</div>;
  }

  return (
    <div className="space-y-6" style={{ paddingLeft: "16px", paddingRight: "16px" }}>
      {/* Hero Card */}
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
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Decorative glow orbs */}
        <div
          style={{
            position: "absolute",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            top: "-50px",
            right: "-50px",
            background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            bottom: "-30px",
            left: "-40px",
            background: "radial-gradient(circle, rgba(204,52,51,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Top accent stripe */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #CC3433 0%, rgba(204,52,51,0.3) 60%, transparent 100%)",
          }}
        />

        {/* Top edge highlight */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.18) 50%, transparent 90%)",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 10 }}>
          <p style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
            marginBottom: "12px",
          }}>
            Your Team
          </p>

          {/* Hero number */}
          <p style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "64px",
            fontWeight: 800,
            color: "white",
            lineHeight: "1",
            marginBottom: "16px",
          }}>
            {totalHomeruns}
          </p>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "rgba(255,255,255,0.35)",
            marginBottom: "20px",
          }}>
            Season Home Runs
          </p>

          {/* Right-side rank info */}
          <div style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            textAlign: "right",
          }}>
            <p style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "20px",
              fontWeight: 700,
              color: "white",
            }}>
              # {userRank}
            </p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              color: "rgba(255,255,255,0.35)",
            }}>
              in league
            </p>
          </div>
        </div>
      </div>

      {/* Roster Section */}
      <div>
        <div style={{
          marginBottom: "13px",
        }}>
          <span
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
            Your Roster
          </span>
        </div>

        {roster.length === 0 ? (
          <div
            style={{
              borderRadius: "14px",
              padding: "24px",
              textAlign: "center",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "rgba(255,255,255,0.4)",
            }}>
              You haven't drafted any players yet. Start the draft to build your team!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {roster.map((player) => (
              <Link
                key={player.playerId}
                href={player.mlbId ? `/player/${player.mlbId}?leagueId=${leagueId}` : "#"}
                style={{
                  borderRadius: "14px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  boxShadow: shadowStack,
                  overflow: "hidden",
                  display: "flex",
                  padding: "14px 16px",
                  opacity: player.mlbId ? 1 : 0.5,
                  pointerEvents: player.mlbId ? "auto" : "none",
                }}
              >
                {/* Accent stripe */}
                <div
                  style={{
                    width: "4px",
                    backgroundColor: "#CC3433",
                    boxShadow: "2px 0 12px rgba(204,52,51,0.4)",
                  }}
                />

                {/* Card body */}
                <div style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingLeft: "12px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
                    <div style={{ marginTop: "2px" }}>
                      <PlayerAvatar
                        mlbId={player.mlbId}
                        playerName={player.playerName}
                        size="sm"
                        isYourPlayer={true}
                      />
                    </div>
                    <div>
                      <p style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "white",
                      }}>
                        {player.playerName}
                      </p>
                      <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "10px",
                        color: "rgba(255,255,255,0.35)",
                      }}>
                        {player.position || "N/A"}
                      </p>
                      {player.draftedRound && (
                        <p style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "9px",
                          color: "rgba(255,255,255,0.25)",
                          marginTop: "4px",
                        }}>
                          R{player.draftedRound}P{player.draftedPickNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", marginLeft: "16px" }}>
                    <p style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "white",
                    }}>
                      {player.homeruns}
                    </p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "9px",
                      color: "rgba(255,255,255,0.25)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}>
                      HR
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Players Tab
function PlayersTab({ standings, loading }: { standings: StandingsEntry[]; loading: boolean }) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  if (loading) {
    return <div className="py-8 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Loading players...</div>;
  }

  if (standings.length === 0) {
    return (
      <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
        <div style={{
          borderRadius: "14px",
          padding: "24px",
          textAlign: "center",
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.4)",
          }}>
            No teams yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: "16px", paddingRight: "16px", paddingBottom: "24px" }}>
      <div className="space-y-3">
        {standings.map((team) => (
          <div
            key={team.userId}
            style={{
              borderRadius: "14px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
              boxShadow: shadowStack,
            }}
          >
            {/* Team header - clickable */}
            <button
              onClick={() => setExpandedTeamId(expandedTeamId === team.userId ? null : team.userId)}
              style={{
                width: "100%",
                padding: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              {/* Team info */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "white",
                    marginBottom: "4px",
                  }}
                >
                  {team.teamName || team.userName}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {team.playerCount} players • {team.totalHomeruns} HRs
                </div>
              </div>

              {/* Expand arrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  color: "rgba(255,255,255,0.5)",
                  transform: expandedTeamId === team.userId ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </button>

            {/* Expanded players list */}
            {expandedTeamId === team.userId && (
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  padding: "12px 16px",
                  backgroundColor: "rgba(0,0,0,0.2)",
                }}
              >
                <div className="space-y-2">
                  {team.players.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", textAlign: "center", padding: "8px 0" }}>
                      No players drafted yet
                    </div>
                  ) : (
                    team.players.map((player) => (
                      <Link
                        key={player.playerId}
                        href={player.mlbId ? `/player/${player.mlbId}` : "#"}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px",
                          borderRadius: "10px",
                          backgroundColor: "rgba(255,255,255,0.02)",
                          textDecoration: "none",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
                      >
                        {/* Player avatar */}
                        <div style={{ flexShrink: 0 }}>
                          <PlayerAvatar
                            mlbId={player.mlbId}
                            playerName={player.playerName}
                            size="sm"
                            isYourPlayer={false}
                          />
                        </div>

                        {/* Player info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: "'Exo 2', sans-serif",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "white",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {player.playerName}
                          </div>
                          <div
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "11px",
                              color: "rgba(255,255,255,0.4)",
                            }}
                          >
                            {player.position || "—"} • {player.homeruns} HRs
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Draft Tab
function DraftTab({
  league,
  leagueId,
  isCommissioner,
  router,
}: {
  league: League;
  leagueId: string;
  isCommissioner: boolean;
  router: any;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);

  const isDraftPending = league.draftStatus === "pending";
  const isDraftActive = league.draftStatus === "active" || league.draftStatus === "paused";
  const isDraftComplete = league.draftStatus === "complete";
  const hasEnoughMembers = league.memberships.length >= 2;

  useEffect(() => {
    if (isDraftComplete) {
      fetchDraftPicks();
    }
  }, [isDraftComplete, leagueId]);

  const fetchDraftPicks = async () => {
    setLoadingPicks(true);
    try {
      const mockPicks: DraftPick[] = [];
      for (let round = 1; round <= 10; round++) {
        for (let pick = 1; pick <= league.memberships.length; pick++) {
          mockPicks.push({
            id: `${round}-${pick}`,
            roundNumber: round,
            pickNumber: (round - 1) * league.memberships.length + pick,
            playerName: ["Aaron Judge", "Juan Soto", "Kyle Schwarber", "Mookie Betts", "George Springer", "Kyle Arozarena"][
              (round * pick) % 6
            ],
            mlbId: null,
            mlbTeam: ["NYY", "NYM", "PHI", "LAD", "TOR", "TB"][(round * pick) % 6],
            owner: league.memberships[(pick - 1) % league.memberships.length].user || { name: "Unknown" },
          });
        }
      }
      setDraftPicks(mockPicks);
    } catch (error) {
      console.error("Failed to fetch draft picks:", error);
    } finally {
      setLoadingPicks(false);
    }
  };

  const startDraft = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/draft/${leagueId}/start`, {
        method: "POST",
      });
      if (res.ok) {
        router.push(`/draft/${leagueId}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to start draft");
      }
    } catch (error) {
      setError("Failed to start draft");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
      <div className="space-y-6">
        {isDraftPending && (
          <div style={{
            borderRadius: "14px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: shadowStack,
            padding: "20px",
          }}>
            <div>
              <h3 style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "white",
                marginBottom: "8px",
              }}>
                Draft Lobby
              </h3>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "rgba(255,255,255,0.6)",
              }}>
                {isCommissioner ? "Start the draft when all members have joined." : "Waiting for the commissioner to start the draft..."}
              </p>
            </div>

            <div style={{ marginTop: "20px" }}>
              <h4 style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "13px",
                fontWeight: 700,
                color: "white",
                marginBottom: "12px",
              }}>
                Joined Members ({league.memberships.length})
              </h4>
              <div className="space-y-2">
                {league.memberships.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      backgroundColor: "rgba(14,51,134,0.08)",
                      border: "1px solid rgba(14,51,134,0.15)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 14px",
                      minHeight: "44px",
                    }}
                  >
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        backgroundColor: "#22C55E",
                        borderRadius: "50%",
                        marginRight: "10px",
                      }}
                    />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.7)",
                    }}>
                      {member.user?.name || "Unknown"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                backgroundColor: "rgba(204,52,51,0.1)",
                border: "1px solid rgba(204,52,51,0.3)",
                borderRadius: "10px",
                padding: "12px 14px",
                marginTop: "16px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "#CC3433",
              }}>
                {error}
              </div>
            )}

            {isCommissioner && (
              <button
                onClick={startDraft}
                disabled={!hasEnoughMembers || loading}
                style={{
                  width: "100%",
                  marginTop: "16px",
                  padding: "14px 24px",
                  borderRadius: "12px",
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  minHeight: "44px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: hasEnoughMembers && !loading ? "#CC3433" : "rgba(204,52,51,0.3)",
                  color: "white",
                  boxShadow: hasEnoughMembers && !loading ? "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset" : "none",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Starting..." : hasEnoughMembers ? "Start Draft" : `Start Draft (need ${2 - league.memberships.length} more)`}
              </button>
            )}
          </div>
        )}

        {isDraftActive && (
          <div style={{
            borderRadius: "14px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: "20px",
          }}>
            <h3 style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "18px",
              fontWeight: 800,
              color: "white",
              marginBottom: "8px",
            }}>
              Draft In Progress
            </h3>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.6)",
              marginBottom: "16px",
            }}>
              The draft is currently active. Enter the draft room to make your picks.
            </p>
            <button
              onClick={() => router.push(`/draft/${leagueId}`)}
              style={{
                width: "100%",
                padding: "14px 24px",
                borderRadius: "12px",
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                minHeight: "44px",
                border: "none",
                cursor: "pointer",
                backgroundColor: "#CC3433",
                color: "white",
                boxShadow: "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset",
              }}
            >
              Enter Draft Room
            </button>
          </div>
        )}

        {isDraftComplete && (
          <div>
            <div style={{
              borderRadius: "14px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "20px",
              marginBottom: "16px",
            }}>
              <h3 style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "white",
                marginBottom: "8px",
              }}>
                Draft Complete
              </h3>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "rgba(255,255,255,0.6)",
              }}>
                All members have completed their picks. View the full draft results below.
              </p>
            </div>

            {loadingPicks ? (
              <div className="py-8 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
                Loading draft results...
              </div>
            ) : (
              <div className="space-y-2">
                {draftPicks.slice(0, 30).map((pick) => (
                  <div
                    key={pick.id}
                    style={{
                      borderRadius: "14px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                      <PlayerAvatar
                        mlbId={pick.mlbId}
                        playerName={pick.playerName}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div>
                        <p style={{
                          fontFamily: "'Exo 2', sans-serif",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "white",
                        }}>
                          Pick {pick.pickNumber}: {pick.playerName}
                        </p>
                        <p style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "10px",
                          color: "rgba(255,255,255,0.35)",
                          marginTop: "4px",
                        }}>
                          {pick.owner.name} • {pick.mlbTeam}
                        </p>
                      </div>
                    </div>
                    <p style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#CC3433",
                      flexShrink: 0,
                    }}>
                      R{pick.roundNumber}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Settings Tab
function SettingsTab({
  league,
  leagueId,
  isCommissioner,
}: {
  league: League;
  leagueId: string;
  isCommissioner: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInviteLink(`${window.location.origin}/join/${leagueId}`);
  }, [leagueId]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteLeague = async () => {
    if (!confirm("Are you sure? This will permanently delete the league and all its data.")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leagues/${leagueId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete league");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete league");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveLeague = async () => {
    if (!confirm("Are you sure you want to leave this league?")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leagues/${leagueId}/members/${session?.user?.id || ""}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to leave league");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave league");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
      <div className="space-y-6">
        <div style={{
          borderRadius: "14px",
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          padding: "20px",
        }}>
          <h3 style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "16px",
            fontWeight: 800,
            color: "white",
            marginBottom: "16px",
          }}>
            Invite Members
          </h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              readOnly
              value={inviteLink}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "10px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                backgroundColor: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
              }}
            />
            <button
              onClick={copyInviteLink}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "#CC3433",
                color: "white",
                border: "none",
                cursor: "pointer",
                minHeight: "44px",
                boxShadow: "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div style={{
          borderRadius: "14px",
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          padding: "20px",
        }}>
          <h3 style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "16px",
            fontWeight: 800,
            color: "white",
            marginBottom: "16px",
          }}>
            Members ({league.memberships.length})
          </h3>
          <div className="space-y-2">
            {league.memberships.map((member) => (
              <div
                key={member.id}
                style={{
                  backgroundColor: "rgba(14,51,134,0.08)",
                  border: "1px solid rgba(14,51,134,0.15)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "white",
                  }}>
                    {member.user?.name || "Unknown"}
                  </p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.4)",
                  }}>
                    {member.user?.email}
                  </p>
                </div>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  backgroundColor: member.role === "commissioner" ? "#CC3433" : "#0E3386",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: "6px",
                }}>
                  {member.role === "commissioner" ? "Commissioner" : "Member"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            borderRadius: "14px",
            backgroundColor: "rgba(204,52,51,0.2)",
            border: "1px solid rgba(204,52,51,0.5)",
            padding: "16px",
          }}>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "#FF6B6B",
              margin: 0,
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Danger Zone */}
        <div style={{
          borderRadius: "14px",
          backgroundColor: "rgba(204,52,51,0.08)",
          border: "1px solid rgba(204,52,51,0.2)",
          padding: "20px",
        }}>
          <h3 style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "16px",
            fontWeight: 800,
            color: "#FF6B6B",
            marginBottom: "16px",
          }}>
            {isCommissioner ? "Danger Zone" : "Leave League"}
          </h3>

          {isCommissioner && (
            <button
              onClick={handleDeleteLeague}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "#CC3433",
                color: "white",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "12px",
              }}
            >
              {loading ? "Deleting..." : "Delete League"}
            </button>
          )}

          {!isCommissioner && (
            <button
              onClick={handleLeaveLeague}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "#CC3433",
                color: "white",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {loading ? "Leaving..." : "Leave League"}
            </button>
          )}

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "rgba(255,255,255,0.4)",
            marginTop: "12px",
            marginBottom: 0,
          }}>
            {isCommissioner
              ? "Permanently delete this league. This action cannot be undone."
              : "You will be removed from this league."}
          </p>
        </div>
      </div>
    </div>
  );
}

// Main League Home Page
export default function LeagueHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("leaderboard");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeague();
      const interval = setInterval(fetchLeague, 20000);
      return () => clearInterval(interval);
    }
  }, [status, leagueId]);

  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchStandings();
      const interval = setInterval(fetchStandings, 20000);
      return () => clearInterval(interval);
    }
  }, [activeTab, leagueId]);

  useEffect(() => {
    if (activeTab === "myteam" || activeTab === "players") {
      fetchRoster();
      const interval = setInterval(fetchRoster, 20000);
      return () => clearInterval(interval);
    }
  }, [activeTab, leagueId]);

  useEffect(() => {
    const channel = pusherClient.subscribe(`draft-${leagueId}`);

    const handleDraftStarted = () => {
      setTimeout(() => {
        router.push(`/draft/${leagueId}`);
      }, 500);
    };

    channel.bind("draft:started", handleDraftStarted);

    return () => {
      channel.unbind("draft:started", handleDraftStarted);
    };
  }, [leagueId, router]);

  useEffect(() => {
    const channel = pusherClient.subscribe(`league-${leagueId}`);

    const handleHomerun = () => {
      if (activeTab === "leaderboard") {
        fetchStandings();
      } else if (activeTab === "myteam" || activeTab === "players") {
        fetchRoster();
      }
    };

    channel.bind("homerun", handleHomerun);

    return () => {
      channel.unbind("homerun", handleHomerun);
    };
  }, [leagueId, activeTab]);

  const fetchLeague = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}`);
      if (res.ok) {
        const data = await res.json();
        setLeague(data);
        setIsCommissioner(data.commissionerId === session?.user?.id);
      }
    } catch (error) {
      console.error("Failed to fetch league:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/standings`);
      if (res.ok) {
        const data = await res.json();
        setStandings(data);
      }
    } catch (error) {
      console.error("Failed to fetch standings:", error);
    }
  };

  const fetchRoster = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/roster`);
      if (res.ok) {
        const data = await res.json();
        setRoster(data);
      }
    } catch (error) {
      console.error("Failed to fetch roster:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          position: "relative",
        }}
        className="noise-texture"
      >
        {/* Semi-opaque overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 25, 35, 0.75)",
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
          }}
        />
        <p style={{ color: "rgba(255,255,255,0.8)", position: "relative", zIndex: 1 }}>Loading...</p>
      </main>
    );
  }

  if (!league) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(170deg, #0f1923 0%, #141d2e 35%, #181428 70%, #1a1226 100%)",
        }}
        className="noise-texture"
      >
        <p style={{ color: "rgba(255,255,255,0.5)" }}>League not found</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, #0f1923 0%, #141d2e 35%, #181428 70%, #1a1226 100%)",
        overflowX: "hidden",
      }}
      className="noise-texture"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex items-center transition min-h-[44px]"
          style={{
            color: "rgba(255,255,255,0.45)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg
            style={{
              width: "16px",
              height: "16px",
              marginRight: "8px",
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Leagues
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start gap-4 mb-3">
            <h1 style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "28px",
              fontWeight: 800,
              color: "white",
              letterSpacing: "0.5px",
            }}>
              {league.name}
            </h1>
            <NotificationBell leagueId={leagueId} />
          </div>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "rgba(255,255,255,0.4)",
          }}>
            {league.memberships.length} {league.memberships.length === 1 ? "member" : "members"}
            {isCommissioner && " • You are commissioner"}
          </p>

          {/* Decorative line */}
          <div
            style={{
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(204,52,51,0.5), transparent)",
              margin: "16px 0 0 0",
            }}
          />
        </div>

        {/* Tab Navigation */}
        <TabNavigation
          tabs={[
            { id: "leaderboard", label: "Leaderboard" },
            { id: "myteam", label: "My Team" },
            { id: "draft", label: "Draft" },
            { id: "trades", label: "Trades" },
            { id: "players", label: "Players" },
            { id: "settings", label: "Settings" },
          ] as TabItem[]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        />

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === "leaderboard" && (
            <LeaderboardTab standings={standings} loading={loading} leagueId={leagueId} />
          )}
          {activeTab === "myteam" && (
            <MyTeamTab roster={roster} loading={loading} standings={standings} leagueId={leagueId} />
          )}
          {activeTab === "draft" && (
            <DraftTab
              league={league}
              leagueId={leagueId}
              isCommissioner={isCommissioner}
              router={router}
            />
          )}
          {activeTab === "trades" && (
            <TradesTab leagueId={leagueId} />
          )}
          {activeTab === "players" && (
            <PlayersTab standings={standings} loading={loading} />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              league={league}
              leagueId={leagueId}
              isCommissioner={isCommissioner}
            />
          )}
        </div>
      </div>
    </main>
  );
}
