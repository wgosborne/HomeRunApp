import { createLogger } from "./logger";

const logger = createLogger("mlb-stats");

interface MLBPlayer {
  id: string;
  mlbId: number;
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
  mlbId: number; // matchup.batter.id as number
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

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchMLBLeaders(): Promise<MLBPlayer[]> {
  const cacheKey = "mlb-leaders-2026";
  const now = Date.now();

  // Check cache
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
    logger.debug("Using cached MLB leaders");
    return cache[cacheKey].data;
  }

  // Try 2026 first, then fall back to 2025 if not available
  for (const season of [2026, 2025]) {
    try {
      // Set 10-second timeout for MLB API call
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=homeRuns&season=${season}&sportId=1&limit=500`,
        {
          headers: {
            "User-Agent": "FantasyBaseball/1.0",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        logger.debug(`Season ${season} not available`, { status: response.status });
        continue;
      }

      const data = (await response.json()) as MLBLeaderboardResponse;

      // Parse response and transform to our format
      // The API returns leagueLeaders array with leaders inside
      const leagueLeader = data.leagueLeaders?.[0];
      if (!leagueLeader?.leaders || leagueLeader.leaders.length === 0) {
        logger.debug(`No leaders data for season ${season}`);
        continue;
      }

      const players: MLBPlayer[] = leagueLeader.leaders
        .map((leader) => {
          const homeRuns = parseInt(leader.value, 10) || 0;

          return {
            id: leader.person.id.toString(),
            mlbId: leader.person.id,
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

      logger.info("Fetched MLB leaders", { season, count: players.length });
      return players;
    } catch (error) {
      logger.debug(`Failed to fetch MLB leaders for season ${season}`, { error });
      continue;
    }
  }

  // If both 2026 and 2025 failed, check cache
  if (cache[cacheKey]) {
    logger.info("Returning stale cached MLB leaders due to fetch error");
    return cache[cacheKey].data;
  }

  // Final fallback: return test data for development
  logger.info("Falling back to test data - MLB API not available");
  const testPlayers: MLBPlayer[] = [
    { id: "592450", mlbId: 592450, name: "Aaron Judge", position: "OF", team: "New York Yankees", homeRuns: 25, rank: 1 },
    { id: "621006", mlbId: 621006, name: "Juan Soto", position: "OF", team: "New York Mets", homeRuns: 24, rank: 2 },
    { id: "605141", mlbId: 605141, name: "Mookie Betts", position: "OF", team: "Los Angeles Dodgers", homeRuns: 23, rank: 3 },
    { id: "656941", mlbId: 656941, name: "Kyle Schwarber", position: "OF", team: "Philadelphia Phillies", homeRuns: 22, rank: 4 },
    { id: "545361", mlbId: 545361, name: "Mike Trout", position: "OF", team: "Los Angeles Angels", homeRuns: 21, rank: 5 },
    { id: "660271", mlbId: 660271, name: "Shohei Ohtani", position: "OF", team: "Los Angeles Dodgers", homeRuns: 20, rank: 6 },
    { id: "592995", mlbId: 592995, name: "Brent Rooker", position: "DH", team: "Minnesota Twins", homeRuns: 19, rank: 7 },
    { id: "521692", mlbId: 521692, name: "Salvador Perez", position: "C", team: "Kansas City Royals", homeRuns: 18, rank: 8 },
    { id: "607208", mlbId: 607208, name: "Trea Turner", position: "SS", team: "Philadelphia Phillies", homeRuns: 17, rank: 9 },
    { id: "596019", mlbId: 596019, name: "Francisco Lindor", position: "SS", team: "New York Mets", homeRuns: 16, rank: 10 },
    { id: "514888", mlbId: 514888, name: "Jose Altuve", position: "2B", team: "Houston Astros", homeRuns: 15, rank: 11 },
    { id: "646240", mlbId: 646240, name: "Rafael Devers", position: "3B", team: "Boston Red Sox", homeRuns: 14, rank: 12 },
    { id: "543685", mlbId: 543685, name: "Anthony Rendon", position: "3B", team: "Los Angeles Angels", homeRuns: 13, rank: 13 },
    { id: "608369", mlbId: 608369, name: "Corey Seager", position: "SS", team: "Texas Rangers", homeRuns: 12, rank: 14 },
    { id: "543807", mlbId: 543807, name: "George Springer", position: "OF", team: "Toronto Blue Jays", homeRuns: 11, rank: 15 },
    { id: "543466", mlbId: 543466, name: "Kyle Higashioka", position: "C", team: "New York Yankees", homeRuns: 10, rank: 16 },
    { id: "543760", mlbId: 543760, name: "Marcus Semien", position: "2B", team: "Texas Rangers", homeRuns: 9, rank: 17 },
    { id: "683002", mlbId: 683002, name: "Gunnar Henderson", position: "SS", team: "Baltimore Orioles", homeRuns: 8, rank: 18 },
    { id: "641598", mlbId: 641598, name: "Mitch Garver", position: "C", team: "Texas Rangers", homeRuns: 7, rank: 19 },
    { id: "621566", mlbId: 621566, name: "Matt Olson", position: "1B", team: "Atlanta Braves", homeRuns: 6, rank: 20 },
  ];

  cache[cacheKey] = {
    data: testPlayers,
    timestamp: now,
  };

  return testPlayers;
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

    // Set 10-second timeout for MLB API call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}`,
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
      `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live?fields=gameData,liveData,plays,allPlays,result,about,matchup`,
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

          homeruns.push({
            playByPlayId,
            gameId: gamePk.toString(),
            gameDate,
            playerId: play.matchup?.batter?.id?.toString() || "unknown",
            mlbId: play.matchup?.batter?.id || 0,
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

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team,linescore&gameType=R,S`,
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
