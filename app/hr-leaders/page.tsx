"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BottomNavigation } from "@/app/components/BottomNavigation";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import { LoadingScreen } from "@/app/components/LoadingScreen";

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

type BadgeType = "HOT" | "COLD" | null;

interface PlayerRow extends Player {
  badge: BadgeType;
}

const Header = () => (
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
      <div style={{ width: "24px" }} />
    </div>

    <div
      style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(204,52,51,0.5), transparent)",
        margin: "16px 0 0",
      }}
    />
  </header>
);

function calculateBadge(player: Player): BadgeType {
  if (player.homeruns === 0) return null;

  const seasonRate = player.homeruns / Math.max(1, player.gamesPlayed);
  const recentRate = player.homerunsLast14Days / Math.max(1, player.gamesPlayedLast14Days);

  if (recentRate > seasonRate) return "HOT";
  if (recentRate < seasonRate) return "COLD";
  return null;
}

function BadgeComponent({ type }: { type: BadgeType }) {
  if (!type) return null;

  const isHot = type === "HOT";
  const bgColor = isHot ? "rgba(204,52,51,0.2)" : "rgba(14,51,134,0.2)";
  const textColor = isHot ? "#CC3433" : "#6BAED6";
  const borderColor = isHot ? "rgba(204,52,51,0.4)" : "rgba(14,51,134,0.4)";

  return (
    <span
      style={{
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: "4px",
        padding: "4px 8px",
        fontSize: "12px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </span>
  );
}

export default function HRLeadersPage() {
  const { status } = useSession();
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [yourMlbIds, setYourMlbIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch players on mount
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status !== "authenticated") return;

    const fetchPlayers = async () => {
      try {
        const response = await fetch("/api/players");
        if (response.ok) {
          const data = await response.json();
          setPlayers(data.players);
          setYourMlbIds(new Set(data.yourMlbIds));
        }
      } catch (error) {
        console.error("Error fetching players:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [status, router]);

  // Build player rows with badges (memoized)
  const playerRows: PlayerRow[] = useMemo(
    () =>
      players.map((p) => ({
        ...p,
        badge: calculateBadge(p),
      })),
    [players]
  );

  // Filter and sort players (memoized)
  const filteredPlayers: PlayerRow[] = useMemo(() => {
    if (!search) return playerRows;

    const lowerSearch = search.toLowerCase();
    return playerRows.filter(
      (p) =>
        p.fullName.toLowerCase().includes(lowerSearch) ||
        (p.teamName?.toLowerCase().includes(lowerSearch) || false) ||
        (p.position?.toLowerCase().includes(lowerSearch) || false) ||
        (p.jerseyNumber?.includes(search) || false)
    );
  }, [playerRows, search]);

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
      <Header />

      <div
        className="dashboard-content"
        style={{ paddingBottom: "120px", paddingLeft: "16px", paddingRight: "16px", position: "relative", zIndex: 1 }}
      >
        {/* Search Bar */}
        <div style={{ marginTop: "24px", marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search by name, team, position, or jersey"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.9)",
              fontSize: "14px",
              fontFamily: "'DM Sans', sans-serif",
              outline: "none",
            }}
          />
        </div>

        {/* Players List */}
        <div style={{ marginBottom: "24px" }}>
          {filteredPlayers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 24px",
                color: "rgba(255,255,255,0.5)",
                fontSize: "14px",
              }}
            >
              No players found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredPlayers.map((player) => (
                <Link
                  key={player.id}
                  href={`/player/${player.mlbId}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      borderLeft: yourMlbIds.has(player.mlbId) ? "4px solid #CC3433" : "4px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)";
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ flex: "0 0 auto" }}>
                      <PlayerAvatar mlbId={player.mlbId} playerName={player.fullName} size="md" isYourPlayer={yourMlbIds.has(player.mlbId)} />
                    </div>

                    {/* Player Info */}
                    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.95)",
                          fontSize: "15px",
                          marginBottom: "4px",
                        }}
                      >
                        {player.fullName}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          fontSize: "12px",
                          color: "rgba(255,255,255,0.6)",
                          flexWrap: "wrap",
                        }}
                      >
                        {player.teamName && <span>{player.teamName}</span>}
                        {player.position && <span>•</span>}
                        {player.position && <span>{player.position}</span>}
                        {player.jerseyNumber && <span>•</span>}
                        {player.jerseyNumber && <span>#{player.jerseyNumber}</span>}
                      </div>
                    </div>

                    {/* Badge */}
                    <div style={{ flex: "0 0 auto" }}>
                      <BadgeComponent type={player.badge} />
                    </div>

                    {/* HR Count */}
                    <div
                      style={{
                        flex: "0 0 auto",
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          color: "#CC3433",
                        }}
                      >
                        {player.homeruns}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        HR
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </main>
  );
}
