import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { handleError, ConflictError, ValidationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

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

    // Get all available MLB players from statsapi
    let availablePlayers: any[] = [];
    try {
      const response = await fetch("https://statsapi.mlb.com/api/v1/teams");
      const data = await response.json();

      // Fetch players for each team (this is a simplified approach)
      // In production, you'd want to cache this or use a better data source
      const players: any[] = [];
      for (const team of data.teams) {
        const rosterRes = await fetch(`https://statsapi.mlb.com/api/v1/teams/${team.id}/roster?rosterType=active`);
        const rosterData = await rosterRes.json();

        if (rosterData.roster) {
          rosterData.roster.forEach((player: any) => {
            players.push({
              id: player.person.id.toString(),
              name: player.person.fullName,
              position: player.position?.abbreviation || "DH",
              team: team.teamName,
            });
          });
        }
      }

      // Filter out already drafted players
      const draftedPlayerIds = new Set(league.draftPicks.map((p) => p.playerId));
      availablePlayers = players.filter((p) => !draftedPlayerIds.has(p.id)).slice(0, 100);
    } catch (error) {
      logger.error("Failed to fetch available players", { error });
      throw new ValidationError("Failed to fetch available players for autopick");
    }

    if (availablePlayers.length === 0) {
      throw new ConflictError("No available players for autopick");
    }

    // Pick the first available player (highest rank by default)
    const selectedPlayer = availablePlayers[0];

    // Create the draft pick
    const draftPick = await prisma.draftPick.create({
      data: {
        leagueId,
        userId: currentPickerId,
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        position: selectedPlayer.position,
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
