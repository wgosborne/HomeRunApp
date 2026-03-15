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
  homeRuns2025?: number;
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

// Jersey number cache (player ID -> jersey number)
const jerseyNumberCache: Record<number, number | null> = {};

export async function getAvailablePlayers(
  excludePlayerIds: string[]
): Promise<MLBPlayer[]> {
  try {
    // Import prisma dynamically to avoid circular dependency issues
    const { prisma } = await import("@/lib/prisma");

    // Convert excludePlayerIds (strings) to numbers for comparison with mlbId
    const excludedMlbIds = new Set(
      excludePlayerIds.map((id) => {
        const num = parseInt(id, 10);
        return isNaN(num) ? undefined : num;
      }).filter((id) => id !== undefined) as number[]
    );

    // Query all players from database, ordered by 2025 homeruns (desc) then fullName (asc)
    const players = await prisma.player.findMany({
      orderBy: [
        { homeruns2025: "desc" },
        { fullName: "asc" },
      ],
    });

    // Filter out drafted players and map to MLBPlayer shape
    const available: MLBPlayer[] = players
      .filter((player) => !excludedMlbIds.has(player.mlbId))
      .map((player, index) => ({
        id: player.mlbId.toString(),
        mlbId: player.mlbId,
        name: player.fullName,
        position: player.position || "OF",
        team: player.teamName || "Unknown",
        homeRuns: player.homeruns,
        homeRuns2025: player.homeruns2025,
        rank: index + 1,
      }));

    logger.info("Retrieved available players from database", {
      total: players.length,
      available: available.length,
      excluded: excludedMlbIds.size,
    });

    return available;
  } catch (error) {
    logger.error("Failed to get available players from database", { error });
    return [];
  }
}

export async function getNextBestPlayer(
  excludePlayerIds: string[]
): Promise<MLBPlayer | null> {
  const available = await getAvailablePlayers(excludePlayerIds);
  return available.length > 0 ? available[0] : null;
}

export async function getPlayerDetails(playerId: string): Promise<MLBPlayer | null> {
  try {
    // Parse playerId as MLB ID number
    const mlbId = parseInt(playerId, 10);
    if (isNaN(mlbId)) {
      return null;
    }

    // Import prisma dynamically
    const { prisma } = await import("@/lib/prisma");

    // Try to find player in database first
    const dbPlayer = await prisma.player.findUnique({
      where: { mlbId },
    });

    if (dbPlayer) {
      return {
        id: dbPlayer.mlbId.toString(),
        mlbId: dbPlayer.mlbId,
        name: dbPlayer.fullName,
        position: dbPlayer.position || "OF",
        team: dbPlayer.teamName || "Unknown",
        homeRuns: dbPlayer.homeruns,
      };
    }

    // Fallback: fetch directly from MLB people endpoint (works year-round)
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
    logger.debug("Failed to fetch player details", { playerId, error });
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
 * Uses database players data
 * Returns team abbreviations extracted from team name (e.g., "New York Yankees" -> "NYY")
 */
export async function getPlayerTeamMap(): Promise<Map<string, string>> {
  try {
    // Import prisma dynamically
    const { prisma } = await import("@/lib/prisma");

    const players = await prisma.player.findMany({
      select: {
        mlbId: true,
        teamName: true,
      },
    });

    const teamMap = new Map<string, string>();

    for (const player of players) {
      if (!player.teamName) continue;

      // Extract team abbreviation from full team name (e.g., "New York Yankees" -> "NYY")
      const teamAbbrev = player.teamName
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 3); // Limit to 3 chars for safety

      teamMap.set(player.mlbId.toString(), teamAbbrev);
    }

    return teamMap;
  } catch (error) {
    logger.error("Failed to get player team map from database", { error });
    return new Map();
  }
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
