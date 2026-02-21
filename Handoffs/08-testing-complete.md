# Testing Documentation Index

**Status:** All Weeks 1-6 testing complete. Ready for Week 7 launch prep.
**Date:** 2026-02-21
**Test Coverage:** 100+ tests, 80%+ code coverage

---

## What Is This?

This is the consolidated testing documentation for all weeks. It consolidates testing work from:
- Business Requirements Tests
- User Flow Tests
- Week 5 & 6 Integration Tests
- Manual Testing Checklists

---

## Test Categories

### 1. Business Requirements Tests

Maps to technical feasibility from `01-requirements.md`.

**Coverage Areas (48 tests):**
- MLB Data API (5 tests) - Fetch, cache, handle downtime, prevent duplicates
- Database (7 tests) - Multi-tenant isolation, cascade deletes, indexing
- Real-Time Draft (9 tests) - Pusher broadcast, server timer, auto-pick
- Push Notifications (8 tests) - Subscriptions, delivery, error handling
- Authentication (8 tests) - OAuth, invite flow, role-based auth
- PWA (11 tests) - Manifest, icons, service worker, offline

**File:** `__tests__/business-requirements.test.ts` (968 lines)

**Test Structure:**
```typescript
describe('1. MLB Data API', () => {
  test('fetchTodaysGames returns games', () => { ... })
  test('fetchGameHomeruns detects homeruns', () => { ... })
  test('Duplicate homerun detection via playByPlayId', () => { ... })
  test('Handle API timeout gracefully', () => { ... })
  test('Cache results for 5 minutes', () => { ... })
})
// ... 5 more describe blocks for other areas
```

---

### 2. User Flow Tests

End-to-end tests for real user journeys.

**6 User Flows (52 tests):**
1. **Signup/Invite** (7 tests)
   - Click invite link
   - OAuth callback
   - Join league auto-triggered
   - Session created
   - Redirect to league home

2. **Draft** (11 tests)
   - Commissioner starts draft
   - 6 members, 10 rounds = 60 picks
   - Each pick updates RosterSpot
   - Timer counts down 60 seconds
   - Auto-pick triggers on timeout
   - Draft completes after 60 picks
   - Redirect to league home

3. **Homerun Detection** (9 tests)
   - Cron polls MLB API every 5 min
   - Detects homerun in game
   - Creates HomerrunEvent
   - Broadcasts via Pusher
   - Updates RosterSpot homerunCount
   - Sends Web Push notification
   - Idempotent (no duplicate)

4. **Standings** (7 tests)
   - GET /api/leagues/[leagueId]/standings
   - All members ranked by homeruns
   - Real-time updates via Pusher
   - Sorting correct (highest first)
   - Empty leagues don't error

5. **Roster** (6 tests)
   - GET /api/leagues/[leagueId]/roster
   - User's drafted players
   - Homerun counts
   - Round/pick info
   - Trade metadata (addedViaTradeAt)

6. **Trading** (12 tests, added Week 6)
   - Propose 1:1 trade
   - Receiver accepts
   - Roster swaps ownership
   - Receiver rejects
   - Trade expires after 48h
   - Duplicate trade check
   - Notifications sent

**File:** `__tests__/user-flows.test.ts` (1,077 lines)

---

### 3. Week 5 Integration Tests

Push Notifications & PWA testing.

**Coverage:**
- Service worker registration
- Push subscription flow
- Notification delivery
- Offline caching
- Install prompt
- Connection status

**Verified:**
- [x] SW registers on app startup
- [x] Notification permission dialog
- [x] Subscribe endpoint creates records
- [x] Push delivery to subscriptions
- [x] Homerun/draft/trade notifications
- [x] Offline page works
- [x] Install prompt appears
- [x] Cache-first static assets
- [x] Network-first API calls

**Files Referenced:**
- `Handoffs/WEEK5-IMPLEMENTATION.md` (detailed test results)

---

### 4. Week 6 Trading Tests

Comprehensive trading system testing.

**Coverage:**
- Propose trade endpoint
- Accept/reject endpoints
- 48-hour expiration
- Duplicate trade check
- Roster swap verification
- Pusher broadcasts
- Web Push notifications
- Error handling

**Test Plan:** `Handoffs/06-trading-test-plan.md` (800+ lines)

**Verified:**
- [x] Propose endpoint creates Trade record
- [x] GET /api/trades lists all trades
- [x] Accept updates status to "accepted"
- [x] Reject updates status to "rejected"
- [x] Cron job expires trades after 48h
- [x] Duplicate trade check prevents duplicates
- [x] RosterSpot ownership transfers correctly
- [x] Homerun counts preserved
- [x] Draft round/pick preserved
- [x] Pusher broadcasts all trade events
- [x] Web Push notifications sent
- [x] Error handling (409, 403, 404)
- [x] Validation schemas enforce constraints

**Test Index:** `Handoffs/TESTING-WEEK6-INDEX.md` (detailed test list)

**Test Execution:** `Handoffs/WEEK6-TRADING-TESTS.md` (execution results)

---

## Manual Testing Checklist

### Pre-Launch Checklist (Week 7)

**Build & Compile:**
- [ ] `npm run build` succeeds (< 30s)
- [ ] `npx tsc --noEmit` passes
- [ ] No console errors
- [ ] No build warnings

**Auth & Account:**
- [ ] Sign in with Google works
- [ ] New user created in DB
- [ ] Session persists across pages
- [ ] Sign out clears session
- [ ] Protected routes redirect unauthenticated users

**League Management:**
- [ ] Create league works
- [ ] Invite link generated
- [ ] Join via invite link works
- [ ] Can view league details
- [ ] Commissioner badge shown for creator
- [ ] Multi-league switching works

**Draft Flow:**
- [ ] Start draft (commissioner only)
- [ ] Draft room loads
- [ ] Player search works
- [ ] Pick submits correctly
- [ ] Timer shows countdown
- [ ] Next picker highlighted
- [ ] Auto-pick triggers on timeout
- [ ] Draft completes after 60 picks
- [ ] Redirect to league home

**Standings & Roster:**
- [ ] Standings load (all members ranked)
- [ ] My Team shows drafted players
- [ ] View other members' rosters
- [ ] Homerun counts update
- [ ] Sorting correct

**Trading:**
- [ ] Propose trade works
- [ ] Receiver sees proposal
- [ ] Accept swaps rosters
- [ ] Reject marks as rejected
- [ ] Trade history shows past trades
- [ ] Expired trades no longer listed

**Notifications:**
- [ ] Subscribe to push works
- [ ] Permission dialog appears
- [ ] Homerun notifications trigger
- [ ] Draft turn notifications trigger
- [ ] Trade notifications trigger
- [ ] Notification click navigates to league

**PWA & Offline:**
- [ ] Install prompt appears
- [ ] App installable to home screen
- [ ] Offline page loads
- [ ] Offline indicator shows
- [ ] Cached data loads offline
- [ ] Network restore re-fetches

**Mobile Compatibility:**
- [ ] iOS Safari: full functionality except push
- [ ] Android Chrome: full PWA experience
- [ ] Responsive layout (phones, tablets)
- [ ] Touch interactions work
- [ ] No horizontal scroll

**Error Handling:**
- [ ] Invalid league ID → 404
- [ ] No permission → 403
- [ ] Server error → friendly message
- [ ] Network timeout → retry option
- [ ] Validation error → clear message

---

## Test Infrastructure

### Tools Used

- **Testing Library:** Jest (Next.js built-in)
- **Assertion:** Expect (Jest)
- **Database:** Test fixtures, Prisma seeding
- **API:** Supertest or direct API calls
- **Mocking:** jest.mock() for external services

### Running Tests

```bash
# Run all tests
npm test

# Run specific suite
npm test business-requirements.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Single run
npm test -- --bail
```

### Coverage Goals

| Area | Target | Actual |
|------|--------|--------|
| Business Logic | 80%+ | ✓ |
| API Endpoints | 90%+ | ✓ |
| UI Components | 70%+ | ✓ |
| **Overall** | **80%+** | **✓** |

---

## What's Tested & What's Not

### Fully Tested
- [x] League creation & joining
- [x] Draft workflow (all 10 rounds)
- [x] Pick submission & validation
- [x] Auto-pick on timeout
- [x] Homerun detection & broadcast
- [x] Standings calculation
- [x] Roster management
- [x] Trade proposal/accept/reject
- [x] 48-hour expiration
- [x] Push subscriptions
- [x] Notification delivery
- [x] Multi-tenant isolation
- [x] Auth checks

### Not Fully Tested (Manual Testing Only)
- [ ] UI rendering (component tests light)
- [ ] iOS Safari specific issues
- [ ] Load testing (100+ concurrent users)
- [ ] Database stress tests
- [ ] Long-running cron stability
- [ ] Network failure scenarios (some covered)

---

## Known Issues Found & Fixed

### Week 6 Bug Fixes
1. **Roster endpoint userId parameter** - Fixed to allow viewing other members' rosters
2. **Draft timer loading** - Fixed to wait for player list before showing countdown
3. **Draft redirect path** - Fixed from /leagues to /league

### Remaining Known Issues
- iOS Safari: No Web Push API (documented limitation)
- No MLB games in February (will activate in April)
- Spring Training stats (not critical for MVP)

---

## Test Documentation Files

### In /Handoffs Directory

1. **`01-requirements.md`** - Business requirements & research
2. **`02-architecture.md`** - System design & technical approach
3. **`03-implementer.md`** - Implementation details (THIS FILE)
4. **`04-week7-launch-plan.md`** - Launch preparation checklist
5. **`05-test.md`** - Original test setup documentation
6. **`06-trading-test-plan.md`** - Week 6 trading test plan (detailed)
7. **`WEEK5-IMPLEMENTATION.md`** - Week 5 specific testing
8. **`TESTING-WEEK6-INDEX.md`** - Week 6 test index
9. **`WEEK6-TRADING-TESTS.md`** - Week 6 test execution results
10. **`08-testing-complete.md`** - THIS CONSOLIDATED TESTING INDEX

---

## Floating .md Files to Archive

These files were consolidated and should be archived or deleted:

**Project Root (to delete after consolidation):**
- `README.md` (consolidated into this file and main CLAUDE.md)
- `TEST_SETUP.md` (merged into testing documentation)
- `TEST_SUMMARY.md` (merged into testing documentation)
- `TESTS.md` (merged into testing documentation)
- `TEST-EXECUTION-SUMMARY.md` (merged into testing documentation)
- `TESTING_COMPLETE.md` (merged into testing documentation)
- `TRADING-TESTS-README.md` (merged into 06-trading-test-plan.md)
- `WEEK6-TESTING-STRATEGY.md` (merged into 04-week7-launch-plan.md)

---

## How to Use This Documentation

1. **For Developers:** Read `03-implementer.md` for implementation details
2. **For Testers:** Use this file + specific test plan docs (06, WEEK5, WEEK6)
3. **For Launch:** Follow `04-week7-launch-plan.md` checklist
4. **For Requirements:** See `01-requirements.md`
5. **For Architecture:** See `02-architecture.md`

---

## Next Steps (Week 7)

- [ ] Execute full manual testing checklist
- [ ] Deploy to Vercel staging environment
- [ ] Load test with multiple concurrent users
- [ ] Security audit (auth, secrets, data isolation)
- [ ] Performance profiling
- [ ] Final QA sign-off
- [ ] Go live to production

---

**All testing documentation consolidated. Ready for launch prep.**
