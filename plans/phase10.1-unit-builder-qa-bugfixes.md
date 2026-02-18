# Phase 10.1: Unit Builder QA Bugfixes

## Problem Statement

Playwright-driven QA testing of the Unit Builder feature (post-Phase 10) uncovered five bugs affecting unit selection, weapon display, state management, and upgrade slot matching. These range from high-severity (single-mini units completely non-functional) to low-severity (cosmetic duplicate names in dropdowns).

### QA Testing Summary

| # | Bug | Severity | Category |
|---|-----|----------|----------|
| A | Single-mini units show no weapons and missing keywords | HIGH | Engine / Data |
| B | Faction change doesn't reset loaded preset state | MEDIUM | Store / UI |
| C | Duplicate unit names in dropdown (no subtitle disambiguation) | LOW-MEDIUM | Data / UI |
| D | Attack type filtering hides valid units in Unit Builder | LOW-MEDIUM | UI / UX |
| E | Imperial March upgrade slot always empty | LOW | Data Pipeline |

**Not in scope:**
- Heavy weapon upgrades missing weapon enrichment data (manual human task — upgrade-by-upgrade enrichment)
- `isGrenade` on Impact Grenades (already fixed during QA session)

---

## Dependencies

- **Phase 10** (weapon display refactor — this fixes issues introduced/exposed by the Phase 10 architecture)
- **Phase 5.5** (unit data pipeline — 10.1C modifies `processApiData.ts` and `ProcessedUnit` type; 10.1E modifies upgrade slot matching)
- **Phase 6** (UI panels — 10.1B/D modify `AttackerPanel.tsx` and `DefenderPanel.tsx`)
- **Stores** (10.1B modifies `attackConfigStore.ts` and `defenseConfigStore.ts`)

No new runtime dependencies introduced.

---

## Design Decisions

1. **Single-mini units reuse the multi-mini preset codepath** — Rather than patching `generateAttackerPreset()` to add `unitBaseWeapons`, `baseMiniatureCount`, and keyword propagation (which would duplicate multi-mini logic), we unify both paths to always emit `unitBaseWeapons` and `baseMiniatureCount`. This ensures `useDisplayWeapons` works consistently for all unit types.

2. **Faction change triggers a full preset clear** — `setSelectedFaction()` will reset all unit-related state (weapons, upgrades, keywords, costs) to defaults. This is safer than trying to preserve partial state across faction boundaries. The `selectedPresetId` is also cleared since the old unit no longer belongs to the new faction's list.

3. **Subtitle is added to the processed data pipeline** — The `title` field from the raw API data (e.g., "Hero of the Rebellion", "Jedi Knight") is preserved through processing into `ProcessedUnit` and `ResolvedUnit`. The preset generator then passes it to `AttackerPreset` and `DefenderPreset`. The UI only appends the subtitle when **multiple units share the same name and rank** — avoiding unnecessary visual noise.

4. **Unit Builder dropdown shows all units regardless of attack type** — In Unit Builder mode, the user should be able to select any unit and then configure the attack type afterward. The attack type filter is only applied to the weapon display layer (which already handles it correctly in `useDisplayWeapons`). This matches the user's mental model: pick a unit, then choose how it attacks.

5. **Imperial March slot falls back to training upgrades** — The `imperial-march` slot is a special-purpose slot that accepts the same upgrades as `training`. This pattern of a specialized slot sharing a card pool with a general slot is represented by a slot-alias mapping in `getUpgradesForSlot()`. This avoids modifying the upstream API data processing.

---

## 10.1A: Fix Single-Mini Unit Preset Generation

### Problem

Single-mini units (Luke Skywalker, Darth Vader, Boba Fett, Han Solo, etc.) show **"No weapons loaded"** in Unit Builder mode. Additionally, unit-level keywords (like Attack Surge: Crit) are not applied to the panel controls.

**Root cause:** `generateAttackerPreset()` in `presetGenerator.ts` generates per-weapon presets for single-mini units but does NOT include `unitBaseWeapons` or `baseMiniatureCount` in the profile. The `useDisplayWeapons` hook depends on `unitBaseWeapons` to populate the weapon list, so single-mini units get an empty weapons section.

Additionally, the current approach creates separate presets per weapon for single-mini units (e.g., Luke gets one preset per weapon entry), but the Unit Builder dropdown deduplicates by `unitApiId` and only shows one entry — pointing to the first weapon's preset. This means the loaded preset has only that one weapon in its `weapons[]` array, not the full `unitBaseWeapons` list.

### Implementation

#### Step 1: Unify single-mini and multi-mini preset generation

**File:** `src/data/presetGenerator.ts`

Modify `generateAttackerPreset()` to include `unitBaseWeapons` and `baseMiniatureCount` in the profile, matching what `generateMultiMiniAttackerPreset()` does:

```typescript
function generateAttackerPreset(
  unit: ResolvedUnit,
  weaponIndex: number,
): AttackerPreset {
  const weapon = unit.weapons[weaponIndex];

  // ... existing engineWeapon construction ...

  // Convert all unit weapons to data-layer format for unitBaseWeapons
  const unitBaseWeapons = unit.weapons.map(w => ({
    name: w.name,
    weaponType: w.weaponType,
    redDice: w.redDice,
    blackDice: w.blackDice,
    whiteDice: w.whiteDice,
    keywords: w.keywords,
    minRange: w.minRange,
    maxRange: w.maxRange,
  }));

  const profile: Record<string, any> = {
    weapons: [engineWeapon],
    baseMiniatureCount: unit.figures,        // ← ADD
    unitBaseWeapons: unitBaseWeapons,         // ← ADD (all weapons, all attack types)
    surgeChart: unit.attackSurgeChart ?? AttackSurgeChart.None,
    unitCost: unit.cost,
  };

  // ... rest unchanged (copyKeywordsToProfile, etc.) ...
}
```

This ensures that when `loadPreset()` stores the profile, `unitBaseWeapons` will be populated and `useDisplayWeapons` will have weapon data to display.

#### Step 2: Verify keyword propagation

The existing `copyKeywordsToProfile(unit.keywords, profile)` call in `generateAttackerPreset()` should already copy `surgeChart` and unit-level keywords. However, verify that `unit.attackSurgeChart` is correctly populated for enriched single-mini units (confirm enrichment entries for Luke, Vader, etc. set `attackSurge`).

**Files to check:** `src/data/enrichment/units.ts` — verify that single-mini unit entries include `attackSurge` (e.g., `AttackSurgeChart.Crit` for Darth Vader, `AttackSurgeChart.None` for Luke with no surge).

### Testing

- **Unit test:** Add a test in `src/data/presetGenerator.test.ts` (or create if none exists) that generates a preset for a single-mini enriched unit and asserts:
  - `profile.unitBaseWeapons` is a non-empty array
  - `profile.baseMiniatureCount` equals `unit.figures` (typically 1)
  - `profile.surgeChart` matches the enrichment's `attackSurge` value
- **Manual verification:** Select Luke Skywalker in Unit Builder → weapon list should display his weapons from enrichment data.

### Risk Assessment

Low. This adds two fields to the profile that `loadPreset()` already handles (it has fallbacks: `profile.unitBaseWeapons ?? []` and `profile.baseMiniatureCount ?? 1`). The existing per-weapon preset for single-mini units still works for Custom Pool mode consumers. No engine changes.

---

## 10.1B: Reset Preset State on Faction Change

### Problem

When changing the attacker (or defender) faction, the unit dropdown clears visually, but the previously loaded unit's **weapons, upgrade slots, keywords, cost, and miniature counts** remain in the store. This causes stale data to appear in the weapons section, upgrade bar, and keyword controls.

**Root cause:** `setSelectedFaction()` in both stores only does `set({ selectedFaction: faction })` — it does not reset any unit-related state.

### Implementation

#### Step 1: Add a `clearUnit` action to both stores

**File:** `src/stores/attackConfigStore.ts`

Add a new action that resets all unit-related state to defaults without touching faction or mode:

```typescript
// In the state interface:
clearUnit: () => void;

// In the store implementation:
clearUnit: () =>
  set(() => ({
    ...DEFAULT_ATTACK_CONFIG,
    // Preserve UI-only state that isn't unit-specific
    selectedFaction: get().selectedFaction,
    activeMode: get().activeMode,
    rerollStrategy: get().rerollStrategy,
    // Clear unit-related state
    selectedPresetId: null,
    baseMiniatureCount: 1,
    unitBaseWeapons: [],
    upgradeBar: [],
    equippedUpgradeIds: [],
    weaponMiniCounts: {},
    unitApiId: null,
  })),
```

**File:** `src/stores/defenseConfigStore.ts`

Add the same `clearUnit` action with the appropriate default config for the defender store.

#### Step 2: Call `clearUnit` from `setSelectedFaction`

Alternatively, instead of a separate action, modify `setSelectedFaction` directly to reset unit state when the faction changes:

**File:** `src/stores/attackConfigStore.ts`

```typescript
setSelectedFaction: (faction) =>
  set((state) => {
    // If faction actually changed (or going from a selected faction to different),
    // clear unit-related state
    if (faction !== state.selectedFaction) {
      return {
        ...DEFAULT_ATTACK_CONFIG,
        selectedFaction: faction,
        activeMode: state.activeMode,
        rerollStrategy: state.rerollStrategy,
        selectedPresetId: null,
        baseMiniatureCount: 1,
        unitBaseWeapons: [],
        upgradeBar: [],
        equippedUpgradeIds: [],
        weaponMiniCounts: {},
        unitApiId: null,
      };
    }
    return { selectedFaction: faction };
  }),
```

Apply the same pattern to `defenseConfigStore.ts`.

#### Step 3: Also clear on `setSelectedPresetId(null)` (clear selection button)

The "Clear selection" (✕) button calls `handlePresetChange('')` which calls `store.setSelectedPresetId(null)`. This currently only clears the visual selection but not the underlying state.

**File:** `src/components/AttackerPanel/AttackerPanel.tsx`

Update `handlePresetChange` to call `clearUnit()` (or reset the relevant state) when the preset is cleared:

```typescript
const handlePresetChange = (presetId: string) => {
  if (!presetId || presetId === '') {
    store.clearUnit();  // ← Full reset instead of just clearing the ID
    return;
  }
  // ... existing preset load logic ...
};
```

Apply the same fix to `DefenderPanel.tsx`.

### Recommended Approach

Prefer the `clearUnit` action approach (Step 1 + Step 3) over modifying `setSelectedFaction` directly. Reasons:
- `clearUnit` is reusable from multiple call sites (faction change, clear button, mode switch)
- `setSelectedFaction` stays a simple setter (single responsibility)
- The component is responsible for the orchestration: faction change → clear unit

Then in the component:

```typescript
// In AttackerPanel.tsx:
onChange={(value) => {
  const newFaction = value === '' ? null : (value as Faction);
  if (newFaction !== store.selectedFaction) {
    store.clearUnit();
  }
  store.setSelectedFaction(newFaction);
}}
```

### Testing

- **Unit test:** In an `attackConfigStore` test file:
  1. Load a preset → verify weapons, upgradeBar, etc. are populated
  2. Call `clearUnit()` → verify all unit state is reset to defaults
  3. Verify that `selectedFaction` and `activeMode` are preserved
- **Unit test:** Simulate faction change flow:
  1. Load a preset for Rebel Alliance
  2. Change faction to Empire
  3. Assert `selectedPresetId` is null, `unitBaseWeapons` is empty, etc.

### Risk Assessment

Low-medium. The primary risk is accidentally resetting state that users intentionally set (like tokens, reroll strategy). The implementation preserves non-unit-specific settings. Both the `handlePresetChange` clear path and the faction change path should converge on the same reset behavior.

---

## 10.1C: Disambiguate Duplicate Unit Names with Subtitle

### Problem

Multiple units share the same name and rank, making them indistinguishable in the dropdown. Examples:
- Luke Skywalker (Commander) × 2 — "Hero of the Rebellion" vs "Jedi Knight"
- Rebel Commandos (Special-forces) × 2
- Wookiee Warriors (Corps) × 2
- Imperial Special Forces (Special-forces) × 2
- Scout Troopers (Special-forces) × 2
- Stormtroopers (Corps) × 2

The raw API data has a `title` field (e.g., "Hero of the Rebellion", "Jedi Knight") that disambiguates these units, but it is not carried through the processing pipeline.

### Implementation

#### Step 1: Add `title` to the processed data pipeline

**File:** `scripts/processApiData.ts`

Add `title` to the processed unit output:

```typescript
return {
  apiId: u.id,
  id: uniqueId,
  name: u.name,
  title: u.title || null,    // ← ADD: e.g., "Hero of the Rebellion"
  faction,
  cost: resolveCost(u),
  // ... rest unchanged
};
```

#### Step 2: Add `title` to the `ProcessedUnit` interface

**File:** `src/data/types.ts`

```typescript
export interface ProcessedUnit {
  apiId: number;
  id: string;
  name: string;
  title: string | null;      // ← ADD
  faction: Faction;
  // ... rest unchanged
}
```

#### Step 3: Flow `title` through `ResolvedUnit`

**File:** `src/data/types.ts`

```typescript
export interface ResolvedUnit {
  id: string;
  apiId: number;
  name: string;
  title: string | null;      // ← ADD
  faction: Faction;
  // ... rest unchanged
}
```

**File:** `src/data/unitResolver.ts`

Ensure the resolution logic passes `title` through from `ProcessedUnit` to `ResolvedUnit`.

#### Step 4: Flow `title` through preset types

**File:** `src/data/presets.ts`

```typescript
export interface AttackerPreset {
  id: string;
  faction: Faction;
  name: string;
  title: string | null;      // ← ADD
  // ... rest unchanged
}

export interface DefenderPreset {
  id: string;
  faction: Faction;
  name: string;
  title: string | null;      // ← ADD
  // ... rest unchanged
}
```

**File:** `src/data/presetGenerator.ts`

Pass `title` through in all three preset generators:

```typescript
return {
  id: ...,
  faction: ...,
  name: ...,
  title: unit.title,          // ← ADD
  // ... rest unchanged
};
```

#### Step 5: Re-run `processApiData.ts` to regenerate processed data

```bash
npx tsx scripts/processApiData.ts
```

This regenerates `src/data/processed/units.json` with the new `title` field.

#### Step 6: Disambiguate in the UI dropdown

**File:** `src/components/AttackerPanel/AttackerPanel.tsx`

In the `unitOptions` memo, detect name+rank collisions and append subtitle only when needed:

```typescript
const unitOptions: ComboboxOption[] = useMemo(() => {
  const filtered = getAttackerPresets(store.selectedFaction);

  // Build unique units map
  const uniqueUnits = new Map<string, { preset: AttackerPreset }>();
  for (const preset of filtered) {
    const unitKey = `${preset.unitApiId}`;
    if (!uniqueUnits.has(unitKey)) {
      uniqueUnits.set(unitKey, { preset });
    }
  }

  // Detect name+rank collisions that require subtitle disambiguation
  const nameRankCounts = new Map<string, number>();
  for (const { preset } of uniqueUnits.values()) {
    const baseUnitName = preset.name.replace(/\s*\([^)]*\)$/, '');
    const key = `${baseUnitName}|${preset.rank}`;
    nameRankCounts.set(key, (nameRankCounts.get(key) ?? 0) + 1);
  }

  return Array.from(uniqueUnits.values()).map(({ preset }) => {
    const baseUnitName = preset.name.replace(/\s*\([^)]*\)$/, '');
    const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
    const key = `${baseUnitName}|${preset.rank}`;
    const needsSubtitle = (nameRankCounts.get(key) ?? 0) > 1 && preset.title;

    const label = needsSubtitle
      ? `${baseUnitName}, ${preset.title} (${rankLabel})`
      : `${baseUnitName} (${rankLabel})`;

    return { value: preset.id, label };
  });
}, [store.selectedFaction]);
```

Apply the same disambiguation to `DefenderPanel.tsx`.

### Display Format

- **No collision:** `Luke Skywalker (Commander)`
- **Collision with subtitle:** `Luke Skywalker, Hero of the Rebellion (Commander)` / `Luke Skywalker, Jedi Knight (Commander)`
- **Collision without subtitle (fallback):** Append a short portion of the unit ID to distinguish

### Testing

- **Unit test:** Given two preset entries with the same name "Luke Skywalker" and rank "Commander" but different titles, verify that the generated labels include the subtitle.
- **Manual verification:** Open the Rebel Alliance unit dropdown → verify "Luke Skywalker, Hero of the Rebellion (Commander)" and "Luke Skywalker, Jedi Knight (Commander)" appear as distinct options.

### Risk Assessment

Low. The `title` field is additive — existing code that doesn't reference it is unaffected. The `processApiData.ts` change requires re-running the processing script. The dropdown label change is purely cosmetic.

---

## 10.1D: Remove Attack Type Filtering from Unit Builder Dropdown

### Problem

In Unit Builder mode, the unit dropdown only shows units that have weapons matching the currently selected attack type. This means:
- Darth Vader (Commander) — a melee-only unit — doesn't appear when Ranged is selected
- Ranged-only units don't appear when Melee is selected
- Users must know to change the attack type *before* selecting a unit

This is unintuitive for Unit Builder mode, where users should be able to browse and select any unit regardless of current attack type settings.

### Implementation

#### Step 1: Skip attack type filtering for unit options in Unit Builder

**File:** `src/components/AttackerPanel/AttackerPanel.tsx`

Modify the `unitOptions` memo to not filter by attack type:

```typescript
const unitOptions: ComboboxOption[] = useMemo(() => {
  // In Unit Builder mode, show all units for the faction (no attack type filter)
  // The weapon display layer (useDisplayWeapons) handles attack type filtering
  const filtered = getAttackerPresets(store.selectedFaction);

  // ... existing deduplication + disambiguation logic ...
}, [store.selectedFaction]);  // ← Remove `attackType` dependency
```

Note: `getAttackerPresets()` is called without an `attackType` argument, which returns presets for all attack types.

#### Step 2: Handle attackType in preset loading

When loading a preset in Unit Builder mode, the preset's `attackType` should not override the global attack type. The currently selected attack type should remain as-is, and `useDisplayWeapons` will filter the unit's weapons by the current attack type (this already works).

However, consider auto-switching the attack type when a unit is selected that has NO weapons for the current attack type. For example, if Melee is selected and the user picks a ranged-only unit, auto-switch to Ranged. This improves UX by avoiding a "no weapons" state.

**File:** `src/components/AttackerPanel/AttackerPanel.tsx`

```typescript
const handlePresetChange = (presetId: string) => {
  if (!presetId || presetId === '') {
    store.clearUnit();
    return;
  }
  // Find any matching preset for this unit (attack type doesn't matter for loading)
  const preset = getAttackerPresetById(presetId);
  if (preset) {
    store.loadPreset(preset.id, preset.profile, preset.upgradeBar, preset.unitApiId);
  }
};
```

Note: `getAttackerPresetById` currently takes an optional `attackType` filter. Calling it without the filter ensures we find the preset regardless of attack type.

#### Step 3: Consider showing an informational message

When a unit has no weapons compatible with the current attack type, the `useDisplayWeapons` hook returns an empty weapon list. The `AttackerUnitBuilderView` should show a helpful message like "No weapons available for this attack type. Switch to [Melee/Ranged] to see this unit's weapons." instead of "No weapons loaded."

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Check `unitBaseWeapons.length > 0` (unit has weapons) but `weapons.length === 0` (none match current attack type) and display an appropriate message.

### Testing

- **Manual verification:**
  1. Set attack type to Ranged
  2. Open Unit Builder, select Empire
  3. Verify Darth Vader (Commander) appears in the dropdown
  4. Select Darth Vader → weapons section shows message about switching to Melee
  5. Switch to Melee → Darth Vader's weapons appear

### Risk Assessment

Low. The attack type filtering was an incidental constraint from how presets were originally structured (one preset per weapon, each tagged with an attack type). Removing it from the dropdown doesn't affect the engine — `useDisplayWeapons` already handles per-weapon attack type filtering correctly.

---

## 10.1E: Fix Imperial March Upgrade Slot Matching

### Problem

Units with an `imperial-march` upgrade slot (Stormtroopers, etc.) show an empty upgrade dropdown — no upgrades match.

**Root cause:** The unit's upgrade bar correctly says `"imperial-march"` (upgrade type ID 22 in the API). However, the Imperial March upgrade card has `upgradeSlot: "training"` (upgrade type ID 10) because in the API data, the upgrade's `upgrade_type_fkey` is 10 (Training), not 22 (Imperial March).

This is a data modeling mismatch: the **slot on the unit** is `imperial-march`, but the **card's type** is `training`. The `getUpgradesForSlot()` function does exact matching (`u.upgradeSlot !== slot`), so it never finds the Imperial March card for the `imperial-march` slot.

### Analysis

Looking at the API data:
- Unit slot: `upgrade_type_fkey = 22` → maps to `"imperial-march"`
- Imperial March upgrade card: `upgrade_type_fkey = 10` → maps to `"training"`

This means the upgrade card is categorized as a Training card, but units have a dedicated slot for it. The slot is exclusive — it only accepts that one card (Imperial March). This is a game design pattern where a specific upgrade gets its own slot icon on the unit card.

### Implementation

#### Approach: Slot alias mapping in `getUpgradesForSlot()`

**File:** `src/data/upgradeResolver.ts`

Add a slot alias/fallback map that expands the search when a slot has known aliases:

```typescript
/**
 * Slot aliases: some unit slots accept upgrades categorized under a different slot type.
 * Key = the slot on the unit card, Value = the upgrade slot to also search.
 */
const SLOT_ALIASES: Partial<Record<UpgradeSlot, UpgradeSlot>> = {
  [UpgradeSlot.ImperialMarch]: UpgradeSlot.Training,
};

export function getUpgradesForSlot(
  slot: UpgradeSlot,
  unitApiId?: number,
): ResolvedUpgrade[] {
  const slotsToSearch = [slot];
  const alias = SLOT_ALIASES[slot];
  if (alias) slotsToSearch.push(alias);

  return getAllResolvedUpgrades().filter((u) => {
    if (!slotsToSearch.includes(u.upgradeSlot)) return false;

    // For aliased slots, additionally filter by name match when the slot
    // is a named/exclusive slot (imperial-march only accepts "Imperial March")
    if (u.upgradeSlot !== slot && alias) {
      // Only include the specific upgrade that matches the slot name
      // Use a name-based filter for named slots
      if (slot === UpgradeSlot.ImperialMarch && u.name !== 'Imperial March') {
        return false;
      }
    }

    if (unitApiId !== undefined && u.restrictedToUnitApiId !== null) {
      return u.restrictedToUnitApiId === unitApiId;
    }
    return true;
  });
}
```

#### Alternative approach: Fix the processed data

An alternative is to change `processApiData.ts` to map the Imperial March upgrade's slot from `"training"` to `"imperial-march"`. However, this is fragile because it requires special-casing by upgrade name in the processing script, and the card genuinely IS a training upgrade in the API — it just has a dedicated unit slot.

**Recommendation:** Use the slot alias approach. It's more explicit about the game rule ("imperial-march slots accept specific training upgrades") and doesn't mutate upstream data.

### Testing

- **Unit test:** Call `getUpgradesForSlot(UpgradeSlot.ImperialMarch)` → verify it returns at least one result with `name === 'Imperial March'`.
- **Unit test:** Call `getUpgradesForSlot(UpgradeSlot.Training)` → verify it still returns all training upgrades (Imperial March included, since it IS a training card).
- **Manual verification:** Select Stormtroopers → Imperial March slot dropdown shows "Imperial March (6)".

### Risk Assessment

Very low. The alias only fires for the `imperial-march` slot. All other slots continue to use exact matching. The name filter prevents unrelated training upgrades from appearing in the imperial-march dropdown.

---

## Implementation Order

```
10.1A (single-mini weapons)     ← Highest impact, fixes ~50% of units
  │
  ├── 10.1B (faction change reset) ← Prevents stale state confusion
  │
  ├── 10.1C (subtitle disambiguation) ← Data pipeline change, re-run processApiData
  │
  ├── 10.1D (attack type filtering)   ← UX improvement, depends on 10.1A working
  │
  └── 10.1E (Imperial March slot)     ← Independent, low-risk
```

**10.1A should be implemented first** — it's the highest-severity bug and unblocks testing of single-mini units. **10.1B** and **10.1E** are independent of each other and can be done in any order. **10.1C** requires a `processApiData.ts` re-run. **10.1D** is optional if the team prefers to keep attack type filtering.

---

## Files Changed (Summary)

| File | Issues |
|------|--------|
| `src/data/presetGenerator.ts` | 10.1A |
| `src/data/types.ts` | 10.1C |
| `src/data/presets.ts` | 10.1C |
| `src/data/unitResolver.ts` | 10.1C |
| `src/data/upgradeResolver.ts` | 10.1E |
| `src/stores/attackConfigStore.ts` | 10.1B |
| `src/stores/defenseConfigStore.ts` | 10.1B |
| `src/components/AttackerPanel/AttackerPanel.tsx` | 10.1B, 10.1C, 10.1D |
| `src/components/DefenderPanel/DefenderPanel.tsx` | 10.1B, 10.1C |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | 10.1D (info message) |
| `scripts/processApiData.ts` | 10.1C |
| `src/data/processed/units.json` | 10.1C (regenerated) |

---

## Quality Gate

All changes must pass:
```bash
npm run typecheck
npm run lint
npm run test
```

Manual Playwright verification of:
1. Single-mini unit (Luke / Darth Vader) → weapons display correctly
2. Faction change → stale data clears
3. Duplicate units → subtitle shown
4. Melee-only unit visible in Ranged mode dropdown
5. Imperial March slot → shows upgrade option
