import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getPlayerDetails } from "@/lib/mlb-stats";
import { getHotColdStatus } from "@/lib/player-utils";

export const dynamic = 'force-dynamic';

const logger = createLogger("players");

interface HomerrunEventResponse {
  playerName: string;
  mlbId: number | null;
  mlbTeam: string | null;
  gameDate: string;
  inning: number;
  rbi: number;
  homeTeam: string | null;
  awayTeam: string | null;
  opponent: string | null;
  isHomeGame: boolean;
}

interface LeagueContext {
  hrRank: number;
  totalPlayers: number;
  ownerName: string;
  ownerImage: string | null;
  draftedRound: number | null;
  draftedPickNumber: number | null;
  tradeHistory: Array<{ fromOwnerName: string; toOwnerName: string; tradedAt: string }>;
}

interface PlayerDetailResponse {
  mlbId: number;
  playerName: string;
  mlbTeam: string | null;
  position: string | null;
  homeruns: HomerrunEventResponse[];
  totalHomeruns: number;
  streakStatus: "hot" | "neutral" | "cold";
  leagueContext?: LeagueContext;
}

// GET /api/players/[mlbId] - Get player details and homerun history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mlbId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { mlbId: mlbIdParam } = await params;
    const mlbId = parseInt(mlbIdParam, 10);
    if (isNaN(mlbId)) {
      return NextResponse.json(
        { error: "Invalid mlbId" },
        { status: 400 }
      );
    }

    // Get leagueId from query params if provided
    const leagueId = request.nextUrl.searchParams.get("leagueId");

    // Get ALL homerun events for this player (not filtered by league) for accurate total
    const allHomeruns = await prisma.homerrunEvent.findMany({
      where: { mlbId: mlbId },
      orderBy: { gameDate: "desc" },
    });

    // Get ALL homerun events (not filtered by league - show complete history)
    const homeruns = await prisma.homerrunEvent.findMany({
      where: {
        mlbId: mlbId,
      },
      orderBy: {
        gameDate: "desc",
      },
    });

    // Fetch game data for each homerun to determine home/away and get opponent team name
    const gameMap = new Map<string, { homeTeam: string; awayTeam: string; homeTeamId: number; awayTeamId: number }>();
    const uniqueGameIds = Array.from(new Set(homeruns.map((hr) => hr.gameId)));

    if (uniqueGameIds.length > 0) {
      const games = await prisma.game.findMany({
        where: { id: { in: uniqueGameIds } },
        select: { id: true, homeTeam: true, awayTeam: true, homeTeamId: true, awayTeamId: true },
      });

      for (const game of games) {
        gameMap.set(game.id, {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
        });
      }
    }

    // Fetch all teams from Team table to map IDs to full names
    const teams = await prisma.team.findMany({
      select: { mlbId: true, name: true },
    });
    const teamMap = new Map<number, string>();
    for (const team of teams) {
      teamMap.set(team.mlbId, team.name);
    }

    // Get player info from Player table (source of truth for current team)
    const player = await prisma.player.findUnique({
      where: { mlbId },
      select: { fullName: true, teamName: true, position: true, teamId: true },
    });

    let playerName = player?.fullName || homeruns[0]?.playerName;
    let mlbTeam = player?.teamName || null; // Use Player.teamName (current), fall back to homerun data
    let position = player?.position || null;

    // If still missing info, fetch from MLB API as last resort
    if (!playerName) {
      try {
        const playerData = await getPlayerDetails(mlbId.toString());
        if (playerData) {
          playerName = playerData.name;
          if (!mlbTeam) mlbTeam = playerData.team;
          if (!position) position = playerData.position;
        }
      } catch (error) {
        logger.warn("Failed to fetch from MLB API", { error, mlbId });
      }
    }

    // If we still don't have a name, return 404
    if (!playerName) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    // Fetch player stats for streak calculation
    const playerStats = await prisma.player.findUnique({
      where: { id: mlbId.toString() },
      select: {
        homeruns: true,
        gamesPlayed: true,
        homerunsLast14Days: true,
        gamesPlayedLast14Days: true,
      },
    });

    // Calculate streak status using shared utility
    const streakStatus = playerStats
      ? getHotColdStatus({
          homeruns: playerStats.homeruns || 0,
          gamesPlayed: playerStats.gamesPlayed || 0,
          homerunsLast14Days: playerStats.homerunsLast14Days || 0,
          gamesPlayedLast14Days: playerStats.gamesPlayedLast14Days || 0,
        })
      : 'neutral';

    const formattedHomeruns: HomerrunEventResponse[] = homeruns.map((hr) => {
      // Get game data with team IDs and abbreviations
      const gameData = gameMap.get(hr.gameId);

      // Determine home/away by comparing numeric team IDs (reliable, does not depend on hr.team)
      const isHome = gameData?.homeTeamId === player?.teamId;

      // Get opponent team ID from game data
      const opponentTeamId = isHome ? gameData?.awayTeamId : gameData?.homeTeamId;

      // Look up full team name from Team table using the opponent team ID
      const opponentTeamName = opponentTeamId !== undefined && opponentTeamId !== null ? teamMap.get(opponentTeamId) : null;

      // Get the opponent abbreviation for fallback
      const opponentAbbrev = isHome ? gameData?.awayTeam : gameData?.homeTeam;

      // Display: use full name from Team table, fall back to abbreviation if not found
      const opponent = opponentTeamName || opponentAbbrev || "Unknown";

      // Home/away team names for display
      const homeTeamName = gameData?.homeTeamId !== undefined && gameData?.homeTeamId !== null
        ? teamMap.get(gameData.homeTeamId) || gameData?.homeTeam
        : gameData?.homeTeam;
      const awayTeamName = gameData?.awayTeamId !== undefined && gameData?.awayTeamId !== null
        ? teamMap.get(gameData.awayTeamId) || gameData?.awayTeam
        : gameData?.awayTeam;

      return {
        playerName: hr.playerName,
        mlbId: hr.mlbId,
        mlbTeam: player?.teamName || hr.team,
        gameDate: hr.gameDate.toISOString(),
        inning: hr.inning,
        rbi: hr.rbi,
        homeTeam: homeTeamName || "Unknown",
        awayTeam: awayTeamName || "Unknown",
        opponent: opponent,
        isHomeGame: isHome,
      };
    });

    const response: PlayerDetailResponse = {
      mlbId,
      playerName,
      mlbTeam: mlbTeam || null,
      position: position || null,
      homeruns: formattedHomeruns,
      // Use Player.homeruns (MLB API source of truth) if available, else count from allHomeruns
      totalHomeruns: playerStats?.homeruns ?? allHomeruns.length,
      streakStatus,
    };

    // Add league context if leagueId provided
    if (leagueId) {
      try {
        // Get current user's ID to find owner
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, name: true, image: true },
        });

        if (!user) {
          logger.warn("User not found for league context", { email: session.user.email });
        } else {
          // Find owner of this player in the league
          const rosterSpot = await prisma.rosterSpot.findFirst({
            where: {
              leagueId,
              playerId: mlbId.toString(),
            },
            include: {
              user: {
                select: { name: true, image: true },
              },
            },
          });

          if (rosterSpot) {
            // Get HR rank for this owner in this league
            const allRosterSpots = await prisma.rosterSpot.findMany({
              where: { leagueId },
              select: { userId: true, homeruns: true },
            });

            // Group by userId and sum homeruns
            const userHRMap = new Map<string, number>();
            for (const spot of allRosterSpots) {
              userHRMap.set(spot.userId, (userHRMap.get(spot.userId) || 0) + spot.homeruns);
            }

            const sortedUsers = Array.from(userHRMap.entries())
              .sort(([, a], [, b]) => b - a)
              .map(([userId]) => userId);

            const ownerIndex = sortedUsers.indexOf(rosterSpot.userId);
            const hrRank = ownerIndex >= 0 ? ownerIndex + 1 : 1;

            // Get trade history for this player
            const acceptedTrades = await prisma.trade.findMany({
              where: {
                leagueId,
                status: "accepted",
                OR: [
                  { ownerPlayerId: mlbId.toString() },
                  { receiverPlayerId: mlbId.toString() },
                ],
              },
              include: {
                owner: { select: { name: true } },
                receiver: { select: { name: true } },
              },
            });

            const tradeHistory = acceptedTrades.map((trade) => ({
              fromOwnerName: trade.owner.name || "Unknown",
              toOwnerName: trade.receiver.name || "Unknown",
              tradedAt: trade.respondedAt?.toISOString() || trade.createdAt.toISOString(),
            }));

            response.leagueContext = {
              hrRank,
              totalPlayers: sortedUsers.length,
              ownerName: rosterSpot.user.name || "Unknown",
              ownerImage: rosterSpot.user.image || null,
              draftedRound: rosterSpot.draftedRound,
              draftedPickNumber: rosterSpot.draftedPickNumber,
              tradeHistory,
            };
          }
        }
      } catch (error) {
        logger.warn("Failed to fetch league context", { error, leagueId });
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to fetch player details", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
