"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";

interface Homerun {
  playerName: string;
  mlbTeam: string;
  mlbId: number | null;
  hrNumber: number | null;
  game: string;
  leagueName: string | null;
  isMyPlayer: boolean;
  occurredAt: string;
}

export default function HomerunsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [homeruns, setHomeruns] = useState<Homerun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"recent" | "player" | "team">("recent");
  const [filterLeague, setFilterLeague] = useState<string>("");
  const [filterTeam, setFilterTeam] = useState<string>("");
  const [filterPlayer, setFilterPlayer] = useState<string>("");

  useEffect(() => {
    if (!session) return;

    const fetchHomeruns = async () => {
      try {
        const res = await fetch("/api/homeruns/all");
        if (res.ok) {
          const data = await res.json();
          setHomeruns(data);
        }
      } catch (error) {
        console.error("Error fetching homeruns:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeruns();
  }, [session]);

  // Get unique values for filter dropdowns
  const leagues = Array.from(
    new Set(homeruns.map((h) => h.leagueName).filter((l) => l !== null))
  ).sort();
  const teams = Array.from(
    new Set(homeruns.map((h) => h.mlbTeam).filter(Boolean))
  ).sort();

  // Apply filters
  const filteredHomeruns = homeruns.filter((hr) => {
    if (filterLeague && hr.leagueName !== filterLeague) return false;
    if (filterTeam && hr.mlbTeam !== filterTeam) return false;
    if (filterPlayer && !hr.playerName.toLowerCase().includes(filterPlayer.toLowerCase())) return false;
    return true;
  });

  // Apply sorting
  const sortedHomeruns = [...filteredHomeruns].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    } else if (sortBy === "player") {
      return a.playerName.localeCompare(b.playerName);
    } else {
      return a.mlbTeam.localeCompare(b.mlbTeam);
    }
  });

  const yourHomeruns = sortedHomeruns.filter((hr) => hr.isMyPlayer);
  const othersHomeruns = sortedHomeruns.filter((hr) => !hr.isMyPlayer);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f1923",
        color: "white",
        paddingTop: "20px",
        paddingBottom: "32px",
      }}
    >
      {/* Header */}
      <div
        className="dashboard-content"
        style={{
          paddingLeft: "18px",
          paddingRight: "18px",
          marginBottom: "24px",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.7)",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "16px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "32px",
            fontWeight: 800,
            margin: 0,
            marginBottom: "8px",
          }}
        >
          All Home Runs
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.6)",
            margin: 0,
          }}
        >
          {sortedHomeruns.length} of {homeruns.length} homeruns
        </p>
      </div>

      {/* Filters */}
      {!isLoading && homeruns.length > 0 && (
        <div
          className="dashboard-content"
          style={{
            paddingLeft: "18px",
            paddingRight: "18px",
            marginBottom: "24px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            value={filterLeague}
            onChange={(e) => setFilterLeague(e.target.value)}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "white",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <option value="">All Leagues</option>
            {leagues.map((league) => (
              <option key={league} value={league || ""}>
                {league || "No League"}
              </option>
            ))}
          </select>

          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "white",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <option value="">All Teams</option>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search player..."
            value={filterPlayer}
            onChange={(e) => setFilterPlayer(e.target.value)}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "white",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
            }}
          />

          {/* Sort buttons */}
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            {(["recent", "player", "team"] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                style={{
                  backgroundColor:
                    sortBy === sort
                      ? "#CC3433"
                      : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${
                    sortBy === sort
                      ? "#CC3433"
                      : "rgba(255, 255, 255, 0.1)"
                  }`,
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: sortBy === sort ? "white" : "rgba(255, 255, 255, 0.6)",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  whiteSpace: "nowrap",
                }}
              >
                {sort === "recent" && "Recent"}
                {sort === "player" && "Player"}
                {sort === "team" && "Team"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div
          className="dashboard-content"
          style={{
            paddingLeft: "18px",
            paddingRight: "18px",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          Loading homeruns...
        </div>
      ) : homeruns.length === 0 ? (
        <div
          className="dashboard-content"
          style={{
            paddingLeft: "18px",
            paddingRight: "18px",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <p>No homeruns yet. Create a league and start tracking!</p>
        </div>
      ) : sortedHomeruns.length === 0 ? (
        <div
          className="dashboard-content"
          style={{
            paddingLeft: "18px",
            paddingRight: "18px",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <p>No homeruns match your filters.</p>
        </div>
      ) : (
        <>
          {/* Your Homeruns */}
          {yourHomeruns.length > 0 && (
            <div className="dashboard-content" style={{ paddingLeft: "18px", paddingRight: "18px", marginBottom: "32px" }}>
              <h2
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  backgroundColor: "rgba(204, 52, 51, 0.6)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  display: "inline-block",
                }}
              >
                Your Players ({yourHomeruns.length})
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                {yourHomeruns.map((hr, idx) => (
                  <HomerunItem key={idx} hr={hr} isYours={true} />
                ))}
              </div>
            </div>
          )}

          {/* Others' Homeruns */}
          {othersHomeruns.length > 0 && (
            <div className="dashboard-content" style={{ paddingLeft: "18px", paddingRight: "18px" }}>
              <h2
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  display: "inline-block",
                }}
              >
                All Homeruns ({othersHomeruns.length})
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                {othersHomeruns.map((hr, idx) => (
                  <HomerunItem key={idx} hr={hr} isYours={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HomerunItem({ hr, isYours }: { hr: Homerun; isYours: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        backgroundColor: isYours ? "rgba(204, 52, 51, 0.1)" : "rgba(255, 255, 255, 0.03)",
        border: `1px solid ${
          isYours
            ? "rgba(204, 52, 51, 0.3)"
            : "rgba(255, 255, 255, 0.08)"
        }`,
        borderRadius: "12px",
        padding: "12px",
      }}
    >
      {/* Avatar */}
      {hr.mlbId ? (
        <Link href={`/player/${hr.mlbId}`}>
          <PlayerAvatar mlbId={hr.mlbId} playerName={hr.playerName} size="sm" />
        </Link>
      ) : (
        <PlayerAvatar mlbId={null} playerName={hr.playerName} size="sm" />
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/player/${hr.mlbId}`}>
          <p
            style={{
              margin: 0,
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              color: "white",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {hr.playerName}
          </p>
        </Link>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "4px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            {hr.mlbTeam}
          </span>
          {hr.leagueName && (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.4)",
              }}
            >
              {hr.leagueName}
            </span>
          )}
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.3)",
            }}
          >
            {hr.game}
          </span>
        </div>
      </div>

      {/* Date */}
      <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          {new Date(hr.occurredAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
