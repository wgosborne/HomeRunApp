import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailablePlayers } from "@/lib/mlb-stats";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dev-backfill-mlbid");

// Seed data with statsApiId (mlbId)
const seedPlayerData = [
  { name: "Aaron Judge", statsApiId: "592450" },
  { name: "Juan Soto", statsApiId: "621006" },
  { name: "Bryce Harper", statsApiId: "547180" },
  { name: "Mookie Betts", statsApiId: "605141" },
  { name: "Kyle Schwarber", statsApiId: "656941" },
  { name: "Mike Trout", statsApiId: "545361" },
  { name: "Shohei Ohtani", statsApiId: "660271" },
  { name: "Brent Rooker", statsApiId: "592995" },
  { name: "Salvador Perez", statsApiId: "521692" },
  { name: "Trea Turner", statsApiId: "607208" },
  { name: "Francisco Lindor", statsApiId: "596019" },
  { name: "Jose Altuve", statsApiId: "514888" },
  { name: "Rafael Devers", statsApiId: "646240" },
  { name: "Anthony Rendon", statsApiId: "543685" },
  { name: "Corey Seager", statsApiId: "608369" },
  { name: "George Springer", statsApiId: "543807" },
  { name: "Kyle Higashioka", statsApiId: "543466" },
  { name: "Marcus Semien", statsApiId: "543760" },
  { name: "Gunnar Henderson", statsApiId: "683002" },
  { name: "Sonny Gray", statsApiId: "543243" },
  { name: "Clayton Kershaw", statsApiId: "477132" },
  { name: "Max Scherzer", statsApiId: "453286" },
  { name: "Justin Verlander", statsApiId: "434378" },
  { name: "Jacob deGrom", statsApiId: "594798" },
  { name: "Gerrit Cole", statsApiId: "543037" },
  { name: "Juan Sotos", statsApiId: "621006" },
  { name: "Mitch Garver", statsApiId: "641598" },
  { name: "Austin Barnes", statsApiId: "543374" },
  { name: "Anthony Volpe", statsApiId: "683011" },
  { name: "Bobby Witt Jr.", statsApiId: "677951" },
  { name: "Juan Carlos Rodon", statsApiId: "607074" },
  { name: "Blake Snell", statsApiId: "605483" },
  { name: "Zack Wheeler", statsApiId: "554430" },
  { name: "Brandon Woodruff", statsApiId: "605540" },
  { name: "Sandy Alcantara", statsApiId: "645261" },
  { name: "Chris Martin", statsApiId: "455119" },
  { name: "Kyle Hendricks", statsApiId: "447857" },
  { name: "Julio Urias", statsApiId: "628329" },
  { name: "Nicholas Castellanos", statsApiId: "592206" },
  { name: "Kyle Mulins", statsApiId: "623568" },
  { name: "Yandy Diaz", statsApiId: "650490" },
  { name: "Austin Hays", statsApiId: "669039" },
  { name: "Anthony Maceo", statsApiId: "656409" },
  { name: "Matt Olson", statsApiId: "621566" },
  { name: "Freddie Freeman", statsApiId: "518692" },
  { name: "Paul Goldschmidt", statsApiId: "502671" },
  { name: "Cody Bellinger", statsApiId: "641355" },
  { name: "Xander Bogaerts", statsApiId: "593428" },
];

/**
 * Development endpoint to backfill missing mlbId values in existing roster spots
 * This allows existing players to display headshots
 *
 * Only works in development mode
 */
export async function POST(_request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    // Create map from seed data
    const seedMap = new Map<string, number>();
    for (const player of seedPlayerData) {
      seedMap.set(player.name.toLowerCase(), parseInt(player.statsApiId, 10));
    }

    // Get all MLB players from the stats API as backup
    const allPlayers = await getAvailablePlayers([]);
    const playerMapFull = new Map<string, number>();

    for (const player of allPlayers) {
      playerMapFull.set(player.name.toLowerCase(), player.mlbId);
    }

    logger.info("Loaded player maps", { seedCount: seedMap.size, mlbCount: playerMapFull.size });

    // Find all roster spots with null mlbId
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: { mlbId: null },
    });

    logger.info("Found roster spots needing backfill", { count: rosterSpots.length });

    let updated = 0;
    let notFound = 0;

    // Backfill mlbId: try seed data first, then MLB API
    for (const spot of rosterSpots) {
      const nameLower = spot.playerName.toLowerCase();
      let mlbId = seedMap.get(nameLower) || playerMapFull.get(nameLower);

      if (mlbId) {
        await prisma.rosterSpot.update({
          where: { id: spot.id },
          data: { mlbId },
        });
        updated++;
        logger.debug("Updated player with mlbId", { playerName: spot.playerName, mlbId });
      } else {
        notFound++;
        logger.debug("Could not find mlbId for player", { playerName: spot.playerName });
      }
    }

    logger.info("Backfill complete", {
      rosterSpotsUpdated: updated,
      rosterSpotsNotFound: notFound,
    });

    return NextResponse.json({
      success: true,
      rosterSpotsUpdated: updated,
      rosterSpotsNotFound: notFound,
      message: "MLB ID backfill completed. Player headshots should now appear everywhere.",
    });
  } catch (error) {
    logger.error("Backfill failed", { error });
    return NextResponse.json(
      { error: "Backfill failed", details: String(error) },
      { status: 500 }
    );
  }
}
