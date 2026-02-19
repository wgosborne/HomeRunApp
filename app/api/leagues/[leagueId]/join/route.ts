import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, ConflictError, NotFoundError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("leagues.[leagueId].join");

// POST /api/leagues/[leagueId]/join - Auto-join league via invite link
export async function POST(
  _request: unknown,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundError("League not found");
    }

    // Check if user is already a member
    const existingMembership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId: leagueId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictError("You are already a member of this league");
    }

    // Add user to league
    const membership = await prisma.leagueMembership.create({
      data: {
        userId: user.id,
        leagueId: leagueId,
        role: "member",
        teamName: `${user.name}'s Team`,
      },
      include: {
        league: true,
      },
    });

    logger.info("User joined league", {
      leagueId: leagueId,
      userId: user.id,
    });

    return NextResponse.json(membership);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to join league");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
