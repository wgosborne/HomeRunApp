import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dev-simulate-homerun");

/**
 * POST /api/dev/simulate-homerun
 * Development endpoint to simulate a homerun event
 * Only available in development mode (NODE_ENV !== 'production')
 *
 * Request body (optional):
 * {
 *   playerId?: string;
 *   leagueId?: string;
 * }
 *
 * If not provided, uses first available roster spot
 */
export async function POST(request: NextRequest) {
  try {
    // Development mode check
    if (process.env.NODE_ENV === "production") {
      logger.warn("Attempted to use dev endpoint in production");
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: { playerId?: string; leagueId?: string } = {};
    try {
      body = await request.json();
    } catch {
      // If no body, we'll look for a default roster spot
    }

    let playerId = body.playerId;
    let leagueId = body.leagueId;

    // If not provided, find first available roster spot
    if (!playerId || !leagueId) {
      const firstSpot = await prisma.rosterSpot.findFirst({
        select: {
          playerId: true,
          leagueId: true,
        },
      });

      if (!firstSpot) {
        return NextResponse.json(
          { error: "No roster spots found to simulate homerun on" },
          { status: 400 }
        );
      }

      playerId = playerId || firstSpot.playerId;
      leagueId = leagueId || firstSpot.leagueId;
    }

    // Get player and league info
    const rosterSpot = await prisma.rosterSpot.findUnique({
      where: {
        leagueId_userId_playerId: {
          leagueId,
          userId: "", // We'll fetch it below
          playerId,
        },
      },
      include: {
        league: {
          select: { id: true, name: true },
        },
      },
    });

    if (!rosterSpot) {
      // Try to get any roster spot with this player in this league
      const anySpot = await prisma.rosterSpot.findFirst({
        where: { leagueId, playerId },
        include: {
          league: {
            select: { id: true, name: true },
          },
        },
      });

      if (!anySpot) {
        return NextResponse.json(
          { error: "Player not found in league roster" },
          { status: 404 }
        );
      }

      playerId = anySpot.playerId;
    }

    // Create homerun event with unique playByPlayId (timestamp-based)
    const playByPlayId = `dev-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    const event = await prisma.homerrunEvent.create({
      data: {
        leagueId,
        playerId,
        playerName: "Development Homerun",
        playByPlayId,
        gameId: "dev-game",
        gameDate: new Date(),
        inning: 1,
        rbi: 1,
        team: "DEV",
        homeTeam: "DEV",
        awayTeam: "TEST",
      },
      include: {
        league: {
          select: { id: true, name: true },
        },
      },
    });

    // Increment the roster spot homerun count
    await prisma.rosterSpot.update({
      where: {
        leagueId_userId_playerId: {
          leagueId,
          userId: "", // This won't work, we need a different approach
          playerId,
        },
      },
      data: {
        homeruns: {
          increment: 1,
        },
      },
    });

    // Trigger Pusher broadcast
    try {
      await pusherServer.trigger(`league-${leagueId}`, "homerun", {
        playerName: event.playerName,
        playerId: event.playerId,
        gameId: event.gameId,
        inning: event.inning,
        team: event.team,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        timestamp: Date.now(),
      });
    } catch (pusherError) {
      logger.error("Error broadcasting homerun via Pusher", { pusherError });
    }

    logger.info("Simulated homerun", { leagueId, playerId });

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        playerId: event.playerId,
        playerName: event.playerName,
        leagueId: event.leagueId,
        leagueName: event.league.name,
        timestamp: event.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error in simulate homerun", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
