import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError, AuthorizationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("leagues.[leagueId].roster");

export interface RosterEntry {
  playerId: string;
  playerName: string;
  position: string | null;
  mlbId: number | null;
  homeruns: number;
  points: number;
  draftedRound: number | null;
  draftedPickNumber: number | null;
}

// GET /api/leagues/[leagueId]/roster - Get authenticated user's roster or specified user's roster
export async function GET(
  request: Request,
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

    // Check for userId query parameter (for fetching other users' rosters)
    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get("userId");
    const targetUserId = requestedUserId || user.id;

    // If requesting another user's roster, verify they are also a league member
    if (requestedUserId && requestedUserId !== user.id) {
      const otherMembership = await prisma.leagueMembership.findUnique({
        where: {
          userId_leagueId: {
            userId: requestedUserId,
            leagueId,
          },
        },
      });

      if (!otherMembership) {
        throw new AuthorizationError(
          "That user is not a member of this league"
        );
      }
    }

    // Fetch roster spots for target user, sorted by homeruns descending
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: {
        leagueId,
        userId: targetUserId,
      },
      orderBy: { homeruns: "desc" },
    });

    const roster: RosterEntry[] = rosterSpots.map((spot) => ({
      playerId: spot.playerId,
      playerName: spot.playerName,
      position: spot.position,
      mlbId: spot.mlbId,
      homeruns: spot.homeruns,
      points: spot.points,
      draftedRound: spot.draftedRound,
      draftedPickNumber: spot.draftedPickNumber,
    }));

    logger.info("Retrieved roster", {
      leagueId,
      userId: targetUserId,
      requestedBy: user.id,
      playerCount: roster.length,
    });

    return NextResponse.json(roster);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to retrieve roster");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
