import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("homeruns.all");

export interface ApiHomerun {
  playerName: string;
  mlbTeam: string;
  mlbId: number | null;
  hrNumber: number | null;
  game: string;
  leagueName: string | null;
  isMyPlayer: boolean;
  occurredAt: string;
}

/**
 * GET /api/homeruns/all
 * Get 360 most recent homerun events from database
 * Include league context for players in user's leagues
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

    // Get user's leagues and all players they've drafted
    const userLeagueMemberships = await prisma.leagueMembership.findMany({
      where: { userId: user.id },
      include: {
        league: {
          select: { id: true, name: true },
        },
      },
    });

    const userLeagueIds = userLeagueMemberships.map((m) => m.leagueId);

    // Get user's roster spots across all their leagues
    const userRosterSpots = await prisma.rosterSpot.findMany({
      where: {
        userId: user.id,
        leagueId: {
          in: userLeagueIds,
        },
      },
      select: { playerId: true, leagueId: true },
    });

    const userDraftedPlayers = new Map<string, string>(); // playerId -> leagueId
    for (const spot of userRosterSpots) {
      userDraftedPlayers.set(spot.playerId, spot.leagueId);
    }

    // Get 360 most recent homerun events from database
    const allEvents = await prisma.homerrunEvent.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 360,
      include: {
        league: {
          select: { id: true, name: true },
        },
      },
    });

    // Build response with league context
    const response: ApiHomerun[] = allEvents.map((event) => {
      // Check if this player is on the current user's roster
      const isMyPlayer = userDraftedPlayers.has(event.playerId);

      // Get league name - either from user's league or from the event's league
      let leagueName: string | null = null;
      if (isMyPlayer) {
        const userLeagueId = userDraftedPlayers.get(event.playerId);
        const league = userLeagueMemberships.find(
          (m) => m.league.id === userLeagueId
        );
        leagueName = league?.league.name || null;
      } else {
        // Check if player is in any of the user's leagues (but not drafted by user)
        const playerInUserLeague = userLeagueMemberships.find((membership) =>
          membership.league.id === event.leagueId ? event.leagueId : null
        );
        leagueName = playerInUserLeague?.league.name || null;
      }

      return {
        playerName: event.playerName,
        mlbTeam: event.team || "Unknown",
        mlbId: event.mlbId,
        hrNumber: event.jerseyNumber,
        game: `${event.homeTeam || ""} vs ${event.awayTeam || ""}`.trim(),
        leagueName,
        isMyPlayer,
        occurredAt: event.createdAt.toISOString(),
      };
    });

    logger.info("Retrieved all homeruns", {
      userId: user.id,
      count: response.length,
      fromUserLeagues: response.filter((h) => h.leagueName).length,
      myPlayers: response.filter((h) => h.isMyPlayer).length,
    });

    return NextResponse.json(response);
  } catch (error) {
    const { statusCode, message } = handleError(
      error,
      "Failed to retrieve all homeruns"
    );
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
