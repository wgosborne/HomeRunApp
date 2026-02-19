import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, NotFoundError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { requireLeagueMember } from "@/lib/middleware";

const logger = createLogger("leagues.[leagueId]");

// GET /api/leagues/[leagueId] - Get single league details
export async function GET(
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

    // Verify user is member of this league
    await requireLeagueMember(leagueId, user.id);

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        settings: true,
      },
    });

    if (!league) {
      throw new NotFoundError("League not found");
    }

    logger.info("Retrieved league", { leagueId: leagueId, userId: user.id });

    return NextResponse.json(league);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to retrieve league");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
