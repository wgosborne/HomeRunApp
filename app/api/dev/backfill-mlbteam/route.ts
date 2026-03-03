import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailablePlayers, getPlayerDetails } from "@/lib/mlb-stats";
import { createLogger } from "@/lib/logger";

const logger = createLogger("backfill-mlbteam");

export async function POST() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "Only available in development" },
        { status: 403 }
      );
    }

    // Get all RosterSpots with NULL mlbTeam
    const rostersWithoutTeam = await prisma.rosterSpot.findMany({
      where: { mlbTeam: null },
    });

    logger.info("Found rosters without team", {
      count: rostersWithoutTeam.length,
    });

    if (rostersWithoutTeam.length === 0) {
      return NextResponse.json({ message: "No rosters to backfill", updated: 0 });
    }

    // Get all available players to get their teams
    const allPlayers = await getAvailablePlayers([]);

    // Create a map of player ID to team for quick lookup
    const playerTeamMap = new Map(
      allPlayers.map((p) => [p.id, p.team])
    );

    let updated = 0;
    const errors: string[] = [];

    // Backfill each roster spot
    for (const roster of rostersWithoutTeam) {
      try {
        // Try to find the team from our map
        let team = playerTeamMap.get(roster.playerId);

        // If not in map, fetch from MLB API
        if (!team) {
          const playerDetails = await getPlayerDetails(roster.playerId);
          team = playerDetails?.team;
        }

        if (team) {
          await prisma.rosterSpot.update({
            where: { id: roster.id },
            data: { mlbTeam: team },
          });
          updated++;
          logger.debug("Updated roster", {
            playerId: roster.playerId,
            playerName: roster.playerName,
            team,
          });
        } else {
          errors.push(
            `Could not find team for ${roster.playerName} (${roster.playerId})`
          );
        }
      } catch (error) {
        errors.push(
          `Error updating ${roster.playerName}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    logger.info("Backfill complete", {
      updated,
      failed: errors.length,
      errors,
    });

    return NextResponse.json({
      message: "Backfill complete",
      updated,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error("Backfill failed", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backfill failed" },
      { status: 500 }
    );
  }
}
