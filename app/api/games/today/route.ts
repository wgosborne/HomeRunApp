import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { getPlayerTeamMap } from "@/lib/mlb-stats";

const logger = createLogger("games.today");

export interface ApiGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  inning: number | null;
  inningHalf: string | null;
  startTime: string | null;
  gameType: string;
  userPlayerCount: number;
}

/**
 * GET /api/games/today
 * Get today's live games with user player count
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

    // Calculate date bounds for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's games
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    if (games.length === 0) {
      logger.info("No games today");
      return NextResponse.json([]);
    }

    // Get user's roster players
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: {
        userId: user.id,
      },
      select: {
        playerId: true,
      },
    });

    const userPlayerIds = new Set(rosterSpots.map((spot) => spot.playerId));

    // Get player team map (uses cached MLB leaders)
    const playerTeamMap = await getPlayerTeamMap();

    // Build response with userPlayerCount for each game
    const response: ApiGame[] = games.map((game) => {
      // Count how many of user's players are in this game
      let userPlayerCount = 0;
      for (const playerId of userPlayerIds) {
        const playerTeam = playerTeamMap.get(playerId);
        if (playerTeam === game.homeTeam || playerTeam === game.awayTeam) {
          userPlayerCount++;
        }
      }

      return {
        id: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        inning: game.inning,
        inningHalf: game.inningHalf,
        startTime: game.startTime,
        gameType: game.gameType,
        userPlayerCount,
      };
    });

    logger.info("Retrieved today's games", {
      userId: user.id,
      gameCount: response.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to retrieve games");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
