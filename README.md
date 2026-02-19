# Fantasy Homerun Tracker PWA

A multi-tenant fantasy baseball league management app where users create leagues, draft MLB players, track live homeruns in real-time, propose trades, and compete on leaderboards. Mobile-first PWA (iOS 16.4+, Android Chrome) launching in April 2026 with initial 20-member league.

## Current Status

**Research ✓** + **Architecture ✓** → Ready for Implementation

- Research phase completed: All 6 critical decision areas evaluated
- Architecture phase completed: Tech stack locked in, API routes designed, database schema finalized
- Target launch: April 2026 (single league, ~20 members)
- Roadmap: Scale to 100+ leagues by year-end

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + React + TypeScript
- **Backend:** Vercel Functions (serverless API routes)
- **Database:** Neon Postgres with Prisma ORM + Row-Level Security
- **Real-Time:** Pusher Channels (draft room, standings, trades)
- **Authentication:** Google OAuth (NextAuth.js v5)
- **Notifications:** Native Web Push API + Service Worker
- **PWA:** next-pwa v5 (offline caching, home screen install)
- **MLB Data:** statsapi.mlb.com (free API, 5-15s lag)
- **Deployment:** Vercel Pro ($20/month for Cron jobs)

## Quick Start

```bash
npm install
npm run dev
# Runs on http://localhost:3000
```

## Project Structure

- `/app` — Next.js App Router (pages, API routes)
- `/prisma` — Neon database schema + migrations
- `/public` — Static assets + PWA icons
- `/Handoffs` — Phase documentation (requirements, architecture)

## Key Features

- **Multi-tenant leagues** — Users join multiple leagues, all queries scoped by league ID
- **Real-time draft room** — Pusher-synced 60-second countdown, auto-pick on timeout
- **Live homerun tracking** — Cron job polls statsapi every 5 min, broadcasts to all users
- **Trade system** — Propose, accept/reject, veto votes, 48-hour expiration
- **Push notifications** — Web Push for homeruns, draft picks, trade updates
- **Offline-ready PWA** — Cache roster/standings, work offline, install to home screen

## MVP Constraints

- **Launch date:** April 2026
- **Initial size:** 1 league, ~20 members
- **iOS minimum:** iOS 16.4+ (PWA installation required for push)
- **Android minimum:** Chrome on latest 2 versions
- **Cost:** $20/month Vercel Pro (non-negotiable for Cron jobs)

## API Endpoints (Quick Reference)

| Method | Path | Purpose |
|--------|------|---------|
| **Auth** |
| GET | `/api/auth/signin` | Google OAuth sign-in |
| POST | `/api/auth/signout` | Clear session |
| **Leagues** |
| POST | `/api/leagues` | Create league (commissioner) |
| GET | `/api/leagues` | List user's leagues |
| POST | `/api/leagues/[id]/join` | Auto-join via invite |
| **Draft** |
| POST | `/api/draft/[id]/start` | Start draft |
| POST | `/api/draft/[id]/pick` | Submit player pick |
| GET | `/api/draft/[id]/status` | Get draft state |
| **Standings** |
| GET | `/api/leagues/[id]/standings` | League standings |
| GET | `/api/leagues/[id]/roster/[userId]` | User's roster |
| **Trades** |
| POST | `/api/trades/[id]` | Propose trade |
| POST | `/api/trades/[id]/[tradeId]/accept` | Accept trade |
| **Homeruns** |
| GET | `/api/homeruns/[id]` | Recent homeruns |
| **Notifications** |
| POST | `/api/push-subscription/[id]` | Register for push |

## Database Schema

**Core tables:** Users, Leagues, LeagueMemberships, DraftPicks, RosterSpots, HomerrunEvents, Trades, PushSubscriptions, LeagueSettings

**Multi-tenant scoping:** Every table has `league_id` filter. Prisma middleware + route guards enforce league isolation.

## Key Decisions

- **Neon Postgres:** Best serverless option with built-in connection pooling + RLS
- **Google OAuth only:** Reduces email infrastructure; Vercel-optimized
- **Pusher Channels:** Server-side timer prevents client desync in draft room
- **statsapi.mlb.com:** Free, 5-15s lag acceptable for MVP; Sportradar fallback for App Store
- **next-pwa:** Zero-config PWA, iOS 16.4+ support automatic
- **Vercel Pro Cron:** $20/month for scheduled polling jobs (non-negotiable)

## Next Steps

1. **Implementer begins Phase 1** — Neon + Prisma schema, NextAuth setup, basic league CRUD
2. **Parallel Phase 2** — Pusher draft room integration
3. **Phase 3** — Homerun polling cron job + real-time standings
4. **Phase 4** — Trade system, notifications, PWA setup
5. **Phase 5-6** — Testing, polish, launch readiness

## Open Questions

- Passwordless magic link or Google OAuth only? (Decided: Google OAuth)
- Multi-league draft conflicts support? (Defer to v2)
- Auto-expire trades after 48 hours or user decision? (Auto-expire via cron)
- Offline trade proposals? (No—requires live validation)

## Resources

- **Detailed Requirements:** `/Handoffs/01-requirements.md` (Research on all 6 decision areas)
- **Architecture Spec:** `/Handoffs/02-architecture.md` (System design, API routes, database schema)
- **Deployment Guide:** [Vercel Docs](https://vercel.com/docs)
- **Database:** [Neon Console](https://console.neon.tech/)
