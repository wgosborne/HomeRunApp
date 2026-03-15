# How It Works: Fantasy Homerun Tracker Architecture

**Last Updated:** 2026-03-15 | **Status:** Week 8 (End-of-Season Ready)

---

## System Overview

Multi-tenant fantasy baseball PWA with real-time homerun tracking. Users draft MLB players, track live homeruns, propose trades, and compete on leaderboards. All leagues stay isolated via `leagueId` multi-tenant guards.

**Key Stack:** Next.js 16 + React 19 | Neon Postgres + Prisma | Pusher Channels | Web Push API | statsapi.mlb.com

---

## Data Sources by Page

### 📊 Dashboard (`/dashboard`)
| Component | Source | Refresh |
|-----------|--------|---------|
| **Live Games** | `/api/games/today` → `Game` table (synced by cron every 2 min) | Real-time (2 min cron) |
| **Scores/Status** | `Game.status`, `Game.homeScore`, `Game.awayScore` | Real-time (5 sec polling) |
| **Recent Homeruns** | `/api/leagues/[id]/homeruns` → `HomerrunEvent` table (5 min cron) | Real-time (Pusher) |
| **Your Leagues** | `/api/leagues` → `League` + `LeagueMembership` (user query) | Static (loaded on mount) |
| **League Status** | `League.draftStatus`, `winnerId` (end-of-season badge) | Real-time (Pusher) |

**Fallback:** Uses mock spring training games if MLB API is down (dev/testing only).

---

### ⚾ League Home (`/league/[leagueId]`)

#### Tab: Draft (`DraftTab`)
| Data | Source | Real-time? |
|------|--------|-----------|
| **Draft Picks History** | `/api/draft/[leagueId]/picks` → `DraftPick` table | ✅ Pusher `draft-{id}` channel |
| **Available Players** | `/api/draft/[leagueId]/available` → statsapi.mlb.com (filtered by season/pool) | ✅ Search + Player headshots |
| **Timer/Status** | `/api/draft/[leagueId]/status` → `League.currentPickStartedAt` | ✅ WebSocket (Pusher) |
| **Current Picker** | Calculated from `round`, `pickNumber`, `memberCount` | ✅ Pusher broadcast |

#### Tab: Leaderboard (`LeaderboardTab`)
| Data | Source | Real-time? |
|------|--------|-----------|
| **Rankings** | `/api/leagues/[id]/standings` → HR count per user | ✅ 5-sec poll + Pusher |
| **Player Headshots** | `RosterSpot.mlbId` → MLB CDN (img.mlbstatic.com) | Static |
| **Expanded Rosters** | `/api/leagues/[id]/roster` for each user | ✅ Pusher updates |

#### Tab: My Team (`MyTeamTab`)
| Data | Source | Real-time? |
|------|--------|-----------|
| **Your Roster** | `/api/leagues/[id]/roster?userId=[me]` → `RosterSpot` table | ✅ 5-sec poll + Pusher |
| **Homerun Counts** | `RosterSpot.homeruns` (updated by homerun-poll cron) | ✅ Pusher per homerun |
| **Player Headshots** | `RosterSpot.mlbId` | Static |

#### Tab: Trades (`TradesTab`)
| Data | Source | Real-time? |
|------|--------|-----------|
| **Trade List** | `/api/trades/[leagueId]` → `Trade` table | ✅ Pusher `league-{id}` channel |
| **Trade Status** | `Trade.status` (pending/accepted/rejected/expired) | ✅ Pusher on status change |
| **Season Lock** | `League.seasonEndedAt` (blocks new proposals) | ✅ Pusher broadcast |

#### Tab: Settings (`SettingsTab`)
| Data | Source | Real-time? |
|------|--------|-----------|
| **League Info** | `League.*` fields (name, date, status) | Static |
| **End Season Button** | `League.draftStatus = 'complete'` (commissioner only) | Static |
| **Winner Display** | `League.winnerId` + `User.name` (post-season) | ✅ Pusher broadcast |

---

### 👤 Player Detail (`/player/[leagueId]/[mlbId]`)
| Data | Source |
|------|--------|
| **Player Info** | `/api/players/[mlbId]` → `Player` table or MLB API |
| **Headshot** | `Player.headshot` OR MLB CDN (fallback to initials) |
| **Homerun History** | `/api/players/[mlbId]/homeruns` → `HomerrunEvent` table (league-scoped) |
| **Stats** | `Player.homeruns`, `battingAverage`, `ops`, `homerunsLast14Days` |
| **Streak Status** | Calculated from recent homerun activity (see below) |

**Streak Status Calculation (Player Details Page):**
- **Hot:** ≥ 2 homeruns in last 7 days
- **Cold:** 0 homeruns in last 14 days
- **Neutral:** All other cases (default)

---

### 📈 HR Leaders (`/homeruns`)
| Data | Source | Real-time? |
|------|--------|-----------|
| **All Homeruns Feed** | `/api/homeruns` (paginated) → `HomerrunEvent` table | ✅ Pusher broadcast |
| **Player Info** | Player name, team, inning, date | From HR records |
| **Sort Options** | By date, player, team | Client-side |
| **Badge (Hot/Cold)** | Calculated from season vs 14-day homerun rates (see below) |

**Badge Calculation (HR Leaders Page):**
- **Hot Badge:** Recent 14-day homerun rate > Season homerun rate
- **Cold Badge:** Recent 14-day homerun rate < Season homerun rate
- **No Badge:** Rates are equal (or player has 0 HRs)

---

### 👥 Profile (`/profile`)
| Data | Source |
|------|--------|
| **User Info** | `/api/user/profile` → `User` table (session user) |
| **Display Name** | `User.name` (editable via `/api/user/update-name`) |
| **Leagues Won** | `User.wonLeagues` relation (via `League.winnerId`) |

---

## Cron Jobs (Vercel)

### 1️⃣ sync-live-games
- **Schedule:** Every 2 minutes (`*/2 * * * *`)
- **Endpoint:** `/api/cron/sync-live-games`
- **What:** Fetches today's games from statsapi.mlb.com, upserts `Game` table
- **Early Exit:** Returns `{ synced: 0, errors: 0 }` if no games active (optimized)
- **Data Updated:** `Game.homeScore`, `Game.awayScore`, `Game.status`, `Game.inning`, `Game.inningHalf`
- **Dashboard Impact:** Live scores update every 2 minutes

### 2️⃣ homerun-poll
- **Schedule:** Every 5 minutes (`*/5 * * * *`)
- **Endpoint:** `/api/cron/homerun-poll`
- **What:** Polls active MLB games for homeruns, detects new hits
- **Idempotent:** Uses `playByPlayId` unique constraint (no duplicates)
- **Data Updated:** Creates `HomerrunEvent` records
- **Real-time:** Broadcasts via Pusher `league-{id}` channel + Web Push notifications
- **Early Exit:** Checks `currentTime` in game window (skips off-hours)
- **Database Impact:** Updates `RosterSpot.homeruns`, broadcasts to all league members

### 3️⃣ sync-player-stats
- **Schedule:** Nightly at 7 UTC (`0 7 * * *`) = 3 AM PT / 11 PM ET previous day
- **Endpoint:** `/api/cron/sync-player-stats`
- **What:** Refreshes all 1000+ players' seasonal stats from statsapi
- **Data Updated:** `Player.homeruns`, `Player.gamesPlayed`, `Player.battingAverage`, `Player.ops`, `Player.homerunsLast14Days`, `Player.gamesPlayedLast14Days`
- **Draft Impact:** Available player pool shows current season stats

### 4️⃣ draft-timeout
- **Schedule:** Every 1 minute (`* * * * *`)
- **Endpoint:** `/api/cron/draft-timeout`
- **What:** Checks if draft pick timer exceeded 60s, auto-picks best available player
- **Authority:** Uses `League.currentPickStartedAt` (server time, prevents client desync)
- **Early Exit:** Skips if no active drafts (checks `draftStatus = 'active'`)
- **Data Updated:** Creates `DraftPick`, updates `RosterSpot`, increments round/pick
- **Real-time:** Broadcasts via Pusher `draft-{id}` channel

### 5️⃣ trade-expire
- **Schedule:** Every 5 minutes (`*/5 * * * *`)
- **Endpoint:** `/api/cron/trade-expire`
- **What:** Expires trades that hit 48-hour deadline
- **Data Updated:** Sets `Trade.status = 'expired'`
- **Real-time:** Broadcasts via Pusher `league-{id}` channel

### ❌ backfill-spring-training-homeruns
- **Status:** DISABLED (removed from vercel.json after opening day cutover)
- **Why:** Would re-populate spring training HRs after cleanup
- **Removal Date:** March 25, 2026 (opening day)

---

## Libraries & Utilities

### MLB Data Integration (`lib/mlb-stats.ts`)
```
fetchTodaysGames()          → Gets today's MLB schedule from statsapi
fetchGameHomeruns()         → Polls active game play-by-play for HRs
getPlayerDetails()          → Looks up player name, team, position (cached)
searchPlayers()             → Filters 1000+ MLB players by name/position
syncPlayerStats()           → Refreshes seasonal stats (daily cron)
fetchPlayerStats()          → Gets live player season stats
```

### Pusher Real-Time (`lib/pusher-server.ts` & `lib/pusher-client.ts`)
```
Channels (per league):
  draft-{leagueId}          → Draft events (pick-made, timer updates)
  league-{leagueId}         → League events (homerun detected, trade updates, standings)

Broadcasts:
  pick-made                 → User picked a player (timer resets)
  draft-started             → Commissioner started the draft
  draft-paused/resumed      → Draft state changes
  draft-completed           → All 10 rounds done
  homerun-detected          → Player hit a homerun
  trade-proposed            → New trade proposal
  trade-accepted/rejected   → Trade response
  standings-updated         → Homerun counts changed
```

### Web Push Notifications (`lib/push-service.ts`)
```
sendPushToUser()            → Sends notification to single user
sendPushToLeague()          → Sends to all league members
Test: /api/notifications/test (dev only, requires CRON_SECRET)
```

### Service Worker (`public/sw.js`)
```
Handles incoming push events
Displays notifications with user context
Smart suppression: Blocks draft-turn alerts if user actively in draft room
Messages to client: DRAFTING_ACTIVE / DRAFTING_INACTIVE
```

---

## Key Data Flows

### 🏠 When You Load Dashboard
1. Call `/api/leagues` → Your leagues + memberships loaded
2. Call `/api/games/today` → Today's games displayed
3. Cron `sync-live-games` fires every 2 min → Scores update in real-time
4. Pusher subscribes to all `league-{id}` channels → Real-time homerun alerts

### 📋 When Draft Starts
1. Commissioner clicks "Start Draft" → `/api/draft/[id]/start` called
2. Sets `League.draftStatus = 'active'`, `currentPickStartedAt = now()`
3. Cron `draft-timeout` starts polling every 1 min
4. Pusher broadcasts `draft-started` to all members
5. Web Push: All members get "Draft has started" notification
6. Timer countdown begins (60 sec per pick)

### ⚾ When Homerun Is Hit
1. Cron `homerun-poll` detects it (every 5 min)
2. Creates `HomerrunEvent` record (via unique `playByPlayId`)
3. Updates `RosterSpot.homeruns += 1` for player owner
4. Pusher broadcasts `homerun-detected` to `league-{id}` channel
5. Web Push: Owner of player gets notification
6. Dashboard/Leaderboard refresh via 5-sec poll + real-time updates

### 🤝 When Trade Is Proposed
1. User calls `/api/trades/[id]` (POST with player IDs)
2. Creates `Trade` record with `status = 'pending'`
3. Sets `expiresAt = now() + 48 hours`
4. Pusher broadcasts `trade-proposed` to receiver
5. Web Push: Receiver notified "Trade proposal from [user]: [player] for [player]"
6. Receiver can accept/reject via `/api/trades/[id]/[tradeId]/accept`

### 🏆 When Season Ends
1. Commissioner clicks "End Season"
2. Calculates winner = user with most homeruns
3. Sets `League.seasonEndedAt = now()`, `League.winnerId = userId`
4. Blocks further trades (409 Conflict on POST)
5. Pusher broadcasts `season-ended` to all members
6. Champion banner displays on league page
7. User's `wonLeagues` relation updates

---

## Real-Time Updates (Pusher + Polling)

**Why Both?**
- **Pusher:** Instant updates (zero latency) when events occur
- **5-sec Polling:** Fallback if Pusher connection drops (reliability)

**Channels:**
- `draft-{leagueId}` → Draft room picks, timer
- `league-{leagueId}` → Homeruns, standings, trades, season end

**Subscribe On:** League page/draft room load
**Unsubscribe On:** Leave page/app

---

## Environment Variables Required

**Critical:**
- `DATABASE_URL` → Neon Postgres
- `CRON_SECRET` → Required for all cron endpoints
- `NEXT_PUBLIC_ENABLE_SPRING_TRAINING` → Toggle mock data (false = real season)

**Pusher:**
- `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`

**Web Push:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

**Auth:**
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

## Testing Endpoints (Dev Only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cron/homerun-poll` | POST | Manually trigger homerun detection (test) |
| `/api/cron/sync-live-games` | POST | Manually sync today's games (test) |
| `/api/cron/sync-player-stats` | POST | Manually update player stats (test) |
| `/api/notifications/test` | POST | Send all notification types (dev/test) |
| `/api/draft/[id]/reset` | POST | Reset draft to pending (dev) |
| `/api/draft/[id]/autopick` | POST | Manually trigger auto-pick (dev) |

All require `x-cron-secret` header.

---

## Performance & Scaling

**Database Queries:**
- Standings (leaderboard): Indexed on `(leagueId, homeruns)`
- Roster: Indexed on `(leagueId, userId)`
- Homeruns: Indexed on `(leagueId, gameDate)` + unique `playByPlayId`

**Cron Optimization:**
- `sync-live-games`: Early exit if no games active
- `homerun-poll`: Early exit if time outside game hours (9 AM - 11 PM ET)
- `draft-timeout`: Early exit if no active drafts

**Connection Pooling:** Neon pooler handles concurrent requests

---

## Deployment Checklist

- [ ] All 17 database migrations applied
- [ ] 5 cron jobs configured in `vercel.json`
- [ ] `NEXT_PUBLIC_ENABLE_SPRING_TRAINING = false` (production)
- [ ] All env vars set in Vercel
- [ ] Pusher channels subscribed on league page
- [ ] Service worker installed (offline caching)
- [ ] VAPID keys generated and stored securely
- [ ] Database backups automated

---

**Next:** See `OPENING_DAY_CUTOVER.md` for March 25 regular season launch procedure.
