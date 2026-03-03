import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("draft-date");

// PATCH /api/leagues/[leagueId]/draft-date - Update draft date (commissioner only)
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
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      return NextResponse.json(
        { error: "League not found" },
        { status: 404 }
      );
    }

    // Only commissioner can update draft date
    if (league.commissionerId !== user.id) {
      return NextResponse.json(
        { error: "Only the commissioner can update the draft date" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { draftDate } = body;

    // Update the draft date
    const updatedLeague = await prisma.league.update({
      where: { id: leagueId },
      data: {
        draftDate: draftDate ? new Date(draftDate) : null,
      },
    });

    logger.info("Updated draft date", {
      leagueId: leagueId,
      userId: user.id,
      draftDate: draftDate,
    });

    return NextResponse.json(updatedLeague);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to update draft date");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
