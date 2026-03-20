import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

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

    // Convert internal cuids to mlbIds for comparison with homerun events
    const internalPlayerIds = userRosterSpots.map((spot) => spot.playerId);
    const playerLookup = await prisma.player.findMany({
      where: { id: { in: internalPlayerIds } },
      select: { id: true, mlbId: true },
    });

    const userDraftedPlayers = new Map<number, string>(); // mlbId -> leagueId
    for (const spot of userRosterSpots) {
      const player = playerLookup.find((p) => p.id === spot.playerId);
      if (player?.mlbId) {
        userDraftedPlayers.set(player.mlbId, spot.leagueId);
      }
    }

    // Get all homerun events from database
    const allEvents = await prisma.homerrunEvent.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        league: {
          select: { id: true, name: true },
        },
      },
    });

    // Fetch Player data for all homerun events to get current team (source of truth)
    const playerIds = Array.from(new Set(allEvents.map((e) => e.mlbId).filter((id) => id !== null && id !== undefined) as number[]));
    const playerMap = new Map<number, { teamName: string | null }>();

    if (playerIds.length > 0) {
      const players = await prisma.player.findMany({
        where: { mlbId: { in: playerIds } },
        select: { mlbId: true, teamName: true },
      });

      for (const player of players) {
        playerMap.set(player.mlbId, { teamName: player.teamName });
      }
    }

    // Build response with league context
    const response: ApiHomerun[] = allEvents.map((event) => {
      // Check if this player is on the current user's roster
      const isMyPlayer = event.mlbId ? userDraftedPlayers.has(event.mlbId) : false;

      // Get league name - either from user's league or from the event's league
      let leagueName: string | null = null;
      if (isMyPlayer && event.mlbId) {
        const userLeagueId = userDraftedPlayers.get(event.mlbId);
        const league = userLeagueMemberships.find(
          (m) => m.league.id === userLeagueId
        );
        leagueName = league?.league.name || null;
      } else {
        // Check if player is in any of the user's leagues (but not drafted by user)
        const playerInUserLeague = userLeagueMemberships.find(
          (membership) => membership.league.id === event.leagueId
        );
        leagueName = playerInUserLeague?.league.name || null;
      }

      // Get team from Player table (current), fall back to event.team (what it was at time of HR)
      const playerData = event.mlbId ? playerMap.get(event.mlbId) : null;
      const mlbTeam = playerData?.teamName || event.team || "Unknown";

      return {
        playerName: event.playerName,
        mlbTeam,
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

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const { statusCode, message } = handleError(
      error,
      "Failed to retrieve all homeruns"
    );
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
