# Spring Training Testing Guide

## What's Been Fixed

1. ✅ **`.env.local` created** with `NEXT_PUBLIC_ENABLE_SPRING_TRAINING=true`
   - This is needed for your local dev server (the Vercel env var only applies to deployed apps)

2. ✅ **New manual sync endpoint**: `/api/test/sync-games`
   - Lets you trigger game syncing on-demand without waiting for cron jobs
   - Usage: `curl http://localhost:3001/api/test/sync-games?days=3`

3. ✅ **Dashboard fallback improved**
   - No more automatic mock data during testing
   - If there are no real games, you'll see an empty state (not fake games)
   - This lets you verify the real data flow is working

## Testing Flow

### Step 1: Restart Dev Server
```bash
# Kill any running dev server (Ctrl+C)
npm run dev
# Restart it to pick up the .env.local variable
```

The environment variable will now be loaded and spring training games will be enabled.

### Step 2: Manually Sync Games
Open this URL in your browser or curl it:
```
http://localhost:3001/api/test/sync-games?days=3
```

This will:
- Fetch today's + last 3 days of spring training games from MLB API
- Save them to your local database
- Return how many were synced

Expected response:
```json
{
  "message": "Manual sync completed",
  "totalSynced": 10,
  "daysBack": 3,
  "enableSpringTraining": true
}
```

### Step 3: Verify Live Games on Dashboard
Go to http://localhost:3001/dashboard and you should now see:
- **Live Games section** with real spring training games (if any are live right now)
- Games show: Teams, scores, inning info, your player count
- Small game cards for upcoming/other games

### Step 4: Create a League & Draft
1. Click "+ Create" on dashboard
2. Create a league (e.g., "Spring Training Test")
3. Share invite link with another user (or create second account)
4. Once you have 2+ members, you can draft

### Step 5: Verify Homerun Polling
Once you have a drafted league:
1. The cron job `/api/cron/homerun-poll` runs every 5 minutes
2. Automatically detects homeruns from live games
3. Broadcasts via Pusher in real-time
4. Shows in:
   - **Dashboard** → Recent Home Runs section
   - **League page** → Leaderboard tab (standings updated)
   - **Push notifications** to subscribed users

## Environment Variables

**Local (`npm run dev`):**
```
NEXT_PUBLIC_ENABLE_SPRING_TRAINING=true
```

**Vercel deployment:**
- Already set in your Vercel project settings
- Check: https://vercel.com → Project → Settings → Environment Variables

## Cron Jobs Active

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/sync-live-games` | Every 2 min | Sync today's games from MLB API to DB |
| `/api/cron/homerun-poll` | Every 5 min | Detect new homeruns, broadcast, notify |
| `/api/cron/draft-timeout` | Every 1 min | Auto-pick on 60-sec timeout |
| `/api/cron/trade-expire` | Every 5 min | Expire 48h old trade proposals |

These run automatically on Vercel in production. Locally, they don't run (you need a Vercel Pro account for local cron). That's why we created `/api/test/sync-games` — manual trigger for local testing.

## Debugging

### Check if Spring Training is Enabled
```bash
# Look for this in browser console while on dashboard:
console.info("No live games yet. Trigger /api/test/sync-games...")
```

### Check Games in Database
```bash
npx prisma studio
# Navigate to Game table, filter by gameDate >= today
```

### Check Homeruns
In Prisma Studio:
- Go to HomerrunEvent table
- Filter by createdAt >= today
- Verify playerId, playerName, team are populated

### Test Notifications
Hit the test endpoint (dev only):
```
POST http://localhost:3001/api/notifications/test
```

Response:
```json
{
  "message": "Test notification queued",
  "subscriptions": 1
}
```

## Expected Behavior

**During Spring Training (Feb 20 - Sept 27):**
- Dashboard shows real spring training games from MLB API
- When you draft players, their live games appear on dashboard
- As games happen, homeruns are detected and pushed in real-time
- Leaderboard updates automatically

**Off-Season (Sept 28 - Feb 19):**
- Cron jobs return `{ processed: 0, skipped: 0 }` (safe, no errors)
- Dashboard shows empty games/homeruns sections
- Full game/homerun flow ready to test when season starts

## Next Steps

1. ✅ Restart dev server (new .env.local will be picked up)
2. ✅ Hit `/api/test/sync-games?days=3` to populate games
3. ✅ Verify games appear on dashboard
4. ✅ Create league and draft players
5. ✅ Verify homeruns are captured and broadcast in real-time
6. ✅ Test push notifications
