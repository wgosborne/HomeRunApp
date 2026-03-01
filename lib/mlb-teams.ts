export interface MLBTeam {
  name: string;
  code: string;
  headColor: string; // hex color for head morphing
  eyeColor: string; // hex color for baseballs (stitching)
  logo: string; // emoji
}

export const MLB_TEAMS: MLBTeam[] = [
  { name: "Arizona Diamondbacks", code: "ARI", headColor: "#A71930", eyeColor: "#E3D4AD", logo: "🐍" },
  { name: "Atlanta Braves", code: "ATL", headColor: "#CE1141", eyeColor: "#FFFFFF", logo: "⚾" },
  { name: "Baltimore Orioles", code: "BAL", headColor: "#DF4601", eyeColor: "#000000", logo: "🦅" },
  { name: "Boston Red Sox", code: "BOS", headColor: "#BD3039", eyeColor: "#FFFFFF", logo: "⚾" },
  { name: "Chicago Cubs", code: "CHC", headColor: "#0E3386", eyeColor: "#FFFFFF", logo: "🐻" },
  { name: "Chicago White Sox", code: "CWS", headColor: "#27251A", eyeColor: "#FFFFFF", logo: "⚾" },
  { name: "Cincinnati Reds", code: "CIN", headColor: "#C6011F", eyeColor: "#FFFFFF", logo: "🔴" },
  { name: "Cleveland Guardians", code: "CLE", headColor: "#00385D", eyeColor: "#FFFFFF", logo: "⚾" },
  { name: "Colorado Rockies", code: "COL", headColor: "#33006F", eyeColor: "#FFFFFF", logo: "⛰️" },
  { name: "Detroit Tigers", code: "DET", headColor: "#0C2C56", eyeColor: "#FFFFFF", logo: "🐯" },
  { name: "Houston Astros", code: "HOU", headColor: "#EB6E1F", eyeColor: "#FFFFFF", logo: "⭐" },
  { name: "Kansas City Royals", code: "KC", headColor: "#12284B", eyeColor: "#FFFFFF", logo: "👑" },
  { name: "Los Angeles Angels", code: "LAA", headColor: "#BA0021", eyeColor: "#FFFFFF", logo: "😇" },
  { name: "Los Angeles Dodgers", code: "LAD", headColor: "#005A9C", eyeColor: "#FFFFFF", logo: "⚾" },
  { name: "Miami Marlins", code: "MIA", headColor: "#00A3E9", eyeColor: "#FFFFFF", logo: "🐠" },
  { name: "Milwaukee Brewers", code: "MIL", headColor: "#12284B", eyeColor: "#FFFFFF", logo: "🍺" },
  { name: "Minnesota Twins", code: "MIN", headColor: "#002B5C", eyeColor: "#FFFFFF", logo: "👯" },
  { name: "New York Mets", code: "NYM", headColor: "#002D72", eyeColor: "#FFFFFF", logo: "🗽" },
  { name: "New York Yankees", code: "NYY", headColor: "#0C2E3D", eyeColor: "#FFFFFF", logo: "🆎" },
  { name: "Oakland Athletics", code: "OAK", headColor: "#003831", eyeColor: "#FFFFFF", logo: "🦘" },
  { name: "Philadelphia Phillies", code: "PHI", headColor: "#A6192E", eyeColor: "#FFFFFF", logo: "🔔" },
  { name: "Pittsburgh Pirates", code: "PIT", headColor: "#27251A", eyeColor: "#FFFFFF", logo: "🏴‍☠️" },
  { name: "San Diego Padres", code: "SD", headColor: "#2F241D", eyeColor: "#FFFFFF", logo: "⚾" },
  { name: "San Francisco Giants", code: "SF", headColor: "#FD5F00", eyeColor: "#FFFFFF", logo: "👁️" },
  { name: "Seattle Mariners", code: "SEA", headColor: "#0C2E3D", eyeColor: "#FFFFFF", logo: "⛵" },
  { name: "St. Louis Cardinals", code: "STL", headColor: "#C41E3A", eyeColor: "#FFFFFF", logo: "🐦" },
  { name: "Tampa Bay Rays", code: "TB", headColor: "#092C5F", eyeColor: "#FFFFFF", logo: "🌊" },
  { name: "Texas Rangers", code: "TEX", headColor: "#003278", eyeColor: "#FFFFFF", logo: "⭐" },
  { name: "Toronto Blue Jays", code: "TOR", headColor: "#003687", eyeColor: "#FFFFFF", logo: "🦅" },
  { name: "Washington Nationals", code: "WSH", headColor: "#AB0003", eyeColor: "#FFFFFF", logo: "🏛️" },
];

export const getTeamByIndex = (index: number): MLBTeam => {
  return MLB_TEAMS[index % MLB_TEAMS.length];
};
