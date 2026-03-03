import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, AuthenticationError, AuthorizationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("draft-picks");

export interface DraftPickEntry {
  id: string;
  roundNumber: number;
  pickNumber: number;
  playerName: string;
  mlbId: number | null;
  owner: {
    name: string;
  };
}

// GET /api/draft/[leagueId]/picks - Get all draft picks for a league
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

    // Fetch all draft picks for this league with owner info
    const draftPicks = await prisma.draftPick.findMany({
      where: { leagueId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { pickNumber: "asc" },
    });

    // Transform to response format
    const picks: DraftPickEntry[] = draftPicks.map((pick) => ({
      id: pick.id,
      roundNumber: pick.round,
      pickNumber: pick.pickNumber,
      playerName: pick.playerName,
      mlbId: pick.mlbId,
      owner: {
        name: pick.user?.name || "Unknown",
      },
    }));

    logger.info("Retrieved draft picks", {
      leagueId,
      userId: user.id,
      pickCount: picks.length,
    });

    return NextResponse.json(picks);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to retrieve draft picks");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
