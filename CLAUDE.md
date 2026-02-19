# Fantasy Homerun Tracker PWA

Multi-tenant fantasy baseball league management PWA. Users create/join leagues, draft MLB players, track live homeruns, propose trades, and compete on leaderboards. Mobile-first (iOS 16.4+, Android Chrome). Launching April 2026.

## Current Phase

Week 1 Complete: Foundation deployed locally. Core endpoints working. Ready for Week 2 (Draft room + Pusher real-time).

## Tech Stack

- **Language:** TypeScript
- **Frontend/Backend:** Next.js 16.1.6 (App Router) + React 19.2
- **Database:** Neon Postgres + Prisma 6.19.2 ORM
- **Auth:** Google OAuth (NextAuth.js v5)
- **Real-Time:** Pusher Channels (Week 2)
- **Notifications:** Native Web Push API (Week 4)
- **PWA:** next-pwa v5 (Week 5)
- **MLB Data:** statsapi.mlb.com (free, 5-15s lag)
- **Deployment:** Vercel Pro ($20/month for Cron)

## Core Entities

- **Users:** Google OAuth via NextAuth, session storage in Postgres
- **Leagues:** Commissioner creates, invite link for auto-join
- **LeagueMemberships:** Multi-tenant scoping, role (commissioner/player)
- **DraftPicks:** Track 10-round draft with 60-sec per-pick countdown
- **RosterSpots:** Player assignments per user, homerun counts
- **HomerrunEvents:** Cron polls statsapi every 5 min, broadcasts via Pusher
- **Trades:** Propose/accept/reject, veto votes, 48-hour auto-expire
- **PushSubscriptions:** Web Push endpoints for notifications

## API Endpoints (Live)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/leagues` | Create league |
| GET | `/api/leagues` | List user's leagues |
| GET | `/api/leagues/[id]` | Get league details |
| POST | `/api/leagues/[id]/join` | Join via invite |

**Cron jobs (Week 3+):**
- `/api/cron/poll-homeruns` — Every 5 min: Poll statsapi, broadcast via Pusher
- `/api/cron/expire-trades` — Every 6 hours: Mark expired trades
- `/api/cron/draft-timeout` — Every 5 sec: Auto-pick on 60s timeout

## Key Decisions

- **Neon + Prisma:** Serverless Postgres, zero-config connection pooling, RLS for multi-tenant
- **Google OAuth only:** No email infrastructure, reduces complexity
- **Multi-tenant enforcement:** Prisma middleware + route guards = defense-in-depth
- **Deferred PWA:** Compatibility issues with Next.js 16 Turbopack. Will add Week 5.
- **Server-side draft timer:** Prevents client desync, broadcast remaining time via Pusher

## How to Run

```bash
npm install
npm run dev
# Runs http://localhost:3001
```

**Database seeded with test data (6 users, 2 leagues, 50+ MLB players)**

Test with Prisma Studio:
```bash
npx prisma studio
```

**Environment required:**
- DATABASE_URL (Neon)
- GOOGLE_ID, GOOGLE_SECRET (OAuth)
- NEXTAUTH_SECRET, NEXTAUTH_URL
- PUSHER_* credentials (Week 2)
- VAPID keys (Week 4)

## Current Status

- [x] Week 1: Foundation complete
  - [x] Next.js 16 + TypeScript setup
  - [x] Tailwind CSS v4 configured
  - [x] Neon Postgres + Prisma schema + migration
  - [x] NextAuth.js v5 + Google OAuth integrated
  - [x] League CRUD endpoints (POST/GET/GET[id]/POST join)
  - [x] Multi-tenant route guards
  - [x] Error handling + Zod validation
  - [x] Test data seed (50+ MLB players, 6 users)
  - [x] Dashboard UI (sign-in, league list, create league)
  - [x] Build succeeds, all TypeScript checks pass
- [ ] Week 2: Draft room + Pusher real-time
- [ ] Week 3: Homerun polling + Cron jobs + standings
- [ ] Week 4: Web Push notifications
- [ ] Week 5: PWA + offline support
- [ ] Week 6-7: Trading system, polish, launch

## Next Steps (Week 2)

1. **Pusher setup** — Get credentials, configure client/server channels
2. **Draft room UI** — `/app/draft/[leagueId]` page with timer component
3. **Draft API endpoints** — POST start, GET status, POST pick, GET available players
4. **Real-time broadcasting** — Listen for pick-made events, broadcast to all clients
5. **statsapi integration** — Fetch available MLB players for draft

## Testing Checklist

Before Week 2:
- [x] npm run dev starts successfully
- [x] http://localhost:3001 loads home page
- [x] Sign-in redirects to Google OAuth
- [x] Dashboard shows 0 leagues for new user
- [x] Create league endpoint works
- [x] Seed data loads in Prisma Studio
- [x] npm run build succeeds
- [x] All TypeScript strict checks pass

## Blockers

None. Foundation is solid. Multi-tenant architecture proven. Schema finalized.

## Useful Commands

```bash
npm run dev              # Start dev server (port 3001)
npm run build            # Build for production
npx prisma studio       # Database GUI
npx prisma db seed      # Run seed script
npx prisma migrate dev  # Create migration
npx tsc --noEmit       # Type check
```

## Files

- **Handoffs/03-implementation.md:** Week 1 detailed breakdown
- **prisma/schema.prisma:** Complete data model
- **app/api/leagues/route.ts:** League CRUD endpoints
- **lib/auth.ts:** NextAuth configuration
- **lib/middleware.ts:** Multi-tenant route guards

## Costs

- **MVP:** $20/month Vercel Pro (Cron required)
- **Neon:** Free tier (10GB, shared compute)
- **Pusher:** Free tier (100 concurrent)
- **All others:** Zero cost

## Team Notes

- Port is 3001, not 3000
- Database schema final (no breaking migrations ahead)
- All endpoints tested locally
- Seed includes real MLB players from 2024 season
- Week 2 focus: Draft room real-time
