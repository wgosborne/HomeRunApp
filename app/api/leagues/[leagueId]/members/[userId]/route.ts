import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError, NotFoundError, AuthorizationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { pusherServer } from "@/lib/pusher-server";

const logger = createLogger("leagues.members.[userId]");

// DELETE /api/leagues/[leagueId]/members/[userId] - Leave league or remove member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string; userId: string }> }
) {
  const { leagueId, userId } = await params;
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      throw new AuthorizationError("User not found");
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!league) {
      throw new NotFoundError("League not found");
    }

    // Check if the user being removed exists as a member
    const memberToRemove = league.memberships.find((m) => m.userId === userId);
    if (!memberToRemove) {
      throw new NotFoundError("Member not found in this league");
    }

    // Authorization: User can only leave their own league OR commissioner can remove any member
    const isLeavingOwnLeague = currentUser.id === userId;
    const isCommissioner = league.commissionerId === currentUser.id;

    if (!isLeavingOwnLeague && !isCommissioner) {
      throw new AuthorizationError("You can only leave your own league or remove members as commissioner");
    }

    const isRemovingCommissioner = memberToRemove.role === "commissioner";

    // Delete member's related data (cascading deletes will handle most of this)
    await prisma.leagueMembership.delete({
      where: {
        userId_leagueId: {
          userId: userId,
          leagueId: leagueId,
        },
      },
    });

    // Delete member's draft picks
    await prisma.draftPick.deleteMany({
      where: {
        leagueId: leagueId,
        userId: userId,
      },
    });

    // Delete member's roster spots
    await prisma.rosterSpot.deleteMany({
      where: {
        leagueId: leagueId,
        userId: userId,
      },
    });

    // Delete member's trades (both as owner and receiver)
    await prisma.trade.deleteMany({
      where: {
        leagueId: leagueId,
        OR: [
          { ownerId: userId },
          { receiverId: userId },
        ],
      },
    });

    // Delete member's push subscriptions
    await prisma.pushSubscription.deleteMany({
      where: {
        leagueId: leagueId,
        userId: userId,
      },
    });

    logger.info("Removed member from league", {
      leagueId,
      removedUserId: userId,
      removedUserEmail: memberToRemove.user.email,
      currentUserId: currentUser.id,
      wasSelfLeaving: isLeavingOwnLeague,
      wasCommissioner: isRemovingCommissioner,
    });

    // If removing commissioner, promote another member
    let newCommissionerId: string | undefined;
    if (isRemovingCommissioner) {
      const remainingMembers = league.memberships.filter(
        (m) => m.userId !== userId
      );

      if (remainingMembers.length === 0) {
        // If no members left, delete the league
        await prisma.league.delete({
          where: { id: leagueId },
        });

        // Broadcast league deleted event
        await pusherServer.trigger(`league-${leagueId}`, "league:deleted", {
          leagueId,
          leagueName: league.name,
          reason: "Last member left league",
          deletedAt: new Date().toISOString(),
        });

        logger.info("Deleted league (last member left)", {
          leagueId,
          leagueName: league.name,
        });

        return NextResponse.json({
          message: "Member removed and league deleted (no members remaining)",
          leagueId,
        });
      }

      // Promote the first remaining member to commissioner
      newCommissionerId = remainingMembers[0].userId;
      await prisma.league.update({
        where: { id: leagueId },
        data: { commissionerId: newCommissionerId },
      });

      // Also update their membership role to commissioner
      await prisma.leagueMembership.update({
        where: {
          userId_leagueId: {
            userId: newCommissionerId,
            leagueId: leagueId,
          },
        },
        data: { role: "commissioner" },
      });

      // Broadcast commissioner promoted event
      await pusherServer.trigger(`league-${leagueId}`, "commissioner:promoted", {
        leagueId,
        newCommissionerId,
        newCommissionerName: remainingMembers[0].user.name || remainingMembers[0].user.email,
        promotedAt: new Date().toISOString(),
      });

      logger.info("Promoted new commissioner", {
        leagueId,
        newCommissionerId,
        formerCommissionerId: userId,
      });
    }

    // Broadcast member left/removed event
    const eventName = isLeavingOwnLeague ? "member:left" : "member:removed";
    await pusherServer.trigger(`league-${leagueId}`, eventName, {
      leagueId,
      removedUserId: userId,
      removedUserName: memberToRemove.user.name || memberToRemove.user.email,
      removedByUserId: currentUser.id,
      removedByUserName: currentUser.name || currentUser.email,
      newCommissionerId: newCommissionerId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: isLeavingOwnLeague
        ? "Successfully left league"
        : "Member successfully removed",
      leagueId,
      removedUserId: userId,
      newCommissionerId,
    });
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to remove member from league");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
