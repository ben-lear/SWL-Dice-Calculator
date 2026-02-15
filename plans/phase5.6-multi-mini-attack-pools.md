# Phase 5.6: Multi-Miniature Attack Pools — Implementation Plan

## Overview

This phase extends the data model, engine integration, and UI to correctly handle **multi-miniature unit attack pools** — the core SWL mechanic where each miniature in a unit independently contributes one weapon (and its keywords) to a shared attack pool.

### Key Design Principles

1. **Repeated entries model:** Each miniature's weapon contribution is a separate `WeaponProfile` entry in the `weapons[]` array. A 4-mini Death Trooper squad with E-11Ds produces 4× E-11D entries in the pool.

2. **Keyword stacking is additive:** The existing `aggregateWeaponKeywords` function already sums numeric keywords and ORs boolean keywords across all entries. 4× Impact 1 = Impact 4. No deduplication is needed or desired. **No changes to `formAttackPool` or `aggregateWeaponKeywords`.**

3. **Arsenal X is single-mini only:** No unit in the game simultaneously has Arsenal X and multiple miniatures. Vehicles and heroes with Arsenal X are always `figures: 1`. This eliminates the need to build per-miniature multi-weapon selection for Arsenal units.

4. **`miniatureCount` enrichment override:** A new optional field on `UnitEnrichment` overrides the API `figures` field when present. Resolver logic: `enrichment.miniatureCount ?? processed.figures ?? 1`.

5. **Counterpart support is deferred:** Counterpart upgrade cards (C-3PO, Grogu, ID10 Seeker Droid, Omega) add a miniature with weapon-locked rules. Full counterpart merging, weapon restriction, and defeat effects are future work. This phase only adds `Counterpart` to the `UpgradeSlot` enum so the data pipeline doesn't silently drop counterpart slots.

6. **Implicit `addsMiniature` for upgrade slots:** Heavy Weapon, Personnel, and Squad Leader upgrades each add 1 miniature to the unit by default. This is an implicit default based on the upgrade slot type — individual upgrades can override this (e.g., "squad" personnel upgrades that add 2 minis). Heavy weapons add a miniature that contributes the heavy weapon to the pool alongside the base minis — they do NOT replace a base miniature's weapon entry.

7. **`addsUpgradeSlot` for dynamic upgrade bars:** Some upgrades add additional upgrade slots to the unit when equipped (e.g., Agent Kallus adds a Heavy Weapon slot; Stormtrooper Captain adds a Training slot). The UI must dynamically update the available upgrade slots as selections change, and the store must track dynamically-added slots.

8. **Per-miniature weapon ownership:** Weapon profiles from upgrade cards (Heavy Weapon, Personnel, Squad Leader) are exclusive to the miniature that upgrade adds — no other miniature may use them. Conversely, each upgrade miniature primarily uses its own upgrade's weapon profiles. When an upgrade's weapons do not cover the current attack type (e.g., a pure-ranged heavy weapon during a melee attack), the upgrade miniature falls back to the unit's base weapons (e.g., Unarmed melee).

9. **Sidearm is a per-miniature restriction, not a global filter.** Per the rulebook: `Sidearm: Ranged` means the upgrade miniature can ONLY use the upgrade card's ranged weapons for ranged attacks — but may use any available melee weapon (including unit base weapons) for melee attacks. `Sidearm: Melee` is the reverse. When sidearm is enforced (attack type matches sidearm type), weapon choice is restricted to the upgrade card only. When sidearm is NOT enforced (attack type doesn't match), the miniature can use any compatible weapon from upgrade or unit.

10. **All weapons from each upgrade are available.** When an upgrade card provides multiple weapon profiles (e.g., both ranged and melee modes, or multiple ranged weapons), ALL of those weapons are available for that miniature's selection. The config assembly selects the best-matching weapon for the current attack type from the full list — not only `weapons[0]`.

---

## Assumptions & Scope

### In Scope
- `miniatureCount` on `UnitEnrichment`
- `weapons`, `addsMiniature`, `noncombatant`, `addsUpgradeSlot` on `UpgradeEnrichment` and `ResolvedUpgrade`
- Implicit `addsMiniature` defaults: Heavy Weapon, Personnel, and Squad Leader slots default to 1; overridable per-upgrade
- `sidearmMelee` / `sidearmRanged` on `WeaponKeywords`
- Per-miniature weapon ownership: upgrade weapons locked to upgrade mini, with fallback to unit base weapons when needed
- Correct Sidearm handling: per-miniature restriction (not a global pool filter), with fallback to unit weapons when sidearm is not enforced
- All weapons from each upgrade available (not just the first) for per-miniature weapon selection
- Preset generator rewrite for multi-mini weapon expansion, mode-aware (ranged, melee, overrun)
- Upgrade applicator extension (heavy weapon add, personnel add, per-mini weapon ownership, sidearm, grenade dedup, noncombatant)
- Removal of Arsenal slice from `getWeaponsForAttackType`
- Store: `baseMiniatureCount` field, `unitBaseWeapons` (all unit weapon profiles), `attackType` wiring through config selectors, dynamic upgrade bar from `addsUpgradeSlot`
- Unit Builder UI: per-miniature weapon assignment panel, dynamic upgrade slot rendering
- Tests for all new/changed behavior

**Note:** Enrichment data population (unit `miniatureCount` overrides, weapon profiles, upgrade weapon/flag data) is a **manual human task** and is not included as a step in this plan. The type infrastructure and resolvers must be implemented first.

### Out of Scope
- Arsenal X + multi-mini interaction (doesn't exist in game)
- Counterpart attack pool logic (counterpart weapon restriction, keywords merge, defeat effects)
- Custom Pool mode changes beyond a mini-count indicator
- One-use token tracking across game rounds

### Rules Reference

**Form Attack Pool** (Rulebook §05, "Declare Defender" → "Form Attack Pool"):
> Each miniature in the unit that has LOS to at least one miniature in the defender contributes one eligible weapon — along with any weapon keywords that weapon may have — to the attack pool.

**Arsenal X** (Rulebook §06):
> A unit with Arsenal X can contribute X weapons per miniature to its attack pool.
> *In practice, only single-figure units (vehicles, heroes) have Arsenal X.*

**Sidearm: Melee/Ranged** (Rulebook §06):
> If an upgrade has the Sidearm: Ranged keyword, the miniature added by that upgrade or that has that upgrade equipped cannot add any Ranged weapons to Attack Pools other than any Ranged weapons on the Upgrade Card with the Sidearm: Ranged keyword.
> If an upgrade has the Sidearm: Melee keyword, the miniature added by that upgrade or that has that upgrade equipped cannot add any Melee weapons to Attack Pools other than any Melee weapons on the Upgrade Card with the Sidearm: Melee keyword.
> *Note:* When sidearm is NOT enforced (attack type doesn't match sidearm type), the miniature may use any available weapon for that attack type, including unit card weapons.

**Noncombatant** (Rulebook §06):
> A miniature with Noncombatant cannot add weapons to the attack pool.

**Grenades** (Rulebook §06):
> Only one miniature in the unit may add a grenade weapon to the attack pool per attack.
> *Note:* There is no "Grenade X" keyword. However, a unit may equip multiple different grenade upgrades. Each grenade upgrade contributes its weapon exactly once per attack pool — the "one miniature" restriction is per grenade instance, not a global limit across all grenades. Example: a unit with both Impact Grenades and Concussion Grenades adds 1 Impact Grenade entry + 1 Concussion Grenade entry to the pool.

**Counterpart** (Rulebook §06):
> Miniatures in a combined unit may only use weapons that are on their respective cards. If a combined unit gains a weapon from a Command Card, only the non-Counterpart miniature may use it.
> *Deferred to future phase.*

---

## Current State Summary

### What Already Works Correctly (No Changes Needed)

| Component | Why It's Already Correct |
|-----------|------------------------|
| `formAttackPool` ([src/engine/attackPool.ts](src/engine/attackPool.ts#L99-L125)) | Iterates `weapons[]` and sums dice per entry. Repeated weapon entries naturally produce additive dice. |
| `aggregateWeaponKeywords` ([src/engine/attackPool.ts](src/engine/attackPool.ts#L42-L92)) | Sums numeric keywords, ORs blast/suppressive, ANDs highVelocity across ALL entries. 4× Impact 1 = Impact 4. No deduplication. |
| `AttackerConfig.weapons` ([src/engine/types.ts](src/engine/types.ts#L177)) | Already an array of `WeaponProfile[]`. Repeated entries are the intended model. |

### What Needs Changes

| Component | Current State | Required Change |
|-----------|---------------|-----------------|
| `WeaponKeywords` ([src/engine/types.ts](src/engine/types.ts#L99-L119)) | No sidearm fields | Add `sidearmMelee`, `sidearmRanged` boolean flags |
| `getWeaponsForAttackType` ([src/engine/attackPool.ts](src/engine/attackPool.ts#L26-L33)) | Slices to Arsenal limit | Remove Arsenal slice (upstream handles it); add sidearm filtering |
| `UnitEnrichment` ([src/data/enrichment/types.ts](src/data/enrichment/types.ts#L46)) | No miniature count | Add `miniatureCount?: number` |
| `UpgradeEnrichment` ([src/data/enrichment/types.ts](src/data/enrichment/types.ts#L82)) | Keywords only | Add `weapons`, `addsMiniature`, `noncombatant`, `addsUpgradeSlot` |
| `ResolvedUpgrade` ([src/data/types.ts](src/data/types.ts#L289-L310)) | Keywords only | Add `weapons`, `addsMiniature`, `noncombatant`, `isGrenade`, `addsUpgradeSlot` |
| `UpgradeSlot` ([src/data/types.ts](src/data/types.ts#L18-L55)) | No Counterpart | Add `Counterpart` value |
| `unitResolver.ts` ([src/data/unitResolver.ts](src/data/unitResolver.ts#L105)) | Uses `processed.figures` directly | Apply `miniatureCount` enrichment override |
| `upgradeResolver.ts` ([src/data/upgradeResolver.ts](src/data/upgradeResolver.ts#L88-L106)) | Keywords only | Resolve `weapons`, `addsMiniature`, `noncombatant` |
| `presetGenerator.ts` ([src/data/presetGenerator.ts](src/data/presetGenerator.ts#L40-L56)) | One preset per weapon | Multi-mini units: expand weapons by `figures` count in single preset |
| `upgradeApplicator.ts` ([src/data/upgradeApplicator.ts](src/data/upgradeApplicator.ts#L58-L105)) | Keywords + cost only | Weapon array manipulation: heavy weapon add, personnel add, sidearm filter, grenade dedup, noncombatant |
| `attackConfigStore.ts` ([src/stores/attackConfigStore.ts](src/stores/attackConfigStore.ts#L17-L59)) | No mini count tracking | Add `baseMiniatureCount`; dynamic upgrade bar from `addsUpgradeSlot` |
| `configSelectors.ts` ([src/stores/configSelectors.ts](src/stores/configSelectors.ts#L1-L68)) | No `attackType` wiring | Pass `attackType` to upgrade applicator for sidearm handling |
| Death Troopers enrichment ([src/data/enrichment/units.ts](src/data/enrichment/units.ts#L729)) | Uses invalid `miniatures: 4` | Rename to `miniatureCount: 4` |
| Upgrade enrichments ([src/data/enrichment/upgrades.ts](src/data/enrichment/upgrades.ts)) | 4 entries use `weapons` (type error); personnel stubs are keywords-only | Fix type errors; add `addsMiniature`, `noncombatant`, weapon data |

### Existing Type Errors to Fix

These are pre-existing type errors that this phase resolves:

1. **`imperial-death-troopers`** in [src/data/enrichment/units.ts](src/data/enrichment/units.ts#L729): `miniatures: 4` — property doesn't exist on `UnitEnrichment`
2. **`armament-e-11d`** in [src/data/enrichment/upgrades.ts](src/data/enrichment/upgrades.ts#L69): `weapons` array — property doesn't exist on `UpgradeEnrichment`
3. **`grenades-impact-grenades`** in [src/data/enrichment/upgrades.ts](src/data/enrichment/upgrades.ts#L608): `weapons` array — same type error
4. **`heavy-weapon-agent-kallus`** in [src/data/enrichment/upgrades.ts](src/data/enrichment/upgrades.ts#L739): `weapons` array — same type error
5. **`heavy-weapon-dlt-19d-trooper`** in [src/data/enrichment/upgrades.ts](src/data/enrichment/upgrades.ts#L837): `weapons` array — same type error

---

## Implementation Steps

### Step 5.6A.1 — Add `sidearmMelee` / `sidearmRanged` to `WeaponKeywords`

**File:** `src/engine/types.ts`

Add two boolean fields to the `WeaponKeywords` interface in the "Per-weapon only" section:

```ts
// Per-weapon only (applied during pool formation, not aggregated)
spray: boolean;
antiMaterielX: number;
antiPersonnelX: number;
cumbersome: boolean;
sidearmMelee: boolean;    // ← NEW: weapon only usable in melee attack pools
sidearmRanged: boolean;   // ← NEW: weapon only usable in ranged attack pools
```

**Also update** every location that constructs full `WeaponKeywords` objects to include these new fields with `false` defaults:
- `createEmptyWeapon()` in `src/stores/attackConfigStore.ts` (L117-L131)
- `generateSkeletonAttackerPreset()` in `src/data/presetGenerator.ts` (L137-L156)
- `generateAttackerPreset()` in `src/data/presetGenerator.ts` (L85-L99)

**Verify:**
- `npm run typecheck` passes — all `WeaponKeywords` constructors include the new fields
- `npm run lint` passes
- Existing tests still pass

---

### Step 5.6A.2 — Update `getWeaponsForAttackType` for Sidearm Safety Net

**File:** `src/engine/attackPool.ts`

Modify `getWeaponsForAttackType` (L26-L33) to:
1. **Remove** the Arsenal slice (`validWeapons.slice(0, getWeaponContributionLimit(config))`)
2. **Add** sidearm filtering as a **safety net**: exclude weapons with `sidearmMelee: true` from non-melee pools and `sidearmRanged: true` from non-ranged pools

**Important:** The primary sidearm handling happens upstream in the per-miniature weapon selection during config assembly (Step 5.6E.1). By the time weapons reach the engine's `weapons[]` array, each entry should already represent the correct weapon for each miniature considering sidearm rules. This filter exists only as a safety net for Custom Pool mode (where users manually configure weapons) and to guarantee no mismatched sidearm weapons reach the engine.

```ts
export function getWeaponsForAttackType(config: AttackConfig): WeaponProfile[] {
  return config.attacker.weapons.filter((weapon) => {
    // Basic attack type compatibility
    if (!isWeaponUsableForAttackType(weapon.weaponType, config.attackType)) {
      return false;
    }
    // Sidearm safety net: exclude sidearm weapons that don't match attack type
    if (weapon.keywords.sidearmMelee && config.attackType !== AttackType.Melee) {
      return false;
    }
    if (weapon.keywords.sidearmRanged && config.attackType !== AttackType.Ranged) {
      return false;
    }
    return true;
  });
}
```

**Note:** `getWeaponContributionLimit` and the Arsenal slice are removed from this function. Arsenal X enforcement is not needed because:
- Arsenal X only exists on single-miniature units (vehicles/heroes)
- These units only have 1 miniature contributing weapons, so the `weapons[]` array is pre-populated upstream with Arsenal-compliant entries
- If a future unit ever had both Arsenal X and multiple minis, the upstream assignment builder would need to enforce the limit

**Verify:**
- Existing `attackPool.test.ts` tests still pass (update any that relied on the Arsenal slice)
- Sidearm filtering works: a weapon with `sidearmRanged: true` is excluded from melee pools
- A weapon with `sidearmMelee: true` is excluded from ranged pools

---

### Step 5.6A.3 — Add `Counterpart` to `UpgradeSlot` Enum

**File:** `src/data/types.ts`

Add `Counterpart` to the `UpgradeSlot` enum, `UPGRADE_SLOT_LABELS`, and do NOT add to `COMBAT_RELEVANT_SLOTS` (deferred):

```ts
export enum UpgradeSlot {
  // ... existing slots ...

  // Deferred (counterpart support is future work)
  Counterpart = 'counterpart',
}
```

```ts
export const UPGRADE_SLOT_LABELS: Record<UpgradeSlot, string> = {
  // ... existing labels ...
  [UpgradeSlot.Counterpart]: 'Counterpart',
};
```

**Verify:**
- `npm run typecheck` passes
- `processApiData.ts` can now properly handle counterpart upgrade slots without silently dropping them

---

### Step 5.6B.1 — Add `miniatureCount` to `UnitEnrichment`

**File:** `src/data/enrichment/types.ts`

Add `miniatureCount` to the `UnitEnrichment` interface:

```ts
export interface UnitEnrichment {
  /** Unit-level attack surge chart used by all unit weapons */
  attackSurgeChart?: AttackSurgeChart;

  /** Defense surge chart (not available from API) */
  defenseSurgeChart?: DefenseSurgeChart;

  /**
   * Override the base miniature count for this unit.
   * When present, overrides the API's `figures` field.
   * When absent, the API `figures` value is used (default: 1 if API is also absent).
   *
   * This is the number of miniatures in the base unit BEFORE upgrades.
   * Personnel upgrades may add additional miniatures on top of this count.
   */
  miniatureCount?: number;

  // ... rest of existing fields unchanged ...
}
```

**Also rename** `miniatures: 4` to `miniatureCount: 4` on `imperial-death-troopers` in `src/data/enrichment/units.ts` (L729). This fixes the pre-existing type error.

**Verify:**
- `npm run typecheck` passes — the `miniatures` type error on Death Troopers is resolved
- The enrichment type now accepts `miniatureCount`

---

### Step 5.6B.2 — Extend `UpgradeEnrichment` with Weapons and Mini Flags

**File:** `src/data/enrichment/types.ts`

Add `weapons`, `addsMiniature`, and `noncombatant` to the `UpgradeEnrichment` interface:

```ts
export interface UpgradeEnrichment {
  /**
   * Keywords this upgrade grants when equipped.
   * ... (existing JSDoc) ...
   */
  keywords?: UpgradeKeywords;

  /**
   * Weapon profiles this upgrade provides.
   * Used by: Heavy Weapon upgrades (add a miniature with this weapon),
   * Squad Leader upgrades (add a miniature with this weapon),
   * Armament upgrades (add/modify weapon options), Grenade upgrades
   * (add one weapon entry per grenade instance — each grenade upgrade
   * contributes once per pool, but multiple different grenades each
   * contribute independently), Personnel upgrades
   * (provide the weapon profile for the added miniature).
   *
   * If a weapon has sidearmMelee/sidearmRanged in its keywords,
   * it is only usable in the matching attack type.
   */
  weapons?: EnrichmentWeaponProfile[];

  /**
   * Whether this upgrade adds a miniature to the unit.
   * Implicit defaults based on upgrade slot type:
   *   - Heavy Weapon: 1 (adds the heavy weapon specialist mini)
   *   - Personnel: 1 (adds a trooper/support mini)
   *   - Squad Leader: 1 (adds a leader mini)
   *   - All other slots: 0 (does not add a mini)
   *
   * Only set this explicitly when the upgrade differs from the slot default.
   * For example, "squad" personnel upgrades that add 2 minis should set
   * `addsMiniature: 2` to override the default of 1.
   *
   * The resolver applies slot-based defaults when this field is absent.
   */
  addsMiniature?: number;

  /**
   * Whether the miniature added by this upgrade is a noncombatant.
   * Noncombatant miniatures increase the unit's mini count (for wound allocation
   * and model count purposes) but cannot contribute weapons to the attack pool.
   *
   * Used by: Medical droids (2-1B, FX-9, EV-series), astromech droids,
   * protocol droids, comms technicians, etc.
   */
  noncombatant?: boolean;

  /**
   * Whether this is a grenade-type weapon.
   * Grenade weapons can only contribute once per attack pool per grenade
   * upgrade instance, regardless of how many miniatures carry them.
   * A unit may equip multiple different grenade upgrades — each one
   * independently adds its weapon once to the pool.
   * When true, the upgrade applicator ensures exactly one entry per
   * grenade upgrade (not one total across all grenades).
   */
  isGrenade?: boolean;

  /**
   * Additional upgrade slot(s) this upgrade adds to the unit when equipped.
   * For example, Agent Kallus adds a Heavy Weapon slot; Stormtrooper Captain
   * adds a Training slot.
   *
   * When this upgrade is equipped, the UI dynamically adds these slot(s)
   * to the unit's upgrade bar, allowing the user to equip additional upgrades.
   * Unequipping this upgrade removes the dynamically-added slot(s) and any
   * upgrades equipped in them.
   */
  addsUpgradeSlot?: UpgradeSlot[];
}
```

**Note on `addsMiniature` type:** Using `number` instead of `boolean` accommodates upgrades that add different numbers of minis. Most Heavy Weapon, Personnel, and Squad Leader upgrades add 1 mini (the slot default — no override needed). "Squad" personnel upgrades add 2 minis and should set `addsMiniature: 2`. The resolver applies slot-based defaults when `addsMiniature` is absent: Heavy Weapon / Personnel / Squad Leader default to 1; all other slots default to 0.

**Verify:**
- `npm run typecheck` passes — the 4 existing `weapons` type errors in `upgrades.ts` are resolved
- The enrichment type accepts all new fields

---

### Step 5.6B.3 — Extend `ResolvedUpgrade` Type

**File:** `src/data/types.ts`

Add weapon and miniature fields to `ResolvedUpgrade`:

```ts
export interface ResolvedUpgrade {
  id: string;
  apiId: number;
  name: string;
  cost: number;
  upgradeSlot: UpgradeSlot;
  restrictedToUnitApiId: number | null;
  keywords: Record<string, number | boolean>;

  /** Weapon profiles this upgrade provides (from enrichment). Empty array if none. */
  weapons: WeaponProfile[];

  /**
   * Number of additional miniatures this upgrade adds to the unit.
   * Resolved from enrichment with slot-based defaults:
   *   - Heavy Weapon / Personnel / Squad Leader: defaults to 1 if not specified
   *   - All other slots: defaults to 0
   * Enrichment can override to any value (e.g., 2 for squad personnel, 0 for
   * an upgrade that explicitly does NOT add a mini despite being in a slot that
   * normally would).
   */
  addsMiniature: number;

  /** Whether the added miniature is a noncombatant (cannot contribute weapons). */
  noncombatant: boolean;

  /** Whether this upgrade provides a grenade weapon (1 entry per grenade instance per pool). */
  isGrenade: boolean;

  /** Additional upgrade slot(s) this upgrade adds to the unit when equipped. Empty array if none. */
  addsUpgradeSlot: UpgradeSlot[];

  isEnriched: boolean;
}
```

**Note:** `weapons` is a required field (never undefined), defaulting to `[]` in the resolver. The dependent engine `WeaponProfile` type is reused here (same as the data-layer `WeaponProfile` already in `src/data/types.ts`).

**Verify:**
- `npm run typecheck` passes — `upgradeResolver.ts` will need to be updated to produce these fields (Step 5.6C.2)

---

### Step 5.6B.4 — Add `baseMiniatureCount` and `unitBaseWeapons` to `AttackerPresetProfile`

**File:** `src/data/presets.ts`

Add `baseMiniatureCount` and `unitBaseWeapons` to `AttackerPresetProfile`:

```ts
export interface AttackerPresetProfile {
  // Dice pool and weapon keywords — packaged as weapons array
  weapons?: WeaponProfile[];

  /**
   * Base miniature count for this unit (before upgrades).
   * Used to determine how many base weapon entries to expand.
   * Defaults to 1 if not specified (single-mini unit).
   */
  baseMiniatureCount?: number;

  /**
   * All weapon profiles available on the unit card (ALL attack types).
   * Used by the config assembly to select the correct weapon per miniature
   * based on the current attack type, and for sidearm fallback.
   * In Custom Pool mode this is not used; only in Unit Builder mode.
   */
  unitBaseWeapons?: DataLayerWeaponProfile[];

  // ... rest unchanged ...
}
```

**Why `unitBaseWeapons`?** The preset must carry all unit weapon profiles (ranged, melee, hybrid) so that:
- The config selector can pick the correct weapon per base mini for the current attack type
- Upgrade miniatures that need to fall back to unit weapons (e.g., heavy weapon mini during melee, or sidearm non-enforced) have access to unit weapons
- Changing the attack type mode (ranged → melee → overrun) does NOT require reloading the preset — the config assembly simply re-resolves each miniature's weapon from the available profiles

**Verify:**
- `npm run typecheck` passes

---

### Step 5.6C.1 — Update Unit Resolver for `miniatureCount`

**File:** `src/data/unitResolver.ts`

In the `resolveUnit` function (around L105), change the `figures` resolution to apply the enrichment override:

```ts
// Before:
figures: processed.figures,

// After:
figures: enrichment?.miniatureCount ?? processed.figures ?? 1,
```

This single-line change implements the priority chain: enrichment `miniatureCount` > API `figures` > default `1`.

**Verify:**
- `npm run typecheck` passes
- `getResolvedUnitById('imperial-death-troopers')?.figures` returns `4`
- A unit without enrichment `miniatureCount` uses its API `figures` value
- A unit with API `figures: 0` and no enrichment defaults to... `0` (from API) — enrichment should be added for such units (manual task)

---

### Step 5.6C.2 — Update Upgrade Resolver for Weapons and Mini Flags

**File:** `src/data/upgradeResolver.ts`

Update the `resolveUpgrade` function to include the new fields:

```ts
function resolveUpgrade(processed: ProcessedUpgrade): ResolvedUpgrade {
  const enrichment: UpgradeEnrichment | undefined =
    UPGRADE_ENRICHMENTS[processed.id];
  const isEnriched = enrichment !== undefined;

  const normalizedKeywords: Record<string, number | boolean> = {};
  if (enrichment?.keywords) {
    for (const [key, value] of Object.entries(enrichment.keywords)) {
      if (typeof value === 'number' || typeof value === 'boolean') {
        normalizedKeywords[key] = value;
      }
    }
  }

  return {
    id: processed.id,
    apiId: processed.apiId,
    name: processed.name,
    cost: processed.cost,
    upgradeSlot: processed.upgradeSlot as UpgradeSlot,
    restrictedToUnitApiId: processed.restrictedToUnitApiId,
    keywords: normalizedKeywords,
    weapons: normalizeEnrichmentWeapons(enrichment?.weapons),
    addsMiniature: resolveAddsMiniature(enrichment, processed.upgradeSlot as UpgradeSlot),
    noncombatant: enrichment?.noncombatant ?? false,
    isGrenade: enrichment?.isGrenade ?? false,
    addsUpgradeSlot: enrichment?.addsUpgradeSlot ?? [],
    isEnriched,
  };
}

/**
 * Resolve the addsMiniature value with slot-based defaults.
 * Heavy Weapon, Personnel, and Squad Leader slots default to 1.
 * All other slots default to 0.
 * Enrichment overrides take precedence when specified.
 */
function resolveAddsMiniature(
  enrichment: UpgradeEnrichment | undefined,
  slot: UpgradeSlot,
): number {
  // Explicit enrichment override always wins
  if (enrichment?.addsMiniature !== undefined) {
    return enrichment.addsMiniature;
  }
  // Slot-based implicit defaults
  const ADDS_MINI_SLOTS = new Set([
    UpgradeSlot.HeavyWeapon,
    UpgradeSlot.Personnel,
    UpgradeSlot.SquadLeader,
  ]);
  return ADDS_MINI_SLOTS.has(slot) ? 1 : 0;
}
```

And add the weapon normalization helper (same pattern as `unitResolver.ts`):

```ts
import type { EnrichmentWeaponProfile } from './enrichment/types';

function normalizeEnrichmentWeapons(
  weapons: EnrichmentWeaponProfile[] | undefined,
): ResolvedUpgrade['weapons'] {
  if (!weapons || weapons.length === 0) return [];

  return weapons.map((weapon) => ({
    name: weapon.name,
    weaponType: weapon.weaponType,
    redDice: weapon.redDice ?? 0,
    blackDice: weapon.blackDice ?? 0,
    whiteDice: weapon.whiteDice ?? 0,
    keywords: weapon.keywords ?? {},
    minRange: weapon.minRange,
    maxRange: weapon.maxRange,
  }));
}
```

**Verify:**
- `npm run typecheck` passes
- Upgrades with `weapons` in enrichment (Agent Kallus, DLT-19D, etc.) have populated `weapons` arrays
- Upgrades without `weapons` have empty `weapons: []`
- Personnel upgrades with `addsMiniature` have the correct value
- Un-enriched upgrades have `addsMiniature: 0`, `noncombatant: false`, `isGrenade: false`

---

### Note: Enrichment Data Population (Manual Task)

Steps for populating enrichment data (unit `miniatureCount` overrides, unit weapon profiles, upgrade weapon data, `addsMiniature`/`noncombatant`/`isGrenade`/`addsUpgradeSlot` values) are **not included in this plan**. These are manual tasks that require referencing physical game cards and will be completed by a human separately. The resolver and type infrastructure (Steps 5.6B and 5.6C) must be in place before enrichment data can be authored.

> **Unarmed requirement:** When enriching trooper units, always include an Unarmed melee weapon (`{ name: 'Unarmed', weaponType: AttackType.Melee, blackDice: 1, keywords: {} }`) in the unit's `weapons` array. This ensures melee attacks produce valid pools even for ranged-only units. Vehicle units do not have Unarmed.

---

### Step 5.6D.1 — Rewrite Preset Generator for Multi-Mini Units

**File:** `src/data/presetGenerator.ts`

Replace the current "one preset per weapon" logic with multi-mini-aware, mode-aware generation.

**Current behavior (L40-56):**
```ts
// Enriched units: one attacker preset per weapon
for (let i = 0; i < unit.weapons.length; i++) {
  attackerPresets.push(generateAttackerPreset(unit, i));
}
```

**New behavior:**

For **single-mini units** (`figures === 1` — heroes, vehicles, operatives): keep current behavior. One preset per weapon, each with that single weapon in `weapons[]`.

For **multi-mini units** (`figures > 1` — trooper squads): generate a **single preset per unit** that carries ALL the unit's weapon profiles (`unitBaseWeapons`) plus the expanded `weapons[]` for the unit's default attack type. The config selector dynamically re-derives `weapons[]` when the attack mode changes.

```ts
for (const unit of units) {
  defenderPresets.push(generateDefenderPreset(unit));

  if (unit.weapons.length > 0) {
    if (unit.figures <= 1) {
      // Single-mini: one preset per weapon (existing behavior)
      for (let i = 0; i < unit.weapons.length; i++) {
        attackerPresets.push(generateAttackerPreset(unit, i));
      }
    } else {
      // Multi-mini: single preset with all unit weapons + expanded base pool
      attackerPresets.push(generateMultiMiniAttackerPreset(unit));
    }
  } else {
    attackerPresets.push(generateSkeletonAttackerPreset(unit));
  }
}
```

**`generateMultiMiniAttackerPreset` logic:**

```ts
function generateMultiMiniAttackerPreset(unit: ResolvedUnit): AttackerPreset {
  // Determine the default attack type (prefer ranged if available)
  const rangedWeapons = unit.weapons.filter(w =>
    isWeaponUsableForAttackType(w.weaponType, AttackType.Ranged)
  );
  const defaultAttackType = rangedWeapons.length > 0
    ? AttackType.Ranged
    : AttackType.Melee;

  // Pick the default weapon for the default attack type
  const defaultWeapon = rangedWeapons.length > 0
    ? rangedWeapons[0]
    : unit.weapons.filter(w =>
        isWeaponUsableForAttackType(w.weaponType, AttackType.Melee)
      )[0];

  // Expand: N copies of the default weapon for the base pool
  const expandedWeapons = Array.from({ length: unit.figures }, () =>
    normalizeToEngineWeapon(defaultWeapon)
  );

  const profile: Record<string, any> = {
    weapons: expandedWeapons,
    baseMiniatureCount: unit.figures,
    unitBaseWeapons: unit.weapons,  // ALL unit weapon profiles (all attack types)
    surgeChart: unit.attackSurgeChart ?? AttackSurgeChart.None,
    unitCost: unit.cost,
  };
  copyKeywordsToProfile(unit.keywords, profile);

  return {
    id: unit.id,
    faction: unit.faction as Faction,
    name: `${unit.name} (${defaultWeapon.name})`,
    attackType: defaultAttackType,
    profile,
    upgradeBar: unit.upgradeBar,
  };
}
```

**Key design change:** Instead of creating separate presets per attack type (ranged/melee), a single preset carries `unitBaseWeapons` (all unit weapon profiles). When the user changes the attack mode (ranged → melee → overrun), the config selector re-derives `weapons[]` from `unitBaseWeapons` and the current `attackType` without reloading the preset. This means:
- Equipped upgrades are preserved when switching attack modes
- The UI stays on the same unit selection
- The pool is dynamically recomputed

This produces presets like:
- **Stormtroopers (E-11 Blaster Rifle)**: `weapons = [E-11, E-11, E-11, E-11]`, `unitBaseWeapons = [E-11 (Ranged), Unarmed (Melee)]`
- **B1 Battle Droids (E-5 Blaster Rifle)**: `weapons = [E-5, E-5, E-5, E-5, E-5, E-5]`, `unitBaseWeapons = [E-5 (Ranged), Unarmed (Melee)]`

When the user switches to melee mode, the config selector re-expands: `weapons = [Unarmed, Unarmed, Unarmed, Unarmed]` for Stormtroopers.

When upgrades are equipped (heavy weapon, personnel, squad leader), the upgrade applicator (Step 5.6E) adds weapon entries based on per-miniature weapon selection rules.

**Verify:**
- Single-mini unit presets are unchanged (1 weapon per preset)
- Multi-mini unit presets have `figures` copies of the default weapon in `weapons[]`
- `baseMiniatureCount` and `unitBaseWeapons` are set on multi-mini presets
- `unitBaseWeapons` contains ALL unit weapon profiles (ranged + melee + hybrid)
- `npm run typecheck` and `npm run lint` pass
- Existing preset generator tests need to be updated to expect the new behavior

---

### Step 5.6E.1 — Extend Upgrade Applicator: Per-Miniature Weapon Assembly

**File:** `src/data/upgradeApplicator.ts`

This is the largest single change. The `applyAttackerUpgrades` function gains new parameters and implements **per-miniature weapon selection** with correct ownership and sidearm semantics.

**API change:**

```ts
export function applyAttackerUpgrades<T extends ConfigWithCost>(
  config: T,
  equippedUpgradeIds: (string | null)[],
  attackType: AttackType,              // ← NEW: needed for weapon selection
  unitBaseWeapons: DataLayerWeaponProfile[],  // ← NEW: all unit card weapons (for fallback)
): T {
  return applyUpgrades(config, equippedUpgradeIds, attackType, unitBaseWeapons);
}
```

**Per-miniature weapon selection helper:**

Each miniature added by an upgrade selects ONE weapon to contribute to the pool based on the current attack type, the upgrade's weapons, and sidearm rules.

```ts
/**
 * Select the weapon an upgrade-added miniature contributes to the attack pool.
 *
 * Rules:
 * 1. Upgrade mini primarily uses its own upgrade's weapon profiles.
 * 2. If the upgrade has no weapon matching the attack type, the mini
 *    falls back to unit base weapons (e.g., Unarmed melee).
 * 3. Sidearm restriction: when the sidearm type matches the attack type
 *    (enforced), the mini MUST use only the upgrade's weapons of that type
 *    and CANNOT fall back to unit weapons.
 * 4. Sidearm non-enforced: when the sidearm type does NOT match the attack
 *    type, the mini CAN use any compatible weapon from upgrade + unit.
 */
function selectWeaponForUpgradeMini(
  upgradeWeapons: DataLayerWeaponProfile[],
  attackType: AttackType,
  unitBaseWeapons: DataLayerWeaponProfile[],
): DataLayerWeaponProfile | null {
  const hasSidearmMelee = upgradeWeapons.some(w => w.keywords?.sidearmMelee);
  const hasSidearmRanged = upgradeWeapons.some(w => w.keywords?.sidearmRanged);

  // Case 1: Sidearm: Ranged is NOT enforced (attack is melee/overrun)
  // → mini can use any compatible weapon from upgrade + unit
  if (hasSidearmRanged && attackType !== AttackType.Ranged) {
    const candidates = [...upgradeWeapons, ...unitBaseWeapons]
      .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));
    return candidates[0] ?? null;
  }

  // Case 2: Sidearm: Melee is NOT enforced (attack is ranged/overrun)
  // → mini can use any compatible weapon from upgrade + unit
  if (hasSidearmMelee && attackType !== AttackType.Melee) {
    const candidates = [...upgradeWeapons, ...unitBaseWeapons]
      .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));
    return candidates[0] ?? null;
  }

  // Case 3: No sidearm, or sidearm IS enforced → use upgrade weapons only
  const compatible = upgradeWeapons
    .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));
  if (compatible.length > 0) return compatible[0];

  // Case 4: No compatible upgrade weapon → fall back to unit base weapons
  // (e.g., a pure-ranged heavy weapon mini during a melee attack uses Unarmed)
  // Note: this fallback does NOT apply when sidearm IS enforced — that case
  // was handled in Cases 1-2 above (the enforced path stays in Case 3).
  const fallback = unitBaseWeapons
    .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));
  return fallback[0] ?? null;
}
```

**Weapon manipulation logic in `applyUpgrades`:**

```ts
function applyUpgrades<T extends ConfigWithCost>(
  config: T,
  equippedUpgradeIds: (string | null)[],
  attackType?: AttackType,
  unitBaseWeapons?: DataLayerWeaponProfile[],
): T {
  const result: ConfigWithCost = { ...config };

  // Re-derive base weapons from unitBaseWeapons and baseMiniatureCount
  // if we have unit context (Unit Builder mode). This ensures that
  // changing attack type produces the correct base weapon expansion.
  const baseMiniCount = (config as any).baseMiniatureCount ?? 1;
  let weapons: WeaponProfile[];

  if (unitBaseWeapons && unitBaseWeapons.length > 0 && attackType !== undefined) {
    // Unit Builder mode: expand base minis with attack-type-appropriate weapons
    const baseWeaponForAttackType = unitBaseWeapons
      .filter(w => isWeaponUsableForAttackType(w.weaponType, attackType));
    const defaultBaseWeapon = baseWeaponForAttackType[0];
    if (defaultBaseWeapon) {
      weapons = Array.from({ length: baseMiniCount }, () =>
        normalizeToEngineWeapon(defaultBaseWeapon)
      );
    } else {
      weapons = []; // No base weapon for this attack type
    }
  } else {
    // Custom Pool mode or no unit context: use config.weapons as-is
    weapons = [...(config.weapons ?? [])];
  }

  let totalUpgradeCost = 0;

  for (const upgradeId of equippedUpgradeIds) {
    if (!upgradeId) continue;
    const upgrade = getResolvedUpgradeById(upgradeId);
    if (!upgrade) continue;

    totalUpgradeCost += upgrade.cost;

    // Apply keyword effects (existing logic)
    for (const [fieldName, kwValue] of Object.entries(upgrade.keywords)) {
      if (typeof kwValue === 'boolean') {
        result[fieldName] = true;
      } else if (typeof kwValue === 'number') {
        const currentValue = (result[fieldName] as number) ?? 0;
        result[fieldName] = currentValue + kwValue;
      }
    }

    // Weapon array manipulation — per-miniature weapon selection
    if (upgrade.isGrenade && upgrade.weapons.length > 0) {
      // Grenade: add exactly one weapon entry for THIS grenade upgrade.
      // Each grenade upgrade contributes independently — a unit with
      // Impact Grenades and Concussion Grenades adds both. But each
      // individual grenade adds only 1 entry (not 1 per miniature).
      for (const w of upgrade.weapons) {
        if (isWeaponUsableForAttackType(w.weaponType, attackType ?? AttackType.Ranged)) {
          weapons.push(normalizeToEngineWeapon(w));
          break; // Only one weapon entry per grenade instance
        }
      }
    } else if (upgrade.addsMiniature > 0) {
      if (upgrade.noncombatant) {
        // Noncombatant: no weapon added (cost + keywords only)
        continue;
      }

      // Combatant upgrade that adds mini(s):
      // Select the best weapon for each added miniature from ALL of the
      // upgrade's weapons, considering attack type and sidearm rules.
      for (let i = 0; i < upgrade.addsMiniature; i++) {
        const selectedWeapon = upgrade.weapons.length > 0
          ? selectWeaponForUpgradeMini(
              upgrade.weapons,          // ALL upgrade weapons
              attackType ?? AttackType.Ranged,
              unitBaseWeapons ?? [],     // unit weapons for sidearm fallback
            )
          : null;

        if (selectedWeapon) {
          weapons.push(normalizeToEngineWeapon(selectedWeapon));
        } else if (unitBaseWeapons && unitBaseWeapons.length > 0) {
          // Upgrade has no weapons at all: use a unit base weapon
          // (unenriched upgrade fallback)
          const fallback = unitBaseWeapons.filter(w =>
            isWeaponUsableForAttackType(w.weaponType, attackType ?? AttackType.Ranged)
          );
          if (fallback.length > 0) {
            weapons.push(normalizeToEngineWeapon(fallback[0]));
          }
        }
      }
    } else if (upgrade.upgradeSlot === UpgradeSlot.Armament) {
      // Armament: add ALL weapon options as additional choices
      for (const w of upgrade.weapons) {
        if (isWeaponUsableForAttackType(w.weaponType, attackType ?? AttackType.Ranged)) {
          weapons.push(normalizeToEngineWeapon(w));
        }
      }
    }
  }

  result.weapons = weapons;
  result.unitCost = (result.unitCost ?? 0) + totalUpgradeCost;

  return result as T;
}
```

**Key changes from the previous version:**

1. **All weapons from each upgrade are considered:** `selectWeaponForUpgradeMini` evaluates ALL upgrade weapons to find the best match for the attack type, not just `weapons[0]`.

2. **Per-miniature weapon ownership:** Upgrade weapons are only used by the upgrade's miniature. Base minis use unit base weapons. The weapons array is built from scratch using `unitBaseWeapons` for base minis and `selectWeaponForUpgradeMini` for upgrade minis.

3. **Correct sidearm handling:** Sidearm is a per-miniature restriction. When sidearm IS enforced (attack type matches sidearm type), the mini uses only upgrade weapons. When sidearm is NOT enforced, the mini can use any compatible weapon from upgrade + unit base weapons.

4. **Re-derives base weapons from attack type:** The `weapons[]` array is rebuilt from `unitBaseWeapons` every time, picking the correct base weapon for the current attack type. This ensures that switching from ranged to melee mode correctly changes base minis' weapons (e.g., E-11 → Unarmed).

5. **No more global sidearm filter at the end:** Sidearm is handled per-miniature during assembly, not as a post-hoc filter on the flat array.

**Helper function (shared with preset generator):**

```ts
function normalizeToEngineWeapon(
  weapon: DataLayerWeaponProfile,
): EngineWeaponProfile {
  return {
    name: weapon.name,
    weaponType: weapon.weaponType,
    redDice: weapon.redDice ?? 0,
    blackDice: weapon.blackDice ?? 0,
    whiteDice: weapon.whiteDice ?? 0,
    keywords: {
      pierceX: 0,
      impactX: 0,
      criticalX: 0,
      lethalX: 0,
      ramX: 0,
      blast: false,
      suppressive: false,
      highVelocity: false,
      spray: false,
      antiMaterielX: 0,
      antiPersonnelX: 0,
      cumbersome: false,
      sidearmMelee: false,
      sidearmRanged: false,
      ...weapon.keywords,
    },
  };
}
```

**Verify:**
- `npm run typecheck` passes
- **Heavy weapon:** DLT-19 during ranged → pool adds DLT-19 entry. During melee → pool adds Unarmed (unit base melee weapon)
- **Personnel (standard):** adds personnel's weapon for matching attack type
- **Personnel (sidearm, e.g., T-series Tactical Droid with Sidearm: Ranged):**
  - Ranged attack → uses T-series ranged weapon (sidearm enforced)
  - Melee attack → uses B1 Unarmed (sidearm not enforced, falls back to unit weapons)
- **Squad personnel (addsMiniature: 2):** adds 2 weapon entries
- **Noncombatant:** no weapon added (cost + keywords only)
- **Grenade:** appears at most once, attack-type compatible
- **Armament:** ALL weapons added (filtered by attack type)
- **All upgrade weapons considered:** not just `weapons[0]`
- **Attack mode switch:** changing ranged → melee re-derives all base mini weapons from `unitBaseWeapons`
- Original config is not mutated (immutability preserved)

---

### Step 5.6E.2 — Wire `attackType` and `unitBaseWeapons` Through Config Selectors

**File:** `src/stores/configSelectors.ts`

Update `getFullConfig()` and `useFullConfig()` to pass `attackType` and `unitBaseWeapons` to the attacker upgrade applicator:

```ts
export function getFullConfig(): AttackConfig {
  const attackState = useAttackConfigStore.getState();
  const defenseState = useDefenseConfigStore.getState();
  const attackTypeState = useAttackTypeStore.getState();

  const baseAttacker = selectAttackerConfig(attackState);
  const baseDefender = selectDefenderConfig(defenseState);

  // Pass attackType and unitBaseWeapons for per-mini weapon assembly
  const attacker = applyAttackerUpgrades(
    baseAttacker,
    attackState.equippedUpgradeIds,
    attackTypeState.attackType,       // ← NEW: for weapon selection
    attackState.unitBaseWeapons ?? [], // ← NEW: for sidearm fallback
  );
  const defender = applyDefenderUpgrades(
    baseDefender,
    defenseState.equippedUpgradeIds,
  );

  return {
    attacker,
    defender,
    attackType: attackTypeState.attackType,
  };
}

export function useFullConfig(): AttackConfig {
  const attackerConfig = useAttackConfigStore(selectAttackerConfig);
  const attackerUpgradeIds = useAttackConfigStore(
    (s) => s.equippedUpgradeIds,
  );
  const unitBaseWeapons = useAttackConfigStore(
    (s) => s.unitBaseWeapons,
  );
  const defenderConfig = useDefenseConfigStore(selectDefenderConfig);
  const defenderUpgradeIds = useDefenseConfigStore(
    (s) => s.equippedUpgradeIds,
  );
  const attackType = useAttackTypeStore((s) => s.attackType);

  // Pass attackType and unitBaseWeapons for per-mini weapon assembly
  const attacker = applyAttackerUpgrades(
    attackerConfig,
    attackerUpgradeIds,
    attackType,              // ← NEW
    unitBaseWeapons ?? [],   // ← NEW
  );
  const defender = applyDefenderUpgrades(defenderConfig, defenderUpgradeIds);

  return {
    attacker,
    defender,
    attackType,
  };
}
```

**Key change:** `unitBaseWeapons` is passed to the upgrade applicator so that:
- Base mini weapons are re-derived from unit weapon profiles for the current attack type
- Sidearm fallback has access to unit weapons
- Changing attack mode (ranged → melee → overrun) produces correct base weapon expansion without reloading the preset

**Verify:**
- `npm run typecheck` passes
- Changing attack type triggers re-render with correct base weapon expansion
- Sidearm mini correctly falls back to unit weapons when sidearm is not enforced

---

### Step 5.6F.1 — Add `baseMiniatureCount`, `unitBaseWeapons`, and Dynamic Upgrade Bar to Attack Config Store

**File:** `src/stores/attackConfigStore.ts`

Add `baseMiniatureCount`, `unitBaseWeapons`, and dynamic upgrade bar support to the state interface, defaults, and exclude from `selectAttackerConfig`:

```ts
/**
 * An upgrade slot entry with provenance tracking.
 * `source` is the upgradeId that added this slot (null for base slots).
 * Used by the UI to show which upgrade provided each dynamic slot,
 * and by the cascade removal logic to identify which slots to remove.
 */
export interface EffectiveUpgradeSlot {
  slot: UpgradeSlot;
  source: string | null;  // null = base upgrade bar, string = upgradeId that added it
}

export interface AttackConfigState {
  // ... existing fields ...

  /**
   * Base miniature count for the selected unit (before upgrades).
   * Determines how many weapon entries start in the weapons array.
   * Set by loadPreset from the preset's baseMiniatureCount field.
   * Defaults to 1 for Custom Pool mode.
   */
  baseMiniatureCount: number;

  /**
   * All weapon profiles available on the unit card (ALL attack types).
   * Used by the config selector to pass to applyAttackerUpgrades for
   * per-miniature weapon resolution (base weapon expansion + sidearm fallback).
   * Set by loadPreset from the preset's unitBaseWeapons field.
   * Not used in Custom Pool mode (empty array).
   */
  unitBaseWeapons: DataLayerWeaponProfile[];

  /**
   * The effective upgrade bar, combining the unit's base upgrade bar
   * with any dynamically-added slots from equipped upgrades.
   * Recomputed whenever an upgrade is equipped/unequipped.
   * Each entry tracks its source upgrade for provenance (null = base slot).
   */
  effectiveUpgradeBar: EffectiveUpgradeSlot[];

  // ... rest unchanged ...
}
```

Update defaults:
```ts
const DEFAULT_ATTACK_CONFIG: AttackConfigFields = {
  // ...existing...
  baseMiniatureCount: 1,    // ← NEW
  unitBaseWeapons: [],      // ← NEW: empty in Custom Pool mode
};
```

Update `loadPreset`:
```ts
loadPreset: (presetId, profile, upgradeBar = []) =>
  set(() => ({
    ...DEFAULT_ATTACK_CONFIG,
    ...profile,
    baseMiniatureCount: profile.baseMiniatureCount ?? 1,  // ← NEW
    unitBaseWeapons: profile.unitBaseWeapons ?? [],        // ← NEW
    selectedPresetId: presetId,
    upgradeBar,
    effectiveUpgradeBar: upgradeBar.map(slot => ({ slot, source: null })),  // ← NEW: base slots have null source
    equippedUpgradeIds: new Array(upgradeBar.length).fill(null),
  })),
```

Update `equipUpgrade` to recompute the effective upgrade bar:
```ts
equipUpgrade: (slotIndex, upgradeId) =>
  set((state) => {
    const newEquippedIds = [...state.equippedUpgradeIds];
    const oldUpgradeId = newEquippedIds[slotIndex];
    newEquippedIds[slotIndex] = upgradeId;

    // Recompute effective upgrade bar from base + dynamic slots
    const { effectiveBar, equippedIds } = recomputeEffectiveUpgradeBar(
      state.upgradeBar,
      newEquippedIds,
    );

    return {
      equippedUpgradeIds: equippedIds,
      effectiveUpgradeBar: effectiveBar,
    };
  }),
```

**`recomputeEffectiveUpgradeBar` helper:**
```ts
function recomputeEffectiveUpgradeBar(
  baseUpgradeBar: UpgradeSlot[],
  equippedUpgradeIds: (string | null)[],
): { effectiveBar: EffectiveUpgradeSlot[]; equippedIds: (string | null)[] } {
  // Start with the base upgrade bar slots (source: null = base)
  const effectiveBar: EffectiveUpgradeSlot[] = baseUpgradeBar.map(slot => ({
    slot,
    source: null,
  }));
  const equippedIds = [...equippedUpgradeIds].slice(0, baseUpgradeBar.length);

  // Collect dynamically-added slots from equipped upgrades
  for (let i = 0; i < baseUpgradeBar.length; i++) {
    const upgradeId = equippedIds[i];
    if (!upgradeId) continue;
    const upgrade = getResolvedUpgradeById(upgradeId);
    if (!upgrade || upgrade.addsUpgradeSlot.length === 0) continue;

    for (const addedSlot of upgrade.addsUpgradeSlot) {
      effectiveBar.push({ slot: addedSlot, source: upgradeId });
      // Preserve any existing equipped upgrade for this dynamic slot
      // (if the array already has an entry at this index)
      if (equippedIds.length < effectiveBar.length) {
        equippedIds.push(null);
      }
    }
  }

  // Trim equippedIds if dynamic slots were removed
  // (e.g., an upgrade with addsUpgradeSlot was unequipped)
  while (equippedIds.length > effectiveBar.length) {
    equippedIds.pop();
  }

  return { effectiveBar, equippedIds };
}
```

Exclude from engine config selector:
```ts
export function selectAttackerConfig(state: AttackConfigState) {
  const {
    selectedFaction,
    selectedPresetId,
    activeMode,
    upgradeBar,
    effectiveUpgradeBar,  // ← NEW: exclude from engine config
    equippedUpgradeIds,
    baseMiniatureCount,   // ← NEW: exclude from engine config
    unitBaseWeapons,      // ← NEW: exclude from engine config (passed separately)
    // ... actions ...
    ...config
  } = state;
  return config;
}
```

**Note:** `baseMiniatureCount`, `unitBaseWeapons`, and `effectiveUpgradeBar` are UI/data-layer state, not sent to the engine directly. The engine already sees the correct `weapons[]` array length — that IS the effective contribution count. `baseMiniatureCount` is used by the UI to display per-miniature assignment cards. `unitBaseWeapons` is passed to the upgrade applicator for per-mini weapon resolution. `effectiveUpgradeBar` drives the UI rendering of upgrade slot dropdowns.

**Verify:**
- `npm run typecheck` passes
- `loadPreset` correctly sets `baseMiniatureCount` from the preset
- `selectAttackerConfig` does NOT include `baseMiniatureCount` or `effectiveUpgradeBar`
- Default value is `1` after `reset()`
- Equipping an upgrade with `addsUpgradeSlot` adds new slot(s) to `effectiveUpgradeBar`
- Unequipping that upgrade removes the dynamic slot(s) and any upgrades in them

---

### Step 5.6G.1 — Unit Builder: Weapon Assignment Panel (UI)

**File:** `src/components/AttackerPanel/WeaponAssignmentPanel.tsx` (new file)

A React component that displays per-miniature weapon assignments for multi-mini units. This is the primary new UI component in this phase.

**Design Specification:**

```
┌─ Weapon Pool ──────────────────────────────────┐
│  ┌───────────────────────────────────────────┐  │
│  │ Mini 1 (Leader)      E-11 Blaster ▾   1W │  │
│  ├───────────────────────────────────────────┤  │
│  │ Mini 2               E-11 Blaster ▾   1W │  │
│  ├───────────────────────────────────────────┤  │
│  │ Mini 3               E-11 Blaster ▾   1W │  │
│  ├───────────────────────────────────────────┤  │
│  │ Mini 4               E-11 Blaster ▾   1W │  │
│  ├───────────────────────────────────────────┤  │
│  │ Mini 5 (Heavy)       ◆ DLT-19        1R  │  │
│  ├───────────────────────────────────────────┤  │
│  │ Mini 6 (Personnel)   E-11 Blaster ▾   1W │  │
│  ├───────────────────────────────────────────┤  │
│  │ [+] Impact Grenades  1B Impact 1      🔒 │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Pool: 5W + 1R + 1B │ Impact 2 │ Precise 1     │
└─────────────────────────────────────────────────┘
```

**Component Props:**
```ts
interface WeaponAssignmentPanelProps {
  baseMiniatureCount: number;
  weapons: WeaponProfile[];          // Current weapons array from store
  availableWeapons: DataWeaponProfile[];  // All weapon options from resolved unit
  equippedUpgradeIds: (string | null)[];
  onWeaponsChange: (weapons: WeaponProfile[]) => void;
}
```

**Behavior:**
- **Base miniatures** (1 to `baseMiniatureCount`): show weapon dropdown if unit has multiple weapon options for this attack type; otherwise show locked weapon name + dice
- **Heavy weapon mini**: labeled "Heavy Weapon", locked to the heavy weapon's profile (◆ indicator), no dropdown. Only shown if a heavy weapon upgrade is equipped. This is an ADDITIONAL mini beyond the base count (e.g., 4 base + 1 heavy = 5 minis total).
- **Personnel mini(s)**: labeled "Personnel", shows the personnel weapon. Only shown if a personnel upgrade is equipped. These are ADDITIONAL minis beyond the base count.
- **Squad Leader mini**: labeled "Squad Leader", shows the squad leader's weapon if available. This is an ADDITIONAL mini beyond the base count.
- **Noncombatant mini(s)**: labeled "Noncombatant" with grayed-out styling, no weapon. Only shown if a noncombatant upgrade is equipped.
- **Grenade row**: separate from miniature rows, shows grenade toggle with "1 per pool" note. Only shown if a grenade upgrade is equipped.
- **Pool summary**: aggregated dice counts by color and stacked keywords

**Dynamic Upgrade Slots:**

When an equipped upgrade has `addsUpgradeSlot`, the Upgrades section in the Unit Builder must dynamically render additional upgrade slot dropdowns:

```
┌─ Upgrades ──────────────────────────────────┐
│  Heavy Wpn:  [Agent Kallus      ▼]          │
│  Personnel:  [Stormtrooper Cpt  ▼]          │
│  Gear:       [None              ▼]          │
│  Grenades:   [None              ▼]          │
│  ── Added by upgrades ──────────────         │
│  Heavy Wpn:  [DLT-19 Stormtpr  ▼]  ← Kallus│
│  Training:   [None              ▼]  ← Cpt   │
└──────────────────────────────────────────────┘
```

- Dynamic slots appear below the base upgrade bar with a subtle visual indicator of their source upgrade
- Unequipping the source upgrade removes the dynamic slot(s) and any upgrades equipped in them
- Dynamic slots otherwise behave identically to base slots (same dropdown, same filtering)
- The `effectiveUpgradeBar` store field drives slot rendering; the UI maps each entry to a dropdown

**Styling (consistent with existing design language):**
- Card: `bg-gray-800 rounded-lg p-3`
- Mini rows: `h-8` height, `border-b border-gray-700`
- Dice indicators: colored badges (red/black/white) using existing DiceDisplay patterns
- Labels: `text-sm text-gray-300`; special labels (Heavy, Personnel) in `text-amber-400`
- Locked weapon indicator: `◆` prefix or 🔒 icon, no dropdown affordance
- Section header: use existing `SectionHeader` component

**Verify:**
- Component renders correctly for 1-mini units (hidden or single row)
- Component shows correct number of rows for multi-mini units (base + heavy + personnel + squad leader)
- Heavy weapon row appears as an ADDITIONAL mini when heavy weapon upgrade is equipped
- Personnel rows appear as ADDITIONAL minis when personnel upgrade is equipped
- Noncombatant rows are grayed out
- Grenade row appears with "1 per pool" constraint
- Pool summary matches `aggregateWeaponKeywords` output
- Dynamic upgrade slots appear when an upgrade with `addsUpgradeSlot` is equipped
- Unequipping the source upgrade removes dynamic slots and their equipped upgrades
- Component follows existing dark theme design patterns

---

### Step 5.6G.2 — Pool Summary Component

**File:** `src/components/AttackerPanel/PoolSummary.tsx` (new file)

A compact component that shows the aggregated attack pool: total dice by color and stacked keywords.

```
Pool: ■4W ■1R ■1B │ Impact 2, Pierce 1
```

Uses the engine's `aggregateWeaponKeywords` function to compute keyword totals from the current weapons array.

**Verify:**
- Correctly sums dice across all weapons
- Correctly aggregates keywords (Pierce, Impact, etc.)
- Updates reactively when weapons array changes

---

### Step 5.6G.3 — Custom Pool Mode: Mini Count Indicator

**File:** `src/components/AttackerPanel/` (modify existing Custom Pool section if built)

When in Custom Pool mode, show a read-only indicator of how many weapon entries are in the pool (effectively the "contributing minis" count). This is informational only — Custom Pool already lets users manually add/remove weapons.

```
Weapons in pool: 4  [+ Add Weapon]
```

**Verify:**
- Indicator updates when weapons are added/removed
- No behavioral changes to Custom Pool controls

---

### Step 5.6H.1 — Engine Tests: Multi-Mini Pool Formation

**File:** `src/engine/attackPool.test.ts` (add new test cases)

Add test cases verifying multi-mini pool behavior:

```ts
describe('Multi-mini attack pool', () => {
  it('sums dice from repeated weapon entries', () => {
    // 4x E-11 (1 white each) = 4 white dice
    const config = createConfig({
      weapons: Array.from({ length: 4 }, () => ({
        name: 'E-11',
        weaponType: AttackType.Ranged,
        redDice: 0,
        blackDice: 0,
        whiteDice: 1,
        keywords: defaultWeaponKeywords(),
      })),
    });
    const pool = formAttackPool(config);
    expect(pool.filter(d => d === AttackDieColor.White)).toHaveLength(4);
  });

  it('stacks keyword values across repeated entries', () => {
    // 4x weapon with Impact 1 = Impact 4
    const weapons = Array.from({ length: 4 }, () => ({
      name: 'E-11D',
      weaponType: AttackType.Ranged,
      redDice: 0,
      blackDice: 1,
      whiteDice: 0,
      keywords: { ...defaultWeaponKeywords(), impactX: 1 },
    }));
    const aggregated = aggregateWeaponKeywords(weapons);
    expect(aggregated.impactX).toBe(4);
  });

  it('filters sidearm weapons by attack type', () => {
    const config = createConfig({
      weapons: [
        {
          name: 'Blaster',
          weaponType: AttackType.Ranged,
          redDice: 1, blackDice: 0, whiteDice: 0,
          keywords: defaultWeaponKeywords(),
        },
        {
          name: 'Bo-Rifle Melee',
          weaponType: AttackType.Melee,
          redDice: 0, blackDice: 2, whiteDice: 0,
          keywords: { ...defaultWeaponKeywords(), sidearmMelee: true },
        },
      ],
      attackType: AttackType.Ranged,
    });
    const filtered = getWeaponsForAttackType(config);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Blaster');
  });

  it('mixed weapon types in multi-mini pool', () => {
    // 3x E-11 + 1x DLT-19
    const config = createConfig({
      weapons: [
        ...Array.from({ length: 3 }, () => ({
          name: 'E-11',
          redDice: 0, blackDice: 0, whiteDice: 1,
          keywords: defaultWeaponKeywords(),
        })),
        {
          name: 'DLT-19',
          redDice: 1, blackDice: 0, whiteDice: 1,
          keywords: { ...defaultWeaponKeywords(), impactX: 1 },
        },
      ],
    });
    const pool = formAttackPool(config);
    expect(pool.filter(d => d === AttackDieColor.White)).toHaveLength(4);
    expect(pool.filter(d => d === AttackDieColor.Red)).toHaveLength(1);
    
    const aggregated = aggregateWeaponKeywords(getWeaponsForAttackType(config));
    expect(aggregated.impactX).toBe(1);
  });
});
```

**Verify:**
- All existing tests still pass
- New tests pass
- `npm run test -- src/engine/attackPool.test.ts` succeeds

---

### Step 5.6H.2 — Upgrade Applicator Tests

**File:** `src/data/__tests__/upgradeApplicator.test.ts` (add new test cases)

```ts
describe('weapon array manipulation', () => {
  it('heavy weapon adds its weapon entry to the pool', () => {
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],  // 4x E-11 (base minis)
    };
    const result = applyAttackerUpgrades(
      config,
      ['heavy-weapon-dlt-19-stormtrooper'],
      AttackType.Ranged,
    );
    // Heavy weapon adds a 5th mini — total is now 5 weapons
    expect(result.weapons).toHaveLength(5);
    expect(result.weapons[4].name).toBe('DLT-19 Heavy Blaster Rifle');
    // Base weapons are untouched
    expect(result.weapons[0].name).toBe('E-11');
  });

  it('uses all weapons from an upgrade, not just weapons[0]', () => {
    // Upgrade has both ranged and melee profiles; melee mode should pick melee profile
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],
    };
    const result = applyAttackerUpgrades(
      config,
      ['heavy-weapon-agent-kallus'],
      AttackType.Melee,
      unitBaseWeapons,
    );
    // Kallus contributes his melee profile in melee mode
    expect(result.weapons[4].name).toBe('Bo-Rifle Melee');
  });

  it('personnel adds weapon entry', () => {
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],
    };
    const result = applyAttackerUpgrades(
      config,
      ['personnel-stormtrooper'],
      AttackType.Ranged,
    );
    expect(result.weapons).toHaveLength(5);
  });

  it('noncombatant personnel does not add weapon', () => {
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],
    };
    const result = applyAttackerUpgrades(
      config,
      ['personnel-2-1b-medical-droid'],
      AttackType.Ranged,
    );
    expect(result.weapons).toHaveLength(4);  // No new weapon
  });

  it('single grenade adds only once per pool', () => {
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],
    };
    const result = applyAttackerUpgrades(
      config,
      ['grenades-impact-grenades'],
      AttackType.Ranged,
    );
    expect(result.weapons).toHaveLength(5);
    // Only 1 grenade entry even though unit has 4 minis
    expect(result.weapons.filter(w => w.name?.includes('Grenade'))).toHaveLength(1);
  });

  it('multiple different grenade upgrades each contribute once', () => {
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],
    };
    const result = applyAttackerUpgrades(
      config,
      ['grenades-impact-grenades', 'grenades-concussion-grenades'],
      AttackType.Ranged,
    );
    // 4 base + 1 Impact Grenade + 1 Concussion Grenade = 6
    expect(result.weapons).toHaveLength(6);
    expect(result.weapons.filter(w => w.name?.includes('Impact'))).toHaveLength(1);
    expect(result.weapons.filter(w => w.name?.includes('Concussion'))).toHaveLength(1);
  });

  it('sidearm enforced — upgrade mini uses sidearm weapon only', () => {
    // Agent Kallus has Sidearm: Melee on his Bo-Rifle Melee weapon
    // In a melee attack, the Kallus mini MUST use Bo-Rifle Melee
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],  // 4 base minis
    };
    const result = applyAttackerUpgrades(
      config,
      ['heavy-weapon-agent-kallus'],
      AttackType.Melee,
      unitBaseWeapons,  // includes Unarmed
    );
    // 4 base minis (using Unarmed) + 1 Kallus mini (Bo-Rifle Melee)
    expect(result.weapons).toHaveLength(5);
    expect(result.weapons[4].name).toBe('Bo-Rifle Melee');
  });

  it('sidearm NOT enforced — upgrade mini falls back to base weapon', () => {
    // Agent Kallus has Sidearm: Melee — NOT enforced during ranged attack
    // The Kallus mini can use any available weapon for this attack type
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],  // 4 base minis
    };
    const result = applyAttackerUpgrades(
      config,
      ['heavy-weapon-agent-kallus'],
      AttackType.Ranged,
      unitBaseWeapons,  // includes E-11 (ranged)
    );
    // 4 base minis + 1 Kallus mini — Kallus uses a compatible weapon
    // (upgrade's ranged weapon if available, otherwise falls back to base E-11)
    expect(result.weapons).toHaveLength(5);
    // Kallus should NOT be excluded from the pool — he still contributes a weapon
  });

  it('sidearm does not affect other minis in the unit', () => {
    // Sidearm is per-miniature — base minis are unaffected
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],
    };
    const result = applyAttackerUpgrades(
      config,
      ['heavy-weapon-agent-kallus'],
      AttackType.Ranged,
      unitBaseWeapons,
    );
    // Base minis still use E-11 — sidearm only affects the Kallus mini
    const baseMiniWeapons = result.weapons.slice(0, 4);
    expect(baseMiniWeapons.every(w => w.name === 'E-11')).toBe(true);
  });

  it('squad personnel adds 2 weapon entries', () => {
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],
    };
    const result = applyAttackerUpgrades(
      config,
      ['personnel-stormtrooper-squad'],  // addsMiniature: 2
      AttackType.Ranged,
    );
    expect(result.weapons).toHaveLength(6);
  });

  it('heavy weapon + personnel both add minis', () => {
    const config = {
      unitCost: 44,
      weapons: [e11(), e11(), e11(), e11()],  // 4 base
    };
    const result = applyAttackerUpgrades(
      config,
      ['heavy-weapon-dlt-19-stormtrooper', 'personnel-stormtrooper'],
      AttackType.Ranged,
    );
    // 4 base + 1 heavy + 1 personnel = 6 total
    expect(result.weapons).toHaveLength(6);
  });
});
```

**Dynamic upgrade slot tests (store-level):**

```ts
describe('dynamic upgrade bar', () => {
  it('equipping upgrade with addsUpgradeSlot adds slots to effectiveUpgradeBar', () => {
    // Setup: load preset with base upgrade bar
    store.loadPreset('stormtroopers', profile, [
      UpgradeSlot.HeavyWeapon, UpgradeSlot.Personnel,
      UpgradeSlot.Gear, UpgradeSlot.Grenades,
    ]);
    // Equip Agent Kallus (adds HeavyWeapon slot)
    store.equipUpgrade(0, 'heavy-weapon-agent-kallus');
    expect(store.effectiveUpgradeBar).toHaveLength(5);
    expect(store.effectiveUpgradeBar[4].slot).toBe(UpgradeSlot.HeavyWeapon);
    expect(store.effectiveUpgradeBar[4].source).toBe('heavy-weapon-agent-kallus');
    // Base slots have null source
    expect(store.effectiveUpgradeBar[0].source).toBeNull();
  });

  it('unequipping source upgrade removes dynamic slots', () => {
    store.loadPreset('stormtroopers', profile, [
      UpgradeSlot.HeavyWeapon, UpgradeSlot.Personnel,
    ]);
    store.equipUpgrade(0, 'heavy-weapon-agent-kallus');
    expect(store.effectiveUpgradeBar).toHaveLength(3);
    // Unequip
    store.equipUpgrade(0, null);
    expect(store.effectiveUpgradeBar).toHaveLength(2);
  });

  it('cascade: unequipping source clears upgrade equipped in dynamic slot', () => {
    store.loadPreset('stormtroopers', profile, [
      UpgradeSlot.HeavyWeapon, UpgradeSlot.Personnel,
    ]);
    // Equip Kallus (adds dynamic Heavy Weapon slot at index 2)
    store.equipUpgrade(0, 'heavy-weapon-agent-kallus');
    expect(store.effectiveUpgradeBar).toHaveLength(3);
    // Equip DLT-19 in the dynamic slot (index 2)
    store.equipUpgrade(2, 'heavy-weapon-dlt-19-stormtrooper');
    expect(store.equippedUpgradeIds[2]).toBe('heavy-weapon-dlt-19-stormtrooper');
    // Unequip Kallus → dynamic slot removed → DLT-19 should be cleared
    store.equipUpgrade(0, null);
    expect(store.effectiveUpgradeBar).toHaveLength(2);
    expect(store.equippedUpgradeIds).toHaveLength(2);
    // The DLT-19 that was in the dynamic slot should no longer be in equippedUpgradeIds
    expect(store.equippedUpgradeIds).not.toContain('heavy-weapon-dlt-19-stormtrooper');
  });
});
```

**Verify:**
- All tests pass
- Edge cases covered: noncombatant, single grenade dedup, multiple different grenades each contribute once, per-mini sidearm behavior, all-upgrade-weapons selection, squad personnel

---

### Step 5.6H.3 — Preset Generator Tests

**File:** `src/data/__tests__/presetGenerator.test.ts` (update existing tests)

Update to verify multi-mini preset generation:

```ts
it('multi-mini units produce presets with expanded weapons', () => {
  const { attackerPresets } = generateAllPresets();
  const deathTroopers = attackerPresets.find(p =>
    p.id.includes('imperial-death-troopers')
  );
  expect(deathTroopers).toBeDefined();
  if (deathTroopers) {
    // Death Troopers have 4 minis — weapons should have 4 entries
    expect(deathTroopers.profile.weapons?.length).toBe(4);
    expect(deathTroopers.profile.baseMiniatureCount).toBe(4);
  }
});

it('single-mini units still produce one weapon per preset', () => {
  const { attackerPresets } = generateAllPresets();
  const vader = attackerPresets.filter(p =>
    p.id.includes('darth-vader')
  );
  // Vader has multiple weapons but figures=1 → separate presets
  expect(vader.length).toBeGreaterThanOrEqual(1);
  for (const preset of vader) {
    expect(preset.profile.weapons?.length).toBe(1);
  }
});
```

**Verify:**
- Multi-mini preset tests pass
- Single-mini preset tests remain correct
- Existing tests updated if needed for new preset structure

---

### Step 5.6H.4 — Data Layer Tests

**File:** `src/data/__tests__/unitResolver.test.ts` (add test cases)

```ts
it('applies miniatureCount enrichment override', () => {
  const deathTroopers = getResolvedUnitById('imperial-death-troopers');
  expect(deathTroopers).toBeDefined();
  expect(deathTroopers!.figures).toBe(4);
});

it('falls back to API figures when miniatureCount is absent', () => {
  // A unit that has API figures > 1 but no enrichment miniatureCount
  const units = getAllResolvedUnits();
  const multiMini = units.find(u => 
    !UNIT_ENRICHMENTS[u.id]?.miniatureCount && u.figures > 1
  );
  if (multiMini) {
    expect(multiMini.figures).toBeGreaterThan(1);
  }
});
```

**File:** `src/data/__tests__/upgradeResolver.test.ts` (add test cases)

```ts
it('resolves weapons on upgrade enrichments', () => {
  const dlt19d = getResolvedUpgradeById('heavy-weapon-dlt-19d-trooper');
  expect(dlt19d).toBeDefined();
  expect(dlt19d!.weapons.length).toBeGreaterThan(0);
});

it('resolves addsMiniature for personnel upgrades', () => {
  const stormtrooper = getResolvedUpgradeById('personnel-stormtrooper');
  if (stormtrooper) {
    expect(stormtrooper.addsMiniature).toBe(1);
  }
});

it('resolves noncombatant flag', () => {
  const medDroid = getResolvedUpgradeById('personnel-2-1b-medical-droid');
  if (medDroid) {
    expect(medDroid.noncombatant).toBe(true);
  }
});

it('resolves isGrenade flag', () => {
  const grenades = getResolvedUpgradeById('grenades-impact-grenades');
  if (grenades) {
    expect(grenades.isGrenade).toBe(true);
  }
});

it('resolves addsUpgradeSlot', () => {
  const kallus = getResolvedUpgradeById('heavy-weapon-agent-kallus');
  if (kallus) {
    expect(kallus.addsUpgradeSlot).toContain(UpgradeSlot.HeavyWeapon);
  }
});

it('applies implicit addsMiniature for heavy weapon slot', () => {
  const dlt19 = getResolvedUpgradeById('heavy-weapon-dlt-19-stormtrooper');
  if (dlt19) {
    // Heavy Weapon slot defaults to addsMiniature=1 even without enrichment
    expect(dlt19.addsMiniature).toBe(1);
  }
});

it('applies implicit addsMiniature for squad leader slot', () => {
  const captain = getResolvedUpgradeById('squad-leader-clone-captain');
  if (captain) {
    expect(captain.addsMiniature).toBe(1);
  }
});
```

**Verify:**
- All tests pass
- `npm run test` succeeds

---

## Verification Checklist

After completing all steps, confirm:

| Check | Command / Action |
|-------|-----------------|
| TypeScript compiles | `npm run typecheck` passes with 0 errors |
| Lint passes | `npm run lint` passes with 0 errors |
| Existing tests pass | `npm run test` passes with 0 failures |
| Pre-existing type errors resolved | No more errors on `miniatures`, `weapons` in enrichments |
| Multi-mini presets correct | Stormtroopers preset has 4× E-11 in weapons[] (base minis only) |
| Heavy weapon add works | Equip DLT-19 → 5th weapon entry added (4 base + 1 heavy) |
| Personnel add works | Equip Stormtrooper personnel → 6th weapon entry added |
| Squad leader add works | Equip squad leader → additional weapon entry added |
| Noncombatant works | Equip 2-1B → no weapon added, cost added |
| Grenade per-instance dedup works | Impact Grenades → exactly 1 grenade entry in pool; Impact + Concussion → 2 entries |
| Sidearm per-mini behavior works | Agent Kallus still contributes in non-enforced mode; sidearm only restricts Kallus mini when enforced |
| All upgrade weapons considered | Multi-profile upgrade selects correct weapon for attack type (not hardcoded to `weapons[0]`) |
| Keyword stacking works | 4× Impact 1 = Impact 4 in aggregated keywords |
| miniatureCount override works | Death Troopers → figures=4, Bad Batch → figures=4 |
| Counterpart slot recognized | UpgradeSlot.Counterpart exists in enum |
| Arsenal slice removed | getWeaponsForAttackType no longer slices to Arsenal limit |
| Implicit addsMiniature works | Heavy weapons resolve addsMiniature=1 without explicit enrichment |
| addsUpgradeSlot works | Agent Kallus equip → new Heavy Weapon slot appears in UI |
| Dynamic slot unequip works | Unequipping source upgrade removes dynamic slot and its equipped upgrade |
| UI renders correctly | WeaponAssignmentPanel shows correct rows with dynamic upgrade slots |

---

## Files Modified

| File | Change |
|------|--------|
| `src/engine/types.ts` | Add `sidearmMelee`, `sidearmRanged` to `WeaponKeywords` |
| `src/engine/attackPool.ts` | Remove Arsenal slice from `getWeaponsForAttackType`; add sidearm filtering |
| `src/data/types.ts` | Add `Counterpart` to `UpgradeSlot`; extend `ResolvedUpgrade` with `weapons`, `addsMiniature`, `noncombatant`, `isGrenade`, `addsUpgradeSlot` |
| `src/data/enrichment/types.ts` | Add `miniatureCount` to `UnitEnrichment`; add `weapons`, `addsMiniature`, `noncombatant`, `isGrenade`, `addsUpgradeSlot` to `UpgradeEnrichment` |
| `src/data/enrichment/units.ts` | Rename `miniatures` → `miniatureCount`; add `miniatureCount` and weapons to corps units |
| `src/data/enrichment/upgrades.ts` | Add `addsMiniature`, `noncombatant`, `isGrenade`, `addsUpgradeSlot`, and weapon data to personnel/heavy/grenade/squad-leader upgrades |
| `src/data/unitResolver.ts` | Apply `miniatureCount` enrichment override: `enrichment?.miniatureCount ?? processed.figures ?? 1` |
| `src/data/upgradeResolver.ts` | Resolve `weapons`, `addsMiniature` (with slot-based defaults), `noncombatant`, `isGrenade`, `addsUpgradeSlot` from enrichment |
| `src/data/presetGenerator.ts` | Mode-aware multi-mini preset generation; `baseMiniatureCount` + `unitBaseWeapons` on presets |
| `src/data/upgradeApplicator.ts` | Weapon array manipulation: heavy/personnel/squad add, grenade dedup, per-mini sidearm handling, all-upgrade-weapons selection, noncombatant, per-mini ownership |
| `src/data/presets.ts` | Add `baseMiniatureCount` and `unitBaseWeapons` to `AttackerPresetProfile` |
| `src/stores/attackConfigStore.ts` | Add `baseMiniatureCount`, `unitBaseWeapons`, `effectiveUpgradeBar` fields; dynamic upgrade bar recomputation on `equipUpgrade`; `loadPreset` update; exclude non-engine state from config selector |
| `src/stores/configSelectors.ts` | Pass `attackType` and `unitBaseWeapons` to `applyAttackerUpgrades` |

## Files Created

| File | Purpose |
|------|---------|
| `src/components/AttackerPanel/WeaponAssignmentPanel.tsx` | Per-miniature weapon assignment UI component |
| `src/components/AttackerPanel/PoolSummary.tsx` | Aggregated attack pool summary display |

## Files Updated (Tests)

| File | Change |
|------|--------|
| `src/engine/attackPool.test.ts` | Add multi-mini pool, sidearm filter, keyword stacking tests |
| `src/data/__tests__/upgradeApplicator.test.ts` | Add weapon assembly tests (heavy/personnel/squad adds, grenade dedup, noncombatant, per-mini sidearm, all-upgrade-weapons) |
| `src/data/__tests__/presetGenerator.test.ts` | Update for multi-mini preset expectations |
| `src/data/__tests__/unitResolver.test.ts` | Add `miniatureCount` override tests |
| `src/data/__tests__/upgradeResolver.test.ts` | Add weapons/addsMiniature/noncombatant/isGrenade resolution tests |

---

## Dependency Graph

```
Phase 5.5 (existing)
  UnitEnrichment, UpgradeEnrichment, resolvers,
  presetGenerator, upgradeApplicator, stores
       │
       ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Phase 5.6                                  │
│                                                                   │
│  5.6A.1  Add sidearm to WeaponKeywords (engine/types.ts)         │
│  5.6A.2  Update getWeaponsForAttackType (engine/attackPool.ts)   │
│  5.6A.3  Add Counterpart to UpgradeSlot (data/types.ts)          │
│           │                                                       │
│           ▼                                                       │
│  5.6B.1  Add miniatureCount to UnitEnrichment                    │
│  5.6B.2  Extend UpgradeEnrichment (weapons, addsMini, etc.)     │
│  5.6B.3  Extend ResolvedUpgrade type                             │
│  5.6B.4  Add baseMiniatureCount + unitBaseWeapons to preset type │
│           │                                                       │
│           ▼                                                       │
│  5.6C.1  Unit resolver: miniatureCount override     ─────┐       │
│  5.6C.2  Upgrade resolver: weapons + flags          ─────┘       │
│           │                                                       │
│           ▼                                                       │
│        [Manual Task: populate enrichment data]                    │
│           │                                                       │
│           ▼                                                       │
│  5.6D.1  Preset generator: single preset per unit, mode-aware    │
│           │                                                       │
│           ▼                                                       │
│  5.6E.1  Upgrade applicator: per-mini weapon assembly            │
│  5.6E.2  Wire attackType + unitBaseWeapons thru config selectors │
│           │                                                       │
│           ▼                                                       │
│  5.6F.1  Store: baseMiniatureCount, unitBaseWeapons, dyn slots   │
│           │                                                       │
│           ▼                                                       │
│  5.6G.1  WeaponAssignmentPanel (UI)                              │
│  5.6G.2  PoolSummary (UI)                                        │
│  5.6G.3  Custom Pool mini count indicator                        │
│           │                                                       │
│           ▼                                                       │
│  5.6H.1  Engine tests (multi-mini pool, sidearm)                 │
│  5.6H.2  Upgrade applicator tests                                │
│  5.6H.3  Preset generator tests                                  │
│  5.6H.4  Data layer tests (resolver, enrichment)                 │
└───────────────────────────────────────────────────────────────────┘
       │
       ▼
Phase 6 (UI Panels)
  AttackerPanel integration with
  WeaponAssignmentPanel, PoolSummary
```

**Implementation Order:**

1. **5.6A.1–A.3** — Engine + data type changes (no dependencies between them; can be done in parallel)
2. **5.6B.1–B.4** — Enrichment + preset type extensions (depend on A.1 for sidearm keywords)
3. **5.6C.1–C.2** — Resolver updates (depend on B.1–B.3)
4. **Manual Task** — Populate enrichment data files with miniatureCount, weapons, flags (human task, depends on B.1–B.2 for types)
5. **5.6D.1** — Preset generator rewrite (depends on C.1 for miniatureCount on ResolvedUnit; depends on enrichment data being populated)
6. **5.6E.1–E.2** — Upgrade applicator + config selectors (depends on C.2 for ResolvedUpgrade weapons)
7. **5.6F.1** — Store changes (depends on B.4 for AttackerPresetProfile, E.2 for selector wiring)
8. **5.6G.1–G.3** — UI components (depends on F.1 for store state; E.1 for applicator)
9. **5.6H.1–H.4** — Tests (can be written alongside each step but verified at the end)

**Parallelism:** Steps A.1/A.2/A.3 are independent. Steps B.1/B.2/B.3/B.4 are independent. Steps C.1/C.2 are independent. Steps E.1/E.2 are closely related. Steps H.1–H.4 are independent but should be run together after all implementation.

---

## Architecture Decisions

### Arsenal X + Multi-Mini: Not Handled (Doesn't Exist)

No unit in Star Wars: Legion has both Arsenal X and multiple miniatures. All Arsenal X units are single-figure vehicles or heroes. This means:
- We do not need per-miniature multi-weapon selection dropdowns
- Each miniature contributes exactly 1 weapon (default Arsenal 1)
- The Arsenal X logic in the engine can be simplified to not interact with multi-mini pools

If a future game update introduced such a unit, the required changes would be:
1. Per-miniature weapon assignment UI with multi-select (up to Arsenal X weapons per mini)
2. Upstream enforcement in the preset generator / upgrade applicator
3. Changes to `getWeaponsForAttackType` to handle the per-mini limit

### Counterpart: Deferred

Counterpart upgrades (C-3PO, Grogu, ID10 Seeker Droid, Omega) are a special case of adding a miniature to a unit. Key differences from personnel upgrades:
- Counterpart miniature may only use weapons on its own card (not the unit card)
- Keywords merge (unit + counterpart card keywords)
- If counterpart is defeated, unit loses counterpart card keywords/effects
- Wound threshold is separate for counterpart vs. non-counterpart minis

In this phase we only add `Counterpart` to the `UpgradeSlot` enum. Full modeling requires:
- A `CounterpartEnrichment` type with its own weapons, keywords, wound threshold
- Counterpart-specific weapon restriction in the attack pool builder
- Counterpart defeat state tracking in the store
- UI for counterpart weapon assignment (locked to its own weapons)

These are deferred to a future phase.

### `miniatureCount` vs. `figures`

The API field is called `figures`. The enrichment field is called `miniatureCount` to:
1. Clearly distinguish the enrichment override from the raw API field
2. Use domain-appropriate terminology ("miniatures" is the SWL term)
3. Avoid confusion when both values exist with different meanings

The `ResolvedUnit.figures` field retains its name for backward compatibility. Its value comes from `enrichment.miniatureCount ?? processed.figures ?? 1`.

### Keyword Stacking: Already Correct

The existing `aggregateWeaponKeywords` function correctly handles the repeated-entries model:
- Numeric keywords (Pierce, Impact, Critical, Lethal, Ram): **summed** across all entries
- Boolean OR keywords (Blast, Suppressive): **any weapon has it → pool has it**
- Boolean AND keywords (High Velocity): **all weapons must have it**
- Per-weapon keywords (Spray, Cumbersome, Anti-Materiel, Anti-Personnel): **not aggregated** — applied during pool formation per-weapon

4× E-11D (Impact 1 each) correctly produces Impact 4 in the aggregated keywords. No deduplication. No grouping by weapon name. Each entry contributes independently.

### `formAttackPool`: Unchanged

The existing `formAttackPool` iterates all entries in `weapons[]`, summing dice per entry. Each repeated entry contributes independently. The Spray multiplier applies per-weapon. No changes needed.

### Heavy Weapon Addition Model

When a heavy weapon upgrade is equipped, it **adds** a new miniature to the unit. The heavy weapon specialist is an additional mini that contributes its heavy weapon to the attack pool alongside the base minis. This matches the tabletop game where equipping a DLT-19 Stormtrooper adds a 5th miniature to a 4-mini Stormtrooper squad.

Example: Stormtroopers (4× E-11) + DLT-19 Heavy → [E-11, E-11, E-11, E-11, DLT-19] (5 minis total)

The implicit `addsMiniature: 1` default for Heavy Weapon slots handles this automatically — no explicit enrichment is needed for standard heavy weapons. The upgrade applicator simply pushes the heavy weapon's weapon entry onto the `weapons[]` array.

### Implicit `addsMiniature` by Slot Type

Rather than requiring every Heavy Weapon, Personnel, and Squad Leader upgrade to explicitly set `addsMiniature: 1`, the resolver applies slot-based defaults:

| Slot Type | Default `addsMiniature` | Override Examples |
|-----------|:-:|---|
| Heavy Weapon | 1 | — (standard behavior) |
| Personnel | 1 | `addsMiniature: 2` for squad personnel |
| Squad Leader | 1 | — (standard behavior) |
| All other slots | 0 | — |

This reduces enrichment boilerplate while allowing overrides where needed. If an upgrade claims to be in a slot that normally adds a mini but does NOT add one, set `addsMiniature: 0` explicitly in the enrichment.

### Dynamic Upgrade Slots (`addsUpgradeSlot`)

Some upgrades add additional upgrade slots to the unit when equipped. For example:
- **Agent Kallus** (Heavy Weapon) → adds a Heavy Weapon slot
- **Stormtrooper Captain** (Personnel) → adds a Training slot
- **Rebel Trooper Captain** (Personnel) → adds a Training slot

This is modeled via the `addsUpgradeSlot: UpgradeSlot[]` field on `UpgradeEnrichment`/`ResolvedUpgrade`. When the store processes an `equipUpgrade` action, it recomputes the `effectiveUpgradeBar` by combining the base upgrade bar with dynamically-added slots from all currently-equipped upgrades.

**UI impact:** The upgrade section renders from `effectiveUpgradeBar`, not `upgradeBar`. Dynamic slots appear below the base slots with a visual indicator of which upgrade provided them. Unequipping the source upgrade cascades — the dynamic slot(s) are removed along with any upgrades equipped in them.

### Personnel Weapon Strategy

When a combatant personnel upgrade is equipped, the upgrade applicator uses `selectWeaponForUpgradeMini()` to determine the weapon for that personnel miniature:

1. **If the upgrade has its own weapon(s):** The selection helper picks the best weapon from the upgrade's `weapons[]` based on sidearm rules and attack type compatibility.
2. **If the upgrade has no weapon data but `addsMiniature > 0`:** A copy of the unit's base weapon (from `unitBaseWeapons`, filtered to current attack type) is used. This models generic personnel using the unit's standard weapon.
3. **Sidearm enforcement applies per-miniature:** If the upgrade's weapon has `sidearmRanged` and the attack type is `Ranged`, the mini MUST use that weapon. If the attack type is `Melee`, the sidearm restriction is not enforced and the mini falls back to any compatible weapon from `unitBaseWeapons`.

When a noncombatant personnel upgrade is equipped:
- No weapon is added to the pool (Noncombatant keyword prevents weapon contribution)
- Cost and any keywords are still applied

### Per-Miniature Weapon Ownership

Weapons have explicit ownership at the miniature level:

- **Base miniatures** use weapons from the unit card only (`unitBaseWeapons`, filtered to current attack type).
- **Upgrade miniatures** (heavy weapon, personnel, squad leader) primarily use weapons from their own upgrade card. These weapons are exclusive to that miniature — no other mini in the unit can use them.
- **Fallback:** When an upgrade miniature's own weapons are not compatible with the current attack type (e.g., a ranged-only heavy weapon during a melee attack), the mini falls back to the unit's base weapons. Example: the DLT-19 Heavy mini contributes "Unarmed" in melee because the DLT-19 is ranged-only.
- **No cross-assignment:** Base minis never use upgrade-specific weapons, and upgrade minis never use other upgrade minis' weapons.

This model ensures that each weapon entry in the final `weapons[]` array is correctly attributed to exactly one miniature, matching the tabletop game's per-miniature weapon selection rules.

### Sidearm Handling (Per-Miniature Restriction)

Sidearm is a **per-miniature** restriction, not a global pool filter:

- **When enforced** (sidearm type matches attack type): The miniature that has/is-equipped-with the sidearm weapon MUST use that weapon. It cannot contribute any other weapon to the attack pool.
- **When NOT enforced** (sidearm type does not match attack type): The miniature is free to use any compatible weapon available to it, including the unit's base weapons.

This means sidearm never removes a miniature from the attack — it only constrains which weapon that specific miniature contributes. The `selectWeaponForUpgradeMini()` helper in the upgrade applicator handles all 4 sidearm cases (see Step 5.6E.1).

The engine's `getWeaponsForAttackType` retains a sidearm safety net filter as a backstop against malformed configs, but primary sidearm handling is upstream in the upgrade applicator.

### Squad Personnel (addsMiniature: 2)

Some personnel upgrades add 2 miniatures (e.g., "B1 Battle Droid Squad", "Rebel Trooper Squad"). The `addsMiniature` field is a number, not boolean, to support this. `addsMiniature: 2` adds 2 weapon entries.

### Unarmed Melee Fallback

Per SWL rules, every trooper miniature has an implicit Unarmed melee weapon (1 black die, no keywords). When a unit with only ranged weapons attacks in Melee, each miniature should contribute an Unarmed weapon entry rather than producing an empty attack pool.

**Enrichment requirement:** All trooper unit enrichments must include an Unarmed weapon in their `weapons` array:
```ts
{
  name: 'Unarmed',
  weaponType: AttackType.Melee,
  blackDice: 1,
  keywords: {},
}
```

This is included in the `unitBaseWeapons` stored on presets and passed to the upgrade applicator. When the attack type is Melee and a miniature (base or upgrade) has no melee-compatible weapon of its own, the applicator falls back to the unit's base weapons — which includes Unarmed.

**Engine-level safety net:** If `getWeaponsForAttackType` returns an empty array (no weapons compatible with the attack type), the engine should skip the attack entirely (0 pool dice → 0 wounds). This already happens naturally — `formAttackPool` produces 0 dice when `weapons[]` is empty.

**Custom Pool mode:** Users manually configure weapons, so Unarmed is not auto-injected. If they set 0 dice in Custom Pool for a melee attack, the results panel shows the "No Results Yet" empty state.

**Impact on enrichment data population (Manual Task):** When enriching trooper units, always include an Unarmed weapon profile alongside the unit's card weapons. Vehicle units do not have Unarmed.