# Testing: Fantasy Homerun Tracker PWA

**Last Updated:** 2026-03-15 | **Status:** Week 8 Ready | **Test Suite:** 240+ tests passing

---

## Quick Test Commands

```bash
npm run test                    # Run full test suite (Vitest)
npm run build                   # TypeScript strict build check
npm run dev                     # Start dev server (http://localhost:3001)
npx prisma studio             # View/edit database
```

---

## Test Coverage (240+ tests)

### Unit Tests (Core Logic)
- ✅ **Draft Logic** (60 tests)
  - Timer authority (server-side `currentPickStartedAt`)
  - Round/pick calculations
  - Auto-pick on timeout (best available by position weight)
  - State transitions (pending → active → paused → complete)

- ✅ **Homerun Tracking** (40 tests)
  - Poll detection via `playByPlayId` unique constraint (idempotency)
  - Roster spot updates (`homeruns` increment)
  - No duplicates (constraint prevents re-processing)

- ✅ **Standings & Leaderboard** (35 tests)
  - User ranking by total homeruns
  - Multi-league isolation
  - Real-time Pusher broadcasts

- ✅ **Trading System** (30 tests)
  - Propose/accept/reject flows
  - 48-hour auto-expiration (cron)
  - Season-end lock (409 Conflict when `seasonEndedAt` set)
  - Roster metadata preservation (draftedRound, draftedPickNumber)

- ✅ **End-of-Season** (20 tests)
  - Winner calculation (max homeruns)
  - Season lock (trades blocked, UI shows "season ended")
  - Champion banner display

- ✅ **Auth & Multi-Tenant** (25 tests)
  - Google OAuth + invite cookie flow
  - League isolation by `leagueId`
  - Commissioner-only actions
  - Role validation (member vs. commissioner)

- ✅ **Real-Time & Notifications** (20 tests)
  - Pusher channel subscription
  - Web Push API integration
  - Draft turn suppression (if user actively drafting)
  - Notification payloads (homerun, draft turn, trade)

- ✅ **PWA & Offline** (10 tests)
  - Service worker caching strategy (cache-first static, network-first API)
  - Offline fallback page loads
  - Install prompt on desktop
  - Icons/manifest validation

---

## Manual Test Flows

### 🔐 Test 1: Sign In & Create League
1. [ ] Visit https://fantasy-baseball.vercel.app
2. [ ] Click "Sign in with Google"
3. [ ] Authorize with test Google account
4. [ ] Redirected to dashboard
5. [ ] Click "Create League"
6. [ ] Fill form (name, draft date, etc.)
7. [ ] League created → See in "Your Leagues"
8. [ ] Copy invite link
9. [ ] Open invite in **new private/incognito window**
10. [ ] New user joins via link → sees league in their dashboard

**Expected:** Two users, one league, both as members (or commissioner for creator)

---

### ⚾ Test 2: Complete Draft Flow
**Precondition:** League with 2+ members, at least one draft pick to test

1. [ ] **Start Draft** (as commissioner)
   - [ ] Click "Start Draft" in Settings tab
   - [ ] Confirm dialog appears
   - [ ] `League.draftStatus` changes to "active"
   - [ ] Draft room opens
   - [ ] Timer countdown starts (60 sec)
   - [ ] First picker's turn highlighted

2. [ ] **Make a Pick**
   - [ ] (As first picker) Search for a player
   - [ ] Click player → submit pick
   - [ ] Pick appears in draft history immediately (via Pusher)
   - [ ] Timer resets to 60 sec
   - [ ] Next picker highlighted
   - [ ] Player added to roster (My Team tab)

3. [ ] **Auto-Pick on Timeout**
   - [ ] Wait 60+ seconds without picking
   - [ ] Cron `draft-timeout` fires (every 1 min)
   - [ ] Best available player auto-picked
   - [ ] Move to next picker automatically
   - [ ] Pick marked as `autoPickedAt` (icon shows on draft history)

4. [ ] **Draft Completes**
   - [ ] 10 rounds × N members picks completed
   - [ ] `League.draftStatus` = "complete"
   - [ ] Button changes to "View Standings"
   - [ ] Trades now enabled (unless season ended)

**Real-Time Checks:**
- [ ] Pusher `draft-{leagueId}` channel receives pick events
- [ ] Web Push: Next picker gets "Your turn" notification (if away from app)
- [ ] Leaderboard tab updates with drafted players immediately

---

### 🏠 Test 3: Dashboard & Live Games
1. [ ] Load dashboard
2. [ ] See **Games Grid** (today's MLB schedule)
   - [ ] From `/api/games/today` (cron `sync-live-games` every 2 min)
   - [ ] Shows team names, score, game status
   - [ ] Click game → details open (start time, teams, live score)
3. [ ] See **Recent Homeruns** section
   - [ ] From HomerrunEvent table (cron `homerun-poll` every 5 min)
   - [ ] Shows player name, team, league, inning
4. [ ] See **Your Leagues** cards
   - [ ] Status badge (Pending, Active, Complete)
   - [ ] Scores & standings count

**Real-Time Checks:**
- [ ] Scores update every 5 seconds (polling + Pusher)
- [ ] New homeruns appear within 5 minutes of event
- [ ] No duplicate homeruns (unique `playByPlayId`)

---

### 📊 Test 4: Standings & Leaderboard
1. [ ] Navigate to league home
2. [ ] Click **Leaderboard** tab
3. [ ] See all members ranked by homerun count
4. [ ] Click member row → Expand roster (headshots load)
5. [ ] Verify players show in correct league (multi-league isolation)
6. [ ] Verify headshots load from MLB CDN (img.mlbstatic.com)
7. [ ] Player detail page: Click player name → See homerun history

**Real-Time Checks:**
- [ ] Standings update within 5 sec of homerun event
- [ ] Pusher broadcasts ranking changes
- [ ] 5-sec polling fallback (if Pusher down)

---

### 🤝 Test 5: Trading System
1. [ ] Navigate to **Trades** tab
2. [ ] Click "Propose Trade"
3. [ ] Select your player (dropdown)
4. [ ] Select recipient user & their player
5. [ ] Submit → Trade appears with status "pending"
6. [ ] **As receiver:** See trade in your Trades tab
7. [ ] [ ] Click "Accept" or "Reject"
   - [ ] If Accept: Rosters swap, trade status="accepted", players moved
   - [ ] If Reject: Trade status="rejected", rosters unchanged
8. [ ] Verify **48-hour expiration** (cron `trade-expire` every 5 min)
   - [ ] Create trade, wait or manually trigger cron
   - [ ] After 48h, status="expired", action disabled

**Season Lock Test:**
- [ ] End the season (see Test 8)
- [ ] Try to propose trade → GET 409 Conflict
- [ ] Button hidden, message: "Season ended—trades locked"

**Real-Time Checks:**
- [ ] Pusher broadcasts trade proposal to receiver
- [ ] Web Push: Receiver gets "Trade proposal" notification
- [ ] Rosters update immediately on accept/reject

---

### 🏆 Test 6: End-of-Season
**Precondition:** Completed draft, at least one homerun detected

1. [ ] Distribute some homeruns (manually via test endpoint or real games)
   - [ ] Test endpoint: `POST /api/cron/homerun-poll` (with CRON_SECRET)
   - [ ] Or wait for real game homerun
2. [ ] Navigate to **Settings** tab
3. [ ] "End Season" button appears (only if draft complete)
4. [ ] Click "End Season" → Confirmation dialog
5. [ ] Confirm → Winner calculated (user with most homeruns)
6. [ ] Champion banner appears on league home: "🏆 [Name] won with 12 homeruns!"
7. [ ] `League.seasonEndedAt` is set, `League.winnerId` populated
8. [ ] User's profile shows league in "Leagues Won" section

**Lock Tests:**
- [ ] Try to propose trade → 409 Conflict
- [ ] Try to accept pending trade → 409 Conflict
- [ ] Trades tab shows read-only lock message
- [ ] HR Leaders page shows final counts (frozen)

**Real-Time Checks:**
- [ ] Pusher broadcasts `season-ended` to all members
- [ ] All users see champion banner immediately

---

### 📱 Test 7: Notifications (Web Push)
**Precondition:** Chrome/Firefox/Edge (not iOS Safari—not supported)

1. [ ] Open league page
2. [ ] Find bell icon in header (top right)
3. [ ] Click bell → Notification settings popup
4. [ ] Click "Enable Notifications"
5. [ ] Browser asks for permission → Click "Allow"
6. [ ] Bell shows green dot, status: "Enabled"
7. [ ] Subscription stored in DB (`PushSubscription` table)

**Test Each Notification Type:**
- [ ] **Homerun Alert:** Manually trigger `POST /api/cron/homerun-poll` (dev endpoint)
  - [ ] Should receive notification: "[Player] hit a homerun! [Team], [Inning] inning."
- [ ] **Draft Turn:** In active draft, wait for turn or manually trigger
  - [ ] Should receive: "Your turn to pick! [Prev player] just picked. 60 seconds."
  - [ ] **Suppressed if actively in draft room** (Pusher updates sufficient)
- [ ] **Trade Proposal:** (As user B) Have user A propose trade
  - [ ] Should receive: "Trade proposal from [User A]: Your [Player] for their [Player]"
- [ ] **Trade Response:** Accept/reject trade as receiver
  - [ ] Should receive: "Trade accepted!" or "Trade rejected."

**Disable Test:**
- [ ] Click bell → Toggle "Disable Notifications"
- [ ] Confirm disabled (red/grey dot)
- [ ] Try notification again → Should NOT appear

---

### 🔌 Test 8: Offline & PWA
**Requirements:** Desktop Chrome/Edge (Android Chrome also supported)

1. [ ] Load app → DevTools → Application tab
2. [ ] Service Worker installed & active
3. [ ] Cache storage shows offline assets
4. [ ] **Go offline:** DevTools → Network → Throttling → Offline
5. [ ] Navigate to different page → Offline page loads (fallback)
6. [ ] Scroll → See "You're offline" banner
7. [ ] **Go online:** Revert throttling → Page reloads, normal content

**Install Prompt (Desktop):**
1. [ ] Load app on desktop (Chrome/Edge)
2. [ ] Wait 2-3 seconds
3. [ ] "Install" prompt appears (address bar area)
4. [ ] Click "Install"
5. [ ] App installed → Can launch from home screen / app menu
6. [ ] App runs in window mode (no browser chrome)

**PWA Features:**
- [ ] Icons load (144px, 192px, 512px, favicon)
- [ ] Manifest theme color applied
- [ ] Status bar color correct (navy #0E3386)
- [ ] Splash screens show on iOS (if installed)

---

### 👤 Test 9: User Profile & Settings
1. [ ] Click user avatar (top right header)
2. [ ] Click "Profile"
3. [ ] See display name, email, sign-out button
4. [ ] Click "Edit" → Edit name → Save
5. [ ] Name updates via `/api/user/update-name`
6. [ ] See "Leagues Won" section (if any completed seasons)
7. [ ] Click "Sign Out" → Logged out, redirected to home

---

### 🔍 Test 10: Data Isolation & Security
**Multi-tenant safety checks:**

1. [ ] **League Isolation:**
   - [ ] User in League A → Check leaderboard
   - [ ] Verify can only see League A members (not League B players)
   - [ ] URL hack: Try `/api/leagues/[leagueB]/standings` (not a member)
   - [ ] Should get 403 Forbidden or 404

2. [ ] **Commissioner Guards:**
   - [ ] As member (not commissioner) → Try "Start Draft" button
   - [ ] Button disabled or hidden
   - [ ] Try POST to `/api/draft/[id]/start` directly
   - [ ] Should get 403 Forbidden

3. [ ] **Role Validation:**
   - [ ] Verify only commissioners see "End Season" button
   - [ ] Verify only trade receiver can accept/reject trades
   - [ ] Verify trades can only be proposed between members in same league

---

## Cron Job Testing

### Manual Trigger Commands
```bash
# Trigger homerun poll (detects homeruns from active games)
curl -X POST http://localhost:3001/api/cron/homerun-poll \
  -H "x-cron-secret: your_cron_secret_here"

# Sync live games (fetches today's schedule)
curl -X POST http://localhost:3001/api/cron/sync-live-games \
  -H "x-cron-secret: your_cron_secret_here"

# Sync player stats (updates 1000+ players' season stats)
curl -X POST http://localhost:3001/api/cron/sync-player-stats \
  -H "x-cron-secret: your_cron_secret_here"

# Test all notification types
curl -X POST http://localhost:3001/api/notifications/test \
  -H "x-cron-secret: your_cron_secret_here"
```

### What to Verify
| Cron | Verify | Expected |
|------|--------|----------|
| `sync-live-games` | Check `Game` table | Today's games appear (gameType='R') |
| `homerun-poll` | Check `HomerrunEvent` table | New HR records with unique `playByPlayId` |
| `sync-player-stats` | Check `Player.lastStatsUpdatedAt` | Recent timestamp |
| `draft-timeout` | Active draft, wait 60s | Auto-pick fires, next picker picked |
| `trade-expire` | Create trade, wait 48h+ (or trigger manually) | Status changes to 'expired' |

---

## Known Limitations & Notes

### Spring Training → Regular Season (March 25 Cutover)
- **Before:** App shows mock spring training games + data
- **After:** Real MLB regular season games + data
- **Flag:** `NEXT_PUBLIC_ENABLE_SPRING_TRAINING = false` (production)
- **Cleanup:** All spring HRs deleted, rosters reset to 0, Player stats reset to 0
- **See:** `Handoffs/regular-season-deploy/OPENING_DAY_CUTOVER.md` for full procedure

### iOS Safari Limitations
- Web Push API NOT supported (Apple restriction)
- Notification bell hidden on iOS
- No fallback (users must use Android Chrome or desktop)

### Off-Hours (March 2026)
- No live MLB games → `sync-live-games` returns 0 games
- Fallback to mock spring training games (dev/testing only)
- Starting March 25: Real regular season games active

### Performance
- Dashboard loads < 2 seconds (cached)
- Standings calculation < 1 second
- Real-time updates 5-15 seconds (via Pusher + polling)

---

## Debugging Tips

**Pusher Not Broadcasting?**
- Check `NEXT_PUBLIC_PUSHER_KEY` in browser console (DevTools)
- Verify channel subscription: DevTools → Network → Look for Pusher handshake
- Check Pusher dashboard for broadcast events

**Homeruns Not Detecting?**
- Verify `sync-live-games` ran (check Game table for today's games)
- Verify game is actually live (check MLB.com)
- Check `homerun-poll` logs for errors
- Manually trigger: `POST /api/cron/homerun-poll`

**Notifications Not Working?**
- Check browser permission: Settings → Site Settings → Notifications
- Verify PushSubscription record in DB
- Check VAPID keys are set in .env
- Test with manual endpoint: `POST /api/notifications/test`

**Draft Timer Wrong?**
- Verify `currentPickStartedAt` is being set in DB
- Check server time (may be off from client)
- Verify `draft-timeout` cron is firing (Vercel logs)

---

## CI/CD Checks (Pre-Deployment)

```bash
npm run build              # Must pass (TypeScript strict, no errors)
npm run test               # Must pass (240+ tests)
npm run lint               # Code quality (if configured)
npm run type-check         # Type safety
npx prisma db push        # Apply any pending migrations
```

---

**Next:** See `CLAUDE.md` for full project context or `07-how-it-works.md` for architecture details.
