import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, NotFoundError, AuthorizationError, ValidationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { pusherServer } from "@/lib/pusher-server";

const logger = createLogger("leagues.[leagueId]");

// GET /api/leagues/[leagueId] - Get single league details
export async function GET(
  _request: NextRequest,
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

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        settings: true,
        winner: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!league) {
      throw new NotFoundError("League not found");
    }

    logger.info("Retrieved league", { leagueId: leagueId, userId: user.id });

    return NextResponse.json(league);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to retrieve league");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

// PUT /api/leagues/[leagueId] - Update league (commissioner only)
export async function PUT(
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
      throw new AuthorizationError("User not found");
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundError("League not found");
    }

    // Check if user is commissioner
    if (league.commissionerId !== user.id) {
      throw new AuthorizationError("Only the commissioner can edit league settings");
    }

    const body = await request.json();
    const { name } = body;

    // Validate name
    if (!name || typeof name !== "string") {
      throw new ValidationError("League name is required");
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new ValidationError("League name cannot be empty");
    }

    if (trimmedName.length > 100) {
      throw new ValidationError("League name must be 100 characters or less");
    }

    // Update league
    const updatedLeague = await prisma.league.update({
      where: { id: leagueId },
      data: { name: trimmedName },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        settings: true,
      },
    });

    logger.info("Updated league name", { leagueId, userId: user.id, newName: trimmedName });

    return NextResponse.json(updatedLeague);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to update league");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

// PATCH /api/leagues/[leagueId] - Update user's team name
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
      throw new AuthorizationError("User not found");
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundError("League not found");
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
      throw new AuthorizationError("You are not a member of this league");
    }

    const body = await request.json();
    const { teamName } = body;

    // Validate teamName
    if (!teamName || typeof teamName !== "string") {
      throw new ValidationError("Team name is required");
    }

    const trimmedTeamName = teamName.trim();
    if (trimmedTeamName.length === 0) {
      throw new ValidationError("Team name cannot be empty");
    }

    if (trimmedTeamName.length > 100) {
      throw new ValidationError("Team name must be 100 characters or less");
    }

    // Update team name in membership
    const updatedMembership = await prisma.leagueMembership.update({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId: leagueId,
        },
      },
      data: { teamName: trimmedTeamName },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info("Updated team name", {
      leagueId,
      userId: user.id,
      newTeamName: trimmedTeamName,
    });

    return NextResponse.json(updatedMembership);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to update team name");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

// DELETE /api/leagues/[leagueId] - Delete league (commissioner only)
export async function DELETE(
  _request: NextRequest,
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
      throw new AuthorizationError("User not found");
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundError("League not found");
    }

    // Check if user is commissioner
    if (league.commissionerId !== user.id) {
      throw new AuthorizationError("Only the commissioner can delete a league");
    }

    // DEV MODE: Allow deletion anytime
    // PROD MODE: Only allow if draft status is "pending" (hasn't started)
    // NOTE: This check is commented out for dev/testing purposes only. In production, uncomment to restrict deletion to pending drafts.
    // if (process.env.NODE_ENV === "production" && league.draftStatus !== "pending") {
    //   throw new ValidationError("Can only delete leagues with pending draft status");
    // }

    // Delete league (cascading deletes handle related data)
    await prisma.league.delete({
      where: { id: leagueId },
    });

    // Broadcast Pusher event to notify members
    await pusherServer.trigger(`league-${leagueId}`, "league:deleted", {
      leagueId,
      leagueName: league.name,
      deletedBy: user.name || user.email,
      deletedAt: new Date().toISOString(),
    });

    logger.info("Deleted league", {
      leagueId,
      leagueName: league.name,
      userId: user.id,
      draftStatus: league.draftStatus,
    });

    return NextResponse.json({
      message: "League deleted successfully",
      leagueId,
    });
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to delete league");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
