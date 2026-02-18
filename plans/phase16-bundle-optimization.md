# Phase 16 — Bundle Size Optimization

## Problem

The app ships a single 875 KB minified JS chunk (213 KB gzipped) with zero code splitting, no build-time compression, and no bundle analysis tooling. Vite's built-in warning fires on every build:

```
dist/assets/index-CkayPWS3.js   874.87 kB │ gzip: 213.41 kB
(!) Some chunks are larger than 500 kB after minification.
```

The PWA precache totals 1,506 KB across 10 entries. All application code, vendor libraries, and data files load eagerly on initial page visit regardless of what the user needs.

### Baseline Measurements (pre-optimization)

| Asset | Raw | Gzipped |
|-------|-----|---------|
| `index-*.js` (single JS chunk) | 874.87 KB | 213.41 KB |
| `index-*.css` | 32.46 KB | 6.37 KB |
| `simulation.worker-*.js` | 19.87 KB | — |
| `registerSW.js` | 0.13 KB | — |
| **Total JS** | **894.87 KB** | **~220 KB** |
| PWA precache | 1,506.30 KB | — |

### Root Causes

1. **Recharts** (~230 KB minified) — the single largest dependency. Used for exactly one bar chart in `WoundDistributionChart.tsx`. Imports 8 components; pulls in d3-scale, d3-shape, d3-interpolate, and other d3 sub-packages.

2. **Data files eagerly bundled** — Three processed JSON files (`units.json` at 4,269 lines, `upgrades.json` at 8,314 lines, `keywords.json` at 1,256 lines) and two enrichment TypeScript files (`units.ts` at 3,530 lines, `upgrades.ts` at 2,196 lines) are all statically imported at module top level. Combined: ~19,565 lines of data in the critical path.

3. **Zero code splitting** — No `React.lazy()`, no `Suspense`, no dynamic `import()` anywhere in production code. All three panels (Attacker, Defender, Results) plus all stores, engine, and data modules load in a single chunk. The only separate bundle is the simulation Web Worker.

4. **No build compression** — No `vite-plugin-compression` or equivalent. Relies entirely on server-side on-the-fly compression (if available). No pre-compressed `.br` or `.gz` assets.

5. **No manual chunk splitting** — No `build.rollupOptions.output.manualChunks` configured. React, Recharts, and application code all land in one chunk, meaning any app code change invalidates the entire cached bundle.

6. **Data file bloat** — `processed/upgrades.json` contains a `keywordNames` field on all ~500+ entries that is **never read** by the runtime upgrade resolver. Many entries have `null` fields and empty arrays that could be omitted. `enrichment/upgrades.ts` contains ~200+ entries that are just `{ keywords: {} }` with zero meaningful data.

## Scope

- **Build configuration** — Vite config, chunk splitting, compression
- **Code splitting** — Lazy loading of ResultsPanel and its Recharts dependency
- **Data trimming** — Remove unused fields, empty entries, and redundant data from bundled files
- **Tooling** — Bundle analyzer for ongoing visibility
- **No engine changes** — Pure build/load optimization; no game logic or store shape modifications
- **No new frameworks** — No new UI libraries, state management, or build tools

## Architecture

```
BEFORE (single chunk):
┌─────────────────────────────────────────────────────┐
│                   index-*.js (875 KB)                │
│  React + ReactDOM + Zustand + Recharts + d3-*       │
│  + Engine + Stores + All Components                 │
│  + units.json + upgrades.json + keywords.json       │
│  + enrichment/units.ts + enrichment/upgrades.ts     │
└─────────────────────────────────────────────────────┘

AFTER (split chunks):
┌────────────────────────┐  ┌──────────────────────────┐
│ vendor-react.js        │  │ vendor-charts.js         │
│ react + react-dom      │  │ recharts + d3-*          │
│ (~45 KB gz, cached)    │  │ (~65 KB gz, lazy loaded) │
└────────────────────────┘  └──────────────────────────┘

┌────────────────────────┐  ┌──────────────────────────┐
│ data.js                │  │ results-panel.js         │
│ processed JSON         │  │ ResultsPanel + chart     │
│ + enrichment TS        │  │ (lazy loaded)            │
│ (~40-50 KB gz)         │  │ (~5 KB gz)               │
└────────────────────────┘  └──────────────────────────┘

┌────────────────────────┐
│ index.js (main)        │
│ App shell + Attacker   │
│ + Defender + Engine    │
│ + Stores + Zustand     │
│ (~50-60 KB gz)         │
└────────────────────────┘
```

The critical initial load drops from ~213 KB gzipped to ~90–110 KB gzipped (main + vendor-react + data). Recharts and the ResultsPanel load on demand.

## Dependencies

- **Phase 1–8** — existing app must be functional
- No dependency on Phase 14 (shared sections) or Phase 15 (keyword expansion)
- All steps are independent of each other and can be implemented in any order, though the recommended sequence optimizes for measurement-first

---

## Step 1 — Add Bundle Analyzer

**Goal:** Establish visibility into what's in the bundle before making changes.

**Install:**
```bash
npm install -D rollup-plugin-visualizer
```

**Changes:**

### `vite.config.ts`

Add the visualizer plugin behind an environment variable so it only runs when explicitly requested:

```ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({ /* ... existing config ... */ }),
    // Bundle analyzer — run with: ANALYZE=true npm run build
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      filename: 'dist/bundle-report.html',
      gzipSize: true,
      template: 'treemap',
    }),
  ].filter(Boolean),
  // ...
});
```

**Usage:**
```bash
# Normal build (no report)
npm run build

# Build with interactive treemap report
ANALYZE=true npm run build
# PowerShell:
$env:ANALYZE="true"; npm run build
```

**Add to `.gitignore`:**
```
dist/bundle-report.html
```

**Verification:**
- `npm run build` still works normally (no report generated)
- `ANALYZE=true npm run build` opens an interactive HTML treemap showing module sizes
- Capture baseline treemap screenshot for comparison

---

## Step 2 — Lazy Load ResultsPanel + Recharts

**Goal:** Defer loading of the ResultsPanel and its heavy Recharts dependency until the panel is actually rendered. This is the single highest-impact change.

**Estimated savings:** ~65–80 KB gzipped removed from initial load (Recharts + d3 sub-packages + ResultsPanel code).

### `src/App.tsx`

Replace the static import of `ResultsPanel` with `React.lazy`:

```tsx
// BEFORE
import { AttackerPanel, DefenderPanel, ResultsPanel } from './components';

// AFTER
import { lazy, Suspense } from 'react';
import { AttackerPanel, DefenderPanel } from './components';

const ResultsPanel = lazy(() =>
  import('./components/ResultsPanel/ResultsPanel').then(m => ({ default: m.default }))
);
```

Wrap the `ResultsPanel` usage in `Suspense` with a skeleton fallback:

```tsx
<div className="order-3 flex min-h-0 flex-col md:col-span-2 lg:order-2 lg:col-span-1 lg:px-4">
  <div className="flex-1 overflow-y-auto">
    <Suspense fallback={<ResultsPanelSkeleton />}>
      <ResultsPanel />
    </Suspense>
  </div>
</div>
```

The `ResultsPanelSkeleton` is a lightweight placeholder matching the dark theme:

```tsx
function ResultsPanelSkeleton() {
  return (
    <div className="flex h-full items-center justify-center text-gray-500">
      <p>Loading results…</p>
    </div>
  );
}
```

### `src/components/ResultsPanel/ResultsPanel.tsx`

Ensure the component has a `default` export (it should already — verify):

```tsx
export default function ResultsPanel() { /* ... */ }
```

### `src/components/index.ts`

Remove `ResultsPanel` from the barrel export to prevent it from pulling Recharts into the main chunk via barrel side effects:

```ts
// BEFORE
export { ResultsPanel } from './ResultsPanel';

// AFTER
// ResultsPanel is lazy-loaded directly in App.tsx — do NOT re-export here
```

**Verification:**
- `npm run build` — verify a new chunk appears (e.g., `ResultsPanel-*.js`) separate from the main `index-*.js`
- Main chunk size should drop by ~150–200 KB raw (~65–80 KB gzipped)
- `npm run dev` — ResultsPanel still renders correctly
- `npm run test:run` — all existing tests pass (update any test that imports `ResultsPanel` from the barrel)
- Check that the Recharts chunk only loads when the Results panel enters the viewport

---

## Step 3 — Manual Chunk Splitting

**Goal:** Split vendor libraries into stable, independently-cacheable chunks. When app code changes, vendor chunks remain cached. When a library upgrades, only that vendor chunk changes.

### `vite.config.ts`

Add `build.rollupOptions.output.manualChunks`:

```ts
export default defineConfig({
  // ... existing config ...
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'data': [
            'src/data/processed/units.json',
            'src/data/processed/upgrades.json',
            'src/data/processed/keywords.json',
            'src/data/enrichment/units.ts',
            'src/data/enrichment/upgrades.ts',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 300, // KB — warn if any chunk exceeds this
  },
});
```

**Expected chunks after this step:**

| Chunk | Contents | Est. Gzipped |
|-------|----------|-------------|
| `vendor-react` | react + react-dom | ~45 KB |
| `vendor-charts` | recharts + d3-* | ~65 KB (lazy) |
| `data` | JSON + enrichment TS | ~40–50 KB |
| `index` (main) | App + panels + engine + stores + zustand | ~50–60 KB |
| `ResultsPanel` | ResultsPanel + chart component | ~5 KB (lazy) |
| `simulation.worker` | Web Worker | ~20 KB |

**Note:** If Step 2 (lazy loading) is done first, `vendor-charts` will naturally be in the lazy-loaded chunk. The `manualChunks` entry ensures it stays separate even if other code paths import shared d3 utilities.

**Verification:**
- `npm run build` — verify chunk names and sizes in build output
- No chunk exceeds the 300 KB warning limit
- `npm run preview` — app loads and functions correctly
- Check Network tab in DevTools: `vendor-charts` and `ResultsPanel` chunks should only load after ResultsPanel is viewed

---

## Step 4 — Trim Data Files

**Goal:** Remove unused, null, and empty data from the bundled JSON and enrichment files. This reduces the `data` chunk size.

### Step 4a — Strip `keywordNames` from `processed/upgrades.json`

The `keywordNames` field is present on all ~500+ upgrade entries but is **never consumed** by `upgradeResolver.ts` at runtime. It is only used by `scripts/` for enrichment skeleton generation.

**Evidence:** `resolveUpgrade()` in `src/data/upgradeResolver.ts` never accesses `processed.keywordNames`. Unlike `resolveUnit()` which iterates over `processed.keywordNames` to build keyword maps, the upgrade resolver gets all keywords exclusively from enrichment data.

**Changes:**

1. **`scripts/processApiData.ts`** — Add a post-processing step that produces a runtime variant of `upgrades.json` without `keywordNames`. Or: emit two files — `upgrades.json` (full, for scripts) and `upgrades-runtime.json` (stripped, for bundling).

2. **`src/data/upgradeResolver.ts`** — Import from the stripped file:
   ```ts
   // BEFORE
   import rawUpgrades from './processed/upgrades.json';
   // AFTER
   import rawUpgrades from './processed/upgrades-runtime.json';
   ```

3. **`src/data/types.ts`** — Make `keywordNames` optional in `ProcessedUpgrade`:
   ```ts
   export interface ProcessedUpgrade {
     // ... existing fields ...
     keywordNames?: string[]; // Optional — present in full JSON, stripped for runtime
   }
   ```

**Estimated savings:** ~15–25 KB raw, ~3–5 KB gzipped.

### Step 4b — Omit null/empty fields from processed JSON

Many fields in `units.json` and `upgrades.json` have boilerplate null/empty values:

| Field | Default | Frequency |
|-------|---------|-----------|
| `title` | `null` | ~80% of units |
| `affiliation` | `null` | ~85% of units |
| `alignmentRestriction` | `null` | ~90% of upgrades |
| `requiredUpgradeSlot` | `null` | ~95% of upgrades |
| `unitTypeRestrictions` | `[]` | ~70% of upgrades |
| `unitRestrictions` | `[]` | ~85% of upgrades |
| `unitsDisallowedOn` | `[]` | ~90% of upgrades |
| `rankRestrictions` | `[]` | ~60% of upgrades |
| `factionRestrictions` | `[]` | ~40% of upgrades |

**Changes:**

1. **`scripts/processApiData.ts`** — Omit fields when they are `null` or `[]`:
   ```ts
   // Strip null/empty fields for runtime
   if (upgrade.title === null) delete output.title;
   if (upgrade.alignmentRestriction === null) delete output.alignmentRestriction;
   if (upgrade.unitRestrictions?.length === 0) delete output.unitRestrictions;
   // etc.
   ```

2. **`src/data/types.ts`** — Make these fields optional in the `ProcessedUpgrade` and `ProcessedUnit` interfaces:
   ```ts
   export interface ProcessedUpgrade {
     apiId: number;
     id: string;
     name: string;
     cost: number;
     upgradeSlot: string;
     factionRestrictions?: string[];       // was required
     rankRestrictions?: string[];          // was required
     unitTypeRestrictions?: string[];      // was required
     unitRestrictions?: string[];          // was required
     affiliationRestrictions?: string[];
     alignmentRestriction?: string | null;
     unitsDisallowedOn?: string[];         // was required
     keywordNames?: string[];
     addsUpgradeSlot?: string | null;
     requiredUpgradeSlot?: string | null;
   }
   ```

3. **Resolver updates** — Default to `null`/`[]` when the field is absent:
   ```ts
   // In upgradeResolver.ts
   const factionRestrictions = processed.factionRestrictions ?? [];
   const unitRestrictions = processed.unitRestrictions ?? [];
   // etc.
   ```

**Estimated savings:** ~30–50 KB raw, ~5–10 KB gzipped.

### Step 4c — Remove empty enrichment entries

`src/data/enrichment/upgrades.ts` contains ~200–250 entries consisting solely of `{ keywords: {} }` — they contribute zero data to the resolved upgrade. Both `unitResolver.ts` and `upgradeResolver.ts` already handle missing enrichment gracefully via optional chaining (`const enrichment: UpgradeEnrichment | undefined = UPGRADE_ENRICHMENTS[processed.id]`).

The only behavioral change is that `isEnriched` flips from `true` to `false` for removed entries. **`isEnriched` is confirmed unused** by any component, store, hook, or engine module — it exists only as a diagnostic flag in test assertions and debug scripts.

**Which entries to remove:** Any entry where the entire value is `{ keywords: {} }` — no `weapons`, no `surgeOverrides`, no `isGrenade`, no `addsMiniature`, no `noncombatant`, no `addsUpgradeSlot`.

**Procedure:**

1. Write a script to identify all empty entries (for auditability).
2. Remove them from `src/data/enrichment/upgrades.ts`.
3. Add a code comment explaining that missing entries default safely:
   ```ts
   /**
    * Upgrade enrichment data.
    * 
    * Entries with no meaningful data (only `{ keywords: {} }`) are intentionally
    * omitted — the resolvers handle missing enrichment entries gracefully via
    * optional chaining. To add enrichment for a new upgrade, simply add its
    * entry to this map.
    */
   ```
4. Do the same audit on `src/data/enrichment/units.ts` — remove any entries that are `{ keywords: {} }` with no `weapons`, no `attackSurgeChart`, no `defenseSurgeChart`, no `miniatureCount`, no `upgradeBarOverride`.

**Estimated savings:** ~10–15 KB raw from `upgrades.ts`, plus any from `units.ts`. ~2–4 KB gzipped.

### Step 4d — Deduplicate upgrade entries

There are confirmed duplicate entries in `processed/upgrades.json` (e.g., `armament-a-180` appearing twice with different `apiId` values). These duplicates inflate both the processed JSON and potentially the enrichment files.

**Changes:**

1. **`scripts/processApiData.ts`** — Add deduplication logic (prefer higher `apiId` or first-seen).
2. **Re-run processing** — regenerate `upgrades.json` with deduplication.

**Estimated savings:** Minor (~2–5 KB raw), but improves data integrity.

---

## Step 5 — Build Compression

**Goal:** Pre-generate Brotli and gzip compressed assets at build time. This enables static hosts (Netlify, Cloudflare Pages, Vercel, nginx with `gzip_static`) to serve pre-compressed files without CPU overhead, achieving better compression ratios than on-the-fly compression.

**Install:**
```bash
npm install -D vite-plugin-compression2
```

**Changes:**

### `vite.config.ts`

```ts
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({ /* ... */ }),
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br|gz)$/],
    }),
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br|gz)$/],
    }),
    // ... visualizer (from Step 1)
  ],
  // ...
});
```

**Output:** For each `.js` and `.css` file in `dist/assets/`, the plugin generates:
- `*.js.gz` — gzip compressed
- `*.js.br` — Brotli compressed (typically 15–25% smaller than gzip)

**Hosting configuration:** Most modern static hosts (Netlify, Cloudflare Pages, Vercel) auto-detect `.br`/`.gz` pre-compressed files. For nginx, add:
```nginx
gzip_static on;
brotli_static on;
```

**Verification:**
- `npm run build` — verify `.br` and `.gz` files appear in `dist/assets/`
- Compare gzip vs Brotli sizes
- Serve via `npm run preview` and check `Content-Encoding` headers in DevTools

---

## Step 6 (Optional) — Replace Recharts with Custom SVG

**Goal:** Eliminate the Recharts dependency entirely by replacing the single bar chart with a hand-rolled SVG implementation. This removes ~230 KB minified / ~65 KB gzipped from the total download.

**Scope:** Only one file uses Recharts: `src/components/ResultsPanel/WoundDistributionChart.tsx` (210 lines). It renders a grouped bar chart with:
- Imported components: `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `Cell`
- 1–4 series (comparison slots), each with a distribution of wound counts (0–N)
- Custom tooltip showing percentage values
- Color-coded bars per series
- Dark theme styling

**Implementation approach:**
- Replace `WoundDistributionChart.tsx` internals with raw `<svg>` elements
- Use `viewBox` for responsive sizing (replaces `ResponsiveContainer`)
- Compute bar positions with simple arithmetic (replaces d3-scale)
- Draw `<rect>` elements for bars, `<line>` elements for grid, `<text>` for labels
- Custom tooltip via absolute-positioned `<div>` on mouse hover
- Total implementation: ~150–200 lines, zero dependencies

**Trade-offs:**

| | Recharts | Custom SVG |
|---|---|---|
| Bundle cost | ~230 KB min / ~65 KB gz | 0 KB |
| Feature richness | Animation, legends, tooltips, accessibility | Manual implementation |
| Maintenance | Library updates | Own code |
| Time to implement | Already done | ~2–4 hours |

**Decision:** This step is optional. If Step 2 (lazy loading) is implemented, Recharts only loads when the ResultsPanel is viewed — the initial load impact is eliminated. This step removes Recharts from the *total* download, which matters for:
- PWA offline cache size
- Low-bandwidth/mobile users
- Overall app weight

**If proceeding:**

1. Implement custom `WoundDistributionChart` using SVG in place
2. Remove `recharts` from `package.json`
3. Remove `vendor-charts` from `manualChunks` (Step 3)
4. Run chart-related tests to verify visual parity

---

## Step 7 (Optional) — Dynamic Data Loading

**Goal:** Move processed JSON files out of the JS bundle entirely by fetching them at runtime from `public/data/`.

**This is a larger refactor** that changes the data loading model from synchronous static imports to asynchronous fetch + cache. It touches the resolvers, stores, and potentially components.

**Current pattern (synchronous):**
```ts
// unitResolver.ts
import rawUnits from './processed/units.json';
// Immediately available — no async needed
```

**Proposed pattern (async):**
```ts
// unitResolver.ts
let _units: ProcessedUnit[] | null = null;

export async function loadUnits(): Promise<void> {
  if (_units) return;
  const response = await fetch('/data/units.json');
  _units = await response.json();
}

export function getResolvedUnits(): ResolvedUnit[] {
  if (!_units) throw new Error('Units not loaded — call loadUnits() first');
  // ... resolution logic
}
```

**Required changes:**
1. Move `src/data/processed/*.json` → `public/data/*.json`
2. Refactor `unitResolver.ts`, `upgradeResolver.ts`, `keywordMap.ts` to async loading
3. Add a loading state to stores that depend on data
4. Add a top-level data loading gate in `App.tsx` or a `DataProvider`
5. Handle loading/error states in the UI

**Trade-offs:**
- **Pro:** Removes ~300+ KB raw from the JS bundle. JSON files get independent HTTP caching. Can be versioned/updated without rebuilding the app.
- **Con:** Adds async complexity. Requires loading states. First paint must wait for fetch. More failure modes (network errors). ~4–6 hours of implementation.

**Decision:** Only pursue if Steps 1–5 are insufficient to meet the <500 KB target after minification. With Step 2 (lazy loading) and Step 4 (data trimming), the main chunk should already be well under the limit.

---

## Implementation Order

```
Step 1: Bundle Analyzer        ← Do first (measurement baseline)
    ↓
Step 2: Lazy Load ResultsPanel ← Highest ROI single change
    ↓
Step 3: Manual Chunk Splitting ← Improves caching, depends on Step 2 for best effect
    ↓
Step 4: Trim Data Files        ← Independent, can parallelize with Steps 2/3
  Step 4a: Strip keywordNames from upgrades.json
  Step 4b: Omit null/empty fields from processed JSON
  Step 4c: Remove empty enrichment entries
  Step 4d: Deduplicate upgrade entries
    ↓
Step 5: Build Compression      ← Independent, quick win
    ↓
Step 6: Replace Recharts       ← Optional, only if total size still a concern
    ↓
Step 7: Dynamic Data Loading   ← Optional, only if main chunk > 500 KB after Steps 1–5
```

After each step:
- `npm run build` — verify chunk sizes improved
- `npm run typecheck` — must pass (0 errors)
- `npm run lint` — must pass (0 errors)
- `npm run test:run` — all existing tests pass

After all steps:
- Compare final treemap to baseline (Step 1)
- `npm run preview` — full smoke test
- Verify lazy loading in browser DevTools Network tab
- Verify pre-compressed assets served correctly

## Estimated Impact

| Step | Main Chunk Δ (gz) | Total Download Δ (gz) | Effort |
|------|-------------------|-----------------------|--------|
| 1. Bundle Analyzer | 0 | 0 | 15 min |
| 2. Lazy Load ResultsPanel | **−65–80 KB** | 0 (deferred) | 30 min |
| 3. Manual Chunk Splitting | 0 (reorganized) | 0 | 15 min |
| 4. Trim Data Files | −10–20 KB | −10–20 KB | 1–2 hrs |
| 5. Build Compression | 0 (runtime benefit) | −15–25% transfer size | 15 min |
| 6. Replace Recharts (opt.) | 0 (already lazy) | **−65 KB** | 2–4 hrs |
| 7. Dynamic Data (opt.) | −40–50 KB | 0 (deferred) | 4–6 hrs |
| **Steps 1–5 combined** | **~213 KB gz → ~80 KB gz initial** | **~15–25% smaller transfer** | **~3 hrs** |

**Target after Steps 1–5:** Main chunk under 300 KB raw / 80 KB gzipped. Total initial load under 130 KB gzipped (main + vendor-react + data). Vite's 500 KB chunk warning eliminated.

## Testing Strategy

- **No new behavioral tests required** — these changes are build/load optimizations, not logic changes.
- **Existing tests** must continue to pass after each step (`npm run test:run`).
- **Step 4 (data trimming)** carries the most regression risk — resolver tests and preset generation tests are the primary safety net.
- **Step 2 (lazy loading)** may require test file import path updates if any test imports `ResultsPanel` from the barrel (`src/components/index.ts`).
- **Step 6 (custom chart)** needs visual regression verification — capture before/after screenshots of the chart with known data.

For Steps 4a–4d, before removing any data:
1. Run `npm run test:run` — capture passing test count
2. Make the data change
3. Run `npm run test:run` — verify identical pass count
4. Load the app in dev mode and exercise the Unit Builder (preset selection, upgrade equipping) to verify no resolution failures

## Architectural Notes

- **Lazy loading boundary:** `ResultsPanel` is the natural split point because (1) it's the only consumer of Recharts, (2) it's not needed until the user views results, (3) it has no shared state that other panels depend on reading synchronously.
- **Data chunk vs lazy loading:** The data files are split into their own chunk (`data`) but are NOT lazy loaded — they load eagerly because the Attacker and Defender panels need resolved data immediately for preset selectors. True lazy loading of data (Step 7) would require async store initialization.
- **Barrel export removal:** Removing `ResultsPanel` from `src/components/index.ts` is required to prevent Rollup from pulling Recharts into the main chunk via the barrel's module graph. The barrel pattern works against code splitting.
- **PWA precache impact:** Splitting chunks increases the number of precached files but should reduce total precache size (especially after Step 4 trimming and if Step 6 eliminates Recharts). The workbox `globPatterns` already covers `**/*.js` so new chunks are auto-included.

## Non-Goals

- Do not add new frameworks or build tools beyond the visualizer and compression plugins.
- Do not migrate away from Vite, Zustand, or React.
- Do not refactor the engine, store shape, or component architecture.
- Do not implement SSR, SSG, or server components.
- Do not optimize the simulation Web Worker (already separate; its 20 KB is not a concern).
- Do not optimize CSS (32 KB raw / 6 KB gzipped is minimal; Tailwind v4 already tree-shakes).
- Do not address the pre-existing `cacheDodgeX` TypeScript error (out of scope — tracked separately).