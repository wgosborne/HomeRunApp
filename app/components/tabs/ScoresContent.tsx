"use client";

import { TeamLogo } from "@/app/components/TeamLogo";
import { BaserunnerDiamond } from "@/app/components/BaserunnerDiamond";
import { ScoresSkeleton } from "@/app/components/SkeletonLoader";

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

interface ScoresContentProps {
  games: ApiGame[];
  baserunnerStates: Record<string, BaserunnerState>;
  loading: boolean;
}

const GameRow = ({
  game,
  baserunnerState,
  loadingBaserunner,
}: {
  game: ApiGame;
  baserunnerState?: BaserunnerState;
  loadingBaserunner?: boolean;
}) => {
  const isLive = game.status === "Live";
  const isFinal = game.status === "Final";
  const isUpcoming = game.status === "Preview";

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
        {/* Column 1: Teams stack */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: "8px" }}>
          {/* Away team row */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <TeamLogo name={awayAbbr} logo={game.awayTeamLogo} size="sm" />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#FFFFFF", textTransform: "uppercase" }}>
              {awayAbbr}
            </span>
          </div>

          {/* Home team row */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <TeamLogo name={homeAbbr} logo={game.homeTeamLogo} size="sm" />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#FFFFFF", textTransform: "uppercase" }}>
              {homeAbbr}
            </span>
          </div>
        </div>

        {/* Column 2: Scores */}
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

        {/* Column 3: Diamond */}
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

        {/* Column 4: Status */}
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

export function ScoresContent({ games, baserunnerStates, loading }: ScoresContentProps) {
  if (loading) {
    return <ScoresSkeleton />;
  }

  return (
    <>
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
    </>
  );
}
