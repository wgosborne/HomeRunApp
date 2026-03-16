import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin-sync-2025-stats");

interface MLBStatsResponse {
  stats?: Array<{
    splits?: Array<{
      player?: {
        id: number;
        fullName: string;
      };
      stat?: {
        homeRuns?: number;
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
    const splits = data.stats?.[0]?.splits || [];
    logger.info("Processing player stats", { count: splits.length });

    for (const split of splits) {
      try {
        const mlbId = split.player?.id;
        const homeruns2025 = split.stat?.homeRuns || 0;

        if (!mlbId) {
          skipped++;
          continue;
        }

        // Update player record with 2025 HR stats
        const result = await prisma.player.updateMany({
          where: { mlbId },
          data: {
            homeruns2025,
          },
        });

        if (result.count > 0) {
          logger.debug("Updated player 2025 stats", {
            mlbId,
            name: split.player?.fullName,
            homeruns2025,
          });
          updated++;
        } else {
          logger.debug("Player not found in DB", { mlbId, name: split.player?.fullName });
          skipped++;
        }
      } catch (error) {
        logger.error("Error processing player stat", {
          split,
          error,
        });
        skipped++;
      }
    }

    logger.info("2025 HR stats sync completed", { updated, skipped, total: splits.length });

    return NextResponse.json(
      {
        updated,
        skipped,
        total: splits.length,
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
