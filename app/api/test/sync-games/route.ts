import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("test-sync-games");

interface MLBScheduleResponse {
  dates: Array<{
    games: Array<{
      gamePk: number;
      gameType: string;
      status: {
        abstractGameState: "Preview" | "Live" | "Final";
      };
      gameDate: string;
      teams: {
        home: {
          team: {
            id: number;
            abbreviation: string;
            name: string;
          };
        };
        away: {
          team: {
            id: number;
            abbreviation: string;
            name: string;
          };
        };
      };
      linescore?: {
        currentInning?: number;
        inningHalf?: string;
        teams?: {
          home?: { runs?: number };
          away?: { runs?: number };
        };
      };
    }>;
  }>;
}

const TEAM_ABBREV_MAP: Record<number, string> = {
  108: "LAA", 109: "ARI", 110: "BAL", 111: "BOS", 112: "CHC", 113: "CIN",
  114: "CLE", 115: "COL", 116: "DET", 117: "HOU", 118: "KC", 119: "LAD",
  120: "WSH", 121: "NYM", 133: "OAK", 134: "PIT", 135: "SD", 136: "SEA",
  137: "SF", 138: "STL", 139: "TB", 140: "TEX", 141: "TOR", 142: "MIN",
  143: "PHI", 144: "ATL", 145: "CWS", 146: "MIA", 147: "NYY", 158: "MIL",
};

/**
 * GET /api/test/sync-games
 * Manual test endpoint to sync today's games from MLB API
 * Pass ?days=N to sync last N days of games
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get("days") || "0", 10);
    const enableSpringTraining = process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING === "true";

    logger.info("Manual sync triggered", {
      daysBack,
      enableSpringTraining,
    });

    // Build date range
    const dates: string[] = [];
    for (let i = daysBack; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const mmddyyyy = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
        .getDate()
        .toString()
        .padStart(2, "0")}/${d.getFullYear()}`;
      dates.push(mmddyyyy);
    }

    let totalSynced = 0;

    for (const date of dates) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const gameTypes = enableSpringTraining ? "R,S" : "R";

      const response = await fetch(
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=linescore&gameType=${gameTypes}`,
        {
          headers: {
            "User-Agent": "FantasyBaseball/1.0",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn("MLB API error", { date, status: response.status });
        continue;
      }

      const data = (await response.json()) as MLBScheduleResponse;

      let gameCountForDate = 0;
      for (const dateGroup of data.dates || []) {
        for (const game of dateGroup.games || []) {
          try {
            const homeTeamAbbrev = TEAM_ABBREV_MAP[game.teams.home.team.id] || `T${game.teams.home.team.id}`;
            const awayTeamAbbrev = TEAM_ABBREV_MAP[game.teams.away.team.id] || `T${game.teams.away.team.id}`;

            const homeTeamId = game.teams.home.team.id;
            const awayTeamId = game.teams.away.team.id;
            const homeScore = game.linescore?.teams?.home?.runs ?? 0;
            const awayScore = game.linescore?.teams?.away?.runs ?? 0;
            const status = game.status.abstractGameState;
            const inning = status === "Live" ? game.linescore?.currentInning : null;
            const inningHalf = status === "Live" ? game.linescore?.inningHalf : null;
            const gameDate = new Date(game.gameDate);

            const startTime = gameDate.toLocaleString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            await prisma.game.upsert({
              where: { id: game.gamePk.toString() },
              update: {
                homeScore,
                awayScore,
                status,
                inning,
                inningHalf,
                gameType: game.gameType,
              },
              create: {
                id: game.gamePk.toString(),
                homeTeam: homeTeamAbbrev,
                awayTeam: awayTeamAbbrev,
                homeTeamId,
                awayTeamId,
                homeScore,
                awayScore,
                status,
                inning,
                inningHalf,
                gameDate,
                startTime,
                gameType: game.gameType,
              },
            });

            totalSynced++;
            gameCountForDate++;
          } catch (error) {
            logger.error("Error syncing game", {
              gamePk: game.gamePk,
              error,
            });
          }
        }
      }

      logger.info("Synced games for date", { date, count: gameCountForDate });
    }

    return NextResponse.json({
      message: "Manual sync completed",
      totalSynced,
      daysBack,
      enableSpringTraining,
    });
  } catch (error) {
    logger.error("Manual sync failed", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
