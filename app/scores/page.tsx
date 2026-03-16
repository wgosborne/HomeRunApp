"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationDropdown } from "@/app/components/NotificationDropdown";
import { UserMenu } from "@/app/components/UserMenu";
import { BottomNavigation } from "@/app/components/BottomNavigation";
import { LoadingScreen } from "@/app/components/LoadingScreen";
import { getCached, setCached } from "@/lib/client-cache";
import { ScoresContent } from "@/app/components/tabs/ScoresContent";
import { LeagueContent } from "@/app/components/tabs/LeagueContent";
import { HRLeadersContent } from "@/app/components/tabs/HRLeadersContent";

const SCORES_CACHE_KEY = "scores-today";
const LEAGUES_CACHE_KEY = "leagues-list";
const HR_LEADERS_CACHE_KEY = "hr-leaders";

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

interface League {
  id: string;
  name: string;
  commissionerId: string;
  userRole: string;
  teamName?: string;
  memberships: any[];
  draftStatus?: string;
  seasonEndedAt?: string;
  userRank?: number;
}

interface Player {
  id: string;
  mlbId: number;
  fullName: string;
  position: string | null;
  teamName: string | null;
  jerseyNumber: string | null;
  homeruns: number;
  gamesPlayed: number;
  homerunsLast14Days: number;
  gamesPlayedLast14Days: number;
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

export default function UnifiedScoresPage() {
  const { status } = useSession();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<'scores' | 'league' | 'hr-leaders'>('scores');

  // Games state — start with empty/loading
  const [games, setGames] = useState<ApiGame[]>([]);
  const [baserunnerStates, setBaserunnerStates] = useState<Record<string, BaserunnerState>>({});
  const [scoresLoading, setScoresLoading] = useState(true);

  // Leagues state — start with empty/loading
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(true);

  // HR Leaders state — start with empty/loading
  const [players, setPlayers] = useState<Player[]>([]);
  const [yourMlbIds, setYourMlbIds] = useState<Set<number>>(new Set());
  const [hrSearch, setHrSearch] = useState("");
  const [hrLeadersLoading, setHrLeadersLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Fetch all data — read cache inside effect when prefetch may have completed
  useEffect(() => {
    if (status !== "authenticated") return;

    let mounted = true;

    // Read cache INSIDE effect — this is when prefetch may have completed
    const cachedGames = getCached<ApiGame[]>(SCORES_CACHE_KEY, 30 * 1000);
    const cachedLeagues = getCached<League[]>(LEAGUES_CACHE_KEY, 5 * 60 * 1000);
    const cachedHRData = getCached<{ players: Player[]; yourMlbIds: number[] }>(HR_LEADERS_CACHE_KEY, 5 * 60 * 1000);

    // Apply cached data immediately if available
    if (cachedGames) {
      setGames(cachedGames);
      setScoresLoading(false);
    }
    if (cachedLeagues) {
      setLeagues(cachedLeagues);
      setLeaguesLoading(false);
    }
    if (cachedHRData) {
      setPlayers(cachedHRData.players);
      setYourMlbIds(new Set(cachedHRData.yourMlbIds));
      setHrLeadersLoading(false);
    }

    // Always fetch fresh data in background regardless of cache
    // Update state silently when fresh data arrives
    fetch("/api/games/today")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && mounted) {
          setGames(data);
          setScoresLoading(false);
          setCached(SCORES_CACHE_KEY, data);

          // Fetch baserunner states for live games
          const liveGames = (data || []).filter((g: ApiGame) => g.status === "Live");
          if (liveGames.length > 0) {
            liveGames.forEach((game: ApiGame) => {
              fetch(`/api/games/${game.id}/live-feed`)
                .then((res) => res.ok ? res.json() : null)
                .then((state) => {
                  if (state && mounted) {
                    setBaserunnerStates((prev) => ({ ...prev, [game.id]: state }));
                  }
                })
                .catch(() => {});
            });
          }
        }
      })
      .catch(() => {
        if (mounted) setScoresLoading(false);
      });

    fetch("/api/leagues")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && mounted) {
          setLeagues(data);
          setLeaguesLoading(false);
          setCached(LEAGUES_CACHE_KEY, data);
        }
      })
      .catch(() => {
        if (mounted) setLeaguesLoading(false);
      });

    fetch("/api/players?limit=5000")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && mounted) {
          setPlayers(data.players || []);
          setYourMlbIds(new Set(data.yourMlbIds || []));
          setIsEmpty(data.isEmpty || false);
          setHrLeadersLoading(false);
          setCached(HR_LEADERS_CACHE_KEY, { players: data.players, yourMlbIds: data.yourMlbIds });
        }
      })
      .catch(() => {
        if (mounted) setHrLeadersLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [status]); // Only depends on status — not on cache values

  // Only show loading if auth is still resolving
  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated") {
    return null;
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
        {/* Scores Tab - display: none keeps it mounted */}
        <div style={{ display: activeTab === 'scores' ? 'block' : 'none' }}>
          <ScoresContent
            games={games}
            baserunnerStates={baserunnerStates}
            loading={scoresLoading}
          />
        </div>

        {/* League Tab - display: none keeps it mounted */}
        <div style={{ display: activeTab === 'league' ? 'block' : 'none' }}>
          <LeagueContent leagues={leagues} loading={leaguesLoading} />
        </div>

        {/* HR Leaders Tab - display: none keeps it mounted */}
        <div style={{ display: activeTab === 'hr-leaders' ? 'block' : 'none' }}>
          <HRLeadersContent
            players={players}
            yourMlbIds={yourMlbIds}
            search={hrSearch}
            onSearchChange={setHrSearch}
            loading={hrLeadersLoading}
            isEmpty={isEmpty}
          />
        </div>
      </div>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
