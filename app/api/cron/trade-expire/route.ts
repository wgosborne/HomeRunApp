import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron-trade-expire");

/**
 * Shared handler for trade expiration cron job
 * Vercel sends GET requests by default
 */
async function handleTradeExpire() {
  try {

    const now = new Date();

    // Find all pending trades that have expired
    const expiredTrades = await prisma.trade.findMany({
      where: {
        status: "pending",
        expiresAt: {
          lt: now,
        },
      },
      include: {
        league: {
          select: { id: true },
        },
        owner: {
          select: { id: true, name: true },
        },
        receiver: {
          select: { id: true, name: true },
        },
      },
    });

    logger.info("Processing expired trades", { count: expiredTrades.length });

    if (expiredTrades.length === 0) {
      return NextResponse.json({
        message: "No trades to expire",
        processed: 0,
      });
    }

    // Update all expired trades
    await prisma.trade.updateMany({
      where: {
        status: "pending",
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: "expired",
        respondedAt: now,
      },
    });

    // Broadcast expiration events via Pusher
    for (const trade of expiredTrades) {
      try {
        await pusherServer.trigger(
          `league-${trade.league.id}`,
          "trade-expired",
          {
            tradeId: trade.id,
            ownerId: trade.ownerId,
            ownerName: trade.owner.name,
            receiverId: trade.receiverId,
            receiverName: trade.receiver.name,
            ownerPlayerName: trade.ownerPlayerName,
            receiverPlayerName: trade.receiverPlayerName,
            timestamp: Date.now(),
          }
        );
      } catch (pusherError) {
        logger.error("Error broadcasting trade expiration", {
          tradeId: trade.id,
          error: pusherError,
        });
      }
    }

    logger.info("Trade expiration cron completed", {
      expiredCount: expiredTrades.length,
    });

    return NextResponse.json({
      message: "Trade expiration completed",
      processed: expiredTrades.length,
    });
  } catch (error) {
    logger.error("Error in trade expiration cron", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET and POST handlers for Vercel cron
 * Vercel sends GET requests by default
 */
export async function GET() {
  return handleTradeExpire();
}

export async function POST() {
  return handleTradeExpire();
}
