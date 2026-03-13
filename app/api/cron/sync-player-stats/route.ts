import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPlayerBios, updatePlayerStats } from "@/lib/mlb-player-sync";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron-sync-player-stats");

/**
 * Shared handler for player stats sync cron job
 * Vercel sends GET requests by default
 */
async function handleSyncPlayerStats() {
  try {
    // Check if this is the first run (no players in DB)
    const playerCount = await prisma.player.count();
    let bioSynced = false;

    if (playerCount === 0) {
      logger.info("First run detected - syncing player bios");
      const bioResult = await syncPlayerBios();
      logger.info("Bio sync result", { created: bioResult.created, skipped: bioResult.skipped });
      bioSynced = bioResult.created > 0;
    } else {
      logger.info("Players already synced - skipping bio sync", { playerCount });
    }

    // Always update stats
    const statsResult = await updatePlayerStats();
    logger.info("Stats update result", { updated: statsResult.updated });

    return NextResponse.json({
      success: true,
      bioSynced,
      updated: statsResult.updated,
      playerCount: await prisma.player.count(),
    });
  } catch (error) {
    logger.error("Cron job failed", { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return handleSyncPlayerStats();
}

export async function POST() {
  return handleSyncPlayerStats();
}
