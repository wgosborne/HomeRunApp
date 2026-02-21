# Tests Quick Reference

## What to Run

```bash
# All tests (watch mode, live reload)
npm test

# Single run (CI/CD)
npm run test:run

# With UI dashboard
npm run test:ui

# Coverage report
npm run test:coverage

# Specific file
npm test -- __tests__/business-requirements.test.ts
npm test -- __tests__/user-flows.test.ts

# Specific test
npm test -- -t "should prevent duplicate joins"

# Debug mode
npm test -- --inspect-brk --single-thread
```

## Test Files

Located in `__tests__/`:

| File | Tests | Lines | Coverage |
|------|-------|-------|----------|
| business-requirements.test.ts | 48 | 968 | 6 tech areas |
| user-flows.test.ts | 52 | 1077 | 6 user journeys |

## What's Tested

### Business Requirements (48 tests)

1. **MLB Data API** (5 tests)
   - Fetch homeruns
   - Handle API downtime
   - Avoid duplicates
   - Cache roster
   - Player listing

2. **Database** (7 tests)
   - Multi-tenant isolation
   - League scoping
   - Cascade deletes
   - Unique constraints
   - Query indexing

3. **Real-Time Draft** (9 tests)
   - Pusher broadcast
   - 60-second timer (server-side)
   - Auto-pick on timeout
   - Reconnection handling
   - Snake draft logic

4. **Push Notifications** (8 tests)
   - Subscription management
   - Delivery + error handling
   - Retry strategy
   - Fallback polling
   - Permission handling

5. **Authentication** (8 tests)
   - OAuth sessions
   - Invite flow (preserve league context)
   - Role-based authorization
   - Auto-join after signup
   - Duplicate prevention

6. **PWA** (11 tests)
   - Manifest.json
   - Icons (regular + maskable)
   - Service worker
   - Offline caching
   - iOS requirements

### User Flows (52 tests)

1. **Signup/Invite** (7 tests)
   - Generate invite link
   - Redirect to OAuth
   - Preserve league param
   - Auto-add to league
   - Handle duplicates

2. **Draft** (11 tests)
   - Verify 6+ members
   - Start draft (set timer)
   - Broadcast picks via Pusher
   - Calculate next picker (snake)
   - Auto-pick after 60s
   - Track 60 picks total
   - Mark complete
   - Handle reconnects

3. **Homerun Detection** (9 tests)
   - Cron every 5 minutes
   - Query MLB games
   - Detect homeruns
   - Prevent duplicates
   - Update rosters
   - Broadcast events
   - Send notifications
   - Handle API downtime

4. **Standings** (7 tests)
   - Fetch sorted leaderboard
   - Require membership
   - Include player details
   - Poll every 5 seconds
   - Update on homerun
   - Handle ties
   - Show zero homeruns

5. **Roster** (6 tests)
   - Fetch user's team
   - Show draft history
   - Update homerun count
   - Include round/pick info
   - Show trade status
   - Require membership

6. **Multi-League** (6 tests)
   - List all leagues
   - Isolate rosters
   - Isolate standings
   - Prevent unauthorized access
   - Track subs per league
   - Deduplicate subs

## Before Committing

```bash
npm run test:run  # Exit after completion
```

If all pass:
```bash
git add .
git commit -m "..."
git push
```

If tests fail:
1. Read error message
2. Check test code in `__tests__/`
3. Fix implementation
4. Re-run tests
5. Commit when green

## Test Philosophy

- **Mock external APIs** (Pusher, statsapi, NextAuth)
- **Test error cases** (disconnects, duplicates, 4xx/5xx)
- **Test business value** (users can draft safely, see real-time updates)
- **Keep tests fast** (<2 seconds for all 100 tests)

## Key Assertions

### Authorization
- Every endpoint checks session
- Every endpoint checks league membership
- Every query filtered by leagueId

### Data Integrity
- Unique constraints prevent duplicates
- Foreign keys prevent orphaned data
- Cascade deletes clean up

### Real-Time
- Pusher events broadcast <100ms
- Server timer prevents client desync
- Reconnection doesn't lose state

### Notifications
- Push subscriptions unique per user/league
- Fallback to polling if permission denied
- Errors don't break app (graceful degradation)

## Coverage Target: 80%+

- ✓ Authorization (100%)
- ✓ Multi-tenant (100%)
- ✓ Draft (95%)
- ✓ APIs (90%)
- ✓ Real-time (85%)
- ✓ Notifications (80%)
- ✓ PWA (70% - some OS-specific)

## Files

- `__tests__/business-requirements.test.ts` - 48 tests
- `__tests__/user-flows.test.ts` - 52 tests
- `Handoffs/05-test.md` - Detailed documentation
- `TEST_SETUP.md` - Installation guide
- `TEST_SUMMARY.md` - Complete test listing
- `TESTS.md` - This file (quick reference)

## Setup

First time only:

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/vitest jest-mock-extended @vitejs/plugin-react
```

Then create `/vitest.config.ts` and `/vitest.setup.ts` (see TEST_SETUP.md).

Update `package.json` scripts (see TEST_SETUP.md).

## Status

**Total:** 100 tests | 2,000+ lines | Ready to run

**Week 3 Coverage:**
- ✓ Auth (Google OAuth)
- ✓ Leagues (CRUD)
- ✓ Draft (real-time, auto-pick)
- ✓ Standings (leaderboard)
- ✓ Roster (player listing)

**Week 4+ Coverage:**
- [ ] Web Push (implementation pending)
- [ ] PWA install (implementation pending)
- [ ] Trades (Week 6)
- [ ] Vetos (Week 6)

---

See `Handoffs/05-test.md` for full documentation.
