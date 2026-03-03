import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getPlayerDetails, fetchTodaysGameForTeam, TodaysGame } from "@/lib/mlb-stats";

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

    // Get player's team from database or MLB API
    let playerTeam: string | null = null;

    // First try to get team from recent homerun events
    const recentHomerun = await prisma.homerrunEvent.findFirst({
      where: { mlbId },
      select: { team: true },
      orderBy: { gameDate: "desc" },
    });

    if (recentHomerun) {
      playerTeam = recentHomerun.team;
    } else {
      // Fallback to MLB API
      try {
        const playerData = await getPlayerDetails(mlbId.toString());
        if (playerData) {
          playerTeam = playerData.team;
        }
      } catch (error) {
        logger.debug("Failed to fetch player from MLB API", { error, mlbId });
      }
    }

    // If we don't have a team, return game as null (not an error)
    if (!playerTeam) {
      return NextResponse.json({
        game: null,
      } as GameTodayResponse);
    }

    // Fetch today's game for the player's team
    try {
      const game = await fetchTodaysGameForTeam(playerTeam);
      return NextResponse.json({ game } as GameTodayResponse);
    } catch (error) {
      logger.debug("Failed to fetch today's game", { error, playerTeam });
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
