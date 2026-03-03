import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("team-name");

const TEAM_NAME_MIN_LENGTH = 1;
const TEAM_NAME_MAX_LENGTH = 100;

// PATCH /api/leagues/[leagueId]/team-name - Update user's team name in league
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;

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
    const { teamName } = body;

    // Validate team name length
    if (!teamName || teamName.trim().length < TEAM_NAME_MIN_LENGTH) {
      return NextResponse.json(
        { error: "Team name cannot be empty" },
        { status: 400 }
      );
    }

    const trimmedTeamName = teamName.trim();

    if (trimmedTeamName.length > TEAM_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Team name cannot exceed ${TEAM_NAME_MAX_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Check if user is a member of this league
    const membership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId: leagueId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this league" },
        { status: 403 }
      );
    }

    // Check for duplicate team names in this league (excluding self)
    const duplicateTeamName = await prisma.leagueMembership.findFirst({
      where: {
        leagueId: leagueId,
        teamName: trimmedTeamName,
        userId: {
          not: user.id, // Exclude current user
        },
      },
    });

    if (duplicateTeamName) {
      return NextResponse.json(
        { error: "This team name is already taken in this league" },
        { status: 409 }
      );
    }

    // Update the team name
    const updatedMembership = await prisma.leagueMembership.update({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId: leagueId,
        },
      },
      data: {
        teamName: trimmedTeamName,
      },
    });

    logger.info("Updated team name", {
      leagueId: leagueId,
      userId: user.id,
      teamName: trimmedTeamName,
    });

    return NextResponse.json(updatedMembership);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to update team name");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
