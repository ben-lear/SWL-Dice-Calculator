# Phase 19 — Mobile Layout Overhaul & CSS Standardization

## Overview

Full mobile UX pass addressing all 12 issues from the [mobile audit](./mobile-audit-findings.md), combined with a CSS/styling standardization effort that extracts repeated patterns into shared abstractions. The `sm:` breakpoint (640px) is the universal boundary between mobile and non-mobile layouts. Work is organized into 9 sequential steps, each independently testable.

**Primary goals:**
1. Drop the sticky header from 173px (26% of viewport) to ≤60px on mobile portrait, eliminate all text overlapping/clipping, and make every interactive element comfortably tappable.
2. Extract repeated Tailwind class strings into `@layer` utility classes, deduplicate copy-pasted sub-components, and consolidate scattered color tokens — reducing maintenance burden while the files are already being touched.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mobile breakpoint | `sm:` (640px) | Standard Tailwind default; stays below existing `md:` (768px) App-level grid switch |
| Header strategy | Collapse: hide logo + subtitle, stack Attack Type | Most aggressive space savings (~173px → ~50–56px) |
| Touch target sizing | Mobile-only via `sm:` breakpoint | Desktop retains compact sizing; mobile gets 44px minimums |
| Checkbox grids | Also single-column on mobile | Longer labels ("Complete the Mission", "Immune: Melee Pierce") wrap at 2-col |
| New dependencies | None | All fixes use standard Tailwind v4 responsive utilities |

---

## Current State

Only **4 of ~30+ component files** use any responsive breakpoint prefix. The app was designed desktop-first with zero component-level mobile adaptations:

- **Header:** No responsive classes. Logo 64×64px fixed, title wraps to 3 lines, subtitle to 4 lines, "Attack Type" label overlaps title text, "Overrun" button clips off-screen.
- **Grids:** All `grid-cols-2` unconditionally — labels squeezed to ~55px, wrapping to 2 lines.
- **Touch targets:** 151 of 155 interactive elements below 44×44px WCAG minimum.
- **Results buttons:** All three in a single `flex` row, text wraps to 2–3 lines.

---

## CSS Standardization Audit

A codebase-wide audit found **19 repeated styling patterns** across ~30 component files. The highest-value extractions are integrated into Steps 0a–0c below, which should be completed **before** the mobile layout work so that the mobile changes can reference the new abstractions instead of adding more ad-hoc utility strings.

### Pattern Catalog

| # | Pattern | Occurrences | Semantic Concept |
|---|---------|-------------|------------------|
| 1 | `text-xs font-bold uppercase tracking-wider text-gray-400` | 8 | Section heading |
| 2 | `text-sm font-medium text-gray-300 select-none` | 5+ | Form control label |
| 3 | `flex items-center justify-between gap-2` + disabled opacity | 4+ | Field row wrapper |
| 4 | `border border-gray-700 bg-gray-800 ... focus:border-blue-500 focus:ring-1 focus:ring-blue-500` | 5+ | Input surface |
| 5 | `disabled:cursor-not-allowed disabled:text-gray-500/600` | 11 | Disabled state |
| 6 | `rounded-lg bg-gray-800 p-3 text-center` + label/value pair | 2 files (identical) | Stat card |
| 7 | `flex items-center justify-between rounded bg-gray-800/50 px-3 py-1.5 text-sm` | 2 files (near-identical) | Stat row |
| 8 | `COLOR_MAP: Record<string, string>` (4-color palette) | 4 files | Series color tokens |
| 9 | `grid grid-cols-2 gap-x-2 gap-y-2` | 5 | Keyword spinner grid |
| 10 | `grid grid-cols-2 gap-x-4 gap-y-1.5` | 3 | Checkbox keyword grid |
| 11 | Chevron rotation `text-gray-500 transition-transform duration-200` + rotate | 3 | Collapse indicator |
| 12 | Max-height collapse transition + overflow + opacity | 3 | Collapsible container |
| 13 | `rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white ...` | 3 buttons | Primary button |
| 14 | `bg-blue-600 text-white` / `bg-transparent text-gray-400 hover:text-gray-200` | 2 | Active segment |
| 15 | Various `space-y-2/3/4` | ~16 | Vertical spacing (keep as-is) |
| 16 | `text-gray-400` | 21+ | Muted text (keep as primitive) |
| 17 | `text-gray-300` | 21+ | Body/label text (keep as primitive) |
| 18 | Three different `focus:ring-*` patterns | 8+ | Focus ring variants |
| 19 | `getHexColor` / `getSeriesHexColor` / `getSeriesColor` helpers | 4 | Color helper duplication |

**Patterns 15-17** are fundamental Tailwind primitives — no extraction needed.
**Pattern 18** is partially handled by the global `focus-visible` rule in `index.css` — individual components override it; unification is worthwhile but out of scope for this phase.

---

## Step 0a — Tailwind `@layer` Utility Classes

**File:** `src/index.css`

### Purpose

Extract the 5 most-repeated class string patterns into named `@layer components` classes. This reduces duplication, ensures consistency, and makes mobile-responsive overrides easier (change once, apply everywhere).

### New classes

```css
@layer components {
  /* Section heading — 8 occurrences */
  .section-heading {
    @apply text-xs font-bold uppercase tracking-wider text-gray-400;
  }

  /* Form control label — 5+ occurrences */
  .control-label {
    @apply text-sm font-medium text-gray-300 select-none;
  }

  /* Input surface — 5+ occurrences (select, combobox, number spinner, etc.) */
  .input-surface {
    @apply rounded border border-gray-700 bg-gray-800 text-sm text-gray-100 outline-none
           focus:border-blue-500 focus:ring-1 focus:ring-blue-500
           disabled:cursor-not-allowed;
  }

  /* Keyword spinner grid — 5 occurrences (becomes responsive in Step 2) */
  .keyword-grid {
    @apply grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2;
  }

  /* Checkbox keyword grid — 3 occurrences (becomes responsive in Step 2) */
  .checkbox-grid {
    @apply grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5;
  }
}
```

### Migration plan

After adding the classes, update each usage site to reference the new class name instead of the inline utility string:

| Class | Files to update |
|-------|----------------|
| `.section-heading` | `SectionHeader.tsx`, `PreDefenseStats.tsx`, `ResultsPanel.tsx`, `WoundDistributionChart.tsx`, `CumulativeTable.tsx`, `SecondaryStats.tsx`, `EfficiencyDisplay.tsx`, `PanelShell.tsx` (variant: `text-gray-300` → keep override alongside) |
| `.control-label` | `Toggle.tsx`, `Select.tsx`, `SegmentedControl.tsx`, `SearchableCombobox.tsx`, `NumberSpinner.tsx` |
| `.input-surface` | `Select.tsx`, `SearchableCombobox.tsx` (input + dropdown), `NumberSpinner.tsx`, `SegmentedControl.tsx` (container) |
| `.keyword-grid` | `WeaponKeywordsSection.tsx`, `AttackerUnitKeywordsSection.tsx`, `AttackerTokensSection.tsx`, `DefenderCustomPoolView.tsx` (×2) |
| `.checkbox-grid` | `WeaponKeywordsSection.tsx`, `AttackerUnitKeywordsSection.tsx`, `DefenderCustomPoolView.tsx` |

**Note:** `.keyword-grid` and `.checkbox-grid` bake in the mobile-responsive `grid-cols-1 sm:grid-cols-2` from Step 2, so Step 2 changes become zero-diff for these files — the responsiveness is defined once in the CSS layer.

### Verification
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] Visual appearance unchanged at all viewport sizes (classes produce identical styles)

---

## Step 0b — Shared Components: StatCard, StatRow, CollapseChevron

**New files:**
- `src/components/shared/StatCard.tsx`
- `src/components/shared/StatRow.tsx`
- `src/components/shared/CollapseChevron.tsx`

### StatCard — deduplicate identical component in 2 files

Currently an identical private `StatCard` + `StatCardProps` interface + `getHexColor` helper exists in both `CoreStats.tsx` and `PreDefenseStats.tsx`. Extract to shared:

```tsx
// src/components/shared/StatCard.tsx
import { getHexColor } from '../../utils/seriesColors';

interface StatCardProps {
  label: string;
  value: string;
  accentColor?: string;
}

export function StatCard({ label, value, accentColor }: StatCardProps) {
  const hexColor = getHexColor(accentColor);
  const style = hexColor ? { borderTopColor: hexColor, borderTopWidth: '2px' } : undefined;

  return (
    <div className="rounded-lg bg-gray-800 p-3 text-center" style={style}>
      <div className="section-heading text-xs font-medium">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-100">
        {value}
      </div>
    </div>
  );
}
```

**Files to update:** `CoreStats.tsx`, `PreDefenseStats.tsx` — remove local `StatCard`, `StatCardProps`, `getHexColor`, `COLOR_MAP`; import from shared.

### StatRow — merge SecondaryStatLine + EfficiencyRow

Currently `SecondaryStats.tsx` has `SecondaryStatLine` and `EfficiencyDisplay.tsx` has `EfficiencyRow`. They differ by optional `tooltip`, `span2`, and `font-mono` on the value. Merge:

```tsx
// src/components/shared/StatRow.tsx
interface StatRowProps {
  label: string;
  value: string;
  tooltip?: string;
  mono?: boolean;
  className?: string;
}

export function StatRow({ label, value, tooltip, mono, className }: StatRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded bg-gray-800/50 px-3 py-1.5 text-sm ${className ?? ''}`}
      title={tooltip}
    >
      <span className="text-gray-300">{label}</span>
      <span className={`font-semibold text-gray-200 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
```

**Files to update:** `SecondaryStats.tsx` — remove `SecondaryStatLine`, import `StatRow`. `EfficiencyDisplay.tsx` — remove `EfficiencyRow`, import `StatRow` with `mono` and `className="sm:col-span-2"` where needed.

### CollapseChevron — deduplicate animated chevron

The exact same chevron pattern (`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'} ▾`) appears in `SectionHeader.tsx`, `PanelShell.tsx`, and `CumulativeTable.tsx`. Extract:

```tsx
// src/components/shared/CollapseChevron.tsx
interface CollapseChevronProps {
  isExpanded: boolean;
}

export function CollapseChevron({ isExpanded }: CollapseChevronProps) {
  return (
    <span
      className={`text-gray-500 transition-transform duration-200 ${
        isExpanded ? 'rotate-0' : '-rotate-90'
      }`}
      aria-hidden="true"
    >
      ▾
    </span>
  );
}
```

**Files to update:** `SectionHeader.tsx`, `PanelShell.tsx`, `CumulativeTable.tsx` — replace inline chevron `<span>` with `<CollapseChevron isExpanded={isExpanded} />`.

### CumulativeTable collapsible refactor

`CumulativeTable.tsx` inlines its own expand/collapse logic that duplicates `SectionHeader`. After extracting `CollapseChevron`, also refactor `CumulativeTable` to use `SectionHeader` directly (requires adding an optional `className` prop to `SectionHeader`'s button for the extra `px-3` padding).

### Verification
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all existing tests pass
- [ ] Visual appearance of CoreStats, PreDefenseStats, SecondaryStats, EfficiencyDisplay, CumulativeTable unchanged

---

## Step 0c — Shared Series Color Tokens

**New file:** `src/utils/seriesColors.ts`

### Purpose

The same 4-color palette (`indigo`, `emerald`, `amber`, `rose`) is defined in 4 separate files with slightly different shapes and helpers. Consolidate into one source of truth:

```ts
// src/utils/seriesColors.ts
export interface SeriesColor {
  base: string;
  light: string;
}

export const SERIES_COLORS: Record<string, SeriesColor> = {
  indigo: { base: '#6366f1', light: '#818cf8' },
  emerald: { base: '#10b981', light: '#34d399' },
  amber:  { base: '#f59e0b', light: '#fbbf24' },
  rose:   { base: '#f43f5e', light: '#fb7185' },
};

const DEFAULT_COLOR: SeriesColor = SERIES_COLORS.indigo;

/** Get the base hex color for a series slot name. */
export function getHexColor(colorName?: string): string | undefined {
  if (!colorName) return undefined;
  return SERIES_COLORS[colorName]?.base;
}

/** Get the base hex color with a fallback (for chart series). */
export function getSeriesHexColor(colorName: string): string {
  return SERIES_COLORS[colorName]?.base ?? DEFAULT_COLOR.base;
}

/** Get both base and light hex colors (for chart gradients/fills). */
export function getSeriesColor(colorName: string): SeriesColor {
  return SERIES_COLORS[colorName] ?? DEFAULT_COLOR;
}
```

### Migration

| File | Current | After |
|------|---------|-------|
| `CoreStats.tsx` | Local `COLOR_MAP` + `getHexColor` | Import `getHexColor` from `seriesColors` |
| `PreDefenseStats.tsx` | Local `COLOR_MAP` + `getHexColor` | Import `getHexColor` from `seriesColors` |
| `CumulativeTable.tsx` | Local `COLOR_MAP` + `getSeriesHexColor` | Import `getSeriesHexColor` from `seriesColors` |
| `WoundDistributionChart.tsx` | Local `COLOR_MAP` (extended) + `getSeriesColor` | Import `getSeriesColor` from `seriesColors` |

### Verification
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all existing tests pass
- [ ] Chart colors and stat card accent borders are visually identical

---

## Step 1 — Header Redesign

**File:** `src/Layout.tsx`
**Audit issues addressed:** #1 (header height), #2 (text overlap), #3 (Overrun clipped), #12 (landscape)

### Current structure
```
header (sticky top-0 z-20, py-3 px-4)
└── div (flex items-center justify-between)
    ├── div (flex items-center gap-3)
    │   ├── img (h-16 w-16)                    ← 64px logo, always visible
    │   └── div (flex flex-col)
    │       ├── h1 (text-lg)                   ← "Just Roll Crits" — wraps to 3 lines
    │       └── p (text-xs text-gray-400)      ← subtitle — wraps to 4 lines
    └── div (w-auto)
        └── <AttackTypeSelector />             ← squeezed into ~188px, "Overrun" clips
```

### Target structure
```
header (sticky top-0 z-20, py-2 px-4)
└── div (flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0)
    ├── div (flex items-center gap-3)
    │   ├── img (hidden sm:block h-16 w-16)    ← hidden on mobile
    │   └── div (flex flex-col)
    │       ├── h1 (text-lg)                   ← single line on mobile (no competing elements)
    │       └── p (hidden sm:block text-xs)    ← hidden on mobile
    └── div (w-full sm:w-auto)
        └── <AttackTypeSelector />             ← full width on mobile, right-aligned on sm:+
```

### Changes
1. **Header padding:** Reduce `py-3` to `py-2` (saves 8px).
2. **Inner container:** Change `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0`.
3. **Logo `<img>`:** Add `hidden sm:block` (hidden below 640px).
4. **Subtitle `<p>`:** Add `hidden sm:block`.
5. **AttackTypeSelector wrapper:** Change `w-auto` → `w-full sm:w-auto`.

### Expected result
- **Mobile (375px):** Header ≈ 50–56px. Single-line title on row 1, full-width Attack Type radio on row 2. No overlap, no clipping.
- **Desktop (≥640px):** Identical to current layout.

### Verification
- [ ] Header height ≤ 60px at 375×667
- [ ] All 3 attack type options visible and tappable at 320px
- [ ] No text overlap at any viewport width
- [ ] Desktop layout unchanged at ≥640px

---

## Step 2 — Grid Columns: Single-Column on Mobile

**Files:**
- `src/components/AttackerPanel/WeaponKeywordsSection.tsx`
- `src/components/AttackerPanel/AttackerUnitKeywordsSection.tsx`
- `src/components/AttackerPanel/AttackerTokensSection.tsx`
- `src/components/DefenderPanel/DefenderCustomPoolView.tsx`

**Audit issues addressed:** #4 (label wrapping)

### Changes

If Step 0a has been completed, the `.keyword-grid` and `.checkbox-grid` classes already contain `grid-cols-1 sm:grid-cols-2`, so the grid files are already responsive — **no additional changes needed** for those 8 instances.

If Step 0a is skipped or deferred, apply the following manual changes — every `grid grid-cols-2` class on NumberSpinner and Checkbox grids becomes `grid grid-cols-1 sm:grid-cols-2`:

| File | Line(s) | Current | New |
|------|---------|---------|-----|
| `WeaponKeywordsSection.tsx` | ~24 | `grid grid-cols-2 gap-x-2 gap-y-2` | `grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2` |
| `WeaponKeywordsSection.tsx` | ~87 | `grid grid-cols-2 gap-x-4 gap-y-1.5` | `grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5` |
| `AttackerUnitKeywordsSection.tsx` | ~23 | `grid grid-cols-2 gap-x-2 gap-y-2` | `grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2` |
| `AttackerUnitKeywordsSection.tsx` | ~54 | `grid grid-cols-2 gap-x-4 gap-y-1.5` | `grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5` |
| `AttackerTokensSection.tsx` | ~21 | `grid grid-cols-2 gap-x-2 gap-y-2` | `grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2` |
| `DefenderCustomPoolView.tsx` | ~131 | `grid grid-cols-2 gap-x-2 gap-y-2` | `grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2` |
| `DefenderCustomPoolView.tsx` | ~166 | `grid grid-cols-2 gap-x-2 gap-y-2` | `grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2` |
| `DefenderCustomPoolView.tsx` | ~215 | `grid grid-cols-2 gap-x-4 gap-y-1.5` | `grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5` |

### Expected result
- **Mobile:** All keyword/token NumberSpinners render one-per-row. Labels fully visible on a single line. Checkboxes also single-column — no wrapping on "Complete the Mission" or "Immune: Melee Pierce".
- **Desktop (≥640px):** 2-column grids unchanged.

### Verification
- [ ] At 375px, no label wraps to multiple lines
- [ ] At 640px+, grids remain 2-column
- [ ] Page length increases on mobile (expected, mitigated by Step 6 collapsed sections)

---

## Step 3 — Touch Target Sizing (Mobile-Only)

**Files:**
- `src/components/shared/NumberSpinner.tsx`
- `src/components/shared/SegmentedControl.tsx`
- `src/components/shared/Checkbox.tsx`

**Audit issues addressed:** #6 (touch targets below 44×44px)

### NumberSpinner (`NumberSpinner.tsx`)

Change the sizing constants (around line 119):

```tsx
// Before
const buttonSize = compact ? 'h-8 w-6' : 'h-8 w-8';
const inputSize = compact ? 'h-8 w-8' : 'h-8 w-12';

// After
const buttonSize = compact
  ? 'h-11 w-8 sm:h-8 sm:w-6'
  : 'h-11 w-11 sm:h-8 sm:w-8';
const inputSize = compact
  ? 'h-11 w-10 sm:h-8 sm:w-8'
  : 'h-11 w-14 sm:h-8 sm:w-12';
```

This gives **44px height** (`h-11`) on mobile, reverting to 32px on `sm:+`.

### SegmentedControl (`SegmentedControl.tsx`)

Change the radiogroup container (around line 82):

```tsx
// Before
className="inline-flex min-h-[2rem] rounded border ..."

// After
className="inline-flex min-h-[2.75rem] sm:min-h-[2rem] rounded border ..."
```

44px on mobile, 32px on desktop.

### Checkbox (`Checkbox.tsx`)

Two changes:

1. **Checkbox input size:** Change `h-4 w-4` → `h-5 w-5 sm:h-4 sm:w-4` (20px on mobile, 16px on desktop). Full 44px isn't needed because the entire `<label>` acts as the tap target.

2. **Label tap zone height:** Add `min-h-[2.75rem] sm:min-h-0` to the outer `<label>` to ensure the tappable row is ≥44px on mobile:

```tsx
// Before
<label className={`flex select-none items-center gap-2 text-sm ${...}`}>

// After
<label className={`flex select-none items-center gap-2 text-sm min-h-[2.75rem] sm:min-h-0 ${...}`}>
```

### Verification
- [ ] At 375px, NumberSpinner +/− buttons are ≥44×44px
- [ ] At 375px, SegmentedControl radio buttons are ≥44px tall
- [ ] At 375px, Checkbox label rows have ≥44px tap zone
- [ ] At 640px+, all controls revert to current compact sizing
- [ ] Existing unit tests (`NumberSpinner.test.tsx`, `SegmentedControl.test.tsx`) still pass (JSDOM has no viewport, responsive classes don't affect test rendering)

---

## Step 4 — Results Panel Button Layout

**File:** `src/components/ResultsPanel/ResultsPanel.tsx`

**Audit issues addressed:** #5 (button text wrapping), #11 (table header wrapping)

### Button bar changes

```tsx
// Before
<div className="flex gap-2">
  <button className="flex-1 ... px-4 py-2 font-semibold ...">
    {getRunButtonLabel()}
  </button>
  <button className="px-3 py-2 ... text-sm font-semibold ...">
    {confirmingClearResults ? 'Confirm?' : 'Clear Results'}
  </button>
  <button className="px-3 py-2 ... text-sm font-semibold ...">
    {confirmingReset ? 'Confirm?' : 'Clear All'}
  </button>
</div>

// After
<div className="flex flex-wrap gap-2 sm:flex-nowrap">
  <button className="w-full sm:w-auto sm:flex-1 ... px-4 py-2 font-semibold ...">
    {getRunButtonLabel()}
  </button>
  <button className="flex-1 sm:flex-none px-3 py-2 ... text-sm font-semibold ...">
    {confirmingClearResults ? 'Confirm?' : 'Clear Results'}
  </button>
  <button className="flex-1 sm:flex-none px-3 py-2 ... text-sm font-semibold ...">
    {confirmingReset ? 'Confirm?' : 'Clear All'}
  </button>
</div>
```

### Layout behavior
- **Mobile:** "Run Simulation" takes full width on row 1. "Clear Results" + "Clear All" split row 2 evenly (`flex-1`). No text wrapping.
- **Desktop:** Single row, same as current layout.

### Cumulative table header

Find the "CUMULATIVE PROBABILITY (≥ X WOUNDS)" heading and add responsive text sizing:
```tsx
// text-sm → text-xs sm:text-sm
```

### Verification
- [ ] At 375px, "Run Simulation" is full-width single-line on its own row
- [ ] At 375px, "Clear Results" + "Clear All" share the second row, no wrapping
- [ ] At 640px+, all three buttons on one row as before
- [ ] Table header fits on one line at 375px

---

## Step 5 — Collapse Keyword Sections on Mobile by Default

**Files:**
- `src/hooks/useIsMobile.ts` (new)
- `src/components/AttackerPanel/AttackerCustomPoolView.tsx`
- `src/components/DefenderPanel/DefenderCustomPoolView.tsx`
- Possibly `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

**Audit issues addressed:** #10 (excessive page height)

### New hook: `useIsMobile`

```ts
// src/hooks/useIsMobile.ts
import { useSyncExternalStore } from 'react';

const query = '(max-width: 639px)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(query).matches;
}

function getServerSnapshot() {
  return false; // SSR fallback: assume desktop
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

Uses React 18's `useSyncExternalStore` for safe, tear-free viewport tracking. Matches the `sm:` breakpoint boundary (639px max = below 640px).

### Usage in panel views

In the Custom Pool views and Unit Builder views, keyword-heavy `SectionHeader` components currently pass `defaultExpanded` as a static prop or leave it defaulting to `true`. Change these to be viewport-aware:

```tsx
import { useIsMobile } from '../../hooks/useIsMobile';

// In the component:
const isMobile = useIsMobile();

// Then for keyword sections:
<SectionHeader title="Weapon Keywords" defaultExpanded={!isMobile}>
<SectionHeader title="Unit Keywords" defaultExpanded={!isMobile}>
// Defender:
<SectionHeader title="Keywords" defaultExpanded={!isMobile}>
<SectionHeader title="Guardian" defaultExpanded={!isMobile}>
```

**Important:** `defaultExpanded` is used as the initial value for `useState` inside `SectionHeader`. This means it only affects the **initial render** — once the user manually expands/collapses a section, their choice persists. This is correct behavior; we don't want sections re-collapsing on viewport resize.

### Sections to collapse on mobile

| Panel | Section | Rationale |
|-------|---------|-----------|
| Attacker | Weapon Keywords | 6 spinners + 6 checkboxes, rarely all used |
| Attacker | Unit Keywords | 3 spinners + 8 checkboxes |
| Defender | Keywords | 5 spinners + 17 checkboxes — largest section |
| Defender | Guardian | Rarely used |

Sections that should remain expanded by default (important for first-time usability):
- Dice Pool, Tokens, Mode/Reroll Strategy (Attacker)
- Defense, Cover, Tokens (Defender)

### Verification
- [ ] At 375px, keyword sections start collapsed on fresh load
- [ ] Tapping a collapsed section expands it normally
- [ ] At 640px+, all sections start expanded as before
- [ ] `useIsMobile` hook has no effect on test rendering (JSDOM `matchMedia` returns false)

---

## Step 6 — Minor Polish

**Audit issues addressed:** #7 (horizontal scrollbar), #8 (Recharts warning), #9 (Crit Fishing truncation)

### 6a. Horizontal scrollbar prevention

Add `overflow-x-hidden` to the root container in `src/Layout.tsx`:
```tsx
// Before
<div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">

// After
<div className="flex min-h-screen flex-col overflow-x-hidden bg-gray-950 text-gray-100">
```

This prevents any stray element overflow from creating a page-level horizontal scrollbar.

### 6b. Recharts width/height warning

Low priority, no user-facing impact. The console warnings `The width(-1) and height(-1) of chart should be greater than 0` occur during initial render before the container is measured. The chart subsequently renders correctly.

**Optional fix:** In the chart's `ResponsiveContainer`, add `minWidth={1} minHeight={1}` as props to avoid the transient negative-dimension state.

### 6c. "Crit Fishing" truncation at 320px

With the Step 1 header changes, the Attack Type selector moves to its own row, freeing space. However, the "Reroll Strategy" segmented control (Conservative / Crit Fishing) is inside the Attacker panel, not the header. At 320px, this control may still be tight.

**Fix:** The SegmentedControl already uses `whitespace-nowrap` on button text. No truncation occurs at 375px. At 320px, the panel content area is ~288px wide, and the "Conservative" + "Crit Fishing" buttons need ~202px total — this fits. If edge cases arise, consider abbreviating to "Crit Fish" or wrapping in a `text-xs sm:text-sm` class. **Monitor but likely no change needed after Step 1.**

### Verification
- [ ] No horizontal scrollbar at any mobile viewport width
- [ ] Recharts warnings resolved (if fix applied) or documented as known low-priority
- [ ] "Crit Fishing" fully visible at 320px

---

## File Change Summary

| File | Steps | Type |
|------|-------|------|
| `src/index.css` | 0a | Edit |
| `src/utils/seriesColors.ts` | 0c | **New** |
| `src/components/shared/StatCard.tsx` | 0b | **New** |
| `src/components/shared/StatRow.tsx` | 0b | **New** |
| `src/components/shared/CollapseChevron.tsx` | 0b | **New** |
| `src/components/shared/SectionHeader.tsx` | 0a, 0b | Edit |
| `src/components/shared/PanelShell.tsx` | 0a, 0b | Edit |
| `src/components/shared/NumberSpinner.tsx` | 0a, 3 | Edit |
| `src/components/shared/SegmentedControl.tsx` | 0a, 3 | Edit |
| `src/components/shared/Checkbox.tsx` | 3 | Edit |
| `src/components/shared/Toggle.tsx` | 0a | Edit |
| `src/components/shared/Select.tsx` | 0a | Edit |
| `src/components/shared/SearchableCombobox.tsx` | 0a | Edit |
| `src/components/ResultsPanel/CoreStats.tsx` | 0b, 0c | Edit |
| `src/components/ResultsPanel/PreDefenseStats.tsx` | 0a, 0b, 0c | Edit |
| `src/components/ResultsPanel/SecondaryStats.tsx` | 0a, 0b | Edit |
| `src/components/ResultsPanel/EfficiencyDisplay.tsx` | 0a, 0b | Edit |
| `src/components/ResultsPanel/CumulativeTable.tsx` | 0a, 0b, 0c | Edit |
| `src/components/ResultsPanel/WoundDistributionChart.tsx` | 0a, 0c | Edit |
| `src/components/ResultsPanel/ResultsPanel.tsx` | 0a, 4 | Edit |
| `src/Layout.tsx` | 1, 6a | Edit |
| `src/components/AttackerPanel/WeaponKeywordsSection.tsx` | 0a, 2 | Edit |
| `src/components/AttackerPanel/AttackerUnitKeywordsSection.tsx` | 0a, 2 | Edit |
| `src/components/AttackerPanel/AttackerTokensSection.tsx` | 0a, 2 | Edit |
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | 0a, 2 | Edit |
| `src/hooks/useIsMobile.ts` | 5 | **New** |
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | 5 | Edit |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | 5 | Edit (if applicable) |

**Total: 5 new files, ~23 edited files. No deleted files. No dependency changes.**

---

## Quality Gate

All of the following must pass before the work is considered complete:

### CSS Standardization (Steps 0a–0c)
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all existing tests pass
- [ ] Visual appearance unchanged at all viewport sizes (pure refactor — zero visual diff)
- [ ] No remaining local `COLOR_MAP` definitions in Results panel files
- [ ] No remaining local `StatCard` definitions in CoreStats/PreDefenseStats
- [ ] Inline `section-heading` utility strings replaced in all 8 occurrences
- [ ] Inline `control-label` utility strings replaced in all 5 occurrences

### Mobile Layout (Steps 1–6)
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all existing tests pass
- [ ] Visual verification at 375×667 (iPhone SE portrait)
- [ ] Visual verification at 320×568 (iPhone SE 1st gen)
- [ ] Visual verification at 667×375 (landscape)
- [ ] No horizontal overflow at any tested width
- [ ] Header ≤ 60px on mobile portrait
- [ ] All attack type options visible and tappable
- [ ] No label text wrapping in keyword/token sections
- [ ] Touch targets ≥ 44px on mobile
- [ ] Desktop layout unchanged at ≥640px

---

## Risk & Rollback

- **Low risk:** Steps 0a–0c are pure refactors — class extractions and component deduplication that produce zero visual change. Steps 1–6 are CSS-only (Tailwind utilities) except the `useIsMobile` hook. No engine, store, or logic changes.
- **Ordering:** Steps 0a–0c should be completed and verified first. They establish the shared abstractions that Steps 1–6 build on. However, each sub-step (0a, 0b, 0c) is independently revertable.
- **Rollback:** Each step is independently revertable. If a step causes unexpected issues, its changes can be reverted without affecting the others.
- **Test impact:** Responsive classes don't affect JSDOM-based tests (no real viewport). Existing tests should pass without modification. Component extractions (StatCard, StatRow, CollapseChevron) preserve the same DOM structure and class names, so snapshot tests (if any) should remain stable.
- **CSS `@layer` interaction:** Tailwind v4 uses CSS layers internally. Adding `@layer components` classes is the idiomatic way to create abstractions in Tailwind v4 and won't conflict with the existing `@layer base` rule in `index.css`.
- **Edge case:** The `useIsMobile` hook reads `window.matchMedia`, which is undefined in JSDOM by default. Vitest/JSDOM typically stubs it as returning `{ matches: false }`. If tests fail, add a `matchMedia` mock to the test setup — but this is unlikely given existing test infrastructure.
