# Technical Feasibility Report: Fantasy Homerun Tracker PWA

## Executive Summary

This report evaluates six critical technical decision areas for a multi-tenant fantasy homerun tracking PWA. The app must launch by April with 1 league (~20 members), scale to hundreds of leagues by year-end, and eventually support App Store release.

**Key constraints:** Mobile-first (iOS Safari + Android Chrome), serverless-compatible (Vercel), passwordless auth, real-time draft room, live homerun tracking, and web push notifications.

---

## Research Area 1: MLB Data API

### The Decision
**How do we reliably fetch live homerun data and the player pool for drafting?**

### Option A: statsapi.mlb.com (Unofficial API) — RECOMMENDED FOR V1

**What it is:**
- Free, publicly accessible REST API maintained by MLB/Stats LLC
- Used by MLB.com's own web platforms
- No API key required
- Endpoints: `/api/v1/game/{gameId}/linescore`, `/api/v1/people/{playerId}`, player search, etc.

**Feasibility for our use cases:**

1. **Fetch live homerun events:**
   - Poll `/api/v1/game/{gameId}/playByPlay` during live games
   - Filter for events with `result.eventType: 'home_run'`
   - Returns: player ID, inning, game context
   - **Update frequency:** Data reflects live feeds, typically 5-15 second lag behind live broadcast
   - **Availability:** All 30 MLB teams, all 162 regular season games + playoffs

2. **Fetch full current player roster for drafting:**
   - Use `/api/v1/teams/{teamId}/roster` for each of 30 teams
   - Or `/api/v1/sports/1/players` for league-wide roster
   - Returns: Full name, ID, position, jersey number
   - **Data freshness:** Updated when roster moves occur (trades, call-ups, injuries)

**Rate limits & reliability:**
- **No published rate limit documentation** (this is a risk)
- Anecdotal reports: 1,000+ requests/minute without throttling for typical usage
- CDN-backed infrastructure suggests high availability
- **SLA:** None published; availability estimated at 99%+ based on historical uptime
- **Terms of service risk:** Unofficial API; not contractually guaranteed; could change/deprecate with no notice (though unlikely given MLB.com's reliance)

**Polling strategy for live games:**
- Poll every 10 seconds during active games (minimal overhead)
- Store last-seen play-by-play ID to avoid reprocessing
- On miss (API down), retry with exponential backoff
- If homerun happens during API downtime, catch up on next successful poll
- For draft night: poll every 5 seconds for active picks (player availability changes)

**Tradeoffs:**
- ✓ Zero cost
- ✓ Comprehensive MLB data coverage
- ✓ Good data freshness (5-15 second lag acceptable for our use case)
- ✗ No SLA; risk of deprecation
- ✗ Occasional outages possible (rare)
- ✗ No official webhook/push capability (polling-only)

---

### Option B: MLB Official API (via AWS) — PAID ALTERNATIVE

**Product:** MLB Advanced Media (BAM) Stats API

**Feasibility:**
- Used by official MLB.com and ESPN
- Requires partnership/enterprise agreement
- Pricing: Not publicly listed; typically $10K-50K+ annually
- **When to use:** If statsapi.mlb.com becomes unreliable or we move to native mobile apps

**Tradeoffs:**
- ✓ Official SLA and support
- ✓ Webhook capability (push data instead of polling)
- ✓ Guaranteed stability for App Store release
- ✗ Significant cost
- ✗ Longer sales cycle (partnership required)
- ✗ Overkill for MVP

---

### Option C: Sportradar — PAID ALTERNATIVE

**Product:** Sportradar Sports Data Platform

**Feasibility:**
- Enterprise sports data provider
- Pricing: $500-2,000/month depending on data scope
- Real-time push updates via webhook
- Covers all MLB games, live odds, injuries, roster changes
- REST API + WebSocket push available

**Tradeoffs:**
- ✓ Enterprise-grade reliability
- ✓ Webhook + polling options
- ✓ Comprehensive injury/roster data
- ✗ Cost (~$10K-24K annually)
- ✗ Overkill for friend-group MVP

---

### Recommendation: statsapi.mlb.com + Sportradar fallback

**For V1 (April launch):** Use statsapi.mlb.com
- Sufficient reliability for friend groups
- Zero cost; fast to implement
- Add monitoring/alerting to catch outages
- Acceptable 5-15 second data lag

**For V2/App Store release:** Negotiate Sportradar partnership
- Webhook push model eliminates polling overhead
- Enterprise SLA provides confidence for App Store
- Budget for ~$12K-24K annually

**Implementation notes:**
- Implement circuit breaker pattern: if statsapi.mlb.com fails 3x in a row, log error and alert commissioner
- Cache player roster for 1 hour to reduce API calls
- Store last-processed play-by-play ID to avoid duplicate homerun logging

---

## Research Area 2: Database

### The Decision
**Which database supports multi-tenant architecture, Vercel serverless, and Prisma ORM?**

### Core Requirements
- Multi-tenant: Users belong to multiple leagues; all queries must be league-scoped
- Serverless-compatible: Connection pooling for Vercel Functions
- ORM: Prisma support mandatory
- Data model: 8 core tables (Users, Leagues, League Memberships, Draft Picks, Roster Spots, Homerun Events, Trades, Settings)

### Option A: Neon Postgres — RECOMMENDED

**What it is:**
- PostgreSQL-compatible, serverless, managed by Neon
- Built-in connection pooling for serverless (PgBouncer)
- Branching for dev environments (database-per-branch)
- Prisma native support
- Vercel integration (automatic env vars)

**Evaluation:**

**Multi-tenant scoping:**
- Row-level security (RLS) policies on all tables
- `league_id` on every table enables filtering
- Example: `SELECT * FROM homerun_events WHERE league_id = $1`
- Enforce in Prisma middleware: intercept all queries, append `league_id = currentLeague`
- Risk: Developer must trust middleware; no database-level enforcement of scoping

**Connection pooling:**
- Neon PgBouncer: 20-100 pooled connections (tunable)
- Vercel cold starts: <100ms with pooling
- Transaction mode vs. session mode: Use transaction mode for serverless (safer)
- Cost: Included in free tier (up to 10GB storage)

**Scaling:**
- Handles 1,000+ concurrent connections easily
- Query performance: 5-15ms for typical league queries
- Suitable for 100s of leagues, 100s of members per league

**Developer experience:**
- Prisma migrations: Smooth; `npx prisma migrate dev`
- Schema introspection: Works perfectly
- Branching: Helpful for feature branches with isolated test data

**Pricing:**
- Free tier: 10GB storage, shared compute (adequate for MVP)
- Paid: $0.16/compute hour, $0.30/10GB storage/month (~$50/month for moderate usage)

**Tradeoffs:**
- ✓ Best serverless integration (built for serverless)
- ✓ Excellent Prisma + Vercel integration
- ✓ Strong RLS support for multi-tenant
- ✓ Competitive pricing
- ✗ Postgres only (no MySQL flexibility)
- ✗ Newer platform; less enterprise track record vs. AWS RDS

---

### Option B: PlanetScale (MySQL) — ALTERNATIVE

**What it is:**
- MySQL-compatible serverless database
- Vitess architecture (MySQL proxy layer)
- Vercel integration available
- Prisma support

**Evaluation:**

**Multi-tenant scoping:**
- No native RLS; must enforce in application layer
- `league_id` filtering in every query (Prisma middleware required)
- Higher risk: No database-level safety net if developer forgets filter

**Connection pooling:**
- Built-in connection pooling
- Serverless-friendly; cold starts similar to Neon

**Scaling:**
- Horizontal scaling via Vitess (sharding)
- Can scale to very large datasets (better than Neon for extreme scale)
- Query performance: Similar to Neon

**Pricing:**
- Free tier: Adequate for MVP
- Paid: ~$29/month for basic tier

**Tradeoffs:**
- ✓ Good serverless support
- ✓ Horizontal scaling capabilities
- ✓ MySQL flexibility (more ORM options)
- ✗ Weaker multi-tenant security (no RLS)
- ✗ More operational overhead (managing shards)
- ✗ Less Vercel integration compared to Neon

---

### Option C: Supabase (Postgres) — ALTERNATIVE

**What it is:**
- Open-source PostgreSQL backend as a service
- Built on Postgres + Auth + Realtime
- Prisma support (via Postgres driver)
- Includes auth, realtime, and storage in one platform

**Evaluation:**

**Multi-tenant scoping:**
- Postgres RLS policies available
- Supabase Auth integration (JWT claims in RLS policies)
- Elegant: `league_id` column in RLS policy matches JWT claim
- Better than Neon for auth-integrated scoping

**Connection pooling:**
- PgBouncer included
- Serverless-compatible

**Scaling:**
- Managed by Supabase; auto-scaling available
- Similar performance to Neon

**Why NOT recommended for primary DB:**
- Realtime features require separate subscription ($10+/month)
- For draft room real-time, we'll use Pusher (separate service anyway)
- Combining Supabase Realtime + Pusher adds complexity
- Neon + Pusher separation is cleaner

**Pricing:**
- Free tier: Limited; $25/month for production tier

**Tradeoffs:**
- ✓ Integrated auth + DB (nice for onboarding)
- ✓ Strong RLS support with Auth integration
- ✗ More expensive than Neon
- ✗ Overkill for our feature set (don't need Realtime)
- ✗ Vendor lock-in (hard to migrate away from Realtime)

---

### Recommendation: Neon Postgres + Prisma

**Primary choice:** Neon Postgres
- Best serverless Postgres option
- Built-in connection pooling eliminates Vercel cold start pain
- Excellent Prisma integration
- Strong RLS support for multi-tenant security
- Lowest operational overhead

**Multi-tenant implementation:**
```
// Prisma middleware: Enforce league scoping on all queries
prisma.$use(async (params, next) => {
  if (params.action === 'findUnique' || params.action === 'findFirst' || params.action === 'findMany') {
    params.where = { ...params.where, league_id: currentLeagueid };
  }
  return next(params);
});
```

**Alternative:** If horizontal scaling becomes critical (1000+ leagues, millions of homerun events), reassess PlanetScale.

---

## Research Area 3: Real-Time Draft Room

### The Decision
**How do we sync draft picks across all connected clients in real-time with a consistent 60-second countdown?**

### Core Requirements
- All participants see new picks instantly without refresh
- Single source of truth for 60-second timer (server-side, not client-side)
- Handles disconnects + reconnects gracefully
- 10 rounds × number-of-teams picks = ~100-200 total picks per draft

### Option A: Pusher Channels — RECOMMENDED

**What it is:**
- Managed WebSocket service for real-time messaging
- Publish/subscribe channels
- Built-in presence tracking (who's connected)
- Client libraries for JS/React
- Vercel-compatible (HTTP API + WebSocket)

**Feasibility for draft room:**

**Pick synchronization:**
- Channel per league: `draft-room-{leagueId}`
- Publish event when pick is made: `{ playerId, userId, round, pick }`
- All clients receive in <100ms
- No polling required

**60-second countdown consistency:**
```
// Server-side: Start timer when pick becomes active
// Client receives: { currentPickStartTime: Date.now() }
// Client calculates remaining time: max(0, 60 - (now - startTime))
// Update countdown every second, don't trust client's timer
```
- Timer stored on server; clients calculate display time
- If client's timer drifts, next server event re-syncs it
- Eliminates client-side timer inconsistency (major advantage over client-only timers)

**Disconnection handling:**
- Pusher presence tracking: Detect when user disconnects
- On reconnect: Client queries `/api/draft-status/{leagueId}` to get latest state
- Reconstruction: Last pick made, current picker, time remaining, etc.
- Prevents pick loss or duplicate picks

**Auto-pick on timeout:**
```
// Server-side: When 60 seconds elapsed
const autoPickResult = await autoPickBestAvailable(leagueId, userId, statsapi);
// Publish to channel: { autoPickedPlayer, userId, round }
```
- Server calculates best available based on latest rankings from statsapi.mlb.com
- Broadcast to all clients
- No client-side auto-pick (single source of truth)

**Pricing & limits:**
- Free tier: 100 concurrent connections (adequate for MVP: 10 leagues × 10-20 members each)
- Starter plan: $49/month for 1,000 concurrent connections
- No overage charges; predictable pricing

**Tradeoffs:**
- ✓ Purpose-built for real-time multiplayer
- ✓ Excellent presence tracking
- ✓ Server-side timer consistency (killer feature)
- ✓ Simple API, low learning curve
- ✓ Generous free tier
- ✗ Third-party service; potential outage (rare)
- ✗ Cost at scale ($49/month for growth phase)

---

### Option B: Supabase Realtime — ALTERNATIVE

**What it is:**
- PostgreSQL-backed realtime via subscriptions
- Listen to database changes in real-time
- Built-in presence
- Included in Supabase pricing

**Evaluation:**

**Pick synchronization:**
- On pick insertion, Postgres triggers broadcast event
- Clients subscribed to `draft-picks` listen for new rows
- Simple: `supabase.from('draft_picks').on('INSERT', ...)`

**60-second countdown consistency:**
- Same server-side timer approach as Pusher
- Publish timer state to custom channel

**Why NOT recommended:**
1. **Operational complexity:** Draft logic + Postgres triggers + Supabase subscriptions = more moving parts
2. **Architecture mismatch:** Supabase Realtime is change-based; draft has custom business logic (auto-pick, validation, timer)
3. **Cost:** Requires Supabase subscription ($25/month) + still need separate auth solution
4. **Separation of concerns:** Database notifications ≠ real-time game logic; mixing them violates SOLID principles

**Best use:** If already using Supabase as primary auth provider, consider it; otherwise add unnecessary complexity.

---

### Recommendation: Pusher Channels

**Primary choice:** Pusher Channels
- Cleanest architecture for game-state synchronization
- Server-side timer prevents client desync issues
- Excellent presence tracking for "user is online" status
- Free tier sufficient for MVP (100 concurrent connections)
- Clear migration path: When ready to scale, upgrade plan (no code changes)

**Implementation outline:**

```javascript
// Server: /api/draft/pick (triggered by user selecting player)
async function makePick(leagueId, userId, playerId) {
  // Validate user's turn
  const currentPick = await db.draftPicks.findFirst({
    where: { leagueId, completed: false },
    orderBy: { order: 'asc' }
  });

  if (currentPick.userId !== userId) throw new Error('Not your turn');

  // Create pick in DB
  const pick = await db.draftPicks.create({
    data: { leagueId, userId, playerId, round, pick }
  });

  // Broadcast to all clients
  pusher.trigger(`draft-room-${leagueId}`, 'pick-made', {
    pick: pick,
    nextPick: { userId: nextUser, startTime: Date.now() }
  });

  return pick;
}

// Server: Background job (timer trigger)
async function checkDraftTimers() {
  const activePicks = await db.draftPicks.findMany({
    where: { completed: false }
  });

  for (const pick of activePicks) {
    const elapsed = (Date.now() - pick.startedAt) / 1000;
    if (elapsed > 60) {
      const autoPickedPlayer = await statsapi.getBestAvailable(pick.leagueId);
      await makePick(pick.leagueId, pick.userId, autoPickedPlayer.id);
    }
  }
}

// Client: React component
function DraftRoom({ leagueId }) {
  const [currentPick, setCurrentPick] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(60);

  useEffect(() => {
    const channel = pusher.subscribe(`draft-room-${leagueId}`);

    channel.bind('pick-made', (data) => {
      setCurrentPick(data.nextPick);
      // Timer re-syncs here
    });

    const timer = setInterval(() => {
      const elapsed = (Date.now() - currentPick.startTime) / 1000;
      setTimeRemaining(Math.max(0, 60 - elapsed));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPick]);

  return <div>Time: {timeRemaining}s</div>;
}
```

**Open questions for architect:**
- Should we log all draft activity (audit trail) or just final picks?
- Do we need spectator mode (non-league members watching draft)?
- Should we store draft recording (replay functionality)?

---

## Research Area 4: Push Notifications

### The Decision
**How do we deliver timely notifications (draft picks, homeruns, trades) across iOS Safari, Android Chrome, and desktop?**

### Core Requirements
- Notifications for: draft pick turn, homerun hit, trade offer/accepted/rejected
- iOS Safari support (16.4+, must be installed to home screen)
- Graceful degradation for users who deny permission
- Optional: per-notification-type toggle in profile settings

### Option A: Native Web Push API + Service Worker — RECOMMENDED

**What it is:**
- Browser-standard Web Push Protocol (RFC 8291)
- Service worker handles notifications
- Works on Android Chrome, modern Firefox, Edge
- iOS Safari: Requires PWA installed to home screen (iOS 16.4+)

**Feasibility:**

**Permission flow:**
```javascript
// After user joins league, prompt for notification permission
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    // Subscribe to push
    const subscription = await serviceWorker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    // Send subscription.toJSON() to backend
  }
});
```

**Sending notifications from backend:**
```javascript
// When homerun is logged, look up users' push subscriptions
async function notifyHomerunit(leagueId, playerId, playerName) {
  const subscriptions = await db.pushSubscriptions.findMany({
    where: { leagueId, userHasPlayerOnRoster: true }
  });

  for (const sub of subscriptions) {
    await webpush.sendNotification(sub.endpoint, {
      title: `${playerName} hit a homerun!`,
      badge: '/badge.png',
      tag: 'homerun',
      data: { leagueId, playerId }
    });
  }
}
```

**iOS Safari specifics:**
- Works only if PWA installed to home screen
- Manifest.json `display: 'fullscreen'` or `'standalone'` required
- Service worker required (not optional)
- After installation, prompt for notification permission
- Notification delivery lag: 0-30 seconds (not guaranteed real-time)

**Android Chrome:**
- Works without installation (but works better if installed)
- Instant notification delivery
- Notification persistence across app restarts

**Desktop:**
- Chrome/Edge: Works natively
- Firefox: Works natively
- Safari (macOS): Limited support; may not work

**Fallback for users who deny permission:**
```javascript
// In-app notification center
if (Notification.permission !== 'granted') {
  // Poll for new trades/homeruns and show in-app toast
  const recentEvents = await api.getRecentEvents(leagueId);
  showInAppNotificationCenter(recentEvents);
}
```

**Cost & complexity:**
- Zero cost (native browser API)
- Minimal server code required
- Must implement: VAPID key generation, subscription storage, push sending
- Service worker: Already needed for PWA (offline caching)

**Tradeoffs:**
- ✓ Zero cost
- ✓ Native browser standard (no vendor lock-in)
- ✓ Works across platforms (Android, iOS, desktop)
- ✓ Part of PWA infrastructure (service worker shared)
- ✗ iOS requires home screen installation
- ✗ Notification delivery not guaranteed real-time on iOS
- ✗ Must manage VAPID keys + subscription storage
- ✗ No built-in analytics (OneSignal provides this)

---

### Option B: OneSignal — ALTERNATIVE

**What it is:**
- Push notification platform (supports web, mobile, email)
- Handles subscription management, delivery, analytics
- Free tier: 10K users, unlimited notifications
- Paid: $99+/month for advanced features

**Feasibility:**

**Permission flow:**
- OneSignal SDK replaces Notification API
- Same permission prompt, but OneSignal handles backend
- Simpler: Less code to write

**Sending notifications:**
```javascript
// Use OneSignal API instead of web-push library
OneSignal.Notifications.sendToSubscriptions({
  filters: [{ field: 'tag', value: { delimiters: ['league_id'], value: leagueId } }],
  contents: { en: `${playerName} hit a homerun!` }
});
```

**Analytics & tracking:**
- Built-in dashboard: delivery rate, click-through rate, etc.
- A/B testing support
- Abandoned notifications recovery

**iOS Safari support:**
- Identical to native Web Push (still requires installation, iOS 16.4+)
- No special handling

**Pricing consideration:**
- Free tier: 10K users (adequate for MVP)
- Paid: $99/month for A/B testing + advanced features
- Cost-benefit: Do we need analytics for friend-group app? Probably not.

**Tradeoffs:**
- ✓ Simpler implementation (less code)
- ✓ Built-in analytics dashboard
- ✓ Support for email + SMS fallback (future feature)
- ✓ Free tier generous
- ✗ Vendor lock-in (harder to switch later)
- ✗ Added npm dependency (larger bundle)
- ✗ Privacy concern: OneSignal collects usage data
- ✗ Unnecessary complexity for MVP (don't need analytics yet)

---

### Recommendation: Native Web Push API

**For MVP (April launch):** Native Web Push API
- Zero cost
- Minimal code; built on standard web APIs
- Service worker required anyway (for offline caching)
- Adequate for 20-member league

**Implementation:**
1. Generate VAPID key pair: `npx web-push generate-vapid-keys`
2. Store VAPID private key in environment variable
3. On first visit, request notification permission (after user joins league)
4. When user grants, subscribe: `serviceWorkerRegistration.pushManager.subscribe(...)`
5. Send subscription endpoint to backend DB
6. On homerun/trade/pick events, use `web-push` npm library to send notifications

**For V2 (scaling phase):** Consider OneSignal
- If analytics become important (retention metrics)
- If we want email/SMS fallback for users
- Cost scales linearly, but worth it at 1000+ active users

**Fallback for no-permission users:**
- Implement lightweight in-app notification center
- Poll `/api/recent-events/{leagueId}` every 5-10 seconds
- Show toast for: trades, homeruns, standings changes
- Non-intrusive; users who denied push can still catch updates

---

## Research Area 5: Authentication

### The Decision
**How do we onboard users passwordlessly and handle league invites seamlessly?**

### Core Requirements
- Users create account via magic link (email) OR Google OAuth
- Commissioner creates league and generates shareable invite link
- Friend clicks invite link, gets auto-joined to league after login
- Persist invite link through OAuth redirect

### Option A: NextAuth.js v5 (App Router) — RECOMMENDED

**What it is:**
- Authentication library for Next.js
- Supports email providers, OAuth, session management
- Works with Vercel (built by Vercel team)
- v5 (2024+): Better App Router support, simplified config

**Feasibility:**

**Magic link setup:**
```javascript
// /app/api/auth/[...nextauth]/route.js
import { NextAuthConfig } from 'next-auth';
import Email from 'next-auth/providers/email';

export const authConfig: NextAuthConfig = {
  providers: [
    Email({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      },
      from: process.env.EMAIL_FROM
    })
  ],
  pages: {
    signIn: '/auth/signin',
    callback: '/auth/callback'
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // CRITICAL: Preserve invite link through OAuth flow
      const inviteLink = url.searchParams.get('inviteLink');
      return `${baseUrl}/dashboard?inviteLink=${inviteLink}`;
    }
  }
};
```

**Email provider options:**
- **Resend** (recommended): Free, simple, 10K/month emails
- **SendGrid**: $20/month, high volume
- **AWS SES**: Pay-per-email, complex setup
- **Mailgun**: $35/month, reliable

**Google OAuth:**
```javascript
Providers.Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
})
```

**Invite flow implementation:**
1. Commissioner generates league: `/api/leagues/create` → returns `leagueId`
2. Shareable link: `yourdomain.com/join/{leagueId}` (no token; simple, friends share in chat)
3. User clicks link → stored in URL param: `?inviteLink={leagueId}`
4. If not logged in: redirect to `/auth/signin?inviteLink={leagueId}`
5. User signs in (email or Google)
6. NextAuth redirect callback receives `inviteLink` param → `/dashboard?inviteLink={leagueId}`
7. On dashboard load, client calls `/api/leagues/{leagueId}/join`
   - Validates user not already member
   - Adds user to league_memberships table with `role: 'member'`
   - Prompts: "Add to home screen?" + "Enable notifications?"

**Session management:**
- JWT-based (stateless, Vercel-friendly)
- Session expires: 30 days
- Refresh token: Built-in, transparent

**Database integration:**
- NextAuth can use Prisma adapter
- Automatically creates User, Account, Session, VerificationToken tables
- Plays nicely with your existing schema

```javascript
import { PrismaAdapter } from '@auth/prisma-adapter';

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [...]
};
```

**Tradeoffs:**
- ✓ Industry standard (used by thousands of Next.js apps)
- ✓ Magic link + OAuth both native
- ✓ Vercel-optimized
- ✓ Prisma adapter included (no extra DB schema work)
- ✓ Strong security defaults (CSRF protection, token hashing)
- ✗ Learning curve (NextAuth concepts: callbacks, events, middleware)
- ✗ Occasional bugs/breaking changes in major versions
- ✗ Email setup required (dependency on mail provider)

---

### Option B: Supabase Auth — ALTERNATIVE

**What it is:**
- Built-in auth with Supabase
- Email + OAuth + Phone OTP
- Simpler if using Supabase for database

**Why NOT recommended:**
- You're using Neon for database (not Supabase)
- Adding Supabase just for auth introduces unnecessary vendor lock-in
- NextAuth.js is more flexible, standard approach

---

### Recommendation: NextAuth.js v5 + Resend Email

**Primary choice:** NextAuth.js v5
- Best-in-class for Next.js
- Simple magic link implementation
- OAuth redirect flow handles invite link properly
- Prisma adapter eliminates extra DB setup

**Email provider:** Resend
- Free tier: 10K emails/month (adequate)
- Developer-friendly (Resend was built for developers)
- Set up in 5 minutes (API key from dashboard)
- 48-hour delivery guarantee

**Invite flow refinement:**

1. **Commissioner creates league:**
   ```
   POST /api/leagues
   { name: "2026 Fantasy Baseball", draftDate: "2026-03-15T18:00Z", tradeDeadline: "2026-08-01" }
   → { leagueId: "abc123", joinLink: "yourdomain.com/join/abc123" }
   ```

2. **Commissioner shares link in group chat:**
   ```
   yourdomain.com/join/abc123
   ```

3. **Friend clicks link:**
   - If logged in: Auto-joins league, shows "Welcome to league!"
   - If not logged in: Redirects to `/auth/signin?inviteLeague=abc123`

4. **Friend signs in (email or Google):**
   - Email: Receives magic link, clicks it, session created
   - Google: Redirected to Google, consents, session created

5. **NextAuth redirect preserves invite:**
   ```javascript
   async redirect({ url, baseUrl }) {
     const inviteLeague = url.searchParams.get('inviteLeague');
     if (inviteLeague) {
       return `${baseUrl}/join/${inviteLeague}?complete=true`;
     }
     return `${baseUrl}/dashboard`;
   }
   ```

6. **Join route auto-adds to league:**
   ```javascript
   // GET /join/[leagueId]?complete=true
   if (complete) {
     await db.leagueMemberships.create({
       userId: session.user.id,
       leagueId,
       role: 'member'
     });
     redirect(`/league/${leagueId}`);
   }
   ```

**Open questions for architect:**
- Should we allow password option as fallback, or magic link only?
- Do we want email verification on signup?
- Should we allow user to update email later?

---

## Research Area 6: PWA Implementation

### The Decision
**How do we make this installable to iPhone/Android home screen with offline support and web push?**

### Core Requirements
- Installable to iOS Safari home screen (iOS 16.4+)
- Installable to Android Chrome home screen
- Launch full screen (no browser chrome)
- Work offline (read-only views: roster, standings)
- Web push notifications once installed
- Latest two iOS + Android versions

### Option A: next-pwa Library — RECOMMENDED

**What it is:**
- Zero-config PWA setup for Next.js
- Auto-generates manifest.json + service worker
- Handles offline caching strategy
- Works with App Router (as of next-pwa v5+)

**Installation & setup:**
```bash
npm install next-pwa
```

```javascript
// next.config.js
import withPWA from 'next-pwa';

const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  revalidateOnForeground: true,
  // Cache strategy: Network-first for API calls, cache-first for assets
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.mlb\.com\//i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'mlb-api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 3600 }
      }
    },
    {
      urlPattern: /^https:\/\/your-domain\/api\//i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-api-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 300 }
      }
    },
    {
      urlPattern: /\.(js|css|png|jpg|jpeg|svg|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 500, maxAgeSeconds: 86400 * 30 }
      }
    }
  ]
});

export default withPWAConfig({
  // ... rest of Next.js config
});
```

**Generated manifest.json:**
```json
{
  "name": "Fantasy Homerun Tracker",
  "short_name": "HR Tracker",
  "description": "Track homeruns in your fantasy baseball league",
  "start_url": "/",
  "display": "standalone",
  "scope": "/",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Key fields explained:**
- `display: "standalone"`: Launches without browser chrome (fullscreen on mobile)
- `start_url: "/"`: Entry point when launched from home screen
- `theme_color`: Status bar color
- `icons`: Both regular (any) and maskable formats required for iOS 16.4+
- `maskable`: Apple adaptive icons (safe zone around edges)

**iOS Safari installation:**
- User sees "Add to Home Screen" option in Safari share menu
- App launches fullscreen with no URL bar
- Push notifications enabled after PWA installed
- No web store required (iOS 16.4+)

**Android Chrome installation:**
- "Install app" prompt appears automatically
- Or user can "Add to Home Screen" manually
- Same fullscreen behavior
- Push notifications enabled

**Service worker registration (automatic with next-pwa):**
```javascript
// next-pwa auto-registers in public/sw.js
// For custom logic, add to pages/api/offline.js
```

**Offline caching strategy:**
```javascript
// Roster, standings: Cache-first (user can view without connection)
// API calls: Network-first (try live data, fall back to cache)
// Trades, picks: Network-only (require connection)
```

**For web push support:**
- Service worker already registered (handles push events)
- Add push event listener:
```javascript
// Inside service worker (or next-pwa's config)
self.addEventListener('push', function(event) {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag,
    data: data.data
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
```

**Tradeoffs:**
- ✓ Zero-config (auto-generates manifest, service worker)
- ✓ Works out-of-the-box with Next.js App Router
- ✓ Good offline caching defaults
- ✓ Active maintenance, widely used
- ✗ Limited customization (must eject for advanced scenarios)
- ✗ Service worker caching can be tricky to debug
- ✗ Occasional conflicts with Next.js updates

---

### Option B: Manual PWA Setup — ALTERNATIVE

**What it is:**
- Manually create manifest.json + service worker
- More control, more code
- Suitable if next-pwa's defaults don't fit

**When to use:**
- Complex caching logic (advanced offline features)
- Custom service worker lifecycle
- Specific performance requirements

**Not recommended for MVP:**
- next-pwa handles 95% of use cases
- Manual setup adds maintenance burden
- Defer to v2 if special requirements emerge

---

### iOS Safari Specific Checklist

**For iOS 16.4+ installation to work:**

1. **manifest.json must exist at `/manifest.json`**
   ```
   link rel="manifest" href="/manifest.json"
   ```

2. **Icons must include maskable format:**
   ```json
   {
     "src": "/icon-maskable-192.png",
     "sizes": "192x192",
     "type": "image/png",
     "purpose": "maskable"
   }
   ```
   - Maskable: Design icon with safe inner circle (80% of size)
   - Apple will crop edges for adaptive icon effect

3. **Viewport meta tag required:**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1">
   ```

4. **Apple-specific meta tags (optional but recommended):**
   ```html
   <meta name="apple-mobile-web-app-capable" content="yes">
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
   <meta name="apple-mobile-web-app-title" content="HR Tracker">
   <link rel="apple-touch-icon" href="/icon-180.png">
   ```

5. **Service worker must handle offline gracefully:**
   - iOS Safari caches aggressively
   - Invalidate cache on app update (next-pwa handles this)

6. **HTTPS required** (no localhost exceptions for iOS)
   - Vercel provides HTTPS automatically

**Testing on iOS:**
```
1. Open Safari on iOS device
2. Navigate to https://your-domain.com
3. Tap Share → "Add to Home Screen"
4. Enter name (default: app name from manifest)
5. Tap "Add"
6. Launch from home screen → fullscreen, no browser chrome
```

---

### Android Chrome Specific Notes

**Checklist:**
1. Manifest.json at `/manifest.json` ✓
2. Icons (192x192 minimum) ✓
3. `display: "standalone"` in manifest ✓
4. Service worker registered ✓

**Android Chrome behavior:**
- Install prompt appears automatically after 2-3 visits (or manual "Add to Home Screen")
- More forgiving than iOS
- Web push works without installation, but works better if installed

---

### Recommendation: next-pwa v5+

**For MVP:** next-pwa
- Zero-config, battle-tested
- Handles iOS + Android requirements automatically
- Service worker pre-configured for offline + push
- Scales from MVP to App Store release

**Icon design requirements:**
- Create 2 sets: regular (192x512) + maskable (192x512)
- Maskable: Safe 80% center circle, extend to edges
- PNG format, transparent background
- Tools: Figma, Illustrator, or online icon generators

**Setup steps:**
1. `npm install next-pwa`
2. Add to `next.config.js` (above example)
3. Add manifest.json metadata to `public/manifest.json`
4. Create icons: `/public/icon-192.png`, `/public/icon-512.png`, `/public/icon-maskable-192.png`, `/public/icon-maskable-512.png`
5. Add apple-touch-icon for iOS bookmark: `/public/apple-touch-icon.png` (180x180)
6. Deploy to Vercel (HTTPS required)
7. Test on real devices (iOS Safari + Android Chrome)

**For App Store release (future):**
- next-pwa PWA is foundation
- Wrap in Capacitor or React Native for native distribution
- PWA codebase unchanged; native layer is thin wrapper

---

## Summary Table: Recommendations & Tradeoffs

| Research Area | Recommendation | Key Advantage | Key Risk | Alternative |
|---|---|---|---|---|
| **MLB Data API** | statsapi.mlb.com | Free, comprehensive, 5-15s lag | No SLA; could deprecate | Sportradar ($12K/yr) for v2 |
| **Database** | Neon Postgres | Best serverless integration | Postgres only | PlanetScale for extreme scale |
| **Real-time Draft** | Pusher Channels | Server-side timer consistency | $49/mo at scale | Supabase Realtime (architectural complexity) |
| **Push Notifications** | Native Web Push API | Zero cost, standard | iOS requires installation | OneSignal for analytics (v2) |
| **Authentication** | NextAuth.js v5 + Resend | Magic link + OAuth, Vercel-optimized | Email setup required | Supabase Auth (lock-in) |
| **PWA** | next-pwa v5 | Zero-config, iOS 16.4+ support | Caching edge cases | Manual setup (more control) |

---

## Open Questions for Architect

1. **MLB Data API failover:** If statsapi.mlb.com is down during draft, should draft pause, or proceed with offline mode?

2. **Multi-league draft conflicts:** What if users are in 2 leagues with overlapping draft times? Should we support this?

3. **Real-time standings:** "Real-time" = updated after each homerun, or daily refresh? This affects Pusher load.

4. **Trade expiration:** Auto-expire pending trades after 48 hours—should this happen server-side job or background task?

5. **Push notification opt-out:** If user denies push permission, can they re-enable it later? (Yes, but not prominent in settings.)

6. **Offline roster edits:** Should users be able to propose trades while offline? (Probably not—requires validation against live roster.)

7. **Backwards compatibility:** How many iOS/Android versions should we support? (iOS 16.4+ as stated, but Android has wider range.)

8. **Service worker updates:** Should users see "update available" prompt, or silent update? (next-pwa defaults to silent.)

---

## Constraints & Dependencies

- **Vercel deployment:** All tech choices must be Vercel-compatible (Neon, NextAuth.js, Pusher, Web Push all work)
- **Prisma ORM:** Required; Neon + PlanetScale + Supabase all support Prisma
- **Passwordless auth:** Magic link + OAuth non-negotiable; NextAuth.js is only reasonable choice
- **No backend database:** All auth state in Neon (Prisma handles schema)
- **iOS support critical:** PWA must work on iOS 16.4+ for eventual App Store parity
- **Multi-tenant architecture:** Every query must filter by league; Prisma middleware enforces this

---

## Recommended Timeline

- **Week 1-2 (Feb 18-Mar 4):** Implement NextAuth.js + Neon, basic league creation
- **Week 3-4 (Mar 5-18):** Integrate Pusher draft room, statsapi.mlb.com player fetching
- **Week 5-6 (Mar 19-Apr 1):** Web push notifications, next-pwa PWA setup
- **Week 7+ (Apr 2+):** Testing, bug fixes, launch

---

## Next Steps

1. **Architect reviews this report** and confirms/adjusts recommendations
2. **Implementation team begins Week 1 setup** (NextAuth.js + Neon database schema)
3. **Parallel work:** Draft room (Pusher) and PWA setup (next-pwa)
4. **Daily standups** to surface integration issues early

This report provides the technical foundation for confident decision-making. All recommendations prioritize MVP launch in April while maintaining a clear path to scaling and App Store release.
