# Phase 12 — Dynamic Upgrade Slots & Slot Requirements

## Goal

1. **Dynamic upgrade slots (`addsUpgradeSlot`):** Extract `unlocked_by` relationships from raw unit data during processing to auto-populate `addsUpgradeSlot` on processed upgrades. Wire up the store and UI so that when an upgrade with `addsUpgradeSlot` is equipped, new slot dropdowns appear; when unequipped, those slots and their contents are cascading-unequipped.

2. **Slot requirements (`requiredUpgradeSlot`):** Process the raw `required_upgrade_type` field from upgrade data so that upgrades which require the unit to have a specific slot type in its upgrade bar are only shown when the unit's effective upgrade bar contains that slot. The required slot does not consume or occupy that slot — it is purely an eligibility check.

## Background

### Current State

- Raw `units.json` contains `upgrade_types[]` entries on each unit. Some entries have `unlocked_by: <upgradeApiId>`, meaning that slot only exists when the referenced upgrade is equipped.
- `processApiData.ts` **filters out** all `unlocked_by != null` entries (line ~222), so conditional slots never appear in `processed/units.json`.
- The `addsUpgradeSlot: UpgradeSlot[]` field **already exists** on `ResolvedUpgrade` (types.ts line 367) and `UpgradeEnrichment` (enrichment/types.ts line 161–172). It is resolved from enrichment in `upgradeResolver.ts` (line 255) but defaults to `[]` because no enrichment data has been populated.
- The stores (`attackConfigStore.ts`, `defenseConfigStore.ts`) track a static `upgradeBar: UpgradeSlot[]` set at `loadPreset` time. `equipUpgrade` only updates `equippedUpgradeIds` and recalculates cost — it does not inspect `addsUpgradeSlot`.
- Both `AttackerUnitBuilderView.tsx` and `DefenderUnitBuilderView.tsx` iterate `store.upgradeBar` directly.
- `WORK_PLAN.md` lists `effectiveUpgradeBar`, `recomputeEffectiveUpgradeBar()`, dynamic UI dropdowns, and store tests as **DEFERRED** items.

### `unlocked_by` Data Summary

The raw data contains ~30+ entries across many units. Key examples:

| `unlocked_by` API ID | Upgrade Name | Unlocked Slot(s) |
|---|---|---|
| 20801 | Agent Kallus | `heavy-weapon` |
| 20800 | Cassian Andor | `heavy-weapon` |
| 20803 | Kraken | `heavy-weapon` |
| 20802 | Clone Captain Rex | `command`, `training` |
| 135 | Stormtrooper Specialist | `gear` |
| 134 | Stormtrooper Captain | `training` |
| 67 | Imperial Comms Technician | `comms` |
| 133 | Rebel Trooper Specialist | `gear` |
| 132 | Rebel Trooper Captain | `training` |
| 55 | Rebel Comms Technician | `comms` |
| 194 | Clone Comms Technician | `comms` |
| 167 | Iden's ID10 Seeker Droid | `comms` |
| 3648 | "Nanny" Programming | `programming` |
| 9402 | Ewok Trapper | `training` |
| 16567 | Clone Specialist | `gear` |
| 20438 | Jedi Training, Force Adept | `force` |
| 20430 | Jedi Negotiator | `training` |
| 20429 | Jedi Consular | `force` |
| 20428 | General of the Republic | `command` |
| 20458 | Expanded Databanks | `protocol` |
| 20450 | Seek and Destroy | `training` |
| 20449 | Tyrannical Taskmaster | `protocol` |

API IDs 138 and 139 (Phase I Clone Captain/Specialist) have `revamp: false` and are filtered out — no action needed.

### `required_upgrade_type` Data Summary

The raw `upgrades.json` has a `required_upgrade_type` field on each upgrade (usually `null`). When non-null, it specifies an upgrade slot type (by `upgrade_type_fkey`) that the unit **must have in its upgrade bar** for this upgrade to be equippable. The upgrade does not occupy or consume that required slot — it's purely an eligibility gate.

Currently only **2 upgrades** have a non-null `required_upgrade_type`:

| API ID | Name | Upgrade Slot | `required_upgrade_type` | Required Slot |
|---|---|---|---|---|
| 179 | Offensive/Defensive Stance | `training` | 5 | `force` |
| 183 | Offensive/Defensive Stance | `training` | 5 | `force` (hidden variant) |

Both are Training upgrades that require the unit to have a **Force** slot. This means only Force-wielding units (or units that gain a Force slot via a dynamic `addsUpgradeSlot` upgrade) can equip this card.

This field is currently **completely unprocessed** — dropped by `processApiData.ts`, absent from `ProcessedUpgrade` and `ResolvedUpgrade`, and never checked in `getUpgradesForSlot()`.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Field naming (slots) | Reuse `addsUpgradeSlot` | Already exists on `ResolvedUpgrade` and `UpgradeEnrichment`; avoids type churn |
| Field naming (requirement) | `requiredUpgradeSlot: UpgradeSlot \| null` | Clear, descriptive; mirrors `required_upgrade_type` semantics from API |
| Data source (slots) | Auto-derive in `processApiData.ts` | Script scans `unlocked_by` entries → builds map → writes to processed upgrades; enrichment can still override/supplement |
| Data source (requirement) | Process `required_upgrade_type` in `processApiData.ts` | Straightforward 1:1 mapping from raw field to processed field |
| Cascading unequip | Yes | Automatically clear dynamic slots and their contents when the parent upgrade is removed; prevents stale state |
| Slot requirement check scope | `effectiveUpgradeBar` | The required slot check must consider dynamically-added slots, not just the base bar — e.g., a unit that gains a Force slot via Jedi Consular should then be able to equip Offensive/Defensive Stance |

## Implementation Steps

### Step 1a — Data Pipeline: Auto-derive `addsUpgradeSlot` in `processApiData.ts`

**File:** `scripts/processApiData.ts`

Before the upgrade processing loop (~line 230):

1. Iterate all raw units and their `upgrade_types` entries.
2. Filter to revamp entries with `unlocked_by != null`.
3. Build a map: `Map<number, Set<string>>` where key = `unlocked_by` (upgrade API ID), value = set of upgrade slot slugs derived from `upgrade_type_fkey` via `upgradeTypeIdToSlug`.
4. During upgrade processing, for each upgrade, look up its API ID in the map and emit `addsUpgradeSlot: Array.from(map.get(apiId) ?? [])`.

**Result:** Each processed upgrade in `upgrades.json` now has an `addsUpgradeSlot` array (empty for most, populated for ~20 upgrades).

### Step 1b — Data Pipeline: Process `required_upgrade_type` in `processApiData.ts`

**File:** `scripts/processApiData.ts`

During upgrade processing (~line 280+), map the raw `required_upgrade_type` field:

1. If `up.required_upgrade_type` is non-null, look up the slug via `UPGRADE_TYPE_MAP[up.required_upgrade_type]`.
2. Emit `requiredUpgradeSlot: slug ?? null` on the processed upgrade.
3. If null, emit `requiredUpgradeSlot: null`.

**Result:** Each processed upgrade in `upgrades.json` now has a `requiredUpgradeSlot` field (null for most, `"force"` for the 2 Offensive/Defensive Stance upgrades).

### Step 2 — Type Updates

**File:** `src/data/types.ts`

#### 2a. Add `addsUpgradeSlot` to `ProcessedUpgrade`

Add `addsUpgradeSlot: UpgradeSlot[]` to the `ProcessedUpgrade` interface (~line 260, after `keywordNames`).

The `ResolvedUpgrade` interface already has this field — no change needed there.

#### 2b. Add `requiredUpgradeSlot` to `ProcessedUpgrade` and `ResolvedUpgrade`

Add `requiredUpgradeSlot: UpgradeSlot | null` to both interfaces.

This is a new field — it does not exist on either type today.

### Step 3 — Resolver Update: Merge processed data + enrichment; add slot requirement filtering

**File:** `src/data/upgradeResolver.ts`

#### 3a. Update `resolveUpgrade`

Merge both sources for `addsUpgradeSlot`:

```typescript
addsUpgradeSlot: [
  ...new Set([
    ...(processed.addsUpgradeSlot ?? []),
    ...(enrichment?.addsUpgradeSlot ?? []),
  ]),
] as UpgradeSlot[],
```

Pass through `requiredUpgradeSlot`:

```typescript
requiredUpgradeSlot: processed.requiredUpgradeSlot ?? null,
```

This gives processed (auto-derived) data as the base, with enrichment able to supplement for `addsUpgradeSlot`. The `??` fallback on `processed.addsUpgradeSlot` handles backward compat during the transition.

#### 3b. Update `normalizeProcessedUpgrade`

Handle both new fields from JSON:
- `addsUpgradeSlot`: pass through as-is (string enum values matching slug format).
- `requiredUpgradeSlot`: pass through as-is (string or null).

#### 3c. Add `requiredUpgradeSlot` filter to `getUpgradesForSlot`

Extend the `UnitContext` interface with an optional `effectiveUpgradeBar?: UpgradeSlot[]` field.

Add a new filter step (step 8) in `getUpgradesForSlot`:

```typescript
// 8. Required upgrade slot — unit must have the required slot in its effective upgrade bar
if (u.requiredUpgradeSlot !== null) {
  const availableSlots = context.effectiveUpgradeBar;
  if (availableSlots && !availableSlots.includes(u.requiredUpgradeSlot)) {
    return false;
  }
}
```

This checks the unit's **effective** upgrade bar (base + dynamic slots), so upgrades like Offensive/Defensive Stance correctly appear once a Force slot is dynamically added. When `effectiveUpgradeBar` is not provided in context (e.g., no unit selected), the restriction is silently skipped — consistent with how other inclusion restrictions work.

### Step 4 — Regenerate Processed Data

Run `npx tsx scripts/processApiData.ts` to regenerate `src/data/processed/upgrades.json` with the new `addsUpgradeSlot` field.

Verify a few known entries:
- Agent Kallus (`apiId: 20801`) → `addsUpgradeSlot: ["heavy-weapon"]`
- Stormtrooper Captain (`apiId: 134`) → `addsUpgradeSlot: ["training"]`
- Clone Captain Rex (`apiId: 20802`) → `addsUpgradeSlot: ["command", "training"]`

### Step 5 — Shared Helper: `recomputeEffectiveUpgradeBar`

**New file:** `src/stores/upgradeBarHelpers.ts`

```typescript
import type { UpgradeSlot } from '../data/types';
import { getResolvedUpgradeById } from '../data/upgradeResolver';

export interface EffectiveUpgradeBarResult {
  effectiveUpgradeBar: UpgradeSlot[];
  equippedUpgradeIds: (string | null)[];
  removedUpgradeIds: string[];  // IDs that were cascading-unequipped (for cost recalc)
}

/**
 * Recompute the effective upgrade bar from the base bar and equipped upgrades.
 *
 * For each equipped upgrade in a base or dynamic slot, if it has `addsUpgradeSlot`,
 * those slots are appended. If an upgrade is removed and it previously added dynamic
 * slots, those slots and any upgrades in them are cascading-removed.
 *
 * @param baseBar      The unit's static upgrade bar from the preset.
 * @param equippedIds  Current equipped upgrade IDs (parallel to effective bar, may be longer than baseBar).
 * @returns            New effective bar, trimmed/extended equipped IDs, and list of removed upgrade IDs.
 */
export function recomputeEffectiveUpgradeBar(
  baseBar: UpgradeSlot[],
  equippedIds: (string | null)[],
): EffectiveUpgradeBarResult {
  // ...implementation details in Step 5
}
```

**Algorithm:**

1. Start with `effectiveBar = [...baseBar]` and `effectiveEquipped = equippedIds.slice(0, baseBar.length)`.
2. Walk through `effectiveEquipped` indices. For each equipped upgrade, look up `addsUpgradeSlot`. For each added slot:
   - Append the slot to `effectiveBar`.
   - If `equippedIds` has a value at that extended index, carry it over to `effectiveEquipped`; otherwise append `null`.
3. Any indices in the old `equippedIds` beyond the new `effectiveBar` length are "orphaned" — collect their IDs into `removedUpgradeIds`.
4. Recursively check: if any `removedUpgradeIds` upgrade itself had `addsUpgradeSlot`, those slots are also removed (they won't appear in step 2 since the parent is gone).
5. Return `{ effectiveUpgradeBar, equippedUpgradeIds: effectiveEquipped, removedUpgradeIds }`.

**Edge case handling:**
- An upgrade that adds a slot, which itself has an upgrade that adds another slot (multi-level chaining): handled by processing in order since dynamic slots are appended sequentially, and their equipped upgrades are also checked.
- Same slot added by multiple upgrades: each adds its own independent slot entry.

### Step 6 — Store Updates: Both Attacker and Defender

**Files:** `src/stores/attackConfigStore.ts`, `src/stores/defenseConfigStore.ts`

#### 6a. New state field

Add to the state interface:

```typescript
/** Effective upgrade bar: base bar + dynamic slots from equipped upgrades with addsUpgradeSlot */
effectiveUpgradeBar: UpgradeSlot[];
```

#### 6b. Update `loadPreset`

Initialize `effectiveUpgradeBar` to the base `upgradeBar` value (no upgrades equipped yet):

```typescript
effectiveUpgradeBar: upgradeBar ?? [],
```

#### 6c. Update `equipUpgrade`

1. Set `equippedUpgradeIds[slotIndex] = upgradeId`.
2. Call `recomputeEffectiveUpgradeBar(state.upgradeBar, newIds)`.
3. Recalculate cost from the result's `equippedUpgradeIds` (which may have been truncated by cascade).
4. Return `{ equippedUpgradeIds: result.equippedUpgradeIds, effectiveUpgradeBar: result.effectiveUpgradeBar, unitCost: totalCost }`.

```typescript
equipUpgrade: (slotIndex, upgradeId) =>
  set((state) => {
    const maxLen = state.effectiveUpgradeBar.length;
    if (slotIndex < 0 || slotIndex >= maxLen) return state;

    const newIds = [...state.equippedUpgradeIds];
    // Pad if needed (effectiveUpgradeBar may be longer than equippedUpgradeIds)
    while (newIds.length < maxLen) newIds.push(null);
    newIds[slotIndex] = upgradeId;

    const result = recomputeEffectiveUpgradeBar(state.upgradeBar, newIds);

    let totalCost = state.baseUnitCost;
    for (const id of result.equippedUpgradeIds) {
      if (id !== null) {
        const upgrade = getResolvedUpgradeById(id);
        if (upgrade) totalCost += upgrade.cost;
      }
    }

    return {
      equippedUpgradeIds: result.equippedUpgradeIds,
      effectiveUpgradeBar: result.effectiveUpgradeBar,
      unitCost: totalCost,
      weaponMiniCounts: {},  // attacker only; omit for defender
    };
  }),
```

### Step 7 — UI Updates: Render `effectiveUpgradeBar` and pass it to `getUpgradesForSlot`

**Files:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`, `src/components/DefenderPanel/DefenderUnitBuilderView.tsx`

#### 7a. Render dynamic slots

Change the `slotRows` memo to use `effectiveUpgradeBar`:

```tsx
const slotRows = useMemo(
  () => store.effectiveUpgradeBar.map((slot, index) => ({ slot, index })),
  [store.effectiveUpgradeBar],
);
```

#### 7b. Pass `effectiveUpgradeBar` to `getUpgradesForSlot`

Update the `getUpgradesForSlot` call in the slot rows map to include `effectiveUpgradeBar` in the context:

```tsx
const upgrades = getUpgradesForSlot(slot as UpgradeSlot, {
  unitApiId:   store.unitApiId ?? undefined,
  faction:     store.selectedFaction ?? undefined,
  rank:        store.selectedUnitRank ?? undefined,
  unitType:    store.selectedUnitType ?? undefined,
  affiliation: store.selectedUnitAffiliation,
  effectiveUpgradeBar: store.effectiveUpgradeBar,
});
```

This ensures the `requiredUpgradeSlot` filter in `getUpgradesForSlot` has the current effective upgrade bar to check against.

#### 7c. Optional visual enhancement

Add a subtle indicator for dynamic slots. For example, check if `index >= store.upgradeBar.length` to identify dynamic slots and render a small "(dynamic)" badge or a slightly different border color.

### Step 8 — Tests

#### 8a. Upgrade Resolver Tests

**File:** `src/data/__tests__/upgradeResolver.test.ts`

Add test cases:
- `addsUpgradeSlot` is populated from processed data for Agent Kallus → `['heavy-weapon']`
- `addsUpgradeSlot` is populated for Clone Captain Rex → contains both `'command'` and `'training'`
- `addsUpgradeSlot` defaults to `[]` for upgrades without conditional slots
- Enrichment `addsUpgradeSlot` supplements processed data (mock test)
- `requiredUpgradeSlot` is `'force'` for Offensive/Defensive Stance
- `requiredUpgradeSlot` is `null` for upgrades without the requirement
- `getUpgradesForSlot` excludes upgrades with `requiredUpgradeSlot` when the slot is not in `effectiveUpgradeBar`
- `getUpgradesForSlot` includes upgrades with `requiredUpgradeSlot` when the slot IS in `effectiveUpgradeBar`
- `getUpgradesForSlot` skips the `requiredUpgradeSlot` check when `effectiveUpgradeBar` is not provided in context

#### 8b. Store / Helper Tests

**New file:** `src/stores/__tests__/upgradeBarHelpers.test.ts`

Test cases for `recomputeEffectiveUpgradeBar`:
- No equipped upgrades → effective bar equals base bar
- Equipping an upgrade with `addsUpgradeSlot: ['training']` → effective bar has training appended
- Unequipping that upgrade → effective bar shrinks, dynamic slots removed
- Cascading unequip: upgrade in dynamic slot is removed when parent upgrade is removed
- Multi-slot: upgrade adding `['command', 'training']` → both appear
- Cost is recalculated correctly after cascade (test at store level)
- `loadPreset` initializes `effectiveUpgradeBar` equal to `upgradeBar`

#### 8c. UI Tests (Lower Priority)

- Verify dynamic slot dropdowns appear when an upgrade with `addsUpgradeSlot` is equipped
- Verify they disappear on unequip

### Step 9 — Quality Gate

1. `npm run typecheck` — must pass with 0 errors
2. `npm run lint` — must pass with 0 errors
3. `npm run test` — all existing + new tests pass

### Step 10 — Update WORK_PLAN.md

Mark the following deferred items as completed:
- `effectiveUpgradeBar` (base bar + dynamic slots from equipped upgrades)
- `recomputeEffectiveUpgradeBar()` helper
- Dynamic upgrade slot dropdowns
- Store tests for `effectiveUpgradeBar` recomputation, cascading unequip
- Add `addsUpgradeSlot` to upgrades that grant additional slots (now auto-derived)

## File Change Summary

| File | Change |
|---|---|
| `scripts/processApiData.ts` | Build `unlocked_by` → slot map; emit `addsUpgradeSlot` on processed upgrades; map `required_upgrade_type` → `requiredUpgradeSlot` |
| `src/data/types.ts` | Add `addsUpgradeSlot` and `requiredUpgradeSlot` to `ProcessedUpgrade`; add `requiredUpgradeSlot` to `ResolvedUpgrade` |
| `src/data/upgradeResolver.ts` | Merge processed + enrichment `addsUpgradeSlot`; pass through `requiredUpgradeSlot`; update normalize function; add `requiredUpgradeSlot` filter to `getUpgradesForSlot`; extend `UnitContext` with `effectiveUpgradeBar` |
| `src/data/processed/upgrades.json` | Regenerated with `addsUpgradeSlot` and `requiredUpgradeSlot` fields |
| `src/stores/upgradeBarHelpers.ts` | **New** — `recomputeEffectiveUpgradeBar()` pure helper |
| `src/stores/attackConfigStore.ts` | Add `effectiveUpgradeBar` state; update `loadPreset`, `equipUpgrade` |
| `src/stores/defenseConfigStore.ts` | Same as attacker store |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Use `effectiveUpgradeBar` instead of `upgradeBar`; pass `effectiveUpgradeBar` to `getUpgradesForSlot` context |
| `src/components/DefenderPanel/DefenderUnitBuilderView.tsx` | Same as attacker view |
| `src/data/__tests__/upgradeResolver.test.ts` | Add `addsUpgradeSlot` and `requiredUpgradeSlot` test cases |
| `src/stores/__tests__/upgradeBarHelpers.test.ts` | **New** — helper function tests |
| `WORK_PLAN.md` | Mark deferred items as completed |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Some upgrades unlock different slot types on different units (e.g., Clone Captain Rex unlocks `command` on one unit and `training` on another) | `addsUpgradeSlot` is upgrade-level, not per-unit. All possible slots are listed. Since the same upgrade can't be equipped on units where it doesn't belong (filtered by `getUpgradesForSlot`), false positives are tolerable — the extra slot type simply won't have valid upgrades to choose from. |
| Multi-level chaining (dynamic slot upgrade adds another dynamic slot) | `recomputeEffectiveUpgradeBar` processes in order; dynamic slots are appended and their equipped upgrades are checked in sequence. |
| Performance of `recomputeEffectiveUpgradeBar` | Only called on `equipUpgrade` (user action); typical bar is <10 slots. No perf concern. |
| Backward compat with existing processed data | `normalizeProcessedUpgrade` uses `?? []` fallback for `addsUpgradeSlot` and `?? null` for `requiredUpgradeSlot`. |
| `requiredUpgradeSlot` interaction with dynamic slots | The `requiredUpgradeSlot` check uses `effectiveUpgradeBar` (not base bar), so dynamically-added slots satisfy the requirement. E.g., a unit gains a Force slot via Jedi Consular → Offensive/Defensive Stance becomes available in the Training slot. |
| Future `required_upgrade_type` values | Only 2 upgrades use this today (both requiring Force). The implementation is generic — any new `required_upgrade_type` values in future API data will work automatically via the `UPGRADE_TYPE_MAP` lookup. |
