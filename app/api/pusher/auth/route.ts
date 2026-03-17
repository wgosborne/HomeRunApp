import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher-server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("pusher-auth");

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channel = params.get("channel_name");

    if (!socketId || !channel) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Validate user is a member of the league (extract leagueId from channel name)
    // Channel format: draft-[leagueId], league-[leagueId], or presence-draft-[leagueId]
    const normalizedChannel = channel.replace(/^presence-/, "");
    const channelParts = normalizedChannel.split("-");
    const leagueId = channelParts.slice(1).join("-");

    if (!leagueId) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
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
      logger.warn("Unauthorized channel access attempt", {
        userId: user.id,
        channel,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Authorize the channel subscription
    // For presence channels, include user presence data
    const isPresence = channel.startsWith("presence-");
    const auth = pusherServer.authorizeChannel(
      socketId,
      channel,
      isPresence ? { user_id: user.id, user_info: { name: user.name } } : undefined
    );
    logger.info("Authorized channel subscription", {
      userId: user.id,
      channel,
      isPresence,
    });

    return NextResponse.json(auth);
  } catch (error) {
    logger.error("Pusher auth error", { error });
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
