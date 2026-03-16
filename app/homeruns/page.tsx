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
  const [userLeagues, setUserLeagues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"recent" | "player" | "team">("recent");
  const [filterLeagues, setFilterLeagues] = useState<Set<string>>(new Set());
  const [filterTeams, setFilterTeams] = useState<Set<string>>(new Set());
  const [filterPlayer, setFilterPlayer] = useState<string>("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    const fetchHomeruns = async () => {
      try {
        const res = await fetch(`/api/homeruns/all?t=${Date.now()}`, {
          cache: "no-store",
        });
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

  useEffect(() => {
    if (!session) return;

    const fetchUserLeagues = async () => {
      try {
        const res = await fetch("/api/leagues");
        if (res.ok) {
          const data = await res.json();
          setUserLeagues(data.map((league: any) => league.name));
        }
      } catch (error) {
        console.error("Error fetching user leagues:", error);
      }
    };

    fetchUserLeagues();
  }, [session]);

  // Get unique values for filter dropdowns
  const leagues = Array.from(
    new Set([
      ...userLeagues,
      ...homeruns.map((h) => h.leagueName).filter((l) => l !== null)
    ])
  ).sort();
  const teams = Array.from(
    new Set(homeruns.map((h) => h.mlbTeam).filter(Boolean))
  ).sort();

  // Apply filters
  const filteredHomeruns = homeruns.filter((hr) => {
    if (filterLeagues.size > 0) {
      // Show if homerun belongs to a selected league OR if it's your player
      const leagueMatch = hr.leagueName && filterLeagues.has(hr.leagueName);
      const allMlbMatch = !hr.leagueName && filterLeagues.has("all-mlb");
      if (!leagueMatch && !allMlbMatch && !hr.isMyPlayer) return false;
    }
    if (filterTeams.size > 0 && !filterTeams.has(hr.mlbTeam)) return false;
    if (filterPlayer && !hr.playerName.toLowerCase().includes(filterPlayer.toLowerCase())) return false;
    return true;
  });

  const toggleLeague = (league: string) => {
    const newLeagues = new Set(filterLeagues);
    if (newLeagues.has(league)) {
      newLeagues.delete(league);
    } else {
      newLeagues.add(league);
    }
    setFilterLeagues(newLeagues);
  };

  const toggleTeam = (team: string) => {
    const newTeams = new Set(filterTeams);
    if (newTeams.has(team)) {
      newTeams.delete(team);
    } else {
      newTeams.add(team);
    }
    setFilterTeams(newTeams);
  };

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
          {/* League Checkbox Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setOpenDropdown(openDropdown === "league" ? null : "league")}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              {filterLeagues.size === 0 ? "All Leagues" : `${filterLeagues.size} League${filterLeagues.size !== 1 ? "s" : ""}`}
              <span style={{ fontSize: "10px" }}>▼</span>
            </button>
            {openDropdown === "league" && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  backgroundColor: "rgba(20, 30, 48, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  minWidth: "200px",
                  zIndex: 10,
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
                }}
              >
                <div style={{ padding: "8px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      color: "white",
                      fontSize: "12px",
                      borderRadius: "6px",
                      marginBottom: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filterLeagues.has("all-mlb")}
                      onChange={() => toggleLeague("all-mlb")}
                      style={{
                        width: "14px",
                        height: "14px",
                        cursor: "pointer",
                        accentColor: "#CC3433",
                      }}
                    />
                    All MLB
                  </label>
                  {leagues.map((league) => (
                    <label
                      key={league}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        cursor: "pointer",
                        color: "white",
                        fontSize: "12px",
                        borderRadius: "6px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={filterLeagues.has(league)}
                        onChange={() => toggleLeague(league)}
                        style={{
                          width: "14px",
                          height: "14px",
                          cursor: "pointer",
                          accentColor: "#CC3433",
                        }}
                      />
                      {league}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Team Checkbox Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setOpenDropdown(openDropdown === "team" ? null : "team")}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              {filterTeams.size === 0 ? "All Teams" : `${filterTeams.size} Team${filterTeams.size !== 1 ? "s" : ""}`}
              <span style={{ fontSize: "10px" }}>▼</span>
            </button>
            {openDropdown === "team" && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  backgroundColor: "rgba(20, 30, 48, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  minWidth: "200px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  zIndex: 10,
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
                }}
              >
                <div style={{ padding: "8px" }}>
                  {teams.map((team) => (
                    <label
                      key={team}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        cursor: "pointer",
                        color: "white",
                        fontSize: "12px",
                        borderRadius: "6px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={filterTeams.has(team)}
                        onChange={() => toggleTeam(team)}
                        style={{
                          width: "14px",
                          height: "14px",
                          cursor: "pointer",
                          accentColor: "#CC3433",
                        }}
                      />
                      {team}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

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
