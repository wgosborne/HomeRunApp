import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch top 500 MLB players by homeruns (limits payload and improves performance)
    const dbPlayers = await prisma.player.findMany({
      orderBy: { homeruns: "desc" },
      take: 500,
      select: {
        id: true,
        mlbId: true,
        fullName: true,
        position: true,
        teamName: true,
        jerseyNumber: true,
        homeruns: true,
        gamesPlayed: true,
        homerunsLast14Days: true,
        gamesPlayedLast14Days: true,
      },
    });

    // Use fetched players directly (select query already returns needed fields)
    const players = dbPlayers;

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
