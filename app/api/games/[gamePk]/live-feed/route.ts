import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { handleError, AuthenticationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("games.live-feed");

export interface BaserunnerState {
  first: boolean;
  second: boolean;
  third: boolean;
  outs: number;
}

/**
 * GET /api/games/[gamePk]/live-feed
 * Fetch baserunner and outs state from MLB game feed
 */
export async function GET(
  _request: unknown,
  context: { params: Promise<{ gamePk: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      throw new AuthenticationError("You must be logged in");
    }

    const { gamePk } = await context.params;

    // Fetch from MLB API
    const feedUrl = `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;
    const response = await fetch(feedUrl, {
      headers: { "User-Agent": "DingerZ/1.0" },
    });

    if (!response.ok) {
      throw new Error(`MLB API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract current play state
    const liveData = data.liveData;
    if (!liveData) {
      return NextResponse.json({
        first: false,
        second: false,
        third: false,
        outs: 0,
      });
    }

    const basesLoaded = liveData.basesLoaded || {
      first: false,
      second: false,
      third: false,
    };

    const outs = liveData.linescore?.currentInningOuts || 0;

    const state: BaserunnerState = {
      first: basesLoaded.first || false,
      second: basesLoaded.second || false,
      third: basesLoaded.third || false,
      outs,
    };

    logger.info("Fetched baserunner state", { gamePk, state });
    return NextResponse.json(state);
  } catch (error) {
    const { statusCode, message } = handleError(error, "Failed to fetch live game feed");
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
