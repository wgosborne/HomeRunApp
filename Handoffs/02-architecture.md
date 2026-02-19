# Architecture: Fantasy Homerun Tracker PWA

## Executive Summary

The Fantasy Homerun Tracker PWA is a multi-tenant, real-time fantasy baseball league management application. Users create leagues, draft MLB players, track live homeruns, propose trades, and compete on standings. The system is designed for MVP launch in April (1 league, ~20 members) and scales to 100+ leagues by year-end.

**Confirmed Technology Stack:**
- Frontend/Backend: Next.js 15 (App Router) + TypeScript
- Database: Neon Postgres with Prisma ORM
- Real-time: Pusher Channels (draft room, standings updates)
- Authentication: Google OAuth only (no magic link)
- Notifications: Native Web Push API (all user alerts)
- PWA: next-pwa v5 (iOS 16.4+, Android Chrome)
- MLB Data: statsapi.mlb.com with circuit breaker failover
- Deployment: Vercel (Vercel Pro required for Cron)
- **Cost:** Vercel Pro $20/month (non-negotiable for polling jobs)

---

## 1. System Overview

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (Mobile-First)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js 15 (App Router) + React + TypeScript            │   │
│  │  - Pages: /dashboard, /league/[id], /draft/[id]          │   │
│  │  - Service Worker (next-pwa): offline cache + push       │   │
│  │  - Pusher JS Client: real-time draft, standings updates  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (HTTPS)
┌─────────────────────────────────────────────────────────────────┐
│                   API LAYER (Vercel Functions)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Route Handlers (/app/api/)                              │   │
│  │  - /auth/[...nextauth] — Google OAuth                    │   │
│  │  - /leagues/* — CRUD operations                          │   │
│  │  - /draft/* — pick submission, status queries            │   │
│  │  - /trades/* — trade CRUD, status updates                │   │
│  │  - /homeruns/* — log homerun, fetch recent events        │   │
│  │  - /push-subscription — web push enrollment              │   │
│  │  - /webhook/pusher-auth — auth Pusher client             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Cron Jobs (Vercel Functions, Vercel Pro required)       │   │
│  │  - /api/cron/poll-homeruns (every 5 min, 2pm-11pm ET)   │   │
│  │  - /api/cron/expire-trades (every 6 hours)               │   │
│  │  - /api/cron/draft-timeout (every 5 sec during draft)    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         ↓ (Prisma Client)        ↓ (HTTP)            ↓ (HTTP)
    ┌─────────────────┐    ┌──────────────────┐  ┌──────────────┐
    │ Neon Postgres   │    │ Pusher Channels  │  │ statsapi.    │
    │ (multi-tenant)  │    │ (WebSocket)      │  │ mlb.com      │
    │                 │    │                  │  │ (REST)       │
    │ Database tables │    │ - draft-room-*   │  │              │
    │ - Users         │    │ - standings-*    │  │ GET /people  │
    │ - Leagues       │    │ - homeruns-*     │  │ GET /games   │
    │ - Memberships   │    │                  │  │ GET /teams   │
    │ - Draft Picks   │    └──────────────────┘  └──────────────┘
    │ - Roster Spots  │
    │ - Homeruns      │
    │ - Trades        │
    │ - Push Subs     │
    └─────────────────┘
```

### Data Flow: Key User Journeys

**Journey 1: User Joins League (Google OAuth + Invite)**
```
1. User clicks invite link: yourdomain.com/join/league-abc123
2. If not logged in → redirect to /auth/signin?inviteLeague=league-abc123
3. User clicks "Sign in with Google"
4. Google OAuth callback → NextAuth creates session
5. NextAuth redirect handler preserves inviteLeague param → /dashboard?inviteLeague=league-abc123
6. Client-side: useEffect detects inviteLeague param
7. Calls POST /api/leagues/league-abc123/join → auto-adds user to league_memberships
8. Prompts: "Add to home screen?" + "Enable push notifications?"
9. Redirect to /league/league-abc123
```

**Journey 2: User Makes Draft Pick (Pusher Real-Time)**
```
1. Client: User selects player → POST /api/draft/league-abc123/pick
2. Server: Validates it's user's turn, updates draft_picks table
3. Server: Calls pusher.trigger('draft-room-abc123', 'pick-made', { ... })
4. Pusher broadcasts to all connected clients <100ms
5. All clients: receive 'pick-made' event, update UI, restart countdown
6. Server-side timer job checks elapsed time, auto-picks if 60s exceeded
```

**Journey 3: Homerun Detected & Broadcast**
```
1. Cron job /api/cron/poll-homeruns fires every 5 minutes (2pm-11pm ET)
2. Queries Neon for all active leagues with ongoing MLB games
3. For each game, calls statsapi.mlb.com /api/v1/game/{gameId}/playByPlay
4. Filters for new home_run events (deduplicates with lastProcessedPlayId)
5. For each homerun:
   - Creates record in homerun_events table
   - Recalculates affected users' scores in roster_spots table
   - Looks up push subscriptions for users with affected players
   - Calls web-push library to send notifications
   - Publishes to Pusher channel 'homeruns-league-abc123' for real-time UI update
6. All clients: receive homerun event, standings update instantly
```

---

## 2. Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Language** | TypeScript | Type safety crucial for multi-tenant architecture; catches dev mistakes |
| **Frontend Framework** | Next.js 15 (App Router) | Server/client co-location, API routes built-in, Vercel first-class support |
| **Database** | Neon Postgres | Best serverless Postgres; built-in connection pooling (PgBouncer); RLS for multi-tenant safety; Prisma native support |
| **ORM** | Prisma | Query builder, schema migrations, middleware for league scoping, excellent DX |
| **Real-Time** | Pusher Channels | Purpose-built for game state sync; server-side timer prevents client desync; presence tracking; free tier sufficient for MVP |
| **Authentication** | Google OAuth (NextAuth.js v5) | Passwordless (user requirement); Vercel-optimized; invite flow preserved through redirect |
| **Notifications** | Native Web Push API + Service Worker | Zero cost; standard browser API; service worker already needed for PWA; graceful degradation |
| **PWA** | next-pwa v5 | Zero-config; iOS 16.4+ support; offline caching; auto-generates manifest + service worker |
| **MLB Data** | statsapi.mlb.com (free) | Comprehensive player/game data; 5-15s lag acceptable for MVP; circuit breaker on failure |
| **Cron Jobs** | Vercel Cron Functions | Vercel Pro only; scheduled serverless functions; no separate worker service needed |
| **Deployment** | Vercel | Next.js native deployment; global CDN; serverless functions; Neon integration |

### External Service Dependencies (Monthly Cost)
- **Vercel Pro:** $20/month (required for Cron)
- **Neon Postgres:** Free tier adequate for MVP (10GB storage, shared compute)
- **Pusher:** Free tier adequate for MVP (100 concurrent connections)
- **Web Push:** Zero cost (self-hosted VAPID keys)
- **Google OAuth:** Zero cost (credential only, no usage fees)
- **statsapi.mlb.com:** Zero cost (free API, no rate limits published)

**Total MVP Monthly Cost:** $20 (Vercel Pro only)

---

## 3. Database Schema (Prisma)

### Core Entities & Relationships

```prisma
// User: Created by NextAuth via Google OAuth
model User {
  id                    String       @id @default(cuid())
  email                 String       @unique
  name                  String?
  googleId              String       @unique
  image                 String?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  // Relations
  leagueMemberships     LeagueMembership[]
  draftPicks            DraftPick[]
  rosterSpots           RosterSpot[]
  trades                Trade[]
  tradeResponses        Trade[]        @relation("tradeReceiver")
  pushSubscriptions     PushSubscription[]

  @@index([googleId])
}

// League: Created by commissioner
model League {
  id                    String       @id @default(cuid())
  name                  String
  commissionerId        String
  draftDate             DateTime?
  draftStartedAt        DateTime?
  draftCompletedAt      DateTime?
  tradeDeadline         DateTime?
  scoringFormat         String       @default("homerun_only")
  maxTradeVetoVotes     Int          @default(2)
  maxTeamSize           Int          @default(25)
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  // Relations
  memberships           LeagueMembership[]
  draftPicks            DraftPick[]
  rosterSpots           RosterSpot[]
  homeruns              HomerrunEvent[]
  trades                Trade[]
  settings              LeagueSettings?

  @@index([commissionerId])
  @@index([draftDate])
}

// LeagueMembership: Tracks which users are in which leagues
model LeagueMembership {
  id                    String       @id @default(cuid())
  userId                String
  leagueId              String
  role                  String       @default("member")
  teamName              String?      @default("Team Name")
  joinedAt              DateTime     @default(now())

  // Relations
  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  league                League       @relation(fields: [leagueId], references: [id], onDelete: Cascade)

  @@unique([userId, leagueId])
  @@index([leagueId])
}

// DraftPick: One pick per user per round
model DraftPick {
  id                    String       @id @default(cuid())
  leagueId              String
  userId                String
  playerId              String
  playerName            String
  position              String?
  round                 Int
  pickNumber            Int
  isPick                Boolean      @default(false)
  autoPickedAt          DateTime?
  pickedAt              DateTime     @default(now())
  createdAt             DateTime     @default(now())

  // Relations
  league                League       @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([leagueId, playerId])
  @@index([leagueId, round])
  @@index([userId, leagueId])
}

// RosterSpot: Tracks player assignment to user with homerun count
model RosterSpot {
  id                    String       @id @default(cuid())
  leagueId              String
  userId                String
  playerId              String
  playerName            String
  position              String?
  homeruns              Int          @default(0)
  points                Int          @default(0)
  draftedRound          Int?
  draftedPickNumber     Int?
  addedViaTradeAt       DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  // Relations
  league                League       @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([leagueId, userId, playerId])
  @@index([leagueId, userId])
  @@index([leagueId, playerId])
}

// HomerrunEvent: Log every homerun hit during season
model HomerrunEvent {
  id                    String       @id @default(cuid())
  leagueId              String
  playerId              String
  playerName            String
  playByPlayId          String       @unique
  gameId                String
  gameDate              DateTime
  inning                Int
  rbi                   Int          @default(1)
  team                  String?
  homeTeam              String?
  awayTeam              String?
  detectedAt            DateTime     @default(now())
  createdAt             DateTime     @default(now())

  // Relations
  league                League       @relation(fields: [leagueId], references: [id], onDelete: Cascade)

  @@index([leagueId, gameDate])
  @@index([playByPlayId])
}

// Trade: User proposes to trade their roster player for another user's player
model Trade {
  id                    String       @id @default(cuid())
  leagueId              String
  ownerId               String
  receiverId            String
  ownerPlayerId         String
  ownerPlayerName       String
  receiverPlayerId      String
  receiverPlayerName    String
  status                String       @default("pending")
  vetoVotes             Int          @default(0)
  expiresAt             DateTime
  respondedAt           DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  // Relations
  league                League       @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  owner                 User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  receiver              User         @relation("tradeReceiver", fields: [receiverId], references: [id], onDelete: Cascade)

  @@index([leagueId, status])
  @@index([receiverId, status])
  @@index([expiresAt])
}

// PushSubscription: Stores Web Push subscription for each user/league combo
model PushSubscription {
  id                    String       @id @default(cuid())
  userId                String
  leagueId              String
  endpoint              String
  p256dh                String
  auth                  String
  userAgent             String?
  isActive              Boolean      @default(true)
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  // Relations
  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, leagueId, endpoint])
  @@index([leagueId])
  @@index([userId])
}

// LeagueSettings: Global settings for a league (future expansion)
model LeagueSettings {
  id                    String       @id @default(cuid())
  leagueId              String       @unique
  allowVetos            Boolean      @default(true)
  autoExpireTradesHours Int          @default(48)
  notificationsEnabled  Boolean      @default(true)
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  // Relations
  league                League       @relation(fields: [leagueId], references: [id], onDelete: Cascade)
}

// NextAuth Default Tables (auto-created by Prisma adapter)
model Account {
  id                    String       @id @default(cuid())
  userId                String
  type                  String
  provider              String
  providerAccountId     String
  refresh_token         String?      @db.Text
  access_token          String?      @db.Text
  expires_at            Int?
  token_type            String?
  scope                 String?
  id_token              String?      @db.Text
  session_state         String?

  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id                    String       @id @default(cuid())
  sessionToken          String       @unique
  userId                String
  expires               DateTime
  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier            String
  token                 String       @unique
  expires               DateTime

  @@unique([identifier, token])
}
```

### Multi-Tenant Scoping Strategy

**Principle:** Every query must be scoped to a specific league. Enforce via:

1. **Prisma Middleware** (application layer)
2. **Route Guards** (API layer) — Verify user is member of league before querying

---

## 4. API Routes (Next.js App Router)

### Authentication Routes

```
POST   /api/auth/signin                    → Google OAuth sign-in page
GET    /api/auth/callback/google          → OAuth callback (NextAuth)
POST   /api/auth/signout                  → Clear session
GET    /api/auth/session                  → Get current user + league memberships
```

### League Management Routes

```
POST   /api/leagues                        → Create new league (commissioner only)
GET    /api/leagues                        → List all user's leagues
GET    /api/leagues/[leagueId]             → Get league details
POST   /api/leagues/[leagueId]/join        → Auto-join league (via invite link)
POST   /api/leagues/[leagueId]/settings    → Update league settings
```

### Draft Routes

```
POST   /api/draft/[leagueId]/start         → Start draft
GET    /api/draft/[leagueId]/status        → Get current draft state
POST   /api/draft/[leagueId]/pick          → Submit player pick
POST   /api/draft/[leagueId]/auto-pick     → Trigger auto-pick (server-only)
GET    /api/draft/[leagueId]/available     → List unpicked players
GET    /api/draft/[leagueId]/history       → Get all picks made
```

### Roster & Standings Routes

```
GET    /api/leagues/[leagueId]/standings   → Get current league standings
GET    /api/leagues/[leagueId]/roster/[userId] → Get user's roster
GET    /api/leagues/[leagueId]/roster      → Get all rosters in league
```

### Trade Routes

```
POST   /api/trades/[leagueId]              → Propose new trade
GET    /api/trades/[leagueId]              → Get all trades in league
POST   /api/trades/[leagueId]/[tradeId]/accept → Receiver accepts trade
POST   /api/trades/[leagueId]/[tradeId]/reject → Receiver rejects trade
POST   /api/trades/[leagueId]/[tradeId]/veto   → Member votes to veto
```

### Homerun & Events Routes

```
GET    /api/homeruns/[leagueId]            → Get recent homeruns
GET    /api/homeruns/[leagueId]/player/[playerId] → Get homeruns by player
GET    /api/recent-events/[leagueId]       → Get last 10 events (trades, homeruns)
```

### Push Notification Routes

```
POST   /api/push-subscription/[leagueId]   → Register for push notifications
DELETE /api/push-subscription/[leagueId]   → Unsubscribe from push
GET    /api/push-subscription/[leagueId]   → Check subscription status
```

### Pusher Authentication Route

```
POST   /api/webhook/pusher-auth            → Authenticate Pusher client
```

### Cron Job Routes (Vercel Pro)

```
GET    /api/cron/poll-homeruns             → Poll statsapi for new homeruns (every 5 min)
GET    /api/cron/expire-trades             → Mark pending trades as expired (every 6 hours)
GET    /api/cron/draft-timeout             → Auto-pick if draft timer exceeded (every 5 sec)
```

---

## 5. Cron Job Architecture (Vercel Functions)

### Job 1: Poll MLB Homeruns (Every 5 Minutes)

**File:** `/app/api/cron/poll-homeruns/route.ts`

**Trigger:** Every 5 minutes during 2pm-11pm ET (MLB game hours) — **Requires Vercel Pro**

**Flow:**
1. Verify Vercel Cron authorization
2. Find all active leagues with ongoing MLB games
3. Get active MLB games via statsapi.mlb.com
4. Get play-by-play for each game
5. Filter for new home_run events (deduplicate with playByPlayId)
6. For each homerun:
   - Create homerun_events record
   - Update roster_spots homerun count
   - Send Web Push notifications to affected users
   - Publish to Pusher channel for real-time UI update

**Key Implementation Details:**
- Use `playByPlayId` as unique constraint to prevent duplicate processing
- Cache MLB player roster for 1 hour to reduce API calls
- Implement circuit breaker: if statsapi fails 3x in a row, alert commissioner
- Graceful degradation: if API down, catch up on next successful poll

### Job 2: Expire Pending Trades (Every 6 Hours)

**File:** `/app/api/cron/expire-trades/route.ts`

**Trigger:** Every 6 hours

**Flow:**
1. Find all pending trades past expiration time
2. Mark as status: 'expired'
3. Broadcast to Pusher channel `trades-{leagueId}` for real-time UI update

### Job 3: Draft Timeout Auto-Pick (Every 5 Seconds)

**File:** `/app/api/cron/draft-timeout/route.ts`

**Trigger:** Every 5 seconds (only when draft active)

**Flow:**
1. Find all active drafts (draftStartedAt set, draftCompletedAt null)
2. For each draft, get oldest incomplete pick (current pick)
3. If elapsed time > 60 seconds:
   - Auto-pick best available player (from statsapi rankings)
   - Create DraftPick record with autoPickedAt timestamp
   - Broadcast to Pusher channel `draft-room-{leagueId}` for real-time update

---

## 6. Real-Time Draft Room (Pusher Channels)

### Pusher Channels per League
- `draft-room-{leagueId}` — All draft events
- `standings-{leagueId}` — Standings updates (homeruns, trades)
- `homeruns-{leagueId}` — Homerun notifications
- `trades-{leagueId}` — Trade proposals

### Server-Side Timer & Consistency

**Problem:** Client-side timers drift, causing timer desync across users.

**Solution:** Server sends timer start time; clients calculate remaining time.

```
Server publishes to Pusher: { timerStartTime: Date.now() }
Client calculates: 60 - (Date.now() - timerStartTime) / 1000
On next Pusher event, timer re-syncs
```

### Presence Tracking (Who's Online)

```
presenceChannel = pusher.subscribe('presence-draft-{leagueId}')
Shows: connected members, join/leave events
```

---

## 7. Authentication Flow (Google OAuth + Invite Auto-Join)

### OAuth Configuration (NextAuth.js v5)

**File:** `/app/api/auth/[...nextauth]/route.ts`

**Key Features:**
- Google OAuth provider (no magic link)
- PrismaAdapter for session management
- JWT-based sessions (Vercel-friendly)
- Redirect callback preserves inviteLeague param

### Invite Link Flow

**Step 1: Commissioner creates league**
```
POST /api/leagues
→ { leagueId: "abc123", joinLink: "yourdomain.com/join/abc123" }
```

**Step 2: Friend clicks invite link**
```
yourdomain.com/join/abc123
```

**Step 3: Redirect flow**
```
If logged in → Auto-join + redirect to league
If not logged in → Redirect to /auth/signin?inviteLeague=abc123
```

**Step 4: After OAuth callback**
```
NextAuth redirect handler → /join/abc123?complete=true
Client detects complete=true → POST /api/leagues/abc123/join
User auto-added to league_memberships
Redirect to /league/abc123
```

---

## 8. Push Notification Architecture

### Web Push Setup (Zero Cost)

**Step 1: Generate VAPID Keys (one-time)**
```bash
npx web-push generate-vapid-keys
```

**Step 2: Service Worker Push Event Handler**

Service worker listens for push events from Web Push Protocol and displays notifications.

**Step 3: Client-Side Subscription**

When user joins league:
1. Request notification permission
2. Subscribe to push via `serviceWorkerRegistration.pushManager.subscribe()`
3. Send subscription endpoint to backend
4. Store in PushSubscription table

**Step 4: Backend Sends Notifications**

When homerun/trade/pick happens:
1. Query PushSubscription table for affected users
2. Use `web-push` npm library to send notification
3. Graceful degradation: if subscription invalid (410 error), mark as inactive

### Notification Types

- **Homerun:** "Player X hit a homerun!" (tag: `homerun-{playerId}`)
- **Trade Proposal:** "New trade offer" (tag: `trade-{tradeId}`)
- **Trade Accepted/Rejected:** "Trade status update" (tag: `trade-{tradeId}`)
- **Draft Pick:** "X selected player Y" (tag: `draft-{leagueId}`)

### Fallback for Users Who Deny Permission

For users who deny push permission:
- Implement lightweight in-app notification center
- Poll `/api/recent-events/{leagueId}` every 5-10 seconds
- Show toast for trades, homeruns, standings changes

---

## 9. PWA Strategy (next-pwa v5)

### Configuration (Zero-Config)

**File:** `/next.config.js`

next-pwa auto-generates:
- `manifest.json` — PWA metadata
- `service-worker.js` — Offline caching + push handling
- Icons and metadata in `<head>`

### Caching Strategy

```
statsapi.mlb.com API    → Network-first (always try live, fall back to cache)
Your API                → Network-first (always try server, fall back to cache)
Static assets (JS/CSS)  → Cache-first (serve from cache, check for updates)
```

### iOS Installation Flow

**User Experience:**
1. Open Safari on iOS 16.4+
2. Navigate to `https://yourdomain.com`
3. Tap Share → "Add to Home Screen"
4. Confirm name, tap "Add"
5. App launches fullscreen
6. After install, push notifications enabled

**Requirements:**
- Manifest.json at `/manifest.json`
- Icons (192x512 regular + maskable versions)
- Service worker registered
- `display: "standalone"` in manifest
- Apple meta tags in `<head>`

### Android Installation Flow

**User Experience:**
1. Install prompt appears automatically after 2-3 visits
2. Or user manually "Add to Home Screen"
3. App launches fullscreen
4. Push notifications work best if installed (but work without)

### Service Worker Update Strategy

**next-pwa Default:** Silent update + in-app toast

- New service worker activates in background
- Toast appears: "New version available—refresh to see changes"
- User can choose when to refresh
- Prevents interrupting gameplay

---

## 10. Deployment & Scalability (Vercel Pro)

### Deployment Architecture

```
GitHub Repository → Vercel (deployment) → Neon Postgres + Pusher + statsapi.mlb.com
```

### Environment Variables (Required)

```env
# NextAuth.js
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=https://yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=<from console.cloud.google.com>
GOOGLE_CLIENT_SECRET=<from console.cloud.google.com>

# Database (Neon)
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.neon.tech/dbname

# Pusher
NEXT_PUBLIC_PUSHER_APP_KEY=<from pusher.com>
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
PUSHER_APP_ID=<from pusher.com>
PUSHER_SECRET=<from pusher.com>

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>

# Cron Job Authorization
CRON_SECRET=<random-secret>
```

### Vercel Pro Requirement ($20/month)

**Why Pro Plan is Required:**
- Cron Functions (scheduled tasks) available on Pro+ only
- Free tier does NOT support `/api/cron/*`
- This is non-negotiable for homerun polling

**Alternative (if budget-constrained):**
- Use external cron service (EasyCron, cronitor.io) that calls your API
- Costs ~$5-10/month but adds operational complexity

### Scaling Strategy (MVP → 100+ Leagues)

| Metric | MVP (1 league) | Growth (10 leagues) | Scale (100+ leagues) |
|--------|---|---|---|
| **Concurrent Users** | 20 | 200 | 2000+ |
| **Pusher Channels** | 100 | 1,000 | 10,000+ |
| **Neon Connections** | ~5 | ~50 | 100-200 |
| **Polling Jobs** | 1 per 5min | 10 per 5min | 100+ per 5min |
| **Monthly Cost** | $20 | $20 (free tiers) | $50-100 (upgrades) |

**Scaling Actions:**
1. **Pusher:** Free tier → Starter plan ($49/mo) at 1,000 concurrent users
2. **Neon:** Free tier → Pay-as-you-go (~$50/mo) at 100GB data
3. **Vercel:** Already paying $20/mo (Pro is enough)

### Database Connection Pooling

**Neon PgBouncer (built-in):**
- Transaction mode: Optimal for serverless (each request gets pooled connection)
- 25 concurrent connections default (sufficient for 100+ serverless functions)
- No additional configuration needed

### Database Backups & Recovery

**Neon automatic backups:**
- Hourly backups for 7 days
- Point-in-time recovery available
- No additional configuration

---

## 11. Implementation Sequence (Recommended)

### Phase 1: Foundation (Week 1-2)
- [ ] Neon Postgres setup + Prisma schema
- [ ] NextAuth.js v5 + Google OAuth
- [ ] Basic league CRUD endpoints
- [ ] Deploy to Vercel

### Phase 2: Draft Room (Week 3)
- [ ] Pusher integration
- [ ] Draft room real-time UI
- [ ] statsapi.mlb.com player fetching
- [ ] Draft logic (pick validation, timer, auto-pick)

### Phase 3: Homerun Tracking (Week 4)
- [ ] Cron job: poll-homeruns
- [ ] Homerun event logging
- [ ] Standings recalculation via Pusher
- [ ] Cron job: draft-timeout

### Phase 4: Trades (Week 5)
- [ ] Trade CRUD endpoints
- [ ] Veto system
- [ ] Trade expiration cron job

### Phase 5: Notifications & PWA (Week 6)
- [ ] Web Push API + service worker
- [ ] Push subscription management
- [ ] next-pwa setup + icon generation
- [ ] iOS/Android testing on real devices

### Phase 6: Polish (Week 7)
- [ ] Error handling + user feedback
- [ ] Performance optimization
- [ ] Testing (unit + integration)
- [ ] Launch prep

---

## 12. Development & Testing Infrastructure

### Seeded Development Database

To enable full end-to-end testing before the MLB season starts (March 27), the project includes a comprehensive Prisma seed script that populates your local database with realistic test data.

**File:** `prisma/seed.ts`

**Seed Data Generated:**

1. **50-100 MLB Players** (from statsapi.mlb.com)
   - Real MLB player names, IDs, and positions
   - Distributed across major teams (Yankees, Red Sox, Dodgers, etc.)
   - Includes mix of starters, bench players, and role players

2. **2-3 Test Leagues**
   - League 1: "Dev Test League" (10 members, homerun-only scoring, draft March 1)
   - League 2: "Advanced Scoring" (8 members, custom scoring rules, draft March 5)
   - League 3: "Solo Practice" (1 commissioner + AI roster, for single-user testing)

3. **10-15 Test Users**
   - Test users with realistic names and emails
   - Each user has a Google ID (mock: `google-dev-user-1`, etc.)
   - Distributed across leagues

4. **Sample Draft Picks** (completed drafts)
   - League 1 & 2: Fully drafted (all rounds completed)
   - Allows immediate testing of standings, rosters, and trades
   - No waiting for draft phase

5. **Sample Rosters & Homerun Events**
   - 5-10 fake homerun events per league (scattered across dates)
   - Pre-calculated scores for each user
   - Allows testing standings recalculation, notifications, and UI updates

**How to Run Locally:**

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Spin up Postgres (if using Docker)
docker-compose up -d postgres

# Run migrations
npx prisma migrate dev --name init

# Seed the database with test data
npx prisma db seed

# Open Prisma Studio to inspect data
npx prisma studio
```

**After seeding, you have:**
- 10-15 logged-in test users ready to use
- 2-3 complete leagues with drafted rosters
- Historical homerun events to see scoring in action
- Immediate ability to test trades, standings, notifications

**Seeding Best Practices:**
- Seed script is idempotent (safe to run multiple times)
- Always runs in development (`NODE_ENV=development`)
- Falls back gracefully if statsapi.mlb.com is unavailable (uses hardcoded fallback players)

### Dev-Only "Trigger Homerun" Endpoint

To test the complete homerun event pipeline without waiting for real MLB games, a development-only endpoint simulates homerun events with full side effects.

**Endpoint:** `POST /api/dev/trigger-homerun`

**Security:**
- **Only available in development mode** (`NODE_ENV=development`)
- Automatically disabled in production
- Guard at route handler entry:

```typescript
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }
  // ... rest of handler
}
```

**Request Body:**
```json
{
  "leagueId": "abc123",
  "userId": "user-1",
  "playerId": "660285",
  "playerName": "Aaron Judge",
  "gameId": "test-game-001",
  "inning": 3,
  "team": "NYY"
}
```

**Response (201 Created):**
```json
{
  "event": {
    "id": "hr-event-xyz",
    "leagueId": "abc123",
    "playerId": "660285",
    "playerName": "Aaron Judge",
    "inning": 3,
    "gameId": "test-game-001",
    "detectedAt": "2026-02-18T14:30:00Z"
  },
  "scoreDelta": {
    "userId": "user-1",
    "previousScore": 15,
    "newScore": 16,
    "pointsAwarded": 1
  },
  "notificationSent": true,
  "pusherBroadcast": true
}
```

**Full Pipeline Tested:**

1. **Creates HomerrunEvent record** in database
2. **Updates affected user's score** (finds all roster_spots for playerId)
3. **Sends push notification** (if user subscribed to league)
4. **Broadcasts via Pusher**:
   - `homeruns-{leagueId}` channel — Real-time homerun feed
   - `standings-{leagueId}` channel — Updated standings/scores
5. **Returns success payload** with scoring delta

**Example Usage in Frontend Testing:**

```typescript
// Simulate Aaron Judge homerun in Dev League
const response = await fetch('/api/dev/trigger-homerun', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leagueId: 'league-dev-1',
    playerId: '660285',
    playerName: 'Aaron Judge',
    gameId: 'test-game-001',
    inning: 3,
    team: 'NYY'
  })
})

const { event, scoreDelta, notificationSent } = await response.json()
console.log(`${event.playerName} hit a homerun!`)
console.log(`${scoreDelta.userId} gained ${scoreDelta.pointsAwarded} point(s)`)
```

**Testing Scenarios Enabled:**

| Scenario | How to Test |
|----------|------------|
| **Real-time standings update** | Trigger homerun, observe standings refresh via Pusher |
| **Push notifications** | Subscribe to push, trigger homerun, verify notification appears |
| **Draft room + live scoring** | Join draft, trigger homerun, see score change in real-time |
| **Trade acceptance with scoring** | Accept trade, trigger homerun for new roster player, verify score update |
| **Standings ranking** | Trigger multiple homeruns across users, verify leaderboard recalculation |

### Development Mode Environment

**File:** `.env.development` (or `.env.local`)

```env
# Required for dev seeding & trigger endpoint
NODE_ENV=development
NEXT_PUBLIC_DEV_MODE=true

# Development database (local or Neon)
DATABASE_URL=postgresql://dev:dev@localhost:5432/fantasy_baseball_dev

# Mock/test credentials (not real secrets)
NEXTAUTH_SECRET=dev-secret-do-not-use-in-prod
GOOGLE_CLIENT_ID=dev-client-id
GOOGLE_CLIENT_SECRET=dev-client-secret

# Pusher (use free tier dev app)
PUSHER_APP_ID=dev-app-123
NEXT_PUBLIC_PUSHER_APP_KEY=dev-key-abc
PUSHER_SECRET=dev-secret-xyz

# Optional: Disable external APIs for offline testing
MOCK_STATSAPI=true
MOCK_PUSHER=false
```

### Testing Workflow (MVP Launch)

**Pre-Launch Checklist:**

1. **Local Development Environment Setup**
   - Clone repo, install dependencies
   - Run `npx prisma db seed` to populate test data
   - Verify `npm run dev` starts without errors

2. **Manual Smoke Tests**
   ```bash
   # Test draft room
   - Open /league/league-dev-1 in 2 browser tabs
   - Make picks in one tab, see real-time update in other
   - Verify Pusher presence shows both users

   # Test homerun pipeline
   - POST /api/dev/trigger-homerun with league & player
   - Verify homerun appears in recent events
   - Verify standings update
   - Verify push notification if subscribed

   # Test trades
   - Propose trade between test users
   - Accept/reject and verify score recalculation
   - Veto a trade and verify cascade

   # Test standings
   - View standings after multiple homeruns
   - Verify score ordering matches events
   ```

3. **End-to-End Scenarios**
   - **Scenario 1:** Create league → invite users → draft → trigger homeruns → check standings
   - **Scenario 2:** Draft → propose trade → trigger homerun on new player → verify score
   - **Scenario 3:** Multiple leagues → trigger homerun in one → verify isolation (doesn't affect other)

4. **PWA Installation Testing** (before launch)
   - Open app in iOS Safari 16.4+ → "Add to Home Screen" → verify fullscreen
   - Open app in Android Chrome → test "Install" prompt
   - Test offline mode → go offline → verify cached assets load
   - Test push notifications → send notification → verify receipt

5. **Real-Time Sync Testing**
   - Open 3 tabs of same league
   - Trigger homerun in one tab
   - Verify all 3 tabs update <100ms (via Pusher)
   - Verify no race conditions in score recalculation

6. **Database Consistency**
   - After each test scenario, run `SELECT COUNT(*) FROM homerun_events`
   - Verify no duplicate playByPlayId values
   - Verify cascade deletes work (delete league → verify orphaned records cleaned)

### Dev-Only Features Summary

| Feature | Dev Only? | How to Access | When to Use |
|---------|-----------|---------------|------------|
| **Seed Script** | Yes | `npx prisma db seed` | Setup: initial database population |
| **Trigger Homerun** | Yes | `POST /api/dev/trigger-homerun` | Testing: event pipeline without real games |
| **Prisma Studio** | Yes | `npx prisma studio` | Debugging: inspect/edit database directly |
| **Mock statsapi** | Optional | `MOCK_STATSAPI=true` | Testing: offline, faster local dev |
| **Dev Leagues** | No | Created via seed, real endpoints | Staging: realistic user workflows |

### Deployment Safeguards

**The dev-only endpoint is automatically disabled in production:**

```typescript
// In /api/dev/trigger-homerun/route.ts
export async function POST(request: NextRequest) {
  // Fail-safe: always check NODE_ENV at handler entry
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Endpoint not available' },
      { status: 403 }
    )
  }
  // Handler code
}
```

**Vercel Production Environment:**
- `NODE_ENV=production` is set automatically
- Dev endpoint returns 403 Forbidden
- Seed script `prisma/seed` is never executed in prod
- All test data stays local only

---

## 13. Key Architectural Decisions

### Decision 1: Google OAuth Only (No Magic Link)
- **Trade-off:** Simpler auth, but users need Google account
- **Rationale:** Reduces email infrastructure dependency; faster onboarding

### Decision 2: Cron Jobs via Vercel (Requires Pro)
- **Trade-off:** $20/month cost, but no separate worker service
- **Rationale:** Integrated monitoring, single deployment target, managed by Vercel

### Decision 3: Real-Time Standings via Pusher (Not Neon)
- **Trade-off:** Instant updates, but $49/mo at scale
- **Rationale:** Server-side calculation prevents race conditions; presence tracking; free tier adequate for MVP

### Decision 4: Multi-Tenant Scoping (Middleware + Route Guards)
- **Trade-off:** Slightly more code, but defense in depth
- **Rationale:** Catches developer errors; prevents accidental data leaks

### Decision 5: Service Worker Update (Silent + Toast)
- **Trade-off:** Seamless, but user may not notice
- **Rationale:** Best UX—no interruptions, optional refresh available

### Decision 6: Dev-Only Trigger Homerun Endpoint (Not Mocking in Production)
- **Trade-off:** Extra route handler code, but complete safety isolation
- **Rationale:** Enables full E2E testing of event pipeline; disabled in production via NODE_ENV check; safe guard prevents accidental exposure

---

## 14. Tech Stack Summary & Costs

| Service | Tier | Cost/Month | Limit | When to Upgrade |
|---------|------|-----------|-------|-----------------|
| Vercel | Pro | $20 | Cron + API | (Required) |
| Neon | Free | $0 | 10GB storage | 100GB+ data |
| Pusher | Free | $0 | 100 concurrent | $49 at 1000+ users |
| Web Push | Free | $0 | Unlimited | (N/A) |
| Google OAuth | Free | $0 | Unlimited | (N/A) |
| statsapi | Free | $0 | No limit | (Monitor uptime) |
| **Total** | | **$20/mo** | Adequate for MVP | Scale phase 2 |

---

**This architecture is production-ready for MVP launch (April 2026). All decisions prioritize team velocity while maintaining a clear path to scaling and eventual App Store release.**
