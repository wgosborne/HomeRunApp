import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError, AuthorizationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

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

    // Get start and end of today (Eastern time)
    const now = new Date();
    const easternDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const today = new Date(easternDate.getFullYear(), easternDate.getMonth(), easternDate.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Get all homerun events from today
    const events = await prisma.homerrunEvent.findMany({
      where: {
        leagueId,
        gameDate: {
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

    // Convert mlbIds to internal cuids for roster lookup
    const mlbIds = Array.from(new Set(events.map((e) => e.mlbId).filter((id) => id !== null && id !== undefined) as number[]));
    const playerIdMap = new Map<number, string>(); // mlbId -> internal cuid

    if (mlbIds.length > 0) {
      const players = await prisma.player.findMany({
        where: { mlbId: { in: mlbIds } },
        select: { mlbId: true, id: true },
      });
      for (const player of players) {
        playerIdMap.set(player.mlbId, player.id);
      }
    }

    // Get roster spot ownership using internal cuids
    const internalPlayerIds = Array.from(playerIdMap.values());
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: {
        playerId: {
          in: internalPlayerIds,
        },
        leagueId,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Build ownership map: mlbId -> owner
    const ownershipMap = new Map<number, { id: string; name: string }>();
    for (const spot of rosterSpots) {
      // Find the mlbId that maps to this internal playerId
      for (const [mlbId, internalId] of playerIdMap) {
        if (internalId === spot.playerId) {
          ownershipMap.set(mlbId, {
            id: spot.user.id,
            name: spot.user.name || "Unknown",
          });
          break;
        }
      }
    }

    // Build response
    const response: TodayHomerunEvent[] = events.map((event) => {
      const owner = event.mlbId ? ownershipMap.get(event.mlbId) : undefined;

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
