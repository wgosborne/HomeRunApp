import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin-backfill-team-ids");

interface MLBPlayerBio {
  id: number;
  fullName: string;
  currentTeam?: {
    id: number;
    name: string;
  };
}

/**
 * One-time backfill to set teamId for all existing players
 * Fetches current player data from MLB API and updates players where teamId is null
 */
export async function POST() {
  try {
    logger.info("Starting teamId backfill...");

    // Fetch player data from MLB API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      "https://statsapi.mlb.com/api/v1/sports/1/players?season=2026",
      {
        headers: {
          "User-Agent": "FantasyBaseball/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error("Failed to fetch players from MLB API", { status: response.status });
      return NextResponse.json(
        { error: "Failed to fetch players from MLB API" },
        { status: 500 }
      );
    }

    const data = (await response.json()) as { people?: MLBPlayerBio[] };
    const people = data.people || [];

    if (people.length === 0) {
      logger.warn("No players returned from MLB API");
      return NextResponse.json({
        message: "No players to backfill",
        updated: 0,
      });
    }

    logger.info("Fetched players from MLB API", { count: people.length });

    // Update teamId for each player where currentTeam exists and teamId is null
    let totalUpdated = 0;

    for (const person of people) {
      if (person.currentTeam?.id) {
        try {
          const result = await prisma.player.updateMany({
            where: { mlbId: person.id, teamId: null },
            data: { teamId: person.currentTeam.id },
          });

          totalUpdated += result.count;

          if (result.count > 0) {
            logger.debug("Updated player teamId", {
              mlbId: person.id,
              teamId: person.currentTeam.id,
              fullName: person.fullName,
            });
          }
        } catch (error) {
          logger.error("Error updating player", {
            mlbId: person.id,
            error,
          });
        }
      }
    }

    logger.info("Backfill complete", {
      processedFromAPI: people.length,
      updated: totalUpdated,
    });

    return NextResponse.json({
      message: "Backfill complete",
      processedFromAPI: people.length,
      updated: totalUpdated,
    });
  } catch (error) {
    logger.error("Backfill failed", { error });
    return NextResponse.json(
      { error: "Backfill failed" },
      { status: 500 }
    );
  }
}
