import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin-sync-2025-stats");

interface MLBStatsResponse {
  stats?: Array<{
    stats?: Array<{
      player?: {
        id: number;
        fullName: string;
      };
      split?: {
        stat?: {
          homeRuns?: number;
        };
      };
    }>;
  }>;
}

/**
 * One-time admin endpoint to sync 2025 HR stats from MLB API
 * Fetch: https://statsapi.mlb.com/api/v1/stats?stats=season&season=2025&gameType=R&group=hitting&sportId=1&limit=1000&playerPool=All
 * Update Player records where mlbId matches, setting homeruns2025
 * Skip players not found in DB
 */
export async function GET() {
  try {
    logger.info("Starting 2025 HR stats sync");

    // Fetch 2025 stats from MLB API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      "https://statsapi.mlb.com/api/v1/stats?stats=season&season=2025&gameType=R&group=hitting&sportId=1&limit=1000&playerPool=All",
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error("Failed to fetch 2025 stats from MLB API", { status: response.status });
      return NextResponse.json(
        { error: "Failed to fetch 2025 stats from MLB API" },
        { status: 500 }
      );
    }

    const data = (await response.json()) as MLBStatsResponse;

    let updated = 0;
    let skipped = 0;

    // Process each player's stats
    const playerStats = data.stats?.[0]?.stats || [];
    logger.info("Processing player stats", { count: playerStats.length });

    for (const playerStat of playerStats) {
      try {
        const mlbId = playerStat.player?.id;
        const homeRuns = playerStat.split?.stat?.homeRuns;

        if (!mlbId || homeRuns === undefined) {
          skipped++;
          continue;
        }

        // Look up player in database by mlbId
        const player = await prisma.player.findUnique({
          where: { mlbId },
        });

        if (!player) {
          logger.debug("Player not found in DB", { mlbId, name: playerStat.player?.fullName });
          skipped++;
          continue;
        }

        // Update player record with 2025 HR stats
        await prisma.player.update({
          where: { mlbId },
          data: {
            homeruns2025: homeRuns,
          },
        });

        logger.debug("Updated player 2025 stats", {
          mlbId,
          name: player.fullName,
          homeruns2025: homeRuns,
        });

        updated++;
      } catch (error) {
        logger.error("Error processing player stat", {
          playerStat,
          error,
        });
        skipped++;
      }
    }

    logger.info("2025 HR stats sync completed", { updated, skipped, total: playerStats.length });

    return NextResponse.json(
      {
        updated,
        skipped,
        total: playerStats.length,
        message: `Synced 2025 HR stats: ${updated} updated, ${skipped} skipped`,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Sync 2025 stats failed", { error });
    return NextResponse.json(
      { error: "Sync 2025 stats failed" },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Allow POST for convenience
  return GET();
}
