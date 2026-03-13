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

    // Helper to get yesterday/tomorrow dates
    const getDateOffset = (days: number): string => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });
    };

    const yesterday = getDateOffset(-1);
    const tomorrow = getDateOffset(1);

    // Query priority: Live (today) > Final (today) > Preview (today) > Final (yesterday) > Preview (tomorrow)
    // Goal: Return exactly 9 games total

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

    let allGames = [...liveGames];
    const remaining = 9 - allGames.length;

    // 2. Get Final games from today (most recent first)
    if (remaining > 0) {
      const finalToday = await prisma.game.findMany({
        where: {
          officialDate: today,
          status: "Final",
        },
        orderBy: {
          gameDate: "desc",
        },
        take: remaining,
      });
      allGames.push(...finalToday);
    }

    // 3. Get Preview games from today (soonest first)
    if (allGames.length < 9) {
      const previewToday = await prisma.game.findMany({
        where: {
          officialDate: today,
          status: "Preview",
        },
        orderBy: {
          gameDate: "asc",
        },
        take: 9 - allGames.length,
      });
      allGames.push(...previewToday);
    }

    // 4. If still need more games, get Finals from yesterday
    if (allGames.length < 9) {
      const finalYesterday = await prisma.game.findMany({
        where: {
          officialDate: yesterday,
          status: "Final",
        },
        orderBy: {
          gameDate: "desc",
        },
        take: 9 - allGames.length,
      });
      allGames.push(...finalYesterday);
    }

    // 5. If still need more games, get Previews from tomorrow
    if (allGames.length < 9) {
      const previewTomorrow = await prisma.game.findMany({
        where: {
          officialDate: tomorrow,
          status: "Preview",
        },
        orderBy: {
          gameDate: "asc",
        },
        take: 9 - allGames.length,
      });
      allGames.push(...previewTomorrow);
    }

    const games = allGames;

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
