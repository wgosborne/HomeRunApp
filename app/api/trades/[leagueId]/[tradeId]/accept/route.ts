import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { handleError, ConflictError, AuthorizationError, NotFoundError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push-service";

const logger = createLogger("api-trade-accept");

/**
 * POST /api/trades/[leagueId]/[tradeId]/accept
 * Accept a trade proposal
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
          select: { id: true, name: true },
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

    // Only the receiver can accept
    if (user.id !== trade.receiverId) {
      throw new AuthorizationError("Only the trade receiver can accept this trade");
    }

    // Trade must be pending
    if (trade.status !== "pending") {
      throw new ConflictError(
        `This trade has already been ${trade.status}`
      );
    }

    // Trade must not be expired
    if (new Date() > trade.expiresAt) {
      // Mark as expired
      await prisma.trade.update({
        where: { id: tradeId },
        data: {
          status: "expired",
          respondedAt: new Date(),
        },
      });

      throw new ConflictError("This trade has expired");
    }

    // Verify both players still exist in rosters
    const ownerPlayerRoster = await prisma.rosterSpot.findUnique({
      where: {
        leagueId_userId_playerId: {
          leagueId: trade.leagueId,
          userId: trade.ownerId,
          playerId: trade.ownerPlayerId,
        },
      },
    });

    if (!ownerPlayerRoster) {
      throw new ConflictError(
        `${trade.owner.name} no longer owns ${trade.ownerPlayerName}`
      );
    }

    const receiverPlayerRoster = await prisma.rosterSpot.findUnique({
      where: {
        leagueId_userId_playerId: {
          leagueId: trade.leagueId,
          userId: trade.receiverId,
          playerId: trade.receiverPlayerId,
        },
      },
    });

    if (!receiverPlayerRoster) {
      throw new ConflictError(
        `You no longer own ${trade.receiverPlayerName}`
      );
    }

    // Perform the trade: swap player ownership
    // Remove owner's player, add to receiver
    await prisma.rosterSpot.delete({
      where: {
        leagueId_userId_playerId: {
          leagueId: trade.leagueId,
          userId: trade.ownerId,
          playerId: trade.ownerPlayerId,
        },
      },
    });

    // Add owner's player to receiver with trade metadata
    await prisma.rosterSpot.create({
      data: {
        leagueId: trade.leagueId,
        userId: trade.receiverId,
        playerId: trade.ownerPlayerId,
        playerName: trade.ownerPlayerName,
        position: ownerPlayerRoster.position,
        mlbId: ownerPlayerRoster.mlbId,
        mlbTeam: ownerPlayerRoster.mlbTeam,
        homeruns: ownerPlayerRoster.homeruns,
        points: ownerPlayerRoster.points,
        addedViaTradeAt: new Date(),
      },
    });

    // Remove receiver's player, add to owner
    await prisma.rosterSpot.delete({
      where: {
        leagueId_userId_playerId: {
          leagueId: trade.leagueId,
          userId: trade.receiverId,
          playerId: trade.receiverPlayerId,
        },
      },
    });

    // Add receiver's player to owner with trade metadata
    await prisma.rosterSpot.create({
      data: {
        leagueId: trade.leagueId,
        userId: trade.ownerId,
        playerId: trade.receiverPlayerId,
        playerName: trade.receiverPlayerName,
        position: receiverPlayerRoster.position,
        mlbId: receiverPlayerRoster.mlbId,
        mlbTeam: receiverPlayerRoster.mlbTeam,
        homeruns: receiverPlayerRoster.homeruns,
        points: receiverPlayerRoster.points,
        addedViaTradeAt: new Date(),
      },
    });

    // Update trade status
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: "accepted",
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

    // Broadcast trade acceptance via Pusher
    await pusherServer.trigger(`league-${leagueId}`, "trade-accepted", {
      tradeId: updatedTrade.id,
      ownerId: updatedTrade.ownerId,
      ownerName: updatedTrade.owner.name,
      receiverId: updatedTrade.receiverId,
      receiverName: updatedTrade.receiver.name,
      ownerPlayerName: updatedTrade.ownerPlayerName,
      receiverPlayerName: updatedTrade.receiverPlayerName,
      timestamp: Date.now(),
    });

    // Send push notification to owner
    try {
      await sendPushToUser(trade.ownerId, trade.leagueId, {
        title: "Trade accepted!",
        body: `${trade.receiver.name} accepted your trade. You now own ${trade.ownerPlayerName}.`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        tag: "trade-accepted",
        leagueId: trade.leagueId,
        eventType: "trade",
        data: {
          tradeId: updatedTrade.id,
          type: "accepted",
        },
      });
    } catch (pushError) {
      logger.error("Error sending trade acceptance push notification", {
        leagueId: trade.leagueId,
        ownerId: trade.ownerId,
        error: pushError,
      });
    }

    logger.info("Trade accepted", {
      leagueId: trade.leagueId,
      tradeId: updatedTrade.id,
      acceptedBy: user.id,
    });

    return NextResponse.json(
      {
        trade: updatedTrade,
        message: "Trade accepted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to accept trade");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
