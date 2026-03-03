import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { handleError, ConflictError, ValidationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push-service";
import { getAvailablePlayers } from "@/lib/mlb-stats";

const logger = createLogger("draft-autopick");

const TOTAL_ROUNDS = 10;

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
    if (league.draftStatus !== "active") {
      throw new ConflictError("Draft is not active");
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
    const pickerName = league.memberships[pickerIndexInRound].user?.name || "Unknown";

    // Get available players using cached data
    let selectedPlayer: any = null;
    try {
      // Get already drafted player IDs
      const draftedPlayerIds = league.draftPicks.map((p) => p.playerId);

      // Get available players (cached, with MLB stats)
      const availablePlayers = await getAvailablePlayers(draftedPlayerIds);

      if (availablePlayers.length === 0) {
        throw new ConflictError("No available players for autopick");
      }

      // Pick the highest-ranked available player
      selectedPlayer = availablePlayers[0];
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      logger.error("Failed to fetch available players", { error });
      throw new ValidationError("Failed to fetch available players for autopick");
    }

    // Create the draft pick
    const draftPick = await prisma.draftPick.create({
      data: {
        leagueId,
        userId: currentPickerId,
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        position: selectedPlayer.position,
        mlbId: selectedPlayer.mlbId,
        round: currentRound,
        pickNumber: nextPickNumber,
        isPick: true,
        autoPickedAt: new Date(),
        pickedAt: new Date(),
      },
    });

    // Create roster spot for the picked player
    await prisma.rosterSpot.create({
      data: {
        leagueId,
        userId: currentPickerId,
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        position: selectedPlayer.position,
        mlbId: selectedPlayer.mlbId,
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
    await pusherServer.trigger(channel, "pick-made", {
      leagueId,
      pickNumber: nextPickNumber,
      round: currentRound,
      pickerId: currentPickerId,
      pickerName,
      playerName: selectedPlayer.name,
      playerId: selectedPlayer.id,
      position: selectedPlayer.position,
      isAutoPick: true,
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
          body: `${pickerName} just auto-picked ${selectedPlayer.name}. It's your turn now! You have 60 seconds to make your selection.`,
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
      await pusherServer.trigger(channel, "draft:completed", {
        leagueId,
        completedAt: now,
        timestamp: Date.now(),
      });
    }

    logger.info("Auto-pick submitted", {
      leagueId,
      pickNumber: nextPickNumber,
      round: currentRound,
      userId: currentPickerId,
      playerName: selectedPlayer.name,
      isDraftComplete: isComplete,
    });

    return NextResponse.json(
      {
        draftPick,
        nextPickNumber,
        isComplete,
        message: "Auto-pick submitted",
      },
      { status: 201 }
    );
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to submit auto-pick");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
