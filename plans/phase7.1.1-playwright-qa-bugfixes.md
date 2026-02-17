# Phase 7.1.1: Playwright QA Bugfixes

## Problem Statement

Automated Playwright-driven QA testing of the live app (localhost:8080) uncovered four bugs spanning CSS layout, upgrade filtering, React key uniqueness, and Recharts rendering. These issues affect usability and generate console noise. None involve engine/math errors — six deterministic expected-value tests all passed within Monte Carlo tolerance.

### QA Testing Summary

**Stats correctness (all passed):**

| Test | Config | Expected | Observed |
|------|--------|----------|----------|
| 1 | 1 red die, no defense, no surge | 0.750 | 0.75 |
| 2 | 1 red die vs white defense, no surge | 0.625 | 0.62 |
| 3 | 2 red dice, surge→hit, no defense | 1.750 | 1.75 |
| 4 | 1 red (surge→hit) vs red def (surge→block) | 0.292 | 0.30 |
| 5 | 1 red (surge→hit) + Pierce 1 vs red def (surge→block) | 0.875 | 0.88 |
| 6 | 1 red (surge→hit) vs white def (no surge) + Heavy cover | 0.521 | 0.52 |

**Conclusion: Engine math is correct.** No stats bugs.

**UI overflow testing** at 375px, 768px, 1023px, 1024px, 1280px, 1366px, 1920px found only one clipping issue (7.1.1A). No other components exhibit cutoff or overflow behavior.

---

## Dependencies

- **Phase 7.1** (SegmentedControl component already exists — 7.1.1A modifies its container)
- **Phase 5.5** (Unit data pipeline, upgrade resolver — 7.1.1B threads `unitApiId` through the stack)
- **Phase 6** (UI panels — 7.1.1B/C modify upgrade dropdown rendering; 7.1.1E-J modify panel layout and controls)
- **Phase 7** (Results panel — 7.1.1D modifies chart container)
- **Phase 4** (Shared UI components — 7.1.1E modifies SectionHeader; 7.1.1J introduces new Checkbox component)

No engine changes. No new dependencies introduced.

---

## Design Decisions

1. **`overflow-hidden` on SegmentedControl is intentional** — it clips child content to the rounded border container. The fix is to widen the parent, not remove the overflow. If the parent is correctly sized, overflow-hidden has no visible effect.

2. **`unitApiId` is a UI-only field** — it's stored in the Zustand stores and used for upgrade slot filtering, but excluded from engine config selectors. The engine never needs to know which API unit is selected.

3. **Preset carries `unitApiId`** — Rather than looking up the API ID from the preset ID at render time, we embed `unitApiId` in the `AttackerPreset` and `DefenderPreset` types and flow it through `loadPreset()` into the store. This keeps the data path simple and explicit.

4. **Deduplication is defense-in-depth** — Even after Issue B is fixed (proper filtering), we add deduplication in the upgrade→option mapping and a stable key fallback in `Select.tsx`. This prevents future regressions if new upgrade data introduces unexpected duplicates.

5. **`Select.tsx` key strategy**: Use `key={\`${option.value}-${index}\`}` — the index suffix guarantees uniqueness without changing the `value` semantics. The `option.value` prefix preserves React's reconciliation efficiency for the common case where values are unique.

6. **Recharts fix uses `minWidth`/`minHeight`** — This is the simplest suppression of the -1 dimension warning and is the approach recommended in Recharts' own issue tracker. No deferred rendering or ResizeObserver complexity needed.

7. **SectionHeader overflow is state-conditional** — `overflow-hidden` is only needed during the collapse animation. When expanded, `overflow-visible` allows focus rings and other outward-extending UI affordances to display correctly.

8. **Surge labels use game terminology** — Labels like "Surge: Hit" and "Surge: Block" match the language on unit cards and in the rulebook, replacing the internal die-face notation (`c → a`).

9. **"Disable Defense Dice" merges into die color selector** — Rather than a separate toggle + conditional control, a 3-option SegmentedControl (`None` / `White` / `Red`) is more discoverable and saves vertical space. The existing `disableDefenseDice` store field is preserved to avoid engine changes.

10. **SegmentedControl for all small option sets** — Any selector with 2-3 mutually exclusive options should use SegmentedControl, not Select (dropdown). This includes Marksman Strategy and Reroll Strategy.

11. **"Simulation Options" section separates strategy from keywords** — Reroll Strategy and Marksman Strategy are simulation tuning parameters, not unit data. Moving them to their own section makes the conceptual boundary clear and prevents confusion about what's "on the card" vs "how to simulate."

12. **Panels size to content, not to sibling** — Using `items-start` on the grid and removing `h-full` from panels lets each panel take only the vertical space its content requires. This prevents the "mirroring" effect where collapsing one panel leaves dead space in the other.

13. **Checkbox for boolean keywords, Toggle for prominent switches** — Boolean keyword toggles (Blast, Deflect, Impervious, etc.) are high-density options best served by compact checkboxes in a 2-column grid. Toggle switches are retained for prominent state switches like weapon "Enabled" where the large affordance adds clarity.

---

## 7.1.1A: "Overrun" Attack Type Button Clipped

### Current Behavior
The third segment ("Overrun") in the header's Attack Type segmented control is clipped/hidden at every viewport width tested (375px through 1920px).

### Root Cause
Two compounding CSS constraints:
1. `src/Layout.tsx` line 17: `<div className="w-56">` — fixed 224px container, too narrow for 3 buttons (~280px needed).
2. `src/components/shared/SegmentedControl.tsx` line 82: `overflow-hidden` on the radiogroup container clips the overflow.

### Target Behavior
All three buttons (Ranged / Melee / Overrun) are fully visible and clickable at every viewport from 375px to 1920px.

### Implementation Steps

#### 7.1.1A-1: Widen the Attack Type container in Layout

**File:** `src/Layout.tsx`

Change line 17:
```tsx
// Before
<div className="w-56">

// After
<div className="w-auto">
```

`w-auto` lets the SegmentedControl's intrinsic width determine the container size. Since SegmentedControl uses `inline-flex`, it will size to exactly fit its children.

**Alternative:** If `w-auto` causes layout instability on mobile (header items reflowing), use `w-fit` or `min-w-fit` instead. If neither works at 375px, add a responsive breakpoint:
```tsx
<div className="w-full sm:w-auto">
```

#### 7.1.1A-2: Verify header layout at all breakpoints

Manual or Playwright verification:
- **375px (mobile):** Header stacks title above selector, or selector shrinks text. All 3 buttons visible.
- **768px (tablet):** Header fits on one row. All 3 buttons visible.
- **1024px+ (desktop):** Header fits on one row with generous spacing. All 3 buttons visible.

If 375px causes horizontal overflow of the entire header, wrap the header's flex container:
```tsx
// In Layout.tsx header
<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
```

#### 7.1.1A-3: Update tests

**File:** `src/Layout.test.tsx` (if exists) or `src/App.test.tsx`

- Verify the AttackTypeSelector renders all three options: "Ranged", "Melee", "Overrun".
- Verify all three are visible (not `overflow: hidden` clipped) via `getByRole('radio', { name: 'Overrun' })`.

### Files Changed

| File | Change |
|------|--------|
| `src/Layout.tsx` | `w-56` → `w-auto` (1 line) |
| Test file (existing) | Add assertion for Overrun visibility |

### Risk
Very low. Pure CSS, one line change. No logic, no store, no engine impact.

---

## 7.1.1B: Upgrade Dropdowns Not Filtered by Unit

### Current Behavior
In Unit Builder mode, upgrade slot dropdowns (Heavy Weapon, Training, Gear, etc.) show upgrades from ALL factions and units. Selecting a Clone unit shows Separatist-only heavy weapons, Empire-only training cards, etc.

### Root Cause
`getUpgradesForSlot(slot, unitApiId?)` in `src/data/upgradeResolver.ts` already has the filtering logic — when `unitApiId` is provided, it returns only generic upgrades + upgrades restricted to that specific unit. But the UI never passes `unitApiId`:

1. `AttackerPreset` / `DefenderPreset` types don't include `unitApiId`.
2. `presetGenerator.ts` doesn't populate `unitApiId` in generated presets.
3. `attackConfigStore` / `defenseConfigStore` don't store `unitApiId`.
4. `AttackerUnitBuilderView.tsx` line 86 and `DefenderUnitBuilderView.tsx` line 28 call `getUpgradesForSlot(slot)` without it.

### Target Behavior
When a unit preset is selected, upgrade dropdowns show only:
- Generic upgrades (no unit restriction) for that slot
- Unit-restricted upgrades where `restrictedToUnitApiId` matches the selected unit's API ID

### Implementation Steps

#### 7.1.1B-1: Add `unitApiId` to preset types

**File:** `src/data/presets.ts`

Add to `AttackerPreset` interface:
```typescript
export interface AttackerPreset {
  id: string;
  faction: Faction;
  name: string;
  attackType: AttackType;
  profile: AttackerPresetProfile;
  upgradeBar: UpgradeSlot[];
  unitApiId: number;           // ← NEW
}
```

Add to `DefenderPreset` interface:
```typescript
export interface DefenderPreset {
  id: string;
  faction: Faction;
  name: string;
  profile: DefenderPresetProfile;
  upgradeBar: UpgradeSlot[];
  unitApiId: number;           // ← NEW
}
```

#### 7.1.1B-2: Populate `unitApiId` in preset generator

**File:** `src/data/presetGenerator.ts`

In `generateAttackerPreset()` return block (~line 147):
```typescript
return {
  id: `${unit.id}-${slugifyWeapon(weapon.name)}`,
  faction: unit.faction as Faction,
  name: `${unit.name} (${weapon.name})`,
  attackType: weapon.weaponType,
  profile,
  upgradeBar: unit.upgradeBar,
  unitApiId: unit.apiId,       // ← NEW
};
```

In `generateMultiMiniAttackerPreset()` return block (~line 234):
```typescript
return {
  id: unit.id,
  faction: unit.faction as Faction,
  name: `${unit.name} (${defaultWeapon.name})`,
  attackType: defaultAttackType,
  profile,
  upgradeBar: unit.upgradeBar,
  unitApiId: unit.apiId,       // ← NEW
};
```

In `generateSkeletonAttackerPreset()` return block (~line 273):
```typescript
return {
  id: `${unit.id}-skeleton`,
  faction: unit.faction as Faction,
  name: `${unit.name} (no weapon data)`,
  attackType: AttackType.Ranged,
  profile,
  upgradeBar: unit.upgradeBar,
  unitApiId: unit.apiId,       // ← NEW
};
```

In `generateDefenderPreset()` return block (~line 321):
```typescript
return {
  id: unit.id,
  faction: unit.faction as Faction,
  name: unit.name,
  profile,
  upgradeBar: unit.upgradeBar,
  unitApiId: unit.apiId,       // ← NEW
};
```

#### 7.1.1B-3: Add `unitApiId` to attacker store

**File:** `src/stores/attackConfigStore.ts`

State interface — add field:
```typescript
export interface AttackConfigState {
  // ... existing fields ...

  /** API ID of the selected unit. Used for filtering upgrade dropdowns. UI-only. */
  unitApiId: number | null;

  // ... actions ...
}
```

Default state — add to `DEFAULT_ATTACK_CONFIG`:
```typescript
unitApiId: null,
```

`loadPreset()` action — update signature and body:
```typescript
loadPreset: (presetId, profile, upgradeBar = [], unitApiId?: number) =>
  set(() => ({
    ...DEFAULT_ATTACK_CONFIG,
    ...profile,
    weapons: normalizedWeapons ?? DEFAULT_ATTACK_CONFIG.weapons,
    baseMiniatureCount: profile.baseMiniatureCount ?? 1,
    unitBaseWeapons: profile.unitBaseWeapons ?? [],
    selectedPresetId: presetId,
    upgradeBar,
    equippedUpgradeIds: new Array(upgradeBar.length).fill(null),
    unitApiId: unitApiId ?? null,     // ← NEW
  })),
```

`reset()` action — add reset:
```typescript
reset: () =>
  set(() => ({
    ...DEFAULT_ATTACK_CONFIG,
    selectedFaction: null,
    selectedPresetId: null,
    activeMode: 'custom',
    baseMiniatureCount: 1,
    unitBaseWeapons: [],
    upgradeBar: [],
    equippedUpgradeIds: [],
    unitApiId: null,                  // ← NEW
  })),
```

`selectAttackerConfig()` — exclude `unitApiId`:
```typescript
const {
  selectedFaction,
  selectedPresetId,
  activeMode,
  baseMiniatureCount,
  unitBaseWeapons,
  unitApiId,         // ← NEW: exclude from engine config
  upgradeBar,
  equippedUpgradeIds,
  // ... actions ...
} = state;
```

Exclude list type — add to union:
```typescript
type AttackConfigFields = Omit<
  AttackConfigState,
  | 'setField'
  | 'loadPreset'
  | ...
  | 'unitApiId'       // ← ADD if unitApiId should not be settable via setField
>;
```

**Note:** `unitApiId` should NOT be in `AttackConfigFields` — it's set only via `loadPreset`, not `setField`.

#### 7.1.1B-4: Add `unitApiId` to defense store

**File:** `src/stores/defenseConfigStore.ts`

Same pattern as 7.1.1B-3:
- Add `unitApiId: number | null` to `DefenseConfigState`
- Default: `null`
- `loadPreset()`: accept and store `unitApiId`
- `reset()`: set `unitApiId: null`
- `selectDefenderConfig()`: exclude `unitApiId`

#### 7.1.1B-5: Pass `unitApiId` through `loadPreset()` call sites

**File:** `src/components/AttackerPanel/AttackerPanel.tsx`

Update the `handlePresetChange` function (~line 62):
```typescript
if (preset) {
  store.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId);
}
```

**File:** `src/components/DefenderPanel/DefenderPanel.tsx`

Same change (~line 48):
```typescript
if (preset) {
  store.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId);
}
```

#### 7.1.1B-6: Pass `unitApiId` to `getUpgradesForSlot()` in UI

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Update line 86:
```tsx
// Before
const upgrades = getUpgradesForSlot(slot as UpgradeSlot);

// After
const upgrades = getUpgradesForSlot(slot as UpgradeSlot, store.unitApiId ?? undefined);
```

**File:** `src/components/DefenderPanel/DefenderUnitBuilderView.tsx`

Update line 28:
```tsx
// Before
const upgrades = getUpgradesForSlot(slot as UpgradeSlot);

// After
const upgrades = getUpgradesForSlot(slot as UpgradeSlot, store.unitApiId ?? undefined);
```

#### 7.1.1B-7: Add/update tests

**File:** `src/data/upgradeResolver.test.ts` (new or existing)

```typescript
describe('getUpgradesForSlot with unitApiId', () => {
  it('returns only generic + unit-restricted upgrades when unitApiId is provided', () => {
    const result = getUpgradesForSlot('training' as UpgradeSlot, 20319);
    const restrictedIds = result
      .filter(u => u.restrictedToUnitApiId !== null)
      .map(u => u.restrictedToUnitApiId);
    // All restricted upgrades should be for this unit only
    expect(restrictedIds.every(id => id === 20319)).toBe(true);
  });

  it('returns all upgrades (including wrong-unit restricted) when unitApiId is omitted', () => {
    const withId = getUpgradesForSlot('training' as UpgradeSlot, 20319);
    const withoutId = getUpgradesForSlot('training' as UpgradeSlot);
    expect(withoutId.length).toBeGreaterThanOrEqual(withId.length);
  });
});
```

**File:** `src/stores/attackConfigStore.test.ts` (extend existing)

```typescript
it('loadPreset stores unitApiId', () => {
  const store = useAttackConfigStore.getState();
  store.loadPreset('test', mockProfile, ['training'], 12345);
  expect(useAttackConfigStore.getState().unitApiId).toBe(12345);
});

it('reset clears unitApiId', () => {
  const store = useAttackConfigStore.getState();
  store.loadPreset('test', mockProfile, ['training'], 12345);
  store.reset();
  expect(useAttackConfigStore.getState().unitApiId).toBeNull();
});
```

### Files Changed

| File | Change |
|------|--------|
| `src/data/presets.ts` | Add `unitApiId: number` to both preset interfaces |
| `src/data/presetGenerator.ts` | Add `unitApiId: unit.apiId` to 4 return blocks |
| `src/stores/attackConfigStore.ts` | Add `unitApiId` field, wire into `loadPreset`/`reset`/selector |
| `src/stores/defenseConfigStore.ts` | Same pattern |
| `src/components/AttackerPanel/AttackerPanel.tsx` | Pass `preset.unitApiId` to `loadPreset()` |
| `src/components/DefenderPanel/DefenderPanel.tsx` | Pass `preset.unitApiId` to `loadPreset()` |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Pass `store.unitApiId` to `getUpgradesForSlot()` |
| `src/components/DefenderPanel/DefenderUnitBuilderView.tsx` | Pass `store.unitApiId` to `getUpgradesForSlot()` |
| `src/data/upgradeResolver.test.ts` | New or extended tests |
| `src/stores/attackConfigStore.test.ts` | Extended tests |
| `src/stores/defenseConfigStore.test.ts` | Extended tests (if applicable) |

### Risk
Medium. Touches 8-11 files across data, store, and UI layers. But each change is small and mechanical — threading a single field through an existing pipeline. No engine impact. The `getUpgradesForSlot` filtering logic already works correctly — only the plumbing was missing.

---

## 7.1.1C: Duplicate React Keys in Upgrade Dropdowns

### Current Behavior
6+ React "duplicate key" console warnings when opening upgrade dropdowns. Console error count grows from 0 to 23+ during a typical session of switching units and interacting with upgrade slots.

### Root Cause
`upgrades.json` contains multiple entries with the same slugified `id` but different `restrictedToUnitApiId`:
- `training-dug-in` × 4 (apiIds: 20319, 19897, 20697, 19830)
- `gear-combat-armor` × 2
- `training-imperial-march` × 2
- `training-offensive-defensive-stance` × 2

When `getUpgradesForSlot()` returns all variants (without filtering), `AttackerUnitBuilderView.tsx` maps them to `SelectOption` using `upgrade.id` as the value. `Select.tsx` uses `key={option.value}`, producing duplicate React keys.

### Relationship to 7.1.1B
Fixing 7.1.1B (passing `unitApiId`) eliminates the primary cause — only one variant per upgrade will match a given unit. However, defense-in-depth deduplication prevents regressions.

### Target Behavior
Zero duplicate key warnings in the console, regardless of which unit is selected or how many upgrade slots are displayed.

### Implementation Steps

#### 7.1.1C-1: Deduplicate upgrade options in Unit Builder views

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

After fetching upgrades (line 86-87), deduplicate before mapping to options:
```tsx
const upgrades = getUpgradesForSlot(slot as UpgradeSlot, store.unitApiId ?? undefined);
// Deduplicate: keep first occurrence of each upgrade ID
const uniqueUpgrades = upgrades.filter(
  (u, i, arr) => arr.findIndex(x => x.id === u.id) === i
);
const options: SelectOption<string>[] = [
  { value: '', label: 'None' },
  ...uniqueUpgrades.map((upgrade) => ({
    value: upgrade.id,
    label: `${upgrade.name} (${upgrade.cost})`,
  })),
];
```

**File:** `src/components/DefenderPanel/DefenderUnitBuilderView.tsx`

Same deduplication pattern (line 28-35).

#### 7.1.1C-2: Harden `Select.tsx` key generation

**File:** `src/components/shared/Select.tsx`

Change line 58:
```tsx
// Before
{options.map((option) => (
  <option key={option.value} value={option.value}>

// After
{options.map((option, index) => (
  <option key={`${option.value}-${index}`} value={option.value}>
```

This guarantees unique keys even if upstream deduplication is bypassed. The `option.value` prefix preserves reconciliation efficiency for the common unique-value case.

#### 7.1.1C-3: Verify zero console warnings

- Select various units in Unit Builder mode.
- Open browser console.
- Confirm 0 "duplicate key" warnings.
- Confirm equipping upgrades still works (selected value → store → correct upgrade applied).

### Files Changed

| File | Change |
|------|--------|
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Add deduplication filter |
| `src/components/DefenderPanel/DefenderUnitBuilderView.tsx` | Add deduplication filter |
| `src/components/shared/Select.tsx` | Index-based key (`key={\`...-${index}\`}`) |

### Risk
Very low. No value semantics change. The `onChange` handler receives `option.value` (the upgrade ID), which is unaffected by key changes. Deduplication keeps the first-found variant, which is deterministic.

---

## 7.1.1D: Recharts ResponsiveContainer -1 Dimension Warnings

### Current Behavior
When a simulation runs and the wound distribution chart first renders, the console shows:
```
Specified container size is not a positive number, the width is set to be 0
```
This comes from Recharts' `ResponsiveContainer` measuring its parent before browser layout completes.

### Root Cause
`src/components/ResultsPanel/WoundDistributionChart.tsx` (line 62-64):
```tsx
<div className="h-44 w-full sm:h-52 md:h-64">
  <ResponsiveContainer width="100%" height="100%">
```
On initial mount, the containing `<div>` may have measured dimensions of 0 or -1 before the browser paints, triggering the Recharts warning.

### Target Behavior
Chart renders correctly with zero console warnings about container dimensions.

### Implementation Steps

#### 7.1.1D-1: Add minimum dimension props to ResponsiveContainer

**File:** `src/components/ResultsPanel/WoundDistributionChart.tsx`

Change lines 63-64:
```tsx
// Before
<ResponsiveContainer width="100%" height="100%">

// After
<ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
```

Setting `minWidth={1}` and `minHeight={1}` prevents Recharts from using 0 or negative values, suppressing the warning without affecting actual rendered size (the parent div's Tailwind height classes govern the real size).

#### 7.1.1D-2: Verify

- Run a simulation.
- Confirm the chart renders correctly (bar heights, labels, tooltips all work).
- Confirm zero Recharts dimension warnings in the console.
- Test at mobile and desktop viewports (responsive height classes `h-44`, `sm:h-52`, `md:h-64` still apply correctly).

### Files Changed

| File | Change |
|------|--------|
| `src/components/ResultsPanel/WoundDistributionChart.tsx` | Add `minWidth={1} minHeight={1}` props |

### Risk
Very low. One prop addition. No logic, no layout, no engine impact.

---

## 7.1.1E: Toggle Focus Ring Clipping & Surge Label Clarity

### Current Behavior — Focus Ring Clipping
Toggle switches (e.g., Suppressed, Marksman, Blast, Deflect) are partially clipped when focused in both Attacker and Defender panels. The focus ring extends outside the toggle's bounds, but ancestor containers with `overflow-hidden` (from `SectionHeader.tsx`'s collapse animation using `max-h-0` / `max-h-[2000px]`) clip the visible ring.

### Root Cause — Focus Ring Clipping
1. `src/components/shared/Toggle.tsx` line 51: `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900` — the `ring-offset-2` extends 2px beyond the element boundary.
2. `src/components/shared/SectionHeader.tsx` line 42: `overflow-hidden` on the collapsible container clips any child content extending beyond its bounds. This is needed for the collapse animation, but it clips focus rings even when the section is expanded.

### Target Behavior — Focus Ring Clipping
All interactive controls display their full focus ring without clipping, in both expanded and collapsed transition states.

### Current Behavior — Surge Labels
Attack surge options display as: `None`, `c → a (Hit)`, `c → b (Crit)`.
Defense surge options display as: `None`, `e → d (Block)`.

These use internal die-face notation (`c`, `a`, `b`, `e`, `d`) that is opaque to users unfamiliar with the engine's enum shorthand. The parenthetical `(Hit)`, `(Crit)`, `(Block)` is helpful but the leading notation is confusing.

### Target Behavior — Surge Labels
Attack surge labels: `None`, `Surge: Hit`, `Surge: Crit`.
Defense surge labels: `None`, `Surge: Block`.

These match the natural game terminology used in unit cards and rulebook references (e.g., "Attack Surge: Hit").

### Implementation Steps

#### 7.1.1E-1: Fix focus ring clipping in SectionHeader

**File:** `src/components/shared/SectionHeader.tsx`

The collapsible `<div>` currently uses `overflow-hidden` unconditionally. Change to only clip overflow during collapse animation:

```tsx
// Before (line 42)
className={`overflow-hidden transition-all duration-200 ease-in-out ${
  isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
}`}

// After
className={`transition-all duration-200 ease-in-out ${
  isExpanded ? 'max-h-[2000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
}`}
```

When expanded, `overflow-visible` allows focus rings to extend beyond the container. When collapsed, `overflow-hidden` is still applied to clip content during the closing animation.

**Alternative:** If the transition from `overflow-hidden` to `overflow-visible` causes a visual flash, use `focus-within:overflow-visible` on the container, or switch from `ring-offset-2` to `ring-inset` on the Toggle (matching SegmentedControl's existing approach):

```tsx
// In Toggle.tsx, line 51
// Before
focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900

// After
focus:ring-2 focus:ring-blue-500 focus:ring-inset
```

Prefer the SectionHeader fix first. Fall back to modifying Toggle only if overflow changes break the collapse animation.

#### 7.1.1E-2: Update surge conversion labels

**File:** `src/components/AttackerPanel/AttackerCustomPoolView.tsx`

```tsx
// Before
const ATTACK_SURGE_OPTIONS: SegmentedControlOption<AttackSurgeChart>[] = [
  { value: AttackSurgeChart.None, label: 'None' },
  { value: AttackSurgeChart.ToHit, label: 'c → a (Hit)' },
  { value: AttackSurgeChart.ToCrit, label: 'c → b (Crit)' },
];

// After
const ATTACK_SURGE_OPTIONS: SegmentedControlOption<AttackSurgeChart>[] = [
  { value: AttackSurgeChart.None, label: 'None' },
  { value: AttackSurgeChart.ToHit, label: 'Surge: Hit' },
  { value: AttackSurgeChart.ToCrit, label: 'Surge: Crit' },
];
```

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Same change — identical `ATTACK_SURGE_OPTIONS` constant (~line 17).

**File:** `src/components/DefenderPanel/DefenderCustomPoolView.tsx`

```tsx
// Before
const DEFENSE_SURGE_OPTIONS: SegmentedControlOption<DefenseSurgeChart>[] = [
  { value: DefenseSurgeChart.None, label: 'None' },
  { value: DefenseSurgeChart.ToBlock, label: 'e → d (Block)' },
];

// After
const DEFENSE_SURGE_OPTIONS: SegmentedControlOption<DefenseSurgeChart>[] = [
  { value: DefenseSurgeChart.None, label: 'None' },
  { value: DefenseSurgeChart.ToBlock, label: 'Surge: Block' },
];
```

**Note:** The `DEFENSE_SURGE_OPTIONS` constant also appears in the Guardian section of `DefenderCustomPoolView.tsx` (Guardian Surge selector). The same constant is reused there, so the label fix applies automatically.

#### 7.1.1E-3: Update tests

- Update any snapshot or assertion that checks for the old label text (`'c → a (Hit)'`, `'e → d (Block)'`, etc.).
- Verify Toggle focus ring is visible in test assertions where applicable (primarily a visual/Playwright check).

### Files Changed

| File | Change |
|------|--------|
| `src/components/shared/SectionHeader.tsx` | Conditional `overflow-hidden` vs `overflow-visible` |
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | Surge labels: `'Surge: Hit'`, `'Surge: Crit'` |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Same surge label change |
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | Surge labels: `'Surge: Block'` |
| Tests (existing) | Update label text assertions |

### Risk
Very low. Label changes are string-only. SectionHeader overflow change is CSS-only and scoped to the transition state. No logic, no store, no engine impact.

---

## 7.1.1F: "Disable Defense Dice" Toggle → Defense Die Color Option

### Current Behavior
The "Disable Defense Dice" is a standalone `Toggle` switch above the Defense Die Color `SegmentedControl`. When enabled, it hides the die color and surge chart selectors. This is redundant UI — disabling defense dice is semantically the same as selecting "no defense die color."

### Root Cause
The `disableDefenseDice` boolean was implemented as a separate toggle rather than integrated into the existing die color selector. This adds unnecessary vertical space and a non-obvious interaction (toggle hides controls below it).

### Target Behavior
The Defense Die Color `SegmentedControl` has three options: `None`, `White`, `Red`. Selecting `None` is equivalent to the old "Disable Defense Dice" toggle. The standalone toggle is removed. When `None` is selected, the surge chart selector is hidden (same conditional behavior as before).

### Implementation Steps

#### 7.1.1F-1: Extend DefenseDieColor enum (if needed)

**File:** `src/engine/types.ts`

Check whether `DefenseDieColor` already has a `'none'` value. Currently:
```typescript
export enum DefenseDieColor {
  White = 'white',
  Red = 'red',
}
```

This enum is used by the engine. Adding `None = 'none'` to the enum would require engine changes to handle the "no die" case. Instead, keep the enum unchanged and handle the "None" state at the UI/store level by continuing to use the existing `disableDefenseDice: boolean` store field. The SegmentedControl uses a synthetic `'none'` value that maps to `disableDefenseDice: true`.

**Decision:** No engine enum change. The UI maps a 3-option segmented control to the existing two store fields (`disableDefenseDice` + `dieColor`).

#### 7.1.1F-2: Update DefenderCustomPoolView

**File:** `src/components/DefenderPanel/DefenderCustomPoolView.tsx`

Replace the die color options and remove the toggle:

```tsx
// New merged options — use a UI-only type for the 3 values
type DefenseDieOption = 'none' | DefenseDieColor;

const DEFENSE_DIE_OPTIONS: SegmentedControlOption<DefenseDieOption>[] = [
  { value: 'none', label: 'None' },
  { value: DefenseDieColor.White, label: 'White' },
  { value: DefenseDieColor.Red, label: 'Red' },
];
```

In the component body, replace the Toggle + conditional SegmentedControl with a single SegmentedControl:

```tsx
// Before
<Toggle
  label="Disable Defense Dice"
  value={store.disableDefenseDice}
  onChange={(value) => store.setField('disableDefenseDice', value)}
/>
{!store.disableDefenseDice && (
  <>
    <SegmentedControl
      label="Defense Die Color"
      value={store.dieColor}
      onChange={(value) => store.setField('dieColor', value)}
      options={DEFENSE_DIE_OPTIONS}
    />
    <SegmentedControl ... surge ... />
  </>
)}

// After
<SegmentedControl
  label="Defense Die"
  value={store.disableDefenseDice ? 'none' : store.dieColor}
  onChange={(value: DefenseDieOption) => {
    if (value === 'none') {
      store.setField('disableDefenseDice', true);
    } else {
      store.setField('disableDefenseDice', false);
      store.setField('dieColor', value);
    }
  }}
  options={DEFENSE_DIE_OPTIONS}
/>
{!store.disableDefenseDice && (
  <SegmentedControl ... surge ... />
)}
```

The `disableDefenseDice` store field continues to work unchanged — the engine reads `disableDefenseDice` from the config, not a die color of `'none'`. This preserves the engine boundary.

#### 7.1.1F-3: Update tests

- Remove any test that specifically checks for "Disable Defense Dice" toggle presence.
- Add test: selecting "None" in the die color control → `disableDefenseDice` is `true`.
- Add test: selecting "White" or "Red" → `disableDefenseDice` is `false`, `dieColor` is correctly set.

### Files Changed

| File | Change |
|------|--------|
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | Remove Toggle, merge into 3-option SegmentedControl |
| Tests (existing) | Update assertions for die selector |

### Risk
Low. No engine changes. Store fields (`disableDefenseDice`, `dieColor`) keep their current semantics. Only the UI mapping changes. Presets that set `disableDefenseDice: true` continue to work since the UI reads the store field to derive the segmented control value.

---

## 7.1.1G: Marksman Strategy & Reroll Strategy → SegmentedControl

### Current Behavior
Both "Marksman Strategy" and "Reroll Strategy" use `<Select>` (native HTML `<select>` dropdown). All other small-set options (die colors, surge charts, cover type, attack type) use `<SegmentedControl>` (styled radio button bar). This inconsistency makes the dropdowns feel out of place.

### Root Cause
These were implemented as dropdowns because they were added later and `Select` was simpler to wire up. Both have exactly 2 options — ideal for a segmented control.

### Target Behavior
Both Marksman Strategy and Reroll Strategy use `<SegmentedControl>` instead of `<Select>`, matching all other binary/small-set selectors in the app.

### Implementation Steps

#### 7.1.1G-1: Convert option arrays from SelectOption to SegmentedControlOption

**File:** `src/components/AttackerPanel/AttackerCustomPoolView.tsx`

```tsx
// Before
const MARKSMAN_STRATEGY_OPTIONS: SelectOption<MarksmanStrategy>[] = [
  { value: MarksmanStrategy.Deterministic, label: 'Deterministic' },
  { value: MarksmanStrategy.Averages, label: 'Averages' },
];

const REROLL_STRATEGY_OPTIONS: SelectOption<RerollStrategy>[] = [
  { value: RerollStrategy.Conservative, label: 'Conservative' },
  { value: RerollStrategy.CritFishing, label: 'Crit Fishing' },
];

// After
const MARKSMAN_STRATEGY_OPTIONS: SegmentedControlOption<MarksmanStrategy>[] = [
  { value: MarksmanStrategy.Deterministic, label: 'Deterministic' },
  { value: MarksmanStrategy.Averages, label: 'Averages' },
];

const REROLL_STRATEGY_OPTIONS: SegmentedControlOption<RerollStrategy>[] = [
  { value: RerollStrategy.Conservative, label: 'Conservative' },
  { value: RerollStrategy.CritFishing, label: 'Crit Fishing' },
];
```

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Same changes — identical constants.

#### 7.1.1G-2: Replace Select with SegmentedControl in JSX

**File:** `src/components/AttackerPanel/AttackerCustomPoolView.tsx`

```tsx
// Before
{store.marksman && (
  <Select
    label="Marksman Strategy"
    value={store.marksmanStrategy}
    onChange={(value) => store.setField('marksmanStrategy', value)}
    options={MARKSMAN_STRATEGY_OPTIONS}
  />
)}

<Select
  label="Reroll Strategy"
  value={store.rerollStrategy}
  onChange={(value) => store.setField('rerollStrategy', value)}
  options={REROLL_STRATEGY_OPTIONS}
/>

// After
{store.marksman && (
  <SegmentedControl
    label="Marksman Strategy"
    value={store.marksmanStrategy}
    onChange={(value) => store.setField('marksmanStrategy', value)}
    options={MARKSMAN_STRATEGY_OPTIONS}
  />
)}

<SegmentedControl
  label="Reroll Strategy"
  value={store.rerollStrategy}
  onChange={(value) => store.setField('rerollStrategy', value)}
  options={REROLL_STRATEGY_OPTIONS}
/>
```

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Same JSX changes.

#### 7.1.1G-3: Clean up unused Select import

If `Select` is no longer used in `AttackerCustomPoolView.tsx` after this change, remove its import. (It may still be used for other fields — verify before removing.)

#### 7.1.1G-4: Update tests

- Any test asserting `getByRole('combobox')` for these fields should change to `getByRole('radiogroup')` or `getByRole('radio')`.

### Files Changed

| File | Change |
|------|--------|
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | `Select` → `SegmentedControl` for both strategy fields |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Same |
| Tests (existing) | Update role assertions |

### Risk
Very low. Purely presentation. The `onChange` callback and store field semantics are identical between `Select` and `SegmentedControl`. Values are the same enum members.

---

## 7.1.1H: Move Reroll Strategy Out of "Unit Keywords" Section

### Current Behavior
"Reroll Strategy" appears inside the "Unit Keywords" `SectionHeader` in both `AttackerCustomPoolView.tsx` and `AttackerUnitBuilderView.tsx`. Reroll Strategy is not a unit keyword — it's a simulation-level option that controls how the Monte Carlo simulator decides which dice to reroll when spending aim tokens. It belongs at a higher scope.

### Root Cause
Reroll Strategy was placed in "Unit Keywords" for convenience during initial implementation, since it was adjacent to other keyword-related fields like Marksman and Precise. However, it's fundamentally a simulator tuning parameter, not a unit data property.

### Target Behavior
"Reroll Strategy" appears in a new top-level section called **"Simulation Options"** (or similar), positioned after the "Tokens" section and before "Weapon Keywords" / "Unit Keywords". This section contains simulation-level configuration that is not part of the unit's stat card.

Alternatively, if adding a new section feels heavyweight for a single control: place Reroll Strategy in a lightweight inline group at the top of the panel, below the Mode selector and above Unit Keywords. The key requirement is that it is visually separated from keyword toggles.

### Implementation Steps

#### 7.1.1H-1: Create "Simulation Options" section

**File:** `src/components/AttackerPanel/AttackerCustomPoolView.tsx`

Move the Reroll Strategy control out of the "Unit Keywords" `SectionHeader` and into a new section:

```tsx
// After the "Tokens" SectionHeader, before "Weapon Keywords":
<SectionHeader title="Simulation Options" defaultExpanded={true}>
  <div className="space-y-3">
    <SegmentedControl
      label="Reroll Strategy"
      value={store.rerollStrategy}
      onChange={(value) => store.setField('rerollStrategy', value)}
      options={REROLL_STRATEGY_OPTIONS}
    />
  </div>
</SectionHeader>
```

Remove the Reroll Strategy from the "Unit Keywords" section's JSX.

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Same restructuring.

#### 7.1.1H-2: Move Marksman Strategy alongside Marksman toggle

Marksman Strategy is also arguably not a "keyword" — it's a simulation tuning parameter for how Marksman conversions are evaluated. Move it to the "Simulation Options" section alongside Reroll Strategy, conditionally shown when `store.marksman` is true:

```tsx
<SectionHeader title="Simulation Options" defaultExpanded={true}>
  <div className="space-y-3">
    <SegmentedControl
      label="Reroll Strategy"
      value={store.rerollStrategy}
      onChange={(value) => store.setField('rerollStrategy', value)}
      options={REROLL_STRATEGY_OPTIONS}
    />
    {store.marksman && (
      <SegmentedControl
        label="Marksman Strategy"
        value={store.marksmanStrategy}
        onChange={(value) => store.setField('marksmanStrategy', value)}
        options={MARKSMAN_STRATEGY_OPTIONS}
      />
    )}
  </div>
</SectionHeader>
```

This cleanly separates "what the unit has" (Keywords) from "how to simulate it" (Strategy).

#### 7.1.1H-3: Update tests

- Verify the Reroll Strategy and Marksman Strategy controls still render and function correctly from their new location.
- Update any tests that relied on their position within the "Unit Keywords" section.

### Files Changed

| File | Change |
|------|--------|
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | New "Simulation Options" section; move strategy controls |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Same |
| Tests (existing) | Update section context assertions |

### Risk
Very low. Purely structural reorganization of JSX. No value changes, no store changes, no engine impact. The controls bind to the same store fields with the same callbacks.

---

## 7.1.1I: Panel Height Mirroring on Section Collapse

### Current Behavior
When collapsible sections in one panel (Attacker or Defender) are collapsed, the other panel maintains the same tall height, leaving large empty space at the bottom. Both panels stretch to the height of the tallest sibling in the grid layout, even when one panel's content is much shorter.

### Root Cause
`src/App.tsx` uses a CSS Grid with `lg:grid-cols-3`. Grid rows default to `align-items: stretch`, causing all children in the same row to have equal height. The panel wrappers use `h-full` (`flex h-full flex-col`) which expands to fill the stretched grid cell. When one panel has more content, the other panel's `h-full` forces it to match that height even if its sections are collapsed.

Additionally, `SectionHeader.tsx` uses `max-h-[2000px]` for the expanded state — even collapsed sections have a `max-h-0` that correctly shrinks content, but the parent panel's `h-full` stretches the panel container beyond its natural content height.

### Target Behavior
Each panel takes only as much vertical height as its content requires. Collapsing sections in one panel does not affect the other panel's height. On desktop (`lg:` breakpoint), the panels are independently scrollable and sized to their content (up to the viewport height, then scroll). The panels should `align-self: start` so they don't stretch.

### Implementation Steps

#### 7.1.1I-1: Change panel alignment to content-driven

**File:** `src/App.tsx`

Add `items-start` to the grid container so panels align to top rather than stretching:

```tsx
// Before
<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-gray-800">

// After
<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start lg:gap-0 lg:divide-x lg:divide-gray-800">
```

#### 7.1.1I-2: Remove `h-full` from panel containers

**File:** `src/components/AttackerPanel/AttackerPanel.tsx`

```tsx
// Before
<div className="flex h-full flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900">

// After
<div className="flex flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 lg:max-h-[calc(100vh-5rem)]">
```

**File:** `src/components/DefenderPanel/DefenderPanel.tsx`

Same change.

The `lg:max-h-[calc(100vh-5rem)]` ensures the panel scrolls when content exceeds viewport height (accounting for header). Without `h-full`, the panel sizes to its content naturally. On mobile (`grid-cols-1`), panels stack vertically and size to content by default. The `5rem` offset accounts for the header height (~`py-3` + text + border ≈ ~3rem) plus the main area padding (`p-4` = 1rem each side ≈ 2rem top).

#### 7.1.1I-3: Verify layout behavior

- **Desktop:** Collapse all sections in Defender panel → Attacker panel should not have excess empty space.
- **Desktop:** Both panels expanded with lots of content → each scrolls independently.
- **Mobile:** Panels stack vertically, each sized to content.
- **Divider lines:** `lg:divide-x lg:divide-gray-800` still renders correctly between panels.

### Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Add `lg:items-start` to grid |
| `src/components/AttackerPanel/AttackerPanel.tsx` | `h-full` → content-driven + `max-h` scroll |
| `src/components/DefenderPanel/DefenderPanel.tsx` | Same |

### Risk
Medium. Layout changes can have subtle effects at different viewport sizes. The `items-start` + `max-h` approach is well-tested in Tailwind and grid layouts, but should be verified at all breakpoints. The divider lines (`divide-x`) may render shorter if panels are no longer equal height — this is acceptable and expected behavior.

---

## 7.1.1J: Panel Vertical Space Reduction (Compact Redesign)

### Current Behavior
Both Attacker and Defender panels consume significant vertical space due to:
1. **Full-width toggle switches** — each boolean keyword uses a toggle switch (`Toggle.tsx`) that spans the full row width with label + switch. With 7-10+ keyword toggles per panel, this adds ~280-350px of vertical space just for boolean options.
2. **`space-y-3` (12px) gaps** between all form items, regardless of their visual weight.
3. **Section headers** add border + padding (~20px per section) even for small sections like "Points" (a single number input).
4. **Per-section collapsible wrappers** each have their own padding, borders, and headers.

### Target Behavior
Panels are visually compact while retaining all options. Key strategies:
1. **Boolean keywords → compact checkboxes in a multi-column grid** instead of full-width toggle switches.
2. **Tighter spacing** within sections.
3. **Inline small sections** where possible (e.g., Points doesn't need its own collapsible section).
4. **Visual grouping** — related items clustered with minimal spacing.

### Design Spec

#### Compact Checkbox Component

Replace `Toggle.tsx` usage for keyword booleans with a new `Checkbox` component:

```tsx
export default function Checkbox({ value, onChange, label, tooltip, disabled }: CheckboxProps) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-offset-0"
      />
      <span title={tooltip}>{label}</span>
    </label>
  );
}
```

Height per checkbox: ~24px (vs ~32px for toggle). In a 2-column grid, 8 checkboxes take ~96px vs ~256px as toggles.

#### Keyword Grid Layout

Wrap boolean keywords in a 2-column grid:

```tsx
<div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
  <Checkbox label="Blast" ... />
  <Checkbox label="Spray" ... />
  <Checkbox label="High Velocity" ... />
  <Checkbox label="Suppressive" ... />
</div>
```

#### Tighter Section Spacing

Change `space-y-3` (12px) to `space-y-2` (8px) inside sections. Change the padding inside `SectionHeader` children from `pb-2` to `pb-1`.

#### Inline Points

Move "Points" from its own `SectionHeader` to an inline `NumberSpinner` at the bottom of the last visible section, or integrate it into the panel header.

### Implementation Steps

#### 7.1.1J-1: Create `Checkbox` component

**File:** `src/components/shared/Checkbox.tsx`

Create a compact checkbox component with the same interface as Toggle (`value`, `onChange`, `label`, `tooltip`, `disabled`) but using a native `<input type="checkbox">` styled with Tailwind. Much smaller footprint than the toggle switch.

#### 7.1.1J-2: Convert Weapon Keywords to checkbox grid (Attacker)

**File:** `src/components/AttackerPanel/AttackerCustomPoolView.tsx`

In the "Weapon Keywords" section, replace `Toggle` components for `blast`, `suppressive`, `highVelocity`, `spray` with `Checkbox` in a 2-column grid. NumberSpinner keywords (`criticalX`, `lethalX`, `pierceX`, `impactX`, `ramX`) remain as-is above the grid.

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Same pattern for the Unit Keywords section's boolean keywords.

#### 7.1.1J-3: Convert Defender Keywords to checkbox grid

**File:** `src/components/DefenderPanel/DefenderCustomPoolView.tsx`

In the "Keywords" section, replace `Toggle` components for `block`, `deflect`, `soresuMastery`, `djemSoMastery`, `outmaneuver`, `lowProfile`, `impervious`, `immunePierce`, `immuneMeleePierce`, `immuneBlast`, `duelistDefender`, `backup`, `holdTheLine`, `dugIn` with `Checkbox` in a 2-column grid.

Conditional keywords (e.g., `shienMastery` shown only when `deflect` is true) should still appear conditionally but within the grid flow.

#### 7.1.1J-4: Tighten section spacing

**File:** `src/components/shared/SectionHeader.tsx`

Reduce internal spacing:
```tsx
// Before
<div className="space-y-3 pb-2">

// After
<div className="space-y-2 pb-1">
```

#### 7.1.1J-5: Merge Points section inline

**File:** `src/components/AttackerPanel/AttackerCustomPoolView.tsx`  
**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`  
**File:** `src/components/DefenderPanel/DefenderCustomPoolView.tsx`

Remove the standalone "Points" `SectionHeader`. Add the "Unit Cost" `NumberSpinner` as the last item inside the preceding section (e.g., the bottom of "Unit Keywords" or "Keywords").

#### 7.1.1J-6: Add tests for Checkbox component

**File:** `src/components/shared/Checkbox.test.tsx`

- Renders with label text
- Toggles checked state on click
- Respects disabled state
- Displays tooltip

#### 7.1.1J-7: Update existing tests

Update any tests that reference Toggle role (`role="switch"`) for keyword booleans — these will now be `role="checkbox"` inputs.

### Files Changed

| File | Change |
|------|--------|
| `src/components/shared/Checkbox.tsx` | **New** — compact checkbox component |
| `src/components/shared/Checkbox.test.tsx` | **New** — tests |
| `src/components/shared/index.ts` | Export `Checkbox` |
| `src/components/shared/SectionHeader.tsx` | Tighter spacing (`space-y-2 pb-1`) |
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | Toggle → Checkbox grid for keywords; merge Points |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Same |
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | Same; merge Points |
| Tests (various) | Update role assertions from `switch` to `checkbox` |

### Risk
Medium. This is the largest visual change in the phase — touching the layout of keyword sections across both panels. However:
- No engine changes
- No store interface changes
- All values and onChange handlers remain identical
- Checkbox behavior is semantically identical to Toggle for boolean fields

**Keep `Toggle.tsx`** — it's still appropriate for prominent binary switches like "Enabled" on weapon cards, or any future use where a toggle switch is the right affordance. The change is specifically about swapping keyword booleans from toggle → checkbox for density.

### Estimated Space Savings

| Panel | Current (approx.) | After (approx.) | Savings |
|-------|--------------------|------------------|---------|
| Attacker Weapon Keywords (4 toggles) | 128px | 48px (2×2 grid) | ~80px |
| Attacker Unit Keywords (7 toggles) | 224px | 72px (4×2 grid) | ~152px |
| Defender Keywords (14 toggles) | 448px | 144px (7×2 grid) | ~304px |
| Section spacing (all sections) | ~60px | ~30px | ~30px |
| Points section header overhead | ~40px per panel | 0px | ~80px total |
| **Total per panel** | | | **~250-400px** |

At typical desktop viewport, this reduces full-expanded panel height from ~1200px to ~800-900px — a meaningful improvement for fitting both panels and results on screen with less scrolling.

---

## Implementation Order

```
7.1.1A  "Overrun" button CSS fix  ← quick, independent
    │
    ▼
7.1.1B  Thread unitApiId through preset → store → UI  ← largest data change
    │
    ├──► 7.1.1C  Deduplicate upgrade options + Select key fix  ← depends on 7.1.1B for context
    │
    ▼
7.1.1D  Recharts minWidth/minHeight fix  ← independent, can be done at any point
    │
    ▼
7.1.1E  Toggle focus clipping + surge labels  ← independent, quick
    │
    ▼
7.1.1F  Defense dice toggle → SegmentedControl option  ← independent, touches DefenderCustomPoolView
    │
    ▼
7.1.1G  Marksman/Reroll Strategy → SegmentedControl  ← independent
    │
    ├──► 7.1.1H  Move strategy controls to "Simulation Options"  ← depends on 7.1.1G for component type
    │
    ▼
7.1.1I  Panel height mirroring fix  ← independent layout fix
    │
    ▼
7.1.1J  Panel compact redesign (Checkbox + grid + spacing)  ← largest UI change, do last
    │
    ▼
    Verification: typecheck + lint + test + manual Playwright check
```

**Parallelism:**
- 7.1.1A, 7.1.1D, 7.1.1E, 7.1.1F, 7.1.1I are all independent and can be done in any order.
- 7.1.1G and 7.1.1H should be done together (strategy controls change type then move location).
- 7.1.1B + 7.1.1C are coupled (upgrade filtering + deduplication).
- 7.1.1J should be done last — it's the most invasive visual change and benefits from all prior layout/component fixes being in place.

**Recommended grouping:**
1. **First:** 7.1.1A + 7.1.1D + 7.1.1E (three quick independent fixes)
2. **Second:** 7.1.1B + 7.1.1C (upgrade filtering + deduplication)
3. **Third:** 7.1.1F + 7.1.1G + 7.1.1H (control type changes + section restructuring)
4. **Fourth:** 7.1.1I (layout fix)
5. **Fifth:** 7.1.1J (compact redesign)

---

## Files Changed (Complete Summary)

| File | Issues | Change Type |
|------|--------|-------------|
| `src/Layout.tsx` | A | CSS width fix (1 line) |
| `src/App.tsx` | I | Add `lg:items-start` to grid |
| `src/data/presets.ts` | B | Add `unitApiId` to interfaces |
| `src/data/presetGenerator.ts` | B | Add `unitApiId` to 4 return blocks |
| `src/stores/attackConfigStore.ts` | B | Add `unitApiId` field + wire through actions/selector |
| `src/stores/defenseConfigStore.ts` | B | Same pattern |
| `src/components/AttackerPanel/AttackerPanel.tsx` | B, I | Pass `preset.unitApiId` to `loadPreset()`; remove `h-full` |
| `src/components/DefenderPanel/DefenderPanel.tsx` | B, I | Same |
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | E, G, H, J | Surge labels; strategy → SegmentedControl; new section; Toggle → Checkbox grid; merge Points |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | B, C, E, G, H, J | Same + upgrade filtering |
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | E, F, J | Surge labels; defense die merge; Toggle → Checkbox grid; merge Points |
| `src/components/DefenderPanel/DefenderUnitBuilderView.tsx` | B, C | Pass `unitApiId` to resolver + deduplicate |
| `src/components/shared/Checkbox.tsx` | J | **New** — compact checkbox component |
| `src/components/shared/Checkbox.test.tsx` | J | **New** — tests |
| `src/components/shared/index.ts` | J | Export `Checkbox` |
| `src/components/shared/Select.tsx` | C | Index-based key fallback |
| `src/components/shared/SectionHeader.tsx` | E, J | Conditional overflow; tighter spacing |
| `src/components/shared/Toggle.tsx` | E (maybe) | `ring-inset` fallback if needed |
| `src/components/ResultsPanel/WoundDistributionChart.tsx` | D | Add `minWidth`/`minHeight` props |
| `src/data/upgradeResolver.test.ts` | B | New/extended filtering tests |
| `src/stores/attackConfigStore.test.ts` | B | Extended `unitApiId` tests |
| `src/stores/defenseConfigStore.test.ts` | B | Extended `unitApiId` tests (if applicable) |

**Total: ~20 files (3 new), no engine changes.**

---

## Quality Gate

All changes must pass before the phase is considered complete:

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all tests pass (existing + new)
- [ ] Manual: All 3 attack type buttons visible and clickable at 375px, 768px, 1024px, 1920px
- [ ] Manual: Select a unit → upgrade dropdowns show only applicable upgrades
- [ ] Manual: 0 "duplicate key" console warnings when interacting with upgrade slots
- [ ] Manual: Run simulation → 0 Recharts dimension warnings in console
- [ ] Manual: Chart renders correctly at mobile and desktop viewports
- [ ] Manual: Toggle focus rings fully visible when tabbing through controls
- [ ] Manual: Surge labels read "Surge: Hit", "Surge: Crit", "Surge: Block"
- [ ] Manual: Defense Die selector shows None / White / Red with no separate toggle
- [ ] Manual: Marksman Strategy and Reroll Strategy display as segmented controls
- [ ] Manual: Reroll Strategy and Marksman Strategy appear in "Simulation Options", not "Unit Keywords"
- [ ] Manual: Collapsing sections in one panel doesn't stretch the other panel
- [ ] Manual: Keyword booleans display as compact checkboxes in 2-column grid
- [ ] Manual: Both panels fit on screen with noticeably less scrolling than before

---

## Assumptions

1. **`ResolvedUnit.apiId` is always a valid number** — the processed unit data pipeline guarantees this. No null-check needed in presetGenerator.
2. **`getUpgradesForSlot` filtering logic is correct** — verified by reading `src/data/upgradeResolver.ts` lines 64-76. When `unitApiId` is provided, restricted upgrades are included only if they match. Generic upgrades (`restrictedToUnitApiId === null`) are always included.
3. **No faction-level filtering is needed** — the `unitApiId` filter is sufficient. A Clone unit's API ID won't match a Separatist-restricted upgrade's `restrictedToUnitApiId`, so faction filtering is implicit.
4. **Deduplication keeps the first occurrence** — when multiple upgrade variants share the same `id`, the first one found is kept. Since they have identical names, costs, and effects (only `restrictedToUnitApiId` differs), this is safe.
5. **No engine changes** — all fixes are in data types, stores, UI components, and shared components. The pure engine layer (`src/engine/`) is untouched.
6. **`Toggle.tsx` is retained** — it's still appropriate for non-keyword switches (e.g., weapon "Enabled" toggle). Only keyword booleans are migrated to `Checkbox`.
7. **`disableDefenseDice` store field is preserved** — the UI maps the 3-option SegmentedControl to the existing `disableDefenseDice` boolean + `dieColor` field, avoiding engine changes.
8. **`SectionHeader` spacing tightening is global** — reducing `space-y-3` to `space-y-2` affects all sections in both panels uniformly. This is intentional for consistency.
