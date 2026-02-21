# Fantasy Homerun Tracker PWA

Multi-tenant fantasy baseball league management PWA. Create/join leagues, draft MLB players, track live homeruns in real-time, propose 1:1 player trades, and compete on leaderboards. Mobile-first (iOS 16.4+, Android Chrome). **Weeks 1-6 complete. Soft launch April 2026.**

---

## Quick Start

```bash
npm install
npm run dev
# Runs on http://localhost:3001
```

**Test with Google OAuth:**
1. Sign in with Google
2. Create a league
3. Share invite link with others
4. Start draft (commissioner only)
5. Pick players (60 sec per pick)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16.1.6 + React 19.2 + TypeScript |
| **Backend** | Next.js API Routes |
| **Database** | Neon Postgres + Prisma 6.19.2 ORM |
| **Auth** | NextAuth.js v5 + Google OAuth |
| **Real-Time** | Pusher Channels |
| **Notifications** | Native Web Push API |
| **PWA** | next-pwa v5 + Service Worker |
| **MLB Data** | statsapi.mlb.com (free, 5-15s lag) |
| **Deployment** | Vercel Pro ($20/month for cron) |

---

## Current Features (Weeks 1-6 Complete)

### Week 1: Foundation
- [x] Google OAuth + NextAuth
- [x] Multi-tenant leagues
- [x] League CRUD endpoints
- [x] Role-based access (commissioner/member)

### Week 2: Draft Room
- [x] 10-round snake draft (60 sec per pick)
- [x] Real-time Pusher broadcasting
- [x] Server-side timer (prevents client desync)
- [x] Auto-pick on 60-second timeout (cron job)
- [x] Player search + draft board

### Week 3: Homerun Tracking
- [x] MLB game polling every 5 minutes
- [x] Live homerun detection (plays-by-play)
- [x] Real-time leaderboard (Pusher + polling)
- [x] Player roster with stats
- [x] Homerun event broadcasting

### Week 4: Push Notifications
- [x] Web Push subscriptions (Android/Chrome)
- [x] Native browser API (not vendor-specific)
- [x] Homerun alerts (player, team, inning)
- [x] Draft turn notifications
- [x] Trade event notifications

### Week 5: PWA & Offline
- [x] Web app manifest with icons
- [x] Install to home screen
- [x] Offline support (cached standings/roster)
- [x] Service worker caching
- [x] Connection status indicator

### Week 6: Trading System
- [x] Propose 1:1 player swaps
- [x] Accept/reject trades
- [x] 48-hour automatic expiration
- [x] Real-time trade broadcasts
- [x] Trade notifications
- [x] No veto voting (MVP simplified)

---

## API Endpoints (28+ Live)

### Leagues
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/leagues` | Create league |
| GET | `/api/leagues` | List user's leagues |
| GET | `/api/leagues/[id]` | Get league details |
| POST | `/api/leagues/[id]/join` | Join via invite |

### Draft
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/draft/[leagueId]/start` | Start draft |
| GET | `/api/draft/[leagueId]/status` | Get draft state + timer |
| POST | `/api/draft/[leagueId]/pick` | Submit pick |
| GET | `/api/draft/[leagueId]/available` | Get available players |
| POST | `/api/draft/[leagueId]/pause` | Pause (commissioner) |
| POST | `/api/draft/[leagueId]/resume` | Resume (commissioner) |

### Standings & Roster
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/leagues/[leagueId]/standings` | Leaderboard (by homeruns) |
| GET | `/api/leagues/[leagueId]/roster` | My roster |
| GET | `/api/leagues/[leagueId]/roster?userId=[id]` | Other's roster |

### Trading
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/trades/[leagueId]` | Propose trade |
| GET | `/api/trades/[leagueId]` | List trades |
| POST | `/api/trades/[leagueId]/[id]/accept` | Accept (receiver) |
| POST | `/api/trades/[leagueId]/[id]/reject` | Reject (receiver) |

### Notifications & Cron
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/notifications/subscribe` | Subscribe to push |
| POST | `/api/notifications/unsubscribe` | Unsubscribe |
| POST | `/api/cron/draft-timeout` | Auto-pick (every 1 min) |
| POST | `/api/cron/homerun-poll` | Poll MLB games (every 5 min) |
| POST | `/api/cron/trade-expire` | Expire trades (every 5 min) |

See `CLAUDE.md` for complete endpoint reference.

---

## Environment Variables

Create `.env.local`:

```env
DATABASE_URL=postgresql://[user]:[pass]@[host]/[db]
NEXTAUTH_SECRET=[32+ char random string]
NEXTAUTH_URL=http://localhost:3001
GOOGLE_ID=[from Google Console]
GOOGLE_SECRET=[from Google Console]
PUSHER_APP_ID=[from Pusher]
PUSHER_SECRET=[from Pusher]
NEXT_PUBLIC_PUSHER_APP_KEY=[from Pusher]
NEXT_PUBLIC_PUSHER_CLUSTER=us2
CRON_SECRET=[change from default]
WEB_PUSH_PUBLIC_KEY=[via web-push]
WEB_PUSH_PRIVATE_KEY=[via web-push]
```

See `.env.example` for template.

---

## Database Schema

**Core Tables:** User, League, LeagueMembership, DraftPick, RosterSpot, HomerrunEvent, PushSubscription, Trade

**Enums:**
- `DraftStatus` - pending | active | paused | complete
- `TradeStatus` - pending | accepted | rejected | expired

See `prisma/schema.prisma` for full schema.

---

## Key Architectural Decisions

1. **Server-Side Timer** - Draft countdown is authoritative on server (prevents desync)
2. **DraftStatus Enum** - Prevents invalid state transitions (explicit state machine)
3. **OAuth Invite Cookie** - Unauthenticated users can click join link, auto-join after OAuth
4. **Dual Pusher Channels** - `draft-{leagueId}` for draft events, `league-{leagueId}` for homeruns/trades
5. **Idempotent Homerun Detection** - Via unique `playByPlayId` constraint (safe to retry)
6. **Auto-Pick Cron** - Every 1 minute, triggers if 60s elapsed since `currentPickStartedAt`
7. **1:1 Trade Swaps** - Simplified MVP (no multi-player trades, no veto voting)
8. **48-Hour Hard Expiration** - Cron job auto-expires, no manual extension
9. **Multi-Tenant Isolation** - Prisma middleware enforces league scoping on all queries
10. **Native Web Push** - Browser API (not vendor-specific), works Android/Chrome

See `Handoffs/02-architecture.md` for full design rationale.

---

## Useful Commands

```bash
npm run dev              # Start dev server (port 3001)
npm run build            # Build for production
npm test                 # Run test suite
npx tsc --noEmit       # Type check
npx prisma studio      # Database GUI (http://localhost:5555)
npx prisma db seed     # Run seed script (test data)
npx prisma db reset    # Reset database (dev only)
npx prisma migrate dev # Create migration
```

---

## Testing

**Manual Test Flow:**
1. Sign in with Google OAuth
2. Create league (need 2+ members)
3. Share invite link
4. Other users join via link
5. As commissioner, start draft
6. All members pick players (60 sec per pick)
7. Auto-picks trigger on timeout
8. After 10 rounds, draft completes
9. View standings (leaderboard)
10. View my team (roster with stats)
11. Propose trade (1:1 swap)
12. Receiver accepts (rosters swap)
13. Check trade history

**Unit Tests:**
```bash
npm test                                # All tests
npm test -- business-requirements      # API/DB tests
npm test -- user-flows                 # E2E tests
npm test -- --coverage                 # With coverage
```

See `Handoffs/08-testing-complete.md` for comprehensive test documentation.

---

## Deployment

### Vercel Pro Setup

```bash
# Connect GitHub repo to Vercel
# Set environment variables in Vercel dashboard
# Deploy

npm run build  # Verify locally first
```

**Required Services:**
- Vercel Pro ($20/month for cron)
- Neon Postgres (free tier, 10GB)
- Pusher Channels (free tier, 100 concurrent)
- Google OAuth (free)

**Cron Jobs Configured:**
- `/api/cron/draft-timeout` - Every 1 minute
- `/api/cron/homerun-poll` - Every 5 minutes
- `/api/cron/trade-expire` - Every 5 minutes

See `vercel.json` for schedule.

---

## Known Limitations

**iOS Safari:**
- No Web Push API (PWA install prompt works)
- Native app required for push notifications

**MLB Data:**
- Only active during baseball season (April-October)
- 5-15 second lag from live events
- Spring Training available late February

**MVP Scope:**
- No multi-player trades (1:1 only)
- No veto voting on trades
- No salary cap / auction draft
- No live chat
- No international players (MLB only)

---

## Project Status

**Phase:** Weeks 1-6 Complete. Ready for Week 7 (Polish & Launch).
**Launch Target:** April 2026 (MLB regular season opening).
**Build Status:** ✅ All tests pass, TypeScript strict, production-ready.

---

## Documentation

- **`CLAUDE.md`** - Project snapshot (tech, features, current status)
- **`Handoffs/01-requirements.md`** - Business requirements & feasibility research
- **`Handoffs/02-architecture.md`** - System design & technical approach
- **`Handoffs/03-implementer.md`** - Implementation details (all 6 weeks)
- **`Handoffs/04-week7-launch-plan.md`** - Launch preparation checklist
- **`Handoffs/08-testing-complete.md`** - Testing documentation & results

---

## Team & Support

**Current Development:** Active development through April 2026.
**Architecture:** Monorepo (frontend + backend in Next.js).
**Code Quality:** TypeScript strict mode, ESLint, 80%+ test coverage.

**Contributing:**
- Issues & feature requests: Create GitHub issue
- Questions: Check `Handoffs/` documentation first
- Bug reports: Include error logs and reproduction steps

---

## License

Private project. Contact maintainer for details.

---

**Ready to ship. All MVP features complete. Waiting for April 2026 MLB season opening.**
