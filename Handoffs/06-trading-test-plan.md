# Week 6 Trading System - Comprehensive Test Plan

## Overview

This document provides comprehensive test cases for the Fantasy Baseball Trading System, a critical feature enabling users to propose, accept, reject, and veto trades. Tests cover 8 core business areas with 50+ test cases across unit, integration, validation, edge case, and error categories.

**Phase:** Week 6 (Trading System)
**Target Coverage:** 85%+ (critical paths for trade lifecycle, validation, veto mechanics, roster updates)
**Test Framework:** Vitest (Jest-compatible)
**Estimated Runtime:** ~2 seconds for all trading tests

---

## Business Requirements Context

From CLAUDE.md:
- **Trade Status Enum:** pending/accepted/rejected/expired
- **48-Hour Auto-Expiration:** Cron job checks expiresAt timestamp
- **Veto Voting:** Commissioner can veto instantly, members vote with quorum
- **Pusher Broadcasting:** Real-time events on `league-{leagueId}` channel
- **Web Push Notifications:** Trade proposed, accepted, rejected, veto'd
- **Roster Atomicity:** Player swaps are transactional (no orphaned data)
- **Database Schema:** Trade table with leagueId, ownerId, receiverId, status, expiresAt

---

## Test Coverage Map

### 1. Trade Proposal Creation (7 tests)

Tests that validate trade proposal submission and initial state.

#### 1.1 Valid Trade Proposal
**Preconditions:**
- League with 2 members (owner, receiver)
- Owner has Player A (drafted)
- Receiver has Player B (drafted)
- League not paused
- No active trade between same players

**Steps:**
1. Call POST /api/trades with:
   - leagueId
   - receiverId
   - ownerPlayerId (Player A)
   - receiverPlayerId (Player B)
2. Verify database record created
3. Verify expiresAt = now + 48 hours
4. Verify status = "pending"

**Expected Results:**
- HTTP 200 response with trade object
- Trade record in DB with correct timestamps
- Trade status is "pending"
- Both players still owned by original users

**Edge Case Notes:**
- Timestamps must be server-side (not client-side)
- expiresAt must be exactly 48 hours in future

---

#### 1.2 Missing Required Fields
**Preconditions:**
- Same as 1.1

**Steps:**
1. Submit POST /api/trades without receiverId
2. Submit without ownerPlayerId
3. Submit without receiverPlayerId

**Expected Results:**
- HTTP 400 Bad Request for each missing field
- Error message identifies missing field
- No trade created
- Database unchanged

---

#### 1.3 Invalid Player ID
**Preconditions:**
- League with 2 members
- Non-existent playerIds

**Steps:**
1. Call POST /api/trades with playerId = "invalid-id"
2. Verify roster lookup fails

**Expected Results:**
- HTTP 400 or 404
- Detailed error explaining player not found
- No trade created

---

#### 1.4 Player Not Owned By Proposer
**Preconditions:**
- League with 2 members
- Player A owned by User 1
- User 2 tries to propose owning Player A

**Steps:**
1. User 2 calls POST /api/trades with ownerPlayerId = Player A
2. System checks User 2's roster

**Expected Results:**
- HTTP 403 Forbidden
- Error: "You don't own this player"
- No trade created

---

#### 1.5 Player Not Owned By Receiver
**Preconditions:**
- League with 2 members
- Player B owned by User 1
- User 2 tries to request Player B they don't own

**Steps:**
1. User 1 calls POST /api/trades requesting receiverPlayerId = Player C (User 2 doesn't own)
2. System checks receiver's roster

**Expected Results:**
- HTTP 403 Forbidden
- Error: "Receiver doesn't own this player"
- No trade created

---

#### 1.6 Cannot Trade With Non-League Members
**Preconditions:**
- League with User A
- User B not in league

**Steps:**
1. User A calls POST /api/trades with receiverId = User B

**Expected Results:**
- HTTP 403 Forbidden
- Error: "User not in league"
- No trade created

---

#### 1.7 Cannot Trade Same Player Twice In Proposal
**Preconditions:**
- User A owns Player X and Player Y

**Steps:**
1. Call POST /api/trades with:
   - ownerPlayerId = Player X
   - receiverPlayerId = Player X

**Expected Results:**
- HTTP 400 Bad Request
- Error: "Cannot trade same player"
- No trade created

---

### 2. Trade Acceptance (8 tests)

Tests that verify trade acceptance, roster updates, and broadcast events.

#### 2.1 Receiver Accepts Valid Trade
**Preconditions:**
- Pending trade exists (owner=User A, receiver=User B)
- Player A owned by User A
- Player B owned by User B
- Trade not expired

**Steps:**
1. User B calls POST /api/trades/[tradeId]/accept
2. System verifies User B is the receiver
3. Transaction updates rosters:
   - Remove Player A from User A
   - Add Player A to User B
   - Remove Player B from User B
   - Add Player B to User A
4. Update Trade.status = "accepted"
5. Set Trade.respondedAt = now
6. Broadcast "trade-accepted" event via Pusher

**Expected Results:**
- HTTP 200 response
- Trade.status = "accepted"
- Trade.respondedAt is set
- User A roster shows Player B, not Player A
- User B roster shows Player A, not Player B
- All other rosters unchanged
- Pusher event broadcast on league-{leagueId}

**Edge Case Notes:**
- Roster updates must be atomic (all or nothing)
- No orphaned RosterSpot records
- Player homerun counts must transfer correctly

---

#### 2.2 Only Receiver Can Accept
**Preconditions:**
- Pending trade (owner=User A, receiver=User B)

**Steps:**
1. User A (owner) calls POST /api/trades/[tradeId]/accept
2. User C (non-involved) calls POST /api/trades/[tradeId]/accept

**Expected Results:**
- Both return HTTP 403 Forbidden
- Error: "Only receiver can accept this trade"
- Trade status remains "pending"
- No roster changes

---

#### 2.3 Cannot Accept Expired Trade
**Preconditions:**
- Trade with expiresAt = 1 hour ago
- Status still "pending"

**Steps:**
1. User B calls POST /api/trades/[tradeId]/accept
2. System checks expiresAt vs current time

**Expected Results:**
- HTTP 400 or 403
- Error: "Trade has expired"
- Status remains "pending"
- No roster changes

---

#### 2.4 Cannot Accept Already Accepted Trade
**Preconditions:**
- Trade with status = "accepted"

**Steps:**
1. User B calls POST /api/trades/[tradeId]/accept again

**Expected Results:**
- HTTP 400 Bad Request
- Error: "Trade already accepted"
- Rosters unchanged

---

#### 2.5 Cannot Accept Already Rejected Trade
**Preconditions:**
- Trade with status = "rejected"

**Steps:**
1. User B calls POST /api/trades/[tradeId]/accept

**Expected Results:**
- HTTP 400 Bad Request
- Error: "Trade already rejected"
- Rosters unchanged

---

#### 2.6 Concurrent Accept Requests (Idempotency)
**Preconditions:**
- Pending trade
- Two simultaneous accept requests from receiver

**Steps:**
1. User B sends two concurrent POST /api/trades/[tradeId]/accept requests
2. Both requests hit database at same time
3. First transaction completes (rosters updated)
4. Second transaction retries

**Expected Results:**
- Both return HTTP 200
- Trade.status = "accepted" (not double-accepted)
- Rosters updated only once (no duplication)
- RosterSpot records count is correct

**Edge Case Notes:**
- Use database transaction isolation (SERIALIZABLE or SELECT FOR UPDATE)
- Second request should either succeed with same result or fail gracefully

---

#### 2.7 Accept With Veto Votes Present
**Preconditions:**
- Trade has veto votes from 1+ members
- Commissioner hasn't veto'd

**Steps:**
1. User B (receiver) accepts trade
2. Veto votes are still present but don't prevent acceptance

**Expected Results:**
- Trade accepted normally
- Veto votes stored for audit trail but don't block
- Rosters updated
- Broadcast event includes veto vote count

**Edge Case Notes:**
- Veto votes are informational after acceptance
- Not a blocker if trade already accepted

---

#### 2.8 Roster Updates Preserve Homerun Counts
**Preconditions:**
- Player A has 5 homeruns
- Player B has 3 homeruns
- Trade accepted

**Steps:**
1. Verify User A now owns Player B with 3 homeruns
2. Verify User B now owns Player A with 5 homeruns

**Expected Results:**
- Homerun counts transfer correctly
- Standings recalculate automatically
- User A's total increases by 3
- User B's total increases by 5

---

### 3. Trade Rejection (6 tests)

Tests that verify trade rejection and cleanup.

#### 3.1 Receiver Rejects Valid Trade
**Preconditions:**
- Pending trade (owner=User A, receiver=User B)

**Steps:**
1. User B calls POST /api/trades/[tradeId]/reject
2. System sets Trade.status = "rejected"
3. Set Trade.respondedAt = now
4. Broadcast "trade-rejected" event

**Expected Results:**
- HTTP 200 response
- Trade.status = "rejected"
- Trade.respondedAt is set
- Rosters unchanged
- No RosterSpot modifications

---

#### 3.2 Only Receiver Can Reject
**Preconditions:**
- Pending trade

**Steps:**
1. Owner tries to reject
2. Non-involved user tries to reject

**Expected Results:**
- Both return HTTP 403
- Status remains "pending"

---

#### 3.3 Cannot Reject Expired Trade
**Preconditions:**
- Expired trade (expiresAt < now)

**Steps:**
1. User B calls POST /api/trades/[tradeId]/reject

**Expected Results:**
- HTTP 400
- Error: "Trade has expired"
- Status remains "pending"

---

#### 3.4 Cannot Reject Already Accepted Trade
**Preconditions:**
- Trade.status = "accepted"

**Steps:**
1. User B calls POST /api/trades/[tradeId]/reject

**Expected Results:**
- HTTP 400
- Error: "Trade already accepted"
- Status remains "accepted"

---

#### 3.5 Cannot Reject Already Rejected Trade
**Preconditions:**
- Trade.status = "rejected"

**Steps:**
1. User B calls POST /api/trades/[tradeId]/reject again

**Expected Results:**
- HTTP 400
- Error: "Trade already rejected"

---

#### 3.6 Rejection Broadcasts Event
**Preconditions:**
- Pending trade with Pusher subscription

**Steps:**
1. User B rejects trade
2. Listen on Pusher league-{leagueId} channel
3. Verify event received

**Expected Results:**
- Event: { type: "trade-rejected", tradeId, ownerName, receiverName }
- Broadcast latency < 100ms
- All league members receive event

---

### 4. 48-Hour Auto-Expiration (5 tests)

Tests that verify trade expiration and cleanup cron job.

#### 4.1 Trade Auto-Expires At 48 Hours
**Preconditions:**
- Trade created 48 hours and 1 minute ago
- Status = "pending"
- expiresAt timestamp set correctly

**Steps:**
1. Cron job runs (POST /api/cron/trade-expire)
2. System queries pending trades where expiresAt < now
3. Update status = "expired"
4. Broadcast "trade-expired" event

**Expected Results:**
- Trade.status = "expired"
- Rosters unchanged
- Event broadcast to league
- Cron returns { processed: 1, expired: 1 }

---

#### 4.2 Trade Not Expired Before 48 Hours
**Preconditions:**
- Trade created 47 hours ago
- Status = "pending"

**Steps:**
1. Cron job runs
2. System checks expiresAt < now

**Expected Results:**
- Trade status remains "pending"
- No changes
- Cron returns { processed: 1, expired: 0 }

---

#### 4.3 Accepted Trades Never Expire
**Preconditions:**
- Trade accepted 100 hours ago
- Status = "accepted"
- expiresAt is in past

**Steps:**
1. Cron job runs
2. Query WHERE status = 'pending' AND expiresAt < now

**Expected Results:**
- Trade status remains "accepted"
- Not included in expiration query
- Cron returns 0 for this trade

---

#### 4.4 Rejected Trades Never Expire
**Preconditions:**
- Trade rejected 100 hours ago
- Status = "rejected"

**Steps:**
1. Cron job runs

**Expected Results:**
- Trade unchanged
- Not processed
- Cleanup only processes "pending" trades

---

#### 4.5 Cron Job Idempotency
**Preconditions:**
- Trade expired 2 hours ago
- Already has status = "expired"

**Steps:**
1. Cron job runs once
2. Runs again immediately
3. Runs on subsequent iterations

**Expected Results:**
- First run: status = "expired"
- Second run: no change (already expired)
- Broadcast happens only once (or is deduplicated)
- Cron returns { processed: 1, expired: 1 } first run
- Returns { processed: 1, expired: 0 } subsequent runs

---

### 5. Veto Voting System (8 tests)

Tests that verify veto mechanics: commissioner instant veto, member voting, quorum, auto-reject.

#### 5.1 Commissioner Can Instant Veto
**Preconditions:**
- Pending trade in league
- User A is commissioner

**Steps:**
1. Commissioner calls POST /api/trades/[tradeId]/veto
2. System checks User A role = "commissioner"
3. Update Trade.status = "rejected" (instant veto)
4. Set vetoed_by_commissioner = true
5. Broadcast "trade-vetoed" event

**Expected Results:**
- Trade.status = "rejected"
- Event: { type: "trade-vetoed", reason: "commissioner_veto" }
- Rosters unchanged
- Trade.respondedAt is set
- Event broadcast immediately

---

#### 5.2 Regular Members Vote To Veto
**Preconditions:**
- Pending trade
- 6 league members (not owner, not receiver)
- League setting maxTradeVetoVotes = 2

**Steps:**
1. Member 1 calls POST /api/trades/[tradeId]/vote-veto
2. Member 2 calls POST /api/trades/[tradeId]/vote-veto
3. System counts votes: 2/6 = quorum met (>= 2 votes)
4. Auto-reject trade (status = "rejected")
5. Broadcast "trade-vetoed" event with vote count

**Expected Results:**
- After vote 1: Trade.vetoVoteCount = 1, status = "pending"
- After vote 2: Trade.vetoVoteCount = 2, status = "rejected"
- Event: { type: "trade-vetoed", reason: "member_veto", votes: 2, required: 2 }
- Rosters unchanged

---

#### 5.3 Veto Threshold Not Met
**Preconditions:**
- 6 league members
- maxTradeVetoVotes = 2
- 1 vote received

**Steps:**
1. Member 1 votes
2. System checks vetoVoteCount (1) < maxTradeVetoVotes (2)

**Expected Results:**
- Trade.status remains "pending"
- Trade.vetoVoteCount = 1
- No auto-reject

---

#### 5.4 Only League Members Can Vote
**Preconditions:**
- Trade in league
- User not in league

**Steps:**
1. Non-member calls POST /api/trades/[tradeId]/vote-veto

**Expected Results:**
- HTTP 403 Forbidden
- Error: "Not a league member"
- vetoVoteCount unchanged

---

#### 5.5 Owner/Receiver Cannot Vote Their Own Trade
**Preconditions:**
- Trade (owner=User A, receiver=User B)

**Steps:**
1. User A votes on own trade
2. User B votes on own trade

**Expected Results:**
- Both return HTTP 403
- Error: "Cannot veto your own trade"
- vetoVoteCount unchanged

---

#### 5.6 Member Cannot Vote Twice On Same Trade
**Preconditions:**
- Trade with 1 existing vote from User C

**Steps:**
1. User C votes again on same trade

**Expected Results:**
- HTTP 400
- Error: "Already voted on this trade"
- vetoVoteCount remains 1 (no double-vote)

---

#### 5.7 Veto Votes Display In Trade Details
**Preconditions:**
- Trade with 1 veto vote

**Steps:**
1. GET /api/trades/[tradeId]
2. Check response includes veto vote count and voters

**Expected Results:**
- Response includes:
  - vetoVoteCount: 1
  - vetoVotes: [{ memberId, memberName, votedAt }]
  - maxTradeVetoVotes: 2

---

#### 5.8 Cannot Veto Already Accepted/Rejected Trade
**Preconditions:**
- Trade.status = "accepted" or "rejected"

**Steps:**
1. Member votes on accepted trade
2. Member votes on rejected trade

**Expected Results:**
- Both return HTTP 400
- Error: "Cannot veto non-pending trade"
- No veto recorded

---

### 6. Edge Cases & Concurrent Actions (7 tests)

Tests that verify handling of race conditions and edge cases.

#### 6.1 Both Users Accept Simultaneously
**Preconditions:**
- Trade (owner=User A, receiver=User B)
- Both users call accept at same time
- Database isolation level = SERIALIZABLE

**Steps:**
1. User A sends POST /api/trades/[tradeId]/accept
2. User B sends POST /api/trades/[tradeId]/accept simultaneously
3. Both hit database transaction at same time
4. One acquires lock, other waits/retries
5. Verify atomic outcome

**Expected Results:**
- Trade accepted exactly once
- Rosters updated exactly once
- No duplicate RosterSpot entries
- Both responses succeed (idempotent)

**Edge Case Notes:**
- Use SELECT ... FOR UPDATE on Trade row
- Lock entire transaction to prevent race

---

#### 6.2 Receiver Accepts While Owner Rejects
**Preconditions:**
- Trade (owner=User A, receiver=User B)

**Steps:**
1. User A initiates reject
2. User B initiates accept simultaneously
3. Ordering: Let's say accept completes first

**Expected Results:**
- Trade accepted (accept request won)
- Rosters updated
- Reject request returns 400: "Trade already accepted"
- Clear error message to User A

**Edge Case Notes:**
- "Last write wins" strategy or first-write-wins
- Ensure no ambiguous state
- Clear error messaging

---

#### 6.3 Veto Vote While Acceptance In Progress
**Preconditions:**
- Trade with 1 veto vote (1 needed for quorum)
- Receiver beginning accept
- Member voting simultaneously

**Steps:**
1. Receiver initiates accept (transaction starts)
2. Member votes (transaction starts)
3. Verify ordering: veto completes first
4. Accept request sees status = "rejected"

**Expected Results:**
- Veto vote processed: status = "rejected"
- Accept attempt fails: "Trade already rejected"
- Rosters not changed

---

#### 6.4 Duplicate Trade Prevention
**Preconditions:**
- Trade already exists (owner=User A, receiver=User B, playerA <-> playerB)
- Same users try to propose identical trade again

**Steps:**
1. User A calls POST /api/trades with same players
2. System checks for existing trade:
   - WHERE (ownerId = A AND receiverId = B AND ownerPlayerId = pA AND receiverPlayerId = pB)
   - OR (ownerId = B AND receiverId = A AND ownerPlayerId = pB AND receiverPlayerId = pA)

**Expected Results:**
- HTTP 400
- Error: "Active trade already exists with these players"
- Second trade not created

---

#### 6.5 League With Many Trades (Performance)
**Preconditions:**
- 100 pending trades in league
- 200 expired trades
- 50 accepted trades

**Steps:**
1. GET /api/leagues/[leagueId]/trades (list all trades for user)
2. Time the query

**Expected Results:**
- Response < 100ms
- Only trades involving user returned (security)
- Sorted by createdAt desc or expiresAt asc
- Pagination working (limit 20, offset)

---

#### 6.6 Player Traded Away Then Homeruns Scored
**Preconditions:**
- Player A owned by User A, has 0 homeruns
- Trade accepted: Player A to User B
- Homerun event for Player A is processed (score: 1)

**Steps:**
1. Trade accepted, rosters updated
2. Homerun event processed
3. Check standings

**Expected Results:**
- Homerun counts to User B (new owner)
- User B gains 1 point
- User A not affected
- Standings accurate

---

#### 6.7 Player In Trade Cannot Be Drafted Again
**Preconditions:**
- Player A in draft pool
- Trade created: User A trades Player A
- User C tries to draft Player A (draft still active)

**Steps:**
1. Trade pending, Player A still in User A's roster
2. Draft continues
3. User C tries to draft Player A
4. Check unique constraint: (leagueId, playerId)

**Expected Results:**
- Draft fails: "Player already drafted"
- Constraint prevents duplicate
- Player A locked to User A until trade resolved

---

### 7. Real-Time Broadcasting & Notifications (6 tests)

Tests that verify Pusher events and Web Push notifications.

#### 7.1 Trade Proposed Event Broadcasts
**Preconditions:**
- Trade created
- Pusher channel subscribed

**Steps:**
1. User A creates trade
2. Listen on Pusher league-{leagueId}
3. Verify event received

**Expected Results:**
- Event: {
    type: "trade-proposed",
    tradeId,
    ownerId, ownerName,
    receiverId, receiverName,
    ownerPlayerName, receiverPlayerName,
    createdAt, expiresAt
  }
- Latency < 100ms
- All members receive event

---

#### 7.2 Trade Accepted Event Broadcasts
**Preconditions:**
- Trade accepted

**Steps:**
1. Listen on Pusher
2. Trade accepted
3. Verify event

**Expected Results:**
- Event: {
    type: "trade-accepted",
    tradeId,
    ownerId, ownerName,
    receiverId, receiverName,
    acceptedAt
  }

---

#### 7.3 Web Push: Trade Proposed Notification
**Preconditions:**
- Receiver has active push subscription
- Notifications enabled in league

**Steps:**
1. User A creates trade to User B
2. System calls sendPushToUser(User B, {...})
3. Verify notification sent

**Expected Results:**
- Push notification with:
  - Title: "New Trade Proposal"
  - Body: "User A wants to trade [Player A] for [Player B]"
  - Badge, icon, tag="trade-" + tradeId (deduplicates)
  - Click leads to trade details page

---

#### 7.4 Web Push: Trade Accepted Notification
**Preconditions:**
- Owner has push subscription

**Steps:**
1. Trade accepted by receiver
2. Notification sent to owner

**Expected Results:**
- Push notification:
  - Title: "Trade Accepted!"
  - Body: "User B accepted your trade. You now own [Player B]"

---

#### 7.5 Web Push: Trade Veto'd Notification
**Preconditions:**
- Both owner and receiver have subscriptions
- League has veto enabled

**Steps:**
1. Commissioner vetoes trade (or members reach quorum)
2. Notifications sent

**Expected Results:**
- Both parties notified:
  - Title: "Trade Veto'd"
  - Body: "Your trade was veto'd by the league"
- Reason included (commissioner or member vote count)

---

#### 7.6 Push Notification Respects User Preferences
**Preconditions:**
- Receiver opted out of notifications
- LeagueSettings.notificationsEnabled = false

**Steps:**
1. Trade created
2. Check if push sent

**Expected Results:**
- No push sent to opted-out user
- In-app notification fallback (if supported)
- Error handling: 410 Gone for stale subscription

---

### 8. Input Validation & Security (6 tests)

Tests that verify strict input validation and security checks.

#### 8.1 SQL Injection Prevention
**Preconditions:**
- Trade endpoint

**Steps:**
1. Call POST /api/trades with:
   - receiverId: "' OR '1'='1"
   - ownerPlayerId: "'; DROP TABLE trades; --"

**Expected Results:**
- HTTP 400 Bad Request
- Parameterized queries prevent injection
- Input sanitized before use
- Database unchanged

---

#### 8.2 XSS Prevention In Trade Details
**Preconditions:**
- Trade details API

**Steps:**
1. Create player with name: "<script>alert('xss')</script>"
2. Include in trade
3. GET /api/trades/[id]
4. Verify response

**Expected Results:**
- Response JSON-escaped (not raw HTML)
- Player name: "\\u003cscript\\u003e..."
- Frontend must decode and sanitize before display

---

#### 8.3 CSRF Protection
**Preconditions:**
- POST /api/trades endpoints

**Steps:**
1. Call from different origin without CSRF token
2. Verify headers: SameSite=Strict

**Expected Results:**
- Browser blocks cross-origin POST
- SameSite=Strict enforced
- Cookies not sent cross-origin

---

#### 8.4 Rate Limiting On Trade Endpoints
**Preconditions:**
- User makes 50 trade proposals in 1 minute

**Steps:**
1. Loop POST /api/trades 50 times
2. Monitor responses

**Expected Results:**
- First 20-30: HTTP 200
- Remaining: HTTP 429 Too Many Requests
- Retry-After header present
- Rate limit per user, not global

---

#### 8.5 Authentication Required
**Preconditions:**
- No session token

**Steps:**
1. POST /api/trades without Authorization header
2. GET /api/trades without session

**Expected Results:**
- HTTP 401 Unauthorized
- Redirect to login
- No data exposed

---

#### 8.6 Type Validation On Numeric Fields
**Preconditions:**
- Trade creation endpoint

**Steps:**
1. Send leagueId = "not-a-cuid"
2. Send receiverId = 12345 (number instead of string)

**Expected Results:**
- HTTP 400 Bad Request
- Error explains type mismatch
- Parsed with zod or similar validator

---

### 9. API Response Consistency (4 tests)

Tests that verify consistent response formats and error handling.

#### 9.1 GET Trade List Endpoint
**Preconditions:**
- User in league with 5 trades

**Steps:**
1. GET /api/leagues/[leagueId]/trades
2. Check response format

**Expected Results:**
- Response:
  ```json
  {
    "trades": [
      {
        "id": "...",
        "ownerId", "ownerName",
        "receiverId", "receiverName",
        "ownerPlayerId", "ownerPlayerName",
        "receiverPlayerId", "receiverPlayerName",
        "status": "pending",
        "expiresAt",
        "createdAt",
        "respondedAt": null,
        "vetoVotes": {...}
      }
    ],
    "pagination": {
      "total": 5,
      "page": 0,
      "limit": 20
    }
  }
  ```
- Sorted by expiresAt asc (pending first)
- Pagination working

---

#### 9.2 GET Single Trade Details
**Preconditions:**
- Pending trade

**Steps:**
1. GET /api/trades/[tradeId]
2. Check response

**Expected Results:**
- Single trade object (not array)
- All fields populated
- Veto vote details included
- History/timeline if available

---

#### 9.3 Error Response Format
**Preconditions:**
- Various error scenarios

**Steps:**
1. Trigger 400, 401, 403, 404, 429, 500 errors
2. Check response format

**Expected Results:**
- Consistent error format:
  ```json
  {
    "error": "Error code",
    "message": "Human-readable message",
    "timestamp": "2026-02-21T...",
    "traceId": "..."
  }
  ```
- 400: Invalid input
- 401: No session
- 403: Unauthorized for action
- 404: Trade not found
- 429: Rate limited
- 500: Internal error

---

#### 9.4 Success Response Status Codes
**Preconditions:**
- Various endpoints

**Steps:**
1. POST /api/trades (create) - should be 201
2. POST /api/trades/[id]/accept - should be 200
3. GET /api/trades/[id] - should be 200

**Expected Results:**
- 201 for POST that creates resource
- 200 for POST that updates state
- 200 for GET
- 204 for DELETE (if implemented)

---

### 10. Database Integrity & Cleanup (5 tests)

Tests that verify data consistency and cleanup.

#### 10.1 No Orphaned RosterSpot Records
**Preconditions:**
- Trade accepted and rosters updated

**Steps:**
1. Query RosterSpot WHERE leagueId = ? AND userId = ?
2. Verify count is exactly correct
3. Verify no duplicates

**Expected Results:**
- Each user has exactly 6 roster spots (post-draft)
- No NULL playerIds
- Unique (leagueId, userId, playerId) constraint enforced
- No duplicates

---

#### 10.2 Trade Cascade Delete On League Delete
**Preconditions:**
- Trade exists
- League deleted

**Steps:**
1. DELETE League
2. Query Trade with leagueId = deleted_id

**Expected Results:**
- All trades deleted (cascade)
- No orphaned Trade records

---

#### 10.3 Trade Cleanup On User Delete
**Preconditions:**
- User A has trades (as owner and receiver)

**Steps:**
1. DELETE User A
2. Query Trade WHERE ownerId = A OR receiverId = A

**Expected Results:**
- All trades deleted (cascade)
- No orphaned records

---

#### 10.4 Homerun Updates After Trade
**Preconditions:**
- Player A traded from User A to User B
- HomerrunEvent exists for Player A (score: 3)

**Steps:**
1. Trade accepted
2. RosterSpot updated for User B with homeruns = 3
3. Check HomerrunEvent link

**Expected Results:**
- RosterSpot.homeruns = 3 for User B
- HomerrunEvent.leagueId still points to league
- No broken foreign keys

---

#### 10.5 Transaction Rollback On Error
**Preconditions:**
- Trade acceptance in progress
- Database connection lost

**Steps:**
1. Begin transaction (accept)
2. Kill database connection mid-transaction
3. Reconnect

**Expected Results:**
- Transaction rolls back
- RosterSpots unchanged
- Trade.status = "pending"
- Error returned to user
- No partial updates

---

---

## Test Implementation Strategy

### Testing Framework
- **Framework:** Vitest (Jest-compatible)
- **Mocks:** Trade API, Pusher, Web Push, Database
- **Database:** Use in-memory SQLite for unit tests, Postgres for integration tests
- **Fixtures:** Pre-built trades with various states

### Test File Structure

```
__tests__/
├── trades/
│   ├── 01-proposal.test.ts (7 tests)
│   ├── 02-acceptance.test.ts (8 tests)
│   ├── 03-rejection.test.ts (6 tests)
│   ├── 04-expiration.test.ts (5 tests)
│   ├── 05-veto.test.ts (8 tests)
│   ├── 06-concurrent.test.ts (7 tests)
│   ├── 07-broadcast.test.ts (6 tests)
│   ├── 08-validation.test.ts (6 tests)
│   ├── 09-api-response.test.ts (4 tests)
│   └── 10-database.test.ts (5 tests)
├── fixtures/
│   ├── trades.fixture.ts (mock trade objects)
│   ├── users.fixture.ts (mock users)
│   └── leagues.fixture.ts (mock leagues)
└── helpers/
    ├── trade-helper.ts (utility functions)
    └── db-helper.ts (database setup/teardown)
```

### Mock Data Strategy

**League Setup:**
- 6 users in league
- All have 6 roster spots (post-draft)
- Players A-F distributed

**Trade States:**
- Pending (created 1 hour ago, expires in 47 hours)
- Accepted (completed 5 hours ago)
- Rejected (rejected 2 hours ago)
- Expired (created 50 hours ago, never responded)

---

## Success Criteria

All trading system tests pass when:

1. ✓ Trade proposal validation prevents invalid inputs
2. ✓ Acceptance atomically updates rosters (no orphaned data)
3. ✓ Rejection marks trade without roster changes
4. ✓ 48-hour expiration runs via cron (idempotent)
5. ✓ Commissioner can instant veto
6. ✓ Member voting with quorum auto-rejects
7. ✓ Concurrent requests handled safely (idempotent)
8. ✓ Pusher broadcasts events < 100ms
9. ✓ Web Push notifications send correctly
10. ✓ All input validated (SQL injection, XSS, CSRF safe)
11. ✓ Cascade deletes clean up trades
12. ✓ Performance acceptable (queries < 100ms)

---

## Coverage Summary

**Total Test Cases:** 52
**Categories:**
- Unit Tests (Proposal, Acceptance, Rejection): 21
- Integration Tests (Broadcasting, Notifications): 6
- Validation Tests (Input, Security): 6
- Edge Case Tests (Concurrent, Duplicate, Performance): 7
- Error Tests (Not Found, Unauthorized, Expired): 12

**Estimated Coverage:** 85%+ critical paths

---

## Implementation Checklist

- [ ] Trade API endpoints created (POST /api/trades, POST /api/trades/[id]/accept, etc.)
- [ ] Trade status and veto models in schema (already in prisma/schema.prisma)
- [ ] Acceptance transaction with atomic roster update
- [ ] Rejection endpoint with cascade checks
- [ ] Expiration cron job (POST /api/cron/trade-expire)
- [ ] Veto voting system (member votes, quorum calculation)
- [ ] Pusher broadcasting for all trade events
- [ ] Web Push notifications (propose, accept, reject, veto)
- [ ] Input validation (zod schema)
- [ ] Authorization checks (league membership, owner/receiver verification)
- [ ] Error handling and status codes
- [ ] Idempotency for concurrent requests
- [ ] Database indexes on tradeId, status, expiresAt
- [ ] Tests implemented and passing

---

## Known Limitations

1. **iOS Web Push:** Fallback to in-app notifications (iOS Safari doesn't support Web Push API)
2. **MLB Season:** Trades valid only when draft complete (before April 2026)
3. **Veto Votes Not Reversible:** Once voted, can't un-vote (by design, prevents gaming)
4. **Draft During Trade:** If draft active, trade proposals allowed (no blocking)
5. **Timeouts:** 48-hour expiration is exact timestamp, not user-facing countdown

---

## Dependencies on Other Systems

- **MLB Stats API:** If Player lookup fails (players no longer exist)
- **Pusher:** Real-time broadcast reliability
- **Database:** Transaction isolation for concurrent requests
- **Push Service:** Error handling for 410 Gone, 429 rate limits
- **Cron Jobs:** Expiration and veto auto-rejection

---

## Team Notes

- Trade feature launches Week 6 (after draft completion)
- Phase 1: Basic propose/accept/reject (no veto)
- Phase 2: Add veto voting + notifications
- Phase 3: Trade deadlines per league settings
- Next: Week 7 Polish, edge case handling, launch prep

---

**Document Version:** 1.0
**Created:** 2026-02-21
**Status:** Ready for Implementation
