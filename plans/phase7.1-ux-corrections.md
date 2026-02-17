# Phase 7.1: UX Corrections — Imperative Simulation, Segmented Controls, Custom Pool Cleanup

## Problem Statement

Three fundamental UX issues were introduced during Phases 6–7:

1. **Auto-running simulation on every config change:** The `useSimulation` hook watches `useFullConfig()` reactively and debounces at 300ms, firing a Web Worker simulation on every keystroke or toggle. This wastes CPU, produces flickering loading states, and makes the app feel sluggish for configuration-heavy workflows. Simulation should be user-triggered via a button.

2. **Low-cardinality fields rendered as dropdowns:** Six fields with only 2–3 fixed options are rendered as `<select>` dropdowns. This forces an extra click to reveal options and hides information. These should be segmented controls (inline button groups) where all options are visible at a glance.

3. **Unit Preset section always visible in Custom Pool mode:** When a panel is in "Custom Pool" mode, the Faction dropdown and Unit/Weapon searchable combobox are still rendered. These are irrelevant in Custom Pool mode and add visual clutter — the user is manually building a pool, not selecting a preset.

---

## 7.1A: Imperative Simulation (Button-Triggered)

### Current Behavior
- `useSimulation()` is called inside `ResultsPanel`.
- A `useEffect` watches `useFullConfig()` (reactive merge of all 3 stores).
- Every config change → 300ms debounce → Web Worker dispatch → results store update.
- Results auto-appear as the user types/toggles.

### Target Behavior
- Simulation runs **only** when the user clicks a **"Run Simulation"** button.
- Existing results remain visible but are marked **"stale"** when config changes after a run.
- The stale indicator prompts re-running without discarding previous results.
- Empty state copy directs the user to click the Run button.

### Implementation Steps

#### 7.1A-1: Add `stale` state to results store

**File:** `src/stores/resultsStore.ts`

Add to `ResultsState`:
```typescript
/** True when config has changed since the last simulation run */
stale: boolean;
```

Add action:
```typescript
markStale: () => void;
```

Behavior:
- `markStale()` → sets `stale: true`
- `setResult()` → resets `stale: false` (new results are current)
- `clear()` → resets `stale: false`
- Initial value: `false`

#### 7.1A-2: Refactor `useSimulation` hook

**File:** `src/hooks/useSimulation.ts`

Remove:
- The `useEffect` that auto-runs simulation on config change
- The 300ms debounce logic (`DEBOUNCE_MS`, `debounceRef`)

Keep:
- Worker lifecycle management (`useEffect` for init/terminate on mount/unmount)
- `hasDice()` helper

Add:
- A `runSimulation()` function exposed via return value
- `runSimulation()` reads config snapshot via `getFullConfig()` (non-reactive), validates with `hasDice()`, dispatches to worker, writes results to store
- A staleness-tracking `useEffect`: watches `useFullConfig()`, and when config changes while `result !== null`, calls `markStale()`

New signature:
```typescript
export function useSimulation(): { runSimulation: () => void } { ... }
```

#### 7.1A-3: Add "Run Simulation" button to ResultsPanel

**File:** `src/components/ResultsPanel/ResultsPanel.tsx`

- Destructure `{ runSimulation }` from `useSimulation()`.
- Read `stale` from `useResultsStore`.
- Render a prominent button at the top of the panel:
  ```
  ┌──────────────────────────────────┐
  │       [ Run Simulation ]         │  ← bg-blue-600, white text
  └──────────────────────────────────┘
  ```
- Button calls `runSimulation()` on click.
- Button is disabled while `loading === true`.
- When `loading`, button text changes to "Simulating..." with spinner.

#### 7.1A-4: Add stale results indicator

**File:** `src/components/ResultsPanel/ResultsPanel.tsx` (or a new `StaleIndicator.tsx`)

- When `stale === true` and `result !== null`, render a subtle amber banner:
  ```
  ⚠ Config changed — results may be outdated. Click Run to update.
  ```
- Positioned above or below the Run button, before the stats content.
- Uses `text-amber-400 bg-amber-900/30 border border-amber-700/50` styling.
- Dismissed automatically when simulation completes (`stale` → `false`).

#### 7.1A-5: Update EmptyState component

**File:** `src/components/ResultsPanel/EmptyState.tsx`

Change copy from:
> "Add attack dice to the attacker panel to see simulation results."

To:
> "Configure your attack and defense, then click **Run Simulation** to see results."

#### 7.1A-6: Update tests

**Files:**
- `src/hooks/useSimulation.test.ts` — Verify:
  - Hook no longer auto-fires on config change
  - `runSimulation()` dispatches to worker and writes results
  - Config change after result sets `stale: true`
  - `runSimulation()` clears `stale` when results arrive
  - Empty pool (no dice) → `runSimulation()` clears results
- `src/components/ResultsPanel/ResultsPanel.test.tsx` — Verify:
  - Run Simulation button exists and triggers simulation
  - Button disabled during loading
  - Stale badge appears when config changes after run
  - Stale badge disappears after re-run
- Update any integration tests that expect auto-simulation behavior

---

## 7.1B: Segmented Control Component & Conversions

### Rationale

Fields with ≤3 fixed, mutually exclusive options are better served by a segmented control (inline button group) than a dropdown. All options are visible simultaneously, reducing clicks and improving scannability.

### Target Fields

| Field | Options | Location |
|-------|---------|----------|
| Mode toggle | `Custom Pool` / `Unit Builder` | Both panels (AttackerPanel, DefenderPanel) |
| Attack Type | `Ranged` / `Melee` / `Overrun` | Header (AttackTypeSelector) |
| Attack Surge | `None` / `c→a` / `c→b` | AttackerCustomPoolView, AttackerUnitBuilderView |
| Defense Die Color | `White` / `Red` | DefenderCustomPoolView |
| Defense Surge | `None` / `e→d` | DefenderCustomPoolView |
| Cover Type | `None` / `Light` / `Heavy` | DefenderCustomPoolView |

### Implementation Steps

#### 7.1B-1: Create `SegmentedControl` shared component

**File:** `src/components/shared/SegmentedControl.tsx`

Props (mirrors `SelectProps<T>`):
```typescript
export interface SegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  tooltip?: string;
  id?: string;
  disabled?: boolean;
}
```

Rendering:
- Horizontal row of buttons inside a `bg-gray-800 rounded` track.
- Active button: `bg-blue-600 text-white` with contrast.
- Inactive buttons: `bg-transparent text-gray-400 hover:text-gray-200`.
- Full keyboard navigation: focus ring, arrow keys to switch.
- ARIA: `role="radiogroup"` on container, `role="radio"` + `aria-checked` on each button.
- Responsive: buttons share equal width (`flex-1`).

Layout pattern (matches existing `Select` layout):
```
Label text         [Option1] [Option2] [Option3]
```

#### 7.1B-2: Export from shared barrel

**File:** `src/components/shared/index.ts`

Add:
```typescript
export { default as SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps } from './SegmentedControl';
```

#### 7.1B-3: Add component tests

**File:** `src/components/shared/SegmentedControl.test.tsx`

Test cases:
- Renders all option buttons with correct labels
- Active option has active styling / `aria-checked="true"`
- Click on inactive option calls `onChange` with correct value
- Click on already-active option does NOT fire `onChange`
- Disabled state prevents interaction
- Label renders correctly
- Keyboard navigation (arrow keys, Enter/Space)

#### 7.1B-4: Convert Mode toggles

**Files:**
- `src/components/AttackerPanel/AttackerPanel.tsx`
- `src/components/DefenderPanel/DefenderPanel.tsx`

Replace:
```tsx
<Select label="Mode" value={store.activeMode} onChange={store.setActiveMode} options={MODE_OPTIONS} />
```
With:
```tsx
<SegmentedControl label="Mode" value={store.activeMode} onChange={store.setActiveMode} options={MODE_OPTIONS} />
```

#### 7.1B-5: Convert Attack Type selector

**File:** `src/components/AttackTypeSelector/AttackTypeSelector.tsx`

Replace `<Select>` with `<SegmentedControl>` using existing `ATTACK_TYPE_OPTIONS`.

#### 7.1B-6: Convert Attack Surge selects

**Files:**
- `src/components/AttackerPanel/AttackerCustomPoolView.tsx`
- `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Replace surge chart `<Select>` with `<SegmentedControl>`.

#### 7.1B-7: Convert Defender fields

**File:** `src/components/DefenderPanel/DefenderCustomPoolView.tsx`

Replace the following `<Select>` instances with `<SegmentedControl>`:
- Defense die color (White / Red)
- Defense surge chart (None / e→d)
- Cover type (None / Light / Heavy)

#### 7.1B-8: Update panel tests

Update existing component tests to expect `role="radiogroup"` / `role="radio"` instead of `<select>` elements for the converted fields. Verify click behavior still triggers correct store actions.

### Fields NOT converted (remain as `Select` dropdowns)

These secondary/conditional fields remain as dropdowns since they're less prominent or contextually nested:
- Marksman Strategy (conditional on Marksman toggle)
- Reroll Strategy
- Guardian Die Color (nested in Guardian sub-config)
- Guardian Surge (nested in Guardian sub-config)
- Faction dropdown (many options)
- Unit combobox (searchable, many options)

---

## 7.1C: Hide Unit Preset Section in Custom Pool Mode

### Current Behavior
Both `AttackerPanel` and `DefenderPanel` always render the "Unit Preset" `SectionHeader` containing the Faction `Select` and Unit/Weapon `SearchableCombobox`, regardless of the active mode. In Custom Pool mode these controls are irrelevant — the user is manually building a dice pool.

### Target Behavior
The "Unit Preset" section (Faction dropdown + Unit/Weapon combobox) is **only visible when `activeMode === 'unit-builder'`**. In Custom Pool mode, the section is hidden entirely. Store state (`selectedFaction`, `selectedPresetId`) is preserved — switching back to Unit Builder restores the previous selection.

### Implementation Steps

#### 7.1C-1: Conditional render in AttackerPanel

**File:** `src/components/AttackerPanel/AttackerPanel.tsx`

Wrap the `<SectionHeader title="Unit Preset">...</SectionHeader>` block in:
```tsx
{store.activeMode === 'unit-builder' && (
  <SectionHeader title="Unit Preset">
    ...existing faction + unit dropdowns...
  </SectionHeader>
)}
```

#### 7.1C-2: Conditional render in DefenderPanel

**File:** `src/components/DefenderPanel/DefenderPanel.tsx`

Same conditional wrapping for the defender's Unit Preset section.

#### 7.1C-3: Update panel tests

**Files:**
- `src/components/AttackerPanel/AttackerPanel.test.tsx`
- `src/components/DefenderPanel/DefenderPanel.test.tsx`

Add test cases:
- In Custom Pool mode: Faction dropdown and Unit combobox are NOT rendered
- In Unit Builder mode: Faction dropdown and Unit combobox ARE rendered
- Switching from Unit Builder to Custom Pool hides the section
- Switching back to Unit Builder restores the section (preset selection preserved)

---

## Verification Checklist

After implementation, all of these must pass:

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors  
- [ ] `npm run test` — all tests pass (existing + new)
- [ ] Manual: Custom Pool mode → no Faction/Unit dropdowns visible
- [ ] Manual: Unit Builder mode → Faction/Unit dropdowns visible
- [ ] Manual: Configure dice → no auto-simulation → click Run → results appear
- [ ] Manual: Change config → stale badge appears → click Run → updated results, no badge
- [ ] Manual: Mode toggle renders as side-by-side buttons, not dropdown
- [ ] Manual: Attack Type renders as 3-button segmented control
- [ ] Manual: Attack Surge, Defense Die, Defense Surge, Cover Type render as segmented controls
- [ ] Manual: All segmented controls are keyboard-navigable

---

## Assumptions & Decisions

1. **Stale results are preserved, not cleared.** When config changes after a simulation, existing results remain visible with a "stale" badge. This lets users reference previous results while adjusting config — better than a blank screen.

2. **`getFullConfig()` for imperative dispatch.** The Run button handler uses the non-reactive snapshot selector (`getFullConfig()`) rather than the hook-based `useFullConfig()` to avoid stale closure issues. The staleness tracker separately uses `useFullConfig()` in its own effect.

3. **Segmented control scope is limited to 6 primary fields.** Secondary/conditional selects (Marksman Strategy, Reroll Strategy, Guardian fields) remain as dropdowns. They're nested/conditional and less frequently interacted with.

4. **Store state persists across mode toggles.** Hiding the Unit Preset section in Custom Pool mode does NOT clear `selectedFaction` or `selectedPresetId` from the store. Switching back to Unit Builder restores context.

5. **No engine changes.** All changes are in hooks, shared components, panel components, and the results store. The engine remains pure and untouched.

---

## Files Changed (Summary)

| File | Change Type |
|------|-------------|
| `src/stores/resultsStore.ts` | Add `stale` field + `markStale` action |
| `src/hooks/useSimulation.ts` | Remove auto-run, expose `runSimulation()`, add stale tracking |
| `src/components/ResultsPanel/ResultsPanel.tsx` | Add Run button, read stale state, wire `runSimulation` |
| `src/components/ResultsPanel/EmptyState.tsx` | Update copy |
| `src/components/shared/SegmentedControl.tsx` | **New** — shared segmented control component |
| `src/components/shared/SegmentedControl.test.tsx` | **New** — component tests |
| `src/components/shared/index.ts` | Export `SegmentedControl` |
| `src/components/AttackerPanel/AttackerPanel.tsx` | Mode → segmented, hide Unit Preset in Custom |
| `src/components/DefenderPanel/DefenderPanel.tsx` | Mode → segmented, hide Unit Preset in Custom |
| `src/components/AttackTypeSelector/AttackTypeSelector.tsx` | Select → SegmentedControl |
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | Surge chart → segmented |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Surge chart → segmented |
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | Die color, surge, cover → segmented |
| `src/hooks/useSimulation.test.ts` | Update for imperative behavior |
| `src/components/ResultsPanel/ResultsPanel.test.tsx` | Add Run button + stale tests |
| `src/components/AttackerPanel/AttackerPanel.test.tsx` | Add conditional visibility tests |
| `src/components/DefenderPanel/DefenderPanel.test.tsx` | Add conditional visibility tests |

**No engine files changed. No store schema changes beyond `stale`/`markStale`.**

---

## Implementation Order

```
7.1B-1  Create SegmentedControl component
7.1B-2  Export from shared barrel
7.1B-3  SegmentedControl tests
    │
    ├──► 7.1B-4  Convert Mode toggles (both panels)
    ├──► 7.1B-5  Convert Attack Type selector
    ├──► 7.1B-6  Convert Attack Surge selects
    ├──► 7.1B-7  Convert Defender fields (die, surge, cover)
    └──► 7.1B-8  Update panel tests for segmented controls
    │
7.1A-1  Add stale state to results store
7.1A-2  Refactor useSimulation hook
7.1A-3  Add Run Simulation button
7.1A-4  Add stale results indicator
7.1A-5  Update EmptyState copy
7.1A-6  Update simulation/results tests
    │
7.1C-1  Hide Unit Preset in AttackerPanel (Custom Pool)
7.1C-2  Hide Unit Preset in DefenderPanel (Custom Pool)
7.1C-3  Update panel visibility tests
    │
    └──► Verification: typecheck + lint + test + manual
```

7.1B (segmented controls) has no dependency on 7.1A or 7.1C and can proceed first. 7.1A (imperative simulation) and 7.1C (preset hiding) are independent of each other.
