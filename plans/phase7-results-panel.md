# Phase 7: Results Panel — Implementation Plan

## Goal

Build the Results Panel that sits between the Attacker and Defender panels, consumes simulation output, and displays core stats (mean, median, mode), a wound distribution bar chart, a cumulative probability table, points efficiency metrics, and secondary stats (Deflect/Shien reflection wounds, Djem So wounds). The panel auto-runs simulation whenever any config changes (debounced), shows a loading state while the worker computes, and remains responsive at all times.

This phase also implements the `useSimulation` hook — the bridge between the Zustand stores (Phase 5A) and the Web Worker (Phase 3B) — which was deferred from earlier phases because it depends on both.

---

## Overview

Phase 7 consists of three sub-phases:

- **7A:** Core Results Display — the `useSimulation` hook, stat cards, bar chart, cumulative table, and secondary stats
- **7B:** Points Efficiency Display — conditional efficiency section shown when unit costs are set
- **7C:** Chart Polish — tooltips, axis formatting, responsive sizing, color coding

Phase 7 depends on:
- **Phase 3B** (Web Worker) — `SimulationWorkerClient` for off-thread simulation execution
- **Phase 3A** (Simulator types) — `SimulationResult`, `StatsSummary`, `DistributionEntry`, `EfficiencyMetrics` from `engine/types.ts`
- **Phase 4** (Shared UI components) — reuses component patterns and Tailwind design tokens
- **Phase 5A** (Zustand stores) — `useFullConfig` selector from `configSelectors.ts`, `useResultsStore` for simulation output state

Phase 7 does **not** depend on:
- Phase 5.5 (Unit Data & Upgrades — Phase 5.5 modifies `getFullConfig()` upstream so that `unitCost` already includes equipped upgrade costs via `upgradeApplicator`. The results panel is unaware of upgrades; it simply consumes the merged config and displays whatever efficiency metrics the engine returns.)
- Phase 6 (UI Panels — the results panel reads from stores, not from panel components)

---

## Design Clarifications

The following design decisions are documented for clarity:

1. **Auto-Simulation on Config Change** — The `useSimulation` hook subscribes to the merged config (via `useFullConfig`) and automatically dispatches a new simulation whenever any input changes. A debounce delay (300ms) prevents excessive worker dispatches during rapid input changes (e.g., holding an increment button). The debounce resets on each change, so only the final config triggers a simulation.

2. **Zero-Dice Guard** — When the attacker has 0 total dice (red + black + white = 0), the hook skips simulation entirely and clears the results store. This avoids wasting worker time on a guaranteed zero-wound result and provides a clear "configure dice to see results" empty state in the UI.

3. **Debounce Timing** — 300ms is chosen as a balance between responsiveness and efficiency. Faster (100–200ms) feels more instant but causes more wasted simulations during spinners. Slower (500ms+) feels sluggish. The user sees a brief loading indicator during the debounce + simulation window, which provides feedback that the app is working.

4. **Loading State** — While a simulation is in progress, the results panel shows a subtle loading indicator (pulsing opacity or a small spinner) overlaid on the existing results. The previous results remain visible during loading to avoid a jarring flash of empty content. Only the initial load (no previous results) shows a placeholder/empty state.

5. **Error Handling** — If the worker throws an error, the results panel displays a brief error message in place of results. This should be rare (engine bugs, out-of-memory on very large pools) but must be handled gracefully. The user can change inputs to trigger a new simulation and clear the error.

6. **Bar Chart Library** — Recharts (installed in Phase 1) provides `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`, and `ResponsiveContainer` components. The chart uses a single `Bar` series with the wound distribution data. Recharts handles responsive sizing via `ResponsiveContainer` which fills its parent's width.

7. **Cumulative Table** — Shows P(≥ X wounds) for each wound value from 0 to max. Values are displayed as percentages with 1 decimal place (e.g., "94.2%"). The table is compact and scrollable if the wound range is large. Rows where cumulative probability rounds to 0.0% are omitted for cleanliness.

8. **Points Efficiency Conditional Display** — The efficiency section is shown only when `attacker.unitCost > 0 OR defender.unitCost > 0`. Individual metrics within the section that require a zero cost are displayed as "—" rather than hidden, to keep the layout stable. Numbers are formatted to 3 decimal places for per-point metrics and 1 decimal place for per-wound metrics.

9. **Secondary Stats** — Deflect/Shien reflection wounds and Djem So wounds are shown only when their mean is > 0. These appear as smaller stat lines below the main stats, clearly labeled as damage dealt back to the attacker. Guardian wound stats (wounds without pierce on the Guardian unit vs. the main target) are shown when `defender.guardianX > 0`.

10. **Chart Color Scheme** — The bar chart uses a single color for wound distribution bars. The primary color is a blue/indigo tone (`#6366f1` / Tailwind `indigo-500`) for wound distribution, consistent with the app's accent color. Hover state uses a lighter variant (`#818cf8` / `indigo-400`). The chart background is transparent to match the dark panel surface.

11. **Number Formatting** — All displayed numbers use consistent formatting:
    - Wound stats (mean, median, mode): 2 decimal places (e.g., "3.21")
    - Percentages: 1 decimal place with "%" suffix (e.g., "94.2%")
    - Efficiency per-point metrics: 4 decimal places (e.g., "0.0300")
    - Efficiency per-wound metrics: 1 decimal place (e.g., "33.3")
    - Efficiency ratio: 6 decimal places (e.g., "0.000600")

12. **Responsive Behavior** — On desktop, the results panel occupies the center column between attacker and defender. On mobile (stacked layout), results appear below the defender panel. The bar chart scales down gracefully via `ResponsiveContainer`. The cumulative table uses a compact layout with smaller font on mobile.

13. **Worker Lifecycle** — The `useSimulation` hook creates a `SimulationWorkerClient` on mount and terminates it on unmount. A `useRef` holds the client to persist across renders. Only one worker instance exists at a time. The hook never creates multiple workers.

14. **Iteration Count** — Fixed at `DEFAULT_ITERATIONS` (10,000) for MVP. No user-configurable iteration count. Future enhancement could add a slider or dropdown.

---

## Step 7A.1 — Implement the `useSimulation` Hook

**File:** `src/hooks/useSimulation.ts`

The core hook that bridges stores and the worker. It subscribes to the merged config, debounces changes, dispatches simulations to the Web Worker, and writes results to the results store.

```ts
import { useEffect, useRef, useCallback } from 'react';
import { useFullConfig } from '../stores/configSelectors';
import { useResultsStore } from '../stores/resultsStore';
import { SimulationWorkerClient } from '../engine/worker/simulationWorkerClient';
import { DEFAULT_ITERATIONS } from '../engine/simulator';
import type { AttackConfig } from '../engine/types';

/** Debounce delay in milliseconds before triggering a simulation */
const DEBOUNCE_MS = 300;

/**
 * Check whether the attack config has any dice to roll.
 * If all dice counts are zero, simulation is skipped.
 */
function hasDice(config: AttackConfig): boolean {
  const { redDice, blackDice, whiteDice } = config.attacker;
  return redDice + blackDice + whiteDice > 0;
}

/**
 * Hook that auto-runs Monte Carlo simulation when config changes.
 *
 * - Subscribes to the merged AttackConfig via useFullConfig()
 * - Debounces changes (300ms) to avoid excessive worker dispatches
 * - Dispatches to the SimulationWorkerClient (off main thread)
 * - Writes results to the ResultsStore
 * - Skips simulation when dice pool is empty
 *
 * Usage: Call once in the App shell or ResultsPanel. No arguments needed.
 *
 * ```tsx
 * function ResultsPanel() {
 *   useSimulation();
 *   const { result, loading, error } = useResultsStore();
 *   // ... render
 * }
 * ```
 */
export function useSimulation(): void {
  const config = useFullConfig();
  const { setResult, setLoading, setError, clear } = useResultsStore();
  const workerRef = useRef<SimulationWorkerClient | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize worker on mount, terminate on unmount
  useEffect(() => {
    workerRef.current = new SimulationWorkerClient();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Run simulation whenever config changes (debounced)
  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }

    // Skip simulation if no dice configured
    if (!hasDice(config)) {
      clear();
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (!workerRef.current) return;

      setLoading(true);

      try {
        const result = await workerRef.current.run(config, DEFAULT_ITERATIONS);
        setError(null); // Clear any previous error on success
        setResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }, DEBOUNCE_MS);

    // Cleanup debounce on re-render or unmount
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [config, setResult, setLoading, setError, clear]);
}
```

**Verify:**
- TypeScript compiles without errors
- The hook creates exactly one `SimulationWorkerClient` instance
- Changing a store field triggers a debounced simulation after 300ms
- Rapid store changes (within 300ms) result in only one simulation
- Setting all dice to 0 calls `clear()` instead of running simulation
- Worker is terminated on component unmount

**Notes:**
- `useFullConfig()` returns a new object reference on every render (because it merges three stores). This causes `useEffect` to fire on every render. This is acceptable because the debounce prevents excessive worker dispatches. If performance becomes an issue, a deep-equality check (via `JSON.stringify` or a custom comparator) can be added — but for MVP the debounce is sufficient.
- The `async` function inside `setTimeout` is safe because errors are caught and written to the store. Unhandled promise rejections won't occur.
- `setLoading(true)` is called immediately when the debounce fires (not when the config changes). This means the user sees a brief period with stale results while the debounce is pending, then a loading indicator, then fresh results. This feels natural.

---

## Step 7A.2 — Create Number Formatting Utilities

**File:** `src/utils/format.ts`

Centralized formatting functions for consistent number display across the results panel.

```ts
/**
 * Format a wound stat (mean, median, mode) to 2 decimal places.
 * Example: 3.21428 → "3.21"
 */
export function formatWoundStat(value: number): string {
  return value.toFixed(2);
}

/**
 * Format a probability (0–1) as a percentage with 1 decimal place.
 * Example: 0.9423 → "94.2%"
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format a per-point efficiency metric to 4 decimal places.
 * Example: 0.03 → "0.0300"
 * Returns "—" for zero or non-finite values.
 */
export function formatPerPoint(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '—';
  return value.toFixed(4);
}

/**
 * Format a per-wound efficiency metric to 1 decimal place.
 * Example: 33.333 → "33.3"
 * Returns "—" for zero or non-finite values.
 */
export function formatPerWound(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '—';
  return value.toFixed(1);
}

/**
 * Format the attacker efficiency ratio to 6 decimal places.
 * Example: 0.0006 → "0.000600"
 * Returns "—" for zero or non-finite values.
 */
export function formatEfficiencyRatio(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '—';
  return value.toFixed(6);
}
```

**Verify:**
- `formatWoundStat(3.21428)` → `"3.21"`
- `formatPercent(0.9423)` → `"94.2%"`
- `formatPercent(1.0)` → `"100.0%"`
- `formatPerPoint(0)` → `"—"`
- `formatPerPoint(0.03)` → `"0.0300"`
- `formatEfficiencyRatio(0.0006)` → `"0.000600"`

---

## Step 7A.3 — Write Unit Tests for Formatting Utilities

**File:** `src/utils/format.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  formatWoundStat,
  formatPercent,
  formatPerPoint,
  formatPerWound,
  formatEfficiencyRatio,
} from './format';

describe('formatWoundStat', () => {
  it('formats to 2 decimal places', () => {
    expect(formatWoundStat(3.21428)).toBe('3.21');
  });

  it('pads to 2 decimal places', () => {
    expect(formatWoundStat(3)).toBe('3.00');
  });

  it('rounds correctly', () => {
    expect(formatWoundStat(3.999)).toBe('4.00');
  });

  it('formats zero', () => {
    expect(formatWoundStat(0)).toBe('0.00');
  });
});

describe('formatPercent', () => {
  it('converts 0–1 to percentage with 1 decimal', () => {
    expect(formatPercent(0.9423)).toBe('94.2%');
  });

  it('formats 100%', () => {
    expect(formatPercent(1.0)).toBe('100.0%');
  });

  it('formats 0%', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats small probabilities', () => {
    expect(formatPercent(0.001)).toBe('0.1%');
  });
});

describe('formatPerPoint', () => {
  it('formats non-zero to 4 decimal places', () => {
    expect(formatPerPoint(0.03)).toBe('0.0300');
  });

  it('returns dash for zero', () => {
    expect(formatPerPoint(0)).toBe('—');
  });

  it('returns dash for Infinity', () => {
    expect(formatPerPoint(Infinity)).toBe('—');
  });

  it('returns dash for NaN', () => {
    expect(formatPerPoint(NaN)).toBe('—');
  });
});

describe('formatPerWound', () => {
  it('formats non-zero to 1 decimal place', () => {
    expect(formatPerWound(33.333)).toBe('33.3');
  });

  it('returns dash for zero', () => {
    expect(formatPerWound(0)).toBe('—');
  });
});

describe('formatEfficiencyRatio', () => {
  it('formats non-zero to 6 decimal places', () => {
    expect(formatEfficiencyRatio(0.0006)).toBe('0.000600');
  });

  it('returns dash for zero', () => {
    expect(formatEfficiencyRatio(0)).toBe('—');
  });
});
```

**Run:** `npm test format.test.ts`

**Expected:** All tests pass.

---

## Step 7A.4 — Create the Core Stats Display Component

**File:** `src/components/ResultsPanel/CoreStats.tsx`

Displays mean, median, and mode wounds as prominent stat cards.

```tsx
import { formatWoundStat } from '../../utils/format';
import type { StatsSummary } from '../../engine/types';

interface CoreStatsProps {
  stats: StatsSummary;
}

export default function CoreStats({ stats }: CoreStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Mean" value={formatWoundStat(stats.mean)} />
      <StatCard label="Median" value={formatWoundStat(stats.median)} />
      <StatCard label="Mode" value={formatWoundStat(stats.mode)} />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg bg-gray-800 p-3 text-center">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-100">
        {value}
      </div>
    </div>
  );
}
```

**Verify:**
- Renders three stat cards with correct labels and formatted values
- Cards use consistent dark theme styling (gray-800 surface, gray-100 text)
- Grid layout is responsive (3 columns on all sizes; cards compress gracefully)

**Notes:**
- The `StatCard` sub-component is intentionally not exported — it's an internal layout primitive. If reuse is needed elsewhere (unlikely), it can be extracted to `shared/`.
- `mode` is displayed with 2 decimal places for consistency, even though it's typically an integer. If the mode is exactly `3`, it displays as `"3.00"`.

---

## Step 7A.5 — Create the Wound Distribution Bar Chart Component

**File:** `src/components/ResultsPanel/WoundDistributionChart.tsx`

Renders a bar chart showing the probability of each wound count using Recharts.

```tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DistributionEntry } from '../../engine/types';
import { formatPercent } from '../../utils/format';

interface WoundDistributionChartProps {
  distribution: DistributionEntry[];
}

/** Transform distribution data for Recharts (probability → percentage). */
function toChartData(distribution: DistributionEntry[]) {
  return distribution.map((entry) => ({
    wounds: entry.wounds,
    probability: entry.probability * 100, // Chart shows 0–100
    raw: entry.probability,               // Keep raw for tooltip
  }));
}

/** Custom tooltip for bar hover. */
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { wounds: number; raw: number } }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-md bg-gray-900 px-3 py-2 text-sm shadow-lg border border-gray-700">
      <div className="text-gray-400">
        {data.wounds} wound{data.wounds !== 1 ? 's' : ''}
      </div>
      <div className="font-semibold text-gray-100">
        {formatPercent(data.raw)}
      </div>
    </div>
  );
}

export default function WoundDistributionChart({
  distribution,
}: WoundDistributionChartProps) {
  const data = toChartData(distribution);

  return (
    <div className="h-52 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            vertical={false}
          />
          <XAxis
            dataKey="wounds"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            label={{
              value: 'Wounds',
              position: 'insideBottom',
              offset: -2,
              fill: '#9ca3af',
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={{ stroke: '#4b5563' }}
            tickFormatter={(v: number) => `${v}%`}
            label={{
              value: 'Probability',
              angle: -90,
              position: 'insideLeft',
              offset: 20,
              fill: '#9ca3af',
              fontSize: 12,
            }}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
          />
          <Bar dataKey="probability" radius={[2, 2, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill="#6366f1" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Verify:**
- Chart renders with correct wound values on X-axis
- Y-axis shows percentage values with "%" suffix
- Bars are indigo-500 color (`#6366f1`)
- Hovering a bar shows tooltip with wound count and formatted percentage
- Chart scales responsively within its container
- Grid lines are subtle gray, consistent with dark theme
- No bars render outside the data range (0 to max wounds)

**Notes:**
- `ResponsiveContainer` must be wrapped in a sized `div` — the `h-52` / `sm:h-64` classes provide the necessary height constraints.
- Left margin is negative (`-12`) to compensate for Y-axis label padding and keep the chart visually centered.
- `Cell` components are used per-bar to allow future per-bar coloring (e.g., highlighting the mode).
- The tooltip uses the raw probability (0–1) fed through `formatPercent` for consistent formatting.

---

## Step 7A.6 — Create the Cumulative Probability Table Component

**File:** `src/components/ResultsPanel/CumulativeTable.tsx`

Displays P(≥ X wounds) for each wound value in a compact table.

```tsx
import type { DistributionEntry } from '../../engine/types';
import { formatPercent } from '../../utils/format';

interface CumulativeTableProps {
  distribution: DistributionEntry[];
}

/**
 * Minimum cumulative probability to display a row.
 * Rows below this threshold are omitted for cleanliness.
 * 0.001 = 0.1% — anything rounding to 0.0% is hidden.
 */
const MIN_CUMULATIVE = 0.0005;

export default function CumulativeTable({
  distribution,
}: CumulativeTableProps) {
  // Filter out rows where cumulative rounds to 0.0%
  const visibleRows = distribution.filter(
    (entry) => entry.cumulative >= MIN_CUMULATIVE
  );

  return (
    <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-800">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-800">
          <tr className="border-b border-gray-700">
            <th className="px-3 py-2 text-left font-medium text-gray-400">
              Wounds
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-400">
              P(≥ X)
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((entry) => (
            <tr
              key={entry.wounds}
              className="border-b border-gray-700/50 last:border-0"
            >
              <td className="px-3 py-1.5 text-gray-100">
                ≥ {entry.wounds}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-gray-100">
                {formatPercent(entry.cumulative)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Verify:**
- Table shows wound value (≥ X) and cumulative percentage
- Rows with cumulative probability < 0.05% are hidden
- First row (≥ 0) always shows 100.0%
- Table is scrollable when wound range exceeds container height (max-h-48)
- Sticky header stays visible while scrolling
- Font is monospaced for percentage values for columnar alignment

**Notes:**
- The `MIN_CUMULATIVE` threshold of 0.0005 hides entries that would display as "0.0%", keeping the table focused on meaningful probabilities.
- The `max-h-48` constraint (12rem / 192px) ensures the table doesn't dominate the results panel when wound ranges are large (e.g., 12+ dice attack pools).
- `font-mono` on the percentage column ensures decimal alignment for readability.

---

## Step 7A.7 — Create the Secondary Stats Component

**File:** `src/components/ResultsPanel/SecondaryStats.tsx`

Displays Deflect/Shien reflection wounds, Djem So wounds, and Guardian wound breakdown — only when they're relevant (mean > 0).

```tsx
import { formatWoundStat } from '../../utils/format';
import type { SimulationResult } from '../../engine/types';

interface SecondaryStatsProps {
  result: SimulationResult;
  /** Whether Guardian X > 0 in the current config */
  guardianActive: boolean;
}

export default function SecondaryStats({
  result,
  guardianActive,
}: SecondaryStatsProps) {
  const showDeflect = result.deflectWounds.mean > 0;
  const showDjemSo = result.djemSoWounds.mean > 0;
  const showGuardian = guardianActive;

  // Nothing to show
  if (!showDeflect && !showDjemSo && !showGuardian) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
        Additional Effects
      </h3>

      {showDeflect && (
        <SecondaryStatLine
          label="Deflect/Shien wounds to attacker"
          value={formatWoundStat(result.deflectWounds.mean)}
        />
      )}

      {showDjemSo && (
        <SecondaryStatLine
          label="Djem So wounds to attacker"
          value={formatWoundStat(result.djemSoWounds.mean)}
        />
      )}

      {showGuardian && (
        <>
          <SecondaryStatLine
            label="Guardian wounds (no Pierce)"
            value={formatWoundStat(result.guardianWounds.mean)}
          />
          <SecondaryStatLine
            label="Main target wounds (no Pierce)"
            value={formatWoundStat(result.mainTargetWounds.mean)}
          />
        </>
      )}
    </div>
  );
}

interface SecondaryStatLineProps {
  label: string;
  value: string;
}

function SecondaryStatLine({ label, value }: SecondaryStatLineProps) {
  return (
    <div className="flex items-center justify-between rounded bg-gray-800/50 px-3 py-1.5 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-200">{value}</span>
    </div>
  );
}
```

**Verify:**
- Returns `null` when no secondary stats are relevant (all means are 0 and Guardian inactive)
- Shows Deflect line only when `deflectWounds.mean > 0`
- Shows Djem So line only when `djemSoWounds.mean > 0`
- Shows Guardian breakdown only when `guardianActive` is true
- Uses consistent formatting and dark theme styling

**Notes:**
- `guardianActive` is passed as a separate prop (derived from `defender.guardianX > 0` in the parent) rather than reading from the store directly, to keep this component purely presentational.
- The Guardian section shows both guardian wounds and main target wounds **without Pierce** — this matches the engine design where Pierce is applied to the combined total, not individually. The component labels make this clear.

---

## Step 7A.8 — Create the Empty State Component

**File:** `src/components/ResultsPanel/EmptyState.tsx`

Shown when no simulation has run yet (no dice configured or initial app load).

```tsx
export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl">🎲</div>
      <h3 className="mt-3 text-lg font-semibold text-gray-300">
        No Results Yet
      </h3>
      <p className="mt-1 max-w-xs text-sm text-gray-500">
        Add attack dice to the attacker panel to see simulation results.
      </p>
    </div>
  );
}
```

**Verify:**
- Renders centered placeholder with dice emoji, heading, and helper text
- Visible on initial app load before any dice are configured
- Disappears once a simulation result is available

---

## Step 7A.9 — Create the Loading Overlay Component

**File:** `src/components/ResultsPanel/LoadingOverlay.tsx`

A subtle overlay shown on top of existing results while a new simulation is in progress.

```tsx
interface LoadingOverlayProps {
  visible: boolean;
}

export default function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/40 backdrop-blur-[1px] rounded-lg">
      <div className="flex items-center gap-2 rounded-md bg-gray-800 px-4 py-2 shadow-lg">
        <Spinner />
        <span className="text-sm text-gray-300">Simulating…</span>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-indigo-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
```

**Verify:**
- Returns `null` when `visible` is false (no DOM overhead)
- Shows a semi-transparent overlay with a spinner and "Simulating…" text
- Overlay covers the entire results area (absolute positioning requires `relative` parent)
- Spinner animates via Tailwind's `animate-spin` utility

**Notes:**
- `backdrop-blur-[1px]` provides a very subtle blur of the underlying results, signaling "processing" without making content unreadable.
- The overlay uses `absolute inset-0` positioning — the parent `ResultsPanel` container must have `relative` positioning for this to work correctly.

---

## Step 7A.10 — Create the Error Display Component

**File:** `src/components/ResultsPanel/ErrorDisplay.tsx`

Shown when the simulation worker encounters an error.

```tsx
interface ErrorDisplayProps {
  message: string;
}

export default function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl">⚠️</div>
      <h3 className="mt-3 text-lg font-semibold text-red-400">
        Simulation Error
      </h3>
      <p className="mt-1 max-w-xs text-sm text-gray-400">
        {message}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Try adjusting your configuration to run a new simulation.
      </p>
    </div>
  );
}
```

**Verify:**
- Displays error message in red-400 heading tone
- Includes recovery suggestion text
- Layout matches EmptyState for visual consistency

---

## Step 7A.11 — Assemble the Results Panel Container

**File:** `src/components/ResultsPanel/ResultsPanel.tsx`

The main container that composes all sub-components and reads from the results store.

```tsx
import { useSimulation } from '../../hooks/useSimulation';
import { useResultsStore } from '../../stores/resultsStore';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import CoreStats from './CoreStats';
import WoundDistributionChart from './WoundDistributionChart';
import CumulativeTable from './CumulativeTable';
import SecondaryStats from './SecondaryStats';
import EfficiencyDisplay from './EfficiencyDisplay';
import EmptyState from './EmptyState';
import LoadingOverlay from './LoadingOverlay';
import ErrorDisplay from './ErrorDisplay';

export default function ResultsPanel() {
  // Wire up the simulation hook (auto-runs on config change)
  useSimulation();

  // Read results from store
  const result = useResultsStore((s) => s.result);
  const loading = useResultsStore((s) => s.loading);
  const error = useResultsStore((s) => s.error);

  // Read guardian state for secondary stats
  const guardianActive = useDefenseConfigStore((s) => s.guardianX > 0);

  // Read unit costs for efficiency display
  const attackerCost = useResultsStore(
    (s) => s.result?.efficiency.attackerWoundsPerPoint !== undefined
  );

  return (
    <div className="relative flex flex-col gap-4 rounded-xl bg-gray-900 p-4">
      {/* Panel Header */}
      <h2 className="text-center text-lg font-bold text-gray-100">
        Results
      </h2>

      {/* Duration indicator (subtle, top-right) */}
      {result && !loading && (
        <div className="absolute right-4 top-4 text-xs text-gray-600">
          {new Intl.NumberFormat('en-US').format(result.iterations)} sims · {result.durationMs.toFixed(0)}ms
        </div>
      )}

      {/* Loading overlay (shown on top of existing results) */}
      <LoadingOverlay visible={loading} />

      {/* Error state */}
      {error && !loading && <ErrorDisplay message={error} />}

      {/* Empty state (no results yet and no error) */}
      {!result && !error && !loading && <EmptyState />}

      {/* Results content */}
      {result && !error && (
        <div className="flex flex-col gap-4">
          {/* Core stats: Mean / Median / Mode */}
          <CoreStats stats={result.totalWounds} />

          {/* Wound distribution bar chart */}
          <WoundDistributionChart
            distribution={result.totalWoundsDistribution}
          />

          {/* Cumulative probability table */}
          <CumulativeTable
            distribution={result.totalWoundsDistribution}
          />

          {/* Secondary stats (Deflect, Djem So, Guardian) */}
          <SecondaryStats
            result={result}
            guardianActive={guardianActive}
          />

          {/* Points efficiency (shown when any unit cost > 0) */}
          <EfficiencyDisplay efficiency={result.efficiency} />
        </div>
      )}
    </div>
  );
}
```

**Verify:**
- On initial load with no dice: shows `EmptyState`
- After adding dice: shows loading overlay briefly, then full results
- Changing a config input triggers debounced re-simulation with overlay
- Error from worker shows `ErrorDisplay`
- Duration indicator shows iteration count and duration in top-right
- Panel has `relative` positioning for the loading overlay
- All sub-components render within the gap-4 flex column

**Notes:**
- `useSimulation()` is called here (not at the App level) to keep the simulation lifecycle coupled to the results panel. If the results panel is ever conditionally rendered (e.g., tabbed mobile layout), the worker is properly created/destroyed.
- The `EfficiencyDisplay` component (Step 7B.1) is imported but implementation is deferred to the next sub-phase. A temporary stub can be used if needed.
- Individual store selectors (`useResultsStore((s) => s.result)`) instead of destructuring to enable fine-grained subscriptions — changing `loading` won't re-render code that only reads `result`, and vice versa.

---

## Step 7A.12 — Create the Results Panel Barrel Export

**File:** `src/components/ResultsPanel/index.ts`

```ts
export { default as ResultsPanel } from './ResultsPanel';
```

**Verify:**
- `import { ResultsPanel } from '../components/ResultsPanel'` resolves correctly

---

## Step 7A.13 — Write Unit Tests for `useSimulation` Hook

**File:** `src/hooks/useSimulation.test.ts`

Tests for the hook behavior using a mocked worker client.

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSimulation } from './useSimulation';
import { useAttackConfigStore } from '../stores/attackConfigStore';
import { useResultsStore } from '../stores/resultsStore';
import type { SimulationResult } from '../engine/types';

// ============================================================================
// Mock Web Worker Client
// ============================================================================

const mockRun = vi.fn();
const mockTerminate = vi.fn();

vi.mock('../engine/worker/simulationWorkerClient', () => ({
  SimulationWorkerClient: vi.fn().mockImplementation(() => ({
    run: mockRun,
    terminate: mockTerminate,
  })),
}));

// ============================================================================
// Mock Result Factory
// ============================================================================

function createMockResult(overrides?: Partial<SimulationResult>): SimulationResult {
  return {
    iterations: 10000,
    durationMs: 100,
    totalWounds: { mean: 3, median: 3, mode: 3, min: 0, max: 6, standardDeviation: 1.5 },
    totalWoundsDistribution: [{ wounds: 0, count: 0, probability: 0, cumulative: 1 }],
    guardianWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
    guardianWoundsDistribution: [{ wounds: 0, count: 10000, probability: 1, cumulative: 1 }],
    mainTargetWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
    mainTargetWoundsDistribution: [{ wounds: 0, count: 10000, probability: 1, cumulative: 1 }],
    deflectWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
    deflectWoundsDistribution: [{ wounds: 0, count: 10000, probability: 1, cumulative: 1 }],
    djemSoWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
    djemSoWoundsDistribution: [{ wounds: 0, count: 10000, probability: 1, cumulative: 1 }],
    suppressionPerAttack: 1,
    efficiency: {
      attackerWoundsPerPoint: 0,
      attackerPointsPerWound: 0,
      defenderWoundsPerPoint: 0,
      defenderPointsPerWound: 0,
      attackerEfficiencyRatio: 0,
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useSimulation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRun.mockReset();
    mockTerminate.mockReset();
    useAttackConfigStore.getState().reset();
    useResultsStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not run simulation when dice are zero', () => {
    renderHook(() => useSimulation());

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockRun).not.toHaveBeenCalled();
  });

  it('runs simulation after debounce when dice are configured', async () => {
    mockRun.mockResolvedValue(createMockResult());

    // Set some dice
    act(() => {
      useAttackConfigStore.getState().setField('redDice', 4);
    });

    renderHook(() => useSimulation());

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('terminates worker on unmount', () => {
    const { unmount } = renderHook(() => useSimulation());

    unmount();

    expect(mockTerminate).toHaveBeenCalled();
  });

  it('clears results when dice are set to zero', () => {
    // Start with dice configured
    act(() => {
      useAttackConfigStore.getState().setField('redDice', 4);
    });

    renderHook(() => useSimulation());

    // Remove all dice
    act(() => {
      useAttackConfigStore.getState().setField('redDice', 0);
    });

    // Results should be cleared
    const resultsState = useResultsStore.getState();
    expect(resultsState.result).toBeNull();
  });
});
```

**Run:** `npm test useSimulation.test.ts`

**Expected:** All tests pass.

**Notes:**
- `vi.useFakeTimers()` is essential because the hook uses `setTimeout` for debouncing. Without fake timers, tests would need real 300ms delays.
- The worker client is mocked at the module level to avoid creating actual Web Workers in the test environment.
- These tests verify behavior, not implementation details. They check that the worker is/isn't called under the right conditions and that cleanup happens on unmount.

---

## Step 7B.1 — Create the Points Efficiency Display Component

**File:** `src/components/ResultsPanel/EfficiencyDisplay.tsx`

Shows points efficiency metrics, only when at least one unit cost is set.

```tsx
import type { EfficiencyMetrics } from '../../engine/types';
import {
  formatPerPoint,
  formatPerWound,
  formatEfficiencyRatio,
} from '../../utils/format';

interface EfficiencyDisplayProps {
  efficiency: EfficiencyMetrics;
}

export default function EfficiencyDisplay({
  efficiency,
}: EfficiencyDisplayProps) {
  // Don't render if all metrics are zero (no costs set)
  const hasAnyMetric =
    efficiency.attackerWoundsPerPoint > 0 ||
    efficiency.defenderWoundsPerPoint > 0;

  if (!hasAnyMetric) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
        Points Efficiency
      </h3>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <EfficiencyRow
          label="Wounds / attacker pt"
          value={formatPerPoint(efficiency.attackerWoundsPerPoint)}
          tooltip="Average wounds dealt per point of attacker cost"
        />
        <EfficiencyRow
          label="Attacker pts / wound"
          value={formatPerWound(efficiency.attackerPointsPerWound)}
          tooltip="Attacker cost per wound dealt"
        />
        <EfficiencyRow
          label="Wounds / defender pt"
          value={formatPerPoint(efficiency.defenderWoundsPerPoint)}
          tooltip="Average wounds dealt per point of defender cost"
        />
        <EfficiencyRow
          label="Defender pts / wound"
          value={formatPerWound(efficiency.defenderPointsPerWound)}
          tooltip="Defender cost per wound absorbed"
        />
        <EfficiencyRow
          label="Efficiency ratio"
          value={formatEfficiencyRatio(efficiency.attackerEfficiencyRatio)}
          tooltip="(Wounds / attacker cost) / defender cost — higher = better trade for attacker"
          span2
        />
      </div>
    </div>
  );
}

interface EfficiencyRowProps {
  label: string;
  value: string;
  tooltip: string;
  /** Span full width (2 columns) on sm+ screens */
  span2?: boolean;
}

function EfficiencyRow({ label, value, tooltip, span2 }: EfficiencyRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded bg-gray-800/50 px-3 py-1.5 text-sm ${
        span2 ? 'sm:col-span-2' : ''
      }`}
      title={tooltip}
    >
      <span className="text-gray-400">{label}</span>
      <span className="font-mono font-semibold text-gray-200">{value}</span>
    </div>
  );
}
```

**Verify:**
- Returns `null` when both attacker and defender costs are 0 (all metrics zero)
- Shows all 5 metrics when both costs are set
- Shows only attacker metrics when only attacker cost is set (defender metrics show "—")
- Shows only defender metrics when only defender cost is set
- Efficiency ratio spans full width on sm+ screens
- Tooltips explain each metric on hover
- Uses monospace font for numeric values

**Notes:**
- The visibility check (`hasAnyMetric`) looks at `attackerWoundsPerPoint` and `defenderWoundsPerPoint` because these are the two metrics that require their respective costs to be non-zero. If either is positive, we show the section.
- The `formatPerPoint` and `formatPerWound` utilities return "—" for zero values, so individual rows gracefully handle missing costs without needing conditional rendering per row.

---

## Step 7B.2 — Write Component Tests for Efficiency Display

**File:** `src/components/ResultsPanel/EfficiencyDisplay.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EfficiencyDisplay from './EfficiencyDisplay';
import type { EfficiencyMetrics } from '../../engine/types';

function createMetrics(overrides?: Partial<EfficiencyMetrics>): EfficiencyMetrics {
  return {
    attackerWoundsPerPoint: 0,
    attackerPointsPerWound: 0,
    defenderWoundsPerPoint: 0,
    defenderPointsPerWound: 0,
    attackerEfficiencyRatio: 0,
    ...overrides,
  };
}

describe('EfficiencyDisplay', () => {
  it('renders nothing when all metrics are zero', () => {
    const { container } = render(
      <EfficiencyDisplay efficiency={createMetrics()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when attacker cost produces metrics', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
        })}
      />
    );

    expect(screen.getByText('Points Efficiency')).toBeInTheDocument();
    expect(screen.getByText('0.0300')).toBeInTheDocument();
    expect(screen.getByText('33.3')).toBeInTheDocument();
  });

  it('shows dash for defender metrics when defender cost is zero', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
          defenderWoundsPerPoint: 0,
          defenderPointsPerWound: 0,
        })}
      />
    );

    // Defender metrics should show "—"
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders all metrics when both costs are set', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
          defenderWoundsPerPoint: 0.06,
          defenderPointsPerWound: 16.7,
          attackerEfficiencyRatio: 0.0006,
        })}
      />
    );

    expect(screen.getByText('0.0300')).toBeInTheDocument();
    expect(screen.getByText('33.3')).toBeInTheDocument();
    expect(screen.getByText('0.0600')).toBeInTheDocument();
    expect(screen.getByText('16.7')).toBeInTheDocument();
    expect(screen.getByText('0.000600')).toBeInTheDocument();
  });
});
```

**Run:** `npm test EfficiencyDisplay.test.tsx`

**Expected:** All tests pass.

---

## Step 7C.1 — Add Mode Highlight to Bar Chart

**File:** `src/components/ResultsPanel/WoundDistributionChart.tsx` (update)

Enhance the bar chart to visually highlight the mode (most probable wound count) with a different color.

Update the `Bar` rendering to highlight the mode bar:

```tsx
// Inside WoundDistributionChart component, add mode detection:

interface WoundDistributionChartProps {
  distribution: DistributionEntry[];
  /** The mode (most probable wound count) to highlight */
  mode: number;
}

// Update the Bar component:
<Bar dataKey="probability" radius={[2, 2, 0, 0]}>
  {data.map((entry, index) => (
    <Cell
      key={index}
      fill={entry.wounds === mode ? '#818cf8' : '#6366f1'}
    />
  ))}
</Bar>
```

**Verify:**
- The bar at the mode wound count is a lighter indigo (`#818cf8` / indigo-400)
- All other bars are standard indigo (`#6366f1` / indigo-500)
- The highlight is visible and not too subtle

**Notes:**
- The `mode` prop is passed from the parent (`ResultsPanel`) via `result.totalWounds.mode`.
- Update the `ResultsPanel` to pass mode:
  ```tsx
  <WoundDistributionChart
    distribution={result.totalWoundsDistribution}
    mode={result.totalWounds.mode}
  />
  ```

---

## Step 7C.2 — Add Responsive Chart Sizing

**File:** `src/components/ResultsPanel/WoundDistributionChart.tsx` (update)

Adjust chart height and margins for different screen sizes.

```tsx
// Update the container div with responsive height:
<div className="h-44 w-full sm:h-52 md:h-64">

// Update chart margins to be tighter on mobile:
// Use a constant or conditional based on container width
<BarChart
  data={data}
  margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
>
```

Additionally, adjust font sizes for small screens:

```tsx
<XAxis
  dataKey="wounds"
  tick={{ fill: '#9ca3af', fontSize: 11 }}
  // Hide axis label on very small screens (handled by responsive parent)
  label={undefined}
/>
```

**Verify:**
- Chart is 176px tall on mobile, 208px on sm, 256px on md+
- Axis text is readable at all sizes
- Chart doesn't overflow its container on narrow screens (320px)

---

## Step 7C.3 — Add Tooltip Enhancements

**File:** `src/components/ResultsPanel/WoundDistributionChart.tsx` (update)

Enhance the tooltip to also show cumulative probability.

```tsx
/** Enhanced tooltip showing both exact and cumulative probability. */
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { wounds: number; raw: number; cumulative: number };
  }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-md bg-gray-900 px-3 py-2 text-sm shadow-lg border border-gray-700">
      <div className="font-semibold text-gray-100">
        {data.wounds} wound{data.wounds !== 1 ? 's' : ''}
      </div>
      <div className="mt-1 space-y-0.5 text-gray-400">
        <div>Exactly: {formatPercent(data.raw)}</div>
        <div>At least: {formatPercent(data.cumulative)}</div>
      </div>
    </div>
  );
}
```

Update `toChartData` to include cumulative values:

```tsx
function toChartData(distribution: DistributionEntry[]) {
  return distribution.map((entry) => ({
    wounds: entry.wounds,
    probability: entry.probability * 100,
    raw: entry.probability,
    cumulative: entry.cumulative,
  }));
}
```

**Verify:**
- Tooltip shows wound count, exact probability, and cumulative probability
- Both probabilities use consistent `formatPercent` formatting
- Tooltip doesn't flicker or cause layout jumps

---

## Step 7C.4 — Write Component Tests for Results Panel

**File:** `src/components/ResultsPanel/ResultsPanel.test.tsx`

Integration-level tests verifying the assembled results panel renders correctly for different states.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useResultsStore } from '../../stores/resultsStore';
import type { SimulationResult } from '../../engine/types';

// Mock the useSimulation hook (we don't want actual worker interaction)
vi.mock('../../hooks/useSimulation', () => ({
  useSimulation: vi.fn(),
}));

// Mock Recharts to avoid canvas rendering issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
}));

// Import after mocking
import ResultsPanel from './ResultsPanel';

// ============================================================================
// Helpers
// ============================================================================

function createMockResult(
  overrides?: Partial<SimulationResult>
): SimulationResult {
  return {
    iterations: 10000,
    durationMs: 150,
    totalWounds: {
      mean: 3.21,
      median: 3,
      mode: 3,
      min: 0,
      max: 7,
      standardDeviation: 1.5,
    },
    totalWoundsDistribution: [
      { wounds: 0, count: 500, probability: 0.05, cumulative: 1.0 },
      { wounds: 1, count: 1000, probability: 0.10, cumulative: 0.95 },
      { wounds: 2, count: 2000, probability: 0.20, cumulative: 0.85 },
      { wounds: 3, count: 3000, probability: 0.30, cumulative: 0.65 },
      { wounds: 4, count: 2000, probability: 0.20, cumulative: 0.35 },
      { wounds: 5, count: 1000, probability: 0.10, cumulative: 0.15 },
      { wounds: 6, count: 400, probability: 0.04, cumulative: 0.05 },
      { wounds: 7, count: 100, probability: 0.01, cumulative: 0.01 },
    ],
    guardianWounds: {
      mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0,
    },
    guardianWoundsDistribution: [
      { wounds: 0, count: 10000, probability: 1, cumulative: 1 },
    ],
    mainTargetWounds: {
      mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0,
    },
    mainTargetWoundsDistribution: [
      { wounds: 0, count: 10000, probability: 1, cumulative: 1 },
    ],
    deflectWounds: {
      mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0,
    },
    deflectWoundsDistribution: [
      { wounds: 0, count: 10000, probability: 1, cumulative: 1 },
    ],
    djemSoWounds: {
      mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0,
    },
    djemSoWoundsDistribution: [
      { wounds: 0, count: 10000, probability: 1, cumulative: 1 },
    ],
    suppressionPerAttack: 1,
    efficiency: {
      attackerWoundsPerPoint: 0,
      attackerPointsPerWound: 0,
      defenderWoundsPerPoint: 0,
      defenderPointsPerWound: 0,
      attackerEfficiencyRatio: 0,
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ResultsPanel', () => {
  beforeEach(() => {
    useResultsStore.getState().clear();
  });

  it('shows empty state when no results', () => {
    render(<ResultsPanel />);
    expect(screen.getByText('No Results Yet')).toBeInTheDocument();
  });

  it('shows core stats when results are available', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('3.21')).toBeInTheDocument();
    expect(screen.getByText('Median')).toBeInTheDocument();
    expect(screen.getByText('3.00')).toBeInTheDocument();
    expect(screen.getByText('Mode')).toBeInTheDocument();
  });

  it('shows cumulative probability table', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.getByText('P(≥ X)')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('shows loading overlay when loading', () => {
    useResultsStore.getState().setLoading(true);

    render(<ResultsPanel />);

    expect(screen.getByText('Simulating…')).toBeInTheDocument();
  });

  it('shows error display on error', () => {
    useResultsStore.getState().setError('Worker crashed');

    render(<ResultsPanel />);

    expect(screen.getByText('Simulation Error')).toBeInTheDocument();
    expect(screen.getByText('Worker crashed')).toBeInTheDocument();
  });

  it('shows simulation duration when results available', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.getByText(/10,000 sims/)).toBeInTheDocument();
    expect(screen.getByText(/150ms/)).toBeInTheDocument();
  });

  it('does not show efficiency section when costs are zero', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.queryByText('Points Efficiency')).not.toBeInTheDocument();
  });

  it('shows efficiency section when costs are set', () => {
    useResultsStore.getState().setResult(
      createMockResult({
        efficiency: {
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
          defenderWoundsPerPoint: 0.06,
          defenderPointsPerWound: 16.7,
          attackerEfficiencyRatio: 0.0006,
        },
      })
    );

    render(<ResultsPanel />);

    expect(screen.getByText('Points Efficiency')).toBeInTheDocument();
  });

  it('shows secondary stats when deflect wounds > 0', () => {
    useResultsStore.getState().setResult(
      createMockResult({
        deflectWounds: {
          mean: 0.5,
          median: 0,
          mode: 0,
          min: 0,
          max: 1,
          standardDeviation: 0.5,
        },
      })
    );

    render(<ResultsPanel />);

    expect(
      screen.getByText('Deflect/Shien wounds to attacker')
    ).toBeInTheDocument();
  });
});
```

**Run:** `npm test ResultsPanel.test.tsx`

**Expected:** All tests pass.

**Notes:**
- Recharts is mocked because it relies on canvas/SVG rendering that `jsdom` doesn't fully support. The mock renders a `data-testid` placeholder so we can verify the chart component is present without testing Recharts internals.
- `useSimulation` is mocked to avoid Web Worker instantiation in tests. The hook's behavior is tested separately in Step 7A.13.
- Tests set store state directly via `useResultsStore.getState().setResult()` to simulate different scenarios without needing an actual worker.

---

## Verification Checklist

After completing all steps, confirm:

| Check | Command / Action |
|-------|-----------------|
| Types compile | `npx tsc --noEmit` passes with all new components |
| Format utils pass | `npm test format.test.ts` — all tests green |
| useSimulation hook passes | `npm test useSimulation.test.ts` — all tests green |
| EfficiencyDisplay passes | `npm test EfficiencyDisplay.test.ts` — all tests green |
| ResultsPanel passes | `npm test ResultsPanel.test.tsx` — all tests green |
| Full test suite | `npm test` — all existing + new tests pass |
| Empty state renders | App with 0 dice shows "No Results Yet" |
| Simulation triggers | Add 4 red dice → loading overlay → stats + chart appear |
| Debounce works | Rapidly increment dice 5 times → only 1 simulation after 300ms idle |
| Loading overlay | Previous results visible with semi-transparent overlay during re-simulation |
| Core stats display | Mean, Median, Mode show with 2 decimal places |
| Bar chart renders | X-axis shows wound values, Y-axis shows percentages, bars are indigo |
| Chart tooltip | Hovering bar shows exact + cumulative probability |
| Mode highlight | Bar at mode wound count is lighter indigo |
| Cumulative table | Shows P(≥ X) rows, omits rows rounding to 0.0% |
| Table scrolls | Table with 10+ rows shows scrollbar, sticky header |
| Secondary stats | Deflect/Djem So only appear when mean > 0 |
| Guardian stats | Guardian wound breakdown appears when guardianX > 0 |
| Efficiency hidden | Section hidden when both unit costs are 0 |
| Efficiency visible | Section shows when at least one cost is set |
| Dash for zero costs | Missing cost metrics show "—" instead of 0 |
| Duration indicator | "10,000 sims · 150ms" shows top-right of panel |
| Error state | Simulated error shows error display with message |
| Responsive desktop | Results panel occupies center column between panels |
| Responsive mobile | Results panel stacks appropriately on narrow screens |
| Chart responsive | Chart scales down on mobile without overflow |
| Zero dice clears | Setting dice to 0 → results clear → empty state shows |

---

## Files Created/Modified in This Phase

| File | Status |
|------|--------|
| `src/hooks/useSimulation.ts` | Created |
| `src/hooks/useSimulation.test.ts` | Created |
| `src/utils/format.ts` | Created |
| `src/utils/format.test.ts` | Created |
| `src/components/ResultsPanel/CoreStats.tsx` | Created |
| `src/components/ResultsPanel/WoundDistributionChart.tsx` | Created |
| `src/components/ResultsPanel/CumulativeTable.tsx` | Created |
| `src/components/ResultsPanel/SecondaryStats.tsx` | Created |
| `src/components/ResultsPanel/EfficiencyDisplay.tsx` | Created |
| `src/components/ResultsPanel/EfficiencyDisplay.test.tsx` | Created |
| `src/components/ResultsPanel/EmptyState.tsx` | Created |
| `src/components/ResultsPanel/LoadingOverlay.tsx` | Created |
| `src/components/ResultsPanel/ErrorDisplay.tsx` | Created |
| `src/components/ResultsPanel/ResultsPanel.tsx` | Created |
| `src/components/ResultsPanel/ResultsPanel.test.tsx` | Created |
| `src/components/ResultsPanel/index.ts` | Created |

---

## Dependency Summary

```
Phase 3B (Web Worker Client)
  │
  ├─► useSimulation hook (Step 7A.1)
  │     ├── Reads: useFullConfig (Phase 5A.6)
  │     ├── Writes: useResultsStore (Phase 5A.5)
  │     └── Dispatches to: SimulationWorkerClient (Phase 3B.3)
  │
Phase 5A (Zustand Stores)
  │
  ├─► ResultsPanel (Step 7A.11)
  │     ├── CoreStats (Step 7A.4)
  │     ├── WoundDistributionChart (Step 7A.5, 7C.1–7C.3)
  │     ├── CumulativeTable (Step 7A.6)
  │     ├── SecondaryStats (Step 7A.7)
  │     ├── EfficiencyDisplay (Step 7B.1)
  │     ├── EmptyState (Step 7A.8)
  │     ├── LoadingOverlay (Step 7A.9)
  │     └── ErrorDisplay (Step 7A.10)
  │
Phase 4 (Shared Components — patterns only, no direct dependency)

Utilities:
  └── src/utils/format.ts (Step 7A.2)
       Used by: CoreStats, CumulativeTable, WoundDistributionChart, EfficiencyDisplay
```

**Sequencing within Phase 7:**
- Steps 7A.1–7A.3 (hook + formatting) are independent of UI components and can be built first
- Steps 7A.4–7A.10 (sub-components) can be built in any order; they're all leaf components with no inter-dependencies
- Step 7A.11 (ResultsPanel container) assembles all sub-components — build last
- Steps 7B.1–7B.2 (efficiency) can be built alongside 7A sub-components
- Steps 7C.1–7C.4 (chart polish + integration tests) come last as refinements

---

## Known Limitations & Future Work

1. **No iteration count control** — Fixed at 10,000 iterations. Future enhancement: add a dropdown or slider (1k / 5k / 10k / 50k / 100k) to let users trade speed for accuracy.

2. **No simulation progress** — The loading overlay shows a generic spinner. Future enhancement: show a progress bar using the `SimulationProgress` worker messages (defined in Phase 3B but not emitted in MVP).

3. **No chart animation** — Bars appear instantly. Future: Recharts supports `animationDuration` and `animationBegin` props for smooth entrance animations. Deferred for performance considerations.

4. **No export/share** — Results can't be saved or shared. Future: screenshot button, or URL-encoded config sharing.

5. **No comparison mode** — Can't compare two different configs side by side. Future: overlay a second distribution on the chart, or show a diff table.

6. **No visual dice display** — The "Roll Once" mode with step-by-step walkthrough cited in the design concept is explicitly deferred to future work. The MVP shows only statistical results.

7. **Deep equality on config** — The `useSimulation` hook's debounce fires on every render because `useFullConfig()` returns a new object reference each time. For MVP this is fine (debounce prevents excess simulation), but a future optimization could use `JSON.stringify` comparison or Zustand's `shallow` equality to avoid unnecessary debounce resets.

8. **Recharts bundle size** — Recharts is a relatively large dependency (~230KB minified). If bundle size becomes a concern, consider switched to a lighter chart library (e.g., `uPlot`, `Frappe Charts`) or a custom SVG bar chart. The chart requirements are simple enough that a custom implementation is feasible.
