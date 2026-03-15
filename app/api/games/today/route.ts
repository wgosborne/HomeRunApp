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
  homeTeamLogo: string;
  awayTeamLogo: string;
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

    // Get today's games using officialDate (Eastern time, matches MLB API)
    const getOfficialDateET = (): string => {
      return new Date().toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });
      // en-CA locale returns YYYY-MM-DD format natively
      // No manipulation needed — this is the exact format stored in officialDate
    };

    const today = getOfficialDateET();

    // Query all games for today: Live > Upcoming (by startTime) > Final
    // 1. Get all Live games from today
    const liveGames = await prisma.game.findMany({
      where: {
        officialDate: today,
        status: "Live",
      },
      orderBy: {
        gameDate: "asc",
      },
    });

    // 2. Get all Preview games from today (soonest first)
    const previewGames = await prisma.game.findMany({
      where: {
        officialDate: today,
        status: "Preview",
      },
      orderBy: {
        gameDate: "asc",
      },
    });

    // 3. Get all Final games from today (most recent first)
    const finalGames = await prisma.game.findMany({
      where: {
        officialDate: today,
        status: "Final",
      },
      orderBy: {
        gameDate: "desc",
      },
    });

    const games = [...liveGames, ...previewGames, ...finalGames];

    if (games.length === 0) {
      logger.info("No games found");
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

    // Fetch all teams and create logo map
    const teams = await prisma.team.findMany({
      select: {
        abbreviation: true,
        logo: true,
      },
    });
    const logoMap = new Map(teams.map((t) => [t.abbreviation, t.logo]));

    // Build response with userPlayerCount and logos for each game
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
        homeTeamLogo: logoMap.get(game.homeTeam) || "",
        awayTeamLogo: logoMap.get(game.awayTeam) || "",
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
