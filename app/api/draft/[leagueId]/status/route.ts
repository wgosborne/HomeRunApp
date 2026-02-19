import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("draft-status");

interface DraftStatus {
  leagueId: string;
  draftStatus: string;
  isDraftActive: boolean;
  currentRound: number;
  currentPickNumber: number;
  currentPickerIndex: number;
  currentPickerId: string;
  currentPickerName: string;
  timeRemainingSeconds: number;
  timeStarted: number;
  totalPicks: number;
  completedPicks: number;
  draftStartedAt: Date | null;
  memberCount: number;
  members: Array<{
    userId: string;
    userName: string;
    teamName: string;
  }>;
}

const PICK_TIMEOUT_SECONDS = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leagueId } = await params;

    // Verify user is a member of the league
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

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
        draftPicks: {
          orderBy: { pickNumber: "asc" },
        },
      },
    });

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Calculate draft status
    const memberCount = league.memberships.length;
    const totalPicks = memberCount * 10; // 10 rounds
    const completedPicks = league.draftPicks.length;
    const isDraftActive = league.draftStatus === "active";

    let status: DraftStatus = {
      leagueId: league.id,
      draftStatus: league.draftStatus,
      isDraftActive,
      currentRound: 0,
      currentPickNumber: 0,
      currentPickerIndex: 0,
      currentPickerId: "",
      currentPickerName: "",
      timeRemainingSeconds: 0,
      timeStarted: 0,
      totalPicks,
      completedPicks,
      draftStartedAt: league.draftStartedAt,
      memberCount,
      members: league.memberships.map((m) => ({
        userId: m.userId,
        userName: m.user.name || "Unknown",
        teamName: m.teamName || "Team Name",
      })),
    };

    if (isDraftActive && league.currentPickStartedAt) {
      // Calculate current round and pick number
      const nextPickNumber = completedPicks + 1;
      const currentRound = Math.ceil(nextPickNumber / memberCount);
      const pickerIndexInRound = ((nextPickNumber - 1) % memberCount);

      status.currentRound = currentRound;
      status.currentPickNumber = nextPickNumber;
      status.currentPickerIndex = pickerIndexInRound;
      status.currentPickerId = league.memberships[pickerIndexInRound].userId;
      status.currentPickerName =
        league.memberships[pickerIndexInRound].user.name || "Unknown";

      // Calculate time remaining from server timestamp
      const pickStartTime = league.currentPickStartedAt.getTime();
      const pickEndTime = pickStartTime + PICK_TIMEOUT_SECONDS * 1000;
      const now = Date.now();

      status.timeStarted = pickStartTime;
      status.timeRemainingSeconds = Math.max(
        0,
        Math.ceil((pickEndTime - now) / 1000)
      );
    }

    logger.info("Retrieved draft status", {
      leagueId,
      isDraftActive,
      completedPicks,
      totalPicks,
    });

    return NextResponse.json(status);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to get draft status");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
