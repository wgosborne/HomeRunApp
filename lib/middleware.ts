import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("middleware");

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession();

  if (!session || !session.user?.email) {
    logger.warn("Unauthorized request", { path: request.nextUrl.pathname });
    throw new AuthenticationError("You must be logged in");
  }

  return session;
}

export async function requireLeagueMember(
  leagueId: string,
  userId: string
) {
  const membership = await prisma.leagueMembership.findUnique({
    where: {
      userId_leagueId: {
        userId,
        leagueId,
      },
    },
  });

  if (!membership) {
    logger.warn("Unauthorized league access", { leagueId, userId });
    throw new AuthorizationError("You are not a member of this league");
  }

  return membership;
}

export async function requireLeagueCommissioner(
  leagueId: string,
  userId: string
) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
  });

  if (!league) {
    throw new Error("League not found");
  }

  if (league.commissionerId !== userId) {
    logger.warn("Non-commissioner tried protected action", { leagueId, userId });
    throw new AuthorizationError("Only commissioners can perform this action");
  }

  return league;
}
