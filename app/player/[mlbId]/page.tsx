"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import { LoadingScreen } from "@/app/components/LoadingScreen";

interface HomerunEvent {
  playerName: string;
  mlbId: number | null;
  mlbTeam: string | null;
  gameDate: string;
  inning: number;
  rbi: number;
  leagueName: string;
  homeTeam: string | null;
  awayTeam: string | null;
  opponent: string | null;
  isHomeGame: boolean;
}

interface LeagueContext {
  hrRank: number;
  totalPlayers: number;
  ownerName: string;
  ownerImage: string | null;
  draftedRound: number | null;
  draftedPickNumber: number | null;
  tradeHistory: Array<{ fromOwnerName: string; toOwnerName: string; tradedAt: string }>;
}

interface TodaysGame {
  opponent: string;
  isHome: boolean;
  status: "Pre-Game" | "In Progress" | "Final";
  gameTime: string;
  homeScore: number | null;
  awayScore: number | null;
  currentInning: number | null;
}

interface PlayerDetail {
  mlbId: number;
  playerName: string;
  mlbTeam: string | null;
  position: string | null;
  homeruns: HomerunEvent[];
  totalHomeruns: number;
  streakStatus: "hot" | "neutral" | "cold";
  leagueContext?: LeagueContext;
}

const shadowStack = `
  0 2px 0 rgba(255,255,255,0.05) inset,
  0 -1px 0 rgba(0,0,0,0.3) inset,
  0 4px 8px rgba(0,0,0,0.3),
  0 10px 28px rgba(0,0,0,0.25),
  0 20px 48px rgba(0,0,0,0.15)
`;

export default function PlayerDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const mlbId = params.mlbId as string;
  const leagueId = searchParams.get("leagueId");

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [todaysGame, setTodaysGame] = useState<TodaysGame | null | "loading">("loading");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    const fetchPlayerDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = leagueId
          ? `/api/players/${mlbId}?leagueId=${leagueId}`
          : `/api/players/${mlbId}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch player details");
        }

        const data: PlayerDetail = await response.json();
        setPlayer(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load player details"
        );
      } finally {
        setLoading(false);
      }
    };

    const fetchTodaysGame = async () => {
      try {
        const response = await fetch(`/api/players/${mlbId}/game-today`);
        if (response.ok) {
          const data = await response.json();
          setTodaysGame(data.game);
        } else {
          setTodaysGame(null);
        }
      } catch (err) {
        setTodaysGame(null);
      }
    };

    fetchPlayerDetails();
    fetchTodaysGame();
  }, [mlbId, leagueId, status, router]);

  if (status === "loading" || loading) {
    return <LoadingScreen />;
  }

  if (error || !player) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#0f1923",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#CC3433", marginBottom: "24px" }}>
          {error || "Player not found"}
        </div>
        <button
          onClick={() => router.back()}
          style={{
            padding: "10px 20px",
            backgroundColor: "rgba(14,51,134,0.4)",
            border: "1px solid rgba(14,51,134,0.6)",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#0f1923", minHeight: "100vh", paddingBottom: "40px" }}>
      {/* Header with back button */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          ←
        </button>
        <h1
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "18px",
            fontWeight: 700,
            color: "white",
            margin: 0,
          }}
        >
          Player Details
        </h1>
      </div>

      {/* Player hero section */}
      <div style={{ padding: "24px 16px" }}>
        <div
          style={{
            borderRadius: "20px",
            padding: "32px 24px",
            background: "linear-gradient(145deg, #0e2a6e 0%, #1a3f9c 55%, #0f2660 100%)",
            boxShadow: shadowStack,
            overflow: "hidden",
            position: "relative",
            textAlign: "center",
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

          {/* Streak badge - top right */}
          {player.streakStatus !== "neutral" && (
            <div
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                zIndex: 2,
                padding: "6px 12px",
                borderRadius: "20px",
                backgroundColor:
                  player.streakStatus === "hot"
                    ? "#CC3433"
                    : "rgba(100,160,220,0.25)",
                color: player.streakStatus === "hot" ? "white" : "rgba(150,200,255,0.9)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {player.streakStatus === "hot" ? "🔥 Hot" : "❄️ Cold"}
            </div>
          )}

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Avatar */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <PlayerAvatar
                mlbId={player.mlbId}
                playerName={player.playerName}
                size="lg"
                isYourPlayer={false}
              />
            </div>

            {/* Player name */}
            <h2
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "28px",
                fontWeight: 800,
                color: "white",
                margin: "0 0 8px 0",
              }}
            >
              {player.playerName}
            </h2>

            {/* Team and position */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                margin: "0 0 16px 0",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.6)",
                  margin: 0,
                }}
              >
                {player.mlbTeam || "Unknown Team"}
              </p>
              {player.position && (
                <div
                  style={{
                    padding: "4px 8px",
                    border: "1px solid rgba(255,255,255,0.5)",
                    borderRadius: "6px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.6)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {player.position}
                </div>
              )}
            </div>

            {/* Stats */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "32px",
                marginTop: "24px",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: "32px",
                    fontWeight: 800,
                    color: "#CC3433",
                  }}
                >
                  {player.totalHomeruns}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginTop: "4px",
                  }}
                >
                  Total HRs
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's game card */}
      <div style={{ paddingLeft: "16px", paddingRight: "16px", marginBottom: "24px" }}>
        <div style={{ marginBottom: "8px" }}>
          <h3
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "2px",
              margin: "0 0 12px 0",
            }}
          >
            Today's Game
          </h3>

          {todaysGame === "loading" ? (
            <div
              style={{
                borderRadius: "12px",
                padding: "20px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                style={{
                  height: "12px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
          ) : todaysGame ? (
            <div
              style={{
                borderRadius: "12px",
                padding: "16px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: shadowStack,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#CC3433",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Today
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.5)",
                    padding: "4px 8px",
                    backgroundColor: "rgba(255,255,255,0.07)",
                    borderRadius: "4px",
                    textTransform: "capitalize",
                  }}
                >
                  {todaysGame.status === "Pre-Game" && "Pre-Game"}
                  {todaysGame.status === "In Progress" && "Live"}
                  {todaysGame.status === "Final" && "Final"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {todaysGame.opponent}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {todaysGame.isHome ? "Home" : "Away"}
                </div>
              </div>
              {todaysGame.homeScore !== null && todaysGame.awayScore !== null && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "16px",
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {todaysGame.isHome ? (
                    <>
                      <span>{todaysGame.homeScore}</span>
                      <span>-</span>
                      <span>{todaysGame.awayScore}</span>
                    </>
                  ) : (
                    <>
                      <span>{todaysGame.awayScore}</span>
                      <span>-</span>
                      <span>{todaysGame.homeScore}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                borderRadius: "12px",
                padding: "24px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.4)",
                  margin: 0,
                }}
              >
                No game today
              </p>
            </div>
          )}
        </div>
      </div>

      {/* League context section */}
      {player.leagueContext && (
        <div style={{ paddingLeft: "16px", paddingRight: "16px", marginBottom: "24px" }}>
          <h3
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "2px",
              margin: "0 0 12px 0",
            }}
          >
            League Stats
          </h3>

          {/* HR Rank */}
          <div
            style={{
              borderRadius: "12px",
              padding: "16px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: shadowStack,
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                HR Rank
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span
                  style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#CC3433",
                  }}
                >
                  {player.leagueContext.hrRank}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  of {player.leagueContext.totalPlayers}
                </span>
              </div>
            </div>
          </div>

          {/* Owner info */}
          <div
            style={{
              borderRadius: "12px",
              padding: "16px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: shadowStack,
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {player.leagueContext.ownerImage ? (
                <img
                  src={player.leagueContext.ownerImage}
                  alt={player.leagueContext.ownerName}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(204,52,51,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#CC3433",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {player.leagueContext.ownerName.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Owner
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    color: "white",
                    fontWeight: 600,
                  }}
                >
                  {player.leagueContext.ownerName}
                </div>
              </div>
            </div>
          </div>

          {/* Draft info */}
          {player.leagueContext.draftedRound && (
            <div
              style={{
                borderRadius: "12px",
                padding: "16px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: shadowStack,
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: "4px",
                }}
              >
                Draft Info
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: "white",
                }}
              >
                Round {player.leagueContext.draftedRound}, Pick {player.leagueContext.draftedPickNumber}
              </div>
            </div>
          )}

          {/* Trade history */}
          {player.leagueContext.tradeHistory.length > 0 && (
            <div
              style={{
                borderRadius: "12px",
                padding: "16px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: shadowStack,
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: "12px",
                }}
              >
                Trade History
              </div>
              {player.leagueContext.tradeHistory.map((trade, idx) => (
                <div
                  key={idx}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: idx === player.leagueContext!.tradeHistory.length - 1 ? 0 : "8px",
                  }}
                >
                  {trade.fromOwnerName} → {trade.toOwnerName}{" "}
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>
                    {new Date(trade.tradedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Homerun history section */}
      <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "2px",
              margin: "0 0 12px 0",
            }}
          >
            Homerun History
          </h3>

          {player.homeruns.length === 0 ? (
            <div
              style={{
                borderRadius: "12px",
                padding: "24px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.4)",
                  margin: 0,
              }}
              >
                No homeruns recorded yet
              </p>
            </div>
          ) : (
            <div>
              {player.homeruns.map((hr, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: "12px",
                    padding: "16px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: shadowStack,
                    marginBottom: "12px",
                  }}
                >
                  {/* Date and home/away */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "white",
                      }}
                    >
                      {new Date(hr.gameDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "10px",
                        color: "rgba(255,255,255,0.5)",
                        padding: "4px 8px",
                        backgroundColor: "rgba(255,255,255,0.07)",
                        borderRadius: "4px",
                      }}
                    >
                      {hr.isHomeGame ? "🏠 Home" : "✈️ Away"}
                    </div>
                  </div>

                  {/* Opponent */}
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "13px",
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: "8px",
                    }}
                  >
                    vs {hr.opponent || "Unknown"}
                  </div>

                  {/* Inning and RBI and League */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px" }}>
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        Inning {hr.inning}
                      </div>
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        {hr.rbi} RBI{hr.rbi !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "10px",
                        color: "#CC3433",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        fontWeight: 600,
                      }}
                    >
                      {hr.leagueName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
