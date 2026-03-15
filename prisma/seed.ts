import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// MLB API endpoint types
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

// All 30 MLB teams with official data
const mlbTeams = [
  { mlbId: 108, name: "Los Angeles Angels", city: "Los Angeles", abbreviation: "LAA", logo: "https://www.mlbstatic.com/team-logos/108.svg" },
  { mlbId: 109, name: "Arizona Diamondbacks", city: "Arizona", abbreviation: "ARI", logo: "https://www.mlbstatic.com/team-logos/109.svg" },
  { mlbId: 110, name: "Baltimore Orioles", city: "Baltimore", abbreviation: "BAL", logo: "https://www.mlbstatic.com/team-logos/110.svg" },
  { mlbId: 111, name: "Boston Red Sox", city: "Boston", abbreviation: "BOS", logo: "https://www.mlbstatic.com/team-logos/111.svg" },
  { mlbId: 112, name: "Chicago Cubs", city: "Chicago", abbreviation: "CHC", logo: "https://www.mlbstatic.com/team-logos/112.svg" },
  { mlbId: 113, name: "Cincinnati Reds", city: "Cincinnati", abbreviation: "CIN", logo: "https://www.mlbstatic.com/team-logos/113.svg" },
  { mlbId: 114, name: "Milwaukee Brewers", city: "Milwaukee", abbreviation: "MIL", logo: "https://www.mlbstatic.com/team-logos/114.svg" },
  { mlbId: 115, name: "Pittsburgh Pirates", city: "Pittsburgh", abbreviation: "PIT", logo: "https://www.mlbstatic.com/team-logos/115.svg" },
  { mlbId: 116, name: "Detroit Tigers", city: "Detroit", abbreviation: "DET", logo: "https://www.mlbstatic.com/team-logos/116.svg" },
  { mlbId: 117, name: "Houston Astros", city: "Houston", abbreviation: "HOU", logo: "https://www.mlbstatic.com/team-logos/117.svg" },
  { mlbId: 118, name: "Kansas City Royals", city: "Kansas City", abbreviation: "KC", logo: "https://www.mlbstatic.com/team-logos/118.svg" },
  { mlbId: 119, name: "Seattle Mariners", city: "Seattle", abbreviation: "SEA", logo: "https://www.mlbstatic.com/team-logos/119.svg" },
  { mlbId: 120, name: "New York Yankees", city: "New York", abbreviation: "NYY", logo: "https://www.mlbstatic.com/team-logos/120.svg" },
  { mlbId: 121, name: "New York Mets", city: "New York", abbreviation: "NYM", logo: "https://www.mlbstatic.com/team-logos/121.svg" },
  { mlbId: 133, name: "Oakland Athletics", city: "Oakland", abbreviation: "OAK", logo: "https://www.mlbstatic.com/team-logos/133.svg" },
  { mlbId: 135, name: "San Diego Padres", city: "San Diego", abbreviation: "SD", logo: "https://www.mlbstatic.com/team-logos/135.svg" },
  { mlbId: 137, name: "San Francisco Giants", city: "San Francisco", abbreviation: "SF", logo: "https://www.mlbstatic.com/team-logos/137.svg" },
  { mlbId: 138, name: "St. Louis Cardinals", city: "St. Louis", abbreviation: "STL", logo: "https://www.mlbstatic.com/team-logos/138.svg" },
  { mlbId: 139, name: "Tampa Bay Rays", city: "Tampa Bay", abbreviation: "TB", logo: "https://www.mlbstatic.com/team-logos/139.svg" },
  { mlbId: 140, name: "Texas Rangers", city: "Texas", abbreviation: "TEX", logo: "https://www.mlbstatic.com/team-logos/140.svg" },
  { mlbId: 141, name: "Toronto Blue Jays", city: "Toronto", abbreviation: "TOR", logo: "https://www.mlbstatic.com/team-logos/141.svg" },
  { mlbId: 142, name: "Minnesota Twins", city: "Minnesota", abbreviation: "MIN", logo: "https://www.mlbstatic.com/team-logos/142.svg" },
  { mlbId: 143, name: "Philadelphia Phillies", city: "Philadelphia", abbreviation: "PHI", logo: "https://www.mlbstatic.com/team-logos/143.svg" },
  { mlbId: 144, name: "Atlanta Braves", city: "Atlanta", abbreviation: "ATL", logo: "https://www.mlbstatic.com/team-logos/144.svg" },
  { mlbId: 145, name: "Chicago White Sox", city: "Chicago", abbreviation: "CWS", logo: "https://www.mlbstatic.com/team-logos/145.svg" },
  { mlbId: 146, name: "Miami Marlins", city: "Miami", abbreviation: "MIA", logo: "https://www.mlbstatic.com/team-logos/146.svg" },
  { mlbId: 159, name: "Cleveland Guardians", city: "Cleveland", abbreviation: "CLE", logo: "https://www.mlbstatic.com/team-logos/159.svg" },
];

async function main() {
  // Seed teams (one-time, safe to run multiple times with upsert)
  console.log("Seeding MLB teams...");
  for (const team of mlbTeams) {
    await prisma.team.upsert({
      where: { mlbId: team.mlbId },
      update: { name: team.name, city: team.city, abbreviation: team.abbreviation, logo: team.logo },
      create: team,
    });
  }
  console.log("MLB teams seeded successfully");

  // Create all-mlb league for backfill operations
  console.log("Creating all-mlb league...");
  await prisma.league.upsert({
    where: { id: "all-mlb" },
    update: {},
    create: {
      id: "all-mlb",
      name: "All MLB Homeruns",
      commissionerId: "", // No commissioner for system league
      draftStatus: "complete",
    },
  });
  console.log("all-mlb league created successfully");

  // Clean up existing data (for development only)
  console.log("Cleaning up existing user/league data...");
  await prisma.draftPick.deleteMany();
  await prisma.leagueMembership.deleteMany();
  await prisma.leagueSettings.deleteMany();
  await prisma.league.deleteMany({
    where: { id: { not: "all-mlb" } }, // Preserve all-mlb league
  });
  await prisma.user.deleteMany();

  // Recreate all-mlb league if it was deleted
  console.log("Ensuring all-mlb league exists...");
  await prisma.league.upsert({
    where: { id: "all-mlb" },
    update: {},
    create: {
      id: "all-mlb",
      name: "All MLB Homeruns",
      commissionerId: "", // No commissioner for system league
      draftStatus: "complete",
    },
  });
  console.log("all-mlb league ready");

  console.log("Seeding all MLB players...");

  // Fetch all MLB players from API
  const apiPlayers = await fetchAllMLBPlayers();

  // Fallback to sample data if API unavailable
  const fallbackPlayers: MLBPlayerDetail[] = [
    { mlbId: 592450, name: "Aaron Judge", position: "OF", team: "New York Yankees" },
    { mlbId: 621006, name: "Juan Soto", position: "OF", team: "New York Mets" },
    { mlbId: 605141, name: "Mookie Betts", position: "OF", team: "Los Angeles Dodgers" },
  ];

  const playersToSeed = apiPlayers.length > 0 ? apiPlayers : fallbackPlayers;

  console.log(`Seeding ${playersToSeed.length} players into database...`);

  // Clear existing players to ensure clean slate
  await prisma.player.deleteMany();
  console.log("Cleared existing players");

  // Create all players in batches to avoid overwhelming the database
  const batchSize = 100;
  let createdCount = 0;

  for (let i = 0; i < playersToSeed.length; i += batchSize) {
    const batch = playersToSeed.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((player) =>
        prisma.player.create({
          data: {
            mlbId: player.mlbId,
            fullName: player.name,
            position: player.position,
            teamName: player.team,
            homeruns: Math.floor(Math.random() * 40) + 5,
            gamesPlayed: Math.floor(Math.random() * 162) + 1,
            homerunsLast14Days: Math.floor(Math.random() * 5),
            gamesPlayedLast14Days: Math.floor(Math.random() * 14) + 1,
            battingAverage: Math.random() * 0.15 + 0.25,
          },
        })
      )
    );
    createdCount += batchResults.length;
    console.log(`  Created ${createdCount}/${playersToSeed.length} players`);
  }

  console.log(`✓ Seeded ${createdCount} players`);

  console.log("Creating seed data...");

  // Fetch some players from database for draft/roster seeding
  const dbPlayers = await prisma.player.findMany({ take: 20 });

  // Create test users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "commissioner@example.com",
        name: "Commissioner",
        image: "https://i.pravatar.cc/150?img=1",
      },
    }),
    prisma.user.create({
      data: {
        email: "player1@example.com",
        name: "Player One",
        image: "https://i.pravatar.cc/150?img=2",
      },
    }),
    prisma.user.create({
      data: {
        email: "player2@example.com",
        name: "Player Two",
        image: "https://i.pravatar.cc/150?img=3",
      },
    }),
    prisma.user.create({
      data: {
        email: "player3@example.com",
        name: "Player Three",
        image: "https://i.pravatar.cc/150?img=4",
      },
    }),
    prisma.user.create({
      data: {
        email: "player4@example.com",
        name: "Player Four",
        image: "https://i.pravatar.cc/150?img=5",
      },
    }),
    prisma.user.create({
      data: {
        email: "player5@example.com",
        name: "Player Five",
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
    dbPlayers.slice(0, 12).map((player, idx) =>
      prisma.draftPick.create({
        data: {
          leagueId: league1.id,
          userId: users[idx % users.length].id,
          playerId: player.id,
          playerName: player.fullName,
          position: player.position,
          round: Math.floor(idx / users.length) + 1,
          pickNumber: idx + 1,
          isPick: true,
          mlbId: player.mlbId,
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
        dbPlayers.slice(0, 5).map((player) =>
          prisma.rosterSpot.create({
            data: {
              leagueId: league1.id,
              userId: user.id,
              playerId: player.id,
              playerName: player.fullName,
              position: player.position,
              mlbId: player.mlbId,
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
