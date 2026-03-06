import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { createLogger } from "@/lib/logger";
import { getAvailablePlayers } from "@/lib/mlb-stats";

const logger = createLogger("cron-draft-timeout");

const TOTAL_ROUNDS = 10;
const PICK_TIMEOUT_SECONDS = 60;

/**
 * Shared handler for draft timeout cron job
 * Vercel sends GET requests by default
 */
async function handleDraftTimeout() {
  const cronStartTime = Date.now();
  console.log(`[CRON-DRAFT-TIMEOUT] Starting at ${new Date(cronStartTime).toISOString()}`);

  try {
    const timeoutThreshold = new Date(cronStartTime - PICK_TIMEOUT_SECONDS * 1000);
    console.log(`[CRON-DRAFT-TIMEOUT] Checking for picks started before ${timeoutThreshold.toISOString()} (${PICK_TIMEOUT_SECONDS}s ago)`);

    // Find all active draft leagues where the pick has timed out
    // Using <= instead of < to catch picks at exactly 60 seconds, not after
    const activeLeagues = await prisma.league.findMany({
      where: {
        draftStatus: "active",
        currentPickStartedAt: {
          lte: timeoutThreshold, // Changed from 'lt' to 'lte' to catch at 60 seconds, not 61+
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
    console.log(`[CRON-DRAFT-TIMEOUT] Found ${activeLeagues.length} leagues with timed out picks`);

    let autoPicksProcessed = 0;

    for (const league of activeLeagues) {
      try {
        console.log(`[CRON-DRAFT-TIMEOUT] Processing league: ${league.id}`);

        // Calculate whose turn it is
        const memberCount = league.memberships.length;
        const totalPicks = memberCount * TOTAL_ROUNDS;
        const completedPicks = league.draftPicks.length;
        const nextPickNumber = completedPicks + 1;

        console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: ${completedPicks}/${totalPicks} picks complete, currentPickStartedAt=${league.currentPickStartedAt?.toISOString()}`);

        // Skip if draft is complete
        if (completedPicks >= totalPicks) {
          console.log(`[CRON-DRAFT-TIMEOUT] Skipping league ${league.id}: draft already complete (${completedPicks}/${totalPicks})`);
          continue;
        }

        // Determine who should be picking
        const currentRound = Math.ceil(nextPickNumber / memberCount);
        const pickerIndexInRound = (nextPickNumber - 1) % memberCount;
        const currentPickerId = league.memberships[pickerIndexInRound].userId;
        const pickerName = league.memberships[pickerIndexInRound].user?.name || "Unknown";

        console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: picker=${pickerName} (${currentPickerId}), round=${currentRound}, pick=${nextPickNumber}`);

        // Get first available player (ranked by home runs)
        let selectedPlayer: any = null;

        try {
          // Get already drafted player IDs
          const draftedPlayerIds = league.draftPicks.map((p) => p.playerId);
          console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: fetching available players (${draftedPlayerIds.length} already drafted)`);

          // Get available players (cached, with MLB stats)
          const availablePlayers = await getAvailablePlayers(draftedPlayerIds);

          console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: found ${availablePlayers.length} available players`);

          if (availablePlayers.length > 0) {
            // Pick the highest-ranked available player
            selectedPlayer = availablePlayers[0];
            console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: selecting ${selectedPlayer.name} (#${selectedPlayer.id})`);
          }
        } catch (error) {
          // CRITICAL ERROR: log as error, not warn
          logger.error("CRITICAL: Failed to fetch available players for autopick", {
            leagueId: league.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          console.error(`[CRON-DRAFT-TIMEOUT] CRITICAL ERROR in league ${league.id}: Failed to fetch available players:`, error);
          continue; // Skip this league but continue with others
        }

        if (!selectedPlayer) {
          logger.error("CRITICAL: No available players for autopick (all eligible players drafted?)", { leagueId: league.id });
          console.error(`[CRON-DRAFT-TIMEOUT] CRITICAL: League ${league.id}: no available players found`);
          continue; // Skip this league but continue with others
        }

        // Create the draft pick
        console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: creating DraftPick for ${selectedPlayer.name}`);
        const draftPick = await prisma.draftPick.create({
          data: {
            leagueId: league.id,
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
        console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: DraftPick created successfully (ID: ${draftPick.id})`);

        // Create roster spot
        console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: creating RosterSpot for ${selectedPlayer.name}`);
        await prisma.rosterSpot.create({
          data: {
            leagueId: league.id,
            userId: currentPickerId,
            playerId: selectedPlayer.id,
            playerName: selectedPlayer.name,
            position: selectedPlayer.position,
            mlbId: selectedPlayer.mlbId,
            draftedRound: currentRound,
            draftedPickNumber: nextPickNumber,
          },
        });
        console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: RosterSpot created successfully`);

        // Check if draft is now complete
        const isComplete = nextPickNumber >= totalPicks;
        const now = new Date();

        if (isComplete) {
          console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: draft complete after pick ${nextPickNumber}`);
          await prisma.league.update({
            where: { id: league.id },
            data: {
              draftCompletedAt: now,
              draftStatus: "complete",
            },
          });
          console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: marked as complete in database`);
        } else {
          // Reset timer for next pick
          console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: resetting timer for next pick`);
          await prisma.league.update({
            where: { id: league.id },
            data: { currentPickStartedAt: now },
          });
          console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: timer reset, currentPickStartedAt=${now.toISOString()}`);
        }

        // Broadcast pick via Pusher
        const channel = `draft-${league.id}`;
        console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: broadcasting pick-made via Pusher to ${channel}`);
        try {
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
          console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: Pusher broadcast successful`);
        } catch (pusherError) {
          logger.error("CRITICAL: Failed to broadcast pick-made via Pusher", {
            leagueId: league.id,
            error: pusherError instanceof Error ? pusherError.message : String(pusherError)
          });
          console.error(`[CRON-DRAFT-TIMEOUT] CRITICAL: League ${league.id}: Pusher broadcast failed:`, pusherError);
        }

        if (isComplete) {
          console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: broadcasting draft:completed via Pusher`);
          try {
            await pusherServer.trigger(channel, "draft:completed", {
              leagueId: league.id,
              completedAt: now,
              timestamp: Date.now(),
            });
            console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: draft:completed broadcast successful`);
          } catch (pusherError) {
            logger.error("CRITICAL: Failed to broadcast draft:completed via Pusher", {
              leagueId: league.id,
              error: pusherError instanceof Error ? pusherError.message : String(pusherError)
            });
            console.error(`[CRON-DRAFT-TIMEOUT] CRITICAL: League ${league.id}: draft:completed broadcast failed:`, pusherError);
          }
        }

        autoPicksProcessed++;

        logger.info("Auto-pick processed by cron", {
          leagueId: league.id,
          pickNumber: nextPickNumber,
          playerName: selectedPlayer.name,
          pickerName,
          isDraftComplete: isComplete,
        });
        console.log(`[CRON-DRAFT-TIMEOUT] League ${league.id}: AUTOPICK SUCCESSFUL ✓`);

      } catch (error) {
        logger.error("Error processing auto-pick for league", {
          leagueId: league.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        console.error(`[CRON-DRAFT-TIMEOUT] ERROR processing league ${league.id}:`, error);
        continue;
      }
    }

    const cronEndTime = Date.now();
    const cronDuration = cronEndTime - cronStartTime;
    const response = {
      processed: autoPicksProcessed,
      leagues: activeLeagues.length,
      message: `Processed ${autoPicksProcessed} auto-picks out of ${activeLeagues.length} leagues`,
      durationMs: cronDuration,
      timestamp: new Date(cronEndTime).toISOString(),
    };

    console.log(`[CRON-DRAFT-TIMEOUT] COMPLETE: ${response.message} in ${cronDuration}ms`);
    logger.info("Cron job completed", response);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error("CRITICAL: Cron job failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.error("[CRON-DRAFT-TIMEOUT] CRITICAL FAILURE:", error);
    return NextResponse.json(
      {
        error: "Cron job failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET and POST handlers for Vercel cron
 * Vercel sends GET requests by default
 */
export async function GET() {
  return handleDraftTimeout();
}

export async function POST() {
  return handleDraftTimeout();
}
