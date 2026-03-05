"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import { NotificationDropdown } from "@/app/components/NotificationDropdown";
import { UserMenu } from "@/app/components/UserMenu";

interface League {
  id: string;
  name: string;
  commissionerId: string;
  userRole: string;
  teamName?: string;
  memberships: any[];
  draftStatus?: string;
  userRank?: number;
}

interface LiveGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  inning: number | null;
  inningHalf: string | null;
  gameType: string;
  userPlayerCount: number;
}

interface HomerunEvent {
  playerName: string;
  mlbTeam: string;
  mlbId: number | null;
  hrNumber: number;
  leagueName: string;
  isYourPlayer: boolean;
  occurredAt: string;
}

// Header component
const Header = ({ onBellClick }: { onBellClick: () => void }) => (
  <header
    className="sticky top-0 z-50"
    style={{
      backgroundColor: "#0f1923",
      paddingTop: "18px",
      paddingBottom: "14px",
    }}
  >
    <div
      className="flex justify-between items-center mb-1 dashboard-content"
      style={{ height: "24px", paddingLeft: "18px", paddingRight: "18px" }}
    >
      {/* Brand name */}
      <div className="flex items-baseline gap-0">
        <span
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "24px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "1px",
            textTransform: "uppercase",
            textShadow: "0 2px 12px rgba(14,51,134,0.4)",
          }}
        >
          DINGER
        </span>
        <span
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "24px",
            fontWeight: 800,
            color: "#CC3433",
            letterSpacing: "1px",
            textShadow: "0 2px 12px rgba(204,52,51,0.5)",
          }}
        >
          Z
        </span>
      </div>

      {/* Right side buttons */}
      <div className="flex items-center gap-2">
        {/* Notification bell dropdown */}
        <NotificationDropdown onBellClick={onBellClick} />

        {/* User menu dropdown */}
        <UserMenu />
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
  </header>
);

// Section header component
const SectionHeader = ({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) => (
  <div
    style={{
      display: "flex",
    justifyContent: "space-between",
      alignItems: "center",
    paddingTop: "10px",
    paddingBottom: "6px",
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
        color: "#FFFFFF",
        backgroundColor: "rgba(204, 52, 51, 0.6)",
        paddingLeft: "10px",
        paddingRight: "10px",
        paddingTop: "6px",
        paddingBottom: "6px",
        borderRadius: "6px",
        textShadow: "0 0 16px rgba(204,52,51,0.35), 0 0 32px rgba(204,52,51,0.15)",
      }}
    >
      {label}
    </span>
    {action && (
      <button
        onClick={onAction}
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "12px",
          fontWeight: 600,
          color: "#FFFFFF",
          backgroundColor: "rgba(204, 52, 51, 0.6)",
          paddingLeft: "12px",
          paddingRight: "12px",
          paddingTop: "6px",
          paddingBottom: "6px",
          borderRadius: "6px",
          textShadow: "0 0 20px rgba(204,52,51,0.4)",
          border: "none",
          cursor: "pointer",
        }}
      >
        {action}
      </button>
    )}
  </div>
);

// Featured game card component
const FeaturedGameCard = ({ game }: { game: LiveGame }) => {
  const isLive = game.status === "Live";

  return (
    <div
      className="relative overflow-hidden"
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
      <div className="relative z-10">
        {/* Top row: LIVE badge + inning */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
          {isLive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#CC3433",
                borderRadius: "6px",
                padding: "6px 10px",
                boxShadow: "0 3px 10px rgba(204,52,51,0.5), 0 1px 0 rgba(255,255,255,0.15) inset",
              }}
            >
              <span
                className="pulse-live"
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "white",
                }}
              />
              <span
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                }}
              >
                LIVE
              </span>
            </div>
          )}
          {isLive && (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {game.inningHalf && game.inning ? `${game.inningHalf} ${game.inning}` : "—"}
            </span>
          )}
        </div>

        {/* Team/score row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "16px",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          {/* Home team */}
          <div>
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "32px",
                fontWeight: 800,
                color: "white",
              }}
            >
              {game.homeTeam.substring(0, 3).toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                color: "rgba(255,255,255,0.32)",
              }}
            >
              {game.homeTeam}
            </div>
          </div>

          {/* Score */}
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              padding: "8px 14px",
            }}
          >
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "36px",
                fontWeight: 800,
                color: "white",
                letterSpacing: "-1px",
                lineHeight: "1",
              }}
            >
              {game.homeScore}-{game.awayScore}
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "8px",
                color: "rgba(255,255,255,0.5)",
                marginTop: "2px",
              }}
            >
              SCORE
            </div>
          </div>

          {/* Away team */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "32px",
                fontWeight: 800,
                color: "white",
              }}
            >
              {game.awayTeam.substring(0, 3).toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                color: "rgba(255,255,255,0.32)",
              }}
            >
              {game.awayTeam}
            </div>
          </div>
        </div>

        {/* Your players indicator */}
        {game.userPlayerCount > 0 && (
          <div
            style={{
              backgroundColor: "rgba(107,174,214,0.07)",
              border: "1px solid rgba(107,174,214,0.15)",
              borderRadius: "8px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#6BAED6",
                boxShadow: "0 0 8px rgba(107,174,214,0.6)",
              }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <span style={{ color: "#6BAED6", fontWeight: 600 }}>
                {game.userPlayerCount}
              </span>{" "}
              of your players {game.userPlayerCount === 1 ? "is" : "are"} in this game
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Small game card component
const SmallGameCard = ({ game, onSelect }: { game: LiveGame; onSelect?: (gameId: string) => void }) => {
  const isLive = game.status === "Live";

  return (
    <div
      className="small-game-card"
      onClick={() => isLive && onSelect?.(game.id)}
      style={{
        minWidth: "120px",
        backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px",
        padding: "12px",
        boxShadow:
          "0 4px 12px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.06) inset",
        cursor: isLive ? "pointer" : "default",
        opacity: isLive ? 1 : 0.6,
        transition: isLive ? "all 0.2s" : "none",
      }}
      onMouseEnter={(e) => {
        if (isLive) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)";
        }
      }}
      onMouseLeave={(e) => {
        if (isLive) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.04)";
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
        }
      }}
    >
      <div
        style={{
          fontFamily: "'Exo 2', sans-serif",
          fontSize: "14px",
          fontWeight: 700,
          color: "rgba(255,255,255,0.8)",
          marginBottom: "6px",
        }}
      >
        {game.homeTeam.substring(0, 3)} vs {game.awayTeam.substring(0, 3)}
      </div>
      {isLive ? (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            className="pulse-live"
            style={{
              display: "inline-block",
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: "#CC3433",
            }}
          />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              color: "#CC3433",
              fontWeight: 500,
            }}
          >
            Live · Inning {game.inning || 1}
          </span>
        </div>
      ) : (
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          Upcoming
        </div>
      )}
      {isLive && (
        <div
          className="score-desktop"
          style={{
            fontFamily: "'Exo 2'",
            fontSize: "18px",
            fontWeight: 700,
            color: "white",
            marginTop: "4px",
          }}
        >
          {game.homeScore} - {game.awayScore}
        </div>
      )}
    </div>
  );
};

// Homerun card component
const HomeruntCard = ({ hr, isYourPlayer }: { hr: HomerunEvent; isYourPlayer: boolean }) => {
  const href = hr.mlbId ? `/player/${hr.mlbId}` : "#";
  return (
    <Link
      href={href}
      className="homerun-card"
      style={{
        minWidth: "118px",
        borderRadius: "16px",
        padding: "14px 12px",
        textAlign: "center",
        backgroundColor: isYourPlayer ? "rgba(204,52,51,0.05)" : "rgba(255,255,255,0.04)",
        border: isYourPlayer
          ? "1.5px solid rgba(204,52,51,0.55)"
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow: `
          0 2px 0 rgba(255,255,255,0.05) inset,
          0 8px 16px rgba(0,0,0,0.2),
          0 16px 32px rgba(0,0,0,0.15)
        `,
        filter: isYourPlayer
          ? "drop-shadow(0 0 12px rgba(204,52,51,0.4)) drop-shadow(0 0 24px rgba(204,52,51,0.2))"
          : "none",
        display: "block",
      }}
    >
      {/* Avatar circle */}
      <div
        style={{
          margin: "0 auto 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PlayerAvatar
          mlbId={hr.mlbId}
          playerName={hr.playerName}
          size="md"
          isYourPlayer={isYourPlayer}
        />
      </div>

      {/* Player name */}
      <div
        style={{
          fontFamily: "'Exo 2', sans-serif",
          fontSize: "12px",
          fontWeight: 700,
          color: "#FFFFFF",
          marginBottom: "4px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {hr.playerName}
      </div>

      {/* HR number */}
      <div
        style={{
          fontFamily: "'Exo 2', sans-serif",
          fontSize: "30px",
          fontWeight: 800,
          color: "white",
          lineHeight: "1",
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          marginBottom: "4px",
        }}
      >
        #{hr.hrNumber}
      </div>

      {/* Team + timestamp */}
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "9px",
          color: "rgba(255,255,255,0.6)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "8px",
        }}
      >
        {hr.mlbTeam} · 2h ago
      </div>

      {/* League pill */}
      <div
        style={{
          backgroundColor: "rgba(14,51,134,0.55)",
          color: "#FFFFFF",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "9px",
          borderRadius: "100px",
          padding: "3px 8px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {hr.leagueName}
      </div>
    </Link>
  );
};

// League card component
const LeagueCard = ({
  league,
  isCommissioner,
}: {
  league: League;
  isCommissioner: boolean;
}) => {
  return (
    <div
      className="flex"
      style={{
        borderRadius: "14px",
        backgroundColor: "rgba(255,255,255,0.04)",
        border: isCommissioner
          ? "1px solid rgba(204,52,51,0.18)"
          : "1px solid rgba(255,255,255,0.06)",
        boxShadow: isCommissioner
          ? `
              0 2px 0 rgba(255,255,255,0.05) inset,
              0 -1px 0 rgba(0,0,0,0.3) inset,
              0 4px 8px rgba(0,0,0,0.3),
              0 10px 28px rgba(0,0,0,0.25),
              0 20px 48px rgba(0,0,0,0.15),
              0 0 30px rgba(204,52,51,0.06)
            `
          : `
              0 2px 0 rgba(255,255,255,0.05) inset,
              0 -1px 0 rgba(0,0,0,0.3) inset,
              0 4px 8px rgba(0,0,0,0.3),
              0 10px 28px rgba(0,0,0,0.25),
              0 20px 48px rgba(0,0,0,0.15)
            `,
        marginBottom: "9px",
        overflow: "hidden",
      }}
    >
      {/* Accent stripe */}
      <div
        style={{
          width: "4px",
          backgroundColor: isCommissioner ? "#CC3433" : "#0E3386",
          boxShadow: isCommissioner ? "2px 0 12px rgba(204,52,51,0.4)" : "none",
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
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "white",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              marginBottom: "4px",
            }}
          >
            {league.name}
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: isCommissioner ? "#FF6B6B" : "#7DC5E8",
            }}
          >
            {isCommissioner ? "Commissioner" : "Member"}
          </div>
          <div
            className="league-extra"
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.65)",
              marginTop: "4px",
            }}
          >
            {league.memberships.length} members · {league.draftStatus || "pending"}
          </div>
        </div>

        {/* Right side */}
        <div style={{ marginLeft: "16px", textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "42px",
              fontWeight: 800,
              color: isCommissioner ? "#CC3433" : "#0E3386",
              lineHeight: "1",
            }}
          >
            {league.userRank || 1}
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              color: "rgba(255,255,255,0.2)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginTop: "2px",
            }}
          >
            rank
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [games, setGames] = useState<LiveGame[]>([]);
  const [homeruns, setHomeruns] = useState<HomerunEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredGameId, setFeaturedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeagues();
      fetchGames();
      fetchHomeruns();

      // Set up polling
      const gamesInterval = setInterval(fetchGames, 2 * 60 * 1000);
      const hrunsInterval = setInterval(fetchHomeruns, 2 * 60 * 1000);

      return () => {
        clearInterval(gamesInterval);
        clearInterval(hrunsInterval);
      };
    }
  }, [status]);

  const fetchLeagues = async () => {
    try {
      const res = await fetch("/api/leagues");
      if (res.ok) {
        const data = await res.json();
        setLeagues(data);
      }
    } catch (error) {
      console.error("Failed to fetch leagues:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/games/today");
      if (!res.ok) {
        throw new Error("Failed to fetch games");
      }
      const games = await res.json();

      // If we got real games, use them
      if (games && games.length > 0) {
        setGames(games);
        return;
      }
    } catch (error) {
      console.error("Error fetching live games:", error);
    }

    // Fallback to placeholder data during off-season
    setGames([
      {
        id: "game-1",
        homeTeam: "Chicago Cubs",
        awayTeam: "Milwaukee Brewers",
        homeScore: 4,
        awayScore: 2,
        status: "Live",
        inning: 7,
        inningHalf: "Top",
        gameType: "S",
        userPlayerCount: 3,
      },
      {
        id: "game-2",
        homeTeam: "New York Yankees",
        awayTeam: "Boston Red Sox",
        homeScore: 0,
        awayScore: 0,
        status: "Upcoming",
        inning: null,
        inningHalf: null,
        gameType: "S",
        userPlayerCount: 1,
      },
      {
        id: "game-3",
        homeTeam: "Los Angeles Dodgers",
        awayTeam: "San Francisco Giants",
        homeScore: 0,
        awayScore: 0,
        status: "Upcoming",
        inning: null,
        inningHalf: null,
        gameType: "S",
        userPlayerCount: 0,
      },
    ]);
  };

  const fetchHomeruns = async () => {
    try {
      const res = await fetch("/api/homeruns/recent");
      if (!res.ok) {
        throw new Error("Failed to fetch homeruns");
      }
      const homeruns = await res.json();

      // If we got real homeruns, use them
      if (homeruns && homeruns.length > 0) {
        setHomeruns(homeruns);
        return;
      }
    } catch (error) {
      console.error("Error fetching live homeruns:", error);
    }

    // Fallback to placeholder data during off-season
    setHomeruns([
      {
        playerName: "Kyle Schwarber",
        mlbTeam: "PHI",
        mlbId: 656941,
        hrNumber: 12,
        leagueName: "Summer Sluggers",
        isYourPlayer: true,
        occurredAt: "2h ago",
      },
      {
        playerName: "Juan Soto",
        mlbTeam: "NYM",
        mlbId: 665742,
        hrNumber: 8,
        leagueName: "Home Run Heroes",
        isYourPlayer: false,
        occurredAt: "3h ago",
      },
      {
        playerName: "Aaron Judge",
        mlbTeam: "NYY",
        mlbId: 592450,
        hrNumber: 15,
        leagueName: "Summer Sluggers",
        isYourPlayer: true,
        occurredAt: "5h ago",
      },
      {
        playerName: "Mookie Betts",
        mlbTeam: "LAD",
        mlbId: 605141,
        hrNumber: 6,
        leagueName: "Power Hitters",
        isYourPlayer: false,
        occurredAt: "6h ago",
      },
    ]);
  };

  if (status === "loading" || loading) {
    return (
      <div
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
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Categorize games by status
  const liveGames = games.filter((g) => g.status === "Live");
  const upcomingGames = games
    .filter((g) => g.status !== "Live" && g.status !== "Final")
    .slice(0, 8); // up to 8 upcoming in small cards
  const finalGames = games.filter((g) => g.status === "Final");

  // Determine featured game and small games
  let featuredGame: LiveGame | undefined;
  let smallGames: LiveGame[] = [];

  if (featuredGameId) {
    featuredGame = games.find((g) => g.id === featuredGameId);
  }

  if (!featuredGame) {
    if (liveGames.length > 0) {
      // Live mode: feature first live game, rest of live + upcoming in small
      featuredGame = liveGames[0];
      smallGames = [...liveGames.slice(1), ...upcomingGames].slice(0, 8);
    } else {
      // No live games: feature most recently ended game, upcoming in small
      const mostRecentFinal = finalGames[finalGames.length - 1]; // API returns asc by startTime, so last = most recent
      featuredGame = mostRecentFinal || upcomingGames[0];
      smallGames = upcomingGames
        .filter((g) => g.id !== featuredGame?.id)
        .slice(0, 8);
    }
  } else {
    // User selected a specific game - show other games in small cards
    smallGames = games
      .filter((g) => g.id !== featuredGame?.id)
      .slice(0, 8);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100vw",
        // Original gradient background (commented out for field background experiment)
        // background: "linear-gradient(170deg, #0f1923 0%, #141d2e 35%, #181428 70%, #1a1226 100%)",
        backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        overflowX: "hidden",
        position: "relative",
      }}
      className="noise-texture"
    >
      {/* Semi-opaque overlay for content readability */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 25, 35, 0.75)",
          backdropFilter: "blur(2px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <Header onBellClick={() => {}} />

      {/* Main content */}
      <div className="dashboard-content" style={{ paddingBottom: "32px", paddingLeft: "16px", paddingRight: "16px", position: "relative", zIndex: 1 }}>
        {/* Featured game section */}
        {featuredGame && (
          <>
            <SectionHeader label="Live Games" />
            <div className="games-layout" style={{ marginBottom: "24px" }}>
              <div>
                <FeaturedGameCard game={featuredGame} />
              </div>
              {smallGames.length > 0 && (
                <div className="games-grid" style={{ marginTop: "24px" }}>
                  {smallGames.map((game) => (
                    <SmallGameCard
                      key={game.id}
                      game={game}
                      onSelect={(gameId) => setFeaturedGameId(gameId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Recent homeruns section */}
        {homeruns.length > 0 && (
          <>
            <SectionHeader
              label="Recent Home Runs"
              action="View all"
              onAction={() => router.push("/homeruns")}
            />
            <div
              className="homerun-grid"
              style={{
                marginBottom: "24px",
              }}
            >
              {homeruns.map((hr, idx) => (
                <HomeruntCard
                  key={idx}
                  hr={hr}
                  isYourPlayer={hr.isYourPlayer}
                />
              ))}
            </div>
          </>
        )}

        {/* My leagues section */}
        <SectionHeader
          label="My Leagues"
          action="+ Create"
          onAction={() => router.push("/league/create")}
        />
        {leagues.length > 0 ? (
          <div className="leagues-grid">
            {leagues.map((league) => (
              <button
                key={league.id}
                onClick={() => router.push(`/league/${league.id}`)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  marginBottom: "9px",
                }}
              >
                <LeagueCard
                  league={league}
                  isCommissioner={league.userRole === "commissioner"}
                />
              </button>
            ))}
          </div>
        ) : (
          <div
            style={{
              borderRadius: "14px",
              padding: "24px",
              textAlign: "center",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              No leagues yet. Create one to get started!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
