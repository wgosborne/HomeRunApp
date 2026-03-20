import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { createLogger } from "@/lib/logger";
import { fetchGameHomeruns, getPlayerJerseyNumber } from "@/lib/mlb-stats";
import { sendPushToUser } from "@/lib/push-service";

const logger = createLogger("backfill-spring-training");

/**
 * Fetch all Spring Training games in a date range from MLB API
 */
async function fetchSpringTrainingGames(startDate: string, endDate: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${startDate}&endDate=${endDate}&gameType=S`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`MLB API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      dates?: Array<{
        games?: Array<{
          gamePk: number;
          status: {
            abstractGameState: string;
          };
        }>;
      }>;
    };

    const games: Array<{ gamePk: number; status: string }> = [];
    for (const dateGroup of data.dates || []) {
      for (const game of dateGroup.games || []) {
        // Include all finished games and in-progress games
        if (game.status.abstractGameState === "Final" || game.status.abstractGameState === "In Progress") {
          games.push({
            gamePk: game.gamePk,
            status: game.status.abstractGameState,
          });
        }
      }
    }

    logger.info("Fetched spring training games", { startDate, endDate, count: games.length });
    return games;
  } catch (error) {
    logger.error("Failed to fetch spring training games", { error });
    return [];
  }
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

/**
 * Backfill homeruns from Spring Training season
 */
async function handleBackfill(startDate: string, endDate: string) {
  try {
    let processedCount = 0;
    let skippedCount = 0;
    let gameCount = 0;

    // Fetch all spring training games in date range
    const games = await fetchSpringTrainingGames(startDate, endDate);
    gameCount = games.length;
    logger.info("Starting backfill", { gameCount, startDate, endDate });

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

            // Look up internal Player.id (cuid) from mlbId
            const playerRecord = await prisma.player.findUnique({
              where: { mlbId: homerun.mlbId },
              select: { id: true, teamName: true },
            });
            const internalPlayerId = playerRecord?.id;
            const teamDisplay = playerRecord?.teamName || homerun.team || "Unknown";

            // Fetch jersey number if we have mlbId
            let jerseyNumber: number | null = null;
            if (homerun.mlbId) {
              jerseyNumber = await getPlayerJerseyNumber(homerun.mlbId);
            }

            // Use internal cuid for roster spot lookup
            const rosterSpots = await prisma.rosterSpot.findMany({
              where: { playerId: internalPlayerId },
              include: {
                league: {
                  select: { id: true },
                },
                user: {
                  select: { id: true },
                },
              },
            });

            // If player is in leagues, create event for each league and update rosters
            if (rosterSpots.length > 0) {
              for (const spot of rosterSpots) {
              try {
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
                  timestamp: homerun.gameDate.getTime(),
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

                logger.info("Backfilled homerun event", {
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
                logger.error("Error backfilling homerun for league", {
                  leagueId: spot.leagueId,
                  playByPlayId: homerun.playByPlayId,
                  error,
                });
              }
              }
            } else {
              // Player not in any user league - store in all-mlb league
              try {
                await prisma.homerrunEvent.create({
                  data: {
                    leagueId: "all-mlb",
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

                logger.info("Backfilled all-MLB homerun event", {
                  playerName: homerun.playerName,
                  playByPlayId: homerun.playByPlayId,
                });

                processedCount++;
              } catch (error) {
                if (
                  error instanceof Error &&
                  error.message.includes("Unique constraint")
                ) {
                  skippedCount++;
                } else {
                  logger.error("Error backfilling all-MLB homerun", {
                    playByPlayId: homerun.playByPlayId,
                    error,
                  });
                }
              }
            }
          } catch (error) {
            logger.error("Error backfilling homerun event", {
              playByPlayId: homerun.playByPlayId,
              error,
            });
            continue;
          }
        }
      } catch (error) {
        logger.error("Error processing game for backfill", {
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
        games: gameCount,
        message: `Backfilled ${processedCount} homeruns from ${gameCount} Spring Training games, skipped ${skippedCount} duplicates`,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Backfill job failed", { error });
    return NextResponse.json(
      { error: "Backfill job failed" },
      { status: 500 }
    );
  }
}

/**
 * GET handler with query parameters for date range
 * Usage: /api/cron/backfill-spring-training-homeruns?startDate=2026-02-24&endDate=2026-03-07
 */
export async function GET(request: NextRequest) {
  // Guard 1: Check if spring training is enabled
  if (process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING !== "true") {
    logger.warn("Backfill endpoint called when spring training is disabled");
    return NextResponse.json(
      { error: "Endpoint disabled - spring training is not active" },
      { status: 403 }
    );
  }

  // Guard 2: Check if we've passed opening day
  const openingDay = new Date("2026-03-25");
  if (new Date() >= openingDay) {
    logger.warn("Backfill endpoint called after opening day - rejecting");
    return NextResponse.json(
      { error: "Endpoint disabled after opening day" },
      { status: 403 }
    );
  }

  // Default to start of Spring Training (late Feb) through today
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate") || "2026-02-24";
  const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];

  return handleBackfill(startDate, endDate);
}
