# Coding Conventions

**Analysis Date:** Wed Jul 08 2026

## Naming Patterns

**Files:**
- **React components:** PascalCase filenames — `bantuan-client.tsx`, `page.tsx`, `layout.tsx`
- **API routes:** kebab-case directory structure — `src/app/api/admin/programs/route.ts`
- **Library modules:** kebab-case filenames — `aid-engine.ts`, `pasarapi.ts`, `seed-data.ts`
- **Database:** kebab-case — `schema.ts`, `index.ts`
- **CSS:** kebab-case — `globals.css`
- **Config files:** kebab-case dotfiles — `drizzle.config.json`, `postcss.config.mjs`, `eslint.config.mjs`

**Functions:**
- **camelCase** for all functions — `fetchAdminData`, `handleScan`, `toggleCategory`, `refreshPasarApi`, `evaluateEligibility`, `getDb`, `subscribeAutopilotAlert`
- **Async functions** use `async function` declaration or `async () =>` arrow syntax
- **React event handlers** prefixed with `handle` — `handleScan`, `handleToggleActive`, `handleCreateProgram`
- **Internal helpers** are plain `function` declarations or `const` arrow functions — `toggleCategory`, `toggleClaimedCode`

**Variables:**
- **camelCase** throughout — `monthlyIncome`, `householdSize`, `selectedCategories`, `maskedContact`
- **State variables** use `[value, setValue]` destructuring — `const [programs, setPrograms] = useState(...)`
- **Boolean state** uses `is` prefix — `isScanning`, `isRefreshing`, `isSavingAlert`, `isAnonymous`, `isActive`
- **Constants** are `UPPER_SNAKE_CASE` for static arrays — `MALAYSIAN_STATES`, `TARGET_CATEGORIES`, `THEME_OPTIONS`, `FALLBACK_STATE_INCOME`
- **Module-level caches** use `camelCase` — `cachedSnapshot`, `lastFetchTime`, `dbInstance`

**Types:**
- **Interfaces** use `PascalCase` — `AidProgram`, `ScanInput`, `EligibilityReport`, `PasarApiSnapshot`, `StateIncomeData`
- **Type aliases** use `PascalCase` with `type` — `VisualTheme = 'dark' | 'light' | 'contrast'`
- **Table row types** inferred from schema — `AidProgram`, `NewAidProgram`, `EligibilityScan`, `AlertSubscription`

**Components:**
- **Default exports** for page components — `export default function AdminPage()`, `export default function BantuanClient({ initialSnapshot })`
- **Named exports only** for library modules — `export function evaluateEligibility(...)`, `export async function fetchPasarApiSnapshot()`

## Code Organization

**Module structure (2 patterns used):**

1. **Library modules** (`src/lib/`): Pure logic with exported functions and interfaces. No React, no side effects at module level. Example — `aid-engine.ts` exports `evaluateEligibility`, `pasarapi.ts` exports `fetchPasarApiSnapshot` and `getStateEconomicProfile`.

2. **Database modules** (`src/db/`): Schema definitions, seed data, and connection management. Separated into `schema.ts` (table definitions + types), `seed-data.ts` (initial data), `index.ts` (connection + initialization).

**Example — library module pattern:**
```typescript
// src/lib/pasarapi.ts
export interface PasarApiSnapshot { ... }
const FALLBACK_STATE_INCOME = [ ... ]; // module-level constant

export async function fetchPasarApiSnapshot(): Promise<PasarApiSnapshot> { ... }
export function getStateEconomicProfile(stateName: string, snapshot: PasarApiSnapshot) { ... }
```

**Example — database module pattern:**
```typescript
// src/db/schema.ts
export const aidPrograms = pgTable('aid_programs', { ... });
export type AidProgram = typeof aidPrograms.$inferSelect;
```

**React component organization pattern (in `bantuan-client.tsx`):**
1. `'use client'` directive
2. Import block (external → internal)
3. Type/interface definitions (props interfaces, constants)
4. Component function with hooks at top
5. Event handlers (defined as inner functions before JSX)
6. `useMemo` computed values
7. Return JSX

**API route organization pattern (in `src/app/api/*/route.ts`):**
1. Import block
2. Named exports: `GET`, `POST`, `PATCH` functions
3. Each handler wrapped in try/catch
4. Return `NextResponse.json()`

## TypeScript Usage Patterns

**Strictness:**
- `tsconfig.json` has `"strict": true` enabled — full strict mode
- `"noEmit": true` — TypeScript for type-checking only
- `"allowJs": false` — no JS files
- `"moduleResolution": "bundler"` — uses Next.js bundler resolution
- Path alias `@/*` maps to `./src/*`

**Type usage:**

**⚠️ Heavy `any` usage — a significant convention violation:**
- `let dbInstance: any = null;` in `src/db/index.ts`
- `const [stats, setStats] = useState<any>(null);` in `src/app/admin/page.tsx`
- `(error: any)` in every API route catch block
- `e: any` in catch in client components
- `(item: any)` for API response parsing in `pasarapi.ts`
- `INITIAL_AID_PROGRAMS as any` in `src/app/api/scan/route.ts` and `bantuan-client.tsx`
- `handleScan({ preventDefault: () => {} } as any)` in `bantuan-client.tsx`

**Better patterns available but not used:**
```typescript
// Instead of: catch (error: any)
// Use: catch (error: unknown) with type narrowing
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
}
```

**Interfaces preferred over type aliases for object shapes:**
```typescript
// Preferred pattern (used throughout):
export interface ScanInput {
  householdSize: number;
  monthlyIncome: number;
  state: string;
  ...
}
```

**`$inferSelect` / `$inferInsert` from Drizzle ORM schema:**
```typescript
export type AidProgram = typeof aidPrograms.$inferSelect;
export type NewAidProgram = typeof aidPrograms.$inferInsert;
```

**No utility types (Pick, Omit, Partial, Readonly) observed — would benefit from them.**

**No generic type parameters used anywhere — `useState<AidProgram[]>([])` is the only generic usage.**

## Import Organization

**Current pattern (inconsistent):**

**Pattern A — external first, then local (most files):**
```typescript
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Check, X } from 'lucide-react';
import { AidProgram } from '../../db/schema';
```

**Pattern B — React, Next, third-party, then local:**
```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis } from 'recharts';
import { EligibilityReport, evaluateEligibility } from '../lib/aid-engine';
import { PasarApiSnapshot } from '../lib/pasarapi';
```

**Ordering convention (derived from observation):**
1. `React` / React hooks
2. `next/*` (Next.js modules)
3. Third-party libraries (`lucide-react`, `recharts`, `drizzle-orm`)
4. Local modules (`../lib/...`, `../../db/...`)
5. CSS imports

**No barrel files (`index.ts` re-exports) used — imports reference files directly.**

**Path aliases are available (`@/*` → `./src/*`) but NOT used anywhere.**
- All imports use relative paths: `../../db/index`, `../lib/aid-engine`
- Should migrate to `@/db/index`, `@/lib/aid-engine` for consistency

## React Patterns

**Server vs Client Components:**
- **Server components** (default in Next.js App Router) — used for data fetching, no interactivity
  - `src/app/page.tsx` — fetches `fetchPasarApiSnapshot()` on server, passes to client component
  - `export const dynamic = 'force-dynamic';` — ensures fresh data on every request
- **Client components** — use `'use client'` directive at top
  - `src/app/bantuan-client.tsx` — all interactive UI
  - `src/app/admin/page.tsx` — admin dashboard

**Data flow pattern:**
```typescript
// Server component (page.tsx) → fetches data → passes as props to client
// src/app/page.tsx
export default async function HomePage() {
  const snapshot = await fetchPasarApiSnapshot();
  return <BantuanClient initialSnapshot={snapshot} />;
}
```

**Client component pattern:**
1. `'use client'` at top
2. `useState` for all interactive state
3. `useEffect` for:
   - Initial data fetch (`fetchAdminData`)
   - LocalStorage persistence (`visualTheme`)
   - DOM side effects (canvas animation)
   - Event listeners (mousemove)
4. `useMemo` for derived computations (`autopilot` object in `bantuan-client.tsx`)
5. Event handlers defined before return

**State management pattern:**
- **Local component state only** — no context, no state management library
- `useState` for form fields, UI state, results
- Props drilled from server to client component
- `localStorage` for persisting theme preference

## CSS/Tailwind Conventions

**Framework:** Tailwind CSS v4 (`@tailwindcss/postcss`)

**Configuration:**
- `postcss.config.mjs` — minimal: only `@tailwindcss/postcss` plugin
- No `tailwind.config.*` — Tailwind v4 uses CSS-based configuration
- `src/app/globals.css` imports `@import "tailwindcss"`
- Custom CSS variables in `:root` — `--bg-obsidian`, `--card-dark`, `--neon-lime`, `--text-muted`

**Styling patterns:**

1. **Utility-first with Tailwind classes** — heavy use of arbitrary values:
   ```tsx
   <div className="bg-[#050505] text-white pb-20">  // arbitrary colors
   <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5">  // opacity modifiers
   ```

2. **Custom CSS utility classes** in `globals.css`:
   - `.neon-text` — glow effect for text
   - `.neon-border` — border with hover glow and lift
   - `.neon-btn` — button with hover shine and scale
   - `.animate-marquee` — ticker animation
   - `.radar-sweep` — radar sweep animation
   - `.custom-cursor` — custom cursor (Gleec UX style)

3. **Theme system** via CSS classes:
   - `.theme-light` — light mode overrides with `!important`
   - `.theme-contrast` — high contrast accessibility mode with `!important`
   - Toggled by setting `document.documentElement.dataset.theme` and adding class to root div

4. **Accessibility:**
   - `sr-only` + `focus:not-sr-only` for skip-to-content links
   - `aria-label`, `aria-pressed` on interactive elements
   - `prefers-reduced-motion` media query to disable animations
   - `.scrollbar-none` utility for hiding scrollbars
   - `focus-visible` outlines with high contrast colors

5. **No CSS modules** — all styling via Tailwind + global CSS

## Database Query Patterns (Drizzle ORM)

**Connection:** 
- Uses `@electric-sql/pglite` (in-process PostgreSQL via WASM)
- `src/db/index.ts` — `getDb()` singleton with lazy initialization
- Falls back to in-memory mode in serverless environments

**Schema Definition:**
```typescript
// src/db/schema.ts
import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const aidPrograms = pgTable('aid_programs', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  ...
});
```

**Migration approach:** No Drizzle migrations used. Tables created via raw SQL:
```typescript
await pglite.exec(`
  CREATE TABLE IF NOT EXISTS aid_programs (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    ...
  );
`);
```

**Query patterns:**
```typescript
// Select all — src/app/api/admin/programs/route.ts
const list = await db.select().from(aidPrograms);

// Insert with returning — src/app/api/admin/programs/route.ts
const [inserted] = await db.insert(aidPrograms).values({...}).returning();

// Update with where clause — src/app/api/admin/programs/route.ts
const [updated] = await db.update(aidPrograms)
  .set({ ...updates, updatedAt: new Date() })
  .where(eq(aidPrograms.id, Number(id)))
  .returning();

// Raw SQL query for count — src/db/index.ts
const countRes = await pglite.query(`SELECT COUNT(*) as count FROM aid_programs`);
```

**Seed pattern:**
```typescript
// src/db/index.ts — seed on first connection
for (const prog of INITIAL_AID_PROGRAMS) {
  await db.insert(aidPrograms).values(prog).onConflictDoNothing();
}
```

**⚠️ Issue:** DRIZZLE MIGRATIONS are NOT configured. The `drizzle.config.json` only specifies schema path and connection URL but no `out` directory for migrations. Raw SQL table creation in `src/db/index.ts` bypasses Drizzle Kit.

## Error Handling Patterns

**API Routes — consistent try/catch with error response:**
```typescript
export async function GET() {
  try {
    // ... business logic
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to ...', details: error.message }, { status: 500 });
  }
}
```
- **Problem:** Uses `error: any` instead of `error: unknown`, losing type safety
- **Problem:** Error messages are user-facing strings in BM — inconsistent with catch block which shows raw `error.message`

**Client-side — two patterns:**
1. **Try/catch with console.error** in form handlers:
   ```typescript
   try {
     const res = await fetch('/api/...');
     // ...
   } catch (e) {
     console.error(e);
   }
   ```
2. **Graceful fallback** pattern in `src/app/api/scan/route.ts`:
   ```typescript
   try {
     const db = await getDb();
     // DB-based evaluation
   } catch (dbErr) {
     console.warn('Database unavailable...');
     const report = evaluateEligibility(programs as any, input, snapshot); // fallback
     return NextResponse.json(report);
   }
   ```

**Best-effort logging pattern:**
```typescript
await db.insert(eligibilityScans).values({...})
  .catch((e: any) => console.warn('Best-effort scan metrics logging skipped:', e));
```

**No error boundaries** - no React error boundaries (`componentDidCatch` or `error.tsx`) detected.

**No structured logging** — all logging is `console.log`, `console.warn`, `console.error`.

## API Route Patterns

**Route naming:** Next.js App Router file-based routing in `src/app/api/`:
- `src/app/api/health/route.ts` → `GET /api/health`
- `src/app/api/admin/programs/route.ts` → `GET|POST|PATCH /api/admin/programs`
- `src/app/api/admin/stats/route.ts` → `GET /api/admin/stats`
- `src/app/api/scan/route.ts` → `POST /api/scan`
- `src/app/api/pasarapi/snapshot/route.ts` → `GET /api/pasarapi/snapshot`
- `src/app/api/alerts/route.ts` → `POST /api/alerts`

**Export pattern:** Named exports only — `export async function GET()`, `POST()`, `PATCH()`

**Request parsing:**
```typescript
const body = await req.json();
const id = Number(body.id); // explicit conversion
const name = String(body.name || 'default');
```

**Response pattern:** Always `NextResponse.json()` with appropriate status code.

**Route handler structure for CRUD:**
```typescript
export async function GET() {
  try {
    // ... operation
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: '...', details: error.message }, { status: 500 });
  }
}
```

## Module Design

**Exports:**
- **Library files:** Named exports only — `export function`, `export interface`
- **Components:** Default export — `export default function ComponentName()`
- **API routes:** Named exports matching HTTP methods — `GET`, `POST`, `PATCH`

**No barrel files** — each import references the actual file, no `index.ts` re-exports.

**Singletons:**
- `dbInstance` in `src/db/index.ts` — global database instance
- `cachedSnapshot` / `lastFetchTime` in `src/lib/pasarapi.ts` — in-memory API cache

## Code Style

**Formatting:** No Prettier config detected. Relies on default Next.js/ESLint formatting.

**Linting:**
- ESLint v9 (flat config) — `eslint.config.mjs`
- Uses `eslint-config-next/core-web-vitals`
- Ignores `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- No custom rules configured

**Semicolons:** Used consistently throughout.

**Quotes:** Single quotes for JS/TS (matching Next.js convention).

**Trailing commas:** Used in multiline objects and arrays.

---

*Convention analysis: Wed Jul 08 2026*
