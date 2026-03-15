"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationDropdown } from "@/app/components/NotificationDropdown";
import { UserMenu } from "@/app/components/UserMenu";
import { BottomNavigation } from "@/app/components/BottomNavigation";
import { TeamLogo } from "@/app/components/TeamLogo";
import { BaserunnerDiamond } from "@/app/components/BaserunnerDiamond";
import { LoadingScreen } from "@/app/components/LoadingScreen";



interface ApiGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  homeScore: number;
  awayScore: number;
  status: string;
  inning: number | null;
  inningHalf: string | null;
  startTime: string | null;
  gameType: string;
  userPlayerCount: number;
}

interface BaserunnerState {
  first: boolean;
  second: boolean;
  third: boolean;
  outs: number;
}

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
        <NotificationDropdown onBellClick={onBellClick} />
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

interface GameRowProps {
  game: ApiGame;
  baserunnerState?: BaserunnerState;
  loadingBaserunner?: boolean;
}

const GameRow = ({ game, baserunnerState, loadingBaserunner }: GameRowProps) => {
  const isLive = game.status === "Live";
  const isFinal = game.status === "Final";
  const isUpcoming = game.status === "Preview";

  // Team names are already stored as abbreviations in the database
  const awayAbbr = game.awayTeam;
  const homeAbbr = game.homeTeam;

  let statusDisplay = "";
  if (isLive) {
    statusDisplay = game.inningHalf && game.inning ? `${game.inningHalf} ${game.inning}` : "Live";
  } else if (isFinal) {
    statusDisplay = "Final";
  } else if (isUpcoming) {
    statusDisplay = game.startTime || "TBD";
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 40px 70px 80px",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backgroundColor: "rgba(255,255,255,0.02)",
          transition: "background-color 0.2s",
          gap: "20px",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.02)";
        }}
      >
        {/* Column 1: Teams stack (away on top, home on bottom) */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: "8px" }}>
          {/* Away team row */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <TeamLogo
              name={awayAbbr}
              logo={game.awayTeamLogo}
              size="sm"
            />
          </div>

          {/* Home team row */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <TeamLogo
              name={homeAbbr}
              logo={game.homeTeamLogo}
              size="sm"
            />
          </div>
        </div>

        {/* Column 2: Scores (40px, right-aligned) - only for Live and Final */}
        {(isLive || isFinal) ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              alignItems: "flex-end",
              textAlign: "right",
              marginRight: "12px",
            }}
          >
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "#FFFFFF",
                lineHeight: "1",
              }}
            >
              {game.awayScore}
            </div>
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "#FFFFFF",
                lineHeight: "1",
              }}
            >
              {game.homeScore}
            </div>
          </div>
        ) : null}

        {/* Column 3: Diamond + outs (70px, centered) - Live games only */}
        {isLive ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {baserunnerState && !loadingBaserunner && (
              <BaserunnerDiamond
                first={baserunnerState.first}
                second={baserunnerState.second}
                third={baserunnerState.third}
                outs={baserunnerState.outs}
              />
            )}
          </div>
        ) : null}

        {/* Column 4: Live status text (80px, right-aligned) - or merged columns 3-4 for Upcoming/Final */}
        {isLive ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              justifyContent: "flex-end",
            }}
          >
            <span
              className="pulse-live"
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#CC3433",
              }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "#CC3433",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {statusDisplay}
            </span>
          </div>
        ) : (
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              gridColumn: "3 / 5",
              textAlign: "right",
            }}
          >
            {statusDisplay}
          </span>
        )}
      </div>
    </>
  );
};

export default function ScoresPage() {
  const { status } = useSession();
  const router = useRouter();
  const [games, setGames] = useState<ApiGame[]>([]);
  const [baserunnerStates, setBaserunnerStates] = useState<Record<string, BaserunnerState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchGames();
      // Faster polling interval (30 seconds for live games, 2 min for general updates)
      const fastInterval = setInterval(fetchGames, 30 * 1000);
      return () => clearInterval(fastInterval);
    }
  }, [status]);

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/games/today");
      if (!res.ok) {
        throw new Error("Failed to fetch games");
      }
      const allGames = await res.json();

      // API returns games in correct order: Live > Preview > Final
      setGames(allGames || []);

      // Fetch baserunner state for live games
      const liveGames = (allGames || []).filter((g: ApiGame) => g.status === "Live");
      if (liveGames.length > 0) {
        await Promise.all(
          liveGames.map(async (game: ApiGame) => {
            try {
              const feedRes = await fetch(`/api/games/${game.id}/live-feed`);
              if (feedRes.ok) {
                const state = await feedRes.json();
                setBaserunnerStates((prev) => ({ ...prev, [game.id]: state }));
              }
            } catch (error) {
              console.error(`Error fetching baserunner state for game ${game.id}:`, error);
            }
          })
        );
      }
    } catch (error) {
      console.error("Error fetching games:", error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <LoadingScreen />;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100vw",
        backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        overflowX: "hidden",
        position: "relative",
      }}
      className="noise-texture"
    >
      {/* Semi-opaque overlay */}
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
      <div
        className="dashboard-content"
        style={{
          position: "relative",
          zIndex: 1,
          paddingBottom: "120px",
          maxWidth: "100%",
        }}
      >
        {/* Section header */}
        <div
          style={{
            paddingLeft: "18px",
            paddingRight: "18px",
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
              display: "inline-block",
            }}
          >
            Today's Games
          </span>
        </div>

        {/* Games list */}
        {games.length > 0 ? (
          <div
            style={{
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)",
              marginLeft: "18px",
              marginRight: "18px",
            }}
          >
            {games.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                baserunnerState={baserunnerStates[game.id]}
                loadingBaserunner={game.status === "Live" && !baserunnerStates[game.id]}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              borderRadius: "14px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "24px",
              textAlign: "center",
              marginLeft: "18px",
              marginRight: "18px",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              No games scheduled today
            </p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </main>
  );
}
