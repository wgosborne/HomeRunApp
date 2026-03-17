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
        abstractGameState: "Pre-Game" | "In Progress" | "Live" | "Final";
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
  if (abstractGameState === "In Progress" || abstractGameState === "Live") return "Live";
  if (abstractGameState === "Final") return "Final";
  return "Preview";
}

/**
 * Map MLB team IDs to abbreviations
 */
const TEAM_ABBREV_MAP: Record<number, string> = {
  108: "LAA", 109: "ARI", 110: "BAL", 111: "BOS", 112: "CHC", 113: "CIN",
  114: "CLE", 115: "COL", 116: "DET", 117: "HOU", 118: "KC",  119: "LAD",
  120: "WSH", 121: "NYM", 133: "OAK", 134: "PIT", 135: "SD",  136: "SEA",
  137: "SF",  138: "STL", 139: "TB",  140: "TEX", 141: "TOR", 142: "MIN",
  143: "PHI", 144: "ATL", 145: "CWS", 146: "MIA", 147: "NYY", 158: "MIL",
};

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
    const todayET = `${year}-${month}-${day}`; // YYYY-MM-DD format for validation

    logger.info("Syncing games for ET date", { mmddyyyy, todayET });

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
          // Use team abbreviations for consistency with Team table
          const homeTeamId = game.teams.home.team.id;
          const awayTeamId = game.teams.away.team.id;
          const homeTeamAbbrev = TEAM_ABBREV_MAP[homeTeamId] || game.teams.home.team.abbreviation || "UNK";
          const awayTeamAbbrev = TEAM_ABBREV_MAP[awayTeamId] || game.teams.away.team.abbreviation || "UNK";
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

          // Store startTime as CT formatted string (e.g., "11:05 AM", "2:05 PM")
          const startTime = gameDate.toLocaleTimeString("en-US", {
            timeZone: "America/Chicago",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          // BUG FIX #3: Use officialDate from API (Eastern time date for schedule queries)
          // Format must be YYYY-MM-DD to match games/today query filter
          let officialDate = (game as any).officialDate;
          if (!officialDate) {
            // Fallback: convert mmddyyyy (MM/DD/YYYY) to YYYY-MM-DD
            const [m, d, y] = mmddyyyy.split("/");
            officialDate = `${y}-${m}-${d}`;
          }

          // Validation guard: skip games with mismatched officialDate
          if (officialDate !== todayET) {
            logger.info("Skipping game with mismatched officialDate", {
              gamePk: game.gamePk,
              officialDate,
              todayET,
            });
            continue;
          }

          // BUG FIX #4: Upsert must update all fields in BOTH create and update blocks
          await prisma.game.upsert({
            where: { id: game.gamePk.toString() },
            update: {
              homeTeam: homeTeamAbbrev,
              awayTeam: awayTeamAbbrev,
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

    // Cleanup: Mark stale Live games from previous days as Final
    // This prevents old games from bleeding into today's view
    const cleanupResult = await prisma.game.updateMany({
      where: {
        status: "Live",
        officialDate: { lt: todayET },
      },
      data: { status: "Final" },
    });

    logger.info("Game sync completed", { synced: syncedCount, staleLiveGamesClosed: cleanupResult.count });

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
