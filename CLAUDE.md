# Fantasy Homerun Tracker PWA

Multi-tenant fantasy baseball league with real-time homerun tracking, draft management, trading, and leaderboards. Mobile-first PWA (iOS 16.4+, Android Chrome). **Production-ready.** Regular season launch: **March 25, 2026**.

## Current Status

**Week 8 Complete** (2026-03-15): End-of-season feature live on stage. All 240 tests passing. Build succeeds (TypeScript strict). **Ready for production deployment.**

- ✅ Auth (Google OAuth + invite cookie)
- ✅ Leagues & multi-tenant guards
- ✅ 10-round draft with auto-picks (60s timeout)
- ✅ Real-time homerun tracking (5-min poll)
- ✅ Standings & leaderboards
- ✅ Trading system (1:1 swaps, 48h expiration)
- ✅ End-of-season (champion crown, trade lock)
- ✅ Web Push notifications
- ✅ PWA (offline, install prompt, headshots)
- ✅ Player detail pages (info + history)
- ✅ User profile (edit name, sign out)
- ✅ HR Leaders feed (all homeruns, multi-league)

## Tech Stack

**Frontend:** Next.js 16 + React 19 + TypeScript | **Database:** Neon Postgres + Prisma 6 | **Real-time:** Pusher Channels | **Notifications:** Web Push API + Service Worker | **MLB Data:** statsapi.mlb.com | **Deployment:** Vercel Pro ($20/mo for cron)

## Cron Jobs (5 Total)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `sync-live-games` | Every 2 min | Fetch today's MLB schedule (Game table) |
| `homerun-poll` | Every 5 min | Detect homeruns, broadcast + notify |
| `sync-player-stats` | Nightly (7 UTC) | Refresh 1000+ players' seasonal stats |
| `draft-timeout` | Every 1 min | Auto-pick after 60s (skip if no active drafts) |
| `trade-expire` | Every 5 min | Expire trades at 48h deadline |

**Note:** All have early-exit guards to minimize invocations. See `Handoffs/07-how-it-works.md` for details.

## API Endpoints (40+)

**Leagues:** Create, list, join, standings, roster, end-season
**Draft:** Start, status, pick, available, pause, resume, reset, auto-pick
**Trades:** Propose, accept, reject, list, expire
**Homeruns:** Poll, detect, broadcast
**Notifications:** Subscribe, unsubscribe, test
**User:** Profile, update name
**Cron:** sync-live-games, homerun-poll, sync-player-stats, draft-timeout, trade-expire

## Key Architecture Decisions

- **DraftStatus enum:** Prevents invalid state transitions
- **currentPickStartedAt:** Server-authoritative timer (prevents client desync)
- **Multi-tenant scoping:** All queries filtered by `leagueId`
- **Pusher channels:** `draft-{id}` for picks, `league-{id}` for homeruns/trades
- **Homerun idempotency:** Via unique `playByPlayId` (no duplicates)
- **5-sec polling fallback:** Complements Pusher for reliability
- **Season-end guards:** Block trades when `seasonEndedAt` is set
- **Player headshots:** MLB CDN (img.mlbstatic.com) via mlbId, fallback to initials

## Database

**17 migrations applied.** Schema includes: User, League, LeagueMembership, DraftPick, RosterSpot, HomerrunEvent, Trade, PushSubscription, LeagueSettings, Team, Player, Game, plus NextAuth tables (Account, Session, VerificationToken).

**New fields (Week 8):** `League.seasonEndedAt`, `League.winnerId`, `User.wonLeagues` relation, `TradeStatus.pending_commissioner`.

See `Handoffs/MIGRATION_AUDIT.md` for full audit.

## Documentation

**Quick References:**
- `Handoffs/07-how-it-works.md` — Data sources by page, cron schedules, libs, data flows
- `Handoffs/05-test.md` — Test commands, 10 manual flows, cron testing, debugging tips
- `Handoffs/regular-season-deploy/OPENING_DAY_CUTOVER.md` — March 25 cutover procedure (database cleanup, flag flip, verification)

## How to Run

```bash
npm install && npm run dev              # Dev server (port 3001)
npm run test                            # Run 240+ tests
npm run build                           # TypeScript strict build
npx prisma studio                       # Database UI
```

**Test flow:** Sign in → Create league → Share invite → Draft → Watch homeruns → Trade → End season

## Deployment

**Status:** Production-ready for stage. Awaiting March 25 for regular season cutover.

**Pre-deploy checklist:**
- [ ] All 240 tests passing: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] 17 migrations applied to production DB
- [ ] Cron jobs configured in Vercel (vercel.json)
- [ ] Env vars set (DATABASE_URL, CRON_SECRET, Pusher keys, VAPID keys)
- [ ] NEXT_PUBLIC_ENABLE_SPRING_TRAINING=false (production)

**March 25 cutover steps:** See `OPENING_DAY_CUTOVER.md` (database cleanup, flag flip, data population, verification).

## Files Overview

**Core Pages:**
- `/dashboard` — Live games, recent HRs, your leagues
- `/league/[id]` — 6 tabs (Draft, Leaderboard, My Team, Trades, Players, Settings)
- `/draft/[id]` — Draft room with timer, search, picks history
- `/player/[id]` — Player info, headshots, homerun history
- `/profile` — Display name edit, leagues won, sign out
- `/homeruns` — All HRs feed (multi-league, sortable)

**Libraries:**
- `lib/mlb-stats.ts` — MLB API (games, homeruns, players)
- `lib/player-utils.ts` — Player utility functions (hot/cold streak calculation)
- `lib/pusher-*.ts` — Real-time channels & broadcasts
- `lib/push-service.ts` — Web Push notifications
- `public/sw.js` — Service Worker (offline, push handling)

## Known Limitations

- **iOS Safari:** No Web Push API (native app only)
- **Off-season (March 2026):** Mock spring training games until March 25
- **MLB API lag:** 5-15 seconds (cron polls every 5 min)

## Environment Variables

`DATABASE_URL` | `CRON_SECRET` | `NEXTAUTH_URL/SECRET` | `GOOGLE_CLIENT_ID/SECRET` | `NEXT_PUBLIC_PUSHER_KEY` | `PUSHER_SECRET/CLUSTER` | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `VAPID_PRIVATE_KEY` | `NEXT_PUBLIC_ENABLE_SPRING_TRAINING`

## Costs

Vercel Pro $20/mo (cron required) + Neon free tier + Pusher free tier = **$20/mo total**.

## Next Steps

1. **March 25 Cutover:** Execute `OPENING_DAY_CUTOVER.md` (database cleanup, flag flip, verify real season data)
2. **Post-Launch:** Monitor cron jobs, homerun polling, Pusher broadcasts (48h)
3. **Soft Launch:** Invite early users (Lane's friends, beta testers)
4. **April 2026:** Full launch with marketing

---

**See Handoffs folder for detailed architecture (`07-how-it-works.md`), testing procedures (`05-test.md`), and deployment checklist (`OPENING_DAY_CUTOVER.md`).**
