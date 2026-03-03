import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron-sync-live-games");

// Season bounds for 2026: Spring Training late Feb, Regular Season April 1 - Sept 27
const SEASON_START = new Date("2026-03-26");
const SEASON_END = new Date("2026-09-28"); // Up to but not including this date

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
 * POST /api/cron/sync-live-games
 * Sync today's MLB games into the Game table
 *
 * Called via Vercel cron job every 2 minutes
 * Requires CRON_SECRET header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-vercel-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      logger.warn("Unauthorized cron request", {
        provided: !!cronSecret,
        expected: !!process.env.CRON_SECRET,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Season gate: return early if outside 2026-03-26 to 2026-09-27
    if (now < SEASON_START || now >= SEASON_END) {
      logger.info("Outside season bounds, skipping", {
        date: now.toISOString(),
        start: SEASON_START.toISOString(),
        end: SEASON_END.toISOString(),
      });
      return NextResponse.json({
        message: "Outside season bounds, skipping.",
        synced: 0,
      });
    }

    // Fetch today's games from MLB API
    const mmddyyyy = `${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${now
      .getDate()
      .toString()
      .padStart(2, "0")}/${now.getFullYear()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${mmddyyyy}&hydrate=linescore&gameType=R`,
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

    // Process each game
    for (const dateGroup of data.dates || []) {
      for (const game of dateGroup.games || []) {
        // Only sync regular season games (gameType === "R")
        if (game.gameType !== "R") {
          continue;
        }

        try {
          const homeTeamAbbrev = game.teams.home.team.abbreviation;
          const awayTeamAbbrev = game.teams.away.team.abbreviation;
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
            },
          });

          syncedCount++;
        } catch (error) {
          logger.error("Error syncing game", {
            gamePk: game.gamePk,
            error,
          });
        }
      }
    }

    logger.info("Game sync completed", { synced: syncedCount });

    return NextResponse.json({
      synced: syncedCount,
    });
  } catch (error) {
    logger.error("Error in game sync cron", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
