import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface StatsResponse {
  stats?: Array<{
    splits: Array<{
      player: { id: number; fullName: string };
      stat: { homeRuns: number };
    }>;
  }>;
}

async function sync2025Stats() {
  console.log("🚀 Starting 2025 HR stats sync...\n");

  try {
    // Fetch 2025 regular season stats from MLB API
    console.log("📥 Fetching 2025 season stats from MLB API...");
    const response = await fetch(
      "https://statsapi.mlb.com/api/v1/stats?stats=season&season=2025&gameType=R&group=hitting&sportId=1&limit=1000&playerPool=All",
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`MLB API error: ${response.statusText}`);
    }

    const data = (await response.json()) as StatsResponse;

    if (!data.stats?.[0]?.splits) {
      throw new Error("No stats data found in response");
    }

    const splits = data.stats[0].splits;
    console.log(`✓ Fetched ${splits.length} players from MLB API\n`);

    // Process each player
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ mlbId: number; error: string }> = [];

    for (const split of splits) {
      const mlbId = split.player.id;
      const homeruns2025 = split.stat.homeRuns || 0;

      try {
        // Update player record if it exists
        const result = await prisma.player.updateMany({
          where: { mlbId },
          data: { homeruns2025 },
        });

        if (result.count > 0) {
          updated++;
          if (updated % 100 === 0) {
            console.log(`  Updated ${updated} players...`);
          }
        } else {
          skipped++;
        }
      } catch (error) {
        errors.push({
          mlbId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Print summary
    console.log("\n✅ Sync complete!\n");
    console.log(`📊 Results:`);
    console.log(`   Updated: ${updated} players`);
    console.log(`   Skipped: ${skipped} players (not found in DB)`);
    console.log(`   Errors:  ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      errors.slice(0, 10).forEach(({ mlbId, error }) => {
        console.log(`   - Player ${mlbId}: ${error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

sync2025Stats();
