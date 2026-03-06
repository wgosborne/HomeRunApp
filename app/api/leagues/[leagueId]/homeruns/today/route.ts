import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError, AuthorizationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("leagues.[leagueId].homeruns.today");

export interface TodayHomerunEvent {
  playerId: string;
  playerName: string;
  mlbTeam: string;
  mlbId: number | null;
  ownerId: string;
  ownerName: string;
  occurredAt: string;
}

/**
 * GET /api/leagues/[leagueId]/homeruns/today
 * Get all homerun events from today for a league
 */
export async function GET(
  _request: unknown,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      throw new AuthenticationError("You must be logged in");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    // Verify user is member of this league
    const membership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId,
        },
      },
    });

    if (!membership) {
      throw new AuthorizationError("You are not a member of this league");
    }

    // Get start and end of today (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Get all homerun events from today
    const events = await prisma.homerrunEvent.findMany({
      where: {
        leagueId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (events.length === 0) {
      logger.info("No homerun events today", { leagueId, userId: user.id });
      return NextResponse.json([]);
    }

    // Get roster spot ownership for all playerIds in events
    const playerIds = new Set(events.map((e) => e.playerId));
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: {
        playerId: {
          in: Array.from(playerIds),
        },
        leagueId,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Build ownership map: playerId -> owner
    const ownershipMap = new Map<string, { id: string; name: string }>();
    for (const spot of rosterSpots) {
      ownershipMap.set(spot.playerId, {
        id: spot.user.id,
        name: spot.user.name || "Unknown",
      });
    }

    // Build response
    const response: TodayHomerunEvent[] = events.map((event) => {
      const owner = ownershipMap.get(event.playerId);

      return {
        playerId: event.playerId,
        playerName: event.playerName,
        mlbTeam: event.team || "Unknown",
        mlbId: event.mlbId,
        ownerId: owner?.id || "unknown",
        ownerName: owner?.name || "Unknown",
        occurredAt: event.createdAt.toISOString(),
      };
    });

    logger.info("Retrieved today's homerun events", {
      leagueId,
      userId: user.id,
      count: response.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    const { statusCode, message } = handleError(
      error,
      "Failed to retrieve today's homeruns"
    );
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
