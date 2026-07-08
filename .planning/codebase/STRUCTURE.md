# Codebase Structure

**Analysis Date:** 2026-07-08

## Directory Layout

```
BantuRakyat-AI/
├── .planning/                       # GSD planning artifacts
│   └── codebase/                   #   Codebase map documents
│       ├── STACK.md                #   Technology stack analysis
│       ├── INTEGRATIONS.md          #   External integrations audit
│       ├── ARCHITECTURE.md          #   Architecture analysis (this)
│       └── STRUCTURE.md             #   Structure analysis (this)
├── src/
│   ├── app/                        # Next.js App Router pages & API
│   │   ├── layout.tsx              #   Root layout, HTML shell, metadata
│   │   ├── page.tsx                #   Homepage (server component)
│   │   ├── globals.css             #   Global Tailwind CSS + custom styles
│   │   ├── bantuan-client.tsx      #   Main client component (~960 lines)
│   │   ├── admin/
│   │   │   └── page.tsx            #   Admin dashboard (client component)
│   │   └── api/
│   │       ├── health/
│   │       │   └── route.ts        #   Health check endpoint
│   │       ├── scan/
│   │       │   └── route.ts        #   Eligibility scan endpoint
│   │       ├── pasarapi/
│   │       │   └── snapshot/
│   │       │       └── route.ts    #   PasarAPI snapshot refresh
│   │       ├── alerts/
│   │       │   └── route.ts        #   Alert subscription endpoint
│   │       └── admin/
│   │           ├── programs/
│   │           │   └── route.ts    #   Admin CRUD for aid programs
│   │           └── stats/
│   │               └── route.ts    #   Admin aggregate stats
│   ├── lib/                        # Shared business logic
│   │   ├── aid-engine.ts           #   Eligibility evaluation engine
│   │   └── pasarapi.ts             #   OpenDOSM API integration + fallback data
│   └── db/                         # Database layer
│       ├── schema.ts               #   Drizzle ORM table definitions
│       ├── index.ts                #   PGlite DB init, table creation, auto-seed
│       └── seed-data.ts            #   10 initial Malaysian aid programs
├── package.json                    # Dependencies & scripts
├── next.config.ts                  # Next.js configuration
├── tsconfig.json                   # TypeScript configuration (@/* alias to src/)
├── postcss.config.mjs              # PostCSS with Tailwind v4
├── eslint.config.mjs               # ESLint flat config (Next.js core-web-vitals)
├── drizzle.config.json             # Drizzle Kit config (PostgreSQL, schema path)
├── package-lock.json               # Dependency lock file
├── .gitignore                      # Git ignore rules
├── banturakyat-preview.html        # Design preview file
├── banturakyat-update.patch        # Design update patch
└── README.md                       # Project readme
```

## Directory Purposes

### `src/app/` — Next.js App Router (Pages + API)
- **Purpose:** All page routes, layout, API endpoints for the application
- **Contains:** Server components, client components, route handlers, global CSS
- **Key files:**
  - `page.tsx` — Homepage (public), renders `BantuanClient` with server-fetched PasarAPI data
  - `admin/page.tsx` — Admin CRUD dashboard at `/admin`
  - `bantuan-client.tsx` — Main client-side component with all UI logic (962 lines)
  - `layout.tsx` — Root layout with metadata and global CSS import
  - `globals.css` — Tailwind v4 import + custom CSS (neon effects, themes, animations, accessibility)

### `src/app/api/` — Route Handlers
- **Purpose**: JSON API endpoints consumed by client components
- **Contains**: One `route.ts` per endpoint group
- **Key files:**
  - `scan/route.ts` — POST handler for eligibility scan; orchestrates DB + PasarAPI + aid-engine
  - `alerts/route.ts` — POST handler for alert subscriptions with SHA-256 privacy hashing
  - `pasarapi/snapshot/route.ts` — GET handler to refresh PasarAPI cache
  - `admin/programs/route.ts` — GET (list), POST (create), PATCH (toggle/replace)
  - `admin/stats/route.ts` — GET aggregated stats across all three tables
  - `health/route.ts` — Simple health check returning `{ status: 'ok' }`

### `src/db/` — Database Layer
- **Purpose**: Schema definitions, database initialization, seed data
- **Contains**: Drizzle ORM schema, PGlite initialization with auto-migration and seeding, seed data constants
- **Key files:**
  - `schema.ts` — 3 Drizzle `pgTable` definitions with exported TypeScript types
  - `index.ts` — `getDb()` singleton factory: creates PGlite instance, runs `CREATE TABLE IF NOT EXISTS`, auto-seeds on first init
  - `seed-data.ts` — 10 `NewAidProgram` entries covering STR, SARA, JKM, BINGKAS, MySalam, PeKa B40, BAP, Zakat, and state-level Johor aid

### `src/lib/` — Shared Logic
- **Purpose**: Business logic and external API integration not tied to pages or routes
- **Contains**: Aid engine, OpenDOSM data fetcher
- **Key files:**
  - `aid-engine.ts` — Pure function `evaluateEligibility()` with full interfaces for `ScanInput`, `EligibilityReport`, `QualifiedAidItem`, `CalendarEvent`
  - `pasarapi.ts` — `fetchPasarApiSnapshot()` (with 5-min in-memory cache + 4s abort timeout + static fallback), `getStateEconomicProfile()` helper

## Key File Locations

**Entry Points:**
- `/` — `src/app/page.tsx` (public eligibility scanner)
- `/admin` — `src/app/admin/page.tsx` (admin dashboard)

**API Endpoints:**
- `POST /api/scan` — `src/app/api/scan/route.ts`
- `POST /api/alerts` — `src/app/api/alerts/route.ts`
- `GET /api/pasarapi/snapshot` — `src/app/api/pasarapi/snapshot/route.ts`
- `GET/POST/PATCH /api/admin/programs` — `src/app/api/admin/programs/route.ts`
- `GET /api/admin/stats` — `src/app/api/admin/stats/route.ts`
- `GET /api/health` — `src/app/api/health/route.ts`

**Configuration:**
- `package.json` — Dependencies and scripts
- `next.config.ts` — Next.js configuration (default, empty)
- `tsconfig.json` — Strict TS with `@/*` path alias mapping to `./src/*`
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin
- `eslint.config.mjs` — Flat ESLint config with Next.js core-web-vitals preset
- `drizzle.config.json` — Drizzle Kit pointing to `./src/db/schema.ts`, localhost PostgreSQL connection

## Naming Conventions

**Files:**
- PascalCase for components/utilities: `bantuan-client.tsx`, `aid-engine.ts`, `pasarapi.ts`
- `page.tsx` for route pages (Next.js convention)
- `route.ts` for API route handlers (Next.js convention)
- `schema.ts`, `index.ts`, `seed-data.ts` for db layer (Drizzle convention)
- `.mjs` for ESM config files

**Directories:**
- Lowercase, hyphen-separated for routes: `pasarapi/snapshot/`
- Lowercase for conceptual grouping: `api/`, `db/`, `lib/`
- `admin/` nested under `app/api/` for admin route group

**Routes:**
- Public page: `src/app/page.tsx`
- Admin page: `src/app/admin/page.tsx`
- API route: `src/app/api/{group}/route.ts`

## Module Boundaries and Responsibilities

| Module | Boundary | What it MUST NOT do |
|--------|----------|---------------------|
| `src/db/schema.ts` | Define tables + export types only | No runtime initialization, no business logic |
| `src/db/index.ts` | Initialize PGlite, create tables, seed | No HTTP logic, no view rendering |
| `src/db/seed-data.ts` | Export static seed data array | No side effects, no imports from app/lib |
| `src/lib/aid-engine.ts` | Pure eligibility evaluation function | No database access, no fetch calls, no React |
| `src/lib/pasarapi.ts` | Fetch/parse OpenDOSM data, static fallback | No database access, no React dependencies |
| `src/app/page.tsx` | Server component: fetch + render client | No client hooks, no form logic |
| `src/app/bantuan-client.tsx` | Client UI: form, results, charts, autopilot | No direct DB access (fetches via API) |
| `src/app/admin/page.tsx` | Admin CRUD client page | No direct DB access |
| `src/app/api/*/route.ts` | Request parsing, orchestration, response | No view rendering, no React components |

## Where to Add New Code

**New Feature (e.g., new aid program type):**
- Add to `src/db/schema.ts` if new table needed
- Add seed instance to `src/db/seed-data.ts`
- Add evaluation rule to `src/lib/aid-engine.ts` in the program iteration loop
- If new UI tab needed: add handler in `src/app/bantuan-client.tsx`

**New API Endpoint:**
- Create `src/app/api/{resource-name}/route.ts` following existing patterns
- Import `getDb()` from `src/db/index.ts` for database access
- Use `src/lib/` functions for business logic
- Register usage in admin stats if applicable

**New Page Route:**
- Create `src/app/{route-name}/page.tsx`
- If client-side interactivity needed, create separate `'use client'` component file
- Add navigation link in layout or relevant component

**New Integration (external API service):**
- Create file in `src/lib/{service-name}.ts`
- Follow `pasarapi.ts` pattern: typed interfaces, fetcher function with fallback, in-memory caching if appropriate
- Wrap in API route if client needs to call it from the browser

## Special Directories

**`.planning/codebase/`:**
- **Purpose:** GSD codebase map documents consumed by `/gsd-plan-phase` and `/gsd-execute-phase`
- **Generated:** Yes (by `/gsd-map-codebase`)
- **Committed:** Yes

**`data/pglite_db/`:**
- **Purpose:** PGlite persistent database storage (local dev only)
- **Generated:** Yes (runtime, on first `getDb()` call)
- **Committed:** No (not needed — `.gitignore` handles it or should)

---

*Structure analysis: 2026-07-08*