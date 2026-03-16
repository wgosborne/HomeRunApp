import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { createLogger } from "@/lib/logger";
import { fetchTodaysGames, fetchGameHomeruns, getPlayerJerseyNumber } from "@/lib/mlb-stats";
import { sendPushToUser } from "@/lib/push-service";

const logger = createLogger("cron-homerun-poll");

/**
 * Shared handler for homerun polling cron job
 * Vercel sends GET requests by default
 */
async function handleHomerungPoll() {
  try {
    // Early exit: if outside 11am to 1am ET game window, skip immediately
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const easternHour = easternTime.getHours();
    if (easternHour >= 1 && easternHour < 11) {
      logger.info("Outside game window, skipping", { hour: easternHour });
      console.log(`[CRON-HOMERUN-POLL] Outside game window (hour ${easternHour}), exiting early`);
      return NextResponse.json({
        message: "outside game window",
        processed: 0,
        skipped: 0,
      }, { status: 200 });
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

            // Look up player team from database (source of truth)
            const playerRecord = await prisma.player.findUnique({
              where: { mlbId: homerun.mlbId },
              select: { teamName: true }
            });
            const teamDisplay = playerRecord?.teamName || homerun.team || "Unknown";

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
                // Fetch jersey number if we have mlbId
                let jerseyNumber: number | null = null;
                if (homerun.mlbId) {
                  jerseyNumber = await getPlayerJerseyNumber(homerun.mlbId);
                }

                // Create homerun event record
                await prisma.homerrunEvent.create({
                  data: {
                    leagueId: spot.leagueId,
                    playerId: homerun.playerId,
                    playerName: homerun.playerName,
                    mlbId: homerun.mlbId,
                    jerseyNumber: jerseyNumber,
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
                  team: teamDisplay,
                  gameId: homerun.gameId,
                  timestamp: Date.now(),
                });

                // Send push notification to user with this player
                try {
                  await sendPushToUser(spot.userId, spot.leagueId, {
                    title: `${homerun.playerName} hit a homerun!`,
                    body: `${homerun.playerName} (${teamDisplay}) hit a homerun in the ${homerun.inning}${getOrdinalSuffix(homerun.inning)} inning. You now have ${updatedSpot.homeruns} homerun${updatedSpot.homeruns === 1 ? '' : 's'}.`,
                    icon: '/icon-192x192.png',
                    badge: '/badge-72x72.png',
                    tag: 'homerun-alert',
                    leagueId: spot.leagueId,
                    playerId: homerun.playerId,
                    eventType: 'homerun',
                    data: {
                      inning: homerun.inning,
                      team: teamDisplay,
                      totalHomeruns: updatedSpot.homeruns,
                    },
                  });
                } catch (pushError) {
                  logger.error("Error sending push notification", {
                    userId: spot.userId,
                    leagueId: spot.leagueId,
                    playerName: homerun.playerName,
                    error: pushError,
                  });
                  // Continue processing even if push fails
                }

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

/**
 * GET and POST handlers for Vercel cron
 * Vercel sends GET requests by default
 */
export async function GET() {
  return handleHomerungPoll();
}

export async function POST() {
  return handleHomerungPoll();
}

/**
 * Helper to convert inning number to ordinal suffix
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
