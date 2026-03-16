/**
 * Seed script to sync only player statistics without re-seeding bios, users, or leagues.
 * Usage: npx ts-node --project prisma/tsconfig.json prisma/seed-stats.ts
 */

import { updatePlayerStats } from "../lib/mlb-player-sync";

async function main() {
  console.log("Syncing player statistics from MLB API...");

  const result = await updatePlayerStats();
  console.log("Stats sync complete", result);

  process.exit(0);
}

main().catch((error) => {
  console.error("Error during stats sync:", error);
  process.exit(1);
});
