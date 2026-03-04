import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api-notifications-unsubscribe');

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe user from push notifications (global)
 * Removes a specific subscription endpoint
 *
 * Request body:
 * {
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

    const { endpoint } = data;

    // Validate required fields
    if (!endpoint) {
      logger.warn('Missing endpoint in request body', { userId });
      return NextResponse.json(
        { error: 'Missing endpoint in request body' },
        { status: 400 }
      );
    }

    // Find and delete subscription
    const subscription = await prisma.pushSubscription.findUnique({
      where: {
        userId_endpoint: {
          userId,
          endpoint,
        },
      },
    });

    if (!subscription) {
      logger.warn('Subscription not found', { userId, endpoint });
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
      subscriptionId: subscription.id,
      endpoint,
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
