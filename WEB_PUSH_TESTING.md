# Web Push Notifications Testing Guide

## Overview

Week 4 implements native Web Push API notifications for the Fantasy Homerun Tracker. This guide shows how to test push notifications locally and in production.

## Prerequisites

### Environment Setup

1. **VAPID Keys** - Web Push requires VAPID keys for authentication. Generate them:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Add to `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:support@homeruntracker.app
```

### Browser Support

- **Chrome/Edge:** Full support for push notifications
- **Firefox:** Full support for push notifications
- **Safari:** Limited support (iOS 16.4+ via Web App, no desktop support)
- **Mobile Chrome:** Full support on Android

## Testing Locally

### 1. Start Development Server

```bash
npm run dev
# App runs on http://localhost:3001
```

### 2. Enable Notifications in Browser

1. Visit `http://localhost:3001`
2. Sign in with Google OAuth
3. Open DevTools (F12)
4. Go to **Application** tab → **Manifest**
5. Verify service worker is registered
6. Grant notification permission when prompted

### 3. Test Service Worker Registration

In browser console:

```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
  registrations.forEach(reg => console.log('Scope:', reg.scope));
});

// Check push subscription
navigator.serviceWorker.ready.then(registration => {
  return registration.pushManager.getSubscription();
}).then(subscription => {
  console.log('Push Subscription:', subscription);
  console.log('Endpoint:', subscription?.endpoint);
});
```

### 4. Subscribe to Notifications

1. Go to any league page
2. Click the **bell icon** (top-right)
3. Click "Enable Notifications"
4. Grant notification permission
5. Verify subscription is saved in the PushSubscription table

```bash
# Check database
npx prisma studio
# Navigate to PushSubscription table
```

### 5. Trigger Test Notifications

Use the test endpoint to manually trigger notifications:

```bash
# Homerun notification (replace LEAGUE_ID)
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "leagueId": "LEAGUE_ID",
    "eventType": "homerun",
    "playerName": "Aaron Judge"
  }'

# Your turn notification
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "leagueId": "LEAGUE_ID",
    "eventType": "turn"
  }'

# Trade notification
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "leagueId": "LEAGUE_ID",
    "eventType": "trade"
  }'

# League update notification
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "leagueId": "LEAGUE_ID",
    "eventType": "league_update"
  }'
```

### 6. Using Browser DevTools for Push Testing

#### Chrome/Edge Push Simulator

1. Open DevTools (F12)
2. Go to **Application** → **Service Workers**
3. Find your service worker
4. Scroll down to "Simulated Push Event"
5. Enter sample JSON and click "Push"

Sample push payload:

```json
{
  "title": "Test Notification",
  "body": "This is a test notification",
  "icon": "/icon-192x192.png",
  "badge": "/badge-72x72.png",
  "leagueId": "test-league-123",
  "eventType": "homerun",
  "data": {
    "url": "/league/test-league-123"
  }
}
```

#### Firefox Push Simulator

1. Open DevTools (F12)
2. Go to **Storage** → **Service Workers**
3. Right-click service worker
4. Use console to send push manually

### 7. Verify Push in Database

```bash
# Open Prisma Studio
npx prisma studio

# Check PushSubscription table:
# - userId: should match your user
# - leagueId: should match the league
# - endpoint: should be a long URL
# - isActive: should be true
# - createdAt: should be recent
```

## Testing Real Events

### Test Homerun Notifications

The homerun-poll cron runs every 5 minutes. To test:

1. Manually trigger the cron in development:

```bash
# In your app code or via curl
curl -X POST http://localhost:3001/api/cron/homerun-poll \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

2. Note: This won't trigger notifications in development without real MLB game data (off-season limitation)

### Test Draft Turn Notifications

1. Create a league with 2+ members
2. Start the draft (as commissioner)
3. Verify first picker receives "Your turn" notification
4. Make a pick
5. Verify next picker receives notification

### Test with Multiple Devices/Tabs

1. Open two browser windows (or tabs)
2. Sign in with different users
3. Both join the same league
4. Subscribe both to notifications
5. Simulate draft or use test endpoint
6. Verify each user receives appropriate notifications

## Troubleshooting

### Service Worker Not Registering

1. Check browser console for errors
2. Verify `/public/sw.js` exists
3. Check that VAPID keys are configured
4. Try hard-refresh (Ctrl+Shift+R)

```javascript
// Force re-register service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
// Then reload page
```

### Notifications Not Appearing

1. Check notification permission:

```javascript
console.log('Permission:', Notification.permission);
// Should be 'granted'
```

2. Check browser notification settings
3. Try opening app in new window (not tab)
4. Verify subscription endpoint in database

### Push Subscription Fails

1. Check that VAPID keys are valid
2. Verify keys are in `.env.local` (not `.env`)
3. Restart dev server after adding keys
4. Check browser console for VAPID key errors

### Database Errors

1. Verify PushSubscription table exists:

```bash
npx prisma db seed  # Runs migrations if needed
```

2. Check that user has league membership:

```sql
SELECT * FROM "LeagueMembership" WHERE "userId" = 'your_user_id';
```

## Testing Checklist

- [ ] Service worker registers on app load
- [ ] Notification permission dialog appears
- [ ] Permission is stored in browser
- [ ] Subscription endpoint is sent to server
- [ ] PushSubscription record created in database
- [ ] Unsubscribe removes subscription from database
- [ ] Test endpoint triggers homerun notification
- [ ] Test endpoint triggers turn notification
- [ ] Test endpoint triggers trade notification
- [ ] Test endpoint triggers league_update notification
- [ ] Homerun cron (when games are live) sends notifications
- [ ] Draft start sends "your turn" to first picker
- [ ] Pick submission sends "your turn" to next picker
- [ ] Notifications include correct player names/stats
- [ ] Notification click navigates to league page
- [ ] Multiple subscriptions per user work correctly
- [ ] Invalid subscriptions are cleaned up (410 Gone)

## Production Deployment

### Before Going Live

1. Generate production VAPID keys (different from local)
2. Add to Vercel environment variables
3. Verify all endpoints are secured with auth checks
4. Test on real devices (iOS Safari, Android Chrome)
5. Monitor for push failures in logs

### Vercel Configuration

Add to `vercel.json` (already configured):

```json
{
  "crons": [
    {
      "path": "/api/cron/homerun-poll",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/draft-timeout",
      "schedule": "* * * * *"
    }
  ]
}
```

### Environment Variables

Add to Vercel:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_prod_public_key
VAPID_PRIVATE_KEY=your_prod_private_key
VAPID_EMAIL=mailto:support@homeruntracker.app
```

## API Reference

### POST `/api/notifications/subscribe`

Subscribe user to push notifications for a league.

**Request:**

```json
{
  "leagueId": "league-123",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "base64-encoded-key",
      "auth": "base64-encoded-key"
    }
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Successfully subscribed to notifications",
  "subscriptionId": "sub-123"
}
```

### POST `/api/notifications/unsubscribe`

Unsubscribe user from push notifications for a league.

**Request:**

```json
{
  "leagueId": "league-123",
  "endpoint": "https://fcm.googleapis.com/..."
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Successfully unsubscribed from notifications"
}
```

### POST `/api/notifications/test` (Dev Only)

Manually trigger test notifications.

**Request:**

```json
{
  "leagueId": "league-123",
  "eventType": "homerun",
  "playerName": "Aaron Judge"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Test homerun notification sent for Aaron Judge",
  "leagueId": "league-123",
  "eventType": "homerun"
}
```

## Key Files

- **public/sw.js** - Service worker handling push events
- **app/components/ServiceWorkerRegistration.tsx** - SW registration
- **app/components/NotificationBell.tsx** - UI for managing subscriptions
- **lib/push-service.ts** - Core push sending logic
- **app/api/notifications/subscribe/route.ts** - Subscribe endpoint
- **app/api/notifications/unsubscribe/route.ts** - Unsubscribe endpoint
- **app/api/notifications/test/route.ts** - Test endpoint
- **app/api/cron/homerun-poll/route.ts** - Integrated homerun notifications
- **app/api/draft/[leagueId]/start/route.ts** - Integrated draft start notifications
- **app/api/draft/[leagueId]/pick/route.ts** - Integrated draft turn notifications

## Next Steps (Week 5+)

- [ ] Persist notification preferences per user per league
- [ ] Add notification preference toggles to league settings
- [ ] Implement trade notification triggers (Week 6)
- [ ] Add PWA install prompt (Week 5)
- [ ] Implement offline sync for missed notifications
