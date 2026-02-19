import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createLogger } from "@/lib/logger";

const logger = createLogger("invite");
const COOKIE_NAME = "pending-league-invite";
const COOKIE_MAX_AGE = 60 * 60; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leagueId } = body;

    if (!leagueId) {
      return NextResponse.json(
        { error: "leagueId is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, leagueId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });

    logger.info("Invite cookie set", { leagueId });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Failed to set invite cookie", { error });
    return NextResponse.json(
      { error: "Failed to set invite cookie" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const leagueId = cookieStore.get(COOKIE_NAME)?.value;

    if (!leagueId) {
      return NextResponse.json(
        { leagueId: null },
        { status: 200 }
      );
    }

    // Clear the cookie after reading
    cookieStore.delete(COOKIE_NAME);

    logger.info("Invite cookie retrieved and cleared", { leagueId });

    return NextResponse.json({ leagueId }, { status: 200 });
  } catch (error) {
    logger.error("Failed to get invite cookie", { error });
    return NextResponse.json(
      { error: "Failed to get invite cookie" },
      { status: 500 }
    );
  }
}
