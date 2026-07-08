<!-- refreshed: 2026-07-08 -->
# Architecture

**Analysis Date:** 2026-07-08

## System Overview

The application follows Next.js 16 App Router conventions with a three-layer architecture: Server Components + Client Components (UI), Route Handlers (API), and PGlite database (persistent/in-memory PostgreSQL via Drizzle ORM).

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER (src/app/)                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐     ┌─────────────────────────────────┐    │
│  │   PUBLIC PAGE            │     │   ADMIN DASHBOARD               │    │
│  │   src/app/page.tsx       │     │   src/app/admin/page.tsx       │    │
│  │   (Server Component)     │     │   ('use client')                │    │
│  │          │               │     │        │                       │    │
│  │          ▼               │     │        ▼                       │    │
│  │   BantuanClient          │     │   GET /api/admin/programs      │    │
│  │   ('use client')         │     │   GET /api/admin/stats          │    │
│  │   calls:                  │     │   PATCH /api/admin/programs    │    │
│  │   POST /api/scan         │     │   POST /api/admin/programs      │    │
│  │   GET /api/pasarapi/     │     └─────────────────────────────────┘    │
│  │     snapshot             │                                           │
│  │   POST /api/alerts       │                                           │
│  └─────────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
┌───────────────────────┐  ┌────────────────────────┐
│   API ROUTE HANDLERS   │  │  EXTERNAL: OpenDOSM   │
│   src/app/api/        │  │  API (data.gov.my)    │
│                         │  │                        │
│  POST /api/scan         │  │  HTTPS fetch with      │
│  GET /api/health        │  │  4s abort timeout      │
│  GET /api/pasarapi/     │  │  Fallback static data  │
│    snapshot             │  │                        │
│  POST /api/alerts       │  └────────────────────────┘
│  GET/POST/PATCH /api/   │
│    admin/programs       │
│  GET /api/admin/stats   │
└────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER (src/db/)                         │
│                                                                    │
│  PGlite (In-process PostgreSQL via @electric-sql/pglite)           │
│  Drizzle ORM (drizzle-orm + drizzle-kit for migrations)            │
│                                                                    │
│  Tables: aid_programs | eligibility_scans | alert_subscriptions      │
│  Auto-seed on first init from src/db/seed-data.ts                  │
│                                                                    │
│  Serverless mode: In-memory PGlite                                 │
│  Dev mode: Persistent to data/pglite_db/                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|---------------|------|
| Root Layout | HTML shell, metadata, global CSS import | `src/app/layout.tsx` |
| HomePage | Server component, fetches PasarAPI snapshot, renders BantuanClient | `src/app/page.tsx` |
| BantuanClient | Full client-side app: eligibility form, results display, autopilot, charts, alert subscription | `src/app/bantuan-client.tsx` |
| AdminPage | Admin CRUD dashboard: view programs, toggle active/inactive, add programs, view stats | `src/app/admin/page.tsx` |

## Layers

### UI Layer (`src/app/`)
- **Purpose:** Page routing, server-side rendering, client interactivity
- **Location:** `src/app/`
- **Contains:** Pages (server components), client components, route handlers, global CSS
- **Depends on:** `src/lib/` for business logic, `src/db/` for data access
- **Used by:** End users (public) and admins (admin dashboard)

### API Layer (`src/app/api/`)
- **Purpose:** Server-side JSON endpoints for client-side data fetching
- **Location:** `src/app/api/`
- **Contains:** Route handlers (GET/POST/PATCH) for scan, alerts, admin, health, PasarAPI
- **Depends on:** `src/db/index.ts` for database access, `src/lib/` for business logic
- **Used by:** `BantuanClient` and `AdminPage` via `fetch()`

### Library Layer (`src/lib/`)
- **Purpose:** Business logic, external API integration, shared utilities
- **Location:** `src/lib/`
- **Contains:** `aid-engine.ts` (eligibility evaluation), `pasarapi.ts` (OpenDOSM data fetching + fallback data)
- **Depends on:** `src/db/schema.ts` (types only, not runtime)
- **Used by:** API routes and client components

### Database Layer (`src/db/`)
- **Purpose:** Schema definition, database connection, seed data
- **Location:** `src/db/`
- **Contains:** `schema.ts` (Drizzle pgTable definitions), `index.ts` (PGlite initialization + auto-seed), `seed-data.ts` (10 initial aid programs)
- **Depends on:** `@electric-sql/pglite`, `drizzle-orm`, `drizzle-orm/pglite`
- **Used by:** API route handlers

## Data Flow

### Primary Request Path: Eligibility Scan

1. **User fills form** in `BantuanClient` (`src/app/bantuan-client.tsx:186-211`)
2. **Client POSTs** to `POST /api/scan` with `ScanInput` (householdSize, monthlyIncome, state, categories, claimedCodes)
3. **API route** (`src/app/api/scan/route.ts`) parses body, fetches PasarAPI snapshot (or uses in-memory cache), loads programs from database
4. **Aid Engine** (`src/lib/aid-engine.ts`) iterates over all active programs, filters by income/state/categories, calculates estimated annual value, generates explanations + match reasons
5. **Scan metrics** are recorded in `eligibility_scans` table (best-effort)
6. **EligibilityReport** JSON returned to client
7. **Client renders** qualified programs list, displays total estimated value in results widget

### Secondary Flow: Autopilot Dashboard

1. **On initial mount** (`src/app/bantuan-client.tsx:213-215`), `handleScan` fires automatically
2. **useMemo** computes `autopilot` object from the report: top unclaimed missions, readiness score, annual missing value, daily leak rate, urgency level, upcoming events, document checklist
3. **User can** copy action plan to clipboard, subscribe to encrypted reminder alerts (POST `/api/alerts`), or navigate to Claim Autopilot tab

### OpenDOSM Data Pipeline

1. **HomePage** (`src/app/page.tsx`) calls `fetchPasarApiSnapshot()` on server render
2. **pasarapi.ts** (`src/lib/pasarapi.ts`) checks in-memory cache (5-min TTL), then fetches from `api.data.gov.my` endpoints for household income and low-income CPI
3. On failure or timeout, falls back to comprehensive static DOSM data embedded in the module
4. Snapshot passed as prop to `BantuanClient`
5. Client can also trigger refresh via `GET /api/pasarapi/snapshot` (button in navbar)

### Admin CRUD Flow

1. **AdminPage** (`src/app/admin/page.tsx`) loads on mount: fetches programs list and stats
2. **Toggle active/inactive:** PATCH `/api/admin/programs` with program ID and new `isActive` flag
3. **Create program:** POST `/api/admin/programs` with full form data
4. **Stats endpoint:** GET `/api/admin/stats` aggregates across all three tables

### Alert Subscription Flow

1. **User enters** contact (phone/email) in Autopilot sidebar
2. **POST `/api/alerts`** hashes contact with SHA-256, creates masked display version, stores in `alert_subscriptions` table
3. Response returns masked contact for confirmation

## Key Abstractions

### AidProgram
- **Purpose:** Represents a Malaysian government assistance/subsidy program
- **Location:** `src/db/schema.ts` (table), `src/db/seed-data.ts` (seed instances)
- **Fields:** code, name, category, provider, income limits, age limits, state restrictions, target categories, amount range, frequency, payout schedule, required docs, apply URL, active flag

### ScanInput / EligibilityReport
- **Purpose:** Type-safe input/output contracts for the eligibility evaluation
- **Location:** `src/lib/aid-engine.ts` (interfaces)
- **ScanInput:** Household profile data submitted by user
- **EligibilityReport:** Full scan result with qualified programs, missing programs, total value, calendar events, document checklist

### PasarApiSnapshot
- **Purpose:** Cached or live-fetched Malaysian economic data (DOSM)
- **Location:** `src/lib/pasarapi.ts` (interface + fetcher)
- **Contains:** State-level income (mean/median), low-income CPI breakdown, poverty rates, computed summary metrics

## Entry Points

**Public Page (/)**
- Location: `src/app/page.tsx`
- Triggers: Direct browser navigation to `/`
- Responsibilities: Fetches initial PasarAPI snapshot on server, renders `BantuanClient`

**Admin Page (/admin)**
- Location: `src/app/admin/page.tsx`
- Triggers: Navigation to `/admin`
- Responsibilities: Full CRUD dashboard for program management and aggregate statistics

**API Routes**
- `GET /api/health` - Health check
- `POST /api/scan` - Process eligibility scan
- `GET /api/pasarapi/snapshot` - Refresh PasarAPI data
- `POST /api/alerts` - Register alert subscription
- `GET/POST/PATCH /api/admin/programs` - CRUD aid programs
- `GET /api/admin/stats` - Admin dashboard statistics

## Architectural Constraints

- **Single-threaded:** Next.js server runtime; no worker threads
- **Global singleton:** `dbInstance` in `src/db/index.ts:10` is a module-level singleton holding the PGlite/Drizzle connection — ensures one DB instance across all API routes
- **In-memory caching:** `cachedSnapshot` + `lastFetchTime` in `src/lib/pasarapi.ts:87-89` is a module-level cache with 5-min TTL for OpenDOSM data
- **Serverless awareness:** `src/db/index.ts:19-41` checks for `VERCEL`, `AWS_LAMBDA_FUNCTION_NAME`, or `NETLIFY` env vars — in serverless mode, PGlite runs in-memory without filesystem persistence
- **Circular imports:** None detected — dependency graph is strictly acyclic: `db/schema.ts` ← `db/index.ts` ← `api/` routes, and `db/schema.ts` ← `lib/aid-engine.ts` ← `api/scan/route.ts`

## Error Handling

**Strategy:** Best-effort with graceful fallbacks
- Database unavailable: `POST /api/scan` catches DB error, falls back to `INITIAL_AID_PROGRAMS` seed data with `evaluateEligibility` in stateless mode
- PasarAPI offline: `fetchPasarApiSnapshot()` catches all exceptions, returns comprehensive static fallback data with `status: 'fallback'`
- Scan metrics: DB insert is wrapped in `.catch()` — non-blocking, silently skips on failure
- All API routes return `{ error, details }` JSON on failure with appropriate HTTP status codes

## Cross-Cutting Concerns

- **Privacy:** Alert subscription contact is SHA-256 hashed before storage; only masked display version saved (`src/app/api/alerts/route.ts:21-36`)
- **Accessibility:** Three visual themes (dark, light, high contrast) persisted in localStorage; skip-to-content links at top of both pages; prefers-reduced-motion media query in CSS
- **Inclusive language:** Full Bahasa Melayu and English bilingual support in eligibility explanations; `lang` toggle in UI

---

*Architecture analysis: 2026-07-08*