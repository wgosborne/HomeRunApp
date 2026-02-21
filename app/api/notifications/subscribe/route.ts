import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api-notifications-subscribe');

/**
 * POST /api/notifications/subscribe
 * Subscribe user to push notifications for a league
 *
 * Request body:
 * {
 *   leagueId: string,
 *   subscription: {
 *     endpoint: string,
 *     keys: { p256dh: string, auth: string }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      logger.warn('Unauthorized subscription attempt');
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
      logger.warn('Invalid JSON in subscribe request');
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const { leagueId, subscription } = data;

    // Validate required fields
    if (!leagueId || !subscription) {
      logger.warn('Missing required fields', { leagueId: !!leagueId, subscription: !!subscription });
      return NextResponse.json(
        { error: 'Missing leagueId or subscription' },
        { status: 400 }
      );
    }

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      logger.warn('Invalid subscription object', { userId, leagueId });
      return NextResponse.json(
        { error: 'Invalid subscription object - missing endpoint or keys' },
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

    // Get user agent for device identification
    const userAgent = request.headers.get('user-agent') || undefined;

    // Save or update subscription
    // Using upsert to handle duplicate subscriptions (same device, re-subscribing)
    const pushSubscription = await prisma.pushSubscription.upsert({
      where: {
        userId_leagueId_endpoint: {
          userId,
          leagueId,
          endpoint: subscription.endpoint,
        },
      },
      create: {
        userId,
        leagueId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        isActive: true,
      },
      update: {
        isActive: true,
        userAgent,
      },
    });

    logger.info('User subscribed to push notifications', {
      userId,
      leagueId,
      subscriptionId: pushSubscription.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to notifications',
        subscriptionId: pushSubscription.id,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error in subscribe endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
