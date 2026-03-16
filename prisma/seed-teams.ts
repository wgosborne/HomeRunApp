import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// All 30 MLB teams with official data
const mlbTeams = [
  { mlbId: 108, name: "Los Angeles Angels", city: "Los Angeles", abbreviation: "LAA", logo: "https://www.mlbstatic.com/team-logos/108.svg" },
  { mlbId: 109, name: "Arizona Diamondbacks", city: "Arizona", abbreviation: "ARI", logo: "https://www.mlbstatic.com/team-logos/109.svg" },
  { mlbId: 110, name: "Baltimore Orioles", city: "Baltimore", abbreviation: "BAL", logo: "https://www.mlbstatic.com/team-logos/110.svg" },
  { mlbId: 111, name: "Boston Red Sox", city: "Boston", abbreviation: "BOS", logo: "https://www.mlbstatic.com/team-logos/111.svg" },
  { mlbId: 112, name: "Chicago Cubs", city: "Chicago", abbreviation: "CHC", logo: "https://www.mlbstatic.com/team-logos/112.svg" },
  { mlbId: 113, name: "Cincinnati Reds", city: "Cincinnati", abbreviation: "CIN", logo: "https://www.mlbstatic.com/team-logos/113.svg" },
  { mlbId: 114, name: "Milwaukee Brewers", city: "Milwaukee", abbreviation: "MIL", logo: "https://www.mlbstatic.com/team-logos/114.svg" },
  { mlbId: 115, name: "Colorado Rockies", city: "Colorado", abbreviation: "COL", logo: "https://www.mlbstatic.com/team-logos/115.svg" },
  { mlbId: 116, name: "Detroit Tigers", city: "Detroit", abbreviation: "DET", logo: "https://www.mlbstatic.com/team-logos/116.svg" },
  { mlbId: 117, name: "Houston Astros", city: "Houston", abbreviation: "HOU", logo: "https://www.mlbstatic.com/team-logos/117.svg" },
  { mlbId: 118, name: "Kansas City Royals", city: "Kansas City", abbreviation: "KC", logo: "https://www.mlbstatic.com/team-logos/118.svg" },
  { mlbId: 119, name: "Los Angeles Dodgers", city: "Los Angeles", abbreviation: "LAD", logo: "https://www.mlbstatic.com/team-logos/119.svg" },
  { mlbId: 120, name: "Washington Nationals", city: "Washington", abbreviation: "WSH", logo: "https://www.mlbstatic.com/team-logos/120.svg" },
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
  console.log("Seeding MLB teams...");

  let upsertCount = 0;
  for (const team of mlbTeams) {
    await prisma.team.upsert({
      where: { mlbId: team.mlbId },
      update: { name: team.name, city: team.city, abbreviation: team.abbreviation, logo: team.logo },
      create: team,
    });
    upsertCount++;
  }

  console.log(`✅ Upserted ${upsertCount} MLB teams`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error seeding teams:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
