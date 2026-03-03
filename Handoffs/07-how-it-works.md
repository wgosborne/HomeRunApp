# How It Works: Fantasy Homerun Tracker

## Notifications System

### What Are Notifications?
Push notifications are real-time alerts that appear on users' devices (phones, tablets, desktops) even when the app isn't open. Users enable them once, then receive updates about league events without needing to check the app constantly.

### Technology Used
- **Web Push API:** Native browser notification system (no third-party vendors)
- **VAPID Encryption:** Securely sends notifications from server → device
- **Service Worker:** Background process that receives and displays notifications
- **Database Storage:** Tracks which users have subscribed (PushSubscription table)

### Complete List: When Users Receive Notifications

A user gets a push notification in these situations:

| Trigger | Who Gets It | Message Example | App Open? | Notes |
|---------|-------------|-----------------|-----------|-------|
| **Player hits homerun** | Owner of player's roster spot | "Kyle Schwarber hit a homerun! PHI, 3rd inning. 12 total." | Any | Cron job polls every 5 min |
| **Draft starts** | All league members | "Draft has started! Wait for your turn." | Away | Commissioner-initiated, all 6 members notified |
| **Draft starts (first picker)** | First picker only | "Your turn in the draft! You are the first picker." | Away | Different message than others |
| **It's your turn to pick** | Current picker | "Your turn in the draft! [Prev] just picked [Player]. 60 seconds." | Away ONLY | **Suppressed** if user actively in draft room |
| **Trade proposal received** | Trade recipient | "Trade proposal from John: Your Judge for their Soto" | Any | Proposer sent the trade |
| **Trade accepted** | Trade proposer | "Your trade was accepted! You got [Player]." | Any | Recipient accepted their proposal |
| **Trade rejected** | Trade proposer | "Your trade was rejected." | Any | Recipient declined their proposal |

### When Do Users Get Notifications?

#### Homerun Alerts
- Every 5 minutes, cron job polls MLB games for homeruns
- When a player on user's roster hits a homerun, they get instant notification
- Message: "Kyle Schwarber hit a homerun! Kyle Schwarber (PHI) hit a homerun in the 3rd inning. You now have 12 homeruns."
- Includes player name, team, inning, updated total
- **Sent regardless of whether app is open** (always relevant)

#### Draft Start Notification
- All league members get notified when commissioner starts the draft
- First picker: "Your turn in the draft! You are the first picker..."
- Other members: "Draft has started! The draft has started. Wait for your turn to pick."
- Sent once when draft begins

#### Draft Turn Notifications (Minimized)
- **ONLY** the user about to pick gets notified when it becomes their turn
- **SUPPRESSED** if user is actively in the draft room (Pusher updates sufficient)
- **SENT** if user is away from the app (they need to know to return)
- Message: "Your turn in the draft! [Previous picker] just picked [Player]. It's your turn now! You have 60 seconds."
- Smart suppression: Service Worker tracks active draft rooms and blocks redundant notifications

#### Trade Notifications
- User gets notified when someone proposes a trade
- User gets notified when trade is accepted/rejected
- Message: "Trade proposal from John: Your Aaron Judge for their Juan Soto"
- Real-time broadcast when response arrives

#### League Updates
- Draft completion, standings changes, roster updates
- Broadcast to all league members
- Content varies by event type

### Device & Browser Support

| Platform | Browser | Support |
|----------|---------|---------|
| Android | Chrome, Firefox, Edge | ✅ Full Support |
| Windows | Chrome, Firefox, Edge | ✅ Full Support |
| Mac | Chrome, Firefox, Edge | ✅ Full Support |
| iOS (iPhone/iPad) | Safari | ❌ Not Supported |

**Important Limitation:** iOS Safari does NOT support Web Push API. The app automatically hides the notification bell on iOS devices. No workaround available—Apple restricts this to native apps only.

### How Users Enable Notifications (5 Steps)

1. **Find the Bell Icon** — In league page header, top right corner
2. **Click the Bell** — Opens notification settings popup
3. **Click "Enable Notifications"** — Browser shows permission request
4. **Click "Allow"** — Confirms in OS/browser dialog
5. **See Confirmation** — Green dot appears on bell, message shows "Status: Enabled"

Once enabled, the app stores the user's subscription endpoint (encrypted keys) in the database and sends notifications automatically for all applicable events.

### Smart Notification Suppression (Draft-Specific)

To prevent notification spam during active drafting, the system uses intelligent client-server communication:

**How It Works:**
1. When user **enters** draft room → Client sends message to Service Worker: `DRAFTING_ACTIVE`
2. Service Worker **tracks** which leagues user is actively drafting in (in-memory Set)
3. When push notification arrives for `eventType: 'turn'` → Service Worker **checks** if league is active
4. If user is **actively drafting** → Notification is **suppressed** (Pusher real-time updates sufficient)
5. If user is **away from app** → Notification **shows** (they need to come back for their turn)
6. When user **leaves** draft room → Client sends message: `DRAFTING_INACTIVE`

**Result:** No duplicate "your turn" alerts while drafting, but users away from the app still get notified.

### Current Implementation Status

**Fully Implemented:**
- ✅ Service worker handles all push events
- ✅ NotificationBell UI component in league page
- ✅ Backend functions: sendPushToUser(), sendPushToLeague()
- ✅ Homerun cron job triggers notifications every 5 minutes
- ✅ Draft start notifications to ALL league members
- ✅ Draft turn notifications (next picker only, with smart suppression)
- ✅ Trade proposal/response notifications
- ✅ VAPID keys configured (requires env vars)
- ✅ PushSubscription database table tracks subscriptions
- ✅ Client-side active draft tracking via Service Worker messages
- ✅ Smart suppression logic in Service Worker (minimizes redundant notifications)

**Limitations:**
- iOS Safari: No support (bell hidden, no fallback)
- Off-season (March): No real MLB homeruns until April 1st
- Test mode: Uses mock data to preview functionality

### Key Files

- `app/components/NotificationBell.tsx` — UI component, handles subscription
- `lib/push-service.ts` — Backend functions to send notifications
- `public/sw.js` — Service worker that displays push notifications
- `app/api/notifications/subscribe` — Endpoint to save subscription
- `app/api/notifications/unsubscribe` — Endpoint to remove subscription
- `app/api/cron/homerun-poll/route.ts` — Triggers homerun notifications
- `app/api/draft/[leagueId]/start/route.ts` — Triggers draft turn notifications
- `app/api/trades/[leagueId]/route.ts` — Triggers trade notifications

### Permission Management

Users can manage notifications anytime:
1. Click bell icon → see current status
2. Click "Disable Notifications" to opt-out
3. Permission can be re-enabled at any time

If permission is blocked in browser settings:
1. Go to browser Settings → Site Settings → Notifications
2. Find the app domain
3. Change permission to "Allow"

### For Testing (Developers Only)

**Test Endpoint:**
- `POST /api/notifications/test`
- Requires CRON_SECRET header
- Development mode only (404 in production)
- Sends all notification types for manual verification

**Testing Smart Suppression:**
1. Open draft room in browser → Service Worker receives `DRAFTING_ACTIVE` message
2. Send draft turn notification via test endpoint
3. **No notification appears** (suppressed because user is actively drafting)
4. Close/navigate away from draft room → Service Worker receives `DRAFTING_INACTIVE` message
5. Send draft turn notification again
6. **Notification appears** (user is away from the app)

Browser DevTools → Application → Service Workers → Messages tab shows communication logs.

### Quick Reference: Key Notification Rules

✅ **ALWAYS Notify:**
- Homerun on your roster (real-time, exciting event)
- Draft starts (affects all members)
- Trade proposal/response (time-sensitive decisions)

✅ **NOTIFY ONLY WHEN AWAY:**
- Draft turn (suppressed if actively drafting, Pusher updates are enough)

❌ **NEVER Notify:**
- Other players picking (only next picker gets notified)
- Standings updates (use Pusher real-time + 5-sec polling)
- League member roster changes (use Pusher real-time)

### Summary: Notification Fatigue Prevention

- **Total notification types:** 7 unique scenarios
- **Most active:** Draft turn (1 per pick, only to next picker)
- **Least active:** Trade events (only when proposer/recipient involved)
- **Smart suppression:** Checks if user is in draft room (no redundant alerts)
- **Result:** Minimal spam, maximum awareness

---

**Last Updated:** 2026-03-02
**Status:** Ready for production (requires April 2026 for live MLB homeruns)
**Notification Optimization:** Draft notifications now minimized to reduce user fatigue
