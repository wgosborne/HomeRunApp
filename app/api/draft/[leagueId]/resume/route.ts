import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { handleError, AuthorizationError, ConflictError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("draft-resume");

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
      throw new AuthorizationError("Only commissioner can resume draft");
    }

    // Check if draft is paused
    if (league.draftStatus !== "paused") {
      throw new ConflictError("Draft is not paused");
    }

    // Update league - set draftStatus back to active and reset timer
    const now = new Date();
    const updatedLeague = await prisma.league.update({
      where: { id: leagueId },
      data: {
        draftStatus: "active",
        currentPickStartedAt: now,
      },
    });

    // Broadcast draft resumed event
    const channel = `draft-${leagueId}`;
    await pusherServer.trigger(channel, "draft:resumed", {
      leagueId,
      timestamp: Date.now(),
    });

    logger.info("Draft resumed", { leagueId, commissionerId: user.id });

    return NextResponse.json(
      { id: updatedLeague.id, draftStatus: updatedLeague.draftStatus, message: "Draft resumed" },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to resume draft");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
