# Fantasy Homerun Tracker PWA

Multi-tenant fantasy baseball league management PWA. Users create/join leagues, draft MLB players, track live homeruns, propose trades, and compete on leaderboards. Mobile-first (iOS 16.4+, Android Chrome). Launching April 2026 with 1 league (~20 members).

## Current Phase

Research + Architecture Complete → Ready for Implementation (Implementer phase next)

## Tech Stack

- **Language:** TypeScript
- **Frontend/Backend:** Next.js 15 (App Router) + React
- **Database:** Neon Postgres + Prisma ORM + Row-Level Security
- **Real-Time:** Pusher Channels (WebSocket for draft, standings, trades)
- **Auth:** Google OAuth (NextAuth.js v5, no magic link)
- **Notifications:** Native Web Push API + Service Worker
- **PWA:** next-pwa v5 (iOS 16.4+ home screen install, offline cache)
- **MLB Data:** statsapi.mlb.com (free, 5-15s lag)
- **Deployment:** Vercel (Pro $20/month for Cron required)

## Core Entities

- **Users:** Google OAuth sign-in via NextAuth, session management
- **Leagues:** Commissioner creates, invite link for auto-join
- **Draft:** 10 rounds, 60-second per-pick countdown (server-side timer), auto-pick on timeout
- **Roster Spots:** Track player assignments per user per league, homerun count, points
- **Homerun Events:** Cron polls statsapi every 5 min, logs all homeruns, broadcasts via Pusher
- **Trades:** Propose, accept/reject, veto votes, auto-expire after 48 hours
- **Push Subscriptions:** Web Push endpoints for notifications (homeruns, trades, draft picks)
- **League Settings:** Global toggles (allow vetoes, auto-expire trades, notifications)

## Database Schema (Prisma)

8 core tables + NextAuth defaults:
- Users, Leagues, LeagueMemberships, DraftPicks, RosterSpots, HomerrunEvents, Trades, PushSubscriptions
- Multi-tenant enforcement: Every table has `league_id`. Prisma middleware intercepts all queries, appends `league_id` filter.
- Route guards verify user membership before querying.

## API Endpoints (Quick Summary)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/leagues` | Create league |
| GET | `/api/leagues` | List user's leagues |
| POST | `/api/leagues/[id]/join` | Auto-join via invite |
| POST | `/api/draft/[id]/start` | Start draft |
| POST | `/api/draft/[id]/pick` | Submit pick |
| GET | `/api/leagues/[id]/standings` | League standings |
| POST | `/api/trades/[id]` | Propose trade |
| GET | `/api/homeruns/[id]` | Recent homeruns |
| POST | `/api/push-subscription/[id]` | Register for push |

**Cron jobs (Vercel Pro required):**
- `/api/cron/poll-homeruns` — Every 5 min (2pm-11pm ET): Poll statsapi, log homeruns, broadcast via Pusher, send push notifications
- `/api/cron/expire-trades` — Every 6 hours: Mark past-expiration trades as expired
- `/api/cron/draft-timeout` — Every 5 sec during draft: Auto-pick if 60s elapsed

## Key Decisions

- **Neon Postgres:** Best serverless Postgres integration. Built-in PgBouncer connection pooling, RLS for multi-tenant safety, Prisma native support, Vercel integration.
- **Google OAuth only:** Simpler than magic link + email infra. Reduces dependencies, Vercel-optimized.
- **Pusher Channels:** Server-side timer (clients calculate remaining time from server timestamp). Prevents desync issues. Presence tracking (who's online). Free tier sufficient (100 concurrent connections for MVP).
- **statsapi.mlb.com:** Free, comprehensive MLB data, 5-15s lag acceptable for MVP. Implement circuit breaker (alert on 3 consecutive failures). Sportradar ($12K+/year) fallback for App Store.
- **next-pwa v5:** Zero-config, iOS 16.4+ support automatic, offline caching, silent updates with in-app toast.
- **Vercel Pro ($20/month):** Non-negotiable for Cron Functions. Alternative: external cron service (EasyCron ~$5/mo but adds complexity).
- **Multi-tenant scoping:** Defense in depth via Prisma middleware + route guards. Prevents accidental data leaks if developer forgets filter.

## How to Run

```bash
npm install
npm run dev
# Runs http://localhost:3000
```

**Environment Setup Required:**
- Neon Postgres (DATABASE_URL)
- Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Pusher (PUSHER_APP_ID, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_APP_KEY)
- Web Push VAPID keys (generated via `npx web-push generate-vapid-keys`)
- NextAuth secret (NEXTAUTH_SECRET)

## Current Status

- [x] Research phase (6 decision areas evaluated)
- [x] Architecture phase (tech stack locked, schema designed, API routes documented)
- [ ] Phase 1: Foundation (Neon, Prisma, NextAuth, basic league CRUD)
- [ ] Phase 2: Draft room (Pusher, statsapi integration, timer logic, auto-pick)
- [ ] Phase 3: Homerun tracking (Cron job, standings sync, Web Push)
- [ ] Phase 4: Trade system (propose, accept/reject, veto, expiration)
- [ ] Phase 5: PWA + Notifications (next-pwa setup, icons, offline caching)
- [ ] Phase 6: Polish (error handling, performance, testing, launch prep)

## Next Steps

1. **Implementer takes over** — Begin Phase 1 (Neon setup, Prisma schema, NextAuth config)
2. **Create git repo** if not already done
3. **Set up environment variables** (Vercel, Neon, Google, Pusher)
4. **Day 1 goals:** Database schema migrated to Neon, NextAuth working, basic league endpoint tested
5. **Daily standups** surface integration blockers early

## Implementation Sequence (7-Week Timeline)

- **Week 1-2:** Neon Postgres + Prisma migrations, NextAuth.js + Google OAuth, basic league CRUD
- **Week 3:** Pusher Channels + draft room real-time UI, statsapi.mlb.com player fetching
- **Week 4:** Cron job (poll-homeruns, draft-timeout), standings recalculation via Pusher
- **Week 5:** Trade CRUD, veto system, trade expiration cron job
- **Week 6:** Web Push API + service worker setup, next-pwa configuration, icon generation
- **Week 7+:** Error handling, performance, testing, launch prep

## Costs & Scaling

**MVP (April launch):** $20/month Vercel Pro only
- Neon: Free tier (10GB storage, shared compute)
- Pusher: Free tier (100 concurrent connections)
- Web Push: Zero cost
- Google OAuth: Zero cost
- statsapi.mlb.com: Zero cost

**Growth (10+ leagues):** Still $20/month (free tiers sufficient)

**Scale (100+ leagues, 2000+ users):**
- Pusher: Upgrade to Starter ($49/mo) at 1000+ concurrent users
- Neon: Upgrade to pay-as-you-go (~$50/mo) at 100GB+ data
- Total: ~$70-100/month

**Horz. Scaling:** PlanetScale (MySQL) alternative if extreme scale needed, but Neon handles 100+ leagues easily.

## Open Questions / Decisions Remaining

- Should draft history be auditable (all picks + deletions)? (Recommend: yes, for commissioner review)
- Spectator mode for draft? (Defer to v2)
- Trade recording/replay? (Defer to v2)
- Offline roster edits before syncing? (No—requires live validation)
- Service worker update UI (silent vs. "refresh required")? (next-pwa default: silent + toast)

## Blockers

None. All 6 research areas concluded with recommendations. Architecture finalized. Ready to implement.

## Relevant Files

- **01-requirements.md:** Deep research on MLB data API, database options, real-time architecture, push notifications, auth, PWA (1200+ lines)
- **02-architecture.md:** Full system design, Prisma schema, API routes, Pusher channels, Cron jobs, implementation sequence (850+ lines)
- **README.md:** Quick project overview, tech stack, key features, next steps
