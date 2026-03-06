import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/test/status
 * Check system status and spring training wiring
 */
export async function GET() {
  try {
    const enableSpringTraining = process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING === "true";

    // Count games and homeruns
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const gameCount = await prisma.game.count({
      where: {
        gameDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const homerunCount = await prisma.homerrunEvent.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    const leagueCount = await prisma.league.count();

    return NextResponse.json({
      springTrainingEnabled: enableSpringTraining,
      database: {
        todaysGames: gameCount,
        todaysHomeruns: homerunCount,
        totalLeagues: leagueCount,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV || "local",
      },
      nextSteps: enableSpringTraining
        ? gameCount === 0
          ? "1. Call /api/test/sync-games?days=3 to sync spring training games\n2. Refresh dashboard to see live games\n3. Create a league and draft players"
          : "1. Create a league\n2. Invite members and draft players\n3. Homeruns will be auto-detected as games progress"
        : "Spring training disabled. Set NEXT_PUBLIC_ENABLE_SPRING_TRAINING=true in .env.local",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
