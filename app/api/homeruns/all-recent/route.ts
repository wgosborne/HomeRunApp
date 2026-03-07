import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { fetchTodaysGames, fetchGameHomeruns } from "@/lib/mlb-stats";

const logger = createLogger("homeruns.all-recent");

export interface ApiHomerun {
  playerName: string;
  mlbTeam: string;
  mlbId: number | null;
  hrNumber: number | null;
  game: string;
  leagueName: string | null; // null if player not in any league
  ownerName: string | null; // null if player not in any league
  isYourPlayer: boolean;
  occurredAt: string;
}

/**
 * GET /api/homeruns/all-recent
 * Fetch 50 most recent homerun events from:
 * 1. Database (for drafted players in user's leagues)
 * 2. MLB API (for recent games with all players)
 * Include league info only for players in user's leagues
 * Mark user's own players with isYourPlayer flag
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

    // Get user's league IDs for ownership checking
    const userLeagueMemberships = await prisma.leagueMembership.findMany({
      where: { userId: user.id },
      select: { leagueId: true },
    });

    const userLeagueIds = userLeagueMemberships.map((m) => m.leagueId);

    // Get today's date in ET (matches MLB official date)
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });

    // Get database homeruns (from drafted players in user's leagues, today only)
    const dbEvents = await prisma.homerrunEvent.findMany({
      where: {
        gameDate: {
          gte: new Date(`${today}T00:00:00`),
          lt: new Date(new Date(`${today}T00:00:00`).getTime() + 86400000),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        league: {
          select: { name: true },
        },
      },
    });

    // Get roster spots for players in user's leagues
    const dbPlayerIds = new Set(dbEvents.map((e) => e.playerId));
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: {
        playerId: {
          in: Array.from(dbPlayerIds),
        },
        leagueId: {
          in: userLeagueIds,
        },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        league: {
          select: { id: true, name: true },
        },
      },
    });

    // Build ownership map for database homeruns
    const dbOwnershipMap = new Map<
      string,
      { ownerId: string; ownerName: string; leagueName: string }
    >();
    for (const spot of rosterSpots) {
      const key = `${spot.leagueId}-${spot.playerId}`;
      dbOwnershipMap.set(key, {
        ownerId: spot.user.id,
        ownerName: spot.user.name || "Unknown",
        leagueName: spot.league.name,
      });
    }

    // Convert database events to response format
    const dbHomeruns: ApiHomerun[] = dbEvents.map((event) => {
      const ownershipKey = `${event.leagueId}-${event.playerId}`;
      const owner = dbOwnershipMap.get(ownershipKey);

      return {
        playerName: event.playerName,
        mlbTeam: event.team || "Unknown",
        mlbId: event.mlbId,
        hrNumber: event.jerseyNumber,
        game: `${event.homeTeam || ""} vs ${event.awayTeam || ""}`.trim(),
        leagueName: owner?.leagueName || null,
        ownerName: owner?.ownerName || null,
        isYourPlayer: owner?.ownerId === user.id,
        occurredAt: event.createdAt.toISOString(),
      };
    });

    // Fetch recent games from MLB API and extract homeruns
    const mlbApiHomeruns: ApiHomerun[] = [];
    try {
      const games = await fetchTodaysGames();

      for (const game of games) {
        try {
          const homeruns = await fetchGameHomeruns(game.gamePk);

          for (const homerun of homeruns) {
            // Check if this homerun is already in database
            const existingInDb = dbEvents.some(
              (e) => e.playByPlayId === homerun.playByPlayId
            );

            if (existingInDb) continue;

            // Check if this player is in user's leagues
            const playerRosters = await prisma.rosterSpot.findMany({
              where: {
                playerId: homerun.playerId,
                leagueId: {
                  in: userLeagueIds,
                },
              },
              include: {
                user: {
                  select: { id: true, name: true },
                },
                league: {
                  select: { name: true },
                },
              },
            });

            // Include league info only if player is in user's leagues
            const leagueInfo = playerRosters.length > 0 ? playerRosters[0] : null;

            mlbApiHomeruns.push({
              playerName: homerun.playerName,
              mlbTeam: homerun.team,
              mlbId: homerun.mlbId,
              hrNumber: homerun.mlbId ? null : null, // API doesn't have jersey number
              game: `${homerun.awayTeam} vs ${homerun.homeTeam}`,
              leagueName: leagueInfo?.league?.name || null,
              ownerName: leagueInfo?.user?.name || null,
              isYourPlayer: leagueInfo?.user?.id === user.id,
              occurredAt: homerun.gameDate.toISOString(),
            });
          }
        } catch (error) {
          logger.debug("Failed to fetch homeruns for game", {
            gamePk: game.gamePk,
            error,
          });
          continue;
        }
      }
    } catch (error) {
      logger.debug("Failed to fetch games from MLB API", { error });
    }

    // Deduplicate API homeruns (database events already have playByPlayId uniqueness)
    // For API data, use playerName + game as key since we don't have playByPlayId
    const apiSeenKeys = new Set<string>();
    const uniqueApiHomeruns = mlbApiHomeruns.filter((h) => {
      const key = `${h.playerName}-${h.game}`;
      if (apiSeenKeys.has(key)) return false;
      apiSeenKeys.add(key);
      return true;
    });

    // Merge and sort by occurred date (most recent first)
    const allHomeruns = [...dbHomeruns, ...uniqueApiHomeruns].sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

    // Take top 50
    const response = allHomeruns.slice(0, 50);

    logger.info("Retrieved all recent homeruns", {
      userId: user.id,
      dbCount: dbHomeruns.length,
      apiCount: uniqueApiHomeruns.length,
      totalCount: response.length,
      fromUserLeagues: response.filter((h) => h.leagueName).length,
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
