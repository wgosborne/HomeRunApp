# Fantasy Homerun Tracker PWA

Multi-tenant fantasy baseball league management app. Users create/join leagues, draft MLB players, track live homeruns, propose trades, compete on leaderboards. Mobile-first PWA (iOS 16.4+, Android Chrome). Launching April 2026.

## Status

**Week 1 Complete** ✅ - Foundation deployed locally. All core endpoints working. Ready for Week 2 (Draft room + Pusher).

- [x] Next.js 16 + TypeScript setup
- [x] Neon Postgres + Prisma schema + migration applied
- [x] NextAuth.js v5 + Google OAuth integrated
- [x] Tailwind CSS v4 styling
- [x] League CRUD endpoints (POST, GET, GET[id], POST join)
- [x] Multi-tenant route guards + error handling
- [x] Database seeded with test data (50+ MLB players, 6 users, 2 leagues)
- [x] Dashboard UI (sign-in, league list, create league)
- [x] Build succeeds, all TypeScript checks pass

## Tech Stack

- **Frontend/Backend:** Next.js 16.1.6 + React 19.2 + TypeScript
- **Database:** Neon Postgres + Prisma 6.19.2 ORM
- **Auth:** Google OAuth (NextAuth.js v5)
- **Real-Time:** Pusher Channels (Week 2)
- **Notifications:** Web Push API (Week 4)
- **PWA:** next-pwa v5 (Week 5)
- **MLB Data:** statsapi.mlb.com (free, 5-15s lag)
- **Deployment:** Vercel Pro ($20/month for Cron)

## Quick Start

```bash
npm install
npm run dev
# Runs on http://localhost:3001
```

Seed test data:
```bash
npx prisma db seed
```

View database with Prisma Studio:
```bash
npx prisma studio
```

## Project Structure

```
app/
  ├── api/
  │   ├── auth/[...nextauth]/route.ts    # Google OAuth
  │   └── leagues/route.ts                # CRUD endpoints
  ├── auth/signin/page.tsx                # Sign-in page
  ├── dashboard/page.tsx                  # League dashboard
  ├── layout.tsx                          # Root layout
  └── page.tsx                            # Home (sign-in prompt)
prisma/
  ├── schema.prisma                       # Data model (9 tables)
  ├── seed.ts                             # Test data
  └── migrations/                         # Applied migrations
lib/
  ├── auth.ts                             # NextAuth config
  ├── prisma.ts                           # Prisma client
  ├── middleware.ts                       # Route guards
  ├── errors.ts                           # Error classes
  ├── validation.ts                       # Zod schemas
  └── logger.ts                           # Logging utility
```

## Core Features

- **Multi-tenant leagues** — Users join multiple leagues, all queries scoped by league ID
- **Real-time draft room** — Pusher-synced 60-second countdown, auto-pick on timeout (Week 2)
- **Live homerun tracking** — Cron polls statsapi every 5 min, broadcasts to all users (Week 3)
- **Trade system** — Propose, accept/reject, veto votes, 48-hour expiration (Week 5)
- **Push notifications** — Web Push for homeruns, draft picks, trade updates (Week 4)
- **Offline-ready PWA** — Cache roster/standings, work offline, install to home screen (Week 5)

## API Endpoints (Live)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/leagues` | Create league |
| GET | `/api/leagues` | List user's leagues |
| GET | `/api/leagues/[id]` | Get league details |
| POST | `/api/leagues/[id]/join` | Join via invite |

**Coming Week 2:**
- POST `/api/draft/[id]/start` — Start draft
- POST `/api/draft/[id]/pick` — Submit pick
- GET `/api/draft/[id]/status` — Get draft state

**Coming Week 3:**
- GET `/api/homeruns/[id]` — Recent homeruns
- GET `/api/leagues/[id]/standings` — League standings

**Coming Week 5:**
- POST `/api/trades` — Propose trade
- POST `/api/trades/[id]/accept` — Accept trade

## Database Schema

**9 core tables:**
- Users, Leagues, LeagueMemberships, DraftPicks, RosterSpots, HomerrunEvents, Trades, PushSubscriptions, LeagueSettings
- NextAuth: Account, Session, VerificationToken

**Multi-tenant:** Every table has `league_id`. Prisma middleware + route guards enforce league isolation.

## Test Data

After `npm run prisma:seed`:

**Users:**
- commissioner@example.com (Commissioner)
- player1-5@example.com (Players)

**Leagues:**
- Spring Training League (6 members, 12 draft picks, 5 roster spots each)
- Summer Sluggers (3 members, no draft picks)

**MLB Players:**
- 50+ real players from 2024 season (Aaron Judge, Juan Soto, Mike Trout, etc.)

## Key Decisions

- **Neon + Prisma:** Serverless Postgres, zero-config pooling, RLS for multi-tenant safety
- **Google OAuth only:** No email infrastructure, reduces complexity
- **Multi-tenant enforcement:** Prisma middleware + route guards prevent data leaks
- **Server-side draft timer:** Prevents client desync, broadcast via Pusher
- **Deferred PWA:** Compatibility issues with Next.js 16 Turbopack. Added Week 5.

## Environment Variables

Create `.env.local`:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3001
GOOGLE_ID=...
GOOGLE_SECRET=...
PUSHER_APP_ID=...
PUSHER_SECRET=...
NEXT_PUBLIC_PUSHER_APP_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=us2
CRON_SECRET=cron-secret-change-in-production
```

See `.env.example` for template.

## MVP Constraints

- **Launch:** April 2026
- **Scale:** 1 league, ~20 members (MVP)
- **iOS:** iOS 16.4+ (PWA required for push)
- **Android:** Chrome (latest 2 versions)
- **Cost:** $20/month Vercel Pro (Cron non-negotiable)

## Development Commands

```bash
npm run dev              # Start dev server (port 3001)
npm run build            # Build for production
npm run lint             # Run ESLint
npx prisma studio       # Database GUI
npx prisma db seed      # Run seed script
npx prisma db reset     # Reset DB (dev only)
npx prisma migrate dev  # Create migration
npx tsc --noEmit       # Type check
```

## Week 2 Roadmap

1. Pusher setup (credentials, channels)
2. Draft room UI (`/app/draft/[leagueId]`)
3. Draft API endpoints (start, status, pick, available)
4. Real-time broadcasting (Pusher client/server)
5. statsapi.mlb.com player fetching

## Known Issues

- Turbopack warning "inferred workspace root" — harmless, will fix later
- next-pwa has transitive vulnerabilities — safe for dev, will resolve Week 5

## Costs

- **MVP:** $20/month Vercel Pro only
- **Neon:** Free tier (10GB, shared compute)
- **Pusher:** Free tier (100 concurrent)
- **All others:** Zero cost

## Team Notes

- Port is **3001**, not 3000
- Database schema final (no breaking migrations ahead)
- All endpoints tested locally
- Seed includes real MLB 2024 season players
- Multi-tenant architecture proven and solid
- Ready to ship Week 2 (draft room real-time)

## Resources

- **Week 1 Handoff:** `/Handoffs/03-implementation.md`
- **Architecture Spec:** `/Handoffs/02-architecture.md`
- **Requirements:** `/Handoffs/01-requirements.md`
- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Neon Console:** [console.neon.tech](https://console.neon.tech/)
