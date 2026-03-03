import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dev-sync-games-now");

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

/**
 * POST /api/dev/sync-games-now
 * Manually sync today's games (dev only)
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev endpoint only" }, { status: 403 });
  }

  try {
    const now = new Date();
    const mmddyyyy = `${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${now
      .getDate()
      .toString()
      .padStart(2, "0")}/${now.getFullYear()}`;

    logger.info("Fetching games from MLB API", { date: mmddyyyy });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${mmddyyyy}&hydrate=linescore`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`MLB API error: ${response.statusText}`);
    }

    const data = (await response.json()) as MLBScheduleResponse;

    let syncedCount = 0;
    const errors: string[] = [];

    // Process each game
    for (const dateGroup of data.dates || []) {
      for (const game of dateGroup.games || []) {
        try {
          const homeTeamAbbrev = game.teams.home?.team?.abbreviation || `T${game.teams.home.team.id}`;
          const awayTeamAbbrev = game.teams.away?.team?.abbreviation || `T${game.teams.away.team.id}`;

          const homeTeamId = game.teams.home.team.id;
          const awayTeamId = game.teams.away.team.id;
          const homeScore = game.linescore?.teams?.home?.runs ?? 0;
          const awayScore = game.linescore?.teams?.away?.runs ?? 0;
          const status = game.status.abstractGameState;
          const inning =
            status === "Live" ? game.linescore?.currentInning : null;
          const inningHalf =
            status === "Live" ? game.linescore?.inningHalf : null;
          const gameDate = new Date(game.gameDate);

          // Format startTime as "H:MM AM/PM" local time
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

          syncedCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error("Error syncing game", {
            gamePk: game.gamePk,
            error: errorMsg,
          });
          errors.push(`Game ${game.gamePk}: ${errorMsg}`);
        }
      }
    }

    logger.info("Game sync completed", { synced: syncedCount });

    return NextResponse.json({
      message: "Games sync completed",
      synced: syncedCount,
      total: data.dates?.reduce((acc, d) => acc + (d.games?.length || 0), 0) || 0,
      errors: errors.length > 0 ? errors : undefined,
      games: data.dates?.[0]?.games?.map((g) => ({
        gameType: g.gameType,
        home: g.teams.home.team.abbreviation,
        away: g.teams.away.team.abbreviation,
        status: g.status.abstractGameState,
      })) || [],
    });
  } catch (error) {
    logger.error("Error syncing games", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
