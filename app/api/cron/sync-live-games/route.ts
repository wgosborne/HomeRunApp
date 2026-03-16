import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron-sync-live-games");

// Season bounds for 2026: Spring Training Feb 20 - Sept 27 (includes all preseason + regular season)
const SEASON_START = new Date("2026-02-20");
const SEASON_END = new Date("2026-09-28"); // Up to but not including this date

interface MLBScheduleResponse {
  dates: Array<{
    games: Array<{
      gamePk: number;
      gameType: string;
      status: {
        abstractGameState: "Pre-Game" | "In Progress" | "Final";
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
 * Map game status from abstract game state
 */
function mapStatus(abstractGameState: string): string {
  if (abstractGameState === "In Progress") return "Live";
  if (abstractGameState === "Final") return "Final";
  return "Preview";
}

/**
 * Shared handler for game sync cron job
 * Vercel sends GET requests by default
 */
async function handleGameSync() {
  try {
    const now = new Date();

    // Early exit: if outside 11am to 1am ET game window, skip immediately
    const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const easternHour = easternTime.getHours();
    if (easternHour >= 1 && easternHour < 11) {
      logger.info("Outside game window, skipping", { hour: easternHour });
      console.log(`[CRON-SYNC-GAMES] Outside game window (hour ${easternHour}), exiting early`);
      return NextResponse.json({
        message: "outside game window",
        synced: 0,
      }, { status: 200 });
    }

    // Season gate: return early if outside 2026-02-20 to 2026-09-27
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

    // BUG FIX #1: Use Eastern time to match MLB officialDate (games organized by ET, not UTC)
    // A game with gameDate: "2026-03-07T00:10:00Z" has officialDate: "2026-03-06" —
    // an evening ET game that crosses midnight UTC gets filed under the previous day
    const easternDate = new Date().toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    // Format: MM/DD/YYYY
    const [month, day, year] = easternDate.split("/");
    const mmddyyyy = `${month}/${day}/${year}`;

    logger.info("Syncing games for ET date", { mmddyyyy });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Get allowed game types based on env flag
    const enableSpringTraining = process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING === "true";
    const gameTypes = enableSpringTraining ? "R,S" : "R";
    logger.info("Game sync filtering", { gameTypes, enableSpringTraining });

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${mmddyyyy}&hydrate=linescore&gameType=${gameTypes}`,
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
        try {
          // Use full team names from MLB API (e.g., "Chicago White Sox") for consistency
          const homeTeamName = game.teams.home.team.name || "Unknown";
          const awayTeamName = game.teams.away.team.name || "Unknown";

          const homeTeamId = game.teams.home.team.id;
          const awayTeamId = game.teams.away.team.id;
          const gameDate = new Date(game.gameDate);

          // BUG FIX #2: Read scores from teams object, NOT linescore
          // The linescore contains inning-by-inning breakdown, not the authoritative totals
          // Confirmed: teams.home.score and teams.away.score are the current game scores
          const homeScore = (game.teams.home as any).score ?? 0;
          const awayScore = (game.teams.away as any).score ?? 0;

          // Game state from linescore (only populated for live games)
          const inning = game.linescore?.currentInning ?? null;
          const inningHalf = game.linescore?.inningHalf ?? null;

          // Status mapping
          const status = mapStatus(game.status.abstractGameState);

          // Store startTime as ISO string for frontend parsing
          const startTime = gameDate.toISOString();

          // BUG FIX #3: Use officialDate from API (Eastern time date for schedule queries)
          // Format must be YYYY-MM-DD to match games/today query filter
          let officialDate = (game as any).officialDate;
          if (!officialDate) {
            // Fallback: convert mmddyyyy (MM/DD/YYYY) to YYYY-MM-DD
            const [m, d, y] = mmddyyyy.split("/");
            officialDate = `${y}-${m}-${d}`;
          }

          // BUG FIX #4: Upsert must update all fields in BOTH create and update blocks
          await prisma.game.upsert({
            where: { id: game.gamePk.toString() },
            update: {
              homeScore,
              awayScore,
              status,
              inning,
              inningHalf,
              officialDate,
              gameType: game.gameType,
              startTime,
            },
            create: {
              id: game.gamePk.toString(),
              homeTeam: homeTeamName,
              awayTeam: awayTeamName,
              homeTeamId,
              awayTeamId,
              homeScore,
              awayScore,
              status,
              inning,
              inningHalf,
              gameDate,
              officialDate,
              startTime,
              gameType: game.gameType,
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

/**
 * GET and POST handlers for Vercel cron
 * Vercel sends GET requests by default
 */
export async function GET() {
  return handleGameSync();
}

export async function POST() {
  return handleGameSync();
}
