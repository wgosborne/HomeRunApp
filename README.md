# Fantasy Homerun Tracker PWA

Multi-tenant fantasy baseball league management PWA. Create/join leagues, draft MLB players, track live homeruns, propose 1:1 trades, compete on leaderboards. Mobile-first (iOS 16.4+, Android Chrome). **Week 8 complete. Production-ready. Launch: March 25, 2026 (opening day).**

---

## Quick Start

```bash
npm install
npm run dev
# Runs on http://localhost:3001
```

**Test flow:** Sign in → Create league → Invite others → Start draft → Pick players → Track homeruns → Propose trades → End season

---

## Features (All Complete)

- ✅ **Week 1:** Google OAuth + multi-tenant leagues
- ✅ **Week 2:** 10-round snake draft (60 sec/pick) with real-time Pusher + auto-pick cron
- ✅ **Week 3:** Live homerun polling (5 min) + leaderboard + roster tracking
- ✅ **Week 4:** Native Web Push notifications (homerun alerts, draft turns, trades)
- ✅ **Week 5:** PWA offline support (cached data + service worker)
- ✅ **Week 6:** Trading system (1:1 swaps, 48-hour expiration)
- ✅ **Week 7:** Design polish + player detail pages + profile + all homeruns feed
- ✅ **Week 8:** End-of-season feature (crown winners, lock trades, champion banner)

---

## Tech Stack

- **Frontend:** Next.js 16 + React 19 + TypeScript (strict)
- **Backend:** Next.js API Routes + Prisma 6
- **Database:** Neon Postgres (free tier)
- **Auth:** NextAuth.js v5 + Google OAuth
- **Real-Time:** Pusher Channels (free tier)
- **Notifications:** Native Web Push API + Service Worker
- **PWA:** next-pwa v5 (offline, install prompt, headshots)
- **MLB Data:** statsapi.mlb.com (5-15s lag)
- **Deployment:** Vercel Pro ($20/mo for cron)

---

## Cron Jobs (5 Running)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `sync-live-games` | Every 2 min | Fetch today's MLB schedule (Game table) |
| `homerun-poll` | Every 5 min | Detect homeruns, broadcast + notify |
| `sync-player-stats` | Nightly (7 UTC) | Refresh 1000+ players' seasonal stats |
| `draft-timeout` | Every 1 min | Auto-pick after 60s (skip if no drafts) |
| `trade-expire` | Every 5 min | Expire trades at 48h deadline |

All crons have early-exit guards. See `Handoffs/07-how-it-works.md` for details.

---

## Key Architecture

| Decision | Rationale |
|----------|-----------|
| **Server-side timer** | Prevents client desync in draft countdown |
| **DraftStatus enum** | Explicit state machine (pending→active→paused→complete) |
| **Multi-tenant scoping** | Prisma middleware enforces league isolation |
| **Dual Pusher channels** | `draft-{id}` for picks, `league-{id}` for homeruns/trades |
| **Idempotent homerun detection** | Unique `playByPlayId` constraint |
| **Season-end lock** | Blocks trades when `seasonEndedAt` is set |
| **Native Web Push** | Works Android/Chrome; iOS fallback hidden |
| **5-sec polling fallback** | Complements Pusher for reliability |

---

## API Endpoints (40+)

**Leagues:** Create, list, join, standings, roster, end-season
**Draft:** Start, status, pick, available, pause, resume, reset, auto-pick
**Trades:** Propose, accept, reject, list, expire (48h)
**Homeruns:** Poll, broadcast, notify
**Notifications:** Subscribe, unsubscribe, test
**User:** Profile, update name
**Cron:** All 5 jobs above

See `CLAUDE.md` for full reference.

---

## Testing & Status

**Build:** ✅ `npm run build` (TypeScript strict, ~25s)

**Tests:** ✅ `npm run test` (240+ tests passing)

**Manual Tests (All Pass 2026-03-15):**
- ✅ Google OAuth login + invite cookie
- ✅ 10-round draft with auto-picks + timer
- ✅ Real-time Pusher (draft, homeruns, trades)
- ✅ Standings/roster with live updates
- ✅ Web Push (homerun alerts, draft turns, trade proposals)
- ✅ PWA install + offline caching
- ✅ Trading (propose, accept, reject, 48h expire)
- ✅ Player detail pages + headshots (MLB CDN)
- ✅ User profile (edit name, leagues won)
- ✅ All homeruns feed (multi-league, sortable)
- ✅ End-of-season (winner calc, trade lock, banner)
- ✅ Multi-league isolation (security verified)

**Known Limitations:**
- iOS Safari: No Web Push API (PWA install still works)
- March 2026: Mock spring training games until March 25
- MVP scope: 1:1 trades only (no multi-player, no veto)

---

## Environment Variables

Required (see `.env.example`):
```env
DATABASE_URL=[Neon Postgres]
CRON_SECRET=[secure random]
NEXTAUTH_SECRET=[secure random]
NEXTAUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER
NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
NEXT_PUBLIC_ENABLE_SPRING_TRAINING=false (production)
```

---

## Useful Commands

```bash
npm run dev                 # Dev server (http://localhost:3001)
npm run build               # Production build
npm run test                # Run 240+ tests
npx tsc --noEmit           # Type check
npx prisma studio          # Database GUI (localhost:5555)
npx prisma db seed         # Load test data (1000+ MLB players)
npx prisma migrate dev      # Create new migration
```

---

## Documentation

**Quick References:**
- **`CLAUDE.md`** - Project snapshot (status, features, deployments)
- **`Handoffs/07-how-it-works.md`** - Architecture (data sources, crons, flows)
- **`Handoffs/05-test.md`** - Testing guide (manual flows, debugging)

**Detailed Guides:**
- **`Handoffs/01-requirements.md`** - Business requirements
- **`Handoffs/02-architecture.md`** - System design + trade-offs
- **`Handoffs/03-implementer.md`** - Implementation details
- **`Handoffs/04-designer.md`** - Design decisions
- **`Handoffs/regular-season-deploy/OPENING_DAY_CUTOVER.md`** - March 25 launch procedure

---

## Deployment

**Status:** Production-ready (stage branch verified, main stable at Week 7).

**March 25 Cutover:**
1. Execute `OPENING_DAY_CUTOVER.md` (database cleanup, flag flip, verification)
2. Deploy to production
3. Monitor crons + Pusher broadcasts (48h)

**Pre-Deploy Checklist:**
- [ ] `npm run test` passes (240+ tests)
- [ ] `npm run build` succeeds
- [ ] All 17 migrations applied to production DB
- [ ] Vercel cron jobs configured (vercel.json)
- [ ] Env vars set (DATABASE_URL, CRON_SECRET, Pusher, VAPID)
- [ ] `NEXT_PUBLIC_ENABLE_SPRING_TRAINING=false` (production)

---

**Status:** Week 8 complete + production-ready. Regular season launch March 25, 2026. See `CLAUDE.md` or `OPENING_DAY_CUTOVER.md` for next steps.
