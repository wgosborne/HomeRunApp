"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { NotificationBell } from "@/app/components/NotificationBell";
import { TabNavigation, type TabItem } from "@/app/components/TabNavigation";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import { LoadingScreen } from "@/app/components/LoadingScreen";
import { TradesTab } from "./components/TradesTab";

interface League {
  id: string;
  name: string;
  commissionerId: string;
  draftStatus: string;
  draftDate?: string;
  draftStartedAt?: string;
  seasonEndedAt?: string;
  winnerId?: string;
  winner?: { id: string; name: string; image?: string };
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

type TabType =
  | "leaderboard"
  | "myteam"
  | "draft"
  | "trades"
  | "players"
  | "settings";

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
    mlbTeam: string | null;
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
function LeaderboardTab({
  standings,
  loading,
  leagueId,
}: {
  standings: StandingsEntry[];
  loading: boolean;
  leagueId: string;
}) {
  const [todayTopStandings, setTodayTopStandings] = useState<StandingsEntry[]>(
    [],
  );
  const [todayHomersPerUser, setTodayHomersPerUser] = useState<
    Map<string, number>
  >(new Map());
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodayHomeruns = async () => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/homeruns/today`);
        if (!res.ok) throw new Error("Failed to fetch today's homeruns");

        const homeruns = await res.json();

        // Aggregate homeruns by owner
        const userCounts = new Map<string, number>();
        for (const hr of homeruns) {
          const current = userCounts.get(hr.ownerId) || 0;
          userCounts.set(hr.ownerId, current + 1);
        }

        setTodayHomersPerUser(userCounts);
      } catch (error) {
        console.error("Error fetching today's homeruns:", error);
      }
    };

    fetchTodayHomeruns();
  }, [leagueId]);

  useEffect(() => {
    setTodayTopStandings(
      [...standings].sort((a, b) => {
        const aCount = todayHomersPerUser.get(a.userId) || 0;
        const bCount = todayHomersPerUser.get(b.userId) || 0;
        return bCount - aCount;
      }),
    );
  }, [standings, todayHomersPerUser]);

  if (loading) {
    return (
      <div
        className="py-8 text-center"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Loading standings...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Season Standings Section */}
      <div>
        <div
          style={{
            paddingLeft: "16px",
            paddingRight: "16px",
            marginBottom: "13px",
          }}
        >
          <span
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
              textShadow:
                "0 0 16px rgba(204,52,51,0.35), 0 0 32px rgba(204,52,51,0.15)",
            }}
          >
            Season Standings
          </span>
        </div>

        <div
          className="space-y-2"
          style={{ paddingLeft: "16px", paddingRight: "16px" }}
        >
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
              onClick={() =>
                setExpandedUserId(
                  expandedUserId === entry.userId ? null : entry.userId,
                )
              }
            >
              {/* Accent stripe */}
              <div
                style={{
                  width: "4px",
                  backgroundColor:
                    entry.rank === 1
                      ? "#CC3433"
                      : entry.rank === 2
                        ? "#0E3386"
                        : "rgba(255,255,255,0.12)",
                  boxShadow:
                    entry.rank === 1
                      ? "2px 0 12px rgba(204,52,51,0.4)"
                      : "none",
                }}
              />

              {/* Card body */}
              <div
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {/* Left side */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.3)",
                      minWidth: "20px",
                    }}
                  >
                    {entry.rank}
                  </span>
                  <div>
                    <p
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "white",
                      }}
                    >
                      {entry.teamName}
                    </p>
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      {entry.userName}
                    </p>
                  </div>
                </div>

                {/* Right side */}
                <div style={{ textAlign: "right", marginLeft: "16px" }}>
                  <p
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "32px",
                      fontWeight: 800,
                      color: "white",
                    }}
                  >
                    {entry.totalHomeruns}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "9px",
                      color: "rgba(255,255,255,0.25)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Season HR
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Expanded players list */}
        {expandedUserId && (
          <div
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              marginTop: "8px",
            }}
          >
            {standings.find((s) => s.userId === expandedUserId)?.players && (
              <div
                style={{
                  backgroundColor: "rgba(14,51,134,0.08)",
                  border: "1px solid rgba(14,51,134,0.15)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.4)",
                    marginBottom: "12px",
                  }}
                >
                  Players (
                  {standings.find((s) => s.userId === expandedUserId)
                    ?.playerCount || 0}
                  )
                </p>
                <div className="space-y-2">
                  {standings
                    .find((s) => s.userId === expandedUserId)
                    ?.players.map((player) => (
                      <Link
                        key={player.playerId}
                        href={
                          player.mlbId
                            ? `/player/${player.mlbId}?leagueId=${leagueId}`
                            : "#"
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          opacity: player.mlbId ? 1 : 0.5,
                          pointerEvents: player.mlbId ? "auto" : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <PlayerAvatar
                            mlbId={player.mlbId}
                            playerName={player.playerName}
                            size="sm"
                            isYourPlayer={false}
                          />
                          <span
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "11px",
                              color: "rgba(255,255,255,0.7)",
                            }}
                          >
                            {player.playerName}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: "'Exo 2', sans-serif",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#CC3433",
                          }}
                        >
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
          <div
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              marginBottom: "13px",
            }}
          >
            <span
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
                textShadow:
                  "0 0 16px rgba(204,52,51,0.35), 0 0 32px rgba(204,52,51,0.15)",
              }}
            >
              Today's Leaders
            </span>
          </div>

          <div
            className="space-y-2"
            style={{ paddingLeft: "16px", paddingRight: "16px" }}
          >
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
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "4px",
                    height: "100%",
                    backgroundColor: "#CC3433",
                    zIndex: 0,
                  }}
                />

                <div
                  style={{
                    paddingLeft: "12px",
                    flex: 1,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "white",
                      marginBottom: "4px",
                    }}
                  >
                    {entry.teamName}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    {entry.userName}
                  </p>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    alignItems: "baseline",
                    gap: "4px",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#CC3433",
                    }}
                  >
                    +{todayHomersPerUser.get(entry.userId) || 0}
                  </span>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
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
function MyTeamTab({
  roster,
  loading,
  standings,
  leagueId,
  userId,
}: {
  roster: RosterEntry[];
  loading: boolean;
  standings: StandingsEntry[];
  leagueId: string;
  userId?: string;
}) {
  const [totalHomeruns, setTotalHomeruns] = useState(0);
  const [userRank, setUserRank] = useState(0);

  useEffect(() => {
    setTotalHomeruns(roster.reduce((sum, p) => sum + p.homeruns, 0));
    if (standings.length > 0 && userId) {
      // Find the current user's rank in the standings
      const userEntry = standings.find((entry) => entry.userId === userId);
      setUserRank(userEntry?.rank || 0);
    }
  }, [roster, standings, userId]);

  if (loading) {
    return (
      <div
        className="py-8 text-center"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Loading your team...
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      style={{ paddingLeft: "16px", paddingRight: "16px" }}
    >
      {/* Hero Card */}
      <div
        style={{
          borderRadius: "20px",
          padding: "20px",
          background:
            "linear-gradient(145deg, #0e2a6e 0%, #1a3f9c 55%, #0f2660 100%)",
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
            background:
              "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
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
            background:
              "radial-gradient(circle, rgba(204,52,51,0.07) 0%, transparent 70%)",
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
            background:
              "linear-gradient(90deg, #CC3433 0%, rgba(204,52,51,0.3) 60%, transparent 100%)",
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
            background:
              "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.18) 50%, transparent 90%)",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 10 }}>
          <p
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: "12px",
            }}
          >
            Your Team
          </p>

          {/* Hero number */}
          <p
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "64px",
              fontWeight: 800,
              color: "white",
              lineHeight: "1",
              marginBottom: "16px",
            }}
          >
            {totalHomeruns}
          </p>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "20px",
            }}
          >
            Season Home Runs
          </p>

          {/* Right-side rank info */}
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              textAlign: "right",
            }}
          >
            <p
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                color: "white",
              }}
            >
              # {userRank}
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              in league
            </p>
          </div>
        </div>
      </div>

      {/* Roster Section */}
      <div>
        <div
          style={{
            marginBottom: "13px",
          }}
        >
          <span
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
              textShadow:
                "0 0 16px rgba(204,52,51,0.35), 0 0 32px rgba(204,52,51,0.15)",
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
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              You haven't drafted any players yet. Start the draft to build your
              team!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {roster.map((player) => (
              <Link
                key={player.playerId}
                href={
                  player.mlbId
                    ? `/player/${player.mlbId}?leagueId=${leagueId}`
                    : "#"
                }
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
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingLeft: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      flex: 1,
                    }}
                  >
                    <div style={{ marginTop: "2px" }}>
                      <PlayerAvatar
                        mlbId={player.mlbId}
                        playerName={player.playerName}
                        size="sm"
                        isYourPlayer={true}
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          fontFamily: "'Exo 2', sans-serif",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "white",
                        }}
                      >
                        {player.playerName}
                      </p>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "10px",
                          color: "rgba(255,255,255,0.35)",
                        }}
                      >
                        {player.position || "N/A"}
                      </p>
                      {player.draftedRound && (
                        <p
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "9px",
                            color: "rgba(255,255,255,0.25)",
                            marginTop: "4px",
                          }}
                        >
                          R{player.draftedRound}P{player.draftedPickNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", marginLeft: "16px" }}>
                    <p
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: "22px",
                        fontWeight: 800,
                        color: "white",
                      }}
                    >
                      {player.homeruns}
                    </p>
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "9px",
                        color: "rgba(255,255,255,0.25)",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                      }}
                    >
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
function PlayersTab({
  standings,
  loading,
}: {
  standings: StandingsEntry[];
  loading: boolean;
}) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <div
        className="py-8 text-center"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Loading players...
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
        <div
          style={{
            borderRadius: "14px",
            padding: "24px",
            textAlign: "center",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            No teams yet
          </p>
        </div>
      </div>
    );
  }

  // Filter players and teams based on search term (team name, player name, or MLB team)
  const searchLower = searchTerm.toLowerCase();
  const filteredStandings = searchTerm.trim()
    ? standings
        .map((team) => {
          const teamMatchesSearch =
            team.teamName.toLowerCase().includes(searchLower) ||
            team.userName.toLowerCase().includes(searchLower);
          const matchingPlayers = team.players.filter(
            (player) =>
              player.playerName.toLowerCase().includes(searchLower) ||
              player.mlbTeam?.toLowerCase().includes(searchLower),
          );
          return {
            ...team,
            players: teamMatchesSearch ? team.players : matchingPlayers,
          };
        })
        .filter((team) => team.players.length > 0)
    : standings;

  // Auto-expand first team when search results appear, clear when search is empty
  useEffect(() => {
    if (searchTerm.trim() && filteredStandings.length > 0) {
      setExpandedTeamId(filteredStandings[0].userId);
    } else if (!searchTerm.trim()) {
      setExpandedTeamId(null);
    }
  }, [searchTerm, filteredStandings]);

  return (
    <div
      style={{
        paddingLeft: "16px",
        paddingRight: "16px",
        paddingBottom: "24px",
      }}
    >
      {/* Search Box */}
      <input
        type="text"
        placeholder="Search player, team, or MLB team..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 16px",
          backgroundColor: "rgba(255,255,255,0.4)",
          border: "none",
          borderRadius: "10px",
          fontSize: "16px",
          fontFamily: "'DM Sans', sans-serif",
          color: "white",
          minHeight: "44px",
          marginBottom: "16px",
          transition: "background 0.2s, box-shadow 0.2s",
          boxShadow: "0 0 16px rgba(255,255,255,0.2)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.48)";
          e.currentTarget.style.boxShadow = "0 0 24px rgba(255,255,255,0.3)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.4)";
          e.currentTarget.style.boxShadow = "0 0 16px rgba(255,255,255,0.2)";
        }}
      />
      <style>{`
        input::placeholder {
          color: rgba(255,255,255,0.7);
        }
      `}</style>

      {/* Teams List */}
      {filteredStandings.length === 0 && searchTerm.trim() ? (
        <div
          style={{
            borderRadius: "14px",
            padding: "24px",
            textAlign: "center",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            No players match "{searchTerm}"
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStandings.map((team) => (
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
                onClick={() =>
                  setExpandedTeamId(
                    expandedTeamId === team.userId ? null : team.userId,
                  )
                }
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
                    transform:
                      expandedTeamId === team.userId
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
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
                      <div
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "12px",
                          textAlign: "center",
                          padding: "8px 0",
                        }}
                      >
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
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.06)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.02)")
                          }
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
                              {player.position || "—"} • {player.mlbTeam || "—"}{" "}
                              • {player.homeruns} HRs
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
      )}
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
  const isDraftActive =
    league.draftStatus === "active" || league.draftStatus === "paused";
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
      const response = await fetch(`/api/draft/${leagueId}/picks`);
      if (!response.ok) {
        throw new Error("Failed to fetch draft picks");
      }
      const picks = await response.json();
      setDraftPicks(picks);
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
          <div
            style={{
              borderRadius: "14px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: shadowStack,
              padding: "20px",
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "white",
                  marginBottom: "8px",
                }}
              >
                Draft Lobby
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {isCommissioner
                  ? "Start the draft when all members have joined."
                  : "Waiting for the commissioner to start the draft..."}
              </p>
            </div>

            <div style={{ marginTop: "20px" }}>
              <h4
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "white",
                  marginBottom: "12px",
                }}
              >
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
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      {member.user?.name || "Unknown"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "rgba(204,52,51,0.1)",
                  border: "1px solid rgba(204,52,51,0.3)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  marginTop: "16px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "#CC3433",
                }}
              >
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
                  backgroundColor:
                    hasEnoughMembers && !loading
                      ? "#CC3433"
                      : "rgba(204,52,51,0.3)",
                  color: "white",
                  boxShadow:
                    hasEnoughMembers && !loading
                      ? "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset"
                      : "none",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {loading
                  ? "Starting..."
                  : hasEnoughMembers
                    ? "Start Draft"
                    : `Start Draft (need ${2 - league.memberships.length} more)`}
              </button>
            )}
          </div>
        )}

        {isDraftActive && (
          <div
            style={{
              borderRadius: "14px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "20px",
            }}
          >
            <h3
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "white",
                marginBottom: "8px",
              }}
            >
              Draft In Progress
            </h3>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "rgba(255,255,255,0.6)",
                marginBottom: "16px",
              }}
            >
              The draft is currently active. Enter the draft room to make your
              picks.
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
                boxShadow:
                  "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset",
              }}
            >
              Enter Draft Room
            </button>
          </div>
        )}

        {isDraftComplete && (
          <div>
            <div
              style={{
                borderRadius: "14px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "20px",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "white",
                  marginBottom: "8px",
                }}
              >
                Draft Complete
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                All members have completed their picks. View the full draft
                results below.
              </p>
            </div>

            {loadingPicks ? (
              <div
                className="py-8 text-center"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flex: 1,
                      }}
                    >
                      <PlayerAvatar
                        mlbId={pick.mlbId}
                        playerName={pick.playerName}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div>
                        <p
                          style={{
                            fontFamily: "'Exo 2', sans-serif",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "white",
                          }}
                        >
                          Pick {pick.pickNumber}: {pick.playerName}
                        </p>
                        <p
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "10px",
                            color: "rgba(255,255,255,0.35)",
                            marginTop: "4px",
                          }}
                        >
                          {pick.owner.name}
                        </p>
                      </div>
                    </div>
                    <p
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#CC3433",
                        flexShrink: 0,
                      }}
                    >
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

// End Season Section
function EndSeasonSection({ leagueId }: { leagueId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEndSeason = async () => {
    if (!confirm("Are you sure? This will crown the winner and lock the league. No more trades after this.")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/leagues/${leagueId}/end-season`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to end season");
      }

      // Reload to show updated UI
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end season");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: "14px",
        border: "1px solid rgba(204,52,51,0.3)",
        backgroundColor: "rgba(204,52,51,0.08)",
        padding: "20px",
      }}
    >
      <h3
        style={{
          fontFamily: "'Exo 2', sans-serif",
          fontSize: "16px",
          fontWeight: 800,
          color: "white",
          marginBottom: "8px",
        }}
      >
        End Season
      </h3>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: "rgba(255,255,255,0.6)",
          marginBottom: "16px",
        }}
      >
        Crown the winner and lock the league. No more trades or roster changes after this.
      </p>

      {error && (
        <div
          style={{
            marginBottom: "12px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(204,52,51,0.2)",
            border: "1px solid rgba(204,52,51,0.5)",
            color: "#FF6B6B",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleEndSeason}
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: "10px",
          fontFamily: "'Exo 2', sans-serif",
          fontSize: "12px",
          fontWeight: 700,
          backgroundColor: "#CC3433",
          color: "white",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          minHeight: "44px",
          boxShadow: "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset",
        }}
      >
        {loading ? "Ending Season..." : "End Season"}
      </button>
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
  const [draftDateTime, setDraftDateTime] = useState(
    league.draftDate
      ? new Date(league.draftDate).toISOString().slice(0, 16)
      : "",
  ); // YYYY-MM-DDTHH:mm format for datetime input
  const [savingDraftDate, setSavingDraftDate] = useState(false);
  const [draftDateError, setDraftDateError] = useState<string | null>(null);

  // Team name state
  const currentMembership = league.memberships.find(
    (m) => m.userId === session?.user?.id,
  );
  const [teamName, setTeamName] = useState(currentMembership?.teamName || "");
  const [savingTeamName, setSavingTeamName] = useState(false);
  const [teamNameError, setTeamNameError] = useState<string | null>(null);

  useEffect(() => {
    setInviteLink(`${window.location.origin}/join/${leagueId}`);
  }, [leagueId]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraftDate = async () => {
    if (!isCommissioner) return;

    setSavingDraftDate(true);
    setDraftDateError(null);

    try {
      const payload: any = {};
      if (draftDateTime) {
        payload.draftDate = new Date(draftDateTime).toISOString();
      } else {
        payload.draftDate = null;
      }

      const response = await fetch(`/api/leagues/${leagueId}/draft-date`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update draft date");
      }

      // Refresh the page to show updated date
      window.location.reload();
    } catch (err) {
      setDraftDateError(
        err instanceof Error ? err.message : "Failed to update draft date",
      );
    } finally {
      setSavingDraftDate(false);
    }
  };

  const handleSaveTeamName = async () => {
    setSavingTeamName(true);
    setTeamNameError(null);

    try {
      if (!teamName.trim()) {
        throw new Error("Team name cannot be empty");
      }

      const response = await fetch(`/api/leagues/${leagueId}/team-name`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamName: teamName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update team name");
      }

      // Refresh the page to show updated team name
      window.location.reload();
    } catch (err) {
      setTeamNameError(
        err instanceof Error ? err.message : "Failed to update team name",
      );
    } finally {
      setSavingTeamName(false);
    }
  };

  const handleDeleteLeague = async () => {
    if (
      !confirm(
        "Are you sure? This will permanently delete the league and all its data.",
      )
    ) {
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

      router.push("/league-tab");
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
      const response = await fetch(
        `/api/leagues/${leagueId}/members/${session?.user?.id || ""}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to leave league");
      }

      router.push("/league-tab");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave league");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
      <div className="space-y-6">
        {/* Team Name Section */}
        <div
          style={{
            borderRadius: "14px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: "20px",
          }}
        >
          <h3
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "16px",
              fontWeight: 800,
              color: "white",
              marginBottom: "16px",
            }}
          >
            Your Team Name
          </h3>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={100}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.12)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
            />
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: "rgba(255,255,255,0.4)",
                marginTop: "8px",
                marginBottom: "0",
              }}
            >
              Your team name will be displayed in the leaderboard. Must be
              unique within this league (1-100 characters).
            </p>
          </div>

          {teamNameError && (
            <div
              style={{
                marginBottom: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(204,52,51,0.2)",
                border: "1px solid rgba(204,52,51,0.5)",
                color: "#FF6B6B",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
              }}
            >
              {teamNameError}
            </div>
          )}

          <button
            onClick={handleSaveTeamName}
            disabled={savingTeamName}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              backgroundColor: "#CC3433",
              color: "white",
              border: "none",
              cursor: savingTeamName ? "not-allowed" : "pointer",
              opacity: savingTeamName ? 0.6 : 1,
              minHeight: "44px",
              boxShadow:
                "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset",
            }}
          >
            {savingTeamName ? "Saving..." : "Save Team Name"}
          </button>
        </div>

        {/* Invite Members Section */}
        <div
          style={{
            borderRadius: "14px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: "20px",
          }}
        >
          <h3
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "16px",
              fontWeight: 800,
              color: "white",
              marginBottom: "16px",
            }}
          >
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
                boxShadow:
                  "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {isCommissioner && (
          <div
            style={{
              borderRadius: "14px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "20px",
              overflow: "hidden",
            }}
          >
            <h3
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "16px",
                fontWeight: 800,
                color: "white",
                marginBottom: "16px",
              }}
            >
              Draft Date & Time
            </h3>
            <div style={{ marginBottom: "16px", minWidth: 0 }}>
              <label
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Scheduled Draft Date & Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={draftDateTime}
                onChange={(e) => setDraftDateTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "white",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  maxWidth: "100%",
                  WebkitAppearance: "none",
                  appearance: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.12)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
              />
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.4)",
                  marginTop: "8px",
                  marginBottom: "0",
                }}
              >
                This date and time are for reference only. The draft will{" "}
                <strong>not</strong> automatically start at this time. You'll
                need to manually click "Start Draft" in the Draft tab whenever
                you're ready. Members will receive a notification when you start
                the draft.
              </p>
            </div>

            {draftDateError && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(204,52,51,0.2)",
                  border: "1px solid rgba(204,52,51,0.5)",
                  color: "#FF6B6B",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                }}
              >
                {draftDateError}
              </div>
            )}

            <button
              onClick={handleSaveDraftDate}
              disabled={savingDraftDate}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "#CC3433",
                color: "white",
                border: "none",
                cursor: savingDraftDate ? "not-allowed" : "pointer",
                opacity: savingDraftDate ? 0.6 : 1,
                minHeight: "44px",
                boxShadow:
                  "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset",
              }}
            >
              {savingDraftDate ? "Saving..." : "Save Draft Date"}
            </button>
          </div>
        )}

        {isCommissioner && league.draftStatus === "complete" && !league.seasonEndedAt && (
          <EndSeasonSection leagueId={leagueId} />
        )}

        <div
          style={{
            borderRadius: "14px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: "20px",
          }}
        >
          <h3
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "16px",
              fontWeight: 800,
              color: "white",
              marginBottom: "16px",
            }}
          >
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
                  <p
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "white",
                    }}
                  >
                    {member.user?.name || "Unknown"}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    {member.user?.email}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "9px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    backgroundColor:
                      member.role === "commissioner" ? "#CC3433" : "#0E3386",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: "6px",
                  }}
                >
                  {member.role === "commissioner" ? "Commissioner" : "Member"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              borderRadius: "14px",
              backgroundColor: "rgba(204,52,51,0.2)",
              border: "1px solid rgba(204,52,51,0.5)",
              padding: "16px",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "#FF6B6B",
                margin: 0,
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* Danger Zone */}
        <div
          style={{
            borderRadius: "14px",
            backgroundColor: "rgba(204,52,51,0.08)",
            border: "1px solid rgba(204,52,51,0.2)",
            padding: "20px",
          }}
        >
          <h3
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "16px",
              fontWeight: 800,
              color: "#FF6B6B",
              marginBottom: "16px",
            }}
          >
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

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              color: "rgba(255,255,255,0.4)",
              marginTop: "12px",
              marginBottom: 0,
            }}
          >
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
  const leagueId = params?.leagueId as string | undefined;

  // Show loading if leagueId isn't available yet (iOS Safari timing issue)
  if (!leagueId) {
    return <LoadingScreen />;
  }

  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("leaderboard");

  // Team name modal state
  const [showTeamNameModal, setShowTeamNameModal] = useState(false);
  const [modalTeamName, setModalTeamName] = useState("");
  const [savingModalTeamName, setSavingModalTeamName] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const teamNameModalShownRef = useRef(false);

  // Reset state when leagueId changes
  useEffect(() => {
    setLeague(null);
    setStandings([]);
    setRoster([]);
    setLoading(true);
    setActiveTab("leaderboard");
    setShowTeamNameModal(false);
    teamNameModalShownRef.current = false; // Reset ref for new league
  }, [leagueId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      try {
        // Small delay to ensure session is fully established (helps with iOS Safari)
        const timer = setTimeout(() => {
          fetchLeague();
        }, 100);

        const interval = setInterval(() => {
          try {
            fetchLeague();
          } catch (error) {
            console.error("Error in periodic fetchLeague:", error);
          }
        }, 20000);

        return () => {
          clearTimeout(timer);
          clearInterval(interval);
        };
      } catch (error) {
        console.error("Error initializing league data:", error);
        setLoading(false);
      }
    }
  }, [status, leagueId, session?.user?.id]);

  useEffect(() => {
    if (activeTab === "leaderboard") {
      try {
        fetchStandings();
        const interval = setInterval(() => {
          try {
            fetchStandings();
          } catch (error) {
            console.error("Error in periodic fetchStandings:", error);
          }
        }, 20000);
        return () => clearInterval(interval);
      } catch (error) {
        console.error("Error initializing standings:", error);
      }
    }
  }, [activeTab, leagueId]);

  useEffect(() => {
    if (activeTab === "myteam" || activeTab === "players") {
      try {
        fetchRoster();
        const interval = setInterval(() => {
          try {
            fetchRoster();
          } catch (error) {
            console.error("Error in periodic fetchRoster:", error);
          }
        }, 20000);
        return () => clearInterval(interval);
      } catch (error) {
        console.error("Error initializing roster:", error);
      }
    }
  }, [activeTab, leagueId]);

  // Redirect from draft tab if draft is complete
  useEffect(() => {
    if (activeTab === "draft" && league && league.draftStatus === "complete") {
      setActiveTab("leaderboard");
    }
  }, [league?.draftStatus, activeTab]);

  useEffect(() => {
    // Delay Pusher subscription to avoid blocking initial render on mobile
    const timer = setTimeout(() => {
      try {
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
      } catch (error) {
        console.error("Error subscribing to draft channel:", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [leagueId, router]);

  useEffect(() => {
    // Delay Pusher subscription to avoid blocking initial render on mobile
    const timer = setTimeout(() => {
      try {
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
      } catch (error) {
        console.error("Error subscribing to league channel:", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [leagueId, activeTab]);

  const fetchLeague = async () => {
    try {
      // Add cache-buster to prevent mobile browser caching old league data
      const res = await fetch(`/api/leagues/${leagueId}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setLeague(data);
        setIsCommissioner(data.commissionerId === session?.user?.id);

        // Check if user just joined (within the last 60 seconds)
        // and hasn't customized their team name yet
        // But NOT if they are the commissioner (league creator)
        // And NOT if the modal has already been shown once in this session
        const isCommissioner = data.commissionerId === session?.user?.id;
        const userMembership = data.memberships.find(
          (m: any) => m.userId === session?.user?.id,
        );
        if (
          !teamNameModalShownRef.current &&
          !isCommissioner &&
          userMembership &&
          userMembership.teamName &&
          userMembership.teamName.endsWith("'s Team")
        ) {
          try {
            const joinedAtTime = userMembership.joinedAt
              ? new Date(userMembership.joinedAt).getTime()
              : null;
            if (joinedAtTime) {
              const now = Date.now();
              const secondsAgo = (now - joinedAtTime) / 1000;

              // Only show modal if joined within last 60 seconds
              if (secondsAgo < 60) {
                setModalTeamName(userMembership.teamName);
                setShowTeamNameModal(true);
                teamNameModalShownRef.current = true; // Immediately mark as shown
              }
            }
          } catch (error) {
            console.error("Error checking team name modal:", error);
          }
        }
      } else if (res.status === 404 || res.status === 403) {
        // League not found or no access - redirect to scores
        console.warn(
          `League ${leagueId} not found (${res.status}), redirecting to scores`,
        );
        setTimeout(() => router.push("/scores"), 500);
      } else {
        console.error(`Failed to fetch league: ${res.status}`);
      }
    } catch (error) {
      console.error("Failed to fetch league:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async () => {
    try {
      const res = await fetch(
        `/api/leagues/${leagueId}/standings?t=${Date.now()}`,
      );
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
      const res = await fetch(
        `/api/leagues/${leagueId}/roster?t=${Date.now()}`,
      );
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
          background:
            "linear-gradient(170deg, #0f1923 0%, #141d2e 35%, #181428 70%, #1a1226 100%)",
          position: "relative",
        }}
      >
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.8)", fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
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
          background:
            "linear-gradient(170deg, #0f1923 0%, #141d2e 35%, #181428 70%, #1a1226 100%)",
        }}
      >
        <p style={{ color: "rgba(255,255,255,0.5)" }}>League not found</p>
      </main>
    );
  }

  const handleSaveModalTeamName = async () => {
    setSavingModalTeamName(true);
    setModalError(null);

    try {
      if (!modalTeamName.trim()) {
        throw new Error("Team name cannot be empty");
      }

      const response = await fetch(`/api/leagues/${leagueId}/team-name`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamName: modalTeamName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update team name");
      }

      // Close modal and refresh league data (don't reload page)
      setShowTeamNameModal(false);
      // Mark modal as shown so it doesn't appear again in this session
      teamNameModalShownRef.current = true;
      // Force refresh of league data to show updated team name
      await fetchLeague();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Failed to update team name",
      );
    } finally {
      setSavingModalTeamName(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(170deg, #0f1923 0%, #141d2e 35%, #181428 70%, #1a1226 100%)",
        overflowX: "hidden",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Leagues
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start gap-4 mb-3">
            <h1
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "28px",
                fontWeight: 800,
                color: "white",
                letterSpacing: "0.5px",
              }}
            >
              {league.name}
            </h1>
            <NotificationBell leagueId={leagueId} />
          </div>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {league.memberships.length}{" "}
            {league.memberships.length === 1 ? "member" : "members"}
            {isCommissioner && " • You are commissioner"}
          </p>

          {/* Draft Date Display */}
          {league.draftDate && league.draftStatus !== "complete" && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "#CC3433",
                marginTop: "8px",
              }}
            >
              Draft scheduled: {new Date(league.draftDate).toLocaleDateString()}{" "}
              at{" "}
              {new Date(league.draftDate).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {/* Decorative line */}
          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, rgba(204,52,51,0.5), transparent)",
              margin: "16px 0 0 0",
            }}
          />
        </div>

        {/* Champion Banner */}
        {league.seasonEndedAt && (() => {
          const winner = standings.find(s => s.userId === league.winnerId);
          return (
            <div style={{
              margin: "16px 0 16px 0",
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(204,52,51,0.15) 0%, rgba(14,51,134,0.15) 100%)",
              border: "1px solid rgba(204,52,51,0.35)",
              padding: "20px",
              textAlign: "center",
            }}>
              <p style={{ fontFamily: "'Exo 2'", fontWeight: 800, fontSize: "18px", color: "white" }}>
                {winner?.teamName || league.winner?.name} — League Champion
              </p>
              <p style={{ fontFamily: "'DM Sans'", fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                {winner?.totalHomeruns ?? "—"} Home Runs · {winner?.userName}
              </p>
              <p style={{ fontFamily: "'DM Sans'", fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "8px" }}>
                Season Complete · See you in April!
              </p>
            </div>
          );
        })()}

        {/* Tab Navigation */}
        <TabNavigation
          tabs={
            [
              { id: "leaderboard", label: "Leaderboard" },
              { id: "myteam", label: "My Team" },
              ...(league.draftStatus === "pending" || league.draftStatus === "active"
                ? [{ id: "draft", label: "Draft" }]
                : []),
              { id: "trades", label: "Trades" },
              { id: "players", label: "Players" },
              { id: "settings", label: "Settings" },
            ] as TabItem[]
          }
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        />

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === "leaderboard" && (
            <LeaderboardTab
              standings={standings}
              loading={loading}
              leagueId={leagueId}
            />
          )}
          {activeTab === "myteam" && (
            <MyTeamTab
              roster={roster}
              loading={loading}
              standings={standings}
              leagueId={leagueId}
              userId={session?.user?.id}
            />
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
            <TradesTab
              leagueId={leagueId}
              isSeasonEnded={!!league.seasonEndedAt}
              isCommissioner={isCommissioner}
            />
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

      {/* Team Name Modal */}
      {showTeamNameModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#0f1923",
              borderRadius: "20px",
              padding: "32px 24px",
              maxWidth: "420px",
              width: "90%",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <h2
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "22px",
                fontWeight: 800,
                color: "white",
                margin: "0 0 12px 0",
              }}
            >
              Pick Your Team Name
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "rgba(255,255,255,0.6)",
                margin: "0 0 24px 0",
                lineHeight: 1.5,
              }}
            >
              Give your team a custom name to show in the leaderboard. You can
              always change it later in settings.
            </p>

            <label
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Team Name
            </label>
            <input
              type="text"
              value={modalTeamName}
              onChange={(e) => setModalTeamName(e.target.value)}
              maxLength={100}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                boxSizing: "border-box",
                marginBottom: "12px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.12)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
            />

            {modalError && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(204,52,51,0.2)",
                  border: "1px solid rgba(204,52,51,0.5)",
                  color: "#FF6B6B",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  marginBottom: "16px",
                }}
              >
                {modalError}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setShowTeamNameModal(false);
                  teamNameModalShownRef.current = true;
                }}
                disabled={savingModalTeamName}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backgroundColor: "transparent",
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: savingModalTeamName ? "not-allowed" : "pointer",
                  opacity: savingModalTeamName ? 0.5 : 1,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Skip for Now
              </button>
              <button
                onClick={handleSaveModalTeamName}
                disabled={savingModalTeamName}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#CC3433",
                  color: "white",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: savingModalTeamName ? "not-allowed" : "pointer",
                  opacity: savingModalTeamName ? 0.6 : 1,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  boxShadow: "0 4px 14px rgba(204, 52, 51, 0.45)",
                }}
              >
                {savingModalTeamName ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
