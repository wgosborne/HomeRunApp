import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { submitPickSchema } from "@/lib/validation";
import { handleError, ConflictError, AuthorizationError, ValidationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push-service";

const logger = createLogger("draft-pick");

const TOTAL_ROUNDS = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId } = await params;
    const body = await request.json();
    const validatedData = submitPickSchema.parse(body);

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user is a member of the league
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

    // Get league with draft info
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
        draftPicks: {
          orderBy: { pickNumber: "asc" },
        },
      },
    });

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Check if draft is active
    if (!league.draftStartedAt) {
      throw new ConflictError("Draft has not started yet");
    }

    if (league.draftCompletedAt) {
      throw new ConflictError("Draft has already completed");
    }

    // Calculate whose turn it is
    const memberCount = league.memberships.length;
    const totalPicks = memberCount * TOTAL_ROUNDS;
    const completedPicks = league.draftPicks.length;
    const nextPickNumber = completedPicks + 1;

    // Check if draft is complete
    if (completedPicks >= totalPicks) {
      throw new ConflictError("Draft is complete");
    }

    // Determine who should be picking
    const currentRound = Math.ceil(nextPickNumber / memberCount);
    const pickerIndexInRound = (nextPickNumber - 1) % memberCount;
    const currentPickerId = league.memberships[pickerIndexInRound].userId;

    // Verify it's this user's turn
    if (currentPickerId !== user.id) {
      const pickerName = league.memberships[pickerIndexInRound].user?.name || "Unknown";
      throw new AuthorizationError(
        `It's ${pickerName}'s turn to pick, not yours`
      );
    }

    // Check if player already drafted
    const existingPick = await prisma.draftPick.findUnique({
      where: {
        leagueId_playerId: {
          leagueId,
          playerId: validatedData.playerId,
        },
      },
    });

    if (existingPick) {
      throw new ConflictError(
        `${validatedData.playerName} has already been drafted`
      );
    }

    // Create the draft pick
    const draftPick = await prisma.draftPick.create({
      data: {
        leagueId,
        userId: user.id,
        playerId: validatedData.playerId,
        playerName: validatedData.playerName,
        position: validatedData.position,
        mlbId: validatedData.mlbId,
        round: currentRound,
        pickNumber: nextPickNumber,
        isPick: true,
        pickedAt: new Date(),
      },
    });

    // Create roster spot for the picked player
    await prisma.rosterSpot.create({
      data: {
        leagueId,
        userId: user.id,
        playerId: validatedData.playerId,
        playerName: validatedData.playerName,
        position: validatedData.position,
        mlbId: validatedData.mlbId,
        mlbTeam: validatedData.mlbTeam,
        draftedRound: currentRound,
        draftedPickNumber: nextPickNumber,
      },
    });

    // Check if draft is now complete
    const isComplete = nextPickNumber >= totalPicks;
    const now = new Date();
    if (isComplete) {
      await prisma.league.update({
        where: { id: leagueId },
        data: {
          draftCompletedAt: now,
          draftStatus: "complete",
        },
      });
    } else {
      // Reset timer for next pick
      await prisma.league.update({
        where: { id: leagueId },
        data: { currentPickStartedAt: now },
      });
    }

    // Broadcast pick to all members via Pusher
    const channel = `draft-${leagueId}`;
    const pickerName = league.memberships[pickerIndexInRound].user?.name || "Unknown";

    await pusherServer.trigger(channel, "pick-made", {
      leagueId,
      pickNumber: nextPickNumber,
      round: currentRound,
      pickerId: user.id,
      pickerName,
      playerName: validatedData.playerName,
      playerId: validatedData.playerId,
      position: validatedData.position,
      timestamp: Date.now(),
    });

    // Send "your turn" notification to next picker (if draft not complete)
    if (!isComplete) {
      try {
        const nextPickNumber = completedPicks + 2; // Next pick after this one
        const nextPickerIndexInRound = (nextPickNumber - 1) % memberCount;
        const nextPickerId = league.memberships[nextPickerIndexInRound].userId;
        const nextRound = Math.ceil(nextPickNumber / memberCount);

        await sendPushToUser(nextPickerId, leagueId, {
          title: 'Your turn in the draft!',
          body: `${pickerName} just picked ${validatedData.playerName}. It's your turn now! You have 60 seconds to make your selection.`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'draft-turn',
          leagueId,
          eventType: 'turn',
          data: {
            round: nextRound,
            pickNumber: nextPickNumber,
          },
        });
      } catch (pushError) {
        logger.error('Error sending draft turn push notification', {
          leagueId,
          error: pushError,
        });
        // Continue processing even if push fails
      }
    }

    // If draft is complete, broadcast completion
    if (isComplete) {
      await pusherServer.trigger(channel, "draft-completed", {
        leagueId,
        completedAt: new Date(),
        timestamp: Date.now(),
      });
    }

    logger.info("Draft pick submitted", {
      leagueId,
      pickNumber: nextPickNumber,
      round: currentRound,
      userId: user.id,
      playerName: validatedData.playerName,
      isDraftComplete: isComplete,
    });

    return NextResponse.json(
      {
        draftPick,
        nextPickNumber,
        isComplete,
        message: "Pick submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, context: error.context },
        { status: 400 }
      );
    }

    const { statusCode, message } = handleError(error, "Failed to submit pick");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
