# Technology Stack

**Analysis Date:** 2026-07-08

## Languages

**Primary:**
- TypeScript 5.9.3 — All source files (`src/`), config files, API routes, database schema, and client components
- CSS (with Tailwind CSS 4 directives) — Global styles in `src/app/globals.css`

**Secondary:**
- None detected (no JavaScript, Python, or other languages in source)

## Runtime

**Environment:**
- Node.js (inferred via Next.js 16) — development via `next dev`, production via `next start`
- Serverless environment detection built into `src/db/index.ts` (checks `VERCEL`, `AWS_LAMBDA_FUNCTION_NAME`, `NETLIFY` env vars)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.2.10 — App Router (`src/app/`), API route handlers (`src/app/api/`), server components (`src/app/page.tsx`, `src/app/layout.tsx`)
- React 19.2.6 — Client components (`src/app/bantuan-client.tsx`, `src/app/admin/page.tsx`), hooks, JSX
- React DOM 19.2.3 — `@types/react-dom`

**Database ORM:**
- Drizzle ORM 0.45.2 — Schema definition (`src/db/schema.ts`), query building in API routes (`getDb().select().from(aidPrograms)`)
- Drizzle Kit 0.31.10 — Migration tooling (`drizzle.config.json`)

**Embedded Database Engine:**
- `@electric-sql/pglite` 0.5.4 — In-process PostgreSQL via WASM, used as the runtime database. Supports both persistent (filesystem) and in-memory modes for serverless compatibility (`src/db/index.ts`)

**UI Component Libraries:**
- `lucide-react` 1.23.0 — Icon set used throughout (Sparkles, Zap, CheckCircle2, AlertCircle, RefreshCw, Sun, Moon, Eye, etc.)
- `recharts` 3.9.2 — Bar chart in OpenDOSM Intelligence tab (`src/app/bantuan-client.tsx` lines 926-938)

**Styling:**
- Tailwind CSS 4.1.17 — Utility-first CSS via `@import "tailwindcss"` directive in `src/app/globals.css`
- `@tailwindcss/postcss` 4.1.17 — PostCSS plugin for Tailwind CSS v4

**Testing:**
- Not detected — No test framework, test files, or test scripts in `package.json`

**Build/Dev:**
- TypeScript 5.9.3 — Type checking (`tsc --noEmit` via `typecheck` script)
- ESLint 9.39.4 — Linting (`eslint .` via `lint` script), with `eslint-config-next` 16.2.6
- PostCSS 8.5.8 — CSS processing pipeline
- `dotenv` 17.3.1 — Environment variable loading (listed in dependencies)

## Key Dependencies

**Critical:**
- `next` 16.2.10 — Application framework (routing, SSR, API routes)
- `react` / `react-dom` 19.2.6 — UI rendering
- `@electric-sql/pglite` 0.5.4 — Embedded PostgreSQL runtime (WASM-based). Provides the database engine without requiring a standalone PostgreSQL server
- `drizzle-orm` 0.45.2 — Type-safe SQL query builder and ORM
- `pg` 8.20.0 — Node.js PostgreSQL client (peer dependency for Drizzle ORM types)

**UI Rendering:**
- `recharts` 3.9.2 — Income median bar chart visualization
- `lucide-react` 1.23.0 — Icon components for UI elements

**Utilities:**
- `dotenv` 17.3.1 — Loads `.env` files for local development

## Configuration

**Environment:**
- No `.env` files committed (`.env` and `.env*.local` are gitignored)
- No explicit env vars documented, but runtime checks for: `VERCEL`, `AWS_LAMBDA_FUNCTION_NAME`, `NETLIFY` (in `src/db/index.ts` lines 20-22)
- `drizzle.config.json` references `postgresql://postgres:postgres@127.0.0.1:5432/app_db` for schema push (development local PostgreSQL, not used at runtime — pglite is used instead)

**Build:**
- `tsconfig.json` — strict mode, `bundler` module resolution, `@/*` path alias mapped to `./src/*`
- `next.config.ts` — Empty config (default Next.js settings)
- `postcss.config.mjs` — Single plugin `@tailwindcss/postcss`
- `eslint.config.mjs` — Flat config using `eslint-config-next/core-web-vitals`, ignores `.next/`, `out/`, `build/`, `next-env.d.ts`

**Database Migration:**
- `drizzle.config.json` — PostgreSQL dialect, schema at `./src/db/schema.ts`

## Platform Requirements

**Development:**
- Node.js (compatible with Next.js 16)
- npm
- Local `.env` file (optional, for `postgresql://...` connection string used by Drizzle Kit)

**Production:**
- Serverless platform (Vercel, AWS Lambda, or Netlify detected automatically) OR Node.js server
- No persistent database required — pglite operates in-memory in serverless, or optionally persistent via `./data/pglite_db/` directory on local filesystem
- No external database connection string required at runtime

---

*Stack analysis: 2026-07-08*
