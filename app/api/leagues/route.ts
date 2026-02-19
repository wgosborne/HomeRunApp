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

    const leagues = user.leagueMemberships.map((m) => ({
      ...m.league,
      userRole: m.role,
      teamName: m.teamName,
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
