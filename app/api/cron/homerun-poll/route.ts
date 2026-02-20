import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { createLogger } from "@/lib/logger";
import { fetchTodaysGames, fetchGameHomeruns } from "@/lib/mlb-stats";

const logger = createLogger("cron-homerun-poll");

/**
 * Cron job that runs every 5 minutes to poll MLB games for homerun events
 * and update league standings in real-time via Pusher.
 *
 * POST /api/cron/homerun-poll
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

    let processedCount = 0;
    let skippedCount = 0;

    // Fetch today's games
    const games = await fetchTodaysGames();
    logger.info("Fetched games for polling", { count: games.length });

    for (const game of games) {
      try {
        // Fetch homeruns from this game
        const homeruns = await fetchGameHomeruns(game.gamePk);

        for (const homerun of homeruns) {
          try {
            // Check if this homerun event already exists (idempotency)
            const existingEvent = await prisma.homerrunEvent.findUnique({
              where: { playByPlayId: homerun.playByPlayId },
            });

            if (existingEvent) {
              skippedCount++;
              continue;
            }

            // Find all leagues where this player appears in roster
            const rosterSpots = await prisma.rosterSpot.findMany({
              where: { playerId: homerun.playerId },
              include: {
                league: {
                  select: { id: true },
                },
              },
            });

            logger.debug("Found roster spots for player", {
              playerId: homerun.playerId,
              leagueCount: rosterSpots.length,
            });

            for (const spot of rosterSpots) {
              try {
                // Create homerun event record
                await prisma.homerrunEvent.create({
                  data: {
                    leagueId: spot.leagueId,
                    playerId: homerun.playerId,
                    playerName: homerun.playerName,
                    playByPlayId: homerun.playByPlayId,
                    gameId: homerun.gameId,
                    gameDate: homerun.gameDate,
                    inning: homerun.inning,
                    rbi: homerun.rbi,
                    team: homerun.team,
                    homeTeam: homerun.homeTeam,
                    awayTeam: homerun.awayTeam,
                  },
                });

                // Update roster spot with new homerun count and points
                const updatedSpot = await prisma.rosterSpot.update({
                  where: { id: spot.id },
                  data: {
                    homeruns: { increment: 1 },
                    points: { increment: 1 }, // 1 point per homerun
                  },
                });

                // Broadcast homerun event via Pusher
                const channel = `league-${spot.leagueId}`;
                await pusherServer.trigger(channel, "homerun", {
                  leagueId: spot.leagueId,
                  playerId: homerun.playerId,
                  playerName: homerun.playerName,
                  homeruns: updatedSpot.homeruns,
                  inning: homerun.inning,
                  team: homerun.team,
                  gameId: homerun.gameId,
                  timestamp: Date.now(),
                });

                logger.info("Processed homerun event", {
                  leagueId: spot.leagueId,
                  playerName: homerun.playerName,
                  playByPlayId: homerun.playByPlayId,
                });

                processedCount++;
              } catch (error) {
                // If it's a unique constraint violation (duplicate), skip
                if (
                  error instanceof Error &&
                  error.message.includes("Unique constraint")
                ) {
                  skippedCount++;
                  continue;
                }
                logger.error("Error processing homerun for league", {
                  leagueId: spot.leagueId,
                  playByPlayId: homerun.playByPlayId,
                  error,
                });
              }
            }
          } catch (error) {
            logger.error("Error processing homerun event", {
              playByPlayId: homerun.playByPlayId,
              error,
            });
            continue;
          }
        }
      } catch (error) {
        logger.error("Error processing game", {
          gamePk: game.gamePk,
          error,
        });
        continue;
      }
    }

    return NextResponse.json(
      {
        processed: processedCount,
        skipped: skippedCount,
        message: `Processed ${processedCount} homeruns, skipped ${skippedCount} duplicates`,
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
