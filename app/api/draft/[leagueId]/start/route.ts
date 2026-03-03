import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { handleError, AuthorizationError, ConflictError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push-service";

const logger = createLogger("draft-start");

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
      include: {
        memberships: true,
        draftPicks: true,
      },
    });

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Check if user is commissioner
    if (league.commissionerId !== user.id) {
      throw new AuthorizationError("Only commissioner can start draft");
    }

    // Check if draft already started
    if (league.draftStartedAt) {
      throw new ConflictError("Draft has already started");
    }

    // Check if draft already completed
    if (league.draftCompletedAt) {
      throw new ConflictError("Draft has already completed");
    }

    // Update league - set draftStartedAt, draftStatus to active, and currentPickStartedAt
    const now = new Date();
    const updatedLeague = await prisma.league.update({
      where: { id: leagueId },
      data: {
        draftStartedAt: now,
        draftStatus: "active",
        currentPickStartedAt: now,
      },
      include: {
        memberships: true,
        draftPicks: true,
      },
    });

    // Broadcast draft started event to all members
    const channel = `draft-${leagueId}`;
    await pusherServer.trigger(channel, "draft:started", {
      leagueId,
      startedAt: updatedLeague.draftStartedAt,
      memberCount: updatedLeague.memberships.length,
      timestamp: Date.now(),
    });

    // Send "draft started" notification to all league members
    // First picker gets "your turn" message, others get "draft started" message
    try {
      for (let i = 0; i < updatedLeague.memberships.length; i++) {
        const membership = updatedLeague.memberships[i];
        const isFirstPicker = i === 0;

        await sendPushToUser(membership.userId, leagueId, {
          title: isFirstPicker ? 'Your turn in the draft!' : 'Draft has started!',
          body: isFirstPicker
            ? 'You are the first picker. Make your first selection.'
            : 'The draft has started. Wait for your turn to pick.',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'draft-start',
          leagueId,
          eventType: 'turn',
          data: {
            round: 1,
            pickNumber: isFirstPicker ? 1 : 0,
          },
        });
      }
    } catch (pushError) {
      logger.error('Error sending draft start push notifications', {
        leagueId,
        error: pushError,
      });
      // Continue processing even if push fails
    }

    logger.info("Draft started", {
      leagueId,
      commissionerId: user.id,
      memberCount: updatedLeague.memberships.length,
    });

    return NextResponse.json(
      {
        id: updatedLeague.id,
        name: updatedLeague.name,
        draftStartedAt: updatedLeague.draftStartedAt,
        memberships: updatedLeague.memberships,
        message: "Draft started successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to start draft");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
