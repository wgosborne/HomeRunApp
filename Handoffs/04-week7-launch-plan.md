# Week 7: Polish & Launch Plan

**Current Status:** Weeks 1-6 complete. Ready for launch preparation.
**Target:** April 2026 soft launch (regular season opening)
**Team:** Designer, Tester, ProductManager

---

## Overview

Week 7 focuses on polishing the MVP for launch and preparing for real users. All core features are complete; this week is about refinement, testing, and launch infrastructure.

---

## Tasks Breakdown

### Task 1: Landing Page & Marketing Site

**What:** Create public-facing landing page to explain Fantasy Homerun Tracker.

**Deliverables:**
- [ ] Create `app/page.tsx` or separate marketing landing (if not done)
- [ ] Feature summary (leagues, draft, homerun tracking, trades, leaderboards)
- [ ] Screenshots of key UI (draft room, leaderboard, trades)
- [ ] Sign-in flow explanation
- [ ] FAQ (iOS Safari limitations, offline capability, 48h trade expiration)
- [ ] Contact/support information

**Files to Create/Update:**
- `app/page.tsx` - New landing page (if needed)
- `public/images/` - Feature screenshots
- `app/components/Header.tsx` - Navigation (if needed)

**Success Criteria:**
- [ ] Public URL accessible
- [ ] Clear feature explanation
- [ ] Call-to-action (Sign in with Google)
- [ ] Mobile responsive
- [ ] Load time < 3s

---

### Task 2: Feature Documentation

**What:** Create user-facing documentation for all features.

**Deliverables:**
- [ ] Getting Started guide (create league, invite members, start draft)
- [ ] Draft Rules (10 rounds, 60-sec timer, auto-pick on timeout)
- [ ] Homerun Tracking (how players earn homeruns, live updates)
- [ ] Trading Guide (how to propose/accept trades, 48h expiration)
- [ ] Leaderboard explanation (ranked by homeruns)
- [ ] Mobile PWA setup (how to install on home screen)
- [ ] Known Issues & Limitations (iOS Safari, offline mode)

**Format:**
- In-app help text + links
- `/docs/` pages or FAQ
- Video tutorials (optional for V1)

**Files to Create:**
- `app/docs/getting-started/page.tsx`
- `app/docs/drafting/page.tsx`
- `app/docs/trading/page.tsx`
- `app/docs/faq/page.tsx`

**Success Criteria:**
- [ ] All features documented
- [ ] Clear screenshots/GIFs
- [ ] Searchable FAQ
- [ ] Mobile friendly

---

### Task 3: Comprehensive Testing

**What:** Execute full end-to-end testing before launch.

**Test Scenarios:**
1. **User Flow:**
   - [ ] Sign in with Google (new user)
   - [ ] Create league (commissioner)
   - [ ] Invite member (share link)
   - [ ] Join league (via invite link)
   - [ ] Start draft (commissioner)
   - [ ] Pick players (all 6 members × 10 rounds)
   - [ ] Draft auto-pick (on 60s timeout)
   - [ ] View standings (leaderboard)
   - [ ] View roster (my team)
   - [ ] Propose trade (1:1 swap)
   - [ ] Accept trade (receiver)
   - [ ] Verify roster updated

2. **Real-Time (Pusher):**
   - [ ] Draft pick broadcast to all members
   - [ ] Standings update in real-time
   - [ ] Homerun events broadcast (when available)
   - [ ] Trade proposal notification

3. **Notifications (Web Push):**
   - [ ] Subscribe to notifications
   - [ ] Homerun alert trigger
   - [ ] Draft turn notification
   - [ ] Trade proposal notification
   - [ ] Unsubscribe without errors

4. **PWA & Offline:**
   - [ ] Install to home screen (Chrome/Android)
   - [ ] App loads offline
   - [ ] Offline indicator shows
   - [ ] Cached standings load
   - [ ] Network restore re-fetches data

5. **Mobile Compatibility:**
   - [ ] iOS Safari: pages load (no push, install prompt works)
   - [ ] Android Chrome: full PWA experience
   - [ ] Responsive design (phones, tablets)
   - [ ] Touch interactions (no hover states)

6. **Error Cases:**
   - [ ] Duplicate trade proposal (409 error)
   - [ ] Invalid player in trade (404 error)
   - [ ] Non-receiver tries accept (403 error)
   - [ ] Expired trade auto-expires (cron)
   - [ ] Offline API calls queue properly

**Files Referenced:**
- `Handoffs/05-test.md` - Existing test documentation
- `Handoffs/06-trading-test-plan.md` - Trading test cases
- Create `Handoffs/07-week7-testing.md` - Final pre-launch testing

**Success Criteria:**
- [ ] 100% test pass rate
- [ ] No console errors
- [ ] Build warnings resolved
- [ ] Performance acceptable (Core Web Vitals)

---

### Task 4: Security & Hardening

**What:** Audit code for security, secrets, and production readiness.

**Checklist:**
- [ ] CRON_SECRET changed from default (vercel.json, .env.local)
- [ ] NEXTAUTH_SECRET is strong (32+ chars)
- [ ] Google OAuth secrets in .env.local (never in code)
- [ ] VAPID keys generated and stored in .env
- [ ] Pusher credentials in .env (not hardcoded)
- [ ] Database URLs don't expose credentials
- [ ] No console.log() in production code (use logger)
- [ ] Auth guards on all protected endpoints
- [ ] Multi-tenant isolation verified (Prisma middleware)
- [ ] No SQL injection vectors (using Prisma ORM)
- [ ] No XSS vectors (React sanitization)
- [ ] HTTPS enforced in production (Vercel default)
- [ ] Session expiry set reasonable (NextAuth default 30 days)

**Files to Audit:**
- `.env.local` (never commit secrets)
- `.env.example` (template only)
- `lib/auth.ts` - NextAuth configuration
- `lib/prisma.ts` - Prisma middleware
- `app/api/**/*.ts` - Auth checks on routes
- `vercel.json` - Cron secrets

**Success Criteria:**
- [ ] No secrets in code
- [ ] All endpoints auth-protected
- [ ] Multi-tenant isolation verified
- [ ] Ready for GitHub public repo (if planned)

---

### Task 5: Performance Optimization

**What:** Ensure fast load times and smooth user experience.

**Measurements:**
- [ ] npm run build time (target < 30s)
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 3s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Draft room responsive (< 100ms pick submit)
- [ ] Standings load < 1s (even with 50+ homerun events)

**Optimizations:**
- [ ] Image optimization (next/image)
- [ ] Code splitting (route-based)
- [ ] Font optimization (next/font)
- [ ] Caching headers (API responses)
- [ ] Service worker precaching (static assets)
- [ ] Database query optimization (indexes, n+1 prevention)

**Tools:**
- `npm run build` - Build time
- Lighthouse (Chrome DevTools)
- `vercel analytics` (after deploy)

**Success Criteria:**
- [ ] Lighthouse score > 85
- [ ] Build time acceptable
- [ ] Draft room feels snappy

---

### Task 6: Deployment Readiness

**What:** Prepare for Vercel Pro deployment.

**Checklist:**
- [ ] Vercel account created
- [ ] GitHub repo connected
- [ ] Environment variables set in Vercel dashboard
  - DATABASE_URL (Neon)
  - NEXTAUTH_SECRET
  - NEXTAUTH_URL (production domain)
  - Google OAuth credentials
  - Pusher credentials
  - CRON_SECRET
  - VAPID keys
- [ ] Cron jobs verified in vercel.json
- [ ] Database backup strategy (Neon backups)
- [ ] Monitoring setup (error tracking, optional)
- [ ] Analytics setup (optional, privacy-respecting)
- [ ] Cost tracking (Vercel dashboard)

**Pre-Deployment:**
- [ ] Run `npm run build` locally (verify success)
- [ ] Run `npx tsc --noEmit` (verify types)
- [ ] Backup database
- [ ] Test Vercel preview deployment
- [ ] Verify cron jobs execute
- [ ] Check error logs

**Files:**
- `vercel.json` - Cron configuration, build settings
- `package.json` - Build scripts
- `.env.example` - Environment variable template

**Success Criteria:**
- [ ] Vercel deployment successful
- [ ] Production URL accessible
- [ ] All features working in production
- [ ] Cron jobs executing on schedule

---

### Task 7: Go-Live Communication

**What:** Prepare launch announcement and user onboarding.

**Deliverables:**
- [ ] Launch announcement (email template or blog post)
- [ ] First-run onboarding flow (optional tutorial)
- [ ] Support contact information
- [ ] Known issues documentation
- [ ] Feedback/feature request channel (Discord, email, GitHub discussions)
- [ ] Changelog (what's in MVP, what's coming)

**Audience:**
- Existing testers
- Friends/family
- Baseball fans in target demographic
- Co-workers

**Channels:**
- Email
- Social media (Twitter, Reddit, Discord)
- Direct links
- Word of mouth

**Success Criteria:**
- [ ] Clear launch message
- [ ] Easy onboarding
- [ ] Support infrastructure ready

---

## Timeline (Week 7 - 5 days)

| Day | Task | Owner | Status |
|-----|------|-------|--------|
| Mon | Tasks 1-2 (Landing, Docs) | Designer | |
| Tue | Task 3 (Testing) | Tester | |
| Wed | Tasks 4-5 (Security, Performance) | Developer | |
| Thu | Task 6 (Deployment) | DevOps | |
| Fri | Task 7 (Go-Live) + Final QA | All | |

---

## Success Criteria for Launch

- [x] All Weeks 1-6 features complete and tested
- [ ] Landing page live
- [ ] Feature documentation complete
- [ ] Comprehensive testing pass
- [ ] Security audit complete
- [ ] Performance acceptable
- [ ] Deployed to Vercel Pro
- [ ] Cron jobs verified
- [ ] Announcement ready

---

## Known Limitations at Launch

**iOS Safari:**
- PWA install works (add to home screen)
- Web Push API not supported (native app only)
- Fallback: in-app notifications in future

**Android/Chrome:**
- Full PWA experience (install, push, offline)
- Chrome latest 2 versions recommended

**MLB Data:**
- Only available during active season (April-October)
- Spring Training stats available late February
- No historical homerun data (only live events)

**MVP Features Not Included:**
- Veto voting on trades (simplified to direct receiver decision)
- Multi-player trades (simplified to 1:1 only)
- Salary cap / auction draft (simplified to snake draft)
- Live chat (Phase 2)
- Mobile apps (web app first)
- International players (MLB only)

---

## Metrics to Track (Post-Launch)

- [ ] User signups (week over week)
- [ ] Leagues created
- [ ] Drafts completed
- [ ] Trades executed
- [ ] Daily active users
- [ ] Feature usage (standout features)
- [ ] Error rates / crash reports
- [ ] User feedback / feature requests

---

## Budget

| Item | Cost | Note |
|------|------|------|
| Vercel Pro | $20/month | Cron required |
| Neon (Postgres) | $0 | Free tier (10GB) |
| Pusher | $0 | Free tier (100 concurrent) |
| Domain | $10-15/year | Optional |
| **Total** | **$20/month** | Minimal for MVP |

---

## Hand-Off to Next Phase

**After Launch:**
- Monitor production logs and user feedback
- Fix bugs quickly (hotfix branch)
- Iterate on UI/UX based on user testing
- Plan Phase 2 features (chat, mobile app, international, etc.)

**Phase 2 Candidates:**
- Live chat during games
- iOS native app (for Web Push on Safari)
- Multi-league dashboard
- Leaderboards across leagues
- Historical stats / season projections
- Mobile apps (iOS, Android)
- Auction draft format

---

**Week 7 is go/no-go for April 2026 soft launch. All items must be complete before production deployment.**
