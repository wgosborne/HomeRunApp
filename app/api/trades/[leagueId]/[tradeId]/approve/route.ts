import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { handleError, ConflictError, AuthorizationError, NotFoundError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { sendPushToUser, sendPushToLeague } from "@/lib/push-service";

const logger = createLogger("api-trade-approve");

/**
 * POST /api/trades/[leagueId]/[tradeId]/approve
 * Commissioner approves a pending_commissioner trade
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string; tradeId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId, tradeId } = await params;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get trade
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        league: {
          select: { id: true, name: true, commissionerId: true },
        },
        owner: {
          select: { id: true, name: true },
        },
        receiver: {
          select: { id: true, name: true },
        },
      },
    });

    if (!trade) {
      throw new NotFoundError("Trade not found");
    }

    // User must be commissioner
    if (user.id !== trade.league.commissionerId) {
      throw new AuthorizationError("Only the commissioner can approve trades");
    }

    // Trade must be pending_commissioner
    if ((trade.status as string) !== "pending_commissioner") {
      throw new ConflictError(
        `This trade cannot be approved in its current state (${trade.status})`
      );
    }

    // Update trade status from pending_commissioner to pending
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: "pending",
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
        receiver: {
          select: { id: true, name: true },
        },
      },
    });

    // Broadcast trade approval via Pusher
    await pusherServer.trigger(`league-${leagueId}`, "trade-commissioner-approved", {
      tradeId: updatedTrade.id,
      ownerId: updatedTrade.ownerId,
      ownerName: updatedTrade.owner.name,
      receiverId: updatedTrade.receiverId,
      receiverName: updatedTrade.receiver.name,
      ownerPlayerName: updatedTrade.ownerPlayerName,
      receiverPlayerName: updatedTrade.receiverPlayerName,
      timestamp: Date.now(),
    });

    // Send push notification to receiver
    try {
      await sendPushToUser(trade.receiverId, leagueId, {
        title: "Trade awaiting your response",
        body: `${trade.owner.name} is offering ${trade.ownerPlayerName} for ${trade.receiverPlayerName}. You have 48 hours to respond.`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        tag: "trade-approval",
        leagueId,
        eventType: "trade",
        data: {
          tradeId: updatedTrade.id,
          type: "approved",
        },
      });
    } catch (pushError) {
      logger.error("Error sending trade approval push to receiver", {
        leagueId,
        receiverId: trade.receiverId,
        error: pushError,
      });
    }

    // Send push notification to all league members except receiver
    try {
      await sendPushToLeague(leagueId, {
        title: "Trade under review",
        body: `A trade between ${trade.owner.name} and ${trade.receiver.name} is pending review.`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        tag: "trade-under-review",
        leagueId,
        eventType: "trade",
        data: {
          tradeId: updatedTrade.id,
          type: "under-review",
        },
      }, trade.receiverId);
    } catch (pushError) {
      logger.error("Error sending trade under review push to league", {
        leagueId,
        error: pushError,
      });
    }

    logger.info("Trade approved by commissioner", {
      leagueId,
      tradeId: updatedTrade.id,
      approvedBy: user.id,
    });

    return NextResponse.json(
      {
        trade: updatedTrade,
        message: "Trade approved successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to approve trade");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
