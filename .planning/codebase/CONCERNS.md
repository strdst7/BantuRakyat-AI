# Codebase Concerns

**Analysis Date:** Wed Jul 08 2026

## Security Concerns

### HIGH: Zero Authentication on All Admin Endpoints

**Issue:** The admin API routes (`src/app/api/admin/programs/route.ts`, `src/app/api/admin/stats/route.ts`) and the admin page (`src/app/admin/page.tsx`) have **no authentication whatsoever**. Anyone who discovers `/admin` can read, create, update, and pause all aid programs. There is no session, no API key, no middleware guard.

**Files:**
- `src/app/api/admin/programs/route.ts` (lines 16-68: POST and PATCH with no auth)
- `src/app/api/admin/stats/route.ts` (lines 6-32: GET with no auth)
- `src/app/admin/page.tsx` (lines 77-129: triggers PATCH/POST directly from browser)

**Impact:** Any visitor can modify or delete aid program data, pause active programs, or inject fraudulent program listings. This is the highest-risk finding.

**Fix approach:** Add Next.js middleware (`src/middleware.ts`) that checks for an admin session or API key before allowing access to `/api/admin/*`. Use a simple password env var or integrate with an external auth provider.

---

### HIGH: Database Credentials Committed to Git

**Issue:** `drizzle.config.json` contains a hardcoded PostgreSQL connection string with plaintext credentials:

```json
"dbCredentials": {
  "url": "postgresql://postgres:postgres@127.0.0.1:5432/app_db"
}
```

This file IS committed to git (not in `.gitignore`).

**Files:**
- `drizzle.config.json` (line 5)

**Impact:** If this repo is pushed to a public or shared remote, the world has the database credentials. The password `postgres` is also the default PostgreSQL superuser password.

**Fix approach:** Use environment variable interpolation in `drizzle.config.json` (Drizzle supports `process.env.DATABASE_URL`). Add the file to `.gitignore` or use `drizzle.config.ts` with env vars.

---

### HIGH: No Input Validation on Admin API (SQL Injection Surface)

**Issue:** The admin POST and PATCH handlers in `src/app/api/admin/programs/route.ts` accept arbitrary fields from `req.json()` and pass them directly to the Drizzle ORM insert/update. While Drizzle ORM provides parameterization, the fields `code`, `name`, `descriptionBm`, `descriptionEn`, `targetCategories`, `states` are all string fields with no length limits or sanitization. An attacker could inject extremely long strings or malformed data.

**Files:**
- `src/app/api/admin/programs/route.ts` (lines 16-68)
  - Line 22: `code: String(body.code || 'CUSTOM_' + Math.random()...` — no pattern validation
  - Lines 23-39: All fields accept raw untrusted input
  - Line 50: `const { id, ...updates } = body` — spreads all body keys into the update, allowing field injection

**Impact:** SQL injection is mitigated by Drizzle, but data integrity attacks are trivial (injecting malicious URLs, oversized text, incorrect amounts).

**Fix approach:** Implement Zod schemas for all input validation. Validate that `code` follows a known pattern (e.g., `[A-Z_0-9]+`), `applyUrl` is a valid URL, numeric fields are positive integers within reasonable ranges.

---

### MEDIUM: Math.random() Used for Scan ID Generation

**Issue:** Scan IDs are generated using `Math.random()` which is not cryptographically secure:

```typescript
const scanId = 'BR-' + Math.random().toString(36).substring(2, 9).toUpperCase();
```

**Files:**
- `src/lib/aid-engine.ts` (line 270)

**Impact:** Predictable scan IDs. Low impact for current use case, but if scan IDs are ever used as session tokens or identifiers in URLs, this is a collision and predictability risk.

**Fix approach:** Use `crypto.randomUUID()` from Node.js's Web Crypto API.

---

### MEDIUM: SHA-256 Hashing Without Salt for Contact Privacy

**Issue:** Alert subscriptions hash contacts with plain SHA-256 without a salt:

```typescript
const contactHash = crypto.createHash('sha256').update(contact.toLowerCase()).digest('hex');
```

**Files:**
- `src/app/api/alerts/route.ts` (line 21)

**Impact:** Rainbow table attacks can reverse common phone numbers and email addresses. While the masked contact is used for display, the hash is stored and could be compared against precomputed tables.

**Fix approach:** Add a random salt per record or use a keyed hash (HMAC) with a server-side secret. Store the salt alongside the hash.

---

### MEDIUM: No Rate Limiting on Any Endpoint

**Issue:** None of the API routes implement rate limiting. The scan endpoint (`/api/scan/`) and alert subscription endpoint (`/api/alerts/`) are particularly vulnerable to abuse.

**Files:**
- `src/app/api/scan/route.ts`
- `src/app/api/alerts/route.ts`
- `src/app/api/pasarapi/snapshot/route.ts`
- `src/app/api/admin/programs/route.ts`

**Impact:** An attacker can trivially DoS the PGlite database by flooding scan requests, or spam the alert subscriptions table with millions of entries.

**Fix approach:** Implement a rate limiter (e.g., `@upstash/ratelimit`, `express-rate-limit` equivalent for Next.js, or a simple in-memory map with TTL).

---

### MEDIUM: No Contact Verification for Alert Subscriptions

**Issue:** The alert subscription endpoint (`/api/alerts/`) accepts any phone number or email without verification. There's no confirmation step, no email/SMS verification code, and no proof of ownership.

**Files:**
- `src/app/api/alerts/route.ts` (lines 6-57)

**Impact:** Anyone can subscribe anyone else's contact info, causing nuisance or harassment. Invalid contacts pollute the database.

**Fix approach:** Send a confirmation code via email/SMS before storing the subscription. Mark as unconfirmed until verified.

---

### LOW: Sensitive Data Exposure in Error Messages

**Issue:** All API routes return `error.message` directly to the client in error responses:

```typescript
return NextResponse.json({ error: 'Failed to fetch aid programs', details: error.message }, { status: 500 });
```

**Files:**
- `src/app/api/admin/programs/route.ts` (lines 12, 44, 67)
- `src/app/api/admin/stats/route.ts` (line 31)
- `src/app/api/scan/route.ts` (line 49)
- `src/app/api/pasarapi/snapshot/route.ts` (line 9)
- `src/app/api/alerts/route.ts` (line 56)

**Impact:** Internal implementation details (file paths, SQL errors, stack traces) may leak through error messages to the client.

**Fix approach:** Log the full error server-side, return a generic error message to the client.

---

## Data Integrity Concerns

### HIGH: PGlite Data Is Ephemeral in Serverless Mode

**Issue:** The database initialization logic in `src/db/index.ts` detects serverless environments and creates a **pure in-memory** PGlite instance:

```typescript
if (isServerless) {
  pglite = new PGlite(); // ALL DATA LOST on cold start
}
```

**Files:**
- `src/db/index.ts` (lines 19-28)

**Impact:** In production serverless deployments (Vercel, Netlify, AWS Lambda), every cold start recreates the database from scratch. Seed data is re-inserted (duplicate-safe due to `onConflictDoNothing`), but **all user scans and alert subscriptions are permanently lost** between cold starts. This makes the entire eligibility scan recording and alert subscription features non-functional in production.

**Fix approach:** Use a persistent database (e.g., Neon Serverless Postgres, Supabase, or AWS RDS) in production. Configure the DB connection via environment variables. Keep PGlite only for local development.

---

### HIGH: No Database Migration System

**Issue:** The schema is defined in two places — Drizzle schema file (`src/db/schema.ts`) and raw SQL DDL in `src/db/index.ts` (lines 53-107) — with no migration history. The `CREATE TABLE IF NOT EXISTS` approach means schema changes require manual SQL patches and are not versioned.

**Files:**
- `src/db/schema.ts` (all)
- `src/db/index.ts` (lines 53-107)

**Impact:** Schema drift between environments is inevitable. There's no way to roll back or version database changes. Adding a new column requires editing both files and manually handling existing databases.

**Fix approach:** Use Drizzle Kit migrations (`drizzle-kit migrate`). Generate initial migration, add migration scripts to `package.json`, and run migrations on deploy.

---

### MEDIUM: No Foreign Key Constraints or Relationships

**Issue:** All three tables (`aid_programs`, `eligibility_scans`, `alert_subscriptions`) are standalone with no foreign key relationships. The `eligibility_scans` table has a `scan_id` field that logically references a scan, but there's no constraint enforcing this.

**Files:**
- `src/db/schema.ts` (all tables)

**Impact:** Orphaned records cannot be detected. Related data cleanup is manual. The application cannot enforce referential integrity at the database level.

**Fix approach:** Add foreign key constraints where relationships exist. Consider a `scans_aid_programs` junction table if scans need to record which programs they matched against.

---

### MEDIUM: Structured Data Stored as Delimited Strings

**Issue:** Several fields use pipe-separated or comma-separated string values instead of JSON or normalized relational data:

- `requiredDocs` — pipe-separated string
- `targetCategories` — comma-separated
- `categories` (in eligibility_scans) — comma-separated
- `states` — `'ALL'` or comma-separated

**Files:**
- `src/db/schema.ts` (lines 14, 15, 20, 34)

**Impact:** Querying for programs that require a specific document or target a specific category requires string matching (`LIKE '%OKU%'`), which is slow and error-prone. Normalization would enable proper filtering and indexing.

**Fix approach:** Use PostgreSQL arrays (`text[]`) or JSONB for multi-value fields. Or normalize into junction tables.

---

### MEDIUM: No Unique Constraint on Eligibility Scan ID

**Issue:** The `scan_id` column in `eligibility_scans` is `TEXT NOT NULL` but has no unique constraint, even though it's named as a unique identifier.

**Files:**
- `src/db/schema.ts` (line 29)
- `src/db/index.ts` (line 82: `scan_id TEXT NOT NULL`)

**Impact:** Duplicate scan records can be inserted with the same `scan_id`. The `Math.random()`-based generation also makes collisions possible (though unlikely in practice).

**Fix approach:** Add `UNIQUE` constraint on `scan_id`. Use `crypto.randomUUID()` instead of `Math.random()`.

---

### LOW: No CHECK Constraints on Column Values

**Issue:** Numeric fields like `max_income`, `minAge`, `maxAge`, `amountMin`, `amountMax` have no CHECK constraints to ensure reasonable values. For example, nothing prevents `minAge: 200` or `amountMin: -500`.

**Files:**
- `src/db/schema.ts` (all column definitions)

**Impact:** Invalid data can be inserted via the admin API, corrupting the program database.

**Fix approach:** Add CHECK constraints in the schema (e.g., `CHECK (max_income > 0)`, `CHECK (minAge >= 0 AND minAge <= 150)`). Also validate in the API layer.

---

## Error Handling Gaps

### HIGH: Eligibility Scan Silently Falls Back to Stale Seed Data

**Issue:** In `src/app/api/scan/route.ts`, if the database query fails, the code silently falls back to hardcoded seed data (`INITIAL_AID_PROGRAMS`) with no indication to the user:

```typescript
try {
  const db = await getDb();
  programs = await db.select().from(aidPrograms);
  // ... use programs ...
} catch (dbErr) {
  console.warn('Database unavailable, evaluating stateless:', dbErr);
  const report = evaluateEligibility(programs as any, input, snapshot);
  return NextResponse.json(report);
}
```

Note: `programs` was set to `INITIAL_AID_PROGRAMS` at line 21, before the try block.

**Files:**
- `src/app/api/scan/route.ts` (lines 20-46)

**Impact:** Users receive eligibility results based on hardcoded data that may be outdated or incomplete. Admin changes to programs (adding, modifying, pausing) are silently ignored. The user has no way to know the results are from stale data.

**Fix approach:** Return a 503 or a response that clearly indicates fallback mode. Never silently degrade to stale data for a user-facing feature.

---

### MEDIUM: Best-Effort Scan Logging Silently Fails

**Issue:** The scan recording uses `.catch()` to silently swallow database errors:

```typescript
await db.insert(eligibilityScans).values({...})
  .catch((e: any) => console.warn('Best-effort scan metrics logging skipped:', e));
```

**Files:**
- `src/app/api/scan/route.ts` (line 39)

**Impact:** Scan metrics are silently lost with no feedback to the user or operator. The admin stats dashboard will show incomplete data without warning.

**Fix approach:** Log errors to a monitoring system. Consider making scan recording optional/non-blocking (fire-and-forget) but log failures to a structured logger, not just `console.warn`.

---

### MEDIUM: Unhandled Promise Rejections in useEffect Hooks

**Issue:** Several `useEffect` hooks use async operations without proper error handling. For example, `handleScan` is called on mount as a side effect:

```typescript
useEffect(() => {
  handleScan({ preventDefault: () => {} } as any);
}, []);
```

**Files:**
- `src/app/bantuan-client.tsx` (lines 213-215, 56-58, 75-85)

**Impact:** If the initial scan fails, the user sees no error state. The form may appear stuck or unresponsive.

**Fix approach:** Add loading/error states for the initial mount scan. Use `try/catch` in async effects.

---

## Performance Issues

### HIGH: Admin Stats Loads All Rows into Memory

**Issue:** The admin stats endpoint (`src/app/api/admin/stats/route.ts`) loads **every row** from all three tables into memory, then processes them in JavaScript:

```typescript
const programs = await db.select().from(aidPrograms);     // ALL rows
const scans = await db.select().from(eligibilityScans);    // ALL rows
const alerts = await db.select().from(alertSubscriptions);  // ALL rows
```

**Files:**
- `src/app/api/admin/stats/route.ts` (lines 9-18)

**Impact:** As the database grows (thousands or millions of scans), this endpoint becomes exponentially slower and will eventually crash due to memory limits. The `totalEstimatedDisbursed` aggregation and `avgHouseholdIncome` calculation should be done in SQL.

**Fix approach:** Use SQL aggregate functions (`SUM`, `AVG`, `COUNT`) with Drizzle's `sql` template tag instead of loading all rows. Example: `db.select({ count: sql<number>`COUNT(*)` }).from(eligibilityScans)`.

---

### MEDIUM: No Pagination on List Endpoints

**Issue:** The admin programs list (`GET /api/admin/programs`) returns all programs without pagination. The admin page renders them all in a single table.

**Files:**
- `src/app/api/admin/programs/route.ts` (lines 6-13)
- `src/app/admin/page.tsx` (lines 242-275: renders all programs in a table)

**Impact:** As the program database grows (hundreds or thousands of programs), the admin page becomes slow to render and the API response grows unbounded.

**Fix approach:** Add `limit` and `offset` query parameters to the GET endpoint. Add client-side pagination or infinite scroll.

---

### MEDIUM: Canvas Animation Runs Continuously

**Issue:** A `requestAnimationFrame`-based canvas animation runs continuously, even when the canvas is not in the viewport or visible to the user:

```typescript
const render = () => {
  // ... canvas drawing ...
  angle += 0.025;
  animId = requestAnimationFrame(render);
};
render();
```

**Files:**
- `src/app/bantuan-client.tsx` (lines 94-149)

**Impact:** Continuous 60fps rendering consumes battery on mobile devices and CPU resources unnecessarily. The animation has no functional purpose.

**Fix approach:** Use `IntersectionObserver` to pause the animation when the canvas is not visible. Consider replacing with CSS animations for the decorative ring.

---

### LOW: Recharts Rendering Off-Screen Content

**Issue:** The Recharts bar chart is rendered even when the "Intelligence" tab is not active. React keeps all tab content in the DOM, just hidden via conditional rendering.

**Files:**
- `src/app/bantuan-client.tsx` (lines 926-936)

**Impact:** Unnecessary rendering of SVG content that the user cannot see. This is a minor performance hit.

**Fix approach:** Lazy-render tab content — only render the chart component when `activeTab === 'opendosm'`.

---

## Code Quality Issues

### HIGH: Massive Single Client Component (962 lines)

**Issue:** `src/app/bantuan-client.tsx` is 962 lines of a single React component containing form state, canvas animation, data fetching, chart rendering, theme switching, and a multi-tab UI. This violates the single responsibility principle and is extremely difficult to maintain.

**Files:**
- `src/app/bantuan-client.tsx` (962 lines)

**Impact:** Any change to this file risks breaking unrelated features. Testing is impossible. Code review is impractical. Merge conflicts are guaranteed.

**Fix approach:** Split into smaller components:
- `ScannerForm.tsx` — the eligibility form
- `ResultsPanel.tsx` — scan results display
- `AutopilotPanel.tsx` — the autopilot mission board
- `TelemetryWidget.tsx` — canvas animation
- `DashboardTabs.tsx` — tab navigation
- `AdminDashboard.tsx` — already separate, good

---

### HIGH: TypeScript `any` Casts Throughout the Codebase

**Issue:** Multiple files use `as any` type assertions, bypassing TypeScript's type safety:

- `src/db/index.ts` — `let dbInstance: any = null;` (line 10)
- `src/app/api/scan/route.ts` — `INITIAL_AID_PROGRAMS as any` (line 21), `programs as any` (lines 26, 44)
- `src/app/bantuan-client.tsx` — `INITIAL_AID_PROGRAMS as any` (line 206)
- `src/app/api/admin/stats/route.ts` — `p: any` (lines 13, 17, 18)
- `src/db/index.ts` — `countRes.rows[0] as any` (line 112)

**Files:**
- `src/db/index.ts` (lines 10, 111, 112)
- `src/app/api/scan/route.ts` (lines 21, 26, 44)
- `src/app/bantuan-client.tsx` (line 206)
- `src/app/api/admin/stats/route.ts` (lines 13, 17, 18)

**Impact:** TypeScript cannot catch type errors in these code paths. If the API response format changes or the schema evolves, these casts will silently produce incorrect behavior at runtime.

**Fix approach:** Use proper Drizzle query types. `db.select().from(aidPrograms)` returns `AidProgram[]` natively — no cast needed. Use `sql<number>` for raw SQL queries.

---

### MEDIUM: Duplicated Theme Logic Across Components

**Issue:** The visual theme management logic (localStorage, media query detection, `dataset.theme` setting) is duplicated verbatim in both `bantuan-client.tsx` and `admin/page.tsx`.

**Files:**
- `src/app/bantuan-client.tsx` (lines 75-91)
- `src/app/admin/page.tsx` (lines 60-75)

**Impact:** If the theme logic needs to change (e.g., add a new theme), both files must be updated. The duplication is ~20 lines of nearly identical code.

**Fix approach:** Extract into a custom hook `useVisualTheme()` in `src/lib/use-visual-theme.ts`.

---

### MEDIUM: Hardcoded Calendar Events Instead of Data-Driven

**Issue:** Calendar events in `aid-engine.ts` are hardcoded strings with specific 2026 dates and program codes:

```typescript
const calendarEvents: CalendarEvent[] = [
  { month: 'Januari 2026', ..., programCode: 'SARA_2026', ... },
  { month: 'Februari 2026', ..., programCode: 'STR_2026', ... },
  // ...
];
```

**Files:**
- `src/lib/aid-engine.ts` (lines 159-240)

**Impact:** Calendar events are tied to 2026 and cannot be updated programmatically. Updating payout schedules requires modifying source code. These should be derived from the `payoutSchedule` field in each program.

**Fix approach:** Parse `payoutSchedule` field data to generate calendar events dynamically. Store scheduling info in a structured format in the database (e.g., JSON array of {month, amount, type}).

---

### MEDIUM: Magic Numbers Scattered Without Constants

**Issue:** Numeric thresholds and limits are hardcoded throughout the codebase:

- `CACHE_TTL = 300 * 1000` (pasarapi.ts, line 89)
- Income thresholds: `4850` (B40), `10970` (M40) (aid-engine.ts, lines 83-84)
- `min="500" max="15000" step="100"` (bantuan-client.tsx, line 493)
- `timeoutId = setTimeout(() => controller.abort(), 4000)` (pasarapi.ts, line 99)
- `6338` (national median income) repeated in multiple places

**Files:**
- `src/lib/aid-engine.ts` (lines 83-84)
- `src/lib/pasarapi.ts` (lines 89, 99, 167, 189)
- `src/app/bantuan-client.tsx` (line 493)

**Impact:** When income thresholds change (they are updated annually by the government), developers must find and update every occurrence. Missed updates = incorrect eligibility calculations.

**Fix approach:** Create a `src/lib/constants.ts` file with named exports:
```typescript
export const B40_THRESHOLD = 4850;
export const M40_THRESHOLD = 10970;
export const NATIONAL_MEDIAN_INCOME = 6338;
export const PASARAPI_CACHE_TTL = 300_000;
export const PASARAPI_TIMEOUT = 4000;
```

---

### MEDIUM: CSS `!important` Abuse

**Issue:** The theme override CSS uses `!important` on virtually every rule (over 80 `!important` declarations in `globals.css`), making the stylesheet extremely fragile.

**Files:**
- `src/app/globals.css` (lines 106-280)

**Impact:** Any future CSS change that doesn't use `!important` will be silently overridden. Debugging style issues becomes very difficult. Tailwind's utility classes may not apply correctly.

**Fix approach:** Use CSS custom properties (variables) for theming instead of `!important` overrides. Define color schemes as data-attribute selectors with appropriate variable values.

---

## Missing Critical Features

### HIGH: No Automated Tests

**Issue:** The project has zero test files, zero test configuration, and zero test scripts in `package.json`. There are no tests of any kind — unit, integration, or E2E.

**Files:**
- `package.json` (scripts section: no test command)
- Entire codebase (no `.test.ts`, `.spec.ts`, or `__tests__/` directories)

**Impact:** There is no safety net for refactoring or adding features. The eligibility engine (`aid-engine.ts`), which contains complex business logic, is completely untested. Regressions are guaranteed with every change.

**Fix approach:** Add Vitest (already compatible with Vite/Next.js). Write unit tests for:
- `evaluateEligibility()` — test various income/state/category combinations
- `getStateEconomicProfile()` — test state matching logic
- All API routes — test with mocked DB

---

### HIGH: No Structured Logging

**Issue:** The entire application uses `console.log`, `console.warn`, and `console.error` for all logging. There is no structured logging, no log levels, no correlation IDs, and no log transport.

**Files:**
- `src/db/index.ts` (lines 39, 115)
- `src/app/api/scan/route.ts` (lines 43, 48)
- `src/app/api/alerts/route.ts` (line 55)
- `src/app/bantuan-client.tsx` (lines 180, 203, 267, 296)

**Impact:** In production, there is no way to search logs, filter by severity, correlate requests, or send logs to an external service. Debugging production issues requires code changes.

**Fix approach:** Integrate a structured logger (e.g., Pino, Winston, or `@opentelemetry/api`). Use log levels consistently. Include request IDs in API route logs.

---

### MEDIUM: No Audit Log for Admin Actions

**Issue:** Admin operations (creating, updating, pausing programs) leave no trace. There's no record of who made what change and when.

**Files:**
- `src/app/api/admin/programs/route.ts` (POST and PATCH handlers)

**Impact:** If a program is accidentally deactivated or maliciously modified, there's no way to determine when it happened or revert the change.

**Fix approach:** Create an `admin_audit_log` table. Log all mutations with timestamp, action type, user ID (after adding auth), and before/after state.

---

### MEDIUM: No Request Validation Library

**Issue:** All API routes manually parse and cast request body fields with `String(body.x)`, `Number(body.y)`, `Boolean(body.z)` patterns. There is no schema validation library or consistent validation approach.

**Files:**
- `src/app/api/admin/programs/route.ts` (lines 21-39)
- `src/app/api/scan/route.ts` (lines 11-17)
- `src/app/api/alerts/route.ts` (lines 9-14)

**Impact:** Missing fields silently default to arbitrary values. Incorrect types produce `NaN` or `'undefined'` strings. Malformed requests are not caught early.

**Fix approach:** Use Zod schemas to validate all API inputs. Example:
```typescript
const scanSchema = z.object({
  householdSize: z.number().int().min(1).max(50),
  monthlyIncome: z.number().int().min(0).max(1_000_000),
  state: z.string().min(2),
  // ...
});
```

---

## Scalability Concerns

### HIGH: Single Global Database Instance (No Connection Pooling)

**Issue:** `src/db/index.ts` maintains a single global `dbInstance` variable. In a serverless environment, multiple concurrent requests will all use the same PGlite instance (which is in-memory and cannot be shared across execution contexts anyway).

**Files:**
- `src/db/index.ts` (lines 10-16)

**Impact:** In serverless: every cold start loses all data. In non-serverless: the single PGlite instance is a bottleneck and cannot handle concurrent writes safely (no connection pooling, no transaction isolation guarantees).

**Fix approach:** Use a proper PostgreSQL connection pool (e.g., `pg` Pool with `drizzle-orm/pg-core`). Configure pool size based on deployment environment. Set `DATABASE_URL` via environment variable.

---

### HIGH: Database Design Prevents Horizontal Scaling

**Issue:** PGlite runs in-process as a WASM-based SQLite-like database embedded in the Node.js process. It cannot be deployed as a separate service, cannot be replicated, and does not support connection pooling.

**Files:**
- `src/db/index.ts` (uses `@electric-sql/pglite`)

**Impact:** The application cannot scale beyond a single process. Any production deployment will lose data on restart. Multi-instance deployments will have inconsistent state.

**Fix approach:** Replace PGlite with a networked PostgreSQL (e.g., Neon, Supabase, RDS) for production. Keep PGlite only for local development and testing.

---

### MEDIUM: In-Memory Cache Without Invalidation Strategy

**Issue:** The PasarAPI snapshot cache (`cachedSnapshot` variable in module scope) has no way to be invalidated except by TTL expiry. The admin "Sync Data" button fetches fresh data but the API route still returns cached data.

**Files:**
- `src/lib/pasarapi.ts` (lines 87-96)

**Impact:** Users may see stale economic data for up to 5 minutes. The cache is per-process and not shared across instances.

**Fix approach:** Use a distributed cache (e.g., Upstash Redis, Vercel KV) if deploying at scale. Or document the 5-minute staleness as acceptable.

---

## Dependency Risks

### HIGH: PGlite Is Experimental (v0.5.x)

**Issue:** `@electric-sql/pglite` is at version `^0.5.4` — still in early development. The project's entire data layer depends on it. PGlite is fundamentally a WASM port of PostgreSQL that runs in-process.

**Package:**
- `package.json`: `"@electric-sql/pglite": "^0.5.4"`

**Impact:** PGlite may have undiscovered bugs, performance limitations, or breaking API changes. The in-process architecture makes it unsuitable for production. PostgreSQL features may be missing or behave differently.

**Fix approach:** Abstract the database layer behind a repository interface. Use PGlite for development and testing, but use a real PostgreSQL (Neon, Supabase, RDS) in production.

---

### MEDIUM: Bleeding-Edge Next.js and React Versions

**Issue:** The project uses `next@16.2.10` and `react@19.2.6`. These are the latest/unstable versions (Next.js 16 is very new as of this analysis). There may be undiscovered bugs or breaking changes in the ecosystem.

**Package:**
- `package.json`: `"next": "^16.2.10"`, `"react": "19.2.6"`

**Impact:** Unstable APIs, potential incompatibilities with third-party packages, limited community resources for troubleshooting.

**Fix approach:** Pin exact versions. Test thoroughly. Consider using Next.js 14 or 15 LTS for production stability.

---

### MEDIUM: `dotenv` at Version 17.3.1 (Old)

**Issue:** `dotenv` is listed at version `17.3.1`. The current `dotenv` version is 16.4.x (note: this may be an npm versioning artifact, but the major version 17 is very old — current is 16.x).

**Package:**
- `package.json`: `"dotenv": "17.3.1"`

**Impact:** Note: `dotenv` is not even used in the codebase — no `process.env` variables are loaded from `.env` anywhere. The dependency is dead weight. Next.js already loads `.env` files natively.

**Fix approach:** Remove `dotenv` from dependencies entirely. Next.js has built-in `.env` support.

---

### LOW: Unused `pg` Dependency

**Issue:** The `pg` (node-postgres) package is listed as a dependency at version `8.20.0`, but the codebase uses `@electric-sql/pglite` instead of `pg`. The `pg` package is effectively unused.

**Package:**
- `package.json`: `"pg": "8.20.0"`, `"@types/pg": "8.18.0"`

**Impact:** Unnecessary bundle size and dependency surface area.

**Fix approach:** Remove `pg` and `@types/pg` from dependencies. Only keep them if there's a plan to migrate to real PostgreSQL.

---

## Fragile Areas

### HIGH: Eligibility Engine in `aid-engine.ts`

**Issue:** The `evaluateEligibility()` function (293 lines) is the core business logic of the application. It has:
- Complex hardcoded income threshold logic (B40: 4850, M40: 10970)
- Manual state/category matching with string comparisons
- Hardcoded explanatory text per program code prefix
- Magic number calculations for household size multipliers
- No tests

**Files:**
- `src/lib/aid-engine.ts` (all 293 lines)

**Why fragile:** Any change to eligibility criteria requires modifying multiple sections of this function. The string-based matching (`prog.states.includes(input.state.toUpperCase())`) is error-prone for partial matches. The hardcoded explanations will become outdated as program names change.

**Safe modification:** Add comprehensive tests first. Extract matching logic into pure functions. Use data-driven criteria instead of hardcoded rules.

---

### MEDIUM: CSS Theme Overrides With Global Selectors

**Issue:** The light mode and high-contrast mode themes are implemented via global CSS attribute selectors (`[class*="text-[#ccff00]"]`) that match any class containing a color string. This is extremely fragile and will break if Tailwind class names change.

**Files:**
- `src/app/globals.css` (lines 106-286)

**Why fragile:** A Tailwind CSS update that changes class naming conventions will silently break all theme overrides. Adding a new component with a different color scheme may accidentally match an override selector.

**Safe modification:** Refactor to use CSS custom properties instead of class-name-based overrides. Or use Tailwind's `dark:` variant with proper CSS variable definitions.

---

## Test Coverage Gaps

### HIGH: Complete Absence of Tests

**Issue:** Zero test files exist anywhere in the project. No test runner configured. No CI pipeline for testing.

**Files:** Entire codebase.

**What's not tested:**
- `evaluateEligibility()` — the entire eligibility algorithm
- `getStateEconomicProfile()` — state matching logic
- All API route handlers (scan, admin, alerts, pasarapi, health)
- The client-side form submission and state management
- The admin CRUD operations

**Risk:** Every change is a blind deployment. There is no regression detection. Refactoring the massive `bantuan-client.tsx` is extremely risky.

**Priority:** HIGH

---

## Summary of Critical Findings

| # | Severity | Category | Finding | File(s) |
|---|----------|----------|---------|---------|
| 1 | HIGH | Security | No authentication on admin endpoints | `src/app/api/admin/*.ts` |
| 2 | HIGH | Security | Database credentials in committed config | `drizzle.config.json` |
| 3 | HIGH | Data Integrity | Data lost on serverless cold start | `src/db/index.ts` |
| 4 | HIGH | Data Integrity | No migration system | `src/db/index.ts`, `schema.ts` |
| 5 | HIGH | Error Handling | Silent fallback to stale data | `src/app/api/scan/route.ts` |
| 6 | HIGH | Performance | Loads all rows into memory for stats | `src/app/api/admin/stats/route.ts` |
| 7 | HIGH | Code Quality | 962-line monolith component | `src/app/bantuan-client.tsx` |
| 8 | HIGH | Code Quality | Widespread `as any` type abuse | Multiple files |
| 9 | HIGH | Missing Features | No automated tests | Entire codebase |
| 10 | HIGH | Missing Features | No structured logging | Entire codebase |
| 11 | HIGH | Scalability | PGlite cannot scale horizontally | `src/db/index.ts` |
| 12 | HIGH | Dependencies | PGlite v0.5.x experimental | `package.json` |

---

*Concerns audit: Wed Jul 08 2026*
