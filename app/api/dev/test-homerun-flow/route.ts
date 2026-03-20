import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push-service";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dev-test-homerun-flow");

interface TestRosterSpot {
  leagueId: string;
  userId: string;
}

interface TestHomerrunFlowResponse {
  dryRun: boolean;
  player: {
    mlbId: number;
    fullName: string | null;
    teamName: string | null;
  };
  rosterSpotsFound: number;
  rosterSpots: TestRosterSpot[];
  notificationsSent: number;
  message: string;
}

/**
 * GET /api/dev/test-homerun-flow
 * Test the homerun notification flow without database writes
 * Query params: mlbId, secret, userId (optional)
 * If userId is provided, only sends notification to that user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate secret
    const secret = request.nextUrl.searchParams.get("secret");
    if (secret !== process.env.CRON_SECRET) {
      logger.warn("Test endpoint called with invalid secret");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get mlbId from query params
    const mlbIdParam = request.nextUrl.searchParams.get("mlbId");
    if (!mlbIdParam) {
      return NextResponse.json(
        { error: "mlbId query parameter required" },
        { status: 400 }
      );
    }

    const mlbId = parseInt(mlbIdParam, 10);
    if (isNaN(mlbId)) {
      return NextResponse.json(
        { error: "mlbId must be a valid number" },
        { status: 400 }
      );
    }

    // Get optional userId filter
    const userIdFilter = request.nextUrl.searchParams.get("userId");

    // Look up player by mlbId
    const player = await prisma.player.findUnique({
      where: { mlbId },
      select: { id: true, fullName: true, teamName: true },
    });

    if (!player) {
      logger.warn("Test endpoint: player not found", { mlbId });
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    // Find all roster spots for this player
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: { playerId: player.id },
      select: { id: true, leagueId: true, userId: true },
    });

    logger.info("Test homerun flow started", {
      mlbId,
      playerName: player.fullName,
      rosterSpotsCount: rosterSpots.length,
      userIdFilter,
    });

    // Filter roster spots if userId is provided
    const spotsToNotify = userIdFilter
      ? rosterSpots.filter((spot) => spot.userId === userIdFilter)
      : rosterSpots;

    let notificationsSent = 0;
    const testRosterSpots: TestRosterSpot[] = [];

    // Send test notifications (no database writes)
    for (const spot of spotsToNotify) {
      try {
        testRosterSpots.push({
          leagueId: spot.leagueId,
          userId: spot.userId,
        });

        await sendPushToUser(spot.userId, spot.leagueId, {
          title: `TEST: ${player.fullName} hit a homerun!`,
          body: `This is a test notification. ${player.fullName} (${player.teamName}) would have hit a homerun in the 3rd inning.`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'test-homerun',
          leagueId: spot.leagueId,
          playerId: player.id,
          eventType: 'homerun',
          data: {
            inning: 3,
            team: player.teamName || "Unknown",
            totalHomeruns: 0,
            isTestNotification: true,
          },
        });

        notificationsSent++;

        logger.info("Test notification sent", {
          userId: spot.userId,
          leagueId: spot.leagueId,
          playerName: player.fullName,
        });
      } catch (error) {
        logger.error("Error sending test notification", {
          userId: spot.userId,
          leagueId: spot.leagueId,
          playerName: player.fullName,
          error,
        });
      }
    }

    const response: TestHomerrunFlowResponse = {
      dryRun: true,
      player: {
        mlbId,
        fullName: player.fullName,
        teamName: player.teamName,
      },
      rosterSpotsFound: rosterSpots.length,
      rosterSpots: testRosterSpots,
      notificationsSent,
      message: "Dry run complete — no database changes made",
    };

    logger.info("Test homerun flow completed", {
      mlbId,
      rosterSpotsFound: rosterSpots.length,
      notificationsSent,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error("Test homerun flow failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
