# Phase 18 — UX & Engine Improvements: Collapsible Panels, Defense Defaults, Conditional Controls, Results Enhancements

## Problem Statement

Six UX and engine improvements to address mobile usability, sensible defaults, conditional controls, results clarity, and pre-defense statistics:

1. **Mobile panel management:** Attacker and Defender panels occupy significant vertical space on mobile. Both should be fully collapsible at the panel level so users can focus on one section at a time.

2. **Defense die default:** The default defense die is `White`, but "None" is the more useful starting point — users often want to evaluate attack output before defense dice are rolled.

3. **Defeated Minis spinner:** The "Defeated Minis" control is always visible even though it only affects `blackOps` (Cassian Andor) and `krakenBlaster` (Kraken) weapons. It should be disabled unless one of these weapons is equipped.

4. **Results panel charts and tables:** The wound distribution chart and cumulative probability table lack visible headers. The cumulative table should be collapsible and have consistent rounded corners.

5. **Clear Results vs Clear All:** There is no way to clear simulation results without also resetting all attack/defense configuration. A "Clear Results" button is needed, and the existing "Reset All" should be renamed "Clear All" for clarity.

6. **Pre-defense hit/crit statistics:** The results panel doesn't show how many hits and crits were achieved before the defense roll. This intermediate data is useful for evaluating attack effectiveness independent of the defender's dice.

## Scope

- **UI components** — `PanelShell` (collapsible), `CumulativeTable` (header, collapsible, rounded corners), `WoundDistributionChart` (header), `ResultsPanel` (buttons, pre-defense stats), `AttackerTokensSection` (conditional spinner)
- **Store defaults** — `defenseConfigStore` default `disableDefenseDice` → `true`
- **Store presets** — `defenseConfigStore.loadPreset()` derives `disableDefenseDice` from preset `dieColor`
- **Engine types** — `AttackResult` gains `hitsBeforeDefense`, `critsBeforeDefense`; `SimulationResult` gains `hitsBeforeDefense`, `critsBeforeDefense` `StatsSummary`
- **Engine pipeline** — `compareResults()` passes pre-defense counts through; `simulator.ts` collects them
- **New component** — `PreDefenseStats` for displaying average hits/crits

## Architecture

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      UI Layer                               │
 │  PanelShell ──── collapsible prop + SectionHeader pattern   │
 │  AttackerTokensSection ──── conditional Defeated Minis      │
 │  ResultsPanel ──── Clear Results btn + PreDefenseStats      │
 │  WoundDistributionChart ──── visible header                 │
 │  CumulativeTable ──── header + collapsible + rounded        │
 └────────────────────────┬────────────────────────────────────┘
                          │
 ┌────────────────────────┴────────────────────────────────────┐
 │                     Store Layer                             │
 │  defenseConfigStore ─── disableDefenseDice default: true    │
 │                         loadPreset: derive from dieColor    │
 │  resultsStore ────────── clearAll (results-only, existing)  │
 └────────────────────────┬────────────────────────────────────┘
                          │
 ┌────────────────────────┴────────────────────────────────────┐
 │                    Engine Layer                              │
 │  types.ts ──── AttackResult + SimulationResult new fields   │
 │  compareResults.ts ──── pass-through hitsBeforeDefense      │
 │  attackSequence.ts ──── capture hits/crits at Step 6 output │
 │  simulator.ts ──── collect & summarize pre-defense stats    │
 └─────────────────────────────────────────────────────────────┘
```

## Prerequisite Knowledge

### Current Panel Structure

`PanelShell` (`src/components/shared/PanelShell.tsx`) is a simple wrapper with a sticky header and scrollable children:

```tsx
// Current: no collapsible support
export default function PanelShell({ title, children }: PanelShellProps) {
  return (
    <div className="flex flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 ...">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h2 className="...">{title}</h2>
      </div>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </div>
  );
}
```

`SectionHeader` (`src/components/shared/SectionHeader.tsx`) already implements the accordion pattern with `max-h` / `opacity` transitions and a rotating `▾` chevron. This pattern will be adopted by `PanelShell`.

### Current Defense Die Default

In `defenseConfigStore.ts`, `DEFAULT_DEFENSE_CONFIG` currently sets:
```ts
disableDefenseDice: false,
dieColor: DefenseDieColor.White,
```

The UI components (`DefenderDefenseSection`, `DefenderCustomPoolView`) use a local union `'none' | DefenseDieColor` and derive the selected option from `store.disableDefenseDice`. No changes to the `DefenseDieColor` enum are needed.

### Current Engine Pipeline (Pre-Defense Data)

After Step 6 in `attackSequence.ts`, the variables `hits` and `crits` contain the final attack results before defense dice are rolled. These are passed to `compareResults()` as `attackResults: { hits, crits }`. Currently `compareResults` returns an `AttackResult` that does not expose these pre-defense values.

### Existing `clearAll` in Results Store

`resultsStore.clearAll()` already clears only simulation results (slots, viewedSlotId, loading, error, stale) without touching attack or defense config stores. This is exactly the behavior needed for "Clear Results".

---

## Step 1 — Collapsible Panels (`PanelShell`)

### 1.1 Extend `PanelShellProps`

**File:** `src/components/shared/PanelShell.tsx`

Add optional props:

```tsx
export interface PanelShellProps {
  title: string;
  children: ReactNode;
  /** Enable collapse/expand toggle on the panel header. Default: false */
  collapsible?: boolean;
  /** Whether the panel starts expanded. Default: true */
  defaultExpanded?: boolean;
}
```

### 1.2 Add Collapse State & Transition

Add `useState` and modify the header to be a toggle button when `collapsible` is true:

```tsx
import { useState, type ReactNode } from 'react';

export default function PanelShell({
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
}: PanelShellProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const headerContent = (
    <>
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">{title}</h2>
      {collapsible && (
        <span
          className={`text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      )}
    </>
  );

  return (
    <div className="flex flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 lg:max-h-[calc(100vh-5rem)]">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className="flex w-full items-center justify-between text-left"
          >
            {headerContent}
          </button>
        ) : (
          headerContent
        )}
      </div>

      <div
        className={`transition-all duration-200 ease-in-out ${
          collapsible && !isExpanded
            ? 'max-h-0 opacity-0 overflow-hidden'
            : 'max-h-[5000px] opacity-100 overflow-visible'
        }`}
      >
        <div className="space-y-4 px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
```

Design notes:
- Uses the same transition pattern (max-h + opacity) as `SectionHeader`
- `max-h-[5000px]` is larger than `SectionHeader`'s `2000px` because panels contain more content
- When `collapsible` is false (default), behavior is identical to the current implementation
- The `border-b` on the header persists even when collapsed, maintaining visual structure

### 1.3 Enable in AttackerPanel and DefenderPanel

**File:** `src/components/AttackerPanel/AttackerPanel.tsx`

```diff
- <PanelShell title="Attacker">
+ <PanelShell title="Attacker" collapsible>
```

**File:** `src/components/DefenderPanel/DefenderPanel.tsx`

```diff
- <PanelShell title="Defender">
+ <PanelShell title="Defender" collapsible>
```

Both use `defaultExpanded={true}` (the default), so they start expanded on all screen sizes. Users collapse manually as needed.

### 1.4 Testing

**File:** `src/components/shared/PanelShell.test.tsx` (new)

- Test that non-collapsible mode renders children and no chevron
- Test that collapsible mode renders chevron and children when expanded
- Test that clicking the header toggles content visibility
- Test `defaultExpanded={false}` hides content initially

---

## Step 2 — Default Defense Die → "None"

### 2.1 Change Store Default

**File:** `src/stores/defenseConfigStore.ts`

```diff
 const DEFAULT_DEFENSE_CONFIG = {
   dieColor: DefenseDieColor.White,
   surgeChart: DefenseSurgeChart.None,
-  disableDefenseDice: false,
+  disableDefenseDice: true,
```

This change propagates to:
- Initial store state (via spread)
- `reset()` (via spread of `DEFAULT_DEFENSE_CONFIG`)
- `clearUnit()` (via spread of `DEFAULT_DEFENSE_CONFIG`)

The `dieColor: DefenseDieColor.White` default is preserved — it serves as the "last selected" color when the user toggles away from "None".

### 2.2 Derive `disableDefenseDice` in `loadPreset()`

**File:** `src/stores/defenseConfigStore.ts`

When a preset is loaded, if it specifies `dieColor`, defense dice should be enabled. The current `loadPreset` does `{...DEFAULT_DEFENSE_CONFIG, ...profile}`, so after Step 2.1, `disableDefenseDice` defaults to `true` and would not be overridden by presets (since `DefenderPresetProfile` does not include `disableDefenseDice`).

Fix: explicitly set `disableDefenseDice` based on whether the profile provides a `dieColor`:

```diff
  loadPreset: (presetId, profile, upgradeBar = [], unitApiId, unitMeta) =>
    set(() => {
      const baseCost = profile.unitCost ?? 0;

      return {
        ...DEFAULT_DEFENSE_CONFIG,
        ...profile,
+       disableDefenseDice: profile.dieColor === undefined,
        selectedPresetId: presetId,
```

Logic: if the preset specifies a `dieColor`, we know the unit has a defense die → `disableDefenseDice: false`. If the profile omits `dieColor`, keep `disableDefenseDice: true`.

### 2.3 Engine Verification — No Changes Needed

The engine already correctly handles `disableDefenseDice: true`:

- **Step 5 (Dodge/Cover)** in `dodgeCover.ts`: runs unconditionally — cover and dodge tokens still cancel hits
- **Step 6 (Modify Attack)** in `attackModifiers.ts`: Armor, Shielded, Impact, Guardian all run unconditionally
- **Step 7 (Defense Roll)** in `defenseRoll.ts`: early-returns `{ results: [], surgeCountBeforeConversion: 0 }` when `disableDefenseDice` is true
- **Steps 8–9**: with 0 defense dice, 0 blocks, all remaining hits/crits become wounds (correctly modeling pre-defense attack output)

No engine changes required.

### 2.4 Testing

- Update any existing tests that assert the default value of `disableDefenseDice` to expect `true`
- Verify in `defenseConfigStore.test.ts` that:
  - Fresh store has `disableDefenseDice: true`
  - `loadPreset()` with a `dieColor` sets `disableDefenseDice: false`
  - `loadPreset()` without `dieColor` keeps `disableDefenseDice: true`
  - `reset()` restores `disableDefenseDice: true`

---

## Step 3 — Conditionally Disable "Defeated Minis" Spinner

### 3.1 Derive Keyword Presence

**File:** `src/components/AttackerPanel/AttackerTokensSection.tsx`

Add a derived boolean from the store's weapon list:

```tsx
const store = useAttackConfigStore();

const hasDefeatedMinisKeyword = store.weapons.some(
  (w) => w.enabled !== false && (w.keywords.blackOps || w.keywords.krakenBlaster)
);
```

### 3.2 Disable Spinner + Auto-Reset

When the keyword condition is false:
- Pass `disabled` prop to the `NumberSpinner` (already supported)
- Update tooltip to explain why it's disabled
- Use a `useEffect` to reset `defeatedMinis` to 0 when the condition becomes false

```tsx
useEffect(() => {
  if (!hasDefeatedMinisKeyword && store.defeatedMinis > 0) {
    store.setField('defeatedMinis', 0);
  }
}, [hasDefeatedMinisKeyword, store.defeatedMinis]);
```

```tsx
<NumberSpinner
  label="Defeated Minis"
  value={store.defeatedMinis}
  onChange={(value) => store.setField('defeatedMinis', value)}
  min={0}
  max={99}
  compact
  disabled={!hasDefeatedMinisKeyword}
  tooltip={
    hasDefeatedMinisKeyword
      ? "Number of defeated miniatures in this unit. Affects Black Ops (+1 white die per defeated mini) and Kraken's Blaster (upgrade 1 die per defeated mini)."
      : "Requires Black Ops (Cassian Andor) or Kraken's Blaster heavy weapon upgrade."
  }
/>
```

### 3.3 Testing

**File:** `src/components/AttackerPanel/AttackerTokensSection.test.tsx` (new or extend existing)

- Verify spinner is disabled when no weapon has `blackOps` or `krakenBlaster`
- Verify spinner is enabled when a weapon with `blackOps: true` is equipped
- Verify spinner is enabled when a weapon with `krakenBlaster: true` is equipped
- Verify `defeatedMinis` resets to 0 when the triggering weapon is unequipped

---

## Step 4 — Results Panel Headers & Collapsible Table

### 4.1 Add Header to Wound Distribution Chart

**File:** `src/components/ResultsPanel/WoundDistributionChart.tsx`

Add a title above the chart container:

```diff
  return (
-   <div className="h-44 w-full sm:h-52 md:h-64">
+   <div>
+     <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
+       Wound Probability Distribution
+     </h3>
+     <div className="h-44 w-full sm:h-52 md:h-64">
      <ResponsiveContainer ...>
        ...
      </ResponsiveContainer>
+     </div>
    </div>
  );
```

### 4.2 Add Header + Collapsible Behavior to Cumulative Table

**File:** `src/components/ResultsPanel/CumulativeTable.tsx`

Replace the current container with:

```tsx
import { useState } from 'react';

export default function CumulativeTable({ series }: CumulativeTableProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (series.length === 0) return null;

  // ... existing wound count & map logic ...

  return (
    <div className="overflow-hidden rounded-lg bg-gray-800">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Cumulative Wound Probability (≥ X Wounds)
        </span>
        <span
          className={`text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {/* Collapsible body */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          isExpanded
            ? 'max-h-[2000px] opacity-100 overflow-visible'
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="border-t border-b border-gray-700">
              {/* ... existing header cells ... */}
            </tr>
          </thead>
          <tbody>
            {/* ... existing row rendering ... */}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Key changes:
- **`overflow-hidden rounded-lg`** on the outer `<div>`: ensures the `rounded-lg` clips all child content, fixing the top corners. Both top and bottom corners are now consistently rounded.
- **Collapsible header button**: same chevron/transition pattern as `SectionHeader`
- **`border-t` on the `<thead>`** `<tr>`: visually separates the table from the header button
- **`max-h` transition wrapper** around the `<table>`: hides/shows smoothly
- The sticky `<thead>` remains inside the collapsible body so it scrolls with the table

### 4.3 Testing

- Verify both headers render with correct text
- Verify cumulative table toggles when header is clicked
- Visual check: rounded corners consistent on top and bottom of table container

---

## Step 5 — "Clear Results" Button + Rename "Reset All" → "Clear All"

### 5.1 Add Confirmation State for Clear Results

**File:** `src/components/ResultsPanel/ResultsPanel.tsx`

Add a second confirmation state alongside the existing one:

```tsx
const [confirmingReset, setConfirmingReset] = useState(false);
const [confirmingClearResults, setConfirmingClearResults] = useState(false);
```

Add matching timeout effect and handler:

```tsx
useEffect(() => {
  if (!confirmingClearResults) return;
  const timeout = setTimeout(() => setConfirmingClearResults(false), 2000);
  return () => clearTimeout(timeout);
}, [confirmingClearResults]);

const handleClearResults = () => {
  if (!confirmingClearResults) {
    setConfirmingClearResults(true);
  } else {
    useResultsStore.getState().clearAll();
    setConfirmingClearResults(false);
  }
};
```

### 5.2 Update Button Row

Change from 2 buttons to 3 buttons:

```tsx
<div className="flex gap-2">
  {/* Run / Add Simulation — primary action */}
  <button
    onClick={runSimulation}
    disabled={loading || isFull}
    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 ..."
  >
    {/* ... existing loading spinner + label logic ... */}
  </button>

  {/* Clear Results — clears results only, preserves config */}
  <button
    onClick={handleClearResults}
    disabled={loading || slots.length === 0}
    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 ${
      confirmingClearResults
        ? 'bg-amber-700 text-white'
        : 'bg-gray-700 text-gray-300 hover:bg-amber-700 hover:text-white'
    }`}
  >
    {confirmingClearResults ? 'Confirm?' : 'Clear Results'}
  </button>

  {/* Clear All — resets everything */}
  <button
    onClick={handleResetAll}
    disabled={loading}
    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 ${
      confirmingReset
        ? 'bg-red-700 text-white'
        : 'bg-gray-700 text-gray-300 hover:bg-red-700 hover:text-white'
    }`}
  >
    {confirmingReset ? 'Confirm?' : 'Clear All'}
  </button>
</div>
```

Design notes:
- "Clear Results" uses amber color to distinguish from "Clear All" (red)
- "Clear Results" is disabled when there are no results (`slots.length === 0`)
- Both secondary buttons use `text-sm` and slightly smaller padding than the primary
- Button text shortened: "Confirm Reset?" → "Confirm?" for brevity at smaller widths

### 5.3 Update `resetAll.ts` (naming only)

The internal function name `resetAll()` remains unchanged because renaming it would be a needless refactor. Only the button label text changes.

### 5.4 Testing

**File:** `src/components/ResultsPanel/ResultsPanel.test.tsx`

- Update any assertions that match "Reset All" text to match "Clear All"
- Add test: "Clear Results" button calls `resultsStore.clearAll()` and does NOT call `attackConfigStore.reset()` or `defenseConfigStore.reset()`
- Add test: "Clear Results" is disabled when no results exist
- Add test: "Clear Results" follows 2-second confirmation pattern
- Add test: "Clear All" button still resets all stores

---

## Step 6 — Pre-Defense Hits/Crits Statistics

### 6.1 Extend `AttackResult`

**File:** `src/engine/types.ts`

```diff
 export interface AttackResult {
   guardianWoundsNoPierce: number;
   mainTargetWoundsNoPierce: number;
   totalWounds: number;
   deflectWounds: number;
   djemSoWounds: number;
   suppressionApplied: number;
+
+  // Pre-defense intermediate results (after Step 6, before Step 7)
+  hitsBeforeDefense: number;    // Hit results entering the defense roll
+  critsBeforeDefense: number;   // Crit results entering the defense roll

   breakdown?: { ... };
 }
```

### 6.2 Pass Pre-Defense Values Through `compareResults`

**File:** `src/engine/compareResults.ts`

Add two parameters and return fields:

```diff
 export function compareResults(
   attackResults: { hits: number; crits: number },
   defenseInfo: { ... },
   config: AttackConfig,
   poolKeywords: AggregatedWeaponKeywords,
   lethalPierce: number,
   duelistPierceBonus: number,
   surgeCountBeforeConversion: number,
   originalAttackRollResults: RolledAttackDie[],
   guardianWoundsNoPierce: number,
   guardianDeflectWounds: number,
   dodgeWasSpent: boolean
 ): AttackResult {
   // ... existing logic ...

   return {
     guardianWoundsNoPierce,
     mainTargetWoundsNoPierce,
     totalWounds,
     deflectWounds,
     djemSoWounds,
     suppressionApplied,
+    hitsBeforeDefense: attackResults.hits,
+    critsBeforeDefense: attackResults.crits,
   };
 }
```

Note: `attackResults.hits` and `attackResults.crits` already represent the post-Step-6 values (after cover, dodge, armor, Guardian absorption). They are the dice facing the defense roll. No new parameters needed — the existing `attackResults` parameter already carries this data.

### 6.3 Update Zero-Result Path in `attackSequence.ts`

**File:** `src/engine/attackSequence.ts`

The Immune: Melee early return must include the new fields:

```diff
  if (config.defender.immuneMelee && config.attackType === AttackType.Melee) {
    return {
      guardianWoundsNoPierce: 0,
      mainTargetWoundsNoPierce: 0,
      totalWounds: 0,
      deflectWounds: 0,
      djemSoWounds: 0,
      suppressionApplied: 0,
+     hitsBeforeDefense: 0,
+     critsBeforeDefense: 0,
    };
  }
```

No other changes to `attackSequence.ts` — `compareResults()` already receives the correct `{ hits, crits }` values from Step 6 and now returns them.

### 6.4 Extend `SimulationResult`

**File:** `src/engine/types.ts`

```diff
 export interface SimulationResult {
   iterations: number;
   durationMs: number;

+  // Pre-defense attack results
+  hitsBeforeDefense: StatsSummary;
+  critsBeforeDefense: StatsSummary;
+
   totalWounds: StatsSummary;
   totalWoundsDistribution: DistributionEntry[];
   // ... rest unchanged
 }
```

Only `StatsSummary` (mean/median/mode/min/max/stddev) is needed — no full distribution arrays. This keeps the simulator efficient and the data payload small.

### 6.5 Collect in Simulator

**File:** `src/engine/simulator.ts`

```diff
  const totalWoundsArr: number[] = new Array(iterations);
  const guardianWoundsArr: number[] = new Array(iterations);
  const mainTargetWoundsArr: number[] = new Array(iterations);
  const deflectWoundsArr: number[] = new Array(iterations);
  const djemSoWoundsArr: number[] = new Array(iterations);
  const suppressionArr: number[] = new Array(iterations);
+ const hitsBeforeDefenseArr: number[] = new Array(iterations);
+ const critsBeforeDefenseArr: number[] = new Array(iterations);

  for (let i = 0; i < iterations; i++) {
    const r = executeAttackSequence(config);
    totalWoundsArr[i] = r.totalWounds;
    guardianWoundsArr[i] = r.guardianWoundsNoPierce;
    mainTargetWoundsArr[i] = r.mainTargetWoundsNoPierce;
    deflectWoundsArr[i] = r.deflectWounds;
    djemSoWoundsArr[i] = r.djemSoWounds;
    suppressionArr[i] = r.suppressionApplied;
+   hitsBeforeDefenseArr[i] = r.hitsBeforeDefense;
+   critsBeforeDefenseArr[i] = r.critsBeforeDefense;
  }

  // Statistics
+ const hitsBeforeDefenseStats = computeStatsSummary(hitsBeforeDefenseArr);
+ const critsBeforeDefenseStats = computeStatsSummary(critsBeforeDefenseArr);

  // Return
  return {
    iterations,
    durationMs: endTime - startTime,
+   hitsBeforeDefense: hitsBeforeDefenseStats,
+   critsBeforeDefense: critsBeforeDefenseStats,
    totalWounds: totalWoundsStats,
    // ... rest unchanged
  };
```

### 6.6 Display in Results Panel

**File:** `src/components/ResultsPanel/PreDefenseStats.tsx` (new)

A small stat card component showing pre-defense hits and crits:

```tsx
import type { StatsSummary } from '../../engine/types';

interface PreDefenseStatsProps {
  hitsBeforeDefense: StatsSummary;
  critsBeforeDefense: StatsSummary;
  accentColor: string;
}

export default function PreDefenseStats({
  hitsBeforeDefense,
  critsBeforeDefense,
  accentColor,
}: PreDefenseStatsProps) {
  // ... render two stat cards (Avg Hits, Avg Crits) styled like CoreStats
}
```

### 6.7 Integrate in ResultsPanel

**File:** `src/components/ResultsPanel/ResultsPanel.tsx`

Position the pre-defense stats between the cumulative table and the core wound stats (for the viewed slot):

```diff
  {viewedSlot && (
    <>
      <div className="text-sm text-gray-400 border-t border-gray-700 pt-3">
        Viewing: <span className="text-gray-200 font-medium">{viewedSlot.label}</span>
      </div>

+     {/* Pre-defense attack results */}
+     <PreDefenseStats
+       hitsBeforeDefense={viewedSlot.result.hitsBeforeDefense}
+       critsBeforeDefense={viewedSlot.result.critsBeforeDefense}
+       accentColor={viewedSlot.color}
+     />

      <CoreStats
        stats={viewedSlot.result.totalWounds}
        accentColor={viewedSlot.color}
      />
```

### 6.8 Update Test Helpers & Mocks

**File:** `src/engine/testHelpers.ts`

Add default values for `hitsBeforeDefense` and `critsBeforeDefense` to any mock `AttackResult` factories.

**File:** `src/stores/resultsStore.test.ts`, `src/components/ResultsPanel/ResultsPanel.test.tsx`

Add `hitsBeforeDefense` and `critsBeforeDefense` `StatsSummary` objects to mock `SimulationResult` data.

### 6.9 Testing

**File:** `src/engine/compareResults.test.ts` (extend existing)

- Verify `hitsBeforeDefense` and `critsBeforeDefense` match the `attackResults` input values
- Verify they are 0 when Immune: Melee applies

**File:** `src/engine/simulator.test.ts` (extend existing)

- Verify `SimulationResult` includes `hitsBeforeDefense` and `critsBeforeDefense` `StatsSummary` with valid mean/median/mode values

---

## Implementation Order

| # | Step | Layer | Dependencies | Estimated Complexity |
|---|------|-------|--------------|---------------------|
| 1 | Collapsible PanelShell | UI | None | Low |
| 2 | Default defense die "None" | Store | None | Low |
| 3 | Conditional Defeated Minis | UI | None | Low |
| 4 | Chart/table headers & collapsible table | UI | None | Low |
| 5 | Clear Results + Clear All buttons | UI + Store | None | Low |
| 6 | Pre-defense hits/crits (engine → simulator → UI) | Engine + UI | None | Medium |

Steps 1–5 are independent and can be implemented in any order. Step 6 spans three layers and should be implemented bottom-up (types → engine → simulator → UI).

## Quality Gate

All changes must pass:
- `npm run typecheck` — 0 errors
- `npm run lint` — 0 errors
- `npm run test` — all tests pass (including new tests)

## Files Modified (Summary)

| File | Change |
|------|--------|
| `src/components/shared/PanelShell.tsx` | Add collapsible/defaultExpanded props, toggle logic |
| `src/components/shared/PanelShell.test.tsx` | New: collapse behavior tests |
| `src/components/AttackerPanel/AttackerPanel.tsx` | Pass `collapsible` to PanelShell |
| `src/components/DefenderPanel/DefenderPanel.tsx` | Pass `collapsible` to PanelShell |
| `src/stores/defenseConfigStore.ts` | Default `disableDefenseDice: true`, derive in `loadPreset` |
| `src/components/AttackerPanel/AttackerTokensSection.tsx` | Conditional disable of Defeated Minis spinner |
| `src/components/ResultsPanel/WoundDistributionChart.tsx` | Add visible header |
| `src/components/ResultsPanel/CumulativeTable.tsx` | Add header, collapsible toggle, fix rounded corners |
| `src/components/ResultsPanel/ResultsPanel.tsx` | Clear Results button, rename Clear All, integrate PreDefenseStats |
| `src/engine/types.ts` | Add fields to `AttackResult` and `SimulationResult` |
| `src/engine/compareResults.ts` | Return `hitsBeforeDefense`, `critsBeforeDefense` |
| `src/engine/attackSequence.ts` | Add zero values to Immune: Melee early return |
| `src/engine/simulator.ts` | Collect and summarize pre-defense stats |
| `src/components/ResultsPanel/PreDefenseStats.tsx` | New: pre-defense stat cards |
| `src/engine/testHelpers.ts` | Add new fields to mock factories |
| `src/stores/resultsStore.test.ts` | Update mock SimulationResult |
| `src/components/ResultsPanel/ResultsPanel.test.tsx` | Update button labels, add new tests |
