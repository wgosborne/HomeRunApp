import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { handleError, ConflictError, AuthorizationError, NotFoundError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push-service";

const logger = createLogger("api-trade-reject");

/**
 * POST /api/trades/[leagueId]/[tradeId]/reject
 * Reject a trade proposal
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

    const isCommissioner = user.id === trade.league.commissionerId;
    const isReceiver = user.id === trade.receiverId;

    // Only commissioner or receiver can reject
    if (!isCommissioner && !isReceiver) {
      throw new AuthorizationError("Only the commissioner or receiver can reject this trade");
    }

    // Commissioner can reject pending_commissioner, receiver can reject pending
    const tradeStatusStr = trade.status as string;
    if (isCommissioner && tradeStatusStr === "pending_commissioner") {
      // Commissioner rejection is OK
    } else if (isReceiver && trade.status === "pending") {
      // Receiver rejection is OK
    } else {
      throw new ConflictError(
        `This trade cannot be rejected in its current state (${trade.status})`
      );
    }

    // Update trade status to rejected
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: "rejected",
        respondedAt: new Date(),
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

    // Broadcast trade rejection via Pusher
    await pusherServer.trigger(`league-${leagueId}`, "trade-rejected", {
      tradeId: updatedTrade.id,
      ownerId: updatedTrade.ownerId,
      ownerName: updatedTrade.owner.name,
      receiverId: updatedTrade.receiverId,
      receiverName: updatedTrade.receiver.name,
      ownerPlayerName: updatedTrade.ownerPlayerName,
      receiverPlayerName: updatedTrade.receiverPlayerName,
      timestamp: Date.now(),
    });

    // Send push notifications based on who rejected
    try {
      if (isCommissioner) {
        // Commissioner rejected pending_commissioner trade
        await sendPushToUser(trade.ownerId, trade.leagueId, {
          title: "Trade declined",
          body: "Your trade proposal was declined by the commissioner.",
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          tag: "trade-rejected",
          leagueId: trade.leagueId,
          eventType: "trade",
          data: {
            tradeId: updatedTrade.id,
            type: "rejected",
          },
        });
      } else {
        // Receiver rejected pending trade
        await sendPushToUser(trade.ownerId, trade.leagueId, {
          title: "Trade rejected",
          body: `${trade.receiver.name} rejected your trade proposal.`,
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          tag: "trade-rejected",
          leagueId: trade.leagueId,
          eventType: "trade",
          data: {
            tradeId: updatedTrade.id,
            type: "rejected",
          },
        });

        // Also notify commissioner that receiver rejected
        await sendPushToUser(trade.league.commissionerId, trade.leagueId, {
          title: "Trade rejected",
          body: `${trade.receiver.name} rejected the trade with ${trade.owner.name}.`,
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          tag: "trade-rejected",
          leagueId: trade.leagueId,
          eventType: "trade",
          data: {
            tradeId: updatedTrade.id,
            type: "rejected",
          },
        });
      }
    } catch (pushError) {
      logger.error("Error sending trade rejection push notification", {
        leagueId: trade.leagueId,
        rejectedBy: user.id,
        error: pushError,
      });
    }

    logger.info("Trade rejected", {
      leagueId: trade.leagueId,
      tradeId: updatedTrade.id,
      rejectedBy: user.id,
    });

    return NextResponse.json(
      {
        trade: updatedTrade,
        message: "Trade rejected successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to reject trade");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
