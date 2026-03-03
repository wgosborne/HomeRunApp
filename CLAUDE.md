# Fantasy Homerun Tracker PWA

Multi-tenant fantasy baseball league management PWA. Users create/join leagues, draft MLB players, track live homeruns, propose trades, and compete on leaderboards. Mobile-first (iOS 16.4+, Android Chrome). Launching April 2026.

## Current Phase

Week 7 - Design & Testing: Weeks 1-6 complete (foundation, draft room, homerun polling, Web Push notifications, PWA offline support, trading system). Implementer building player detail page feature (view player info + homerun history with back navigation). Testing full user flows, designing landing page, preparing for April launch.

## Tech Stack

- **Language:** TypeScript
- **Frontend/Backend:** Next.js 16.1.6 (App Router) + React 19.2
- **Database:** Neon Postgres + Prisma 6.19.2 ORM (DraftStatus enum added)
- **Auth:** Google OAuth (NextAuth.js v5) + invite cookie flow
- **Real-Time:** Pusher Channels (configured + broadcasting)
- **Notifications:** Native Web Push API (Service Worker, VAPID keys)
- **PWA:** next-pwa v5 (manifest, offline caching, install prompt)
- **MLB Data:** statsapi.mlb.com (homerun leaders, 5-15s lag)
- **Deployment:** Vercel Pro ($20/month for Cron)

## Core Entities

- **Users:** Google OAuth via NextAuth, session storage in Postgres
- **Leagues:** Commissioner creates, draftStatus enum (pending/active/paused/complete), currentPickStartedAt tracks timer
- **LeagueMemberships:** Multi-tenant scoping, role (commissioner/member)
- **DraftPicks:** Track 10-round draft (60-sec per pick), isPick, autoPickedAt for timeout picks
- **RosterSpots:** Player assignments per user, homerun counts, drafted round/pick info
- **HomerrunEvents:** Cron polls statsapi every 5 min, broadcasts via Pusher + Web Push
- **PushSubscriptions:** Web Push endpoints (service worker, VAPID encryption)
- **Trades:** 1:1 player swaps, propose/accept/reject, 48-hour auto-expire, no veto voting (MVP)

## API Endpoints (Live)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/leagues` | Create league |
| GET | `/api/leagues` | List user's leagues |
| GET | `/api/leagues/[id]` | Get league details (with memberships) |
| POST | `/api/leagues/[id]/join` | Join via invite link |
| GET | `/api/leagues/[leagueId]/standings` | Leaderboard (all members ranked by homeruns) |
| GET | `/api/leagues/[leagueId]/roster` | User's roster with player stats |
| POST | `/api/draft/[leagueId]/start` | Start draft (commissioner only) |
| GET | `/api/draft/[leagueId]/status` | Get draft state (timer, current picker) |
| POST | `/api/draft/[leagueId]/pick` | Submit a pick |
| GET | `/api/draft/[leagueId]/available` | Get available players from statsapi |
| POST | `/api/draft/[leagueId]/pause` | Pause draft (commissioner only) |
| POST | `/api/draft/[leagueId]/resume` | Resume draft (commissioner only) |
| POST | `/api/draft/[leagueId]/reset` | Reset draft (commissioner only, dev) |
| POST | `/api/draft/[leagueId]/autopick` | Trigger auto-pick manually (dev) |
| POST | `/api/cron/draft-timeout` | Auto-pick on 60s timeout (cron secret required) |
| POST | `/api/cron/homerun-poll` | Poll MLB games for homeruns (cron secret required) |
| POST | `/api/pusher/auth` | Authenticate Pusher channel subscription |
| POST | `/api/invite` | Set/clear invite cookie |
| POST | `/api/notifications/subscribe` | Subscribe to Web Push notifications |
| POST | `/api/notifications/unsubscribe` | Unsubscribe from Web Push notifications |
| POST | `/api/notifications/test` | Test notification (dev/cron only) |
| POST | `/api/trades/[leagueId]` | Propose 1:1 player trade |
| GET | `/api/trades/[leagueId]` | List league trades (with status filters) |
| POST | `/api/trades/[leagueId]/[tradeId]/accept` | Accept trade (receiver only) |
| POST | `/api/trades/[leagueId]/[tradeId]/reject` | Reject trade (receiver only) |
| POST | `/api/cron/trade-expire` | Auto-expire trades after 48 hours (cron) |
| GET | `/player/[leagueId]/[playerId]` | Player detail page (info + homerun history) |
| GET | `/api/user/profile` | Get current user profile |
| POST | `/api/user/update-name` | Update user display name |
| GET | `/profile` | User profile page |
| GET | `/homeruns` | All homeruns across all leagues |

## Key Decisions

- **DraftStatus enum:** Prevents invalid state transitions, explicit status tracking
- **currentPickStartedAt:** Server timestamp for timer authority (prevents client desync)
- **OAuth invite cookie:** Unauthenticated users can click join link, cookie stored until OAuth callback
- **Dual Pusher channels:** `draft-{leagueId}` for draft events, `league-{leagueId}` for homerun/standing updates
- **Auto-pick cron:** Runs every 1 minute, checks `currentPickStartedAt < now - 60s`, auto-picks best available
- **Homerun poll cron:** Runs every 5 minutes (MLB API 5-15s lag), idempotent via playByPlayId constraint
- **Dev panel (development only):** Toggleable controls for pause/resume/reset/auto-pick testing
- **Server-side standings:** Sorted by total homeruns, no client-side calculations needed
- **5-second polling fallback:** UI polls standings/roster every 5s even with Pusher for reliable updates
- **Service Worker + Push:** Native Web Push API (not vendor-specific), VAPID encryption, works on Android/Chrome
- **PWA manifest:** Icons (144x144, 192x192, 320x320, 512x512), install prompt, offline-first caching strategy
- **Trading system:** 1:1 player swaps (simplified MVP), no veto voting, hard 48h expiration via cron
- **Roster metadata preserved:** Homerun counts, drafted round/pick info maintained during trades
- **Duplicate trade prevention:** Only one active proposal per user pair at a time
- **Player detail page:** Accessible from draft room, my team, leaderboard, dashboard via clickable player names/avatars
- **Back navigation:** Uses browser history to return to previous context (preserved across navigation)
- **Player headshots:** MLB CDN via mlbId (img.mlb.com/headshot/crop), fallback to initials avatar

## How to Run

```bash
npm install
npm run dev
# Runs http://localhost:3001

npx prisma studio
# View/edit database
```

**Test flow:**
1. Sign in with Google OAuth
2. Create league (need 2+ members to start draft)
3. Share invite link to other users
4. As commissioner, click "Start Draft" on League Home
5. Enter draft room, pick players (60 sec per pick)
6. Auto-picks trigger on timeout (cron job)
7. Draft completes after 10 rounds

## Current Status

- [x] Week 1: Foundation complete
  - [x] Auth, leagues, multi-tenant guards
  - [x] League CRUD endpoints working
- [x] Week 2: Draft room + Pusher real-time
  - [x] DraftStatus enum (pending/active/paused/complete)
  - [x] OAuth invite cookie flow for sign-in
  - [x] League Home with 5 tabs (Draft, Leaderboard, My Team, Players, Settings)
  - [x] Draft room UI with timer component + player search
  - [x] Draft API (start, status, pick, available, pause, resume, reset)
  - [x] Auto-pick cron job (every 1 min, timeouts after 60 sec)
  - [x] Pusher real-time events (pick-made, draft-started, draft-paused, etc.)
  - [x] Dev panel for testing (pause/resume/reset/auto-pick)
  - [x] Server-side timer (prevents client desync)
  - [x] TypeScript strict, build succeeds
- [x] Week 3: Homerun polling + Standings leaderboard
  - [x] MLB live game polling (fetchTodaysGames, fetchGameHomeruns)
  - [x] Homerun detection cron job (every 5 min, idempotent)
  - [x] HomerrunEvent table with unique constraint
  - [x] Standings API endpoint (leaderboard by total homeruns)
  - [x] Roster API endpoint (user's drafted players + stats)
  - [x] LeaderboardTab component (ranked table, expandable rows)
  - [x] MyTeamTab component (team summary + roster list)
  - [x] Pusher broadcasting homerun events (league-{leagueId} channel)
  - [x] TypeScript strict, build succeeds
- [x] Week 4: Web Push notifications
  - [x] Service worker (public/sw.js) for push event handling
  - [x] NotificationBell UI component + subscription flow
  - [x] Push service library (sendPushToUser, sendPushToLeague)
  - [x] Subscribe/unsubscribe endpoints with DB storage
  - [x] Test endpoint for manual notification triggering
  - [x] Homerun push alerts (player name, team, inning, count)
  - [x] Draft turn notifications (first picker, next picker)
  - [x] VAPID key configuration + encryption
  - [x] TypeScript strict, build succeeds (24.3s)
- [x] Week 5: PWA + offline support
  - [x] Web app manifest with responsive icons
  - [x] Install prompt UI component
  - [x] Service worker enhanced offline caching (cache-first static, network-first API)
  - [x] OfflineIndicator component showing connection status
  - [x] Offline fallback page
  - [x] Icon validation (144x144, 192x192, 320x320, 512x512)
  - [x] Build optimization with Turbopack (25% faster)
  - [x] TypeScript strict, build succeeds
- [x] Week 6: Trading system (completed 2026-02-21)
  - [x] TradeStatus enum (pending/accepted/rejected/expired)
  - [x] 1:1 player swap API (propose, accept, reject, list)
  - [x] TradesTab component with proposal form
  - [x] 48-hour expiration cron job (every 5 min)
  - [x] Pusher real-time broadcasts (trade events)
  - [x] Web Push notifications (proposal/response)
  - [x] Roster metadata preservation during swaps
  - [x] Duplicate trade prevention
  - [x] All 28+ endpoints live and tested
  - [x] Bug fixes: roster userId parameter, draft timer, redirect path
  - [x] TypeScript strict, build succeeds
- [ ] Week 7: Design & Testing (in progress - 2026-03-03)
  - [x] Mobile-first layout refactor (TabNavigation, responsive cards, sticky headers)
  - [x] Player headshots integrated (MLB CDN via mlbId)
  - [x] Player detail page implementation (info + homerun history, back nav)
  - [x] NotificationDropdown component (bell icon, subscription status toggle)
  - [x] UserMenu component (avatar button, profile + sign out)
  - [x] Profile page (/profile) with editable display name
  - [x] Profile API endpoint (/api/user/update-name)
  - [x] All homeruns page (/homeruns) with sorting and filters
  - [x] Dashboard header refactor (new components, cleaner layout)
  - [ ] Landing page design and implementation
  - [ ] Full user flow testing (create league → draft → view player → track homeruns → trade → compete)
  - [ ] Mobile responsiveness verification (iOS 16.4+, Android Chrome)
  - [ ] Performance optimization and build size review
  - [ ] Cross-browser testing (Safari, Chrome, Firefox)
  - [ ] Offline mode edge case testing
  - [ ] Pre-launch checklist completion

## Testing Checklist (All Green)

Weeks 1-7 verified (2026-03-03):
- [x] npm run build succeeds (TypeScript strict, all routes registered)
- [x] Auth works (Google OAuth, invite cookie flow)
- [x] Draft room complete (start/pick/auto-pick/pause/resume/reset)
- [x] Standings/roster APIs working (multi-league, real-time updates)
- [x] Homerun polling & Pusher broadcasting live
- [x] Web Push notifications (subscribe/send/test)
- [x] PWA manifest valid (icons, offline caching, install prompt)
- [x] Trading system complete (propose/accept/reject, 48h expiration)
- [x] Player detail page working (info, headshots, history, back nav)
- [x] Profile page working (display name edit, sign out)
- [x] NotificationDropdown/UserMenu in header
- [x] All homeruns page with sorting
- [x] Service worker caching configured

## Blockers & Notes

**Known Limitations:**
- iOS Safari: No Web Push API (native app only, in-app notifications fallback)
- No live MLB games in February (cron will activate in April when season starts)
- Spring Training typically late Feb, Regular Season April 1
- Homerun polling safe to deploy—returns `{ processed: 0, skipped: 0 }` when no games active

**Deployment Ready:**
- All endpoints secured (auth checks in place)
- Cron jobs configured in vercel.json
- No database migrations needed (schema complete)
- PWA fully functional (manifest, service worker, offline caching)
- Ready for Vercel deployment with Pro tier ($20/month for cron)
- VAPID keys required for Web Push (generated via web-push CLI)

## Useful Commands

```bash
npm run dev              # Start dev server (port 3001)
npm run build            # Build for production
npx prisma studio       # Database GUI
npx prisma db seed      # Run seed script
npx prisma migrate dev  # Create migration
npx tsc --noEmit       # Type check
```

## Key Files (Week 7 Additions)

Week 7 new files:
- **/app/player/[leagueId]/[playerId]/page.tsx** - Player detail (info, headshots, homerun history, back nav)
- **/app/profile/page.tsx** - User profile (edit display name, sign out)
- **/app/homeruns/page.tsx** - All homeruns feed (multi-league, sortable)
- **/app/components/NotificationDropdown.tsx** - Bell dropdown (subscription toggle)
- **/app/components/UserMenu.tsx** - Avatar menu (profile link, sign out)
- **/app/api/user/update-name/route.ts** - Profile API endpoint

Core pages/routes:
- **/app/league/[leagueId]/page.tsx** - League home (6 tabs)
- **/app/draft/[leagueId]/page.tsx** - Draft room
- **/app/dashboard/page.tsx** - Dashboard with live games/homeruns

APIs (full list in table above):
- **/app/api/draft/** - Draft endpoints (start, pick, status, available, pause, resume)
- **/app/api/cron/** - Auto-picks, homerun polling, trade expiration
- **/app/api/leagues/** - League CRUD, standings, roster
- **/app/api/trades/** - Trade proposals, accept/reject
- **/app/api/notifications/** - Push subscription/unsubscribe/test
- **/app/api/pusher/auth** - Real-time channel auth

Infrastructure:
- **/lib/mlb-stats.ts** - MLB API integration
- **/lib/pusher-server.ts, lib/pusher-client.ts** - Real-time config
- **/lib/push-service.ts** - Web Push sending
- **/public/sw.js** - Service worker + push handler
- **/public/manifest.json** - PWA manifest
- **/vercel.json** - Cron job schedule

## Database Schema Changes

- **League.draftStatus:** Enum (pending/active/paused/complete) - replaces implicit string tracking
- **League.currentPickStartedAt:** DateTime - set when pick turn starts, reset on each pick for timer calculation
- **Trade.status:** Enum (pending/accepted/rejected/expired) - tracks trade lifecycle (Week 6)
- **Trade.expiresAt:** DateTime - 48-hour deadline from creation (Week 6)

## Costs

- **MVP:** $20/month Vercel Pro (Cron required for auto-picks)
- **Neon:** Free tier (10GB, shared compute)
- **Pusher:** Free tier (100 concurrent)
- **All others:** Zero cost

## Team Notes

- Port 3001 (fixed from default 3000)
- Schema complete (no breaking migrations)
- Draft timer is server-authoritative to prevent desync
- Auto-picks run via cron (1-min checks, requires CRON_SECRET env var)
- Homerun polling runs every 5 minutes (MLB API lag 5-15s)
- Idempotent homerun detection via unique playByPlayId constraint
- Dev panel only visible in development mode
- Seed includes 50+ real MLB players from 2024
- Leaderboard rankings update in real-time (5-sec polling + Pusher)
- Web Push notifications trigger on homerun/draft events (Android/Chrome, iOS fallback to in-app)
- PWA fully offline-capable with service worker caching
- Trading system: 1:1 player swaps, no veto voting (MVP simplified), 48h expiration cron
- Player detail page: clickable from draft room, my team, leaderboard, dashboard with back nav
- Player headshots: MLB CDN (img.mlb.com/headshot/crop) via mlbId, initials fallback
- NotificationDropdown: Bell icon with subscription status toggle in dashboard header
- UserMenu: Avatar button in header with profile link and sign out
- Profile page: Edit display name (shown in leagues), responsive dark theme
- All homeruns page: Multi-league homerun feed with sort options (Recent/Player/League)
- Bug fixes: roster endpoint userId parameter, draft timer waits for player load, proper redirect after draft
- Week 7 completed: New UI components, profile management, expanded homerun views
- Next: Landing page design, full flow testing, app store preparation
