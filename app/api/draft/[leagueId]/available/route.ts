import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailablePlayers } from "@/lib/mlb-stats";
import { handleError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("draft-available");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId } = await params;

    // Verify user is a member of the league
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const membership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a league member" }, { status: 403 });
    }

    // Get all players already drafted in this league
    const draftedPlayers = await prisma.draftPick.findMany({
      where: { leagueId },
      select: { playerId: true },
    });

    const draftedPlayerIds = draftedPlayers.map((p) => p.playerId);

    // Get available players from MLB stats API
    const availablePlayers = await getAvailablePlayers(draftedPlayerIds);

    logger.info("Retrieved available players", {
      leagueId,
      available: availablePlayers.length,
      drafted: draftedPlayerIds.length,
    });

    return NextResponse.json({
      leagueId,
      availablePlayers,
      availableCount: availablePlayers.length,
      draftedCount: draftedPlayerIds.length,
    });
  } catch (error) {
    const { statusCode, message } = handleError(
      error,
      "Failed to get available players"
    );
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
