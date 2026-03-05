import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("homeruns.recent");

export interface ApiHomerun {
  playerName: string;
  mlbTeam: string;
  mlbId: number | null;
  hrNumber: number | null;
  game: string;
  leagueName: string;
  ownerName: string;
  isYourPlayer: boolean;
  occurredAt: string;
}

/**
 * GET /api/homeruns/recent
 * Get 10 most recent homerun events in user's leagues
 */
export async function GET() {
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

    // Get user's league IDs
    const leagueMemberships = await prisma.leagueMembership.findMany({
      where: { userId: user.id },
      select: { leagueId: true },
    });

    const leagueIds = leagueMemberships.map((m) => m.leagueId);

    if (leagueIds.length === 0) {
      logger.info("User has no leagues");
      return NextResponse.json([]);
    }

    // Get 10 most recent homerun events
    const events = await prisma.homerrunEvent.findMany({
      where: {
        leagueId: {
          in: leagueIds,
        },
      },
      include: {
        league: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    if (events.length === 0) {
      logger.info("No recent homerun events");
      return NextResponse.json([]);
    }

    // Get roster spot ownership for all playerIds in events
    const playerIds = new Set(events.map((e) => e.playerId));
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: {
        playerId: {
          in: Array.from(playerIds),
        },
        leagueId: {
          in: leagueIds,
        },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Build ownership map: `${leagueId}-${playerId}` -> owner
    const ownershipMap = new Map<string, { id: string; name: string }>();
    for (const spot of rosterSpots) {
      const key = `${spot.leagueId}-${spot.playerId}`;
      ownershipMap.set(key, {
        id: spot.user.id,
        name: spot.user.name || "Unknown",
      });
    }

    // Build response
    const response: ApiHomerun[] = events.map((event) => {
      const ownershipKey = `${event.leagueId}-${event.playerId}`;
      const owner = ownershipMap.get(ownershipKey);

      return {
        playerName: event.playerName,
        mlbTeam: event.team || "Unknown",
        mlbId: event.mlbId,
        hrNumber: event.jerseyNumber,
        game: `${event.homeTeam || ""} vs ${event.awayTeam || ""}`.trim(),
        leagueName: event.league.name,
        ownerName: owner?.name || "Unknown",
        isYourPlayer: owner?.id === user.id,
        occurredAt: event.createdAt.toISOString(),
      };
    });

    logger.info("Retrieved recent homeruns", {
      userId: user.id,
      count: response.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    const { statusCode, message } = handleError(
      error,
      "Failed to retrieve recent homeruns"
    );
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
