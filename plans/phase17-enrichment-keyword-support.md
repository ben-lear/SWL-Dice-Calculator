# Phase 17 — Enrichment Keyword Support & TODO Resolution

## Problem

The enrichment files (`src/data/enrichment/upgrades.ts`, `src/data/enrichment/units.ts`) contain **10 TODO comments** and **~18 keyword references** that are not defined in the typed keyword interfaces. These break TypeScript's type safety — keywords that could affect combat math are stored as untyped properties, and the `surgeOverrides` pipeline is incomplete (data is resolved but never consumed by the engine config).

This phase resolves all outstanding enrichment type errors and implements the engine/applicator changes needed to make combat-affecting keywords functional.

## Scope

- **Type system fixes** — add missing display-only keywords to `DisplayUnitKeywords` / `DisplayWeaponKeywords`
- **Type bug fixes** — fix `guidance` type, add `surgeHit` to `surgeOverrides`, remove unused import
- **Applicator pipeline** — wire `surgeOverrides` consumption into the upgrade applicator so that `surgeCrit`, `meleeSurgeCrit`, `meleeSurgeBlock`, and `surgeHit` actually modify engine surge charts
- **Simple engine-mappable keywords** — implement `combatArmor` (defense die override), `duckAndCover` (+1 suppression), `missionObjective` (+1 observation token)
- **New engine features** — `katarnPatternArmor` (wound cap), `defeatedMinis` input for `blackOps`/`krakenBlaster`, `saberThrow` (dynamic weapon), `frenziedGunner` (random pool formation)
- **Tests** — unit tests for every engine-affecting change
- **Cleanup** — resolve all TODOs in enrichment files

## Architecture

```
 ┌──────────────────────────────────────────────────────┐
 │              Enrichment Data Layer                    │
 │  upgrades.ts / units.ts / types.ts / keywordTypes.ts │
 └───────────────┬──────────────────────────────────────┘
                 │ enrichment → ResolvedUpgrade
                 ▼
 ┌──────────────────────────────────────────────────────┐
 │           Upgrade Resolver & Applicator              │
 │  upgradeResolver.ts → upgradeApplicator.ts           │
 │  defenseUpgradeApplicator.ts                         │
 │  ─────────────────────────────────────────────       │
 │  Surge overrides → surgeChart changes                │
 │  Defense overrides → dieColor/surgeChart changes     │
 │  Keyword → config field mapping                      │
 └───────────────┬──────────────────────────────────────┘
                 │ AttackerConfig / DefenderConfig
                 ▼
 ┌──────────────────────────────────────────────────────┐
 │              Combat Engine                           │
 │  attackPool.ts   (pool formation, defeated minis)    │
 │  compareResults.ts (wound cap for Katarn Armor)      │
 │  types.ts        (new config fields)                 │
 └──────────────────────────────────────────────────────┘
```

## Inventory of All Issues

### Source: `src/data/enrichment/upgrades.ts`

| # | Keyword / Issue | Line(s) | Category | Status |
|---|---|---|---|---|
| 1 | `saberThrow` — undefined weapon keyword | L977 | Engine Feature | TODO |
| 2 | `combatArmor` — undefined unit keyword | L1014 | Applicator | TODO |
| 3 | `katarnPatternArmor` — undefined unit keyword | L1074 | Engine Feature | TODO |
| 4 | `blackOps` — undefined weapon keyword | L1799 | Engine Feature | TODO |
| 5 | `krakenBlaster` — undefined weapon keyword | L2216, L2233 | Engine Feature | TODO |
| 6 | `cacheSurgeX` — undefined unit keyword | L2283, L2863 | Type-Only | — |
| 7 | `noncombatant` — undefined unit keyword | L2855+6 more | Type-Only | — |
| 8 | `treatXCapacity2` — undefined unit keyword | L2856, L2961, L2997 | Type-Only | — |
| 9 | `repairXCapacity2` — undefined unit keyword | L2870, L2877, L3036, L3056 | Type-Only | — |
| 10 | `repairXCapacity1` — undefined unit keyword | L1855, L2926 | Type-Only | — |
| 11 | `treatXCapacity1` — undefined unit keyword | L3520 | Type-Only | — |
| 12 | `independentSurgeX` — undefined unit keyword | L2914, L3042 | Type-Only | — |
| 13 | `independentDodgeX` — undefined unit keyword | L3461 | Type-Only | — |
| 14 | `frenziedGunner` — undefined unit keyword | L3223 | Engine Feature | TODO |
| 15 | `surgeHit` — not in `surgeOverrides` type | L3260 | Type Bug | — |
| 16 | `duckAndCover` — undefined unit keyword | L3574 | Applicator | TODO |
| 17 | `missionObjective` — undefined unit keyword | L3646 | Applicator | TODO |
| 18 | `guidance` — typed `boolean`, used as `string` | L3639 | Type Bug | — |
| 19 | Unused import `createMinimalAttacker` | L11 | Cleanup | — |

### Source: `src/data/enrichment/units.ts`

| # | Keyword / Issue | Line(s) | Category |
|---|---|---|---|
| 20 | `repairXCapacity2` — undefined unit keyword | L341 | Type-Only |

### Source: Pipeline gap

| # | Issue | Location | Category |
|---|---|---|---|
| 21 | `surgeOverrides` resolved but never consumed | `upgradeApplicator.ts`, `configSelectors.ts` | Applicator |

---

## Step 1 — Type-Only Keyword Additions (display/tagging)

**Goal:** Eliminate all type errors for keywords that don't affect engine math.

**File:** `src/data/enrichment/keywordTypes.ts`

### 1a. Add to `DisplayUnitKeywords`

```typescript
// Compound non-combat keywords
noncombatant?: boolean;
repairXCapacity1?: EnrichmentNumericValue;
repairXCapacity2?: EnrichmentNumericValue;
treatXCapacity1?: EnrichmentNumericValue;
treatXCapacity2?: EnrichmentNumericValue;

// Token generation keywords
cacheSurgeX?: EnrichmentNumericValue;
independentSurgeX?: EnrichmentNumericValue;
independentDodgeX?: EnrichmentNumericValue;
```

**Rationale:** These keywords represent non-combat actions (Repair, Treat) or pre-activation token generation. The calculator cannot model them as combat math — they generate tokens or perform actions outside the attack sequence. However, they serve as display tags and could in the future auto-populate token inputs.

> **Open question for `noncombatant`:** The existing `noncombatantKeyword?: boolean` in `DisplayUnitKeywords` (L208) was meant to serve this role. The 7 enrichment entries use `noncombatant` (without the `Keyword` suffix). Options:
> - **Option A:** Add `noncombatant` as a new field (low churn, accepts data as-is)
> - **Option B:** Rename all 7 enrichment entries to `noncombatantKeyword` (more correct, matches existing field)
> - **Recommended:** Option A — the `noncombatant` field on enrichment is semantically distinct from the display tag `noncombatantKeyword`. The enrichment `noncombatant` is consumed by the applicator to suppress weapon contribution; `noncombatantKeyword` is purely a label.

### 1b. Fix `guidance` type

```diff
- guidance?: boolean;
+ guidance?: boolean | string;
```

**Rationale:** Guidance is a parameterized keyword (e.g., `Guidance: Corps Trooper`). Some upgrades use it as a boolean flag, others with a unit-type string like `'corps trooper'`. A union type supports both.

### 1c. Add combat-affecting keywords as display placeholders

These keywords will *also* be given engine support in later steps, but must be in the type system immediately so the enrichment data compiles.

```typescript
// In DisplayUnitKeywords:
combatArmor?: boolean;
katarnPatternArmor?: boolean;
frenziedGunner?: boolean;
duckAndCover?: boolean;
missionObjective?: boolean;
```

```typescript
// In DisplayWeaponKeywords:
saberThrow?: boolean;
blackOps?: boolean;
krakenBlaster?: boolean;
```

**Test:** `npm run typecheck` should drop the keyword-related errors.

---

## Step 2 — Type Bug Fixes

### 2a. Add `surgeHit` to `surgeOverrides` interface

**Files:** `src/data/enrichment/types.ts`, `src/data/types.ts`

```diff
  surgeOverrides?: {
    surgeCrit?: boolean;
    meleeSurgeCrit?: boolean;
    meleeSurgeBlock?: boolean;
+   surgeHit?: boolean;
  };
```

Both the enrichment type (`UpgradeEnrichment.surgeOverrides`) and the resolved type (`ResolvedUpgrade.surgeOverrides`) need the same addition.

**Rationale:** The `pilot-imperial-hammers-elite-armor-pilot` upgrade grants Surge → Hit, which is a distinct surge chart setting (`AttackSurgeChart.ToHit`) different from the default `ToCrit` that `surgeCrit` implies.

### 2b. Remove unused import

**File:** `src/data/enrichment/upgrades.ts`, line 11

Remove `createMinimalAttacker` from the import statement.

**Test:** `npm run typecheck` + `npm run lint` should now pass for the enrichment files.

---

## Step 3 — Wire `surgeOverrides` Consumption (Applicator Pipeline)

**Problem:** `surgeOverrides` are stored on `ResolvedUpgrade` objects but **never consumed**. The upgrade applicator (`upgradeApplicator.ts`) processes `keywords` but skips `surgeOverrides` entirely. The result is that upgrades like The Darksaber (Maul), Platoon Commander, and Imperial Hammers Elite Armor Pilot have no effect on surge charts.

**Files:**
- `src/data/upgradeApplicator.ts` — consume `surgeOverrides` from resolved upgrades
- `src/stores/configSelectors.ts` — ensure surge chart modifications propagate

### Implementation

In `upgradeApplicator.ts`, inside the `applyUpgrades` function, after the keyword application loop:

```typescript
// Apply surge overrides
if (upgrade.surgeOverrides) {
  if (upgrade.surgeOverrides.surgeCrit) {
    // Sets attack surge chart to Crit
    result['surgeChart'] = AttackSurgeChart.ToCrit;
  }
  if (upgrade.surgeOverrides.surgeHit) {
    // Sets attack surge chart to Hit
    result['surgeChart'] = AttackSurgeChart.ToHit;
  }
  if (upgrade.surgeOverrides.meleeSurgeCrit) {
    // Stored for conditional use — engine handles melee surge override
    result['meleeSurgeCrit'] = true;
  }
  if (upgrade.surgeOverrides.meleeSurgeBlock) {
    // Stored for conditional defense surge override
    result['meleeSurgeBlock'] = true;
  }
}
```

> **Note:** `meleeSurgeCrit` and `meleeSurgeBlock` are *conditional* — they only apply during melee attacks. The `configSelectors.ts` or engine callers would need to check `attackType === AttackType.Melee` and adjust `surgeChart` accordingly. This conditional application may already exist or may need to be added to `configSelectors.ts`.

### Defender-side surge overrides

`meleeSurgeBlock` affects the *defender's* surge chart (Defense Surge → Block when defending against melee). This needs to be handled in the defender upgrade applicator or in `configSelectors.ts`:

```typescript
if (attackType === AttackType.Melee && defender.meleeSurgeBlock) {
  defender.surgeChart = DefenseSurgeChart.ToBlock;
}
```

### Test

- Unit test: equip `armament-the-darksaber-maul` → verify `surgeChart` becomes `ToCrit`
- Unit test: equip `pilot-imperial-hammers-elite-armor-pilot` → verify `surgeChart` becomes `ToHit`
- Unit test: equip `doctrine-platoon-commander` → verify melee override flags are set

---

## Step 4 — `combatArmor` (Defense Die Override)

**Keyword:** `combatArmor` on `gear-combat-armor`
**Rule:** Override defender's `dieColor` to `DefenseDieColor.Red` and `surgeChart` to `DefenseSurgeChart.None`.

### Implementation

**Option A (Enrichment-driven):** Add a new field `defenseOverrides` to `UpgradeEnrichment`:

```typescript
// In src/data/enrichment/types.ts
defenseOverrides?: {
  dieColor?: DefenseDieColor;
  surgeChart?: DefenseSurgeChart;
};
```

Then in the enrichment entry:
```typescript
'gear-combat-armor': {
  defenseOverrides: {
    dieColor: DefenseDieColor.Red,
    surgeChart: DefenseSurgeChart.None,
  },
  keywords: {
    combatArmor: true,
  },
},
```

**Option B (Applicator hardcode):** Detect `combatArmor: true` in keywords and apply the override in the applicator.

**Recommended:** Option A — more maintainable and reusable for future upgrades with similar effects.

### Applicator change

In **both** `upgradeApplicator.ts` (attacker-side when attacker has this) and `defenseUpgradeApplicator.ts` (defender-side):

```typescript
if (upgrade.defenseOverrides) {
  if (upgrade.defenseOverrides.dieColor !== undefined) {
    result.dieColor = upgrade.defenseOverrides.dieColor;
  }
  if (upgrade.defenseOverrides.surgeChart !== undefined) {
    result.surgeChart = upgrade.defenseOverrides.surgeChart;
  }
}
```

### Files changed

| File | Change |
|---|---|
| `src/data/enrichment/types.ts` | Add `defenseOverrides` field |
| `src/data/types.ts` | Add `defenseOverrides` to `ResolvedUpgrade` |
| `src/data/upgradeResolver.ts` | Pass through `defenseOverrides` |
| `src/data/upgradeApplicator.ts` | Apply `defenseOverrides` to config |
| `src/stores/defenseUpgradeApplicator.ts` | Apply `defenseOverrides` to defender config |
| `src/data/enrichment/upgrades.ts` | Update `gear-combat-armor` enrichment entry; remove TODO |

### Test

- Equip `gear-combat-armor` on a white-die defender → verify `dieColor` becomes Red and `surgeChart` becomes None
- Verify `combatArmor: true` keyword still present for display

---

## Step 5 — `duckAndCover` (+1 Suppression Token)

**Keyword:** `duckAndCover` on `training-duck-and-cover`
**Rule:** Gain 1 suppression token at the start of the "Apply Dodge and Cover" step.

### Implementation

This is functionally equivalent to the defender always having +1 suppression when this upgrade is equipped. The suppression is gained *before* cover and Danger Sense are calculated, so it participates in both.

**In the applicator** (both attacker-side and defender-side):

When processing keywords, detect `duckAndCover: true` and increment `suppressionTokens`:

```typescript
// In upgradeApplicator.ts, inside the keyword loop
if (fieldName === 'duckAndCover' && kwValue === true) {
  const current = (result['suppressionTokens'] as number) ?? 0;
  result['suppressionTokens'] = current + 1;
  continue; // Don't set duckAndCover on the config — it's not an engine field
}
```

**Alternative:** Handle this as a special keyword in the applicator's post-loop section, similar to how `dugIn` is handled.

### Enrichment update

```typescript
'training-duck-and-cover': {
  keywords: {
    duckAndCover: true,
  },
},
```

Remove the TODO comment.

### Files changed

| File | Change |
|---|---|
| `src/data/upgradeApplicator.ts` | Special-case `duckAndCover` to +1 `suppressionTokens` |
| `src/stores/defenseUpgradeApplicator.ts` | Same special-case logic |
| `src/data/enrichment/upgrades.ts` | Remove TODO |

### Test

- Equip Duck and Cover on defender with 0 suppression → verify `suppressionTokens` becomes 1
- Equip Duck and Cover on defender with Danger Sense 3 → verify 1 extra suppression participates in Danger Sense

---

## Step 6 — `missionObjective` (+1 Observation Token)

**Keyword:** `missionObjective` on `training-mission-objective`
**Rule:** Exhaust to reroll 1 attack die during the reroll step.

### Implementation

This is functionally equivalent to +1 observation token. The exhaust mechanic is a game-state concern the calculator doesn't track — the user can toggle the keyword on/off to represent card availability.

**In the applicator:**

```typescript
if (fieldName === 'missionObjective' && kwValue === true) {
  const current = (result['observationTokens'] as number) ?? 0;
  result['observationTokens'] = current + 1;
  continue;
}
```

### Enrichment update

Remove the TODO comment from `training-mission-objective`.

### Files changed

| File | Change |
|---|---|
| `src/data/upgradeApplicator.ts` | Special-case `missionObjective` to +1 `observationTokens` |
| `src/data/enrichment/upgrades.ts` | Remove TODO |

### Test

- Equip Mission Objective on attacker with 0 observation tokens → verify `observationTokens` becomes 1

---

## Step 7 — `katarnPatternArmor` (Wound Cap)

**Keyword:** `katarnPatternArmor` on `gear-katarn-pattern-armor`
**Rule:** When this unit would suffer 1+ wounds from a non-melee attack, expend to suffer only 1 wound instead.

### Implementation

This requires a new engine-level field and a wound-capping step.

### 7a. Add to engine types

**File:** `src/engine/types.ts` — add to `DefenderConfig`:

```typescript
katarnPatternArmor: boolean;  // Expend: cap wounds to 1 from non-melee attacks
```

### 7b. Engine change

**File:** `src/engine/compareResults.ts`

After the final wound calculation, if `katarnPatternArmor` is true and attack type is not melee:

```typescript
if (defender.katarnPatternArmor && attackType !== AttackType.Melee) {
  totalWounds = Math.min(totalWounds, 1);
  mainTargetWoundsNoPierce = Math.min(mainTargetWoundsNoPierce, 1);
}
```

### 7c. Applicator change

Detect `katarnPatternArmor: true` in keywords and set `DefenderConfig.katarnPatternArmor = true`.

### 7d. Store defaults

Add `katarnPatternArmor: false` to the defender config defaults in `defenseConfigStore.ts`.

### Files changed

| File | Change |
|---|---|
| `src/engine/types.ts` | Add `katarnPatternArmor` to `DefenderConfig` |
| `src/engine/compareResults.ts` | Wound cap logic for non-melee |
| `src/stores/defenseConfigStore.ts` | Default `katarnPatternArmor: false` |
| `src/data/upgradeApplicator.ts` | Map keyword to config field |
| `src/stores/defenseUpgradeApplicator.ts` | Map keyword to config field |
| `src/data/enrichment/upgrades.ts` | Remove TODO |

### Test

- Ranged attack dealing 5 wounds with Katarn Armor → verify only 1 wound
- Melee attack dealing 5 wounds with Katarn Armor → verify 5 wounds (no cap)
- Ranged attack dealing 0 wounds with Katarn Armor → verify 0 wounds (no false trigger)

---

## Step 8 — `defeatedMinis` Input for `blackOps` and `krakenBlaster`

**Keywords:**
- `blackOps` on `heavy-weapon-cassian-andor` — +1 white die per defeated mini
- `krakenBlaster` on `heavy-weapon-kraken-*` — upgrade 1 die per defeated mini

### Implementation

These keywords require a new user input: the number of defeated miniatures in the attacking unit.

### 8a. New engine field

**File:** `src/engine/types.ts` — add to `AttackerConfig`:

```typescript
defeatedMinis: number;  // Number of destroyed minis in this unit (for Black Ops, Kraken, etc.)
```

### 8b. Pool formation changes

**File:** `src/engine/attackPool.ts`

After forming the base attack pool:

```typescript
// Black Ops: add 1 white die per defeated mini
if (weaponHasBlackOps) {
  for (let i = 0; i < config.defeatedMinis; i++) {
    pool.push(AttackDieColor.White);
  }
}

// Kraken's Blaster: upgrade 1 die per defeated mini
if (weaponHasKrakenBlaster) {
  for (let i = 0; i < config.defeatedMinis; i++) {
    upgradeDieInPool(pool); // white→black→red
  }
}
```

> **Note:** These are *weapon-level* keywords, not unit-level. The effect triggers only when that specific weapon is in the pool. This means `blackOps` and `krakenBlaster` need to be added to `WeaponKeywords` (engine) rather than just `DisplayWeaponKeywords`.

### 8c. Weapon keyword additions

**File:** `src/engine/types.ts` — add to `WeaponKeywords`:

```typescript
blackOps: boolean;        // +1 white die per defeated mini
krakenBlaster: boolean;   // Upgrade 1 die per defeated mini
```

Also add to `AggregatedWeaponKeywords` with OR aggregation.

### 8d. Store defaults

Add `defeatedMinis: 0` to attacker config defaults.

### 8e. UI control

A `NumberSpinner` for "Defeated Minis" shown conditionally when the unit has Black Ops or Kraken's Blaster weapons equipped. This would go in the Attacker Panel (Unit Builder view).

### 8f. Enrichment update

Move `blackOps` and `krakenBlaster` from `DisplayWeaponKeywords` (Step 1c) to `EnrichmentWeaponKeywords`, and remove the TODOs.

### Files changed

| File | Change |
|---|---|
| `src/engine/types.ts` | Add `defeatedMinis` to `AttackerConfig`; add `blackOps`, `krakenBlaster` to `WeaponKeywords` |
| `src/engine/attackPool.ts` | Pool formation logic for bonus dice / upgrades |
| `src/data/enrichment/keywordTypes.ts` | Move keywords to `EnrichmentWeaponKeywords` |
| `src/data/upgradeApplicator.ts` | Add to `WEAPON_KEYWORD_FIELDS` |
| `src/stores/attackConfigStore.ts` | Add `defeatedMinis` default |
| `src/components/AttackerPanel/` | UI control for defeated minis |
| `src/data/enrichment/upgrades.ts` | Remove TODOs |

### Test

- Black Ops weapon with 0 defeated minis → no change to pool
- Black Ops weapon with 3 defeated minis → 3 extra white dice
- Kraken's Blaster with 2 defeated minis → 2 die upgrades (white→black, black→red)

---

## Step 9 — `saberThrow` (User-Selected Melee Weapon)

**Keyword:** `saberThrow` on `force-saber-throw`
**Rule:** Saber Throw creates a Range 1–2 ranged weapon using half the dice (rounded up, keep best colors) of one of the unit's equipped melee weapons, plus all that melee weapon's keywords.

### Implementation

Rather than auto-selecting the "best" melee weapon (which involves opinionated heuristics), let the user choose which melee weapon Saber Throw copies. If the unit has only one melee weapon, auto-select it.

### 9a. Store state: selected source weapon

Add a new field to the attacker config store:

```typescript
// In attackConfigStore.ts state
saberThrowSourceWeapon: string | null;  // Name of the melee weapon Saber Throw copies
setSaberThrowSourceWeapon: (weaponName: string | null) => void;
```

This field is:
- Reset to `null` on preset load, upgrade change, or mode switch (same as `weaponMiniCounts`)
- Persisted per-session only (not saved to localStorage)

### 9b. Applicator-level weapon generation

Generate the Saber Throw weapon profile during upgrade application, using the user-selected melee weapon.

In `upgradeApplicator.ts`, after all upgrades have been applied and the full weapon list is assembled:

```typescript
// Find Saber Throw placeholder weapon
const saberThrowIndex = weapons.findIndex(w =>
  w.keywords.saberThrow === true
);

if (saberThrowIndex !== -1) {
  // Get all melee weapons in the pool (excluding Saber Throw itself)
  const meleeWeapons = weapons.filter(w =>
    w.weaponType === AttackType.Melee && w !== weapons[saberThrowIndex]
  );

  // Find the user-selected source weapon, or auto-select if only 1
  let sourceWeapon: WeaponProfile | undefined;
  if (meleeWeapons.length === 1) {
    sourceWeapon = meleeWeapons[0];
  } else if (saberThrowSourceWeapon) {
    sourceWeapon = meleeWeapons.find(w => w.name === saberThrowSourceWeapon);
  }

  if (sourceWeapon) {
    weapons[saberThrowIndex] = buildSaberThrowWeapon(sourceWeapon);
  }
  // If no source selected and multiple options exist, Saber Throw stays as a
  // 0-dice placeholder — the UI will prompt the user to select a source weapon.
}
```

### 9c. Helper function

```typescript
function buildSaberThrowWeapon(source: WeaponProfile): WeaponProfile {
  const totalDice = source.redDice + source.blackDice + source.whiteDice;
  const halfDice = Math.ceil(totalDice / 2);

  // Distribute halfDice keeping best colors: fill red first, then black, then white
  let remaining = halfDice;
  const redDice = Math.min(source.redDice, remaining);
  remaining -= redDice;
  const blackDice = Math.min(source.blackDice, remaining);
  remaining -= blackDice;
  const whiteDice = remaining; // whatever is left (capped by source.whiteDice implicitly)

  return {
    name: `Saber Throw`,
    weaponType: AttackType.Ranged,
    redDice,
    blackDice,
    whiteDice,
    keywords: {
      ...source.keywords,  // Copy all keywords from source melee weapon
      saberThrow: true,    // Keep saber throw marker for display
    },
  };
}
```

### 9d. Keyword type

Add `saberThrow` to `EnrichmentWeaponKeywords` as a boolean. Keep it out of the engine `WeaponKeywords` — the applicator reads enrichment weapon keywords before normalizing to engine format. Also add to `WEAPON_KEYWORD_FIELDS` set so it routes to weapon keywords, not unit config.

### 9e. UI — melee weapon selector on Saber Throw card

See the UI/UX section below (Step 9) for the full UI design.

### Files changed

| File | Change |
|---|---|
| `src/stores/attackConfigStore.ts` | Add `saberThrowSourceWeapon` state + setter; reset on preset/upgrade change |
| `src/data/upgradeApplicator.ts` | Saber Throw weapon generation with user-selected source |
| `src/data/enrichment/keywordTypes.ts` | Add `saberThrow` to `EnrichmentWeaponKeywords` |
| `src/data/enrichment/upgrades.ts` | Remove TODO |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Melee weapon selector dropdown on Saber Throw card |
| `src/hooks/useDisplayWeapons.ts` | Expose post-computation Saber Throw profile |

### Test

- Unit with 4R2W melee weapon (only one) + Saber Throw → auto-selected, becomes 3R ranged weapon
- Unit with 2B2W melee weapon + Saber Throw → becomes 1B1W ranged weapon (4 dice → 2, black first)
- Unit with 2 melee weapons + Saber Throw, no selection → Saber Throw shows 0 dice, selector prompts user
- Unit with 2 melee weapons + Saber Throw, user selects one → Saber Throw uses that weapon's dice/keywords
- Unit with no melee weapon + Saber Throw → Saber Throw contributes 0 dice, selector is empty/disabled
- Keywords (Pierce 2, etc.) copied from selected source melee weapon to Saber Throw
- Changing equipped upgrades resets source weapon selection

---

## Step 10 — `frenziedGunner` (Random Pool Formation)

**Keyword:** `frenziedGunner` on `pilot-frenzied-gunner`
**Rule:** Roll a red defense die during Form Attack Pool. Blank → +1 white attack die, Block → +1 black, Surge → +1 red.

### Implementation

This is a random effect during pool formation that the Monte Carlo simulator handles naturally but the deterministic pathway needs to approximate.

### 10a. Engine field

**File:** `src/engine/types.ts` — add to `AttackerConfig`:

```typescript
frenziedGunner: boolean;  // Roll red defense die to determine bonus attack die color
```

### 10b. Monte Carlo path

**File:** `src/engine/attackPool.ts`

During pool formation, when `frenziedGunner` is true:

```typescript
if (config.frenziedGunner) {
  // Roll a red defense die: blank(3/6), block(2/6), surge(1/6)
  const roll = rollDefenseDie(DefenseDieColor.Red);
  switch (roll) {
    case DefenseFace.Blank: pool.push(AttackDieColor.White); break;
    case DefenseFace.Block: pool.push(AttackDieColor.Black); break;
    case DefenseFace.Surge: pool.push(AttackDieColor.Red); break;
  }
}
```

### 10c. Deterministic path (expected value)

For the deterministic calculator, Frenzied Gunner adds expected dice:
- Red defense die probabilities: 3/6 blank, 2/6 block, 1/6 surge
- Expected hits contribution: 3/6 × E[white] + 2/6 × E[black] + 1/6 × E[red]

**Options:**
1. **Approximate as fractional dice** — add weighted fractional dice to the expected value calculation
2. **Enumerate all 3 outcomes** — compute 3 separate deterministic results and weight-average them
3. **Treat as a fixed die color** — use the most common outcome (white) as a conservative estimate

**Recommended:** Option 2 — enumerate all 3 outcomes with weights. This gives exact expected values.

### 10d. Store defaults

Add `frenziedGunner: false` to attacker config defaults.

### Files changed

| File | Change |
|---|---|
| `src/engine/types.ts` | Add `frenziedGunner` to `AttackerConfig` |
| `src/engine/attackPool.ts` | Random die addition in pool formation |
| `src/engine/attackSequence.ts` | Deterministic: branch on 3 outcomes |
| `src/stores/attackConfigStore.ts` | Default `frenziedGunner: false` |
| `src/data/enrichment/upgrades.ts` | Remove TODO |

### Test

- Monte Carlo: Frenzied Gunner → pool size is always exactly +1 die
- Monte Carlo: Over many iterations, ~50% white, ~33% black, ~17% red additions
- Deterministic: Result equals weighted average of the 3 branch outcomes

---

## Step 11 — `protocol-nanny-programming` TODO Resolution

**Keyword context:** `protocol-nanny-programming`
**Rule:** Unique effect to allow equipping Grogu (The Child, IG-11 loadout).

### Implementation

This is a **restriction/slot system** concern, not a combat math concern. Nanny Programming enables the equipping of a specific upgrade — it doesn't affect dice math.

**Action:** Remove or update the TODO to note this is a deckbuilding restriction, not a calculator concern. No engine change needed.

```typescript
'protocol-nanny-programming': {
  // Non-combat effect: enables equipping The Child (Grogu) upgrade.
  // Not modeled in the calculator — restriction-only.
  keywords: {
    ai: 'dodge, move'
  },
},
```

---

## Implementation Order & Dependencies

```
Step 1 (Types) ──────────┐
Step 2 (Type bugs) ──────┤ No dependencies
Step 11 (Nanny TODO) ────┘
         │
         ▼
Step 3 (surgeOverrides) ── depends on Step 2a (surgeHit type)
         │
         ▼
Step 4 (combatArmor) ──── depends on Step 1c (type), Step 3 pattern
Step 5 (duckAndCover) ─── depends on Step 1c (type)
Step 6 (missionObjective)─ depends on Step 1c (type)
         │
         ▼
Step 7 (katarnArmor) ──── depends on Step 1c (type); engine change
Step 8 (defeatedMinis) ── depends on Step 1c (type); engine change + UI
Step 9 (saberThrow) ───── depends on Step 1c (type); complex applicator
Step 10 (frenziedGunner)── depends on Step 1c (type); engine change
```

### Suggested Implementation Phases

**Phase 17a — Type fixes (Steps 1, 2, 11):**
Low risk, zero behavior change. Eliminates all type errors. ~1 session.

**Phase 17b — Surge override pipeline (Step 3):**
Wires existing data to the engine. Medium risk — needs careful testing with melee conditionals. ~1 session.

**Phase 17c — Simple applicator keywords (Steps 4, 5, 6):**
Maps enrichment keywords to existing engine fields. Low-medium risk. ~1 session.

**Phase 17d — Engine extensions (Steps 7, 8):**
New engine fields and combat logic. Medium risk. ~1–2 sessions.

**Phase 17e — Complex features (Steps 9, 10):**
Dynamic weapon generation and random pool formation. High complexity. ~2–3 sessions.

---

## Files Changed Summary

| File | Steps |
|---|---|
| `src/data/enrichment/keywordTypes.ts` | 1a, 1b, 1c, 8f |
| `src/data/enrichment/types.ts` | 2a, 4 |
| `src/data/types.ts` | 2a, 4 |
| `src/data/enrichment/upgrades.ts` | 2b, 4, 5, 6, 7, 8, 9, 10, 11 (TODO removal + enrichment updates) |
| `src/data/upgradeResolver.ts` | 4 |
| `src/data/upgradeApplicator.ts` | 3, 4, 5, 6, 8, 9 |
| `src/stores/defenseUpgradeApplicator.ts` | 3, 4, 5 |
| `src/engine/types.ts` | 7, 8, 10 |
| `src/engine/compareResults.ts` | 7 |
| `src/engine/attackPool.ts` | 8, 10 |
| `src/engine/attackSequence.ts` | 10 |
| `src/stores/attackConfigStore.ts` | 8, 10 |
| `src/stores/defenseConfigStore.ts` | 7 |
| `src/components/AttackerPanel/AttackerTokensSection.tsx` | 8 (Defeated Minis spinner) |
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | 8 (Defeated Minis spinner) |
| `src/components/AttackerPanel/AttackerUnitKeywordsSection.tsx` | 10 (Frenzied Gunner checkbox) |
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | 9 (Saber Throw source weapon selector + computed display) |
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | 5, 7 (Suppression visibility + Katarn Armor checkbox) |
| `src/hooks/useDisplayWeapons.ts` | 9 (Saber Throw computed profile from selected source) |
| `src/utils/keywordRestrictions.ts` | 7 (Katarn Armor restriction) |
| `src/data/enrichment/units.ts` | — (type errors resolve via Step 1a) |

## Testing Strategy

| Step | Test Type | Location |
|---|---|---|
| 1–2 | `npm run typecheck` | — |
| 3 | Unit test: surge overrides applied to config | `src/data/__tests__/upgradeApplicator.test.ts` |
| 4 | Unit test: defense die color override | `src/data/__tests__/upgradeApplicator.test.ts` |
| 5 | Unit test: +1 suppression when Duck and Cover equipped | `src/data/__tests__/upgradeApplicator.test.ts` |
| 6 | Unit test: +1 observation token when Mission Objective equipped | `src/data/__tests__/upgradeApplicator.test.ts` |
| 7 | Engine test: wound cap for non-melee | `src/engine/compareResults.test.ts` |
| 8 | Engine test: Black Ops / Kraken die additions | `src/engine/attackPool.test.ts` |
| 9 | Applicator test: Saber Throw weapon generation | `src/data/__tests__/upgradeApplicator.test.ts` |
| 10 | Engine test: Frenzied Gunner pool formation | `src/engine/attackPool.test.ts` |

---

## UI/UX Changes

This section details every user-facing change required for each step. The project uses a dark Tailwind UI with shared components (`NumberSpinner`, `Checkbox`, `Toggle`, `SegmentedControl`, `SectionHeader`, `Select`) and consistent patterns:
- **Unit Builder mode:** Keywords are auto-populated from presets/enrichment; users can override via manual controls.
- **Custom Pool mode:** All controls are always visible; users set everything manually.
- **Conditional visibility:** Controls for sub-keywords appear only when their parent is active (e.g., Shien Mastery only when Deflect is checked; Marksman Strategy only when Marksman is checked).
- **Display-only keywords** appear as small gray badges on weapon cards in the Weapons section.

### Steps 1–2 — Type Fixes (No UI changes)

No user-facing changes. These are purely TypeScript type definitions. Display-only keywords (`noncombatant`, `repairXCapacity2`, `cacheSurgeX`, etc.) already render as badges on weapon/unit cards when present; fixing the types just stops TypeScript from complaining.

### Step 3 — Surge Override Pipeline (No new UI, behavior change)

**Behavior change only.** When a user equips an upgrade with `surgeOverrides` (e.g., The Darksaber, Platoon Commander, Imperial Hammers Elite Armor Pilot) in Unit Builder mode, the Attack Surge or Defense Surge `SegmentedControl` in the configuration panel should **visually update** to reflect the override.

**Current behavior:** Equipping these upgrades has no visible effect on the surge chart selector.

**New behavior:** The surge chart in the UI reflects the applied override. Implementation options:
1. **Automatic update (recommended):** The applicator modifies the config's `surgeChart` field, which the `SegmentedControl` already reads from the store. If the store field updates, the UI updates automatically — no component changes needed.
2. **Visual indicator:** Add a small "(from upgrade)" annotation or a lock icon next to the surge chart selector when it's been overridden by an upgrade. This is optional polish.

**Melee conditional surge display:** When `meleeSurgeCrit` or `meleeSurgeBlock` is active, the surge chart changes only during melee attacks. The `SegmentedControl` label could append "(melee only)" when these conditionals are in effect, or the control could show two states depending on the current attack type selector. Since `configSelectors.ts` already receives `attackType`, the UI will naturally show the correct surge chart for the selected attack type.

### Step 4 — Combat Armor (Defender panel visual update)

**Behavior change.** When Combat Armor is equipped on the defender in Unit Builder mode:
- The **Defense Die** `SegmentedControl` automatically switches to "Red"
- The **Surge Chart** `SegmentedControl` automatically switches to "None"

**No new controls needed** — the existing `DefenderDefenseSection` already displays these selectors. The applicator's `defenseOverrides` will modify the config fields, and the `SegmentedControl` components read directly from the store.

**Optional polish — override indicator:** In Unit Builder mode, when the defense die or surge chart has been overridden by an upgrade, the control could show a visual cue (e.g., a subtle border highlight or "(Combat Armor)" label suffix) to explain why the value changed. This is low priority.

**Custom Pool mode:** No change — users manually set defense die and surge chart.

### Step 5 — Duck and Cover (Defender Suppression visual update)

**Behavior change.** When Duck and Cover is equipped, `suppressionTokens` increases by 1.

**UI impact:**
- In **Custom Pool mode:** The "Suppression" `NumberSpinner` in the Tokens section is conditionally shown only when `dangerSenseX > 0`. Duck and Cover's +1 suppression would be invisible unless Danger Sense is also active. **This is a UX gap.**
- **Fix required:** The Suppression token spinner should also appear when `duckAndCover` is active (i.e., when a "Duck and Cover" upgrade is equipped). Update the conditional in `DefenderCustomPoolView.tsx`:

```tsx
// Before:
{store.dangerSenseX > 0 && (
  <NumberSpinner label="Suppression" ... />
)}

// After:
{(store.dangerSenseX > 0 || store.suppressionTokens > 0) && (
  <NumberSpinner label="Suppression" ... />
)}
```

This ensures the Suppression control is always visible when there are suppression tokens applied (whether from Duck and Cover or manually set), not just when Danger Sense is present.

**Files changed:**
| File | Change |
|---|---|
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | Widen conditional for Suppression spinner visibility |

### Step 6 — Mission Objective (Attacker Observation token update)

**Behavior change.** When Mission Objective is equipped, `observationTokens` increases by 1.

**UI impact:** The Observation token spinner in `AttackerTokensSection` is always visible, so the +1 will be reflected automatically. No component changes needed.

**Optional polish:** Add a tooltip note or label badge on the Observation spinner when the bonus comes from Mission Objective, e.g., `"(+1 from Mission Objective)"`. Low priority.

### Step 7 — Katarn Pattern Armor (New defender checkbox)

**New UI control required.** The engine needs a `katarnPatternArmor` boolean on `DefenderConfig`. In Custom Pool mode, the user must be able to toggle this manually.

**Attacker Panel:** No changes.

**Defender Panel — Custom Pool mode (`DefenderCustomPoolView.tsx`):**

Add a new `Checkbox` in the Keywords section:

```tsx
<Checkbox
  label="Katarn Armor"
  value={store.katarnPatternArmor}
  onChange={(value) => store.setField('katarnPatternArmor', value)}
  disabled={isDisabled('katarnPatternArmor')}
  tooltip="Expend: when suffering 1+ wounds from a non-melee attack, suffer only 1 wound instead."
/>
```

**Placement:** In the Keywords grid, grouped near other defensive keywords (after Immune: Melee, before Duelist).

**Attack type restriction:** This keyword only functions against non-melee attacks. Add to `DEFENDER_KEYWORD_RESTRICTIONS` in `src/utils/keywordRestrictions.ts`:

```typescript
katarnPatternArmor: { ranged: true, melee: false },
```

This grays out the checkbox when the attack type is Melee, matching the existing pattern for melee-only keywords.

**Unit Builder mode:** Auto-populated when the upgrade is equipped. No manual control needed — the checkbox state comes from the applicator.

**Files changed:**
| File | Change |
|---|---|
| `src/components/DefenderPanel/DefenderCustomPoolView.tsx` | Add Katarn Armor checkbox |
| `src/utils/keywordRestrictions.ts` | Add `katarnPatternArmor` restriction (non-melee only) |
| `src/stores/defenseConfigStore.ts` | Add `katarnPatternArmor: false` to defaults |

### Step 8 — Defeated Minis (New attacker input control)

**New UI control required.** When the attacking unit has weapons with `blackOps` or `krakenBlaster`, the user needs to specify how many miniatures from the unit are defeated.

**Attacker Panel — Unit Builder mode (`AttackerUnitBuilderView.tsx`):**

Add a conditionally-visible `NumberSpinner` in the Tokens section or a new "Unit State" section:

```tsx
{hasDefeatedMinisEffect && (
  <NumberSpinner
    label="Defeated Minis"
    value={store.defeatedMinis}
    onChange={(value) => store.setField('defeatedMinis', value)}
    min={0}
    max={store.baseMiniatureCount - 1}  // can't exceed unit size minus 1
    compact
    tooltip="Number of defeated miniatures in this unit. Affects Black Ops (+1 white die per defeated) and Kraken's Blaster (upgrade 1 die per defeated)."
  />
)}
```

**Where `hasDefeatedMinisEffect`** is derived from the equipped upgrades/weapons — true if any weapon in the pool has `blackOps: true` or `krakenBlaster: true`. This can be computed from the display weapons or aggregated weapon keywords.

**Placement options:**
1. **In `AttackerTokensSection`** — alongside Aim/Surge/Observation tokens. This is contextually related (unit state affecting dice).
2. **In a new "Unit State" section** — a small collapsible section between Tokens and Weapon Keywords. More discoverable but adds panel height.
3. **Recommended:** In `AttackerTokensSection`, as the last spinner, conditionally visible. It follows the existing pattern of conditional spinners (Dodge tokens shown only with Jar'Kai Mastery).

**Attacker Panel — Custom Pool mode (`AttackerCustomPoolView.tsx`):**

In Custom Pool mode, `defeatedMinis` could be a spinner in the Tokens section that's always visible if the user is manually building Kraken/Cassian pools. However, since Custom Pool users don't have weapon-level keyword awareness, this spinner should be shown alongside a note about what it does. Alternatively, it's always visible in Custom Pool mode with a default of 0. **Recommended:** Always show it in Custom Pool mode, with a default of 0 and a descriptive tooltip.

**Max value logic:** The max should be `baseMiniatureCount - 1` in Unit Builder mode (you need at least 1 surviving mini to attack). In Custom Pool mode, use a reasonable cap (e.g., 11 — largest unit size in Legion).

**Files changed:**
| File | Change |
|---|---|
| `src/components/AttackerPanel/AttackerTokensSection.tsx` | Add conditional Defeated Minis spinner |
| `src/components/AttackerPanel/AttackerCustomPoolView.tsx` | Add Defeated Minis spinner |
| `src/stores/attackConfigStore.ts` | Add `defeatedMinis: 0` to defaults + setter |

### Step 9 — Saber Throw (Melee weapon selector + computed dice display)

**New UI control required.** When Saber Throw is in the weapon list, the Saber Throw weapon card gets a dropdown/select to choose which melee weapon it copies from.

**UI design — Saber Throw weapon card:**

The existing Weapons section in `AttackerUnitBuilderView` renders each weapon as a card with name, dice icons, mini count, and keyword badges. The Saber Throw card is enhanced with an inline source weapon selector:

```
┌─────────────────────────────────────────────────┐
│ ☑  Saber Throw                    🔴🔴🔴       │
│    Source: [ Anakin's Lightsaber     ▼ ]        │
│    ┌──────┐ ┌─────────┐ ┌──────────────┐       │
│    │Pierce 2│ │Critical 1│ │ Saber Throw  │     │
│    └──────┘ └─────────┘ └──────────────┘       │
└─────────────────────────────────────────────────┘
```

**Selector behavior:**
- The dropdown lists all melee weapons currently in the unit's weapon pool (by name)
- If there is exactly **1 melee weapon**, it is auto-selected and the dropdown is either hidden or shown as a read-only label (e.g., `"Source: Anakin's Lightsaber"`)
- If there are **0 melee weapons**, show a disabled label: `"No melee weapon available"` and the Saber Throw card shows 0 dice
- If there are **2+ melee weapons**, show the dropdown with a placeholder prompt: `"Select melee weapon..."`
- Changing the selection immediately updates the dice icons and keyword badges on the Saber Throw card
- The selection is stored in `attackConfigStore.saberThrowSourceWeapon` (weapon name string)
- The selection resets to `null` on preset change, upgrade equip/unequip, or mode switch

**Implementation — component level:**

Add logic inside the weapon card rendering loop in `AttackerUnitBuilderView`:

```tsx
{weapon.keywords?.saberThrow && (
  <Select
    label="Source"
    value={store.saberThrowSourceWeapon ?? ''}
    onChange={(value) => store.setSaberThrowSourceWeapon(value || null)}
    options={meleeWeapons.map(w => ({ value: w.name, label: w.name }))}
    placeholder="Select melee weapon..."
    disabled={meleeWeapons.length <= 1}
    compact
  />
)}
```

**Dice display update:** The `useDisplayWeapons` hook or weapon card needs to show the **post-computation** Saber Throw profile (computed dice and inherited keywords), not the static 0-dice placeholder from enrichment. Options:
1. **Hook-level:** `useDisplayWeapons` detects the Saber Throw weapon, looks up the selected source melee weapon, and returns the computed profile
2. **Card-level:** The card component computes the display inline based on the selected source weapon
3. **Recommended:** Option 1 — the hook already transforms enrichment data into display data. Add Saber Throw resolution there so the card rendering stays generic.

**Custom Pool mode:** Saber Throw is not relevant in Custom Pool mode (users manually specify all dice). No changes needed.

**Files changed:**
| File | Change |
|---|---|
| `src/components/AttackerPanel/AttackerUnitBuilderView.tsx` | Melee weapon `Select` on Saber Throw card |
| `src/hooks/useDisplayWeapons.ts` | Compute post-resolution Saber Throw profile for display |
| `src/stores/attackConfigStore.ts` | `saberThrowSourceWeapon` state + setter |

### Step 10 — Frenzied Gunner (No new controls, results impact)

**No new input controls.** Frenzied Gunner is a boolean set automatically when the upgrade is equipped in Unit Builder mode. In Custom Pool mode, it maps to a config field set by the applicator.

**UI impact — Results Panel:**

Frenzied Gunner introduces variance into the pool formation step. The Monte Carlo results naturally capture this. For the deterministic pathway (if the project has one), the weighted-average approach described in the engine section produces correct expected values.

**Custom Pool mode consideration:** Frenzied Gunner needs a manual toggle in Custom Pool mode if users want to simulate this effect without the Unit Builder.

**New UI control for Custom Pool mode:**

```tsx
<Checkbox
  label="Frenzied Gunner"
  value={store.frenziedGunner}
  onChange={(value) => store.setField('frenziedGunner', value)}
  tooltip="Roll a red defense die during pool formation: blank → +1 white die, block → +1 black die, surge → +1 red die."
/>
```

**Placement:** In the Unit Keywords section of `AttackerCustomPoolView`, alongside other attacker boolean keywords (Marksman, Jedi Hunter, etc.). Also add to `AttackerUnitKeywordsSection` since that's the shared component.

**Files changed:**
| File | Change |
|---|---|
| `src/components/AttackerPanel/AttackerUnitKeywordsSection.tsx` | Add Frenzied Gunner checkbox |
| `src/stores/attackConfigStore.ts` | Add `frenziedGunner: false` default |

### Step 11 — Nanny Programming (No UI changes)

No user-facing changes. This is a restriction/deckbuilding concern only.

---

### UI/UX Summary Table

| Step | UI Change | Component(s) | Priority |
|---|---|---|---|
| 1–2 | None | — | — |
| 3 | Surge chart auto-updates (existing controls) | Auto via store | Required |
| 3 | Optional "(melee only)" label on conditional surges | `SegmentedControl` label | Nice-to-have |
| 4 | Defense die/surge auto-updates (existing controls) | Auto via store | Required |
| 4 | Optional override indicator | `DefenderDefenseSection` | Nice-to-have |
| 5 | Widen Suppression spinner conditional visibility | `DefenderCustomPoolView.tsx` | Required |
| 6 | None (Observation spinner always visible) | — | — |
| 7 | New "Katarn Armor" checkbox in defender keywords | `DefenderCustomPoolView.tsx` | Required |
| 7 | Add keyword restriction (non-melee only) | `keywordRestrictions.ts` | Required |
| 8 | New "Defeated Minis" spinner (conditional) | `AttackerTokensSection.tsx` | Required |
| 8 | Defeated Minis in Custom Pool view | `AttackerCustomPoolView.tsx` | Required |
| 9 | Melee weapon source `Select` on Saber Throw card | `AttackerUnitBuilderView.tsx` | Required |
| 9 | Computed dice/keywords display from selected source | `useDisplayWeapons.ts` | Required |
| 9 | `saberThrowSourceWeapon` store field + auto-select | `attackConfigStore.ts` | Required |
| 10 | New "Frenzied Gunner" checkbox in attacker keywords | `AttackerUnitKeywordsSection.tsx` | Required |

---

## Quality Gate

All steps must pass:
- `npm run typecheck` — 0 errors
- `npm run lint` — 0 errors
- `npm run test` — all tests pass
- No unrelated regressions

## Assumptions & Open Questions

1. **Katarn Pattern Armor expend state:** The calculator doesn't model card exhaustion. Katarn Armor is assumed "available" when the keyword is active. Users can toggle it off to represent an expended card.

2. **Saber Throw source weapon selection:** When a unit has multiple melee weapons, the user selects which one Saber Throw copies via a dropdown on the Saber Throw weapon card. If only one melee weapon exists, it is auto-selected. If none exist, Saber Throw produces 0 dice. The selection resets whenever presets or upgrades change.

3. **Frenzied Gunner deterministic pathway:** The recommended approach (enumerate 3 outcomes) gives exact expected values but triples the computation for each attack. If this causes performance concerns, a simpler weighted-average approach can be substituted.

4. **`noncombatant` vs `noncombatantKeyword`:** Step 1a adds `noncombatant` as a separate field. If we later want to unify these, a migration would rename all 7 enrichment entries.

5. **`cacheSurgeX` / `independentSurgeX` / `independentDodgeX` auto-token generation:** These are tagged display-only for now. A future enhancement could auto-populate token inputs when these keywords are present (e.g., `independentSurgeX: 1` → auto-set `surgeTokens += 1`).

6. **Melee surge overrides (`meleeSurgeCrit`, `meleeSurgeBlock`):** These require the applicator or config selector to know the current attack type at application time. The current applicator receives `attackType` as a parameter, so this is feasible — but the conditional logic needs careful testing.
