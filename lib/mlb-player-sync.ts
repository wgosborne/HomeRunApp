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

interface MLBPlayerStat {
  player: {
    id: number;
  };
  stat: {
    homeRuns: number;
    gamesPlayed: number;
    avg: string;
    ops: string;
  };
}

interface MLBStatsResponse {
  stats: Array<{
    splits: MLBPlayerStat[];
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

/**
 * Update seasonal and 14-day homerun stats for all players
 * When NEXT_PUBLIC_ENABLE_SPRING_TRAINING is true, calculates stats from HomerrunEvent records
 * Otherwise fetches official MLB season stats
 */
export async function updatePlayerStats(): Promise<{ updated: number }> {
  try {
    const enableSpringTraining = process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING === "true";

    if (enableSpringTraining) {
      logger.info("Spring training enabled - calculating stats from HomerrunEvent records");
      return updateStatsFromHomerrunEvents();
    }

    // Fetch official season stats from MLB API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const seasonResponse = await fetch(
      "https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&season=2026&sportId=1&limit=2000",
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!seasonResponse.ok) {
      logger.error("Failed to fetch season stats", { status: seasonResponse.status });
      return { updated: 0 };
    }

    const seasonData = (await seasonResponse.json()) as MLBStatsResponse;
    const seasonStats = new Map<number, { homeruns: number; gamesPlayed: number; avg: number; ops: number }>();

    if (seasonData.stats?.[0]?.splits) {
      for (const split of seasonData.stats[0].splits) {
        const mlbId = split.player.id;
        const avg = parseFloat(split.stat.avg) || 0;
        const ops = parseFloat(split.stat.ops) || 0;

        seasonStats.set(mlbId, {
          homeruns: split.stat.homeRuns || 0,
          gamesPlayed: split.stat.gamesPlayed || 0,
          avg,
          ops,
        });
      }
    }

    // Fetch 14-day stats
    const today = new Date();
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    const startDate = formatDate(fourteenDaysAgo);
    const endDate = formatDate(today);

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 30000);

    const recentResponse = await fetch(
      `https://statsapi.mlb.com/api/v1/stats?stats=byDateRange&group=hitting&season=2026&sportId=1&startDate=${startDate}&endDate=${endDate}&limit=2000`,
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller2.signal,
      }
    );

    clearTimeout(timeout2);

    const recentStats = new Map<number, { homeruns: number; gamesPlayed: number }>();

    if (recentResponse.ok) {
      const recentData = (await recentResponse.json()) as MLBStatsResponse;
      if (recentData.stats?.[0]?.splits) {
        for (const split of recentData.stats[0].splits) {
          const mlbId = split.player.id;
          recentStats.set(mlbId, {
            homeruns: split.stat.homeRuns || 0,
            gamesPlayed: split.stat.gamesPlayed || 0,
          });
        }
      }
    } else {
      logger.warn("Failed to fetch 14-day stats", { status: recentResponse.status });
    }

    // Update all players in the database
    const allPlayers = await prisma.player.findMany();
    let updated = 0;

    await prisma.$transaction(
      allPlayers.map((player) => {
        const season = seasonStats.get(player.mlbId);
        const recent = recentStats.get(player.mlbId);

        return prisma.player.update({
          where: { id: player.id },
          data: {
            homeruns: season?.homeruns ?? 0,
            gamesPlayed: season?.gamesPlayed ?? 0,
            battingAverage: season?.avg ?? 0,
            ops: season?.ops ?? 0,
            homerunsLast14Days: recent?.homeruns ?? 0,
            gamesPlayedLast14Days: recent?.gamesPlayed ?? 0,
            lastStatsUpdatedAt: new Date(),
          },
        });
      })
    );

    updated = allPlayers.length;
    logger.info("Stats update complete", { updated });
    return { updated };
  } catch (error) {
    logger.error("Error updating player stats", { error });
    return { updated: 0 };
  }
}

/**
 * Calculate stats from HomerrunEvent records (for spring training mode)
 */
async function updateStatsFromHomerrunEvents(): Promise<{ updated: number }> {
  try {
    // Get all homerun events
    const homeruns = await prisma.homerrunEvent.findMany({
      select: { mlbId: true, gameDate: true },
    });

    // Count homeruns and dates per player
    const playerStats = new Map<number, { homeruns: number; gameDates: Set<string> }>();

    for (const hr of homeruns) {
      if (!hr.mlbId) continue;

      const gameDate = hr.gameDate.toISOString().split("T")[0];
      const existing = playerStats.get(hr.mlbId) || { homeruns: 0, gameDates: new Set<string>() };
      existing.homeruns++;
      existing.gameDates.add(gameDate);
      playerStats.set(hr.mlbId, existing);
    }

    // Get last 14 days
    const today = new Date();
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentHomeruns = await prisma.homerrunEvent.findMany({
      where: {
        gameDate: {
          gte: fourteenDaysAgo,
        },
      },
      select: { mlbId: true, gameDate: true },
    });

    const recentPlayerStats = new Map<number, { homeruns: number; gameDates: Set<string> }>();

    for (const hr of recentHomeruns) {
      if (!hr.mlbId) continue;

      const gameDate = hr.gameDate.toISOString().split("T")[0];
      const existing = recentPlayerStats.get(hr.mlbId) || { homeruns: 0, gameDates: new Set<string>() };
      existing.homeruns++;
      existing.gameDates.add(gameDate);
      recentPlayerStats.set(hr.mlbId, existing);
    }

    // Update all players
    const allPlayers = await prisma.player.findMany();
    let updated = 0;

    await prisma.$transaction(
      allPlayers.map((player) => {
        const stats = playerStats.get(player.mlbId);
        const recent = recentPlayerStats.get(player.mlbId);

        return prisma.player.update({
          where: { id: player.id },
          data: {
            homeruns: stats?.homeruns ?? 0,
            gamesPlayed: stats?.gameDates.size ?? 0,
            homerunsLast14Days: recent?.homeruns ?? 0,
            gamesPlayedLast14Days: recent?.gameDates.size ?? 0,
            lastStatsUpdatedAt: new Date(),
          },
        });
      })
    );

    updated = allPlayers.length;
    logger.info("Spring training stats update complete", { updated, totalHRs: homeruns.length });
    return { updated };
  } catch (error) {
    logger.error("Error calculating stats from homerun events", { error });
    return { updated: 0 };
  }
}
