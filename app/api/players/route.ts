import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface MLBLeaderboardResponse {
  leagueLeaders: Array<{
    leaderCategory: string;
    leaders: Array<{
      rank: number;
      value: string;
      person: {
        id: number;
        fullName: string;
      };
      team: {
        name: string;
      };
    }>;
  }>;
}

async function fetch2026HomerunLeaders() {
  try {
    const enableSpringTraining = process.env.NEXT_PUBLIC_ENABLE_SPRING_TRAINING === "true";
    const gameType = enableSpringTraining ? "S" : "R";

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=homeRuns&season=2026&leaderGameTypes=${gameType}&sportId=1&limit=500`,
      {
        headers: { "User-Agent": "FantasyBaseball/1.0" },
      }
    );

    if (!response.ok) {
      console.warn(`MLB API returned ${response.status} for homerun leaders`);
      return [];
    }

    const data = (await response.json()) as MLBLeaderboardResponse;
    const leagueLeader = data.leagueLeaders?.[0];

    if (!leagueLeader?.leaders) {
      return [];
    }

    return leagueLeader.leaders.map((leader) => ({
      mlbId: leader.person.id,
      name: leader.person.fullName,
      team: leader.team.name,
      homeruns: parseInt(leader.value, 10) || 0,
    }));
  } catch (error) {
    console.error("Error fetching 2026 homerun leaders:", error);
    return [];
  }
}

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch 2026 homerun leaders from MLB API
    const leaders = await fetch2026HomerunLeaders();

    // Get all players from database for metadata
    const dbPlayers = await prisma.player.findMany();
    const playerMap = new Map(dbPlayers.map((p) => [p.mlbId, p]));

    // Merge API data with database data
    const players = leaders.map((leader) => {
      const dbPlayer = playerMap.get(leader.mlbId);
      return {
        id: dbPlayer?.id || leader.mlbId.toString(),
        mlbId: leader.mlbId,
        fullName: leader.name,
        position: dbPlayer?.position || "OF",
        teamName: leader.team,
        jerseyNumber: dbPlayer?.jerseyNumber || null,
        homeruns: leader.homeruns,
        gamesPlayed: dbPlayer?.gamesPlayed || 0,
        homerunsLast14Days: dbPlayer?.homerunsLast14Days || 0,
        gamesPlayedLast14Days: dbPlayer?.gamesPlayedLast14Days || 0,
      };
    });

    // Fetch user's roster spots to identify their players
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userRosterSpots = await prisma.rosterSpot.findMany({
      where: { userId: user.id },
      select: { mlbId: true },
    });

    const yourMlbIds = userRosterSpots.map((spot) => spot.mlbId).filter((id) => id !== null) as number[];

    return NextResponse.json({
      players,
      yourMlbIds,
      isEmpty: leaders.length === 0,
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
