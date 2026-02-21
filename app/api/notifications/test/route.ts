import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/push-service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api-notifications-test');

/**
 * POST /api/notifications/test
 * Development endpoint to manually trigger test notifications
 * Only works in development mode or with CRON_SECRET
 *
 * Request body:
 * {
 *   leagueId: string,
 *   eventType: 'homerun' | 'turn' | 'trade' | 'league_update',
 *   playerName?: string  // for homerun
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if in development or has cron secret
    const isDevMode = process.env.NODE_ENV === 'development';
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    const hasCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isDevMode && !hasCronSecret) {
      logger.warn('Unauthorized test notification request');
      return NextResponse.json(
        { error: 'Unauthorized - only available in development or with CRON_SECRET' },
        { status: 401 }
      );
    }

    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      logger.warn('Unauthorized test notification attempt (no session)');
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
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const { leagueId, eventType, playerName } = data;

    // Validate required fields
    if (!leagueId || !eventType) {
      return NextResponse.json(
        { error: 'Missing leagueId or eventType' },
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

    // Send test notification based on event type
    let success = false;
    let message = '';

    switch (eventType) {
      case 'homerun': {
        const testPlayerName = playerName || 'Test Player';
        success = await sendPushToUser(userId, leagueId, {
          title: `${testPlayerName} hit a homerun!`,
          body: `Test notification: ${testPlayerName} hit a homerun in the 5th inning. You now have 2 homeruns.`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'homerun-alert',
          leagueId,
          eventType: 'homerun',
          data: {
            inning: 5,
            team: 'NYY',
            totalHomeruns: 2,
          },
        });
        message = `Test homerun notification sent for ${testPlayerName}`;
        break;
      }

      case 'turn': {
        success = await sendPushToUser(userId, leagueId, {
          title: 'Your turn in the draft!',
          body: 'Test notification: It\'s your turn to pick! You have 60 seconds to make your selection.',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'draft-turn',
          leagueId,
          eventType: 'turn',
          data: {
            round: 1,
            pickNumber: 1,
          },
        });
        message = 'Test draft turn notification sent';
        break;
      }

      case 'trade': {
        success = await sendPushToUser(userId, leagueId, {
          title: 'New trade proposal!',
          body: 'Test notification: John offered to trade Mike Trout for Aaron Judge. Review in 48 hours.',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'trade-alert',
          leagueId,
          eventType: 'trade',
          data: {
            tradeId: 'test-123',
          },
        });
        message = 'Test trade notification sent';
        break;
      }

      case 'league_update': {
        success = await sendPushToUser(userId, leagueId, {
          title: 'League update',
          body: 'Test notification: Draft has started! John is the first picker.',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'league-update',
          leagueId,
          eventType: 'league_update',
        });
        message = 'Test league update notification sent';
        break;
      }

      default: {
        return NextResponse.json(
          { error: 'Invalid eventType. Must be homerun, turn, trade, or league_update' },
          { status: 400 }
        );
      }
    }

    logger.info('Test notification sent', {
      userId,
      leagueId,
      eventType,
      success,
    });

    return NextResponse.json(
      {
        success,
        message,
        leagueId,
        eventType,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error in test notification endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
