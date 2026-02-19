import { createLogger } from "./logger";

const logger = createLogger("mlb-stats");

interface MLBPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  homeRuns?: number;
  rank?: number;
}

interface MLBLeaderboardResponse {
  leaders: Array<{
    person: {
      id: number;
      fullName: string;
    };
    stats: Array<{
      group: {
        displayName: string;
      };
      stats: Array<{
        stat: {
          homeRuns?: number;
        };
      }>;
    }>;
    team: {
      name: string;
    };
  }>;
}

// Simple in-memory cache with 5-minute TTL
const cache: Record<
  string,
  {
    data: MLBPlayer[];
    timestamp: number;
  }
> = {};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchMLBLeaders(): Promise<MLBPlayer[]> {
  const cacheKey = "mlb-leaders-2025";
  const now = Date.now();

  // Check cache
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
    logger.debug("Using cached MLB leaders");
    return cache[cacheKey].data;
  }

  try {
    const response = await fetch(
      "https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=homeRuns&season=2025&sportId=1",
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`MLB API error: ${response.statusText}`);
    }

    const data = (await response.json()) as MLBLeaderboardResponse;

    // Parse response and transform to our format
    const players: MLBPlayer[] = data.leaders
      .map((leader, index) => {
        const stats = leader.stats[0]?.stats[0];
        const homeRuns = stats?.stat?.homeRuns || 0;

        return {
          id: leader.person.id.toString(),
          name: leader.person.fullName,
          position: "DH", // Default position, MLB API doesn't always have position
          team: leader.team.name,
          homeRuns,
          rank: index + 1,
        };
      })
      .sort((a, b) => (b.homeRuns || 0) - (a.homeRuns || 0));

    // Cache the result
    cache[cacheKey] = {
      data: players,
      timestamp: now,
    };

    logger.info("Fetched MLB leaders", { count: players.length });
    return players;
  } catch (error) {
    logger.error("Failed to fetch MLB leaders", { error });
    // Return empty array if fetch fails
    return [];
  }
}

export async function getAvailablePlayers(
  excludePlayerIds: string[]
): Promise<MLBPlayer[]> {
  const allPlayers = await fetchMLBLeaders();

  // Filter out already-drafted players
  const available = allPlayers.filter(
    (player) => !excludePlayerIds.includes(player.id)
  );

  return available;
}

export async function getNextBestPlayer(
  excludePlayerIds: string[]
): Promise<MLBPlayer | null> {
  const available = await getAvailablePlayers(excludePlayerIds);
  return available.length > 0 ? available[0] : null;
}

export async function getPlayerDetails(playerId: string): Promise<MLBPlayer | null> {
  const allPlayers = await fetchMLBLeaders();
  return allPlayers.find((player) => player.id === playerId) || null;
}
