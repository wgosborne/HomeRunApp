const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Create the all-mlb league if it doesn't exist
  const existingLeague = await prisma.league.findUnique({
    where: { id: "all-mlb" },
  });

  if (existingLeague) {
    console.log("all-mlb league already exists");
    return;
  }

  const league = await prisma.league.create({
    data: {
      id: "all-mlb",
      name: "All MLB",
      commissionerId: "system",
      draftStatus: "complete",
      seasonEndedAt: null,
    },
  });

  console.log(`Created league: ${league.name} (${league.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
