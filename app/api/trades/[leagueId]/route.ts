import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { proposeTradeSchema } from "@/lib/validation";
import { handleError, ConflictError, AuthorizationError, ValidationError, NotFoundError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push-service";

const logger = createLogger("api-trades");

/**
 * GET /api/trades/[leagueId]
 * Get all trades in a league (pending, accepted, rejected, expired)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId } = await params;

    // Verify user is member of league
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const membership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a league member" }, { status: 403 });
    }

    // Fetch all trades for league
    const trades = await prisma.trade.findMany({
      where: { leagueId },
      include: {
        owner: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    logger.info("Fetched trades", { leagueId, count: trades.length });

    return NextResponse.json(trades, { status: 200 });
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to fetch trades");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

/**
 * POST /api/trades/[leagueId]
 * Propose a new trade
 *
 * Request body:
 * {
 *   receiverId: string,
 *   ownerPlayerId: string,
 *   ownerPlayerName: string,
 *   receiverPlayerId: string,
 *   receiverPlayerName: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId } = await params;
    const body = await request.json();
    const validatedData = proposeTradeSchema.parse(body);

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify owner is member of league
    const ownerMembership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId,
        },
      },
    });

    if (!ownerMembership) {
      throw new AuthorizationError("You are not a member of this league");
    }

    // Verify receiver exists and is member of league
    const receiverMembership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId: validatedData.receiverId,
          leagueId,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!receiverMembership) {
      throw new NotFoundError("Receiver is not a member of this league");
    }

    // Can't propose to yourself
    if (user.id === validatedData.receiverId) {
      throw new ConflictError("You cannot propose a trade with yourself");
    }

    // Verify owner owns the player they're offering
    const ownerPlayerRoster = await prisma.rosterSpot.findUnique({
      where: {
        leagueId_userId_playerId: {
          leagueId,
          userId: user.id,
          playerId: validatedData.ownerPlayerId,
        },
      },
    });

    if (!ownerPlayerRoster) {
      throw new ConflictError(
        `You do not own ${validatedData.ownerPlayerName} to trade`
      );
    }

    // Verify receiver owns the player they're offering
    const receiverPlayerRoster = await prisma.rosterSpot.findUnique({
      where: {
        leagueId_userId_playerId: {
          leagueId,
          userId: validatedData.receiverId,
          playerId: validatedData.receiverPlayerId,
        },
      },
    });

    if (!receiverPlayerRoster) {
      throw new ConflictError(
        `${receiverMembership.user.name} does not own ${validatedData.receiverPlayerName}`
      );
    }

    // Check for duplicate pending trades between these users
    const existingTrade = await prisma.trade.findFirst({
      where: {
        leagueId,
        AND: [
          {
            OR: [
              {
                AND: [
                  { ownerId: user.id },
                  { receiverId: validatedData.receiverId },
                ],
              },
              {
                AND: [
                  { ownerId: validatedData.receiverId },
                  { receiverId: user.id },
                ],
              },
            ],
          },
          { status: "pending" },
        ],
      },
    });

    if (existingTrade) {
      throw new ConflictError(
        "There is already a pending trade between you and this user"
      );
    }

    // Create the trade with 48-hour expiration
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const trade = await prisma.trade.create({
      data: {
        leagueId,
        ownerId: user.id,
        receiverId: validatedData.receiverId,
        ownerPlayerId: validatedData.ownerPlayerId,
        ownerPlayerName: validatedData.ownerPlayerName,
        receiverPlayerId: validatedData.receiverPlayerId,
        receiverPlayerName: validatedData.receiverPlayerName,
        status: "pending",
        expiresAt,
      },
      include: {
        owner: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Broadcast trade proposal via Pusher
    await pusherServer.trigger(`league-${leagueId}`, "trade-proposed", {
      tradeId: trade.id,
      ownerId: trade.ownerId,
      ownerName: trade.owner.name,
      receiverId: trade.receiverId,
      receiverName: trade.receiver.name,
      ownerPlayerName: trade.ownerPlayerName,
      receiverPlayerName: trade.receiverPlayerName,
      expiresAt: trade.expiresAt,
      timestamp: Date.now(),
    });

    // Send push notification to receiver
    try {
      await sendPushToUser(validatedData.receiverId, leagueId, {
        title: "New trade proposal!",
        body: `${user.name} is offering ${validatedData.ownerPlayerName} for ${validatedData.receiverPlayerName}. You have 48 hours to respond.`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        tag: "trade-proposal",
        leagueId,
        eventType: "trade",
        data: {
          tradeId: trade.id,
          type: "proposal",
        },
      });
    } catch (pushError) {
      logger.error("Error sending trade proposal push notification", {
        leagueId,
        receiverId: validatedData.receiverId,
        error: pushError,
      });
      // Continue even if push fails
    }

    logger.info("Trade proposal created", {
      leagueId,
      tradeId: trade.id,
      ownerId: user.id,
      receiverId: validatedData.receiverId,
    });

    return NextResponse.json(
      {
        trade,
        message: "Trade proposal sent successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, context: error.context },
        { status: 400 }
      );
    }

    const { statusCode, message } = handleError(error, "Failed to propose trade");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
