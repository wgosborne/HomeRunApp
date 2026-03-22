# Opening Day Cutover Checklist
**Season:** 2026 MLB Regular Season
**Flag to Disable:** `NEXT_PUBLIC_ENABLE_SPRING_TRAINING`
**Target Date:** March 25, 2026 (Opening Day)

---

## Pre-Cutover Communication

### Notify Lane (Commissioner)
- [ ] **Send message:** "App going into brief maintenance mode to switch from spring training to real season data. We'll clear all spring stats and flip the data source. Should be back online in ~30 minutes."
- [ ] **Confirm no active drafts:** Verify no leagues have `draftStatus = 'active'` or `'paused'`
- [ ] **Post message:** "Maintenance complete—app is live for the 2026 regular season! All spring training stats cleared, fresh start for everyone."

---

## Pre-Cutover Verification (48 hours before flip)

### MLB Data Availability
- [ ] **Confirm regular season has started.** Check MLB schedule at https://www.mlb.com/standings
- [ ] **Verify statsapi.mlb.com is returning real data:**
  ```
  GET https://statsapi.mlb.com/api/v1/stats?stats=season&season=2026&gameType=R&group=hitting&sportId=1&limit=1000&playerPool=All
  ```
  Expected: 1000+ real MLB players with 2026 stats (not empty, not spring training data)
- [ ] **Check live games endpoint:**
  ```
  GET https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=TODAY&endDate=TODAY
  ```
  Expected: At least 1 live/preview game with `gameType: "R"`
- [ ] **Verify MLB API is responsive.** Check for 5xx errors, rate limit issues, timeout patterns

### Stage Database State
- [ ] **Confirm stage DB has real player data:** Check Player table for `bioSyncedAt > (today - 7 days)`
- [ ] **Verify Game table has regular season games:** Query for `gameType='R'` (not just 'S' spring training)
- [ ] **Check HomerrunEvent table is empty or from spring training only.** Confirm no regular season homeruns logged yet
- [ ] **Verify PushSubscription table has test users registered** (for notification testing)
- [ ] **Confirm all 17 migrations applied to stage DB** (see `MIGRATION_AUDIT.md` in parent folder)

### Application State
- [ ] **Build succeeds on preprod branch:** `npm run build` (TypeScript strict, no errors)
- [ ] **All 240+ tests passing:** `npm run test`
- [ ] **Dev server starts cleanly:** `npm run dev` (port 3001)
- [ ] **Prisma client regenerated:** Latest schema applied, no type errors

### Environment & Secrets
- [ ] **Verify `.env.local` has correct values for stage:**
  - `DATABASE_URL` points to stage Neon DB
  - `NEXT_PUBLIC_ENABLE_SPRING_TRAINING=true` (still, before cutover)
  - `NEXTAUTH_URL=https://stage.fantasy-baseball.vercel.app` (or your stage URL)
  - All VAPID keys, Pusher credentials, CRON_SECRET present
- [ ] **Confirm no hardcoded spring training data in code** (search for "spring" or "spring training" in src/)

---

## Database Cleanup (Execute in Order)

### ⚠️ CRITICAL: VERIFY DATABASE CONNECTION BEFORE EXECUTING ANY SQL

**You have TWO Neon databases. Make sure you're running cleanup against PRODUCTION, not staging.**

**Production Neon:**
```
postgresql://neondb_owner:npg_Lrp2WhByf4bO@ep-solitary-haze-ajyjbyu1-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Before executing ANY DELETE or UPDATE statement:**
1. [ ] Open Neon dashboard and verify which branch you're on
2. [ ] Check your SQL client connection string matches production (NOT staging branch)
3. [ ] Run `SELECT current_database();` to confirm you're on `neondb` (production)
4. [ ] If unsure, ask in Slack before proceeding

### ⚠️ CAUTION: Run these in a transaction or have a backup

-- 1. Clear all homerun events
DELETE FROM "HomerrunEvent";

-- 2. Clear all trades
DELETE FROM "Trade";

-- 3. Clear all draft picks
DELETE FROM "DraftPick";

-- 4. Clear all roster spots
DELETE FROM "RosterSpot";

-- 5. Clear all league settings
DELETE FROM "LeagueSettings";

-- 6. Clear all league memberships
DELETE FROM "LeagueMembership";

-- 7. Clear all leagues
DELETE FROM "League";

-- 8. Clear all games
DELETE FROM "Game";

-- 9. Reset all player stats
UPDATE "Player"
SET "homeruns" = 0,
    "gamesPlayed" = 0,
    "battingAverage" = NULL,
    "ops" = NULL,
    "homerunsLast14Days" = 0,
    "gamesPlayedLast14Days" = 0,
    "lastStatsUpdatedAt" = NULL;

-- 10. Verify
SELECT COUNT(*) FROM "HomerrunEvent";    -- 0
SELECT COUNT(*) FROM "League";           -- 0
SELECT COUNT(*) FROM "RosterSpot";       -- 0
SELECT COUNT(*) FROM "DraftPick";        -- 0
SELECT COUNT(*) FROM "Game";             -- 0
SELECT COUNT(*) FROM "Player" WHERE "homeruns" > 0; -- 0
SELECT COUNT(*) FROM "Team";             -- 30 unchanged
SELECT COUNT(*) FROM "User";             -- Keep users
---

## The Cutover (Go-Live Steps)

### Step 1: Flip the Flag in Vercel Production

⚠️ **CRITICAL: `NEXT_PUBLIC_` variables are baked into the client bundle at BUILD TIME.**
**Changing the env var alone is NOT enough—you MUST redeploy for the change to take effect in users' browsers.**

- [ ] **Go to Vercel Production Environment Variables**
  - Find: `NEXT_PUBLIC_ENABLE_SPRING_TRAINING`
  - Set to: `false`
  - Save & confirm change
- [ ] **REDEPLOY production (REQUIRED—do not skip):**
  ```
  vercel deploy --prod
  ```
  OR trigger via Vercel dashboard (main branch deployment)

  **Without this redeploy, the flag change will NOT reach users' clients.**

- [ ] **Verify redeployment:** Check Vercel deployments page, confirm build succeeded (no errors)

### Step 2: Populate Live Regular Season Data

- [ ] **Manually trigger sync-live-games cron:**
  ```
  curl -X POST https://fantasy-baseball.vercel.app/api/cron/sync-live-games \
    -H "x-cron-secret: $CRON_SECRET"
  ```
  Expected response: `{ synced: N, errors: 0 }` with today's real MLB games

- [ ] **Manually trigger sync-player-stats cron:**
  ```
  curl -X POST https://fantasy-baseball.vercel.app/api/cron/sync-player-stats \
    -H "x-cron-secret: $CRON_SECRET"
  ```
  Expected response: `{ updated: 1000+, errors: 0 }` with 2026 season stats

- [ ] **Verify data populated:**
  - [ ] Game table has today's games with `gameType = 'R'`
  - [ ] Player table has updated 2026 stats (`lastStatsUpdatedAt` is recent)
  - [ ] No spring training games visible

### Step 3: Test Dashboard on Production
- [ ] **Sign in to production app** at https://fantasy-baseball.vercel.app with test Google account
- [ ] **Verify dashboard shows real games:**
  - Games grid displays today's MLB regular season schedule
  - Game cards show real team names, scores, live status
  - No spring training games visible (if none scheduled)
- [ ] **Check featured game:** Large card shows correct game with live score updates
- [ ] **Verify game type in UI:** Confirm `gameType: "R"` in network inspector

### Step 4: Verify HR Leaders & Scores Pages
- [ ] **HR Leaders page (/homeruns):**
  - Shows real season data (should be mostly 0s immediately after cutover)
  - As games progress, homerun counts increment correctly
- [ ] **Dashboard Scores page:**
  - Displays today's real MLB games (not spring training mock data)
  - Game times shown in user's local timezone
  - Live scores update every 5 minutes via cron

### Step 5: Verify Draft Behavior & Existing Rosters

**Important:** If Lane's league has already drafted during spring training testing, rosters will have draft picks but 0 homeruns after cleanup. This is **expected behavior**—see note below.

- [ ] **Existing drafted rosters:** If any leagues drafted during spring testing:
  - [ ] Draft picks remain in DraftPick table (unchanged by cleanup)
  - [ ] RosterSpot records remain (unchanged)
  - [ ] **But:** Homerun counts reset to 0 (cleanup step 2)
  - [ ] **Verification:** `SELECT * FROM "RosterSpot" WHERE "homeruns" = 0 AND "draftedRound" IS NOT NULL;` should show draft picks with 0 HRs
  - This is correct—players drafted in spring start fresh for regular season

- [ ] **New draft test:**
  - [ ] Start a draft in a test league
  - [ ] Draft player search returns 2026 real MLB players with updated stats
  - [ ] No spring training players or mock data
  - [ ] Player stats reflect current season (0 or real counts)

### Step 6: Verify Trade Window
- [ ] **Check trade deadline:**
  - Trades should be **LOCKED** until July 13, 2026 (mid-season trade deadline)
  - Attempting to propose trade returns 409 Conflict or message
  - Verify in `/api/trades/[leagueId]` logic (check leagueDeadline logic or hardcoded deadline)

### Step 7: Test Homerun Detection & Polling
- [ ] **Trigger manual homerun poll:** Call `/api/cron/homerun-poll` (send valid `x-cron-secret` header)
- [ ] **Check logs:** Verify no errors, `{ processed: N, skipped: 0 }` response
- [ ] **Database check:** Confirm HomerrunEvent records created for today's homeruns
- [ ] **Pusher broadcast:** Verify homerun event broadcasts to `league-{leagueId}` channels
- [ ] **Web Push notification:** Confirm homerun alerts sent to subscribed users (check logs, browser console)

### Step 4: Test Player Stats & Headshots
- [ ] **Dashboard recent homeruns:** Player cards show headshots, updated 2026 stats
- [ ] **Player detail page:** Navigate to a homerun player (`/player/[leagueId]/[mlbId]`)
  - Headshot loads (MLB CDN fallback works)
  - Homerun history shows correct game dates, team opponents
  - Stats updated to current season
- [ ] **Draft room:** Available players show updated stats, headshots load without lag

### Step 5: Test Real League Features
- [ ] **Draft room timer:** Pick timer works correctly (doesn't reset, auto-pick triggers after 60s)
- [ ] **Standings calculation:** Leaderboard shows homeruns detected in real games
- [ ] **Roster updates:** My Team tab reflects real player homeruns within 5 minutes of event
- [ ] **Trades:** Propose and accept a trade (check that season-end guards don't block active leagues)

### Step 9: Verify Cron Job Health
- [ ] **sync-live-games cron:** Runs every 2 minutes, populating today's real games
  - Verify in `vercel.json`: `"crons": [{ "path": "/api/cron/sync-live-games", "schedule": "*/2 * * * *" }]`
  - Check logs: Should fire 30x per hour, no failures

- [ ] **homerun-poll cron:** Runs every 5 minutes, detecting real-time homeruns
  - Verify in `vercel.json`: `"crons": [{ "path": "/api/cron/homerun-poll", "schedule": "*/5 * * * *" }]`
  - Check logs: Should fire 12x per hour during game hours
  - Confirm `/api/cron/homerun-poll` has **early exit guard** for non-game hours (returns `{ processed: 0, skipped: 0 }`)

- [ ] **sync-player-stats cron:** Nightly sync (usually 3-4 AM ET)
  - Confirm in `vercel.json`: `"crons": [{ "path": "/api/cron/sync-player-stats", "schedule": "0 7 * * *" }]` (3 AM PT = 7 UTC)
  - Updates all players' season stats, batting avg, OPS, last-14-day counts

- [ ] **draft-timeout cron:** Fires every 1 minute for active drafts
  - Verify in `vercel.json`: `"crons": [{ "path": "/api/cron/draft-timeout", "schedule": "* * * * *" }]`
  - Has **early exit** if no active drafts (optimizes Vercel invocations)

- [ ] **trade-expire cron:** Runs every 5 minutes, expires 48h-old trades
  - Verify in `vercel.json`: `"crons": [{ "path": "/api/cron/trade-expire", "schedule": "*/5 * * * *" }]`
  - Check logs: No failures, expired trades updated to status='expired'

- [ ] **backfill-spring-training-homeruns cron:** ⚠️ **CRITICAL**
  - This cron backfills spring training HRs from statsapi and must NOT run after cutover
  - **DECISION: Disable in `vercel.json`** by removing the cron entry entirely
  - Verify `/app/api/cron/backfill-spring-training-homeruns` is NOT listed in `"crons"` array
  - [ ] Confirm in Vercel cron dashboard: This cron does not appear in active crons
  - **Reason:** If this cron runs after cutover, it will re-populate spring training HRs into production (undoing cleanup)

- [ ] **Check Vercel cron dashboard:**
  - All 5 active crons show "Success" status for recent executions
  - No failed runs in last hour
  - No 6+ minute gaps between executions (indicates disabled/erroring cron)
  - **backfill-spring-training-homeruns** is NOT present (disabled)

### Step 10: Load & Performance Check
- [ ] **API response times:** Dashboard loads < 2s, standings < 1s
- [ ] **Database queries:** No slow queries (check slow query logs in Neon console)
- [ ] **Pusher latency:** Real-time events arrive within 2s (check browser DevTools Network tab)
- [ ] **Service Worker:** Offline caching works, fallback page loads without internet

---

## Post-Cutover Monitoring (First 24-48 hours)

### Live Data Flow
- [ ] **Homerun polling working:** Check that homeruns are detected throughout game day
  - Every 5 minutes, check if new HomerrunEvent records appear
  - Verify no duplicate playByPlayIds (unique constraint prevents duplicates)
- [ ] **Player stats updating:** Confirm Player table `lastStatsUpdatedAt` is being refreshed
- [ ] **Game status updates:** Game.status changes from "Preview" → "Live" → "Final" correctly

### Notifications & Broadcasts
- [ ] **Web Push alerts working:** Sample users receive homerun notifications with correct player names
- [ ] **Pusher channels active:** Real-time leaderboard updates broadcast to league channels
- [ ] **No false alerts:** Confirm no duplicate notifications (idempotency via playByPlayId unique constraint)

### Database Health
- [ ] **No migration errors in logs** (all 17 migrations applied)
- [ ] **No orphaned records:** Confirm leagues/memberships/rosters in good state
- [ ] **Homerun event deduplication:** Verify playByPlayId unique constraint is working (no duplicates)
- [ ] **Storage usage reasonable:** Neon console shows expected data size growth

### User Feedback
- [ ] **Monitor Discord/support channel** for any "no games showing" reports
- [ ] **Check browser console errors** for common issues (failed headshot loads, API timeouts)
- [ ] **Verify mobile experience:** Test on iOS Safari (no Web Push API, fallback works) and Chrome Android (full support)

---

## Rollback Plan (If Issues Arise)

If anything is broken post-cutover:

### Immediate Rollback
1. **Revert flag:** Set `NEXT_PUBLIC_ENABLE_SPRING_TRAINING=true`
2. **Redeploy:** Push to stage, verify rollback works (spring games reappear)
3. **Investigate:** Check logs for:
   - MLB API timeouts or 503 errors
   - Prisma migration failures
   - Pusher channel subscription failures
   - Database connection pool exhaustion

### Partial Rollback (if only homerun polling broken)
- Disable homerun cron in `vercel.json` temporarily
- Keep app running with regular season games visible but no live homerun updates
- Investigate MLB API stability separately

### Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| **No games showing** | Dashboard is blank, /api/games/today returns `[]` | Check MLB API response, verify gameType=R filter applied |
| **Homerun duplicates** | Same homerun logged multiple times | Check playByPlayId unique constraint, verify idempotency in cron |
| **Headshots broken** | Player avatars show "No Image" fallback | Check img.mlbstatic.com CDN availability, verify mlbId in database |
| **Standings not updating** | Leaderboard stuck at old counts | Verify Pusher is connected, check /api/leagues/[id]/standings endpoint |
| **Push notifications down** | No homerun alerts received | Check VAPIR keys, verify PushSubscription records, confirm service worker loaded |
| **API timeouts** | Dashboard slow or hangs | Check Vercel CPU/memory usage, verify database query performance |

---

## Post-Cutover Success Criteria

All items must be ✅ before declaring cutover complete:

- [ ] Regular season games visible on dashboard
- [ ] Homerun polling detects real-time events (verified in HomerrunEvent table)
- [ ] Leaderboards update within 5 minutes of homerun
- [ ] Player headshots load from MLB CDN
- [ ] Web Push notifications sent to subscribers
- [ ] Draft rooms functional (timer, auto-picks, standings updates)
- [ ] No 5xx errors in production logs
- [ ] <1% of users reporting "no data" or "stuck" issues
- [ ] API response times <2s for dashboard
- [ ] All cron jobs executing on schedule

---

## Communication Plan

### Internal (Team Slack)
- [ ] **Pre-cutover (24h before):** "Cutover planned for [date] at [time]"
- [ ] **Cutover (at flip):** "Flag disabled, cutover in progress"
- [ ] **Post-cutover (1h after):** "Cutover complete, monitoring for issues"

### External (App Users)
- [ ] **Dashboard banner:** "Regular season live! Homeruns being tracked."
- [ ] **Email to commissioners:** "Season data is now live. Draft and play!"
- [ ] **In-app notification:** "Regular season started—your homeruns are being tracked!"

---

## Code Review Checklist

Before cutover, verify no spring-training hardcoding exists:
- [ ] **`lib/mlb-stats.ts`** — No hardcoded `gameType=S` filters, defaults to 'R'
- [ ] **`app/dashboard/page.tsx`** — Calls real `/api/games/today` endpoint (not mock spring data)
- [ ] **`app/api/cron/homerun-poll/route.ts`** — Polls all gameType=R (not filtered to spring)
- [ ] **`app/api/cron/sync-live-games/route.ts`** — Syncs all gameType (or explicit gameType=R)
- [ ] **`app/api/cron/sync-player-stats/route.ts`** — Updates from live 2026 season data
- [ ] **`app/api/draft/[leagueId]/available/route.ts`** — Player pool pulls from real season data
- [ ] **`vercel.json`** — All 5 crons defined with correct schedules (see Step 9 above)

---

## Final Sign-Off

### Before clicking "go live":
- [ ] **Backup production database** (Neon snapshot) in case rollback needed
- [ ] **Have rollback plan ready** (see "Rollback Plan" section above)
- [ ] **Designate on-call monitor** for 48h post-cutover
- [ ] **Lane notified** and ready to start leagues

### After cutover is complete:
- [ ] **Lane announcement sent:** "App is live for real season! Spring training stats cleared, everyone starts fresh."
- [ ] **Monitor dashboards:** Check Vercel/Neon for errors, spikes
- [ ] **Daily check (next 3 days):** Homerun poll running, data flowing, users not reporting issues
- [ ] **Archive this checklist** with completion timestamps in Handoffs folder

---

## Handoff Notes

**Pre-cutover checklist:** This document covers all steps from 48 hours before cutover through 48 hours after.

**Database backup:** Before running cleanup SQL, create Neon snapshot in Neon dashboard.

**Monitoring:** Set up alerts in Vercel/Neon for:
- Cron job failures (0 executions in 10 min window)
- Database query latency spikes (>1s)
- API error rate (>1% 5xx responses)
- Storage growth anomalies

**Escalation:** If issues arise after flip, refer to "Rollback Plan" section.

---

**Last Updated:** 2026-03-15 (Pre-season, ready for March 25, 2026 opening day)
**Status:** 🟡 Awaiting MLB Opening Day (March 25, 2026)
**Next Step:** Execute this checklist on March 25, 2026
