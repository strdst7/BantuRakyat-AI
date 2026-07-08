# Testing Patterns

**Analysis Date:** Wed Jul 08 2026

## Test Framework

**Runner:** ❌ **Not installed**

No test runner is configured. Neither Jest nor Vitest is present in `package.json`:
```json
{
  "dependencies": { /* no test framework */ },
  "devDependencies": { /* no test framework */ }
}
```

**Assertion Library:** ❌ **Not installed**

**Run Commands:** N/A — no test script exists in `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit"
  // No "test" script
}
```

## Test File Organization

**Location:** ❌ **No test files exist**

- No `*.test.*` files anywhere in the repository
- No `*.spec.*` files anywhere in the repository
- No `__tests__/` directories exist
- Glob searches for test patterns return zero results

**Naming:** Not applicable — no tests to analyze a naming convention from.

## Current Test Coverage Assessment

**Overall coverage: 0% — no tests exist for any module.**

The breakdown by area:

| Area | Files | Unit Tests | Integration Tests | E2E Tests |
|------|-------|:----------:|:-----------------:|:---------:|
| **Business Logic (aid-engine.ts)** | `evaluateEligibility()`, `getStateEconomicProfile()` | ❌ | ❌ | ❌ |
| **API Data Fetching (pasarapi.ts)** | `fetchPasarApiSnapshot()` | ❌ | ❌ | ❌ |
| **Database (db/index.ts)** | `getDb()` | ❌ | ❌ | ❌ |
| **DB Schema (schema.ts)** | Table definitions, types | ❌ | ❌ | ❌ |
| **Seed Data (seed-data.ts)** | `INITIAL_AID_PROGRAMS` | ❌ | ❌ | ❌ |
| **API Routes** | 6 route handlers | ❌ | ❌ | ❌ |
| **Admin Page (admin/page.tsx)** | CRUD admin UI | ❌ | ❌ | ❌ |
| **Main Client (bantuan-client.tsx)** | Eligibility scanner UI | ❌ | ❌ | ❌ |
| **API Route: health** | Health check endpoint | ❌ | ❌ | ❌ |
| **API Route: programs** | CRUD for aid programs | ❌ | ❌ | ❌ |
| **API Route: stats** | Admin statistics aggregation | ❌ | ❌ | ❌ |
| **API Route: scan** | Eligibility scan processing | ❌ | ❌ | ❌ |
| **API Route: snapshot** | PasarAPI snapshot proxy | ❌ | ❌ | ❌ |
| **API Route: alerts** | Alert subscription creation | ❌ | ❌ | ❌ |

## Testing Gaps and Risks

### Critical Gaps

**1. No business logic tests for `aid-engine.ts` (highest risk)**
- The `evaluateEligibility()` function is the core value proposition — it determines subsidy eligibility, computes annual estimates, generates explanations
- It has complex branching logic: income thresholds, state matching, category matching (B40/M40 auto-injection), household-size-based amount calculations
- It produces 4 output arrays (qualified, missing, calendar events, documents) with interdependencies
- **Risk:** Any refactoring or rule change could silently break eligibility decisions

**2. No API integration tests**
- All 6 route handlers use database calls, external API calls, and fallback logic
- The scan route has a complex fallback pattern (DB → stateless evaluation)
- The alert route has SHA-256 hashing logic for contact privacy
- **Risk:** Database connection changes, external API changes, or deployment environment issues could break without detection

**3. No external API mock tests for `pasarapi.ts`**
- `fetchPasarApiSnapshot()` calls `data.gov.my` with timeout and abort controller
- Has complex fallback parsing logic (map, filter, sort conditions)
- 5-minute in-memory cache with TTL
- **Risk:** API format changes or connectivity issues could break the data pipeline

### Medium Gaps

**4. No component tests**
- `bantuan-client.tsx` (962 lines, single file) is the entire main UI — no tests verify rendering, state transitions, or user interactions
- `admin/page.tsx` (351 lines) also untested
- State management (form state, scan results, theme toggling) is not validated

**5. No database migration/seed tests**
- Schema creation SQL in `getDb()` has duplicate logic to `schema.ts` — no test ensuring they stay in sync
- Seed data (`INITIAL_AID_PROGRAMS`) has 10 programs with complex fields — no validation that they pass schema constraints

**6. No type-safety tests**
- Heavy `any` usage throughout would benefit from type-level tests
- No compile-time checks for data shape mismatches between API responses and TypeScript types

### Low-Urgency Gaps

**7. No E2E tests**
- Reasonable for this stage — no CI/CD pipeline, single developer project

**8. No accessibility tests**
- While manual a11y features are present (skip links, aria labels, high contrast), no automated a11y testing

## Recommended Testing Strategy

### Phase 1 — Unit Test Foundation (highest priority)

**Recommended framework:** Vitest (fast, TypeScript-native, works with Next.js)

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

**Target files by order of importance:**

**1. `src/lib/aid-engine.ts` — Core business logic**
- Test `evaluateEligibility()` with various inputs:
  ```typescript
  describe('evaluateEligibility', () => {
    it('qualifies B40 household under income threshold', () => { ... });
    it('excludes program when income exceeds maxIncome', () => { ... });
    it('auto-injects B40 category when income ≤ 4850', () => { ... });
    it('filters by state when program states !== ALL', () => { ... });
    it('calculates estimated annual value based on household size', () => { ... });
    it('generates correct BM/EN explanations for each program code', () => { ... });
    it('identifies missing (unclaimed) programs', () => { ... });
    it('generates calendar events sorted by month', () => { ... });
    it('creates document checklist grouped by category', () => { ... });
    it('sets relativeStanding based on state median comparison', () => { ... });
  });
  ```

**2. `src/lib/pasarapi.ts` — Data fetching & parsing**
- Mock `fetch` to test API response parsing
- Test timeout/error fallback to static data
- Test `getStateEconomicProfile()` state matching
  ```typescript
  describe('fetchPasarApiSnapshot', () => {
    it('returns parsed data when API responds', async () => { ... });
    it('returns fallback data when API fails', async () => { ... });
    it('returns cached snapshot within TTL', async () => { ... });
  });
  ```

**3. `src/db/index.ts` — Database initialization**
- Test that `getDb()` returns a singleton instance
- Test that tables are created
- Test that seed data is inserted on first call

### Phase 2 — API Route Tests

**Approach:** Use Vitest with `next-test-utils` or `fetch` mocking to test route handlers in isolation.

```typescript
describe('POST /api/scan', () => {
  it('returns eligibility report for valid input', async () => { ... });
  it('falls back to stateless evaluation when DB unavailable', async () => { ... });
  it('returns 500 for invalid/malformed body', async () => { ... });
});
```

Mock dependencies:
- `getDb()` return in-memory PGlite for DB-dependent routes
- `fetchPasarApiSnapshot()` return known snapshot data
- Test each route's error handling (malformed JSON, missing fields, DB failures)

### Phase 3 — Component Tests

**Recommended approach:** Vitest + React Testing Library

```typescript
describe('BantuanClient', () => {
  it('renders scanner form with initial snapshot data', () => { ... });
  it('updates monthly income display on slider change', () => { ... });
  it('toggles category selection on click', () => { ... });
  it('shows results after scan completes', () => { ... });
  it('switches visual theme on button press', () => { ... });
  it('falls back gracefully when scan API fails', () => { ... });
});
```

### Test Configuration

**Recommended `vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**'],
      exclude: ['src/**/*.test.*', 'src/db/seed-data.ts'],
    },
    // For component tests, use 'jsdom' environment
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

**Recommended `package.json` additions:**
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui"
}
```

## CI/CD Considerations

**Current state:** No CI pipeline exists (no `.github/`, no CI config files).
The `.gitignore` has `/coverage` listed (suggesting intent for coverage generation).

**Recommended setup:**

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test -- --coverage
```

**Pre-commit checks (recommended):**
```bash
npm run typecheck && npm run lint && npm run test -- --changed
```

## Thresholds & Quality Gates

**Recommended minimum coverage targets:**
| Area | Target |
|------|--------|
| `src/lib/aid-engine.ts` | 95%+ (core business logic) |
| `src/lib/pasarapi.ts` | 85%+ (data fetching + parsing) |
| `src/db/index.ts` | 75%+ (init, seeding) |
| API Routes | 70%+ (request handling, error states) |
| Components | 60%+ (rendering, user interactions) |
| **Overall project** | **80%+** |

## Testing Principles for This Project

1. **Business logic first** — `aid-engine.ts` is the most critical, most complex, and most likely to change
2. **Test fallback paths** — the app deliberately handles offline/DB-unavailable scenarios; these paths must be verified
3. **Data shape contracts** — the PasarAPI response shapes from `data.gov.my` are not guaranteed; tests should validate parsing logic
4. **No snapshot-heavy tests** — the UI is highly visual (neon theme, canvas animations); snapshots would be brittle. Prefer interaction-based tests
5. **Privacy-aware test data** — use synthetic data, never real user contacts (even for alert subscription tests)

---

*Testing analysis: Wed Jul 08 2026*
