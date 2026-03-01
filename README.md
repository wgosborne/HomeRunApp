# Fantasy Homerun Tracker PWA

Multi-tenant fantasy baseball league management PWA. Create/join leagues, draft MLB players, track live homeruns, propose 1:1 trades, compete on leaderboards. Mobile-first (iOS 16.4+, Android Chrome). **Weeks 1-6 complete. Week 7 (Design & Testing) in progress. Launch target: April 2026.**

---

## Quick Start

```bash
npm install
npm run dev
# Runs on http://localhost:3001
```

**Test flow:** Sign in → Create league → Invite others → Start draft → Pick players → Track homeruns → Propose trades

---

## Tech Stack

- **Frontend:** Next.js 16.1.6 + React 19.2 + TypeScript (strict)
- **Backend:** Next.js API Routes + Prisma 6.19.2
- **Database:** Neon Postgres (free tier)
- **Auth:** NextAuth.js v5 + Google OAuth
- **Real-Time:** Pusher Channels (free tier)
- **Notifications:** Native Web Push API
- **PWA:** next-pwa v5 + Service Worker
- **MLB Data:** statsapi.mlb.com (5-15s lag)
- **Deploy:** Vercel Pro ($20/month for cron)

---

## Features (Weeks 1-6 Complete)

- ✅ Week 1: Google OAuth + multi-tenant leagues
- ✅ Week 2: 10-round snake draft (60 sec/pick) with real-time Pusher + auto-pick cron
- ✅ Week 3: Live homerun polling (5 min intervals) + leaderboard + roster tracking
- ✅ Week 4: Native Web Push notifications (homerun alerts, draft turns, trade events)
- ✅ Week 5: PWA with offline support (cached standings/roster + service worker)
- ✅ Week 6: Trading system (1:1 player swaps, accept/reject, 48-hour expiration)

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Server-side timer** | Prevents client desync in draft countdown |
| **DraftStatus enum** | Explicit state machine (pending→active→paused→complete) |
| **OAuth invite cookie** | Unauthenticated users can join, auto-auth on callback |
| **Dual Pusher channels** | `draft-{leagueId}` for picks, `league-{leagueId}` for homeruns/trades |
| **Idempotent homerun detection** | Unique `playByPlayId` constraint (safe to retry) |
| **Auto-pick cron (1 min)** | Checks if 60s elapsed since `currentPickStartedAt` |
| **1:1 trade swaps** | MVP simplified (no multi-player, no veto voting) |
| **48-hour hard expiration** | Cron auto-expires, no manual extension |
| **Native Web Push** | Works Android/Chrome; iOS Safari falls back to in-app |
| **Multi-tenant isolation** | Prisma middleware enforces league scoping |

---

## API Endpoints (28+ Live)

**Leagues:** POST/GET `/api/leagues`, GET/POST `/api/leagues/[id]`, POST `/api/leagues/[id]/join`

**Draft:** POST/GET `/api/draft/[leagueId]/*` (start, status, pick, available, pause, resume, reset, autopick)

**Standings:** GET `/api/leagues/[leagueId]/standings`, GET `/api/leagues/[leagueId]/roster[?userId]`

**Trades:** POST/GET `/api/trades/[leagueId]`, POST `/api/trades/[leagueId]/[id]/{accept,reject}`

**Cron:** POST `/api/cron/{draft-timeout,homerun-poll,trade-expire}` (requires `CRON_SECRET`)

**Notifications:** POST `/api/notifications/{subscribe,unsubscribe,test}`

See `CLAUDE.md` for full endpoint reference.

---

## Testing & Build Status

**Build:** ✅ `npm run build` succeeds (Turbopack optimized, ~25s)

**TypeScript:** ✅ `npx tsc --noEmit` passes strict mode

**Manual Tests (All Pass 2026-02-28):**
- ✅ Google OAuth login → direct to dashboard (fixed double-signin flow)
- ✅ Create/join leagues with invite cookie flow
- ✅ 10-round draft with server-side timer + auto-pick on timeout
- ✅ Player search and pick submission
- ✅ Real-time Pusher broadcasts (draft events, homerun alerts, trade updates)
- ✅ Standings leaderboard (ranked by total homeruns)
- ✅ My Team roster with drafted round/pick metadata
- ✅ Web Push subscription (Android/Chrome), homerun notifications, draft turn alerts
- ✅ PWA manifest validation (icons 144/192/320/512px), install prompt, offline caching
- ✅ Trade proposals, acceptance, rejection, 48-hour expiration
- ✅ Duplicate trade prevention (only 1 active per user pair)
- ✅ Service worker registration on app startup
- ✅ OfflineIndicator shows connection status
- ✅ Responsive design on mobile/tablet

**Known Issues:** None critical. iOS Safari lacks Web Push API (PWA install still works).

---

## Environment Variables

See `.env.example`. Required:
```env
DATABASE_URL=[Neon Postgres URL]
NEXTAUTH_SECRET=[32+ char random]
NEXTAUTH_URL=http://localhost:3001
GOOGLE_ID & GOOGLE_SECRET
PUSHER_APP_ID, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_APP_KEY
CRON_SECRET=[change from default]
WEB_PUSH_PUBLIC_KEY & WEB_PUSH_PRIVATE_KEY
```

---

## Useful Commands

```bash
npm run dev                # Dev server (port 3001)
npm run build              # Production build
npx tsc --noEmit         # Type check
npx prisma studio        # Database GUI (localhost:5555)
npx prisma db seed       # Load test data (50+ MLB players)
npx prisma db reset      # Reset DB (dev only)
```

---

## Known Limitations

- **iOS Safari:** No Web Push API (PWA still works, fallback to in-app)
- **MLB Data:** Only April-October (5-15s lag from live events)
- **MVP Scope:** No multi-player trades, no veto voting, no salary cap, no international players

---

## Documentation

- **`CLAUDE.md`** - Project snapshot + full feature list
- **`Handoffs/01-requirements.md`** - Business requirements
- **`Handoffs/02-architecture.md`** - System design + trade-offs
- **`Handoffs/03-implementer.md`** - Implementation details (weeks 1-6)
- **`Handoffs/04-designer.md`** - Design decisions (Week 7)
- **`Handoffs/05-test.md`** - Test cases + results (Week 7)

---

**Status:** All MVP features complete and tested. Week 7 (design polish + final QA) in progress. Ready for April 2026 launch.
