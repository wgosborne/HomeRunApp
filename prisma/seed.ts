import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// MLB players with real names and positions (2024 season top performers)
const mlbPlayers = [
  { name: "Aaron Judge", position: "OF", statsApiId: "592450" },
  { name: "Juan Soto", position: "OF", statsApiId: "621006" },
  { name: "Bryce Harper", position: "OF", statsApiId: "547180" },
  { name: "Mookie Betts", position: "OF", statsApiId: "605141" },
  { name: "Kyle Schwarber", position: "OF", statsApiId: "656941" },
  { name: "Mike Trout", position: "OF", statsApiId: "545361" },
  { name: "Shohei Ohtani", position: "OF", statsApiId: "660271" },
  { name: "Brent Rooker", position: "DH", statsApiId: "592995" },
  { name: "Salvador Perez", position: "C", statsApiId: "521692" },
  { name: "Trea Turner", position: "SS", statsApiId: "607208" },
  { name: "Francisco Lindor", position: "SS", statsApiId: "596019" },
  { name: "Jose Altuve", position: "2B", statsApiId: "514888" },
  { name: "Rafael Devers", position: "3B", statsApiId: "646240" },
  { name: "Anthony Rendon", position: "3B", statsApiId: "543685" },
  { name: "Corey Seager", position: "SS", statsApiId: "608369" },
  { name: "George Springer", position: "OF", statsApiId: "543807" },
  { name: "Kyle Higashioka", position: "C", statsApiId: "543466" },
  { name: "Marcus Semien", position: "2B", statsApiId: "543760" },
  { name: "Gunnar Henderson", position: "SS", statsApiId: "683002" },
  { name: "Sonny Gray", position: "P", statsApiId: "543243" },
  { name: "Clayton Kershaw", position: "P", statsApiId: "477132" },
  { name: "Max Scherzer", position: "P", statsApiId: "453286" },
  { name: "Justin Verlander", position: "P", statsApiId: "434378" },
  { name: "Jacob deGrom", position: "P", statsApiId: "594798" },
  { name: "Gerrit Cole", position: "P", statsApiId: "543037" },
  { name: "Juan Sotos", position: "OF", statsApiId: "621006" },
  { name: "Mitch Garver", position: "C", statsApiId: "641598" },
  { name: "Kyle Schwarber", position: "OF", statsApiId: "656941" },
  { name: "Austin Barnes", position: "C", statsApiId: "543374" },
  { name: "Anthony Volpe", position: "SS", statsApiId: "683011" },
  { name: "Bobby Witt Jr.", position: "SS", statsApiId: "677951" },
  { name: "Juan Carlos Rodon", position: "P", statsApiId: "607074" },
  { name: "Blake Snell", position: "P", statsApiId: "605483" },
  { name: "Zack Wheeler", position: "P", statsApiId: "554430" },
  { name: "Brandon Woodruff", position: "P", statsApiId: "605540" },
  { name: "Sandy Alcantara", position: "P", statsApiId: "645261" },
  { name: "Chris Martin", position: "P", statsApiId: "455119" },
  { name: "Kyle Hendricks", position: "P", statsApiId: "447857" },
  { name: "Julio Urias", position: "P", statsApiId: "628329" },
  { name: "Nicholas Castellanos", position: "OF", statsApiId: "592206" },
  { name: "Kyle Mulins", position: "3B", statsApiId: "623568" },
  { name: "Yandy Diaz", position: "DH", statsApiId: "650490" },
  { name: "Austin Hays", position: "OF", statsApiId: "669039" },
  { name: "Anthony Maceo", position: "P", statsApiId: "656409" },
  { name: "Matt Olson", position: "1B", statsApiId: "621566" },
  { name: "Freddie Freeman", position: "1B", statsApiId: "518692" },
  { name: "Paul Goldschmidt", position: "1B", statsApiId: "502671" },
  { name: "Brent Rooker", position: "DH", statsApiId: "592995" },
  { name: "Cody Bellinger", position: "OF", statsApiId: "641355" },
  { name: "Xander Bogaerts", position: "SS", statsApiId: "593428" },
];

async function main() {
  // Clean up existing data (for development only)
  console.log("Cleaning up existing data...");
  await prisma.draftPick.deleteMany();
  await prisma.leagueMembership.deleteMany();
  await prisma.leagueSettings.deleteMany();
  await prisma.league.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating seed data...");

  // Create test users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "commissioner@example.com",
        name: "Commissioner",
        googleId: "google-commissioner",
        image: "https://i.pravatar.cc/150?img=1",
      },
    }),
    prisma.user.create({
      data: {
        email: "player1@example.com",
        name: "Player One",
        googleId: "google-player1",
        image: "https://i.pravatar.cc/150?img=2",
      },
    }),
    prisma.user.create({
      data: {
        email: "player2@example.com",
        name: "Player Two",
        googleId: "google-player2",
        image: "https://i.pravatar.cc/150?img=3",
      },
    }),
    prisma.user.create({
      data: {
        email: "player3@example.com",
        name: "Player Three",
        googleId: "google-player3",
        image: "https://i.pravatar.cc/150?img=4",
      },
    }),
    prisma.user.create({
      data: {
        email: "player4@example.com",
        name: "Player Four",
        googleId: "google-player4",
        image: "https://i.pravatar.cc/150?img=5",
      },
    }),
    prisma.user.create({
      data: {
        email: "player5@example.com",
        name: "Player Five",
        googleId: "google-player5",
        image: "https://i.pravatar.cc/150?img=6",
      },
    }),
  ]);

  console.log(`Created ${users.length} test users`);

  // Create first league
  const league1 = await prisma.league.create({
    data: {
      name: "Spring Training League",
      commissionerId: users[0].id,
      draftDate: new Date("2026-04-01"),
      memberships: {
        create: users.map((user, idx) => ({
          userId: user.id,
          role: idx === 0 ? "commissioner" : "member",
          teamName: user.name ? `${user.name}'s Team` : "Team Name",
        })),
      },
      settings: {
        create: {
          allowVetos: true,
          autoExpireTradesHours: 48,
          notificationsEnabled: true,
        },
      },
    },
  });

  console.log(`Created league: ${league1.name}`);

  // Create second league
  const league2 = await prisma.league.create({
    data: {
      name: "Summer Sluggers",
      commissionerId: users[1].id,
      draftDate: new Date("2026-04-15"),
      memberships: {
        create: [
          { userId: users[1].id, role: "commissioner", teamName: "Commissioner Squad" },
          { userId: users[2].id, role: "member", teamName: "Team B" },
          { userId: users[3].id, role: "member", teamName: "Team C" },
        ],
      },
      settings: {
        create: {
          allowVetos: false,
          autoExpireTradesHours: 24,
          notificationsEnabled: true,
        },
      },
    },
  });

  console.log(`Created league: ${league2.name}`);

  // Create sample draft picks for league1
  const draftPicks = await Promise.all(
    mlbPlayers.slice(0, 12).map((player, idx) =>
      prisma.draftPick.create({
        data: {
          leagueId: league1.id,
          userId: users[idx % users.length].id,
          playerId: player.statsApiId,
          playerName: player.name,
          position: player.position,
          round: Math.floor(idx / users.length) + 1,
          pickNumber: idx + 1,
          isPick: true,
          pickedAt: new Date(Date.now() - 1000000 * (12 - idx)),
        },
      })
    )
  );

  console.log(`Created ${draftPicks.length} draft picks`);

  // Create roster spots for league1
  await Promise.all(
    users.map((user) =>
      Promise.all(
        mlbPlayers.slice(0, 5).map((player) =>
          prisma.rosterSpot.create({
            data: {
              leagueId: league1.id,
              userId: user.id,
              playerId: player.statsApiId,
              playerName: player.name,
              position: player.position,
              homeruns: Math.floor(Math.random() * 15),
              points: Math.floor(Math.random() * 150),
              draftedRound: 1,
              draftedPickNumber: 1,
            },
          })
        )
      )
    )
  );

  console.log(`Created roster spots for ${users.length} users`);

  console.log("\n✅ Seed data created successfully!");
  console.log("\nTest Users:");
  users.forEach((user, idx) => {
    console.log(`  ${idx + 1}. ${user.email} (${user.name})`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error seeding database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
