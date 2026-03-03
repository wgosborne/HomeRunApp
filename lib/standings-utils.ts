import { prisma } from "./prisma";
import { createLogger } from "./logger";

const logger = createLogger("standings-utils");

/**
 * Get a user's rank in a specific league based on total homeruns
 * @param userId User ID
 * @param leagueId League ID
 * @returns 1-based rank (1st place, 2nd place, etc.)
 */
export async function getUserLeagueRank(
  userId: string,
  leagueId: string
): Promise<number> {
  try {
    // Get all roster spots in the league
    const rosterSpots = await prisma.rosterSpot.findMany({
      where: { leagueId },
      select: {
        userId: true,
        homeruns: true,
      },
    });

    // Group by userId and sum homeruns
    const userStats = new Map<string, number>();
    for (const spot of rosterSpots) {
      const current = userStats.get(spot.userId) || 0;
      userStats.set(spot.userId, current + spot.homeruns);
    }

    // Sort by homeruns descending
    const sorted = Array.from(userStats.entries()).sort((a, b) => {
      return b[1] - a[1]; // descending
    });

    // Find user's rank
    const userIndex = sorted.findIndex(([uid]) => uid === userId);
    if (userIndex === -1) {
      logger.warn("User not found in league standings", { userId, leagueId });
      return 0; // User has no roster spots
    }

    return userIndex + 1; // 1-based rank
  } catch (error) {
    logger.error("Error calculating user rank", { userId, leagueId, error });
    throw error;
  }
}
