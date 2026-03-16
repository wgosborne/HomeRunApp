"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import { HRLeadersSkeleton } from "@/app/components/SkeletonLoader";
import { getHotColdStatus } from "@/lib/player-utils";

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

type BadgeType = 'hot' | 'cold' | 'neutral';

interface PlayerRow extends Player {
  badge: BadgeType;
}

interface HRLeadersContentProps {
  players: Player[];
  yourMlbIds: Set<number>;
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  isEmpty: boolean;
}

function calculateBadge(player: Player): BadgeType {
  return getHotColdStatus({
    homeruns: player.homeruns,
    gamesPlayed: player.gamesPlayed,
    homerunsLast14Days: player.homerunsLast14Days,
    gamesPlayedLast14Days: player.gamesPlayedLast14Days,
  });
}

function BadgeComponent({ type }: { type: BadgeType }) {
  if (type === 'neutral') return null;

  const isHot = type === 'hot';
  const bgColor = isHot ? "rgba(204,52,51,0.2)" : "rgba(14,51,134,0.2)";
  const textColor = isHot ? "#CC3433" : "#6BAED6";
  const borderColor = isHot ? "rgba(204,52,51,0.4)" : "rgba(14,51,134,0.4)";
  const displayText = isHot ? 'Hot' : 'Cold';

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
      {displayText}
    </span>
  );
}

export function HRLeadersContent({
  players,
  yourMlbIds,
  search,
  onSearchChange,
  loading,
  isEmpty,
}: HRLeadersContentProps) {
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

  if (loading) {
    return <HRLeadersSkeleton />;
  }

  return (
    <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
      {/* Search Bar */}
      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <input
          type="text"
          placeholder="Search by name, team, position, or jersey"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
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
        {isEmpty ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 24px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "14px",
            }}
          >
            Season hasn't started yet
          </div>
        ) : filteredPlayers.length === 0 ? (
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
  );
}
