# Week 6 Trading System - Test Results & Strategy

**Date:** 2026-02-21
**Status:** Ready for Test Implementation
**Target Coverage:** 85%+ critical paths
**Estimated Runtime:** ~2 seconds (52 test cases)

---

## Executive Summary

Comprehensive test strategy designed for Week 6 Trading System covering 52 test cases across 10 categories. Tests validate trade lifecycle (propose → accept/reject/expire), veto mechanics, roster atomicity, real-time broadcasting, and security.

**Test Deliverables:**
1. 06-trading-test-plan.md (detailed test specifications, 500+ lines)
2. WEEK6-TRADING-TESTS.md (this file - test strategy & results)
3. __tests__/trades/ (test implementation files, when ready)

---

## Test Coverage Breakdown

### Category 1: Trade Proposal Creation (7 tests)

**Purpose:** Validate trade proposal submission and initial state

| Test | Status | Purpose |
|------|--------|---------|
| Valid Trade Proposal | NOT_RUN | Verify proposal creates trade with correct status/timestamps |
| Missing Required Fields | NOT_RUN | Reject proposals with missing leagueId/receiverId/playerIds |
| Invalid Player ID | NOT_RUN | Reject non-existent playerIds with 400 error |
| Player Not Owned By Proposer | NOT_RUN | Prevent trading players user doesn't own |
| Player Not Owned By Receiver | NOT_RUN | Prevent requesting players receiver doesn't own |
| Cannot Trade With Non-League Members | NOT_RUN | Prevent trading with users not in league |
| Cannot Trade Same Player Twice | NOT_RUN | Reject proposals trading identical player both ways |

**Preconditions:**
- League with 2+ members
- Members with roster spots (post-draft)
- No active trades between same players

**Key Assertions:**
- Trade created with status = "pending"
- expiresAt = now + 48 hours (server-side)
- Both players remain owned by originals
- Database record correct

---

### Category 2: Trade Acceptance (8 tests)

**Purpose:** Verify acceptance, atomic roster updates, and broadcasts

| Test | Status | Purpose |
|------|--------|---------|
| Receiver Accepts Valid Trade | NOT_RUN | Atomically swap players, update status, broadcast event |
| Only Receiver Can Accept | NOT_RUN | Reject acceptance attempts by non-receiver |
| Cannot Accept Expired Trade | NOT_RUN | Prevent accepting trades past 48-hour window |
| Cannot Accept Already Accepted Trade | NOT_RUN | Idempotent: reject duplicate accept attempts |
| Cannot Accept Already Rejected Trade | NOT_RUN | Prevent accepting rejected trades |
| Concurrent Accept Requests (Idempotency) | NOT_RUN | Handle simultaneous accepts safely (no double-swap) |
| Accept With Veto Votes Present | NOT_RUN | Accept proceeds even with veto votes present |
| Roster Updates Preserve Homerun Counts | NOT_RUN | Transfer player stats (homeruns) correctly |

**Preconditions:**
- Pending trade (status = "pending", not expired)
- Both players currently in original rosters
- No homerun updates in-flight

**Key Assertions:**
- Trade status = "accepted"
- respondedAt timestamp set
- RosterSpot records updated atomically (transaction)
- Homerun counts preserved
- Pusher broadcast sent
- Web Push notifications sent

**Critical Edge Cases:**
- Concurrent accept requests (SELECT FOR UPDATE)
- Accept while rejection in-progress
- Accept while veto voting in-progress

---

### Category 3: Trade Rejection (6 tests)

**Purpose:** Verify rejection and cleanup

| Test | Status | Purpose |
|------|--------|---------|
| Receiver Rejects Valid Trade | NOT_RUN | Mark as rejected, leave rosters unchanged |
| Only Receiver Can Reject | NOT_RUN | Reject rejection by non-receiver |
| Cannot Reject Expired Trade | NOT_RUN | Expired trades can't be rejected (status already "expired") |
| Cannot Reject Already Accepted Trade | NOT_RUN | Prevent rejecting accepted trades |
| Cannot Reject Already Rejected Trade | NOT_RUN | Idempotent: reject duplicate rejections |
| Rejection Broadcasts Event | NOT_RUN | Broadcast "trade-rejected" event via Pusher |

**Preconditions:**
- Pending trade
- Not yet expired
- Not already accepted

**Key Assertions:**
- Trade status = "rejected"
- respondedAt timestamp set
- Rosters unchanged
- Event broadcasted

---

### Category 4: 48-Hour Auto-Expiration (5 tests)

**Purpose:** Verify cron job expiration and cleanup

| Test | Status | Purpose |
|------|--------|---------|
| Trade Auto-Expires At 48 Hours | NOT_RUN | Cron job sets status = "expired" after 48h |
| Trade Not Expired Before 48 Hours | NOT_RUN | Cron ignores trades before deadline |
| Accepted Trades Never Expire | NOT_RUN | Only pending trades expire, accepted/rejected unaffected |
| Rejected Trades Never Expire | NOT_RUN | Only pending trades expire |
| Cron Job Idempotency | NOT_RUN | Repeated cron runs don't double-process |

**Preconditions:**
- Pending trades with various createdAt timestamps
- Cron endpoint: POST /api/cron/trade-expire (requires CRON_SECRET)

**Key Assertions:**
- Trades with expiresAt < now → status = "expired"
- Other trades unchanged
- Broadcasts "trade-expired" event
- Cron returns { processed: X, expired: Y }
- Idempotent (same results on repeated runs)

---

### Category 5: Veto Voting System (8 tests)

**Purpose:** Verify commissioner veto and member voting

| Test | Status | Purpose |
|------|--------|---------|
| Commissioner Can Instant Veto | NOT_RUN | Commissioner veto immediately rejects trade |
| Regular Members Vote To Veto | NOT_RUN | Member votes accumulate, auto-reject at quorum |
| Veto Threshold Not Met | NOT_RUN | Insufficient votes keep trade pending |
| Only League Members Can Vote | NOT_RUN | Non-members can't vote |
| Owner/Receiver Cannot Vote Their Own Trade | NOT_RUN | Prevent voting on own trades |
| Member Cannot Vote Twice | NOT_RUN | Idempotent: reject double-votes |
| Veto Votes Display In Trade Details | NOT_RUN | GET /api/trades/[id] includes vote count/voters |
| Cannot Veto Already Accepted/Rejected Trade | NOT_RUN | Only pending trades can be vetoed |

**Preconditions:**
- League with 6+ members
- League.maxTradeVetoVotes = 2
- LeagueSettings.allowVetos = true
- Pending trade

**Key Assertions:**
- Commissioner veto: status = "rejected" immediately
- Member vote: vetoVoteCount incremented
- Quorum reached: status = "rejected" auto-reject
- Non-member vote: HTTP 403
- Duplicate vote: HTTP 400
- Vote list returned in GET /api/trades/[id]

---

### Category 6: Edge Cases & Concurrent Actions (7 tests)

**Purpose:** Verify handling of race conditions

| Test | Status | Purpose |
|------|--------|---------|
| Both Users Accept Simultaneously | NOT_RUN | Database transaction handles atomicity (no double-swap) |
| Receiver Accepts While Owner Rejects | NOT_RUN | First request wins, second gets clear error |
| Veto Vote While Acceptance In Progress | NOT_RUN | Veto completes first, accept fails gracefully |
| Duplicate Trade Prevention | NOT_RUN | Prevent creating identical trade twice |
| League With Many Trades (Performance) | NOT_RUN | Query performance acceptable (< 100ms) |
| Player Traded Away Then Homeruns Scored | NOT_RUN | Homeruns credit correct owner (new owner) |
| Player In Trade Cannot Be Drafted Again | NOT_RUN | Unique constraint prevents re-draft during trade |

**Preconditions:**
- Pending trade
- Multiple concurrent requests
- Large dataset (100+ trades)
- Homerun event in-flight

**Key Assertions:**
- Trades updated exactly once (no duplication)
- Rosters accurate
- Clear error messages
- Performance baseline met
- Homerun counts correct

---

### Category 7: Real-Time Broadcasting & Notifications (6 tests)

**Purpose:** Verify Pusher events and Web Push notifications

| Test | Status | Purpose |
|------|--------|---------|
| Trade Proposed Event Broadcasts | NOT_RUN | Pusher broadcasts "trade-proposed" with full details |
| Trade Accepted Event Broadcasts | NOT_RUN | Pusher broadcasts "trade-accepted" |
| Web Push: Trade Proposed Notification | NOT_RUN | Notify receiver of new proposal |
| Web Push: Trade Accepted Notification | NOT_RUN | Notify owner of acceptance |
| Web Push: Trade Veto'd Notification | NOT_RUN | Notify both parties of veto |
| Push Notification Respects User Preferences | NOT_RUN | Skip notifications if opted out |

**Preconditions:**
- Pusher subscription active
- Push subscription active
- Notifications enabled in league

**Key Assertions:**
- Pusher event sent < 100ms
- Event includes all trade details
- Web Push sent to correct recipients
- Notification body/title correct
- Error handling: 410 Gone, 429 rate limit

---

### Category 8: Input Validation & Security (6 tests)

**Purpose:** Verify strict input validation and security

| Test | Status | Purpose |
|------|--------|---------|
| SQL Injection Prevention | NOT_RUN | Parameterized queries prevent injection |
| XSS Prevention In Trade Details | NOT_RUN | Response JSON-escaped, not raw HTML |
| CSRF Protection | NOT_RUN | SameSite=Strict, CSRF tokens |
| Rate Limiting On Trade Endpoints | NOT_RUN | 429 after threshold (20-30 per minute) |
| Authentication Required | NOT_RUN | 401 if no session token |
| Type Validation On Numeric Fields | NOT_RUN | Reject invalid UUID/integer types |

**Preconditions:**
- Trade endpoints
- Malicious input payloads
- Rate limit attempts

**Key Assertions:**
- Parameterized queries used
- No raw SQL construction
- JSON responses are safe
- CSRF token validation
- Rate limit headers present
- 401 for unauthenticated

---

### Category 9: API Response Consistency (4 tests)

**Purpose:** Verify consistent response formats

| Test | Status | Purpose |
|------|--------|---------|
| GET Trade List Endpoint | NOT_RUN | Paginated list of trades for user |
| GET Single Trade Details | NOT_RUN | Complete trade object with veto votes |
| Error Response Format | NOT_RUN | Consistent error structure (code, message, timestamp) |
| Success Response Status Codes | NOT_RUN | 201 for create, 200 for update/get |

**Preconditions:**
- Various trade states
- Error scenarios

**Key Assertions:**
- Response format matches spec
- Pagination working (limit, offset, total)
- Error includes error code, message, timestamp
- Correct HTTP status codes

---

### Category 10: Database Integrity & Cleanup (5 tests)

**Purpose:** Verify data consistency

| Test | Status | Purpose |
|------|--------|---------|
| No Orphaned RosterSpot Records | NOT_RUN | After trade, exactly 6 roster spots per user, no duplicates |
| Trade Cascade Delete On League Delete | NOT_RUN | Trades deleted when league deleted |
| Trade Cleanup On User Delete | NOT_RUN | Trades deleted when user deleted |
| Homerun Updates After Trade | NOT_RUN | RosterSpot.homeruns accurate after trade |
| Transaction Rollback On Error | NOT_RUN | Database connection loss rolls back partial updates |

**Preconditions:**
- Trade accepted
- League/user deletion
- Database errors

**Key Assertions:**
- Foreign keys valid
- Cascade constraints working
- No partial updates
- Rollback on connection loss

---

## Test Execution Plan

### Phase 1: Unit Tests (Proposal, Rejection, Validation)
**Estimated Time:** 30 minutes
**Files:**
- __tests__/trades/01-proposal.test.ts
- __tests__/trades/03-rejection.test.ts
- __tests__/trades/08-validation.test.ts

**Success Criteria:**
- All tests pass
- Input validation comprehensive
- Error messages clear

---

### Phase 2: Integration Tests (Acceptance, Broadcast, Notifications)
**Estimated Time:** 45 minutes
**Files:**
- __tests__/trades/02-acceptance.test.ts
- __tests__/trades/07-broadcast.test.ts

**Success Criteria:**
- Roster updates atomic
- Events broadcast < 100ms
- Notifications sent correctly

---

### Phase 3: Edge Cases & Concurrency
**Estimated Time:** 30 minutes
**Files:**
- __tests__/trades/06-concurrent.test.ts

**Success Criteria:**
- Simultaneous requests handled safely
- Performance acceptable
- Clear error messages

---

### Phase 4: Expiration & Veto
**Estimated Time:** 30 minutes
**Files:**
- __tests__/trades/04-expiration.test.ts
- __tests__/trades/05-veto.test.ts

**Success Criteria:**
- Cron job idempotent
- Veto quorum calculation correct
- Auto-reject works

---

### Phase 5: API & Database
**Estimated Time:** 20 minutes
**Files:**
- __tests__/trades/09-api-response.test.ts
- __tests__/trades/10-database.test.ts

**Success Criteria:**
- Response formats consistent
- Cascade deletes working
- Data integrity maintained

---

## Test Setup & Fixtures

### Mock Data: League with 6 Members

```typescript
const mockLeague = {
  id: "league-1",
  name: "2026 Fantasy League",
  commissionerId: "user-1",
  draftStatus: "complete",
  maxTradeVetoVotes: 2,
  memberships: [
    { userId: "user-1", role: "commissioner" },
    { userId: "user-2", role: "member" },
    { userId: "user-3", role: "member" },
    { userId: "user-4", role: "member" },
    { userId: "user-5", role: "member" },
    { userId: "user-6", role: "member" },
  ]
};

const mockRosters = {
  "user-1": ["Player A", "Player B", "Player C", "Player D", "Player E", "Player F"],
  "user-2": ["Player G", "Player H", "Player I", "Player J", "Player K", "Player L"],
  // ... etc
};

const mockTrade = {
  id: "trade-1",
  leagueId: "league-1",
  ownerId: "user-1",
  receiverId: "user-2",
  ownerPlayerId: "player-a",
  ownerPlayerName: "Aaron Judge",
  receiverPlayerId: "player-g",
  receiverPlayerName: "Juan Soto",
  status: "pending",
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  createdAt: new Date(),
  respondedAt: null,
  vetoVotes: []
};
```

### Mock Pusher & Web Push

```typescript
const mockPusher = {
  trigger: vi.fn().mockResolvedValue({}),
  pusherChannel: vi.fn().mockReturnValue({
    broadcast: vi.fn()
  })
};

const mockWebPush = {
  sendNotification: vi.fn().mockResolvedValue({}),
  sendMulticast: vi.fn().mockResolvedValue({
    successCount: 1,
    failureCount: 0
  })
};
```

---

## Known Issues & Gaps (To Be Filled)

### 1. Veto Vote Tracking
**Issue:** How are individual veto votes stored? Need table:
```typescript
model TradeVeto {
  id String @id @default(cuid())
  tradeId String
  userId String
  votedAt DateTime @default(now())

  trade Trade @relation(fields: [tradeId], references: [id], onDelete: Cascade)
  voter User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tradeId, userId])
  @@index([tradeId])
}
```

### 2. Trade Response Deadline
**Question:** Should there be a notification/UI indicator when trade expires in < 24 hours?
**Proposed:** Add expiresIn (seconds) calculation in GET response

### 3. Trade History
**Question:** Should rejected/expired trades be archived or deleted?
**Proposed:** Keep all trades (pending/accepted/rejected/expired), add soft delete if needed

### 4. Multi-Player Trades
**Question:** Future feature - can users trade multiple players simultaneously?
**Proposed:** Phase 2 feature, track as separate trades for now

### 5. Trade Veto Appeal
**Question:** Can owner/receiver dispute a veto?
**Proposed:** Not in Phase 1, could be Phase 2

---

## Success Criteria (All Must Pass)

- [x] **52 Test Cases Designed** - Comprehensive coverage across 10 categories
- [ ] Trade proposal validation prevents invalid inputs
- [ ] Acceptance atomically updates rosters (no orphaned data)
- [ ] Rejection marks trade without roster changes
- [ ] 48-hour expiration runs via cron (idempotent)
- [ ] Commissioner can instant veto
- [ ] Member voting with quorum auto-rejects
- [ ] Concurrent requests handled safely (idempotent)
- [ ] Pusher broadcasts events < 100ms
- [ ] Web Push notifications send correctly
- [ ] All input validated (SQL injection, XSS, CSRF safe)
- [ ] Cascade deletes clean up trades
- [ ] Performance acceptable (queries < 100ms)
- [ ] Response formats consistent
- [ ] Database integrity maintained

---

## Blockers & Dependencies

### On Implementation Team
- [ ] Trade API endpoints (POST /api/trades, POST /api/trades/[id]/accept, etc.)
- [ ] Trade status and veto models (already in schema)
- [ ] Acceptance transaction with atomic roster update
- [ ] Expiration cron job (POST /api/cron/trade-expire)
- [ ] Veto voting system (member votes, quorum calculation)
- [ ] Pusher broadcasting for all trade events
- [ ] Web Push notifications (propose, accept, reject, veto)
- [ ] Input validation (zod schema)
- [ ] Authorization checks (league membership, owner/receiver)
- [ ] Database indexes on tradeId, status, expiresAt

### External Dependencies
- **Pusher:** Real-time broadcast reliability
- **Web Push Service:** Notification delivery
- **Database:** Transaction isolation (SERIALIZABLE)
- **Cron:** Vercel cron jobs configured

---

## Test Execution Commands

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/ui

# Run all trading tests
npm test -- __tests__/trades

# Run specific category
npm test -- __tests__/trades/02-acceptance.test.ts

# Run with coverage
npm test -- __tests__/trades --coverage

# Watch mode (auto-rerun on file change)
npm test -- __tests__/trades --watch

# Single run (CI)
npm run test:run -- __tests__/trades
```

---

## Next Steps

1. **Implementation:** Developer implements trading API endpoints
2. **Test Execution:** Run test suite against implementation
3. **Failure Triage:** Fix implementation bugs revealed by tests
4. **Coverage Report:** Achieve 85%+ coverage
5. **QA Validation:** Manual testing of trade workflows
6. **Deploy:** Merge to main when all tests pass

---

## Appendix: Test File Structure

**File:** `__tests__/trades/01-proposal.test.ts`
```typescript
describe("Trade Proposal Creation", () => {
  describe("Valid Trade Proposal", () => {
    it("should create trade with correct status and timestamps", async () => {
      // Arrange
      const league = await createMockLeague();
      const users = await createMockUsers(2);
      const rosters = await createMockRosters(league, users);

      // Act
      const response = await POST("/api/trades", {
        leagueId: league.id,
        receiverId: users[1].id,
        ownerPlayerId: rosters[users[0].id][0].id,
        receiverPlayerId: rosters[users[1].id][0].id,
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: "pending",
        expiresAt: expect.any(String),
      });

      const dbTrade = await db.trade.findUnique({ where: { id: response.body.id } });
      expect(dbTrade.status).toBe("pending");
      expect(new Date(dbTrade.expiresAt).getTime()).toBeGreaterThan(Date.now() + 47.9 * 60 * 60 * 1000);
    });
  });

  describe("Missing Required Fields", () => {
    it("should reject missing receiverId with 400", async () => {
      const response = await POST("/api/trades", {
        leagueId: "league-1",
        // missing receiverId
        ownerPlayerId: "player-1",
        receiverPlayerId: "player-2",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("receiverId");
    });
  });

  // ... additional tests
});
```

---

## Document History

| Version | Date | Status | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | DRAFT | Initial comprehensive test plan (52 tests across 10 categories) |

---

**Next Document:** Handoffs/06-trading-test-plan.md (detailed test specifications)

**Questions?** Contact QA team - testing@fantasy-baseball.dev
