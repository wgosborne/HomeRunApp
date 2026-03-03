import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLeagueSchema } from "@/lib/validation";
import { handleError, ValidationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("leagues");

// GET /api/leagues - List all user's leagues
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        leagueMemberships: {
          include: {
            league: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get all memberships for each league
    const allMemberships = await prisma.leagueMembership.findMany({
      where: {
        leagueId: {
          in: user.leagueMemberships.map((m) => m.leagueId),
        },
      },
      select: {
        leagueId: true,
        userId: true,
        role: true,
      },
    });

    // Build membership count map
    const membershipsByLeague = new Map<string, typeof allMemberships>();
    for (const membership of allMemberships) {
      if (!membershipsByLeague.has(membership.leagueId)) {
        membershipsByLeague.set(membership.leagueId, []);
      }
      membershipsByLeague.get(membership.leagueId)!.push(membership);
    }

    // Get all roster stats in one query for efficiency
    const rosterStats = await prisma.rosterSpot.findMany({
      where: {
        leagueId: {
          in: user.leagueMemberships.map((m) => m.leagueId),
        },
      },
      select: {
        leagueId: true,
        userId: true,
        homeruns: true,
      },
    });

    // Build league-specific rank map
    const leagueRankMap = new Map<string, Map<string, number>>();

    for (const stat of rosterStats) {
      if (!leagueRankMap.has(stat.leagueId)) {
        leagueRankMap.set(stat.leagueId, new Map());
      }
      const leagueMap = leagueRankMap.get(stat.leagueId)!;
      const current = leagueMap.get(stat.userId) || 0;
      leagueMap.set(stat.userId, current + stat.homeruns);
    }

    // Calculate ranks for each league
    const leagueUserRanks = new Map<string, number>();
    for (const [leagueId, userHomers] of leagueRankMap.entries()) {
      const sorted = Array.from(userHomers.entries()).sort((a, b) => {
        return b[1] - a[1];
      });
      const userIndex = sorted.findIndex(([uid]) => uid === user.id);
      leagueUserRanks.set(leagueId, userIndex === -1 ? 0 : userIndex + 1);
    }

    const leagues = user.leagueMemberships.map((m) => ({
      ...m.league,
      userRole: m.role,
      teamName: m.teamName,
      userRank: leagueUserRanks.get(m.leagueId) || 0,
      memberships: membershipsByLeague.get(m.leagueId) || [],
    }));

    logger.info("Listed leagues", { userId: user.id, count: leagues.length });

    return NextResponse.json(leagues);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to list leagues");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

// POST /api/leagues - Create a new league (commissioner only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createLeagueSchema.parse(body);

    const league = await prisma.league.create({
      data: {
        name: validatedData.name,
        commissionerId: user.id,
        draftDate: validatedData.draftDate
          ? new Date(validatedData.draftDate)
          : null,
        memberships: {
          create: {
            userId: user.id,
            role: "commissioner",
            teamName: `${user.name}'s Team`,
          },
        },
        settings: {
          create: {},
        },
      },
      include: {
        memberships: true,
        settings: true,
      },
    });

    logger.info("Created league", { leagueId: league.id, userId: user.id });

    return NextResponse.json(league, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, context: error.context },
        { status: 400 }
      );
    }

    const { statusCode, message } = handleError(error, "Failed to create league");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
