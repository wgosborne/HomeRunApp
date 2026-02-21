# Test Setup Guide

This guide walks you through setting up and running the comprehensive test suites for the Fantasy Homerun Tracker PWA.

## Quick Start

### 1. Install Test Dependencies

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/vitest jest-mock-extended
```

### 2. Create vitest.config.ts

Create `/vitest.config.ts` in project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/**/*.{ts,tsx}'],
      exclude: ['app/**/*.test.{ts,tsx}', 'node_modules/']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 3. Create vitest.setup.ts

Create `/vitest.setup.ts` in project root:

```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock NextAuth
vi.mock('next-auth', () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    league: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    leagueMembership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    draftPick: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    rosterSpot: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    homerrunEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    pushSubscription: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
```

### 4. Update package.json

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest --run",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

### 5. Install Additional Test Dependencies

```bash
# For React Testing Library
npm install --save-dev @vitejs/plugin-react

# For async utilities
npm install --save-dev @testing-library/user-event

# Optional: for mocking external APIs
npm install --save-dev msw # Mock Service Worker
```

## Running Tests

### Run all tests (watch mode):
```bash
npm test
```

### Run all tests once (CI mode):
```bash
npm run test:run
```

### Run with UI dashboard:
```bash
npm run test:ui
```

### Generate coverage report:
```bash
npm run test:coverage
```

### Run specific test file:
```bash
npm test -- __tests__/business-requirements.test.ts
```

### Run tests matching pattern:
```bash
npm test -- -t "should prevent duplicate joins"
```

### Run in debug mode:
```bash
npm test -- --inspect-brk --inspect --single-thread
```

## Test Files

Two comprehensive test suites are provided:

### 1. Business Requirements Tests
**File:** `__tests__/business-requirements.test.ts` (48 tests, ~1000 lines)

Maps to 6 research areas from 01-requirements.md:
- MLB Data API (statsapi.mlb.com)
- Database (Neon Postgres multi-tenant)
- Real-time Draft Room (Pusher Channels)
- Push Notifications (Web Push API)
- Authentication (NextAuth.js v5 + Google OAuth)
- PWA (next-pwa v5)

**Run:**
```bash
npm test -- __tests__/business-requirements.test.ts
```

### 2. User Flow Tests
**File:** `__tests__/user-flows.test.ts` (52 tests, ~1100 lines)

End-to-end tests for 6 user journeys:
1. Signup/Invite Flow
2. Draft Flow (60 picks over 10 rounds)
3. Homerun Detection Flow
4. Standings/Leaderboard Flow
5. Roster Management Flow
6. Multi-League Flow

**Run:**
```bash
npm test -- __tests__/user-flows.test.ts
```

## Expected Output

When tests run successfully, you'll see:

```
✓ Research Area 1: MLB Data API (5 tests)
✓ Research Area 2: Database & Multi-Tenant Architecture (7 tests)
✓ Research Area 3: Real-Time Draft Room (Pusher) (9 tests)
✓ Research Area 4: Push Notifications (Web Push API) (8 tests)
✓ Research Area 5: Authentication (NextAuth.js v5) (8 tests)
✓ Research Area 6: PWA (next-pwa v5) (11 tests)
✓ Flow 1: Signup/Invite (7 tests)
✓ Flow 2: Draft (11 tests)
✓ Flow 3: Homerun Detection (9 tests)
✓ Flow 4: Standings/Leaderboard (7 tests)
✓ Flow 5: Roster Management (6 tests)
✓ Flow 6: Multi-League (6 tests)

Test Files  2 passed (2)
     Tests  100 passed (100)
  Start at 12:34:56
  Duration 1.23s
```

## Coverage Report

After running `npm run test:coverage`, you'll see a detailed report:

```
File                          | % Stmts | % Branch | % Funcs | % Lines |
------|---------|----------|---------|---------|
All   |    82.5 |     79.3 |    85.2 |    82.8 |
```

**Target:** 80%+ coverage of critical paths

## Troubleshooting

### "Cannot find module '@/lib/prisma'"

**Solution:** Verify `tsconfig.json` has path alias configured:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "vi is not defined"

**Solution:** Ensure `vitest.setup.ts` imports `vi` from `vitest`:
```typescript
import { vi } from 'vitest';
```

### Tests timeout

**Solution:** Increase timeout in `vitest.config.ts`:
```typescript
test: {
  testTimeout: 10000, // 10 seconds
}
```

### Mock not working

**Solution:** Mock before importing:
```typescript
vi.mock('@/lib/prisma'); // BEFORE: import { prisma } from '@/lib/prisma'
```

## Best Practices

1. **Run tests before commit:**
   ```bash
   npm run test:run
   ```

2. **Keep tests focused:**
   - Each test should verify one behavior
   - Use descriptive names: `should prevent duplicate player picks`

3. **Mock external services:**
   - Mock Pusher, statsapi, Prisma, NextAuth
   - Don't hit real APIs in tests

4. **Test error cases:**
   - Test both success and failure paths
   - Test edge cases (empty, null, duplicates)

5. **Use beforeEach/afterEach:**
   - Set up clean state before each test
   - Clean up after (mocks, timers, etc.)

6. **Keep tests fast:**
   - Target: <2 seconds for all 100 tests
   - Use mocks instead of real I/O

## Integration with CI/CD

Add to GitHub Actions (`.github/workflows/test.yml`):

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Next Steps

1. Run the tests: `npm test`
2. Fix any failures
3. Achieve 80%+ coverage
4. Add integration tests for real database/APIs
5. Run tests before every commit
6. Monitor coverage in CI/CD

## Additional Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library Documentation](https://testing-library.com)
- [Jest Mock Extended](https://github.com/jefflau/jest-mock-extended)

## Questions?

Refer to the main test documentation:
- Business logic: `Handoffs/05-test.md`
- Architecture decisions: `Handoffs/02-architecture.md`
- Requirements: `Handoffs/01-requirements.md`
