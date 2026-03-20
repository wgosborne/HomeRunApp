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

    // Get ALL homerun events (not filtered by league - show complete history)
    const homeruns = await prisma.homerrunEvent.findMany({
      where: {
        mlbId: mlbId,
      },
      orderBy: {
        gameDate: "desc",
      },
    });

    // Get player info early (needed for opponent calculation)
    const player = await prisma.player.findUnique({
      where: { mlbId },
      select: { fullName: true, teamName: true, position: true, teamId: true },
    });

    // Batch fetch game data for all homeruns
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

    // Collect unique opponent team IDs to fetch only needed teams
    const opponentTeamIds = new Set<number>();
    for (const hr of homeruns) {
      const gameData = gameMap.get(hr.gameId);
      if (gameData) {
        const oppId = gameData.homeTeamId === player?.teamId ? gameData.awayTeamId : gameData.homeTeamId;
        if (oppId) opponentTeamIds.add(oppId);
      }
    }

    // Only fetch teams that are actually opponents in this player's homerun history
    let teamMap = new Map<number, string>();
    if (opponentTeamIds.size > 0) {
      const teams = await prisma.team.findMany({
        where: { mlbId: { in: Array.from(opponentTeamIds) } },
        select: { mlbId: true, name: true },
      });
      for (const team of teams) {
        teamMap.set(team.mlbId, team.name);
      }
    }

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
      where: { mlbId },
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
      // Use Player.homeruns (MLB API source of truth) if available, else count from database
      totalHomeruns: playerStats?.homeruns ?? homeruns.length,
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
          // Get internal Player.id (cuid) to look up roster spot
          const playerRecord = await prisma.player.findUnique({
            where: { mlbId },
            select: { id: true },
          });

          if (!playerRecord) {
            logger.warn("Player record not found for league context", { mlbId });
          } else {
            // Find owner of this player in the league using internal cuid
            const rosterSpot = await prisma.rosterSpot.findFirst({
              where: {
                leagueId,
                playerId: playerRecord.id,
              },
              include: {
                user: {
                  select: { name: true, image: true },
                },
              },
            });

            if (rosterSpot) {
              // Get HR rank for this owner in this league using aggregation
              const userStandings = await prisma.$queryRaw<Array<{ userId: string; totalHr: number }>>`
                SELECT "userId", SUM("homeruns") as "totalHr"
                FROM "RosterSpot"
                WHERE "leagueId" = ${leagueId}
                GROUP BY "userId"
                ORDER BY "totalHr" DESC
              `;

              const ownerIndex = userStandings.findIndex(u => u.userId === rosterSpot.userId);
              const hrRank = ownerIndex >= 0 ? ownerIndex + 1 : 1;
              const totalPlayers = userStandings.length;

              // Get trade history for this player using internal cuid
              const acceptedTrades = await prisma.trade.findMany({
                where: {
                  leagueId,
                  status: "accepted",
                  OR: [
                    { ownerPlayerId: playerRecord.id },
                    { receiverPlayerId: playerRecord.id },
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
                totalPlayers,
                ownerName: rosterSpot.user.name || "Unknown",
                ownerImage: rosterSpot.user.image || null,
                draftedRound: rosterSpot.draftedRound,
                draftedPickNumber: rosterSpot.draftedPickNumber,
                tradeHistory,
              };
            }
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
