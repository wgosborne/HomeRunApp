import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin-backfill-games");

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
 * (same logic as sync-live-games cron)
 */
function mapStatus(abstractGameState: string): string {
  if (abstractGameState === "In Progress") return "Live";
  if (abstractGameState === "Final") return "Final";
  return "Preview";
}

/**
 * Map MLB team IDs to abbreviations (same as sync-live-games)
 */
const TEAM_ABBREV_MAP: Record<number, string> = {
  108: "LAA", 109: "ARI", 110: "BAL", 111: "BOS", 112: "CHC", 113: "CIN",
  114: "CLE", 115: "COL", 116: "DET", 117: "HOU", 118: "KC",  119: "LAD",
  120: "WSH", 121: "NYM", 133: "OAK", 134: "PIT", 135: "SD",  136: "SEA",
  137: "SF",  138: "STL", 139: "TB",  140: "TEX", 141: "TOR", 142: "MIN",
  143: "PHI", 144: "ATL", 145: "CWS", 146: "MIA", 147: "NYY", 158: "MIL",
};

/**
 * One-time backfill endpoint to upsert games for a date range
 * Uses exact same logic as sync-live-games cron
 */
export async function GET(request: NextRequest) {
  try {
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required query params: startDate and endDate (YYYY-MM-DD format)" },
        { status: 400 }
      );
    }

    logger.info("Backfilling games", { startDate, endDate });

    // Fetch games from MLB API for the date range
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${startDate}&endDate=${endDate}&hydrate=linescore&gameType=S,R`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error("Failed to fetch games from MLB API", { status: response.status });
      return NextResponse.json(
        { error: "Failed to fetch games from MLB API" },
        { status: 500 }
      );
    }

    const data = (await response.json()) as MLBScheduleResponse;

    let upsertedCount = 0;

    // Process each game using exact same logic as sync-live-games
    for (const dateGroup of data.dates || []) {
      for (const game of dateGroup.games || []) {
        try {
          // Use team abbreviations (same as sync-live-games)
          const homeTeamId = game.teams.home.team.id;
          const awayTeamId = game.teams.away.team.id;
          const homeTeamAbbrev = TEAM_ABBREV_MAP[homeTeamId] || game.teams.home.team.abbreviation || "UNK";
          const awayTeamAbbrev = TEAM_ABBREV_MAP[awayTeamId] || game.teams.away.team.abbreviation || "UNK";
          const gameDate = new Date(game.gameDate);

          // Read scores from teams object (same as sync-live-games)
          const homeScore = (game.teams.home as any).score ?? 0;
          const awayScore = (game.teams.away as any).score ?? 0;

          // Game state from linescore (same as sync-live-games)
          const inning = game.linescore?.currentInning ?? null;
          const inningHalf = game.linescore?.inningHalf ?? null;

          // Status mapping (same as sync-live-games)
          const status = mapStatus(game.status.abstractGameState);

          // Store startTime as CT formatted string (same as sync-live-games)
          const startTime = gameDate.toLocaleTimeString("en-US", {
            timeZone: "America/Chicago",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          // Use officialDate from API (same as sync-live-games)
          let officialDate = (game as any).officialDate;
          if (!officialDate) {
            // Fallback: convert YYYY-MM-DD if needed
            officialDate = gameDate.toISOString().split("T")[0];
          }

          // Upsert with exact same logic as sync-live-games
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

          upsertedCount++;
        } catch (error) {
          logger.error("Error upserting game", {
            gamePk: game.gamePk,
            error,
          });
        }
      }
    }

    logger.info("Game backfill completed", { upserted: upsertedCount });

    return NextResponse.json({
      upserted: upsertedCount,
    });
  } catch (error) {
    logger.error("Backfill failed", { error });
    return NextResponse.json(
      { error: "Backfill failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
