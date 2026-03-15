import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all MLB players from database, sorted by homeruns descending
    const dbPlayers = await prisma.player.findMany({
      orderBy: { homeruns: "desc" },
    });

    // Transform to match player response format
    const players = dbPlayers.map((player) => ({
      id: player.id,
      mlbId: player.mlbId,
      fullName: player.fullName,
      position: player.position,
      teamName: player.teamName,
      jerseyNumber: player.jerseyNumber,
      homeruns: player.homeruns,
      gamesPlayed: player.gamesPlayed,
      homerunsLast14Days: player.homerunsLast14Days,
      gamesPlayedLast14Days: player.gamesPlayedLast14Days,
    }));

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
      isEmpty: players.length === 0,
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
