import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api-notifications-subscribe');

/**
 * POST /api/notifications/subscribe
 * Subscribe user to push notifications (global, cross-league)
 * Subscriptions are user-wide, so users get notifications for all leagues they're in
 *
 * Request body:
 * {
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

    const { subscription } = data;

    // Validate required fields
    if (!subscription) {
      logger.warn('Missing subscription in request body', { userId });
      return NextResponse.json(
        { error: 'Missing subscription in request body' },
        { status: 400 }
      );
    }

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      logger.warn('Invalid subscription object - missing endpoint or keys', { userId });
      return NextResponse.json(
        { error: 'Invalid subscription object - missing endpoint or keys' },
        { status: 400 }
      );
    }

    // Get user agent for device identification
    const userAgent = request.headers.get('user-agent') || undefined;

    // Save or update subscription (user-wide)
    // Using upsert to handle duplicate subscriptions (same device, re-subscribing)
    const pushSubscription = await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscription.endpoint,
        },
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        isActive: true,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true,
        userAgent,
      },
    });

    logger.info('User subscribed to push notifications', {
      userId,
      subscriptionId: pushSubscription.id,
      endpoint: subscription.endpoint,
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
