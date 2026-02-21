# Week 6 Trading System - Complete Testing Documentation Index

**Created:** 2026-02-21
**Status:** COMPLETE - Ready for Implementation
**Total Documentation:** 2,481 lines across 3 main documents
**Test Cases:** 52 comprehensive tests
**Coverage Target:** 85%+

---

## Quick Navigation

### Start Here (5-minute overview)
→ Read: **WEEK6-TESTING-STRATEGY.md** (547 lines)
- What is the trading system?
- 10 test categories overview
- 4 critical test scenarios
- Quick commands reference

### For Implementation (15-minute deep dive)
→ Read: **Handoffs/06-trading-test-plan.md** (1,325 lines)
- Detailed test specifications
- 50+ individual test cases
- Preconditions, steps, assertions
- API endpoints to implement
- Mock data and fixtures

### For Execution (10-minute setup)
→ Read: **Handoffs/WEEK6-TRADING-TESTS.md** (609 lines)
- Test strategy overview
- 5-phase execution plan
- Test setup and fixtures
- Known gaps to fill
- Success criteria checklist

### For Quick Reference
→ Read: **TRADING-TESTS-README.md** (in root)
- Executive summary
- Test deliverables overview
- Critical paths
- Team responsibilities
- Timeline and risk assessment

---

## Document Breakdown

### Document 1: 06-trading-test-plan.md (1,325 lines)
**Location:** Handoffs/06-trading-test-plan.md
**Purpose:** Detailed test specifications for all 52 test cases
**Audience:** Developers implementing tests

**Contents:**
1. **Overview** (5 min read)
   - Business context
   - Test coverage map
   - Database schema

2. **10 Test Categories** (60 min read)
   - Trade Proposal Creation (7 tests) - Lines 47-92
   - Trade Acceptance (8 tests) - Lines 94-187
   - Trade Rejection (6 tests) - Lines 189-249
   - 48-Hour Auto-Expiration (5 tests) - Lines 251-310
   - Veto Voting System (8 tests) - Lines 312-435
   - Edge Cases & Concurrent Actions (7 tests) - Lines 437-547
   - Real-Time Broadcasting (6 tests) - Lines 549-628
   - Input Validation & Security (6 tests) - Lines 630-733
   - API Response Consistency (4 tests) - Lines 735-832
   - Database Integrity & Cleanup (5 tests) - Lines 834-915

3. **Implementation Strategy** (15 min read)
   - Testing framework (Vitest)
   - Test file structure
   - Mock data strategy
   - Success criteria (14 items)

**Key Sections for Quick Lookup:**
- Line 47: Category 1 - Trade Proposal
- Line 94: Category 2 - Acceptance
- Line 189: Category 3 - Rejection
- Line 251: Category 4 - Expiration
- Line 312: Category 5 - Veto
- Line 437: Category 6 - Concurrent
- Line 549: Category 7 - Broadcasting
- Line 630: Category 8 - Validation
- Line 735: Category 9 - API Consistency
- Line 834: Category 10 - Database

---

### Document 2: WEEK6-TRADING-TESTS.md (609 lines)
**Location:** Handoffs/WEEK6-TRADING-TESTS.md
**Purpose:** Test strategy, setup, and execution plan
**Audience:** QA and implementation teams

**Contents:**
1. **Executive Summary** (2 min read)
   - Phase and status
   - Coverage breakdown

2. **Test Coverage Breakdown** (20 min read)
   - Each category with tests, purposes, preconditions
   - Key assertions
   - Critical edge cases
   - Status column (NOT_RUN for all)

3. **Test Execution Plan** (10 min read)
   - Phase 1: Unit Tests (30 min)
   - Phase 2: Integration Tests (45 min)
   - Phase 3: Edge Cases (30 min)
   - Phase 4: Expiration & Veto (30 min)
   - Phase 5: API & Database (20 min)
   - Total: ~2.5 hours

4. **Test Setup & Fixtures** (10 min read)
   - Mock league with 6 members
   - Mock rosters
   - Mock trades in various states
   - Mock Pusher
   - Mock Web Push

5. **Known Issues & Gaps** (5 min read)
   - Veto vote tracking (need TradeVeto table)
   - Trade response deadline
   - Trade history/archival
   - Multi-player trades (future)
   - Veto appeal (future)

6. **Success Criteria & Commands** (5 min read)
   - 14-item success checklist
   - Dependencies on implementation
   - Test execution commands

---

### Document 3: WEEK6-TESTING-STRATEGY.md (547 lines)
**Location:** /root/WEEK6-TESTING-STRATEGY.md
**Purpose:** Quick reference guide with scenarios and commands
**Audience:** All team members

**Contents:**
1. **Overview** (5 min read)
   - Trading system explanation
   - Test strategy overview
   - 10 categories summary

2. **Critical Test Scenarios** (15 min read)
   - Scenario 1: Basic Trade Acceptance
   - Scenario 2: Concurrent Attacks
   - Scenario 3: Veto Quorum
   - Scenario 4: 48-Hour Expiration

3. **API Endpoints Being Tested** (10 min read)
   - POST /api/trades (create)
   - POST /api/trades/[id]/accept
   - POST /api/trades/[id]/reject
   - POST /api/trades/[id]/vote-veto
   - POST /api/cron/trade-expire
   - GET /api/leagues/[leagueId]/trades
   - GET /api/trades/[id]

4. **Success Criteria Checklist** (5 min read)
   - 25-item comprehensive checklist

5. **Commands Reference** (5 min read)
   - Install, run, debug commands
   - Coverage report
   - Single run (CI)

---

### Document 4: TRADING-TESTS-README.md (in root)
**Location:** /root/TRADING-TESTS-README.md
**Purpose:** Comprehensive overview and execution guide
**Audience:** Project stakeholders

**Contents:**
1. **Executive Summary**
   - Status and deliverables
   - Quick start for different roles

2. **Test Categories at a Glance**
   - Summary table with risk levels
   - 52 tests across 10 categories

3. **Critical Paths**
   - 5 must-test workflows
   - Related test numbers

4. **File Locations**
   - Directory structure
   - Files to be created
   - Current file locations

5. **Team Responsibilities**
   - Developer tasks
   - QA tasks
   - PM tasks

---

## Test Cases Summary

### Category 1: Trade Proposal Creation (7 tests)
- Valid trade proposal creation
- Missing required fields validation
- Invalid player ID handling
- Player ownership verification
- Receiver player ownership verification
- Non-member trade prevention
- Duplicate player prevention

**Key File:** Handoffs/06-trading-test-plan.md, lines 47-92

### Category 2: Trade Acceptance (8 tests)
- Valid acceptance with atomic roster swap
- Receiver-only authorization
- Expired trade rejection
- Already accepted prevention
- Already rejected prevention
- Concurrent acceptance handling (idempotency)
- Veto votes with acceptance
- Homerun count preservation

**Key File:** Handoffs/06-trading-test-plan.md, lines 94-187

### Category 3: Trade Rejection (6 tests)
- Valid rejection without roster changes
- Receiver-only authorization
- Expired trade rejection
- Already accepted prevention
- Already rejected prevention
- Event broadcasting

**Key File:** Handoffs/06-trading-test-plan.md, lines 189-249

### Category 4: 48-Hour Auto-Expiration (5 tests)
- Auto-expire at 48 hours
- No early expiration
- Accepted trades never expire
- Rejected trades never expire
- Cron idempotency

**Key File:** Handoffs/06-trading-test-plan.md, lines 251-310

### Category 5: Veto Voting System (8 tests)
- Commissioner instant veto
- Member voting with quorum
- Veto threshold not met
- Non-member vote prevention
- Owner/receiver self-vote prevention
- Double-vote prevention
- Veto vote display in details
- Already finalized trade prevention

**Key File:** Handoffs/06-trading-test-plan.md, lines 312-435

### Category 6: Edge Cases & Concurrent Actions (7 tests)
- Simultaneous acceptance (race condition)
- Accept vs reject race
- Veto vote during acceptance
- Duplicate trade prevention
- Performance with many trades
- Player traded then scored homeruns
- Player in trade blocks re-draft

**Key File:** Handoffs/06-trading-test-plan.md, lines 437-547

### Category 7: Real-Time Broadcasting & Notifications (6 tests)
- Trade proposed event broadcast
- Trade accepted event broadcast
- Web Push notification on proposal
- Web Push notification on acceptance
- Web Push notification on veto
- User preference respect for notifications

**Key File:** Handoffs/06-trading-test-plan.md, lines 549-628

### Category 8: Input Validation & Security (6 tests)
- SQL injection prevention
- XSS prevention
- CSRF protection
- Rate limiting
- Authentication required
- Type validation

**Key File:** Handoffs/06-trading-test-plan.md, lines 630-733

### Category 9: API Response Consistency (4 tests)
- GET trade list endpoint
- GET single trade details
- Error response format
- Success response status codes

**Key File:** Handoffs/06-trading-test-plan.md, lines 735-832

### Category 10: Database Integrity & Cleanup (5 tests)
- No orphaned RosterSpot records
- Trade cascade delete on league delete
- Trade cleanup on user delete
- Homerun updates after trade
- Transaction rollback on error

**Key File:** Handoffs/06-trading-test-plan.md, lines 834-915

---

## How to Use This Documentation

### For First-Time Implementation

1. **Start with README** (TRADING-TESTS-README.md)
   - 5-minute overview
   - Understand test structure
   - See file locations

2. **Read Strategy Document** (WEEK6-TESTING-STRATEGY.md)
   - Learn critical scenarios
   - Understand API endpoints
   - Get command reference

3. **Review Setup Document** (WEEK6-TRADING-TESTS.md)
   - Understand test phases
   - See mock data setup
   - Check success criteria

4. **Deep Dive Into Specs** (06-trading-test-plan.md)
   - Read each category carefully
   - Understand preconditions
   - Learn expected results
   - Note edge cases

5. **Implement & Test**
   - Create API endpoints
   - Write tests
   - Fix failures
   - Validate coverage

### For Quick Lookup

**Question:** How do I test concurrent accepts?
→ WEEK6-TESTING-STRATEGY.md, Scenario 2 (line 83)
→ Handoffs/06-trading-test-plan.md, Category 6, Test 6.1 (line 461)

**Question:** What are the 7 endpoints?
→ WEEK6-TESTING-STRATEGY.md, API Endpoints section (line 164)
→ TRADING-TESTS-README.md, API Endpoints at a Glance (line 220)

**Question:** What's the execution timeline?
→ WEEK6-TESTING-STRATEGY.md, Test Execution Commands (line 335)
→ WEEK6-TRADING-TESTS.md, Test Execution Plan (line 95)

**Question:** What about veto voting logic?
→ Handoffs/06-trading-test-plan.md, Category 5 (line 312)
→ WEEK6-TESTING-STRATEGY.md, Scenario 3 (line 103)

---

## Implementation Checklist

### Phase 1: Preparation (1 day)
- [ ] Read all 4 documents (2 hours)
- [ ] Set up test framework (Vitest)
- [ ] Create test file structure
- [ ] Create mock fixtures

### Phase 2: API Implementation (3-4 days)
- [ ] POST /api/trades (create)
- [ ] POST /api/trades/[id]/accept
- [ ] POST /api/trades/[id]/reject
- [ ] POST /api/trades/[id]/vote-veto
- [ ] GET /api/leagues/[leagueId]/trades
- [ ] GET /api/trades/[id]
- [ ] POST /api/cron/trade-expire

### Phase 3: Test Implementation (2-3 days)
- [ ] Implement 7 proposal tests
- [ ] Implement 8 acceptance tests
- [ ] Implement 6 rejection tests
- [ ] Implement 5 expiration tests
- [ ] Implement 8 veto tests
- [ ] Implement 7 concurrent tests
- [ ] Implement 6 broadcast tests
- [ ] Implement 6 validation tests
- [ ] Implement 4 API tests
- [ ] Implement 5 database tests

### Phase 4: Validation (1-2 days)
- [ ] All 52 tests passing
- [ ] 85%+ coverage achieved
- [ ] Manual trade workflows validated
- [ ] Push notifications verified
- [ ] Performance benchmarks met

### Phase 5: Launch (0.5 day)
- [ ] Code review
- [ ] Merge to main
- [ ] Deploy to Vercel
- [ ] Smoke tests on production

**Total Estimate:** 5-10 days (with parallel work)

---

## Success Metrics

### Test Coverage
- **Target:** 85%+ of critical paths
- **Measurement:** `npm run test:coverage`
- **Failure:** < 80% indicates untested areas

### Test Execution
- **Speed:** All 52 tests in < 2 seconds
- **Reliability:** 100% pass rate when implementation correct
- **Idempotency:** Tests pass repeatedly, same results

### Quality Metrics
- **Zero orphaned data:** No RosterSpot records after failed trades
- **Transaction isolation:** Concurrent requests handled safely
- **No security issues:** SQL/XSS/CSRF prevented
- **Performance:** All queries < 100ms

### Coverage by Category

| Category | Target | Passing | Status |
|----------|--------|---------|--------|
| Proposal | 7/7 | - | NOT_RUN |
| Acceptance | 8/8 | - | NOT_RUN |
| Rejection | 6/6 | - | NOT_RUN |
| Expiration | 5/5 | - | NOT_RUN |
| Veto | 8/8 | - | NOT_RUN |
| Concurrent | 7/7 | - | NOT_RUN |
| Broadcasting | 6/6 | - | NOT_RUN |
| Validation | 6/6 | - | NOT_RUN |
| API Response | 4/4 | - | NOT_RUN |
| Database | 5/5 | - | NOT_RUN |
| **TOTAL** | **52/52** | - | **NOT_RUN** |

---

## Key Files to Create

### API Endpoints
```
app/api/trades/
├── route.ts                    # POST /api/trades (create)
├── [tradeId]/
│   ├── route.ts                # GET /api/trades/[id]
│   ├── accept/route.ts         # POST /api/trades/[id]/accept
│   ├── reject/route.ts         # POST /api/trades/[id]/reject
│   └── vote-veto/route.ts      # POST /api/trades/[id]/vote-veto
├── [leagueId]/
│   └── route.ts                # GET /api/leagues/[leagueId]/trades
└── (fixtures not needed - in DB)

app/api/cron/
└── trade-expire/route.ts       # POST /api/cron/trade-expire
```

### Test Files
```
__tests__/trades/
├── 01-proposal.test.ts         # 7 tests
├── 02-acceptance.test.ts       # 8 tests
├── 03-rejection.test.ts        # 6 tests
├── 04-expiration.test.ts       # 5 tests
├── 05-veto.test.ts             # 8 tests
├── 06-concurrent.test.ts       # 7 tests
├── 07-broadcast.test.ts        # 6 tests
├── 08-validation.test.ts       # 6 tests
├── 09-api-response.test.ts     # 4 tests
├── 10-database.test.ts         # 5 tests
└── fixtures/
    ├── trades.fixture.ts
    ├── users.fixture.ts
    └── leagues.fixture.ts
```

### Database Migrations
- Add TradeVeto table (for member veto votes)
- Ensure Trade, TradeStatus enums in prisma/schema.prisma
- Add indexes: (leagueId, status), (expiresAt), (receiverId, status)

---

## Known Limitations in Phase 1

1. **Single-Player Trades Only**
   - Cannot trade multiple players simultaneously
   - Phase 2 feature

2. **Fixed 48-Hour Expiration**
   - No per-league deadline customization
   - Phase 2 feature

3. **No Trade Appeals**
   - Veto is final, cannot dispute
   - Phase 2 feature

4. **No Soft Delete/Archive**
   - All trades kept in DB
   - Phase 2: Add archive flag

5. **Basic Notifications**
   - No 24-hour expiration reminder
   - Phase 2 feature

---

## Troubleshooting

### Test Fails: "Trade not found"
- Verify POST /api/trades creates trade with correct ID
- Check response includes trade.id
- Verify trade saved to database

### Test Fails: "Only receiver can accept"
- Check Authorization header in request
- Verify receiverId matches current user
- Return HTTP 403 for non-receiver

### Test Fails: "Rosters not updated"
- Verify transaction wraps both roster updates
- Use SELECT FOR UPDATE on trade row
- Rollback on any error

### Test Fails: "Event not broadcast"
- Check Pusher initialization in endpoint
- Verify channel name: `league-{leagueId}`
- Check event type and payload

### Test Fails: Coverage < 85%
- Add tests for error paths
- Test validation for all inputs
- Test edge cases in concurrent logic

---

## Document Statistics

| Document | Lines | Words | Categories | Tests |
|----------|-------|-------|------------|-------|
| 06-trading-test-plan.md | 1,325 | 8,200 | 10 | 52 |
| WEEK6-TRADING-TESTS.md | 609 | 3,800 | 10 | 52 |
| WEEK6-TESTING-STRATEGY.md | 547 | 3,200 | 10 | 52 |
| TRADING-TESTS-README.md | 650 | 4,000 | 10 | 52 |
| **TOTAL** | **3,131** | **19,200** | **10** | **52** |

---

## Version History

| Version | Date | Status | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | COMPLETE | Initial comprehensive test strategy (52 tests, 3 documents) |

---

## Sign-Off

**Testing Documentation:** COMPLETE ✓
**Status:** Ready for Implementation
**Date:** 2026-02-21
**Framework:** Vitest
**Test Count:** 52
**Target Coverage:** 85%+

**Next Step:** Begin implementation using Handoffs/06-trading-test-plan.md as specification.

---

## Navigation Quick Links

| Document | Purpose | Time | Location |
|----------|---------|------|----------|
| **TRADING-TESTS-README.md** | Main overview | 15 min | /root |
| **WEEK6-TESTING-STRATEGY.md** | Quick reference | 10 min | /root |
| **WEEK6-TRADING-TESTS.md** | Strategy & setup | 20 min | /Handoffs |
| **06-trading-test-plan.md** | Detailed specs | 60 min | /Handoffs |
| **TESTING-WEEK6-INDEX.md** | This index | 10 min | /Handoffs |

---

**Questions? See the relevant document above. All tests are fully specified and ready for implementation.**
