import { PrismaClient } from "@prisma/client";
import { fetch2026SeasonStats } from "../lib/mlb-player-sync";

const prisma = new PrismaClient();

interface MLBTeamsResponse {
  teams: Array<{
    id: number;
    name: string;
    abbreviation: string;
  }>;
}

interface MLBRosterResponse {
  roster: Array<{
    person: {
      id: number;
      fullName: string;
    };
    position: {
      abbreviation: string;
    };
  }>;
}

interface MLBPlayerDetail {
  mlbId: number;
  name: string;
  position: string;
  team: string;
}

async function fetchAllMLBPlayers(): Promise<MLBPlayerDetail[]> {
  try {
    console.log("Fetching all MLB teams...");
    const teamsResponse = await fetch(
      "https://statsapi.mlb.com/api/v1/teams?sportId=1",
      {
        headers: { "User-Agent": "FantasyBaseball/1.0" },
      }
    );

    if (!teamsResponse.ok) {
      throw new Error(`Failed to fetch teams: ${teamsResponse.status}`);
    }

    const teamsData = (await teamsResponse.json()) as MLBTeamsResponse;
    const teams = teamsData.teams;
    console.log(`Found ${teams.length} MLB teams`);

    const allPlayers: MLBPlayerDetail[] = [];

    // Fetch roster for each team
    for (const team of teams) {
      try {
        console.log(`  Fetching roster for ${team.name}...`);
        const rosterResponse = await fetch(
          `https://statsapi.mlb.com/api/v1/teams/${team.id}/roster?rosterType=active`,
          {
            headers: { "User-Agent": "FantasyBaseball/1.0" },
          }
        );

        if (rosterResponse.ok) {
          const rosterData = (await rosterResponse.json()) as MLBRosterResponse;
          const teamPlayers = rosterData.roster.map((player) => ({
            mlbId: player.person.id,
            name: player.person.fullName,
            position: player.position.abbreviation || "OF",
            team: team.name,
          }));

          allPlayers.push(...teamPlayers);
          console.log(`    Added ${teamPlayers.length} players`);
        }
      } catch (error) {
        console.warn(`  Failed to fetch roster for ${team.name}`);
      }
    }

    console.log(`Total players fetched: ${allPlayers.length}`);
    return allPlayers;
  } catch (error) {
    console.error("Failed to fetch from MLB API, using fallback data");
    return [];
  }
}

async function main() {
  console.log("Seeding all MLB players...");

  // Fetch all MLB players from API
  const apiPlayers = await fetchAllMLBPlayers();

  // Fallback to empty array if API unavailable (don't seed if no data available)
  if (apiPlayers.length === 0) {
    console.warn("⚠️ No players fetched from MLB API. Skipping player seed.");
    return;
  }

  console.log(`Seeding ${apiPlayers.length} players into database...`);

  // Fetch 2026 season stats
  const seasonStats = await fetch2026SeasonStats();
  const statsMap = new Map(seasonStats.map((s) => [s.mlbId, s]));

  // Upsert players (safe to run multiple times)
  const batchSize = 100;
  let upsertCount = 0;

  for (let i = 0; i < apiPlayers.length; i += batchSize) {
    const batch = apiPlayers.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((player) => {
        const stat = statsMap.get(player.mlbId);
        return prisma.player.upsert({
          where: { mlbId: player.mlbId },
          update: {
            fullName: player.name,
            position: player.position,
            teamName: player.team,
            homeruns: stat?.homeruns || 0,
            gamesPlayed: stat?.gamesPlayed || 0,
            battingAverage: stat?.battingAverage || 0,
            ops: stat?.ops || 0,
          },
          create: {
            mlbId: player.mlbId,
            fullName: player.name,
            position: player.position,
            teamName: player.team,
            homeruns: stat?.homeruns || 0,
            gamesPlayed: stat?.gamesPlayed || 0,
            homerunsLast14Days: 0,
            gamesPlayedLast14Days: 0,
            battingAverage: stat?.battingAverage || 0,
            ops: stat?.ops || 0,
          },
        });
      })
    );
    upsertCount += batchResults.length;
    console.log(`  Upserted ${upsertCount}/${apiPlayers.length} players`);
  }

  console.log(`✅ Upserted ${upsertCount} players with 2026 season stats`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error seeding players:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
