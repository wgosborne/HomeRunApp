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
  leagueLeaders: Array<{
    leaderCategory: string;
    leaders: Array<{
      rank: number;
      value: string;
      person: {
        id: number;
        fullName: string;
      };
      team: {
        name: string;
      };
    }>;
  }>;
}

export interface HomerrunPlay {
  playByPlayId: string; // "${gamePk}-${atBatIndex}"
  gameId: string; // gamePk as string
  gameDate: Date; // parsed from game data
  playerId: string; // matchup.batter.id as string
  playerName: string; // matchup.batter.fullName
  team: string; // matchup.batTeam.name
  homeTeam: string;
  awayTeam: string;
  inning: number; // about.inning
  rbi: number; // result.rbi
}

interface MLBScheduleResponse {
  dates: Array<{
    games: Array<{
      gamePk: number;
      status: {
        abstractGameState: "Pre-Game" | "In Progress" | "Final";
      };
    }>;
  }>;
}

interface MLBGameFeedResponse {
  gameData: {
    datetime: {
      dateTime: string;
    };
    teams: {
      home: { name: string };
      away: { name: string };
    };
  };
  liveData: {
    plays: Array<{
      about: {
        inning: number;
      };
      matchup: {
        batter: {
          id: number;
          fullName: string;
        };
        batTeam: {
          name: string;
        };
      };
      result: {
        eventType: string;
        rbi: number;
      };
    }>;
  };
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
      "https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=homeRuns&season=2025&sportId=1&limit=1000",
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
    // The API returns leagueLeaders array with leaders inside
    const leagueLeader = data.leagueLeaders?.[0];
    if (!leagueLeader?.leaders) {
      logger.warn("No leaders data in MLB response");
      return [];
    }

    const players: MLBPlayer[] = leagueLeader.leaders
      .map((leader) => {
        const homeRuns = parseInt(leader.value, 10) || 0;

        return {
          id: leader.person.id.toString(),
          name: leader.person.fullName,
          position: "OF", // Default position for home run leaders
          team: leader.team.name,
          homeRuns,
          rank: leader.rank,
        };
      });

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

/**
 * Fetch today's games from the MLB schedule API
 * Returns only games that are In Progress or Final
 */
export async function fetchTodaysGames(): Promise<
  Array<{ gamePk: number; status: string }>
> {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`MLB API error: ${response.statusText}`);
    }

    const data = (await response.json()) as MLBScheduleResponse;

    const games: Array<{ gamePk: number; status: string }> = [];
    for (const dateGroup of data.dates || []) {
      for (const game of dateGroup.games || []) {
        const status = game.status.abstractGameState;
        // Only process games that are in progress or finished
        if (status === "In Progress" || status === "Final") {
          games.push({
            gamePk: game.gamePk,
            status,
          });
        }
      }
    }

    logger.info("Fetched today's games", { count: games.length });
    return games;
  } catch (error) {
    logger.error("Failed to fetch today's games", { error });
    return [];
  }
}

/**
 * Fetch homerun plays from a single game's live feed
 * Filters for home_run events and extracts player/game data
 */
export async function fetchGameHomeruns(gamePk: number): Promise<HomerrunPlay[]> {
  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live?fields=gameData,liveData,plays,allPlays,result,about,matchup`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`MLB API error: ${response.statusText}`);
    }

    const data = (await response.json()) as MLBGameFeedResponse;

    const homeTeam = data.gameData?.teams?.home?.name || "Unknown";
    const awayTeam = data.gameData?.teams?.away?.name || "Unknown";
    const gameDate = new Date(data.gameData?.datetime?.dateTime || Date.now());

    const homeruns: HomerrunPlay[] = [];

    if (data.liveData?.plays) {
      for (const play of data.liveData.plays) {
        if (play.result?.eventType === "home_run") {
          // Use atBatIndex (which is the play's position in the game) as unique identifier
          // The API doesn't give us an explicit atBatIndex, so we'll use the play index
          const playIndex = data.liveData.plays.indexOf(play);
          const playByPlayId = `${gamePk}-${playIndex}`;

          homeruns.push({
            playByPlayId,
            gameId: gamePk.toString(),
            gameDate,
            playerId: play.matchup?.batter?.id?.toString() || "unknown",
            playerName: play.matchup?.batter?.fullName || "Unknown",
            team: play.matchup?.batTeam?.name || "Unknown",
            homeTeam,
            awayTeam,
            inning: play.about?.inning || 0,
            rbi: play.result?.rbi || 1,
          });
        }
      }
    }

    logger.debug("Fetched game homeruns", { gamePk, count: homeruns.length });
    return homeruns;
  } catch (error) {
    logger.error("Failed to fetch game homeruns", { gamePk, error });
    return [];
  }
}
