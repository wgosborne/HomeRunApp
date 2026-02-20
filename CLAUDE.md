# Fantasy Homerun Tracker PWA

Multi-tenant fantasy baseball league management PWA. Users create/join leagues, draft MLB players, track live homeruns, propose trades, and compete on leaderboards. Mobile-first (iOS 16.4+, Android Chrome). Launching April 2026.

## Current Phase

Week 3 Complete: Homerun polling cron job, live standings & roster APIs, leaderboard UI. Ready for Week 4 (Web Push notifications).

## Tech Stack

- **Language:** TypeScript
- **Frontend/Backend:** Next.js 16.1.6 (App Router) + React 19.2
- **Database:** Neon Postgres + Prisma 6.19.2 ORM (DraftStatus enum added)
- **Auth:** Google OAuth (NextAuth.js v5) + invite cookie flow
- **Real-Time:** Pusher Channels (configured + broadcasting)
- **Notifications:** Native Web Push API (Week 4)
- **PWA:** next-pwa v5 (Week 5)
- **MLB Data:** statsapi.mlb.com (homerun leaders, 5-15s lag)
- **Deployment:** Vercel Pro ($20/month for Cron)

## Core Entities

- **Users:** Google OAuth via NextAuth, session storage in Postgres
- **Leagues:** Commissioner creates, draftStatus enum (pending/active/paused/complete), currentPickStartedAt tracks timer
- **LeagueMemberships:** Multi-tenant scoping, role (commissioner/member)
- **DraftPicks:** Track 10-round draft (60-sec per pick), isPick, autoPickedAt for timeout picks
- **RosterSpots:** Player assignments per user, homerun counts, drafted round/pick info
- **HomerrunEvents:** Cron polls statsapi every 5 min, broadcasts via Pusher
- **Trades:** Propose/accept/reject, veto votes, 48-hour auto-expire
- **PushSubscriptions:** Web Push endpoints for notifications

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
- [ ] Week 4: Web Push notifications
- [ ] Week 5: PWA + offline support
- [ ] Week 6-7: Trading system, polish, launch

## Testing Checklist

Week 3 verified (2026-02-19):
- [x] npm run build succeeds with no errors
- [x] npx tsc --noEmit passes strict mode
- [x] All routes registered (19 endpoints live)
- [x] Homerun polling cron endpoint (returns 401 without CRON_SECRET)
- [x] Standings API endpoint accessible (requires session + league membership)
- [x] Roster API endpoint accessible (returns user's drafted players)
- [x] LeaderboardTab component renders without errors
- [x] MyTeamTab component renders without errors
- [x] Pusher channel subscriptions configured (league-{leagueId})
- [x] HomerrunEvent table schema with unique playByPlayId constraint
- [x] RosterSpot homeruns/points fields increment correctly
- [x] Table HTML structure fixed (no Fragment key warnings)

Previous weeks verified:
- [x] Create league endpoint works
- [x] Join league via invite cookie flow (unauthenticated)
- [x] Draft room with timer, available players, manager list
- [x] Player search filters available players
- [x] Submit pick updates DraftPicks + RosterSpots
- [x] Auto-picks trigger on timeout (cron job)
- [x] Draft completes after 60 picks (10 rounds × 6 members)
- [x] Pusher authentication works (POST /api/pusher/auth)

## Blockers & Notes

**Known Limitations:**
- No live MLB games in February (cron will activate in April when season starts)
- Spring Training typically late Feb, Regular Season April 1
- Homerun polling safe to deploy—returns `{ processed: 0, skipped: 0 }` when no games active

**Deployment Ready:**
- All endpoints secured (auth checks in place)
- Cron jobs configured in vercel.json
- No database migrations needed (schema complete)
- Ready for Vercel deployment with Pro tier ($20/month for cron)

## Useful Commands

```bash
npm run dev              # Start dev server (port 3001)
npm run build            # Build for production
npx prisma studio       # Database GUI
npx prisma db seed      # Run seed script
npx prisma migrate dev  # Create migration
npx tsc --noEmit       # Type check
```

## Key Files (Week 3)

- **app/league/[leagueId]/page.tsx:** League Home + LeaderboardTab + MyTeamTab
- **app/join/[leagueId]/page.tsx:** OAuth invite cookie flow
- **app/draft/[leagueId]/page.tsx:** Draft room page
- **app/draft/[leagueId]/components/DraftRoom.tsx:** Draft UI + polling
- **app/draft/[leagueId]/components/DraftTimer.tsx:** 60-second countdown
- **app/draft/[leagueId]/components/PlayerSearch.tsx:** Player search/selection
- **app/draft/[leagueId]/components/DevPanel.tsx:** Dev controls (development only)
- **app/api/draft/[leagueId]/*.ts:** Draft endpoints (start, status, pick, available, pause, resume, reset, autopick)
- **app/api/cron/draft-timeout/route.ts:** Auto-pick cron job (every 1 min)
- **app/api/cron/homerun-poll/route.ts:** Homerun polling cron job (every 5 min)
- **app/api/leagues/[leagueId]/standings/route.ts:** Leaderboard API (sorted by homeruns)
- **app/api/leagues/[leagueId]/roster/route.ts:** User's roster API
- **lib/mlb-stats.ts:** statsapi integration (fetchTodaysGames, fetchGameHomeruns)
- **lib/pusher-server.ts, lib/pusher-client.ts:** Pusher configuration
- **vercel.json:** Cron schedule configuration

## Database Schema Changes

- **League.draftStatus:** Enum (pending/active/paused/complete) - replaces implicit string tracking
- **League.currentPickStartedAt:** DateTime - set when pick turn starts, reset on each pick for timer calculation

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
- Next: Week 4 Web Push notifications
