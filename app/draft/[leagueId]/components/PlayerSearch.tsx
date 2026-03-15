"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";

interface Player {
  id: string;
  mlbId: number;
  name: string;
  position: string;
  team: string;
  homeRuns?: number;
  homeRuns2025?: number;
  rank?: number;
}

interface PlayerSearchProps {
  leagueId: string;
  onPlayerSelected: (player: Player) => void;
  isCurrentPicker: boolean;
  isLoading?: boolean;
  onLoadingComplete?: () => void;
}

export function PlayerSearch({
  leagueId,
  onPlayerSelected,
  isCurrentPicker,
  isLoading = false,
  onLoadingComplete,
}: PlayerSearchProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available players when component mounts or when picker changes
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/draft/${leagueId}/available`);

        if (!response.ok) {
          throw new Error("Failed to fetch available players");
        }

        const data = await response.json();
        setPlayers(data.availablePlayers || []);
        setFilteredPlayers(data.availablePlayers || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch players"
        );
      } finally {
        setLoading(false);
        onLoadingComplete?.();
      }
    };

    fetchPlayers();
  }, [leagueId, onLoadingComplete]);

  // Filter players based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPlayers(players);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = players.filter(
      (player) =>
        player.name.toLowerCase().includes(term) ||
        player.team.toLowerCase().includes(term)
    );

    setFilteredPlayers(filtered);
  }, [searchTerm, players]);

  if (loading || isLoading) {
    return (
      <div
        style={{
          borderRadius: "20px",
          padding: "20px",
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Loading available players...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          borderRadius: "20px",
          padding: "20px",
          backgroundColor: "rgba(204,52,51,0.1)",
          border: "1px solid rgba(204,52,51,0.3)",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "#fca5a5",
          }}
        >
          Error: {error}
        </div>
      </div>
    );
  }

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
        }}
      >
        <input
          type="text"
          placeholder="Search player name or team..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={!isCurrentPicker}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: "16px",
            fontFamily: "'DM Sans', sans-serif",
            color: "white",
            minHeight: "44px",
            transition: "all 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(204,52,51,0.5)";
            e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.5)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.3)";
          }}
        />
        <div
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {filteredPlayers.length} available • {players.length} total
        </div>
      </div>

      <div
        style={{
          overflowY: "auto",
          maxHeight: "60vh",
        }}
      >
        {filteredPlayers.length === 0 ? (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            No players found
          </div>
        ) : (
          <div
            style={{
              padding: "12px",
            }}
          >
            {filteredPlayers.map((player) => (
              <div key={player.id} style={{ marginBottom: "8px" }}>
                <button
                  onClick={() => onPlayerSelected(player)}
                  disabled={!isCurrentPicker}
                  style={{
                    width: "100%",
                    padding: "16px",
                    backgroundColor: isCurrentPicker ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "12px",
                    textAlign: "left",
                    transition: "all 0.2s",
                    cursor: isCurrentPicker ? "pointer" : "not-allowed",
                    minHeight: "56px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                  onMouseEnter={(e) => {
                    if (isCurrentPicker) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        "rgba(204,52,51,0.1)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(204,52,51,0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isCurrentPicker) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(255,255,255,0.07)";
                    }
                  }}
                >
                  <PlayerAvatar mlbId={player.mlbId} playerName={player.name} size="sm" lazy={true} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      width: "100%",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "'Exo 2', sans-serif",
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "white",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Rank: {player.rank || "?"} • {player.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "12px",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        {player.position} • {player.team}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "'Exo 2', sans-serif",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#6BAED6",
                        }}
                      >
                        {player.homeRuns2025 || 0} HR
                      </div>
                      {(player.homeRuns || 0) > 0 && (
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "11px",
                            color: "rgba(107,174,214,0.6)",
                            marginTop: "2px",
                          }}
                        >
                          2026: {player.homeRuns || 0}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                {/* Hidden link to player detail page (accessible via right-click context menu) */}
                <Link href={`/player/${player.mlbId}`} className="hidden" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
