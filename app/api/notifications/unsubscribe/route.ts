import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api-notifications-unsubscribe');

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe user from push notifications for a league
 *
 * Request body:
 * {
 *   leagueId: string,
 *   endpoint: string  // push subscription endpoint to remove
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      logger.warn('Unauthorized unsubscribe attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    let data;
    try {
      data = await request.json();
    } catch {
      logger.warn('Invalid JSON in unsubscribe request');
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const { leagueId, endpoint } = data;

    // Validate required fields
    if (!leagueId || !endpoint) {
      logger.warn('Missing required fields', { leagueId: !!leagueId, endpoint: !!endpoint });
      return NextResponse.json(
        { error: 'Missing leagueId or endpoint' },
        { status: 400 }
      );
    }

    // Verify user is member of this league
    const membership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: {
          userId,
          leagueId,
        },
      },
    });

    if (!membership) {
      logger.warn('User not member of league', { userId, leagueId });
      return NextResponse.json(
        { error: 'Not a member of this league' },
        { status: 403 }
      );
    }

    // Find and delete subscription
    const subscription = await prisma.pushSubscription.findUnique({
      where: {
        userId_leagueId_endpoint: {
          userId,
          leagueId,
          endpoint,
        },
      },
    });

    if (!subscription) {
      logger.warn('Subscription not found', { userId, leagueId, endpoint });
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Delete the subscription
    await prisma.pushSubscription.delete({
      where: { id: subscription.id },
    });

    logger.info('User unsubscribed from push notifications', {
      userId,
      leagueId,
      subscriptionId: subscription.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully unsubscribed from notifications',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error in unsubscribe endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
