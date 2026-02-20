import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError, AuthorizationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("leagues.[leagueId].standings");

export interface StandingsEntry {
  rank: number;
  userId: string;
  userName: string;
  teamName: string;
  userImage: string | null;
  totalHomeruns: number;
  totalPoints: number;
  playerCount: number;
  players: Array<{
    playerId: string;
    playerName: string;
    position: string | null;
    homeruns: number;
    points: number;
  }>;
}

// GET /api/leagues/[leagueId]/standings - Get league standings
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

    // Fetch all roster spots for the league with user info
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: { leagueId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { homeruns: "desc" },
    });

    // Fetch team names for all users in the league
    const memberships = await prisma.leagueMembership.findMany({
      where: { leagueId },
      select: {
        userId: true,
        teamName: true,
      },
    });

    const teamNameMap = new Map(
      memberships.map((m) => [m.userId, m.teamName])
    );

    // Group by userId and aggregate stats
    const userStats = new Map<
      string,
      {
        userName: string;
        userImage: string | null;
        totalHomeruns: number;
        totalPoints: number;
        players: Array<{
          playerId: string;
          playerName: string;
          position: string | null;
          homeruns: number;
          points: number;
        }>;
      }
    >();

    for (const spot of rosterSpots) {
      const userId = spot.userId;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userName: spot.user?.name || "Unknown",
          userImage: spot.user?.image || null,
          totalHomeruns: 0,
          totalPoints: 0,
          players: [],
        });
      }

      const stats = userStats.get(userId)!;
      stats.totalHomeruns += spot.homeruns;
      stats.totalPoints += spot.points;
      stats.players.push({
        playerId: spot.playerId,
        playerName: spot.playerName,
        position: spot.position,
        homeruns: spot.homeruns,
        points: spot.points,
      });
    }

    // Convert to array and sort by total homeruns descending
    const standings: StandingsEntry[] = Array.from(userStats.entries())
      .map(([userId, stats], index) => ({
        rank: index + 1,
        userId,
        userName: stats.userName,
        teamName: teamNameMap.get(userId) || "Team Name",
        userImage: stats.userImage,
        totalHomeruns: stats.totalHomeruns,
        totalPoints: stats.totalPoints,
        playerCount: stats.players.length,
        players: stats.players,
      }))
      .sort((a, b) => b.totalHomeruns - a.totalHomeruns)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    logger.info("Retrieved standings", {
      leagueId,
      userId: user.id,
      entryCount: standings.length,
    });

    return NextResponse.json(standings);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to retrieve standings");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
