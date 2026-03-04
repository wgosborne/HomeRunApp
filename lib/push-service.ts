import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const logger = createLogger('push-service');

// Initialize web-push with VAPID keys
if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  logger.warn('Web Push VAPID keys not configured - push notifications disabled');
} else {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:support@homeruntracker.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Notification payload structure
 */
export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  leagueId: string;
  playerId?: string;
  eventType: 'homerun' | 'turn' | 'trade' | 'league_update';
  data?: Record<string, unknown>;
}

/**
 * Send push notification to a single user (all their active subscriptions)
 * Returns true if sent successfully, false otherwise
 */
export async function sendPushToUser(
  userId: string,
  leagueId: string,
  notification: PushNotification
): Promise<boolean> {
  try {
    // Fetch active subscriptions for this user (global, not league-specific)
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (subscriptions.length === 0) {
      logger.debug('No active push subscriptions found', { userId, leagueId });
      return false;
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/badge-72x72.png',
      tag: notification.tag || 'homerun-tracker',
      leagueId: notification.leagueId,
      playerId: notification.playerId,
      eventType: notification.eventType,
      ...notification.data,
    });

    let successCount = 0;
    let failureCount = 0;

    // Send to each subscription
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );

        successCount++;
        logger.debug('Push notification sent', {
          userId,
          leagueId,
          eventType: notification.eventType,
        });
      } catch (error) {
        failureCount++;

        // If subscription is invalid (410 Gone), mark as inactive
        if (
          error instanceof Error &&
          error.message.includes('410')
        ) {
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { isActive: false },
          });
          logger.warn('Subscription marked as inactive (410 Gone)', {
            subscriptionId: subscription.id,
          });
        } else {
          logger.error('Error sending push notification', {
            userId,
            leagueId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    logger.info('Push notifications sent', {
      userId,
      leagueId,
      eventType: notification.eventType,
      successCount,
      failureCount,
    });

    return successCount > 0;
  } catch (error) {
    logger.error('Error in sendPushToUser', {
      userId,
      leagueId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send push notification to all users in a league (filtered by role/criteria if needed)
 */
export async function sendPushToLeague(
  leagueId: string,
  notification: PushNotification,
  excludeUserId?: string
): Promise<{ sent: number; failed: number }> {
  try {
    // Fetch all league members
    const members = await prisma.leagueMembership.findMany({
      where: { leagueId },
      select: { userId: true },
    });

    let sent = 0;
    let failed = 0;

    for (const member of members) {
      // Skip excluded user if specified
      if (excludeUserId && member.userId === excludeUserId) {
        continue;
      }

      const success = await sendPushToUser(member.userId, leagueId, notification);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    logger.info('Push notifications sent to league', {
      leagueId,
      eventType: notification.eventType,
      sent,
      failed,
    });

    return { sent, failed };
  } catch (error) {
    logger.error('Error in sendPushToLeague', {
      leagueId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send push notification to specific users
 */
export async function sendPushToUsers(
  userIds: string[],
  leagueId: string,
  notification: PushNotification
): Promise<{ sent: number; failed: number }> {
  try {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      const success = await sendPushToUser(userId, leagueId, notification);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    logger.info('Push notifications sent to users', {
      leagueId,
      eventType: notification.eventType,
      userCount: userIds.length,
      sent,
      failed,
    });

    return { sent, failed };
  } catch (error) {
    logger.error('Error in sendPushToUsers', {
      leagueId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { sent: 0, failed: 0 };
  }
}

/**
 * Get all active subscriptions for a user (for debugging/admin)
 */
export async function getUserSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      endpoint: true,
      userAgent: true,
      createdAt: true,
    },
  });
}

/**
 * Delete inactive subscriptions older than 30 days (cleanup job)
 */
export async function cleanupInactiveSubscriptions(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.pushSubscription.deleteMany({
      where: {
        isActive: false,
        updatedAt: { lt: thirtyDaysAgo },
      },
    });

    logger.info('Cleaned up inactive subscriptions', {
      deletedCount: result.count,
    });

    return result.count;
  } catch (error) {
    logger.error('Error cleaning up subscriptions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
