# External Integrations

**Analysis Date:** 2026-07-08

## APIs & External Services

**OpenDOSM API (Malaysia Open Data Portal via data.gov.my):**
- Purpose: Fetches official Malaysian household income statistics (by state) and low-income Consumer Price Index (CPI) data
- Integration module: `src/lib/pasarapi.ts`
- Endpoints called:
  - `https://api.data.gov.my/data-catalogue/?id=hh_income_state&sort=-date&limit=16` — Household income by state (mean, median)
  - `https://api.data.gov.my/data-catalogue/?id=cpi_lowincome&sort=-date&limit=10` — Low-income CPI breakdown by division
- Authentication: None (public API)
- Timeout: 4 seconds (`AbortController` with 4000ms timeout)
- Error handling: Fetches are wrapped in try/catch. On failure or timeout, the app falls back to hardcoded static data (`FALLBACK_STATE_INCOME`, `FALLBACK_CPI_LOWINCOME`, `FALLBACK_STATE_POVERTY`), returning `status: 'fallback'` in snapshot
- Caching: In-memory cache with 5-minute TTL (`CACHE_TTL = 300 * 1000` in `src/lib/pasarapi.ts` line 89). Cache is shared across all requests

**PasarAPI (Internal Module Name):**
- Purpose: Internal abstraction layer over OpenDOSM. The term "PasarAPI" is used as the module name (`src/lib/pasarapi.ts`) and as the API route path (`/api/pasarapi/snapshot`)
- What it provides: `PasarApiSnapshot` interface with state income data, CPI data, poverty data, and computed summary statistics (national median income, highest/lowest state by median, latest overall CPI)
- Also provides `getStateEconomicProfile()` helper for looking up a state's economic context (median income, poverty rate, cost multiplier)
- NOT a separate external service — it's an internal wrapper around data.gov.my API calls

## Data Storage

**Databases:**
- PGlite (embedded PostgreSQL via WASM) — `@electric-sql/pglite` 0.5.4
  - Connection: No external connection string required. Runs in-process
  - Client: `drizzle-orm` 0.45.2 with `drizzle-orm/pglite` driver
  - Storage modes:
    - **Persistence** (local dev): Data directory at `./data/pglite_db/` (gitignored via `/data/pglite_db` in `.gitignore`)
    - **In-memory** (serverless): Automatically selected when `VERCEL`, `AWS_LAMBDA_FUNCTION_NAME`, or `NETLIFY` env vars are detected
  - Tables: `aid_programs`, `eligibility_scans`, `alert_subscriptions` (all auto-created on first `getDb()` call)
  - Seed data: 10 initial aid programs loaded from `src/db/seed-data.ts` into `aid_programs` on first initialization

**File Storage:**
- Local filesystem only — PGlite persistence directory at `data/pglite_db/`

**Caching:**
- In-memory cache for OpenDOSM API snapshot data (`src/lib/pasarapi.ts` line 87-88), TTL: 5 minutes

## Authentication & Identity

**Auth Provider:**
- None detected. No authentication library or middleware present
- The app operates in fully anonymous mode by default:
  - Visual theme preference stored in `localStorage` key `banturakyat-visual-theme`
  - Scan form defaults to anonymous (`isAnonymous: true` in `src/app/bantuan-client.tsx`)
  - Alert subscriptions store only SHA-256 hashed contact info (`src/app/api/alerts/route.ts` line 21)
- Admin page (`/admin`) has no authentication guard — accessible to anyone

## Monitoring & Observability

**Error Tracking:**
- None detected. Errors are logged to `console.error` or `console.warn` in catch blocks

**Logs:**
- `console.log` — Database seeding status (`src/db/index.ts` line 115)
- `console.warn` — Database unavailability fallback (`src/app/api/scan/route.ts` line 43), best-effort scan logging failures (`src/app/api/scan/route.ts` line 39), filesystem read-only fallback (`src/db/index.ts` line 39)
- `console.error` — API route errors, scan processing errors, subscription errors, client-side fetch errors

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured. Dependencies suggest Vercel compatibility (Next.js 16 framework, serverless detection in `src/db/index.ts`)
- `.vercel` directory is gitignored

**CI Pipeline:**
- None detected (no GitHub Actions, `.circleci/`, `.gitlab-ci.yml`, or similar)

## Environment Configuration

**Required env vars:**
- None strictly required for runtime. The app functions entirely with defaults and fallback data
- `VERCEL` / `AWS_LAMBDA_FUNCTION_NAME` / `NETLIFY` — Auto-detected to switch between persistent vs in-memory PGlite

**Secrets location:**
- `.env` and `.env*.local` are gitignored (can be used for Drizzle Kit connection string in development)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None (the app only makes outbound HTTP calls to data.gov.my via `fetch`)

## Internal API Routes

**`GET /api/health`** (`src/app/api/health/route.ts`)
- Returns: `{ status: "ok", service: "BantuRakyat-AI", timestamp }`
- No external integration

**`GET /api/pasarapi/snapshot`** (`src/app/api/pasarapi/snapshot/route.ts`)
- Returns: Current `PasarApiSnapshot` (fetches from OpenDOSM or returns cached/fallback data)
- Called by: `src/app/page.tsx` (server-side), `src/app/bantuan-client.tsx` client refresh via `fetch('/api/pasarapi/snapshot')`
- External dependency: OpenDOSM API (data.gov.my)
- Error behavior: Returns 500 JSON with error details if fetch fails

**`POST /api/scan`** (`src/app/api/scan/route.ts`)
- Accepts: `ScanInput` (householdSize, monthlyIncome, state, employmentStatus, categories, currentlyClaimedCodes)
- Returns: `EligibilityReport` (qualified programs, missing programs, calendar events, document checklist)
- Logic: Fetches PasarApiSnapshot, queries DB for aid programs, runs `evaluateEligibility()`
- Records: Anonymized scan metrics to `eligibility_scans` table (best-effort)
- Fallback: If DB is unavailable, uses `INITIAL_AID_PROGRAMS` from `src/db/seed-data.ts` as stateless fallback
- Called by: `src/app/bantuan-client.tsx` on form submit and on initial mount

**`POST /api/alerts`** (`src/app/api/alerts/route.ts`)
- Accepts: contact, contactType, state, incomeBracket, notifyDeadlines, notifyNewPrograms
- Records: Hashed subscription to `alert_subscriptions` table
- Privacy: SHA-256 hashes the contact, stores masked version for display
- Called by: `src/app/bantuan-client.tsx` "Arm" button in Encrypted Reminder Relay

**`GET /api/admin/programs`** (`src/app/api/admin/programs/route.ts`)
- Returns: All aid programs from DB
- Called by: `src/app/admin/page.tsx` admin dashboard

**`POST /api/admin/programs`** (`src/app/api/admin/programs/route.ts`)
- Accepts: Full program definition
- Creates: New aid program in DB
- Called by: `src/app/admin/page.tsx` add form

**`PATCH /api/admin/programs`** (`src/app/api/admin/programs/route.ts`)
- Accepts: `{ id, ...updates }`
- Updates: Aid program by ID (used to toggle `isActive` status)
- Called by: `src/app/admin/page.tsx` toggle active button

**`GET /api/admin/stats`** (`src/app/api/admin/stats/route.ts`)
- Returns: Dashboard stats (activePrograms, totalScans, totalAlerts, avgHouseholdIncome, recentScans, recentAlerts)
- Called by: `src/app/admin/page.tsx` on load and refresh

## Data Flow Diagram

```text
Browser                       Next.js Server                    External
─────────────────────────────────────────────────────────────────────────
                          ┌──────────────────┐
                          │  GET /api/health  │
                          │  (health check)   │
                          └──────────────────┘

                          ┌──────────────────┐
                          │ GET /api/pasarapi │────fetch────▶ data.gov.my
                          │  /snapshot        │◀─── JSON ────  (hh_income_state
                          ├──────────────────┤                + cpi_lowincome)
                          │  Cache: 5min TTL  │
                          │  Fallback: static  │
                          └──────────────────┘

                          ┌──────────────────┐
Client ──POST /api/scan──▶│  fetchPasarApi() │
(scan form)               │  + DB query       │─── pglite ──▶ aid_programs
                          │  + evaluateElig() │                eligibility_scans
                          │  + insert scan     │
                          └────────┬─────────┘
                                   │
                          EligibilityReport ◀── JSON ────

                          ┌──────────────────┐
Client ──POST /api/alerts─▶│  SHA-256 hash    │─── pglite ──▶ alert_subscriptions
(reminder form)           │  + insert alert   │
                          └──────────────────┘

                          ┌──────────────────┐
Admin ──GET/POST/PATCH───▶│  CRUD programs    │─── pglite ──▶ aid_programs
        /api/admin/       ├──────────────────┤
        programs          │  GET /api/admin/  │─── pglite ──▶ aid_programs +
                          │  stats            │               eligibility_scans +
                          └──────────────────┘               alert_subscriptions
```

---

*Integration audit: 2026-07-08*
