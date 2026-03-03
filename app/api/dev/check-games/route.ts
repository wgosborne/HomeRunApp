import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const games = await prisma.game.findMany({
    where: {
      gameDate: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  return NextResponse.json({
    count: games.length,
    games: games.map((g) => ({
      id: g.id,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      gameType: g.gameType,
      status: g.status,
    })),
  });
}
