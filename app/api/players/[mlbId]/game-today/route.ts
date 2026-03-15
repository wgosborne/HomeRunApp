import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

export interface TodaysGame {
  opponent: string;
  isHome: boolean;
  status: "Pre-Game" | "In Progress" | "Final";
  gameTime: string; // ISO 8601 datetime
  homeScore: number | null;
  awayScore: number | null;
  currentInning: number | null;
}

const logger = createLogger("players-game-today");

interface GameTodayResponse {
  game: TodaysGame | null;
}

// GET /api/players/[mlbId]/game-today - Get today's game for a player's team
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mlbId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { mlbId: mlbIdParam } = await params;
    const mlbId = parseInt(mlbIdParam, 10);
    if (isNaN(mlbId)) {
      return NextResponse.json(
        { error: "Invalid mlbId" },
        { status: 400 }
      );
    }

    // Get player's current team ID from Player table
    let playerTeamId: number | null = null;

    try {
      const player = await prisma.player.findUnique({
        where: { mlbId },
        select: { teamId: true },
      });

      if (player?.teamId) {
        playerTeamId = player.teamId;
      }
    } catch (error) {
      logger.debug("Failed to fetch player from database", { error, mlbId });
    }

    // If we don't have a team ID, return game as null
    if (!playerTeamId) {
      return NextResponse.json({
        game: null,
      } as GameTodayResponse);
    }

    // Fetch today's game by querying Game table with team ID
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Query Game table by team ID (reliable, no name matching issues)
      const gameRecord = await prisma.game.findFirst({
        where: {
          officialDate: today,
          OR: [
            { homeTeamId: playerTeamId },
            { awayTeamId: playerTeamId },
          ],
        },
      });

      if (!gameRecord) {
        return NextResponse.json({
          game: null,
        } as GameTodayResponse);
      }

      // Convert game record to TodaysGame format
      const isHome = gameRecord.homeTeamId === playerTeamId;
      const opponent = isHome ? gameRecord.awayTeam : gameRecord.homeTeam;

      const game: TodaysGame = {
        opponent: opponent || "Unknown",
        isHome,
        status: (gameRecord.status || "Preview") as "Pre-Game" | "In Progress" | "Final",
        gameTime: gameRecord.gameDate.toISOString(),
        homeScore: gameRecord.homeScore || null,
        awayScore: gameRecord.awayScore || null,
        currentInning: gameRecord.inning || null,
      };

      return NextResponse.json({ game } as GameTodayResponse);
    } catch (error) {
      logger.debug("Failed to fetch today's game", { error, playerTeamId });
      return NextResponse.json({ game: null } as GameTodayResponse);
    }
  } catch (error) {
    logger.error("Failed to fetch game today", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
