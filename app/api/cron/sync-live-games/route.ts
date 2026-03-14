import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron-sync-live-games");

// Season bounds for 2026: Spring Training Feb 20 - Sept 27 (includes all preseason + regular season)
const SEASON_START = new Date("2026-02-20");
const SEASON_END = new Date("2026-09-28"); // Up to but not including this date

// Map team IDs to MLB abbreviations (includes WBC teams for spring training)
const TEAM_ABBREV_MAP: Record<number, string> = {
  // MLB Teams (official MLB team IDs)
  108: "LAA", // Los Angeles Angels
  109: "ARI", // Arizona Diamondbacks
  110: "BAL", // Baltimore Orioles
  111: "BOS", // Boston Red Sox
  112: "CHC", // Chicago Cubs
  113: "CIN", // Cincinnati Reds
  114: "MIL", // Milwaukee Brewers
  115: "PIT", // Pittsburgh Pirates
  116: "DET", // Detroit Tigers
  117: "HOU", // Houston Astros
  118: "KC",  // Kansas City Royals
  119: "SEA", // Seattle Mariners
  120: "NYY", // New York Yankees
  121: "NYM", // New York Mets
  133: "OAK", // Oakland Athletics
  135: "SD",  // San Diego Padres
  137: "SF",  // San Francisco Giants
  138: "STL", // St. Louis Cardinals
  139: "TB",  // Tampa Bay Rays
  140: "TEX", // Texas Rangers
  141: "TOR", // Toronto Blue Jays
  142: "MIN", // Minnesota Twins
  143: "PHI", // Philadelphia Phillies
  144: "ATL", // Atlanta Braves
  145: "CWS", // Chicago White Sox
  146: "MIA", // Miami Marlins
  159: "CLE", // Cleveland Guardians
  // World Baseball Classic Teams (Spring Training)
  776: "BRA", // Brazil
  784: "CAN", // Canada
  792: "COL", // Colombia
  798: "CUB", // Cuba
  805: "DOM", // Dominican Republic
  821: "GBR", // Great Britain
  840: "ISR", // Israel
  841: "ITA", // Italy
  867: "MEX", // Mexico
  878: "NED", // Netherlands
  881: "NIC", // Nicaragua
  890: "PAN", // Panama
  897: "PUR", // Puerto Rico
  940: "USA", // United States
  944: "VEN", // Venezuela
};

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
          // Get team abbreviation from map, or use team ID as fallback
          const homeTeamAbbrev =
            TEAM_ABBREV_MAP[game.teams.home.team.id] ||
            `T${game.teams.home.team.id}`;
          const awayTeamAbbrev =
            TEAM_ABBREV_MAP[game.teams.away.team.id] ||
            `T${game.teams.away.team.id}`;

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
