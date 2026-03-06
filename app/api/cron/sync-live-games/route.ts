import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron-sync-live-games");

// Season bounds for 2026: Spring Training Feb 20 - Sept 27 (includes all preseason + regular season)
const SEASON_START = new Date("2026-02-20");
const SEASON_END = new Date("2026-09-28"); // Up to but not including this date

// Map team IDs to MLB abbreviations (includes WBC teams for spring training)
const TEAM_ABBREV_MAP: Record<number, string> = {
  // MLB Teams
  108: "LAA", // Los Angeles Angels
  109: "ARI", // Arizona Diamondbacks
  110: "BAL", // Baltimore Orioles
  111: "BOS", // Boston Red Sox
  112: "CHC", // Chicago Cubs
  113: "CIN", // Cincinnati Reds
  114: "CLE", // Cleveland Guardians
  115: "COL", // Colorado Rockies
  116: "DET", // Detroit Tigers
  117: "HOU", // Houston Astros
  118: "KC",  // Kansas City Royals
  119: "LAD", // Los Angeles Dodgers
  120: "WSH", // Washington Nationals
  121: "NYM", // New York Mets
  133: "OAK", // Oakland Athletics
  134: "PIT", // Pittsburgh Pirates
  135: "SD",  // San Diego Padres
  136: "SEA", // Seattle Mariners
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
  147: "NYY", // New York Yankees
  158: "MIL", // Milwaukee Brewers
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
 * Shared handler for game sync cron job
 * Vercel sends GET requests by default
 */
async function handleGameSync() {
  try {

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

    // Get allowed game types based on env flag
    const enableSpringTraining = process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING === 'true';
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
          const homeTeamAbbrev = TEAM_ABBREV_MAP[game.teams.home.team.id] || `T${game.teams.home.team.id}`;
          const awayTeamAbbrev = TEAM_ABBREV_MAP[game.teams.away.team.id] || `T${game.teams.away.team.id}`;

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
