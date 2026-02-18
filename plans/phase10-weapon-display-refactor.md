# Phase 10: Weapon Display Refactor — Unit Builder Mode

## Problem Statement

The weapon display in `AttackerUnitBuilderView` (Unit Builder mode) has several issues:

1. **Flat repeated weapon list:** Multi-mini units show N identical weapon entries (one per miniature) instead of a single weapon row with a quantity indicator. A 4-mini Stormtrooper squad shows 4 identical "E-11 Blaster Rifle" checkboxes.

2. **No attack type filtering in UI:** All `store.weapons` are displayed regardless of the current `AttackType`. A melee-only weapon appears even in Ranged mode. (Filtering only happens at the engine level in `getWeaponsForAttackType`.)

3. **Checkbox-only UI:** Both single-mini and multi-mini units show the same enable/disable checkbox per weapon. Multi-mini units should show **NumberSpinners** (how many minis use this weapon), while single-mini units should show **checkboxes** (enable/disable per weapon, respecting Arsenal X).

4. **Store weapons diverge from display:** `store.weapons` is the preset's pre-upgrade weapons array. The actual weapon list (after upgrades + attack type filtering) is computed in `configSelectors.ts` and never written back, so the UI shows stale/wrong weapons.

5. **No weapon source distinction:** After `applyAttackerUpgrades`, the flat `weapons[]` array has no metadata to distinguish base weapons from upgrade-provided weapons (heavy weapons, grenades, armaments, personnel).

6. **No weapon quantity control:** Users cannot control how many miniatures contribute a particular weapon. Each weapon entry = 1 mini implicitly; there is no quantity override mechanism.

---

## Architecture Overview

The solution introduces three layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Store Layer (attackConfigStore)                            │
│  + weaponMiniCounts: Record<string, number>                 │
│  + setWeaponMiniCount(name, count) action                   │
│  Overrides reset on loadPreset / equipUpgrade / reset       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Display Layer (useDisplayWeapons hook)                     │
│  Reads: unitBaseWeapons, baseMiniatureCount,                │
│         equippedUpgradeIds, weaponMiniCounts, attackType    │
│  Returns: DisplayWeapon[] with count/maxCount/source        │
│  + isSingleMini boolean, totalMiniCount                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Engine Layer (configSelectors → rebuildWeaponsFromCounts)   │
│  Post-processes applyAttackerUpgrades output:               │
│  Replaces default weapon expansion with count overrides     │
│  if weaponMiniCounts is non-empty                           │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Weapon identity key:** weapon `name` string. Unique within each unit's weapon roster.
- **Smart default counts with auto-adjustment:** When upgrades are equipped, default weapon counts are automatically adjusted to reflect sensible mini assignments:
  - **Grenade equipped:** base weapon default count reduced by 1 (one mini throws the grenade instead of firing their base weapon).
  - **Armament equipped:** all base weapon minis default to using the armament (base weapon default → 0, armament default → `baseMiniatureCount`). Armaments have no max-count cap.
  - **Heavy Weapon / Personnel:** these ADD miniatures, so base weapon count is unaffected — **unless the upgrade weapon is incompatible with the current attack type** (e.g., a melee-only heavy weapon during a Ranged attack). In that case, the upgrade weapon is not shown, and the upgrade's added miniature(s) automatically fall back to the first compatible base weapon, increasing its default count by `addsMiniature`.
  - **Sidearm weapons:** function like normal heavy weapons EXCEPT the weapon CANNOT be unassigned (`minCount = 1`) when the sidearm keyword matches the current attack type (e.g., a `sidearmMelee` weapon must stay assigned during Melee attacks). In non-matching attack types, the upgrade mini falls back to a base weapon normally.
- **Arsenal X auto-assignment cap:** For single-mini units, new upgrade weapons are auto-enabled (checked on) until the total number of enabled weapons reaches the unit's `arsenalX` value. Once that cap is met, additional upgrade weapons default to unchecked (count = 0). If `arsenalX` is 0 (not set), all weapons are auto-enabled by default (no cap). This applies only to default counts — users can still manually override.
- **Manual overrides still allowed:** After auto-assignment, users can still adjust weapon spinners freely. Overrides persist until the next upgrade change or preset load.
- **Override clearing:** `weaponMiniCounts` resets on preset load, upgrade change, and reset — not on attack type change (stale keys are harmlessly ignored since they won't match any current weapon name).
- **`applyAttackerUpgrades` unchanged:** existing default weapon assignment logic stays as-is; count overrides are a separate post-processing layer applied in `configSelectors.ts`.

---

## 10A: Store Layer — Add `weaponMiniCounts` to `attackConfigStore`

### 10A-1: Add state and action

**File:** `src/stores/attackConfigStore.ts`

Add to `AttackConfigState`:
```typescript
/**
 * User overrides for how many miniatures use each weapon (by weapon name).
 * Empty map = use defaults from applyAttackerUpgrades.
 * Only meaningful in Unit Builder mode.
 */
weaponMiniCounts: Record<string, number>;
```

Add action:
```typescript
/** Set how many miniatures use a specific weapon (by name). */
setWeaponMiniCount: (weaponName: string, count: number) => void;
```

Implementation:
```typescript
setWeaponMiniCount: (weaponName, count) =>
  set((state) => ({
    weaponMiniCounts: {
      ...state.weaponMiniCounts,
      // Remove the key entirely if count is 0 to keep the map sparse
      ...(count > 0
        ? { [weaponName]: count }
        : Object.fromEntries(
            Object.entries(state.weaponMiniCounts).filter(([k]) => k !== weaponName)
          )
      ),
    },
  })),
```

### 10A-2: Initialize and reset

**Defaults:**
```typescript
weaponMiniCounts: {},
```

**Reset on:**
- `loadPreset()` → `weaponMiniCounts: {}`
- `equipUpgrade()` → `weaponMiniCounts: {}` (upgrade change invalidates weapon composition)
- `reset()` → `weaponMiniCounts: {}`

### 10A-3: Exclude from engine selector

In `selectAttackerConfig()`, destructure out `weaponMiniCounts` alongside `baseMiniatureCount`, `unitBaseWeapons`, etc. so it doesn't reach the engine config directly. It's consumed separately by `configSelectors.ts`.

### 10A-4: Exclude from `AttackConfigFields`

Add `'weaponMiniCounts'` and `'setWeaponMiniCount'` to the `Omit<>` list in `AttackConfigFields` so they aren't exposed via the generic `setField` action.

---

## 10B: Display Layer — `useDisplayWeapons` Hook

### 10B-1: Types

**File:** `src/hooks/useDisplayWeapons.ts`

```typescript
import type { AttackType, WeaponKeywords, WeaponProfile } from '../engine/types';

/** Source of a weapon in the display list */
export type WeaponSource = 'base' | 'heavy' | 'personnel' | 'grenade' | 'armament';

/** A unique weapon row in the display list */
export interface DisplayWeapon {
  /** Weapon name (used as identity key) */
  name: string;
  /** Weapon attack type (Ranged/Melee/Hybrid) */
  weaponType?: AttackType;
  /** Dice profile */
  redDice: number;
  blackDice: number;
  whiteDice: number;
  /** How many minis currently use this weapon (from overrides or defaults) */
  count: number;
  /** Maximum minis that CAN equip this weapon */
  maxCount: number;
  /**
   * Minimum minis that MUST use this weapon.
   * 0 for most weapons. 1 for sidearm weapons when the sidearm keyword
   * matches the current attack type (the mini cannot fall back to a
   * base weapon in that scenario).
   */
  minCount: number;
  /** Where this weapon comes from */
  source: WeaponSource;
  /** Weapon keywords (for tooltip/display) */
  keywords: WeaponKeywords;
}

export interface DisplayWeaponsResult {
  /** Unique weapon rows filtered by current attack type */
  weapons: DisplayWeapon[];
  /** True when baseMiniatureCount <= 1 (show checkboxes instead of spinners) */
  isSingleMini: boolean;
  /** Total minis: baseMiniatureCount + upgrade-added minis */
  totalMiniCount: number;
}
```

### 10B-2: Hook implementation

```typescript
export function useDisplayWeapons(): DisplayWeaponsResult
```

**Data sources** (all from Zustand hooks):
- `useAttackConfigStore`: `unitBaseWeapons`, `baseMiniatureCount`, `equippedUpgradeIds`, `weaponMiniCounts`, `arsenalX`
- `useAttackTypeStore`: `attackType`

**Computation** (memoized via `useMemo`):

1. **Filter base weapons by attack type:**
   - `unitBaseWeapons.filter(w => isWeaponUsableForAttackType(w.weaponType, attackType))`
   - Result: array of unique base weapon profiles.
   - Each gets `maxCount = baseMiniatureCount`, `source = 'base'`.

2. **Resolve upgrade-contributed weapons:**
   - For each non-null entry in `equippedUpgradeIds`, call `getResolvedUpgradeById(id)`.
   - Determine source type and maxCount:
     - `upgrade.isGrenade && weapons.length > 0`: source `'grenade'`, maxCount `1`. Pick first compatible weapon.
     - `upgrade.addsMiniature > 0 && !upgrade.noncombatant`: source is `'heavy'` if slot is `HeavyWeapon`, else `'personnel'`. maxCount = `upgrade.addsMiniature`. Use `selectWeaponForUpgradeMini` logic to pick the weapon. **If the upgrade has NO weapon compatible with the current attack type**, the upgrade weapon row is **not shown** — instead, track the upgrade's `addsMiniature` count as a "fallback" that will be added to the first base weapon's default count in step 3b.
     - `upgrade.upgradeSlot === UpgradeSlot.Armament`: source `'armament'`, maxCount = `baseMiniatureCount`. Add all compatible weapons.
   - Filter each by `isWeaponUsableForAttackType(w.weaponType, attackType)`.

3. **Assign default counts (auto-adjustment rules):**
   - For each `DisplayWeapon`, `count = weaponMiniCounts[name] ?? defaultCount`.
   - Default count is computed in order, accounting for upgrade interactions:

     **a. Start with base weapon defaults:**
     - First base weapon: starts at `baseMiniatureCount`.
     - Other base weapons: `0`.

     **b. Heavy Weapon / Personnel (addsMiniature > 0):**
     - If the upgrade weapon IS compatible with the current attack type:
       - Upgrade weapon default = `maxCount` (typically 1).
       - Base weapon default **unchanged** (these upgrades ADD minis, they don't take from base pool).
     - If the upgrade weapon is NOT compatible with the current attack type (e.g., melee-only heavy weapon during Ranged):
       - No upgrade weapon row is shown.
       - First base weapon default **increased by `addsMiniature`** (the upgrade mini falls back to the base weapon for this attack type).
       - `maxCount` of the first base weapon is also increased by `addsMiniature` to reflect the additional mini using it.

     **c. Grenade (isGrenade):**
     - Grenade default = `1`.
     - First base weapon default **reduced by 1** (one existing mini throws the grenade instead of firing their base weapon). Clamped to `max(0, baseDefault - 1)`.

     **d. Armament:**
     - Armament default = `baseMiniatureCount` (all base minis switch to the armament).
     - First base weapon default **set to 0** (all minis moved to armament).
     - Armaments have no max-count cap (`maxCount = totalMiniCount`).
     - If multiple armaments are equipped, only the first one gets the auto-assignment; others default to 0.

     **e. Sidearm enforcement (minCount):**
     - Most weapons: `minCount = 0`.
     - Sidearm weapons where the sidearm type matches the current attack type (e.g., `sidearmMelee` during Melee): `minCount = 1`. The mini MUST use this weapon — it cannot be unassigned.
     - Sidearm weapons in non-matching attack types: `minCount = 0` (normal heavy weapon behavior).
     - `count` is clamped to `max(minCount, count)` to enforce the floor.

     **f. Arsenal X auto-assignment cap (single-mini units):**
     - Applicable when `arsenalX > 0` and the unit is single-mini (`isSingleMini = true`).
     - After all default counts are computed by rules a–e above, count how many weapons have `count > 0`.
     - If the total exceeds `arsenalX`, walk the weapon list in reverse addition order (newest upgrades first) and set excess weapons to `count = 0` until the total equals `arsenalX`. Weapons with `minCount > 0` (sidearm enforcement) are never auto-disabled.
     - If the total is under `arsenalX`, no action — all auto-assigned weapons remain enabled.
     - When `arsenalX = 0` (not set), no cap is applied; all weapons default to enabled.
     - This cap only affects DEFAULT counts (when `weaponMiniCounts` has no override for that weapon). User overrides always take precedence.

4. **Compute single-mini flag:**
   - `isSingleMini = baseMiniatureCount <= 1` AND no upgrade adds miniatures (i.e., totalMiniCount <= 1).

5. **Compute totalMiniCount:**
   - `baseMiniatureCount + sum(upgrade.addsMiniature for each equipped non-noncombatant upgrade that addsMiniature > 0)`.

6. **Return `{ weapons, isSingleMini, totalMiniCount }`.**

### 10B-3: `isWeaponUsableForAttackType` — shared helper

The same `isWeaponUsableForAttackType` function is defined in both `upgradeApplicator.ts` and `attackPool.ts`. Extract it to a shared location so the hook can import it.

**File:** `src/engine/weaponUtils.ts` (new)

```typescript
import { AttackType } from './types';

/**
 * Check if a weapon is usable for a given attack type.
 * Handles undefined (always usable) and Hybrid (usable for Ranged + Melee).
 */
export function isWeaponUsableForAttackType(
  weaponType: AttackType | undefined,
  attackType: AttackType,
): boolean {
  if (weaponType === undefined) return true;
  if (weaponType === attackType) return true;
  if (
    weaponType === AttackType.Hybrid &&
    (attackType === AttackType.Ranged || attackType === AttackType.Melee)
  ) {
    return true;
  }
  return false;
}
```

Then update `upgradeApplicator.ts` and `attackPool.ts` to import from `weaponUtils.ts` instead of defining their own copies.

---

## 10C: Engine Layer — `rebuildWeaponsFromCounts`

### 10C-1: Utility function

**File:** `src/utils/weaponCounts.ts` (new)

```typescript
import type { WeaponProfile } from '../engine/types';

/**
 * Given an array of unique weapon templates and a name→count map,
 * produce a flat WeaponProfile[] with the correct number of copies.
 *
 * If overrides is empty, returns defaultWeapons unchanged (preserving
 * the output of applyAttackerUpgrades exactly).
 */
export function rebuildWeaponsFromCounts(
  defaultWeapons: WeaponProfile[],
  overrides: Record<string, number>,
  allAvailableWeapons: WeaponProfile[],
): WeaponProfile[] {
  if (Object.keys(overrides).length === 0) {
    return defaultWeapons;
  }

  // Build a map of weapon name → template (from allAvailableWeapons)
  const templateMap = new Map<string, WeaponProfile>();
  for (const w of allAvailableWeapons) {
    if (w.name && !templateMap.has(w.name)) {
      templateMap.set(w.name, w);
    }
  }

  // Count defaults: how many of each weapon name appear in defaultWeapons
  const defaultCounts = new Map<string, number>();
  for (const w of defaultWeapons) {
    const name = w.name ?? '';
    defaultCounts.set(name, (defaultCounts.get(name) ?? 0) + 1);
  }

  // Determine final count for each weapon, preferring overrides
  const result: WeaponProfile[] = [];
  const processedNames = new Set<string>();

  // Process all available weapons (ensures weapons with 0 default count
  // but a positive override get included)
  for (const [name, template] of templateMap) {
    processedNames.add(name);
    const count = overrides[name] ?? defaultCounts.get(name) ?? 0;
    for (let i = 0; i < count; i++) {
      result.push({ ...template, keywords: { ...template.keywords } });
    }
  }

  // Include any default weapons not in available templates (safety net)
  for (const w of defaultWeapons) {
    const name = w.name ?? '';
    if (!processedNames.has(name)) {
      result.push(w);
    }
  }

  return result;
}
```

### 10C-2: Wire into `configSelectors.ts`

**File:** `src/stores/configSelectors.ts`

In both `getFullConfig()` and `useFullConfig()`:

1. Read `weaponMiniCounts` from the attack config store.
2. After `applyAttackerUpgrades(...)` returns the attacker config:
3. If `weaponMiniCounts` is non-empty:
   a. Compute `allAvailableWeapons` — normalize all base weapons (filtered by attackType) + all upgrade weapons into engine `WeaponProfile[]` using the same logic as the display hook (or import a shared helper).
   b. Call `rebuildWeaponsFromCounts(attacker.weapons, weaponMiniCounts, allAvailableWeapons)`.
   c. Replace `attacker.weapons` with the result.
4. Return the assembled config.

---

## 10D: UI Layer — Update `AttackerUnitBuilderView`

### 10D-1: Replace weapon rendering

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.tsx`

Replace the current weapon section (lines ~38–74) with:

```tsx
import { useDisplayWeapons } from '../../hooks/useDisplayWeapons';

// Inside the component:
const { weapons: displayWeapons, isSingleMini } = useDisplayWeapons();

// Render:
<SectionHeader title="Weapons">
  <div className="space-y-2 text-sm text-gray-400">
    {displayWeapons.length === 0 ? (
      <p>No weapons available for this attack type.</p>
    ) : (
      displayWeapons.map((weapon) => {
        const isActive = weapon.count > 0;
        return (
          <div
            key={weapon.name}
            className={`rounded border px-3 py-2 ${
              isActive
                ? 'border-gray-700'
                : 'border-gray-800 bg-gray-950/60 text-gray-500'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isSingleMini ? (
                  {/* Checkbox for single-mini units */}
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) =>
                      store.setWeaponMiniCount(weapon.name, e.target.checked ? 1 : 0)
                    }
                    disabled={weapon.minCount > 0}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800
                               text-blue-600 focus:ring-2 focus:ring-blue-500
                               focus:ring-offset-0"
                  />
                ) : (
                  {/* Spinner for multi-mini units */}
                  <NumberSpinner
                    value={weapon.count}
                    onChange={(v) => store.setWeaponMiniCount(weapon.name, v)}
                    min={weapon.minCount}
                    max={weapon.maxCount}
                    compact
                  />
                )}
                <span>{weapon.name}</span>
              </div>
              <DiceIconDisplay
                redDice={weapon.redDice}
                blackDice={weapon.blackDice}
                whiteDice={weapon.whiteDice}
              />
            </div>
          </div>
        );
      })
    )}
  </div>
</SectionHeader>
```

### 10D-2: Visual cues

- **Source badges** (optional/deferred): small colored badge or suffix indicating `[HW]`, `[Grenade]`, `[Armament]`, `[Personnel]` next to weapon names for upgrade-sourced weapons.
- **Dimmed rows:** weapons with `count === 0` get the dimmed style (already handled by `isActive` conditional).

### 10D-3: Remove stale weapon-checkbox code

The existing `store.weapons.map(...)` block with per-index `setWeaponEnabled` calls is removed. The `setWeaponEnabled` action remains available for Custom Pool mode.

---

## 10E: Shared Helper Extraction

### 10E-1: Extract `isWeaponUsableForAttackType`

**Current locations:**
- `src/data/upgradeApplicator.ts` (private function)
- `src/engine/attackPool.ts` (private function)

**Target:** `src/engine/weaponUtils.ts` (new, exported)

Both existing call sites updated to import from `weaponUtils.ts`. The new `useDisplayWeapons` hook also imports from here.

### 10E-2: Extract `normalizeToEngineWeapon`

**Current location:** `src/data/upgradeApplicator.ts` (private function)

**Target:** Export from `upgradeApplicator.ts` (no file move needed, just add `export`).

The `useDisplayWeapons` hook and `rebuildWeaponsFromCounts` need to convert `DataLayerWeaponProfile` → engine `WeaponProfile`. Reuse the existing function rather than duplicating. Alternatively, `useDisplayWeapons` can call this directly.

### 10E-3: Extract `selectWeaponForUpgradeMini` (optional)

If `useDisplayWeapons` needs to replicate upgrade-mini weapon selection, export this function from `upgradeApplicator.ts`. Otherwise, the hook can use simplified logic (just filter by attack type compatibility and pick the first match).

---

## 10F: Testing

### 10F-1: `useDisplayWeapons` hook tests

**File:** `src/hooks/useDisplayWeapons.test.ts`

| Test Case | Setup | Expected |
|-----------|-------|----------|
| Single-mini unit, ranged | Unit with 1 figure, 1 ranged weapon | `isSingleMini = true`, 1 weapon with count=1, maxCount=1 |
| Single-mini unit, multiple weapons | Unit with 1 figure, ranged + melee weapons, attackType=Ranged | Only ranged weapon shown |
| Multi-mini unit, default counts | Unit with 4 figures, 1 ranged weapon | `isSingleMini = false`, 1 weapon with count=4, maxCount=4 |
| Multi-mini unit, multiple base weapons | Unit with 4 figures, ranged + melee, attackType=Ranged | Both ranged weapons shown (if both ranged-compatible); first gets count=4, second gets count=0 |
| Multi-mini + heavy weapon upgrade | 4 figures + equipped heavy weapon (ranged, attackType=Ranged) | Base weapon row (max=4, count=4 unchanged) + heavy weapon row (max=1, count=1) |
| Multi-mini + heavy weapon (incompatible) | 4 figures + melee heavy weapon, attackType=Ranged | Base weapon row (max=**5**, count=**5**) — no heavy weapon row shown (mini falls back to base) |
| Multi-mini + grenade upgrade | 4 figures + equipped grenade | Base weapon row (max=4, **count=3**) + grenade row (max=1, count=1) |
| Multi-mini + armament upgrade | 4 figures + equipped armament | Base weapon row (max=4, **count=0**) + armament row (max=totalMini, **count=4**) |
| Multi-mini + two grenades | 4 figures + 2 grenades equipped | Base weapon row (count=**2**) + grenade A (count=1) + grenade B (count=1) |
| Sidearm (matching attack type) | Heavy weapon with sidearmMelee, attackType=Melee | Heavy weapon row with **minCount=1**, count=1 (cannot be set to 0) |
| Sidearm (non-matching attack type) | Heavy weapon with sidearmMelee, attackType=Ranged | Heavy weapon row with minCount=0 (can be unassigned) |
| Arsenal X cap (under limit) | Single-mini, arsenalX=2, base weapon + 1 upgrade weapon | Both default to count=1 (2 weapons ≤ arsenalX=2) |
| Arsenal X cap (at limit) | Single-mini, arsenalX=2, base weapon + 2 upgrade weapons | Base + first upgrade enabled; second upgrade defaults to count=0 |
| Arsenal X cap (sidearm protected) | Single-mini, arsenalX=1, base weapon + sidearm weapon (matching) | Sidearm stays count=1 (minCount=1), base weapon set to count=0 |
| Arsenal X = 0 (not set) | Single-mini, arsenalX=0, base weapon + 2 upgrade weapons | All 3 weapons default to count=1 (no cap) |
| Attack type filter | Multi-mini with ranged + melee weapons, attackType=Melee | Only melee-compatible weapons shown |
| Count overrides | `weaponMiniCounts = { 'A-295': 2 }` | A-295 row shows count=2 instead of default |
| No preset loaded | Empty unitBaseWeapons | `weapons = []`, prompt message |

### 10F-2: `rebuildWeaponsFromCounts` tests

**File:** `src/utils/weaponCounts.test.ts`

| Test Case | Expected |
|-----------|----------|
| Empty overrides → returns defaultWeapons unchanged | Identity |
| Override reduces count (4→2) | 2 copies instead of 4 |
| Override increases count (0→2) | 2 copies of a weapon that had 0 in defaults |
| Override sets count to 0 | Weapon excluded from result |
| Multiple weapons with mixed overrides | Correct count for each |

### 10F-3: UI component tests

**File:** `src/components/AttackerPanel/AttackerUnitBuilderView.test.tsx` (new or co-located)

| Test Case | Expected |
|-----------|----------|
| Multi-mini unit renders spinners not checkboxes | NumberSpinner elements present |
| Single-mini unit renders checkboxes not spinners | Checkbox inputs present |
| Weapon rows filtered by attack type | Only compatible weapons rendered |
| Spinner onChange calls setWeaponMiniCount | Store action invoked with correct args |
| Checkbox toggle calls setWeaponMiniCount | Store action invoked with 1 or 0 |

---

## 10G: Quality Gates

All steps below must pass before the phase is considered complete:

```bash
npm run typecheck    # 0 errors
npm run lint         # 0 errors  
npm run test         # All tests pass (existing + new)
```

---

## Implementation Order

| Step | Description | Files Modified | Files Created |
|------|-------------|----------------|---------------|
| 10E-1 | Extract `isWeaponUsableForAttackType` to shared util | `src/engine/attackPool.ts`, `src/data/upgradeApplicator.ts` | `src/engine/weaponUtils.ts` |
| 10E-2 | Export `normalizeToEngineWeapon` from upgradeApplicator | `src/data/upgradeApplicator.ts` | — |
| 10A | Add `weaponMiniCounts` + action to store | `src/stores/attackConfigStore.ts` | — |
| 10B | Create `useDisplayWeapons` hook | — | `src/hooks/useDisplayWeapons.ts` |
| 10C | Create `rebuildWeaponsFromCounts` + wire into configSelectors | `src/stores/configSelectors.ts` | `src/utils/weaponCounts.ts` |
| 10D | Update `AttackerUnitBuilderView` rendering | `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | — |
| 10F | Add tests for hook, utility, and UI | — | `src/hooks/useDisplayWeapons.test.ts`, `src/utils/weaponCounts.test.ts` |
| 10G | Run quality gates | — | — |

---

## Verification Scenarios

1. **Multi-mini unit (e.g., Stormtroopers, 4 figures):**
   - Select preset → weapon section shows unique weapon rows with NumberSpinners.
   - Default base weapon spinner = 4 (max 4).
   - Equip a Heavy Weapon → new row appears with spinner max = 1, default = 1. Base weapon stays at 4 (heavy adds a mini).
   - Adjust base weapon spinner from 4 → 2 → run calculation → dice pool reflects 2 base weapons.

2. **Grenade auto-subtraction (e.g., Stormtroopers + Impact Grenades):**
   - Equip Impact Grenades → grenade row appears (count=1, max=1). Base weapon spinner auto-drops from 4 → 3.
   - Equip a second grenade type → base weapon drops to 2. Both grenade rows show count=1.
   - Unequip a grenade → base weapon returns to 3.

3. **Armament auto-assignment (e.g., Fleet Troopers + Scatter Gun):**
   - Equip Scatter Gun (armament) → armament row appears with count = baseMiniatureCount (e.g., 4). Base weapon drops to 0.
   - User can manually re-assign some minis back to base weapon via spinners.
   - Armament maxCount has no artificial cap.

4. **Sidearm enforcement (e.g., heavy weapon with Sidearm: Melee):**
   - In Ranged mode: heavy weapon row shows normally (minCount=0, can be set to 0).
   - Switch to Melee mode: heavy weapon row's spinner min becomes 1 — the mini MUST use its sidearm weapon. Checkbox (single-mini) is disabled and locked on.

5. **Incompatible heavy weapon fallback (e.g., Stormtroopers + melee-only heavy weapon, Ranged mode):**
   - The melee heavy weapon has no compatible weapon for Ranged → heavy weapon row is absent.
   - Base weapon default count increases from 4 → 5 (base 4 + 1 fallback heavy mini).
   - Base weapon maxCount also increases to 5.
   - Switch to Melee mode → heavy weapon row appears (count=1, max=1), base weapon returns to 4.

6. **Single-mini unit (e.g., Darth Vader):**
   - Select preset → weapon section shows checkboxes, not spinners.
   - Multiple weapons can be checked simultaneously (Arsenal X).
   - Sidearm weapons show a locked-on (disabled) checkbox in matching attack type.

7. **Arsenal X auto-assignment cap (e.g., single-mini unit with Arsenal 2):**
   - Unit has 1 base weapon → auto-enabled (1 of 2 Arsenal slots used).
   - Equip an upgrade that adds a weapon → auto-enabled (2 of 2 Arsenal slots used).
   - Equip a second weapon upgrade → this weapon defaults to unchecked (Arsenal cap reached).
   - User can manually check the third weapon (and uncheck another) via checkboxes.
   - If arsenalX is 0 (not set on unit), all weapons auto-enable as before.

8. **Attack type switching:**
   - Switch from Ranged to Melee → weapon list updates to show only melee-compatible weapons.
   - Melee-only weapons not shown in Ranged mode.

9. **Upgrade change clears overrides:**
   - Set spinner to custom value → equip a different upgrade → spinner resets to auto-calculated defaults.

10. **Custom Pool mode unaffected:**
   - Switch to Custom Pool → existing manual dice spinners and add/remove buttons work as before.

---

## Non-Goals

- **Arsenal X hard enforcement in engine:** Arsenal X caps the number of auto-assigned weapons in defaults (step 3f), but the engine's `formAttackPool` does NOT enforce an Arsenal X limit on the final dice pool. If the user manually enables more weapons than Arsenal X allows, they all contribute to the pool. Hard engine-level enforcement is a future enhancement.
- **Hard cross-weapon total constraint:** Auto-adjustment sets smart defaults, but there is no hard enforcement that "total base weapon counts = baseMiniatureCount". Users can override spinners beyond the auto-calculated values. The auto-adjustment only applies to the DEFAULT counts when no user overrides exist.
- **Weapon keyword display:** Weapon keywords (Pierce, Impact, etc.) are not shown in the weapon rows. This is a future enhancement for tooltips or expandable rows.
- **Source badges:** Visual indicators for weapon source (HW, Grenade, etc.) are optional/deferred — names are usually sufficient.
