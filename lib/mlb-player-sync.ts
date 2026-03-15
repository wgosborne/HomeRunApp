import { prisma } from "./prisma";
import { createLogger } from "./logger";

const logger = createLogger("mlb-player-sync");

interface MLBPlayerBio {
  id: number;
  fullName: string;
  primaryNumber?: string;
  currentTeam?: {
    id: number;
    name: string;
  };
  primaryPosition?: {
    abbreviation: string;
  };
  height?: string;
  weight?: number;
  batSide?: {
    code: string;
  };
  pitchHand?: {
    code: string;
  };
  educationBackground?: {
    college?: Array<{
      name: string;
    }>;
  };
}

interface MLBTeamsResponse {
  teams: Array<{
    id: number;
    name: string;
    teamName: string;
  }>;
}

/**
 * Sync MLB player bios from statsapi.mlb.com
 * Only sets bio fields if they haven't been synced before (bioSyncedAt is null)
 */
export async function syncPlayerBios(): Promise<{ created: number; skipped: number }> {
  try {
    // Fetch MLB teams first to map teamId -> name
    const teamsController = new AbortController();
    const teamsTimeout = setTimeout(() => teamsController.abort(), 15000);

    const teamsResponse = await fetch(
      "https://statsapi.mlb.com/api/v1/teams?sportId=1",
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: teamsController.signal,
      }
    );

    clearTimeout(teamsTimeout);

    const teamMap = new Map<number, string>();
    if (teamsResponse.ok) {
      const teamsData = (await teamsResponse.json()) as MLBTeamsResponse;
      teamsData.teams?.forEach((team) => {
        teamMap.set(team.id, team.name);
      });
    }

    // Fetch players
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      "https://statsapi.mlb.com/api/v1/sports/1/players?season=2026",
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error("Failed to fetch player bios", { status: response.status });
      return { created: 0, skipped: 0 };
    }

    const data = (await response.json()) as { people?: MLBPlayerBio[] };
    const people = data.people || [];

    if (people.length === 0) {
      logger.warn("No players returned from MLB API");
      return { created: 0, skipped: 0 };
    }

    let created = 0;
    let skipped = 0;

    // Build headshot URL from mlbId
    const buildHeadshotUrl = (mlbId: number) =>
      `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${mlbId}/headshot/67/current`;

    // Prepare batch upsert data
    const playersToCreate = people.map((person) => {
      // Try to get team name from currentTeam field, fallback to teamMap if we have teamId
      let teamName: string | null = null;
      let teamId: number | null = null;

      if (person.currentTeam?.id && person.currentTeam?.name) {
        teamName = person.currentTeam.name;
        teamId = person.currentTeam.id;
      } else if (person.currentTeam?.id) {
        teamId = person.currentTeam.id;
        teamName = teamMap.get(teamId) || null;
      }

      return {
        mlbId: person.id,
        fullName: person.fullName,
        position: person.primaryPosition?.abbreviation,
        teamName,
        teamId,
        jerseyNumber: person.primaryNumber || null,
        headshot: buildHeadshotUrl(person.id),
        height: person.height || null,
        weight: person.weight || null,
        college: person.educationBackground?.college?.[0]?.name || null,
        bats: person.batSide?.code || null,
        throws: person.pitchHand?.code || null,
        bioSyncedAt: new Date(),
      };
    });

    // Use createMany with skipDuplicates to handle existing mlbIds
    const result = await prisma.player.createMany({
      data: playersToCreate,
      skipDuplicates: true,
    });

    created = result.count;
    skipped = people.length - created;

    logger.info("Bio sync complete", { created, skipped, total: people.length });
    return { created, skipped };
  } catch (error) {
    logger.error("Error syncing player bios", { error });
    return { created: 0, skipped: 0 };
  }
}

interface MLBSeasonStatsResponse {
  stats: Array<{
    splits: Array<{
      player: {
        id: number;
        fullName: string;
      };
      team: {
        name: string;
      };
      position: {
        abbreviation: string;
      };
      stat: {
        homeRuns: number;
        gamesPlayed: number;
        avg: string;
        ops: string;
      };
    }>;
  }>;
}

interface PlayerSeasonStat {
  mlbId: number;
  fullName: string;
  teamName: string;
  position: string;
  homeruns: number;
  gamesPlayed: number;
  battingAverage: number;
  ops: number;
}

/**
 * Fetch 2026 season stats from MLB API
 * Respects NEXT_PUBLIC_ENABLE_SPRING_TRAINING flag for game type selection
 * Returns players sorted by homeruns descending
 */
export async function fetch2026SeasonStats(): Promise<PlayerSeasonStat[]> {
  try {
    const enableSpringTraining = process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING === "true";
    const gameType = enableSpringTraining ? "S" : "R";

    logger.info("Fetching 2026 season stats", { gameType });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/stats?stats=season&season=2026&gameType=${gameType}&group=hitting&sportId=1&limit=1000&playerPool=All`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error("Failed to fetch 2026 season stats", { status: response.status });
      return [];
    }

    const data = (await response.json()) as MLBSeasonStatsResponse;

    if (!data.stats?.[0]?.splits) {
      logger.info("No season stats available yet");
      return [];
    }

    const players = data.stats[0].splits.map((split) => ({
      mlbId: split.player.id,
      fullName: split.player.fullName,
      teamName: split.team.name,
      position: split.position.abbreviation || "OF",
      homeruns: split.stat.homeRuns || 0,
      gamesPlayed: split.stat.gamesPlayed || 0,
      battingAverage: parseFloat(split.stat.avg) || 0,
      ops: parseFloat(split.stat.ops) || 0,
    }));

    // Sort by homeruns descending
    players.sort((a, b) => b.homeruns - a.homeruns);

    logger.info("Fetched 2026 season stats", { count: players.length });
    return players;
  } catch (error) {
    logger.error("Error fetching 2026 season stats", { error });
    return [];
  }
}

/**
 * Update seasonal stats for all players from MLB API
 * Always fetches from the official MLB stats endpoint
 * Respects NEXT_PUBLIC_ENABLE_SPRING_TRAINING flag for game type selection
 */
export async function updatePlayerStats(): Promise<{ updated: number }> {
  try {
    // Fetch 2026 season stats (fetch2026SeasonStats handles the gameType flag)
    const seasonStats = await fetch2026SeasonStats();

    if (seasonStats.length === 0) {
      logger.info("No season stats to update");
      return { updated: 0 };
    }

    // Update existing players with new stats (don't overwrite bio data)
    let updated = 0;
    for (const playerStat of seasonStats) {
      const result = await prisma.player.updateMany({
        where: { mlbId: playerStat.mlbId },
        data: {
          homeruns: playerStat.homeruns,
          gamesPlayed: playerStat.gamesPlayed,
          battingAverage: playerStat.battingAverage,
          ops: playerStat.ops,
          teamName: playerStat.teamName,
          position: playerStat.position,
        },
      });
      updated += result.count;
    }

    logger.info("Stats update complete", { updated });
    return { updated };
  } catch (error) {
    logger.error("Error updating player stats", { error });
    return { updated: 0 };
  }
}

