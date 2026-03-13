import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-admin-expire-pending-trades");

/**
 * POST /api/admin/expire-pending-trades
 * ONE-TIME migration endpoint to expire all existing pending trades before commissioner flow goes live.
 * Requires CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all trades with status "pending" (pre-commissioner-flow trades)
    const pendingTrades = await prisma.trade.findMany({
      where: { status: "pending" },
    });

    if (pendingTrades.length === 0) {
      logger.info("No pending trades to expire");
      return NextResponse.json(
        { expired: 0, message: "No trades to expire" },
        { status: 200 }
      );
    }

    // Bulk update to status "expired"
    const result = await prisma.trade.updateMany({
      where: { status: "pending" },
      data: {
        status: "expired",
        respondedAt: new Date(),
      },
    });

    logger.info("Expired all pending trades", { count: result.count });

    return NextResponse.json(
      {
        expired: result.count,
        message: `Expired ${result.count} pending trade(s)`,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to expire pending trades", { error });
    return NextResponse.json(
      { error: "Failed to expire pending trades" },
      { status: 500 }
    );
  }
}
