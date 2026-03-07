const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.homerrunEvent.deleteMany({});
  console.log(`Deleted ${deleted.count} homerun events`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
