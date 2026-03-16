import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import {
  handleError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-end-season");

/**
 * POST /api/leagues/[leagueId]/end-season
 * End the season for a league (commissioner only)
 * Crowns the winner (most HRs) and locks the league
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId } = await params;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get league and verify commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundError("League not found");
    }

    if (league.commissionerId !== user.id) {
      throw new AuthorizationError(
        "Only the commissioner can end the season"
      );
    }

    // Guard: draft must be complete
    if (league.draftStatus !== "complete") {
      throw new ConflictError(
        "Season can only end after draft is complete"
      );
    }

    // Guard: season must not already be ended
    if (league.seasonEndedAt) {
      throw new ConflictError("Season has already ended");
    }

    // Calculate winner: sum Player.homeruns per user (source of truth from MLB API)
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: { leagueId },
    });

    if (rosterSpots.length === 0) {
      throw new ConflictError("No players in league");
    }

    // Fetch player homerun data for all mlbIds
    const mlbIds = Array.from(new Set(rosterSpots.map(s => s.mlbId).filter((id): id is number => id !== null)));
    const playerHRMap = new Map<number, number>();

    if (mlbIds.length > 0) {
      const players = await prisma.player.findMany({
        where: { mlbId: { in: mlbIds } },
        select: { mlbId: true, homeruns: true },
      });
      players.forEach(p => playerHRMap.set(p.mlbId, p.homeruns));
    }

    // Group by userId and sum Player.homeruns
    const userHRMap = new Map<string, number>();
    for (const spot of rosterSpots) {
      const playerHR = (spot.mlbId && playerHRMap.has(spot.mlbId)) ? playerHRMap.get(spot.mlbId)! : 0;
      userHRMap.set(spot.userId, (userHRMap.get(spot.userId) || 0) + playerHR);
    }

    // Find winner with most homeruns
    const winnerId = Array.from(userHRMap.entries()).sort(([, a], [, b]) => b - a)[0][0];
    const winnerHomerunCount = userHRMap.get(winnerId) || 0;

    // Get winner details
    const winner = await prisma.user.findUnique({
      where: { id: winnerId },
      select: { id: true, name: true, image: true },
    });

    if (!winner) {
      throw new NotFoundError("Winner not found");
    }

    // Get winner's team name from league membership
    const winnerMembership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId: winnerId,
          leagueId,
        },
      },
    });

    const winnerTeamName = winnerMembership?.teamName || winner.name || "Team";

    // Update league
    const updatedLeague = await prisma.league.update({
      where: { id: leagueId },
      data: {
        seasonEndedAt: new Date(),
        winnerId,
      },
    });

    logger.info("Season ended", {
      leagueId,
      leagueName: league.name,
      winnerId,
      winnerName: winner.name,
      winnerTeamName,
      totalHomeruns: winnerHomerunCount,
    });

    // Broadcast Pusher event
    await pusherServer.trigger(`league-${leagueId}`, "season-ended", {
      winnerId,
      winnerName: winner.name,
      winnerTeamName,
      totalHomeruns: winnerHomerunCount,
      seasonEndedAt: updatedLeague.seasonEndedAt,
    });

    return NextResponse.json({
      success: true,
      winnerId,
      winnerName: winner.name,
      winnerTeamName,
      totalHomeruns: winnerHomerunCount,
    });
  } catch (error) {
    const { statusCode, message } = handleError(
      error,
      "Failed to end season"
    );
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
