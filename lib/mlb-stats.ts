import { createLogger } from "./logger";

const logger = createLogger("mlb-stats");

/**
 * Get allowed game types for MLB API calls
 * Production (default): "R" (regular season only)
 * Testing: "R,S" (regular season + spring training)
 */
function getAllowedGameTypes(): string {
  const enableSpringTraining = process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING === 'true';

  if (enableSpringTraining) {
    logger.debug("Spring training enabled - including gameType S");
    return "R,S";
  }

  logger.debug("Spring training disabled - gameType R only");
  return "R";
}

interface MLBPlayer {
  id: string;
  mlbId: number;
  name: string;
  position: string;
  team: string;
  homeRuns?: number;
  rank?: number;
}

export interface HomerrunPlay {
  playByPlayId: string; // "${gamePk}-${atBatIndex}"
  gameId: string; // gamePk as string
  gameDate: Date; // parsed from game data
  playerId: string; // matchup.batter.id as string
  mlbId: number; // matchup.batter.id as number
  playerName: string; // matchup.batter.fullName
  jerseyNumber?: number; // Player's jersey number
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
    plays: {
      allPlays: Array<{
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

// Jersey number cache (player ID -> jersey number)
const jerseyNumberCache: Record<number, number | null> = {};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchMLBLeaders(): Promise<MLBPlayer[]> {
  const cacheKey = "mlb-leaders-2026";
  const now = Date.now();

  // Check cache
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
    logger.debug("Using cached MLB leaders");
    return cache[cacheKey].data;
  }

  try {
    const enableSpringTraining = process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING === 'true';
    const gameType = enableSpringTraining ? 'S' : 'R';

    // Set 10-second timeout for MLB API call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/stats?stats=season&season=2026&gameType=${gameType}&group=hitting&sportId=1&limit=1000`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      logger.debug(`Failed to fetch 2026 leaders`, { status: response.status, gameType });
      return [];
    }

    const data = (await response.json()) as { stats?: Array<{ splits: Array<{ player: { id: number; fullName: string }; team: { name: string }; stat: { homeRuns: number } }> }> };

    if (!data.stats?.[0]?.splits || data.stats[0].splits.length === 0) {
      logger.debug(`No leaders data for 2026 season (gameType=${gameType})`);
      return [];
    }

    const players: MLBPlayer[] = data.stats[0].splits
      .map((split, index) => ({
        id: split.player.id.toString(),
        mlbId: split.player.id,
        name: split.player.fullName,
        position: "OF", // Default position for home run leaders
        team: split.team.name,
        homeRuns: split.stat.homeRuns || 0,
        rank: index + 1,
      }))
      .sort((a, b) => b.homeRuns - a.homeRuns);

    // Cache the result
    cache[cacheKey] = {
      data: players,
      timestamp: now,
    };

    logger.info("Fetched MLB leaders", { gameType, count: players.length });
    return players;
  } catch (error) {
    logger.debug(`Failed to fetch MLB leaders`, { error });
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
  // First try cached leaders (works during season)
  const allPlayers = await fetchMLBLeaders();
  const foundPlayer = allPlayers.find((player) => player.id === playerId);
  if (foundPlayer) {
    return foundPlayer;
  }

  // Fallback: fetch directly from MLB people endpoint (works year-round)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      people?: Array<{
        id: number;
        fullName: string;
        currentTeam?: { name: string };
        primaryPosition?: { abbreviation: string };
      }>;
    };

    const person = data.people?.[0];
    if (!person) {
      return null;
    }

    return {
      id: person.id.toString(),
      mlbId: person.id,
      name: person.fullName,
      position: person.primaryPosition?.abbreviation || "OF",
      team: person.currentTeam?.name || "Unknown",
    };
  } catch (error) {
    logger.debug("Failed to fetch player from MLB people endpoint", { playerId, error });
    return null;
  }
}

/**
 * Fetch a player's jersey number from MLB API
 * Caches results to avoid repeated API calls
 */
export async function getPlayerJerseyNumber(mlbId: number): Promise<number | null> {
  // Check cache first
  if (mlbId in jerseyNumberCache) {
    return jerseyNumberCache[mlbId];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${mlbId}`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      jerseyNumberCache[mlbId] = null;
      return null;
    }

    const data = (await response.json()) as {
      people?: Array<{
        id: number;
        primaryNumber?: string;
      }>;
    };

    const person = data.people?.[0];
    const jerseyNum = person?.primaryNumber ? parseInt(person.primaryNumber, 10) : null;

    jerseyNumberCache[mlbId] = jerseyNum || null;
    return jerseyNum || null;
  } catch (error) {
    logger.debug("Failed to fetch jersey number", { mlbId, error });
    jerseyNumberCache[mlbId] = null;
    return null;
  }
}

/**
 * Get a map of player ID to team abbreviation
 * Uses cached MLB leaders data, no extra API call
 * Returns team abbreviations extracted from team name (e.g., "New York Yankees" -> "NYY")
 */
export async function getPlayerTeamMap(): Promise<Map<string, string>> {
  const allPlayers = await fetchMLBLeaders();
  const teamMap = new Map<string, string>();

  for (const player of allPlayers) {
    // Extract team abbreviation from full team name (e.g., "New York Yankees" -> "NYY")
    const teamAbbrev = player.team
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 3); // Limit to 3 chars for safety

    teamMap.set(player.id, teamAbbrev);
  }

  return teamMap;
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
    const gameTypes = getAllowedGameTypes();

    // Set 10-second timeout for MLB API call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&gameType=${gameTypes}`,
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
    // Set 10-second timeout for MLB API call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`,
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

    const data = (await response.json()) as MLBGameFeedResponse;

    const homeTeam = data.gameData?.teams?.home?.name || "Unknown";
    const awayTeam = data.gameData?.teams?.away?.name || "Unknown";
    const gameDate = new Date(data.gameData?.datetime?.dateTime || Date.now());

    const homeruns: HomerrunPlay[] = [];

    if (data.liveData?.plays?.allPlays) {
      const plays = data.liveData.plays.allPlays;
      for (const play of plays) {
        if (play.result?.eventType === "home_run") {
          // Use atBatIndex (which is the play's position in the game) as unique identifier
          // The API doesn't give us an explicit atBatIndex, so we'll use the play index
          const playIndex = plays.indexOf(play);
          const playByPlayId = `${gamePk}-${playIndex}`;

          // Get batting team - try multiple paths
          let battingTeam = play.matchup?.batTeam?.name;
          if (!battingTeam) {
            // Fallback: infer from home/away based on which team is batting
            // If inning is odd, home team bats; if even, away team bats (simplified)
            const inning = play.about?.inning || 1;
            battingTeam = inning % 2 === 1 ? awayTeam : homeTeam;
          }

          homeruns.push({
            playByPlayId,
            gameId: gamePk.toString(),
            gameDate,
            playerId: play.matchup?.batter?.id?.toString() || "unknown",
            mlbId: play.matchup?.batter?.id || 0,
            playerName: play.matchup?.batter?.fullName || "Unknown",
            team: battingTeam || "Unknown",
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

/**
 * Fetch today's game for a specific team
 * Returns game details (opponent, home/away status, game state, score)
 */
export interface TodaysGame {
  opponent: string;
  isHome: boolean;
  status: "Pre-Game" | "In Progress" | "Final";
  gameTime: string; // ISO 8601 datetime
  homeScore: number | null;
  awayScore: number | null;
  currentInning: number | null;
}

export async function fetchTodaysGameForTeam(
  teamName: string
): Promise<TodaysGame | null> {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Set 10-second timeout for MLB API call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const gameTypes = getAllowedGameTypes();
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team,linescore&gameType=${gameTypes}`,
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
          status: { abstractGameState: string };
          gameDateTime: string;
          teams: {
            home: { team: { name: string }; score?: number };
            away: { team: { name: string }; score?: number };
          };
          linescore?: {
            currentInning?: number;
            inningState?: string;
          };
        }>;
      }>;
    };

    // Find the game for this team
    const dateGroup = data.dates?.[0];
    if (!dateGroup?.games) {
      return null;
    }

    for (const game of dateGroup.games) {
      const homeTeamName = game.teams?.home?.team?.name;
      const awayTeamName = game.teams?.away?.team?.name;
      const status = game.status?.abstractGameState;

      const isHomeGame = homeTeamName === teamName;
      const isAwayGame = awayTeamName === teamName;

      if (!isHomeGame && !isAwayGame) {
        continue; // Not this team's game
      }

      const opponent = isHomeGame ? awayTeamName : homeTeamName;

      return {
        opponent: opponent || "Unknown",
        isHome: isHomeGame,
        status: status as "Pre-Game" | "In Progress" | "Final",
        gameTime: game.gameDateTime || "",
        homeScore: game.teams?.home?.score ?? null,
        awayScore: game.teams?.away?.score ?? null,
        currentInning: game.linescore?.currentInning ?? null,
      };
    }

    return null;
  } catch (error) {
    logger.debug("Failed to fetch today's game for team", { teamName, error });
    return null;
  }
}
