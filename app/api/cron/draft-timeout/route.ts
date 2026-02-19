import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron-draft-timeout");

const TOTAL_ROUNDS = 10;
const PICK_TIMEOUT_SECONDS = 60;

/**
 * Cron job that runs every 5 seconds to check for draft picks that have timed out
 * and automatically picks a player for the user whose turn it is.
 *
 * POST /api/cron/draft-timeout
 * Requires: Authorization header with cron secret
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find all active draft leagues where the pick has timed out
    const activeLeagues = await prisma.league.findMany({
      where: {
        draftStatus: "active",
        currentPickStartedAt: {
          lt: new Date(Date.now() - PICK_TIMEOUT_SECONDS * 1000),
        },
      },
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

    logger.info("Found leagues with timed out picks", { count: activeLeagues.length });

    let autoPicksProcessed = 0;

    for (const league of activeLeagues) {
      try {
        // Calculate whose turn it is
        const memberCount = league.memberships.length;
        const totalPicks = memberCount * TOTAL_ROUNDS;
        const completedPicks = league.draftPicks.length;
        const nextPickNumber = completedPicks + 1;

        // Skip if draft is complete
        if (completedPicks >= totalPicks) {
          continue;
        }

        // Determine who should be picking
        const currentRound = Math.ceil(nextPickNumber / memberCount);
        const pickerIndexInRound = (nextPickNumber - 1) % memberCount;
        const currentPickerId = league.memberships[pickerIndexInRound].userId;
        const pickerName = league.memberships[pickerIndexInRound].user?.name || "Unknown";

        // Get first available player (simplified: just get players from statsapi)
        // In production, you'd want to use a ranked list or ML model
        let selectedPlayer: any = null;

        try {
          // For now, pick a random available player
          // This is a simplified implementation - in production you'd want better player ranking
          const allPlayers = await fetch(
            "https://statsapi.mlb.com/api/v1/teams/1/roster?rosterType=active"
          )
            .then((r) => r.json())
            .then((data) => {
              if (data.roster) {
                return data.roster.map((p: any) => ({
                  id: p.person.id.toString(),
                  name: p.person.fullName,
                  position: p.position?.abbreviation || "DH",
                }));
              }
              return [];
            })
            .catch(() => []);

          // Filter out already drafted players
          const draftedPlayerIds = new Set(league.draftPicks.map((p) => p.playerId));
          const availablePlayers = allPlayers.filter((p: any) => !draftedPlayerIds.has(p.id));

          if (availablePlayers.length > 0) {
            selectedPlayer = availablePlayers[0];
          }
        } catch (error) {
          logger.warn("Failed to fetch available players for autopick", { leagueId: league.id });
          continue;
        }

        if (!selectedPlayer) {
          logger.warn("No available players for autopick", { leagueId: league.id });
          continue;
        }

        // Create the draft pick
        await prisma.draftPick.create({
          data: {
            leagueId: league.id,
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

        // Create roster spot
        await prisma.rosterSpot.create({
          data: {
            leagueId: league.id,
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
            where: { id: league.id },
            data: {
              draftCompletedAt: now,
              draftStatus: "complete",
            },
          });
        } else {
          // Reset timer for next pick
          await prisma.league.update({
            where: { id: league.id },
            data: { currentPickStartedAt: now },
          });
        }

        // Broadcast pick via Pusher
        const channel = `draft-${league.id}`;
        await pusherServer.trigger(channel, "pick-made", {
          leagueId: league.id,
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

        if (isComplete) {
          await pusherServer.trigger(channel, "draft:completed", {
            leagueId: league.id,
            completedAt: now,
            timestamp: Date.now(),
          });
        }

        autoPicksProcessed++;

        logger.info("Auto-pick processed by cron", {
          leagueId: league.id,
          pickNumber: nextPickNumber,
          playerName: selectedPlayer.name,
        });
      } catch (error) {
        logger.error("Error processing auto-pick for league", {
          leagueId: league.id,
          error,
        });
        continue;
      }
    }

    return NextResponse.json(
      {
        processed: autoPicksProcessed,
        leagues: activeLeagues.length,
        message: `Processed ${autoPicksProcessed} auto-picks`,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Cron job failed", { error });
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
