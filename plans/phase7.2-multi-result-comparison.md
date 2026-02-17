# Phase 7.2: Multi-Result Comparison

## Problem Statement

The current Results Panel stores and displays a single simulation result at a time. Users who want to compare different attack/defense configurations (e.g., "6 Red vs White+Cover" vs "4 Black+2 Red vs Red+Dodge") must mentally note or write down previous results. There is no way to overlay distributions or compare statistics side-by-side within the app.

Additionally, there is no single action to reset all form data and results back to defaults — the user must manually clear each field.

---

## Design Overview

### Multi-Result Comparison

Every click of the **Run / Add Simulation** button appends a new result to the Results Panel (up to **4 total**). All saved results are displayed simultaneously:

- **Wound Distribution Chart** — grouped/side-by-side color-coded bars at each wound count, one bar per saved result.
- **Cumulative Probability Table** — one P(≥X) column per saved result, color-coded headers.
- **Core Stats / Secondary Stats / Efficiency** — shown for one result at a time via a **tabbed selector** (slot chips). Clicking a slot chip switches which result's detail stats are displayed.

Each saved result is called a **slot**. Slots are identified by an auto-incrementing label ("Sim 1", "Sim 2"…) with optional user rename. Each slot is assigned a color from a fixed 4-color palette for visual identification across the chart, table, and slot chips.

### User Workflow

1. Configure attacker/defender → click **"Run Simulation"** → result appears as "Sim 1".
2. Button label changes to **"Add Simulation"** (signals additive behavior).
3. Change config → click **"Add Simulation"** → "Sim 2" appears alongside "Sim 1".
4. Chart shows two color-coded bar groups. Table shows two P(≥X) columns.
5. Click a slot chip to view that result's detail stats (Mean/Median/Mode, secondary, efficiency).
6. Click **×** on any slot chip to remove that result from the comparison.
7. At 4 results, the button is disabled with a hint: "Remove a result to run another."

### Reset All

A **"Reset All"** button clears all result slots AND resets all form stores (attacker, defender, attack type) to their factory defaults. A 2-second confirmation guard prevents accidental data loss: first click changes the button to "Confirm Reset?" (red), requiring a second click within 2 seconds to execute.

---

## 7.2-1: Define `ResultSlot` Type and Rework Results Store

**File:** `src/stores/resultsStore.ts`

### New Types

```typescript
/** A single saved simulation result with its context */
export interface ResultSlot {
  /** Unique identifier (e.g., 'slot-1', 'slot-2') */
  id: string;
  /** User-facing label (e.g., 'Sim 1', 'Sim 2'; user-renamable) */
  label: string;
  /** The simulation result data */
  result: SimulationResult;
  /** Snapshot of the config that produced this result */
  configSnapshot: AttackConfig;
  /** Assigned display color (Tailwind class prefix, e.g., 'indigo', 'emerald') */
  color: string;
}
```

### Updated Store Shape

```typescript
export interface ResultsState {
  /** All saved result slots (max 4) */
  slots: ResultSlot[];
  /** Which slot's detail stats are currently viewed (CoreStats, SecondaryStats, Efficiency) */
  viewedSlotId: string | null;
  /** True while a simulation is in progress */
  loading: boolean;
  /** Error message if the last simulation failed */
  error: string | null;
  /** True when config has changed since the last simulation run (from 7.1A) */
  stale: boolean;

  // ── Actions ──
  /** Append a new result slot (no-op if already at max). Auto-labels, assigns color. */
  appendResult: (result: SimulationResult, configSnapshot: AttackConfig) => void;
  /** Remove a slot by ID. Reassigns viewedSlotId if needed. */
  removeSlot: (id: string) => void;
  /** Update a slot's display label */
  renameSlot: (id: string, label: string) => void;
  /** Switch which slot's detail stats are shown */
  setViewedSlotId: (id: string) => void;
  /** Mark results as stale (config changed since last run) */
  markStale: () => void;
  /** Clear all slots and reset to empty state */
  clearAll: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

### Color Palette

A fixed 4-color palette assigned by creation order. Colors are chosen for good contrast on dark backgrounds and distinguishability from each other:

| Slot Index | Color Name | Hex (approx) | Tailwind class |
|------------|-----------|---------------|----------------|
| 0 | Indigo | #6366f1 | `indigo-500` |
| 1 | Emerald | #10b981 | `emerald-500` |
| 2 | Amber | #f59e0b | `amber-500` |
| 3 | Rose | #f43f5e | `rose-500` |

When a slot is removed, its color frees up. New slots take the **lowest available** color index to avoid jarring color shifts.

### Label Counter

A monotonic counter (`nextSimNumber`, starting at 1) incremented on each `appendResult`. Labels are "Sim 1", "Sim 2", etc. The counter **never resets** within a session (except on `clearAll`), so removing "Sim 2" and adding a new result produces "Sim 3", not "Sim 2" again. This avoids confusion.

### Slot Cap

`MAX_SLOTS = 4`. `appendResult` is a no-op when `slots.length >= MAX_SLOTS`.

### Derived Selectors

- `isFull`: `slots.length >= MAX_SLOTS`
- `viewedSlot`: `slots.find(s => s.id === viewedSlotId) ?? null`

### Action Behavior

| Action | Behavior |
|--------|----------|
| `appendResult(result, config)` | If full → no-op. Otherwise: create slot with next label/color, append to `slots`, set `viewedSlotId` to new slot, set `stale: false`, clear `loading`/`error`. |
| `removeSlot(id)` | Remove slot from `slots`. If removed slot was `viewedSlotId` → switch to last remaining slot's ID (or `null`). Freed color index becomes available. |
| `renameSlot(id, label)` | Find slot by ID, update its `label`. |
| `setViewedSlotId(id)` | Set `viewedSlotId` to `id`. |
| `markStale()` | Set `stale: true`. |
| `clearAll()` | Reset: `slots: [], viewedSlotId: null, loading: false, error: null, stale: false`. Reset label counter to 1. |
| `setLoading(v)` | Set `loading`. |
| `setError(e)` | Set `error`, clear `loading`. |

---

## 7.2-2: Update `useSimulation` Hook

**File:** `src/hooks/useSimulation.ts`

### Changes from 7.1A Baseline

- `runSimulation()` calls `getFullConfig()` for the config snapshot, validates dice exist, checks `!isFull` (from store), dispatches to worker, then calls `appendResult(result, configSnapshot)` on success.
- If the store is full (4 slots), `runSimulation()` is a no-op (the button is disabled upstream, but guard here defensively).
- Stale tracking effect (from 7.1A): watches `useFullConfig()`, calls `markStale()` when config changes and `slots.length > 0`. Stale resets to `false` on `appendResult`.
- Config snapshot is captured at dispatch time (before async worker call) to avoid stale closures.

### Updated Signature

```typescript
export function useSimulation(): {
  runSimulation: () => void;
}
```

No change from 7.1A signature — the return value is the same. Internal dispatch target changes from `setResult` to `appendResult`.

---

## 7.2-3: Create `SlotSelector` Component

**File:** `src/components/ResultsPanel/SlotSelector.tsx`

### Props

```typescript
interface SlotSelectorProps {
  slots: ResultSlot[];
  viewedSlotId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, newLabel: string) => void;
}
```

### Rendering

A horizontal flex-wrap row of slot "chips":

```
┌─────────────────────────────────────────────────┐
│ [● Sim 1  ×] [● Sim 2  ×] [● Sim 3  ×]       │
└─────────────────────────────────────────────────┘
```

Each chip:
- **Color dot**: small circle (`w-3 h-3 rounded-full`) filled with the slot's assigned color.
- **Label text**: the slot's label. Double-click enters inline edit mode (text input replaces label, Enter/Escape to confirm/cancel).
- **× button**: removes the slot. Always visible; `onClick` calls `onRemove(id)`.
- **Active state**: the `viewedSlotId` chip has a highlighted border ring in its slot color. Inactive chips use `border-gray-700`.

Styling:
- Track: `flex flex-wrap gap-2`
- Chip: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm bg-gray-800 border cursor-pointer`
- Active chip: `border-{color}-500 ring-1 ring-{color}-500/30`
- Inactive chip: `border-gray-700 hover:border-gray-500`

When 0 slots exist, the component renders nothing (parent shows EmptyState).
When 1 slot exists, still renders the single chip (allows rename and remove).

---

## 7.2-4: Update Run Button — Dynamic Label and Disabled State

**File:** `src/components/ResultsPanel/ResultsPanel.tsx`

### Button Label Logic

| Condition | Label | State |
|-----------|-------|-------|
| `slots.length === 0` | **"Run Simulation"** | Enabled |
| `0 < slots.length < 4` | **"Add Simulation"** | Enabled |
| `slots.length >= 4` | **"Add Simulation"** | Disabled |
| `loading === true` | **"Simulating…"** | Disabled (with spinner) |

### Max-Slots Hint

When `slots.length >= 4` and not loading, render a small hint below the button:
```
Remove a result to run another.
```
Styling: `text-xs text-gray-500 mt-1 text-center`.

---

## 7.2-5: Update `WoundDistributionChart` for Multi-Series

**File:** `src/components/ResultsPanel/WoundDistributionChart.tsx`

### Updated Props

```typescript
interface ChartSeries {
  label: string;
  distribution: DistributionEntry[];
  color: string;  // hex color for this series
  mode: number;
}

interface WoundDistributionChartProps {
  series: ChartSeries[];
}
```

### Rendering

- Union all wound counts across all series to build a shared x-axis domain.
- Transform data into a unified array: `{ wounds: number, [seriesLabel]: probability, ... }` — one key per series.
- Render one Recharts `<Bar>` per series, each with `dataKey={seriesLabel}` and `fill={series.color}`.
- Recharts handles grouped (side-by-side) bars automatically when multiple `<Bar>` elements share the same category axis.
- Mode highlighting: within each series' Bar, the mode wound count uses a slightly lighter shade of that series' color.

### Updated Tooltip

Shows all series values at the hovered wound count:

```
┌─────────────────────────┐
│ 3 wounds                │
│ ● Sim 1: 24.7% (≥51.3%)│
│ ● Sim 2: 18.2% (≥42.1%)│
└─────────────────────────┘
```

### Backward Compatibility

Single-series input renders identically to the current single-bar chart.

---

## 7.2-6: Update `CumulativeTable` for Multi-Result Columns

**File:** `src/components/ResultsPanel/CumulativeTable.tsx`

### Updated Props

```typescript
interface TableSeries {
  label: string;
  distribution: DistributionEntry[];
  color: string;  // hex for header color accent
}

interface CumulativeTableProps {
  series: TableSeries[];
}
```

### Rendering

- Header row: `Wounds` column, then one `P(≥X)` column per series. Each header shows a color dot + label.
- Data rows: union of all wound counts across series. Each cell shows `formatPercent(cumulative)` for that series, or `—` if that wound count doesn't appear in a series.
- Single-series rendering is identical to the current single-column layout.

```
┌──────────┬──────────┬──────────┐
│ Wounds   │ ● Sim 1  │ ● Sim 2  │
├──────────┼──────────┼──────────┤
│ ≥ 1      │  94.2%   │  87.3%   │
│ ≥ 2      │  78.1%   │  64.5%   │
│ ≥ 3      │  51.3%   │  42.1%   │
│ ≥ 4      │  24.7%   │  19.8%   │
│ ≥ 5      │   8.1%   │   5.2%   │
└──────────┴──────────┴──────────┘
```

---

## 7.2-7: Wire Multi-Series and Tabbed Stats in `ResultsPanel`

**File:** `src/components/ResultsPanel/ResultsPanel.tsx`

### Layout Order

```
┌──────────────────────────────────┐
│         RESULTS                  │
│                                  │
│  [Run Simulation] [Reset All]    │
│  ⚠ Config changed — ...         │  ← stale indicator (7.1A)
│                                  │
│  [● Sim 1 ×] [● Sim 2 ×]       │  ← SlotSelector
│                                  │
│  ┌────────────────────────────┐  │
│  │  ▌▌  █▌  ██  ███  █████  │  │  ← multi-series grouped bar chart
│  └────────────────────────────┘  │
│                                  │
│  Wounds │ ● Sim 1 │ ● Sim 2     │  ← multi-column cumulative table
│  ≥ 1    │  94.2%  │  87.3%      │
│  ≥ 2    │  78.1%  │  64.5%      │
│                                  │
│  ── Sim 1 (viewed) ──────────   │  ← tabbed stat detail
│  Mean: 3.21  Median: 3  Mode: 3 │
│  (secondary + efficiency)        │
│                                  │
│  10,000 sims · 42ms             │
└──────────────────────────────────┘
```

### Data Flow

- Read `slots`, `viewedSlotId`, `loading`, `error`, `stale` from store.
- Derive `viewedSlot` from `slots` + `viewedSlotId`.
- Build `series` array for chart/table from all slots.
- Pass only `viewedSlot.result` to `CoreStats`, `SecondaryStats`, `EfficiencyDisplay`.
- Pass `viewedSlot.color` as `accentColor` to `CoreStats`.
- Duration/iterations info reflects the viewed slot.

### Empty / Error States

- `slots.length === 0 && !loading && !error` → `<EmptyState />`
- `error && !loading` → `<ErrorDisplay />`
- Loading overlay shown over existing content (preserves visible results during new simulation).

---

## 7.2-8: Add Accent Color to `CoreStats`

**File:** `src/components/ResultsPanel/CoreStats.tsx`

- Add optional `accentColor?: string` prop.
- When provided, each `StatCard` gets a 2px top-border in that color (e.g., `style={{ borderTopColor: accentColor }}`), visually linking the stats to the corresponding chart series.
- When not provided, renders with no accent (backward-compatible).

---

## 7.2-9: Create `resetAll` Utility

**File:** `src/stores/resetAll.ts`

```typescript
import { useAttackConfigStore } from './attackConfigStore';
import { useDefenseConfigStore } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';
import { useResultsStore } from './resultsStore';

/** Reset all stores to factory defaults. Clears all results and form data. */
export function resetAll(): void {
  useAttackConfigStore.getState().reset();
  useDefenseConfigStore.getState().reset();
  useAttackTypeStore.getState().reset();
  useResultsStore.getState().clearAll();
}
```

Export from `src/stores/index.ts` barrel.

---

## 7.2-10: Add "Reset All" Button to `ResultsPanel`

**File:** `src/components/ResultsPanel/ResultsPanel.tsx`

### Layout

Sits next to the Run/Add Simulation button:

```
[ Add Simulation ]  [ Reset All ]
```

### Styling

- Default: `bg-gray-700 text-gray-300 hover:bg-red-700 hover:text-white` — secondary appearance, communicates destructive intent on hover.
- Confirmation state: `bg-red-700 text-white` with label "Confirm Reset?"
- Disabled during `loading`.

### Confirmation Guard

1. First click → button text changes to **"Confirm Reset?"**, background turns red.
2. A 2-second timeout starts. If clicked again within 2s → `resetAll()` executes.
3. If not clicked within 2s → reverts to "Reset All".
4. Implemented with local component state (`confirmingReset`) and `setTimeout`/`clearTimeout`.

This avoids a disruptive modal while preventing accidental data loss.

---

## 7.2-11: Handle Edge Cases

| Scenario | Behavior |
|----------|----------|
| 0 slots | EmptyState shown. Button says "Run Simulation". |
| 1 slot | Chart/table render single-series (identical to pre-7.2). SlotSelector shows one chip. |
| Removing the viewed slot | `viewedSlotId` auto-switches to last remaining slot, or `null` if empty. |
| Removing all slots | Returns to EmptyState. Button reverts to "Run Simulation". |
| Labels after removal | Counter never resets: removing "Sim 2" then adding → "Sim 4" (not "Sim 2"). |
| `clearAll` | Resets counter to 1. Returns to EmptyState. |
| Worker error during append | `setError(message)` is called; no slot is created. |
| No dice in config | `runSimulation()` calls `clearAll()` and returns (same as 7.1A `clear` behavior). |

---

## 7.2-12: Update Tests

### Store Tests — `src/stores/resultsStore.test.ts`

- `appendResult` creates a slot with correct label, color, and data
- `appendResult` no-ops at 4 slots
- `appendResult` sets `viewedSlotId` to the new slot
- `appendResult` clears `stale`, `loading`, `error`
- `removeSlot` removes the correct slot
- `removeSlot` reassigns `viewedSlotId` when removing the viewed slot
- `removeSlot` sets `viewedSlotId` to `null` when removing last slot
- `renameSlot` updates the label
- `setViewedSlotId` switches correctly
- `markStale` sets `stale: true`
- `clearAll` resets everything including label counter
- Color assignment: slots get lowest available color index
- Color recycling: removed slot's color becomes available for next append

### `resetAll` Tests — `src/stores/resetAll.test.ts`

- Mutate all four stores → call `resetAll()` → verify every store is at defaults
- Verify results slots are cleared
- Verify attack/defense/attackType stores are reset

### Hook Tests — `src/hooks/useSimulation.test.ts`

- `runSimulation` calls `appendResult` with config snapshot (not `setResult`)
- `runSimulation` is no-op when store is full
- Stale tracking calls `markStale` when config changes and slots exist
- Empty pool (no dice) → `clearAll`

### `SlotSelector` Tests — `src/components/ResultsPanel/SlotSelector.test.tsx`

- Renders one chip per slot with correct label and color dot
- Active chip has highlighted border
- Click on inactive chip calls `onSelect`
- Click × calls `onRemove`
- Double-click label enters edit mode; Enter confirms rename
- Renders nothing when slots is empty

### `WoundDistributionChart` Tests

- Single-series: renders one `<Bar>`, backward-compatible
- Multi-series: renders multiple `<Bar>` elements with correct colors
- Tooltip shows all series values

### `CumulativeTable` Tests

- Single-series: renders single P(≥X) column, backward-compatible
- Multi-series: renders one column per series with color-coded headers
- Missing wound counts in a series show `—`

### `ResultsPanel` Integration Tests

- Button label is "Run Simulation" with 0 slots
- Button label changes to "Add Simulation" after first result
- Button disabled at 4 slots with hint message
- SlotSelector appears when slots exist
- Clicking slot chip switches stat detail view
- "Reset All" button exists, calls `resetAll` on double-click confirmation
- "Reset All" disabled during loading

---

## Verification Checklist

After implementation, all of these must pass:

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all tests pass (existing + new)
- [ ] Manual: Click "Run Simulation" → result appears as "Sim 1" → button changes to "Add Simulation"
- [ ] Manual: Change config → click "Add Simulation" → "Sim 2" appears → chart shows two color-coded bar groups
- [ ] Manual: Click "Sim 1" chip → stats cards switch to Sim 1's data
- [ ] Manual: Click × on "Sim 2" → disappears from chips, chart, table
- [ ] Manual: Reach 4 results → button disabled, hint shown → remove one → button re-enabled
- [ ] Manual: Rename "Sim 1" → label updates on chip, chart tooltip, table header
- [ ] Manual: Click "Reset All" → "Confirm Reset?" → click again → all results cleared, all forms reset to defaults
- [ ] Manual: Single result → chart identical to pre-7.2 design
- [ ] Manual: Stale indicator shows when config changes after any run

---

## Assumptions & Decisions

1. **Every Run appends.** No "Save & New" indirection. Single-run users see "Run Simulation" and get the same experience as pre-7.2. Multi-comparison is discovered naturally when the button becomes "Add Simulation."

2. **Disable at 4, don't auto-replace.** User explicitly removes results they no longer need. Prevents accidental loss of comparison data.

3. **Tabbed stats, overlaid chart.** The chart is the natural comparison surface; stats are per-result detail best viewed one at a time to avoid clutter.

4. **Monotonic label counter.** "Sim 1", "Sim 2", "Sim 3"… never reuse labels within a session (counter resets only on `clearAll`). Avoids confusion after removals.

5. **Config snapshot stored per slot.** Enables future re-simulation and stale detection per-slot. Not exposed in UI beyond stale tracking, but architecturally useful.

6. **`resetAll` is a standalone utility**, not inside any single store. It orchestrates four independent store resets. This keeps each store's `reset()` focused on its own state.

7. **Confirmation guard on Reset All.** Two-click (within 2s) prevents accidental wipe without a blocking modal dialog.

8. **No engine changes.** All work is in the store, hook, UI components, and a utility function. The engine remains pure and untouched.

---

## Files Changed (Summary)

| File | Change Type |
|------|-------------|
| `src/stores/resultsStore.ts` | Major rework — slot-based append model |
| `src/stores/resetAll.ts` | **New** — cross-store reset utility |
| `src/stores/index.ts` | Export `resetAll` |
| `src/hooks/useSimulation.ts` | Call `appendResult` with config snapshot |
| `src/components/ResultsPanel/ResultsPanel.tsx` | Slot-aware layout, dynamic button, Reset All button, multi-series wiring |
| `src/components/ResultsPanel/SlotSelector.tsx` | **New** — slot chips with remove/rename |
| `src/components/ResultsPanel/SlotSelector.test.tsx` | **New** |
| `src/components/ResultsPanel/WoundDistributionChart.tsx` | Multi-series grouped bars |
| `src/components/ResultsPanel/CumulativeTable.tsx` | Multi-column layout |
| `src/components/ResultsPanel/CoreStats.tsx` | Optional accent color prop |
| `src/stores/resultsStore.test.ts` | Slot CRUD tests |
| `src/stores/resetAll.test.ts` | **New** — cross-store reset test |
| `src/hooks/useSimulation.test.ts` | `appendResult` + full guard |
| `src/components/ResultsPanel/ResultsPanel.test.tsx` | Multi-slot integration + Reset All |

**No engine files changed.**

---

## Dependencies

- **Phase 7.1A must be completed first.** This plan builds on the imperative simulation pattern (Run button, `stale` state, `runSimulation()` function).
- Independent of Phase 7.1B (SegmentedControl) and Phase 7.1C (hide presets).

---

## Implementation Order

```
7.2-1   Rework resultsStore (slot model, actions, selectors)
7.2-9   Create resetAll utility + barrel export
    │
7.2-2   Update useSimulation hook (appendResult, full guard, stale)
    │
    ├──► 7.2-3   Create SlotSelector component
    ├──► 7.2-5   Update WoundDistributionChart (multi-series)
    ├──► 7.2-6   Update CumulativeTable (multi-column)
    ├──► 7.2-8   Add accent color to CoreStats
    │
7.2-4   Update Run button (dynamic label, disabled at max)
7.2-10  Add Reset All button with confirmation guard
7.2-7   Wire everything in ResultsPanel
7.2-11  Handle edge cases
7.2-12  Update all tests
    │
    └──► Verification: typecheck + lint + test + manual
```

Steps 7.2-3, 7.2-5, 7.2-6, and 7.2-8 are independent of each other and can proceed in parallel after the store is updated.
