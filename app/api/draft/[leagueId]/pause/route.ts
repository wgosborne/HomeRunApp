import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { handleError, AuthorizationError, ConflictError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("draft-pause");

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId } = await params;

    // Verify user is commissioner of the league
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Check if user is commissioner
    if (league.commissionerId !== user.id) {
      throw new AuthorizationError("Only commissioner can pause draft");
    }

    // Check if draft is active
    if (league.draftStatus !== "active") {
      throw new ConflictError("Draft is not active");
    }

    // Update league - set draftStatus to paused
    const updatedLeague = await prisma.league.update({
      where: { id: leagueId },
      data: {
        draftStatus: "paused",
      },
    });

    // Broadcast draft paused event
    const channel = `draft-${leagueId}`;
    await pusherServer.trigger(channel, "draft:paused", {
      leagueId,
      timestamp: Date.now(),
    });

    logger.info("Draft paused", { leagueId, commissionerId: user.id });

    return NextResponse.json(
      { id: updatedLeague.id, draftStatus: updatedLeague.draftStatus, message: "Draft paused" },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to pause draft");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
