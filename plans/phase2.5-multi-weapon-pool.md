# Phase 2.5: Multi-Weapon Attack Pool Restructuring — Implementation Plan

## Goal

Restructure the engine's `AttackerConfig` to separate **unit-level keywords** from **weapon-level keywords** by introducing a `WeaponProfile` type and a `weapons: WeaponProfile[]` array. The engine always operates on weapon arrays — generic/custom pool mode uses a single-weapon array, while a future Unit Builder mode will use multiple weapons. This phase corrects the fundamental design issue where Spray (and other per-weapon keywords like Cumbersome, Anti-Materiel, Anti-Personnel) incorrectly apply to the entire pool instead of individual weapons.

---

## Overview

Phase 2.5 consists of six sub-phases:

- **2.5A:** Type Restructuring — new `WeaponProfile`, `WeaponKeywords`, `AggregatedWeaponKeywords` types; modified `AttackerConfig`
- **2.5B:** Pool Formation & Aggregation — rewrite `formAttackPool`, implement `aggregateWeaponKeywords`
- **2.5C:** Step Function Signatures — update all attack sequence step functions to accept `AggregatedWeaponKeywords`
- **2.5D:** Test Helpers & Test Migration — update `createMinimalAttacker`, add `createMinimalWeapon`, migrate all test files
- **2.5E:** Sequence Orchestrator — update `executeAttackSequence` to call `aggregateWeaponKeywords` and pass to steps
- **2.5F:** Validation — run full test suite, add new multi-weapon tests

Phase 2.5 depends on:
- **Phase 2A** (complete) — existing enums, types, dice definitions
- **Phase 2B** (complete) — existing attack sequence pipeline and all step functions

Phase 2.5 impacts (downstream updates documented in this plan):
- **Phase 5A** — Zustand store shape must change from flat dice/keywords to `weapons[]`
- **Phase 5.5** — `WeaponProfile` in data layer must align with engine `WeaponProfile` type
- **Phase 6** — UI panels must map controls to the new `weapons[]` shape; two-mode design introduced

Phase 2.5 does **not** require:
- Phase 3 (Simulator) — no changes to simulation runner; it calls `executeAttackSequence` which handles the new shape internally
- Phase 4 (Shared components) — no component changes
- Phase 7 (Results panel) — no changes

---

## Design Decisions

1. **Unified Engine Model** — The engine always processes `weapons: WeaponProfile[]`. In custom pool mode (current UI), this is a single-element array. In future Unit Builder mode, it's a multi-element array. There are no separate code paths — the same `formAttackPool` and `aggregateWeaponKeywords` functions handle both cases identically.

2. **Keyword Classification** — Keywords are classified per the rulebook's explicit weapon keyword vs. unit keyword distinction:
   - **Unit keywords** (flat on `AttackerConfig`): `surgeChart`, `aimTokens`, `surgeTokens`, `observationTokens`, `dodgeTokensAttacker`, `preciseX`, `sharpshooterX`, `marksman`, `marksmanStrategy`, `rerollStrategy`, `jediHunter`, `jarKaiMastery`, `duelistAttacker`, `makashiMastery`, `immuneDeflect`, `deathFromAbove`, `holdTheLine`, `unitCost`
   - **Weapon keywords** (on `WeaponProfile`): `redDice`, `blackDice`, `whiteDice`, `criticalX`, `lethalX`, `pierceX`, `impactX`, `ramX`, `blast`, `highVelocity`, `suppressive`, `spray`, `antiMaterielX`, `antiPersonnelX`, `cumbersome`

3. **Aggregation Rules** — When combining weapon keywords across the pool:
   - **Summed** (numeric, additive): `impactX`, `pierceX`, `lethalX`, `criticalX`, `ramX`
   - **Boolean OR** (any weapon has it → pool has it): `blast`, `suppressive`
   - **Boolean AND** (all weapons must have it): `highVelocity` (rulebook: "only has weapons with High Velocity")
   - **Per-weapon only** (applied during pool formation, not aggregated): `spray`, `cumbersome`, `antiMaterielX`, `antiPersonnelX`

4. **Generic Mode Spray** — In custom pool mode, the single weapon has Spray set directly. Since there's only one weapon, Spray multiplies all dice in the pool — matching current behavior exactly.

5. **`poolKeywords` as Explicit Parameter** — Rather than mutating config or creating a wrapper, `AggregatedWeaponKeywords` is passed as an additional parameter to the 5 step functions that need weapon keyword values. This keeps function signatures explicit, maintains immutability, and minimizes coupling.

6. **Backward-Compatible Test Migration** — A `createMinimalWeapon()` helper makes test migration straightforward. Most tests that previously set flat fields like `pierceX: 3` now use `weapons: [createMinimalWeapon({ keywords: { pierceX: 3 } })]`. A convenience helper `createAttackerWithWeapon()` further simplifies the common single-weapon case.

7. **No UI Changes in This Phase** — This phase is purely engine + types + tests. UI panels (Phase 6), state management (Phase 5A), and the two-mode design are scoped separately. Updates to those plans are documented here for coordination but not implemented in Phase 2.5.

---

## Keyword Classification Reference

### Unit Keywords (remain flat on `AttackerConfig`)

| Keyword | Engine Field | Type | Rationale |
|---------|-------------|------|-----------|
| Surge Chart | `surgeChart` | `AttackSurgeChart` | Unit card property |
| Aim Tokens | `aimTokens` | `number` | Token on unit |
| Surge Tokens | `surgeTokens` | `number` | Token on unit |
| Observation Tokens | `observationTokens` | `number` | Token on defender |
| Dodge Tokens (Attacker) | `dodgeTokensAttacker` | `number` | Token on unit (Jar'Kai) |
| Precise X | `preciseX` | `number` | Rulebook: unit keyword |
| Sharpshooter X | `sharpshooterX` | `number` | Rulebook: unit keyword |
| Marksman | `marksman` | `boolean` | Rulebook: unit keyword |
| Marksman Strategy | `marksmanStrategy` | `MarksmanStrategy` | Calculator setting |
| Reroll Strategy | `rerollStrategy` | `RerollStrategy` | Calculator setting |
| Jedi Hunter | `jediHunter` | `boolean` | Rulebook: unit keyword |
| Jar'Kai Mastery | `jarKaiMastery` | `boolean` | Rulebook: unit keyword |
| Duelist (Attacker) | `duelistAttacker` | `boolean` | Rulebook: unit keyword |
| Makashi Mastery | `makashiMastery` | `boolean` | Rulebook: unit keyword |
| Immune: Deflect | `immuneDeflect` | `boolean` | Rulebook: unit keyword |
| Death From Above | `deathFromAbove` | `boolean` | Rulebook: unit keyword |
| Hold the Line | `holdTheLine` | `boolean` | Rulebook: unit keyword |
| Unit Cost | `unitCost` | `number` | Points tracking |

### Weapon Keywords (move to `WeaponProfile`)

| Keyword | Engine Field | Type | Aggregation | Notes |
|---------|-------------|------|-------------|-------|
| Red Dice | `redDice` | `number` | Per-weapon (pool formation) | |
| Black Dice | `blackDice` | `number` | Per-weapon (pool formation) | |
| White Dice | `whiteDice` | `number` | Per-weapon (pool formation) | |
| Critical X | `criticalX` | `number` | Sum | Converts surges → crits |
| Lethal X | `lethalX` | `number` | Sum | Aim → Pierce |
| Pierce X | `pierceX` | `number` | Sum | Cancels blocks |
| Impact X | `impactX` | `number` | Sum | Hit → crit vs Armor |
| Ram X | `ramX` | `number` | Sum | Results → crits |
| Blast | `blast` | `boolean` | OR | Any weapon → pool has it |
| High Velocity | `highVelocity` | `boolean` | AND | All weapons must have it |
| Suppressive | `suppressive` | `boolean` | OR | Any weapon → pool has it |
| Spray | `spray` | `boolean` | Per-weapon only | Multiplies only that weapon's dice |
| Anti-Materiel X | `antiMaterielX` | `number` | Per-weapon only | Upgrades that weapon's dice |
| Anti-Personnel X | `antiPersonnelX` | `number` | Per-weapon only | Upgrades that weapon's dice |
| Cumbersome | `cumbersome` | `boolean` | Per-weapon only | Downgrades that weapon's dice |

---

## Step 2.5A — Type Restructuring

**File:** `src/engine/types.ts`

### 2.5A.1 — Add `WeaponKeywords` interface

Insert after the existing enum definitions, before `AttackerConfig`:

```ts
// ============================================================================
// Weapon Keywords (per-weapon, contributed to attack pool)
// ============================================================================

/**
 * Keywords that belong to individual weapons and are contributed to the
 * attack pool along with that weapon's dice. Some are aggregated across
 * all weapons in the pool (sum/OR/AND), others apply per-weapon only
 * during pool formation.
 */
export interface WeaponKeywords {
  // Aggregated: Summed across weapons in pool
  criticalX: number;
  lethalX: number;
  pierceX: number;
  impactX: number;
  ramX: number;

  // Aggregated: Boolean OR (any weapon → pool has it)
  blast: boolean;
  suppressive: boolean;

  // Aggregated: Boolean AND (all weapons must have it)
  highVelocity: boolean;

  // Per-weapon only (applied during pool formation, not aggregated)
  spray: boolean;
  antiMaterielX: number;
  antiPersonnelX: number;
  cumbersome: boolean;
}
```

### 2.5A.2 — Add `WeaponProfile` interface

```ts
// ============================================================================
// Weapon Profile (dice + keywords for a single weapon)
// ============================================================================

/**
 * Represents a single weapon contributing to an attack pool.
 * Each weapon has its own dice and weapon keywords.
 */
export interface WeaponProfile {
  /** Optional display name (e.g., "DLT-19", "Lightsaber") */
  name?: string;

  // Dice contributed by this weapon
  redDice: number;
  blackDice: number;
  whiteDice: number;

  // Weapon keywords
  keywords: WeaponKeywords;
}
```

### 2.5A.3 — Add `AggregatedWeaponKeywords` interface

```ts
// ============================================================================
// Aggregated Weapon Keywords (pool-level, computed from all weapons)
// ============================================================================

/**
 * The result of aggregating weapon keywords across all weapons in an
 * attack pool. Per-weapon-only keywords (spray, cumbersome, anti-materiel,
 * anti-personnel) are excluded — they are handled during pool formation.
 */
export interface AggregatedWeaponKeywords {
  // Summed across weapons
  criticalX: number;
  lethalX: number;
  pierceX: number;
  impactX: number;
  ramX: number;

  // OR'd across weapons
  blast: boolean;
  suppressive: boolean;

  // AND'd across weapons (all must have it)
  highVelocity: boolean;
}
```

### 2.5A.4 — Update `AttackerConfig`

Remove all weapon keyword fields and dice fields. Add `weapons: WeaponProfile[]`:

```ts
export interface AttackerConfig {
  // Weapons in the attack pool
  weapons: WeaponProfile[];

  // Unit-level surge chart (applies to all dice in pool)
  surgeChart: AttackSurgeChart;

  // Tokens (unit-level)
  aimTokens: number;
  surgeTokens: number;
  observationTokens: number;
  dodgeTokensAttacker: number;

  // Unit keywords (numeric)
  preciseX: number;
  sharpshooterX: number;

  // Unit keywords (boolean)
  marksman: boolean;
  marksmanStrategy: MarksmanStrategy;
  rerollStrategy: RerollStrategy;
  jediHunter: boolean;
  jarKaiMastery: boolean;
  duelistAttacker: boolean;
  makashiMastery: boolean;
  immuneDeflect: boolean;
  deathFromAbove: boolean;
  holdTheLine: boolean;

  // Points
  unitCost: number;
}
```

**Fields removed from `AttackerConfig`** (now on `WeaponProfile` or `WeaponKeywords`):
- `redDice`, `blackDice`, `whiteDice` → `WeaponProfile.redDice/blackDice/whiteDice`
- `criticalX`, `lethalX`, `pierceX`, `impactX`, `ramX` → `WeaponKeywords.*`
- `blast`, `highVelocity`, `suppressive`, `spray` → `WeaponKeywords.*`
- `antiMaterielX`, `antiPersonnelX`, `cumbersome` → `WeaponKeywords.*`

**Verify:**
- TypeScript compilation will break many files at this point — that's expected and resolved in subsequent steps
- `AttackConfig` interface itself (`{ attacker, defender, attackType }`) is unchanged

---

## Step 2.5B — Pool Formation & Aggregation

**File:** `src/engine/attackPool.ts`

### 2.5B.1 — Implement `aggregateWeaponKeywords`

```ts
import type { WeaponProfile, AggregatedWeaponKeywords } from './types';

/**
 * Aggregate weapon keywords across all weapons in an attack pool.
 * - Numeric keywords: summed
 * - blast, suppressive: OR (any weapon has it → pool has it)
 * - highVelocity: AND (all weapons must have it; false if pool is empty)
 *
 * Per-weapon keywords (spray, cumbersome, antiMaterielX, antiPersonnelX)
 * are NOT included — they are handled during pool formation.
 */
export function aggregateWeaponKeywords(
  weapons: WeaponProfile[]
): AggregatedWeaponKeywords {
  if (weapons.length === 0) {
    return {
      criticalX: 0,
      lethalX: 0,
      pierceX: 0,
      impactX: 0,
      ramX: 0,
      blast: false,
      suppressive: false,
      highVelocity: false,
    };
  }

  let criticalX = 0;
  let lethalX = 0;
  let pierceX = 0;
  let impactX = 0;
  let ramX = 0;
  let blast = false;
  let suppressive = false;
  let highVelocity = true; // AND: start true, flip false if any weapon lacks it

  for (const weapon of weapons) {
    const kw = weapon.keywords;
    criticalX += kw.criticalX;
    lethalX += kw.lethalX;
    pierceX += kw.pierceX;
    impactX += kw.impactX;
    ramX += kw.ramX;
    blast = blast || kw.blast;
    suppressive = suppressive || kw.suppressive;
    highVelocity = highVelocity && kw.highVelocity;
  }

  return {
    criticalX,
    lethalX,
    pierceX,
    impactX,
    ramX,
    blast,
    suppressive,
    highVelocity,
  };
}
```

### 2.5B.2 — Rewrite `formAttackPool`

```ts
/**
 * Step 2 — Form Attack Pool
 *
 * Iterates over all weapons in config.attacker.weapons[].
 * For each weapon:
 *   - If weapon.keywords.spray === true, multiply that weapon's dice
 *     by defender.minisInLOS
 *   - Append the weapon's dice to the pool
 *
 * This correctly handles mixed pools where only some weapons have Spray.
 */
export function formAttackPool(config: AttackConfig): AttackDieColor[] {
  const { attacker, defender } = config;
  const pool: AttackDieColor[] = [];

  for (const weapon of attacker.weapons) {
    let red = weapon.redDice;
    let black = weapon.blackDice;
    let white = weapon.whiteDice;

    // Spray: multiply THIS weapon's dice by minis in LOS
    if (weapon.keywords.spray) {
      const multiplier = Math.max(1, defender.minisInLOS);
      red *= multiplier;
      black *= multiplier;
      white *= multiplier;
    }

    // Append dice to pool
    for (let i = 0; i < red; i++) pool.push(AttackDieColor.Red);
    for (let i = 0; i < black; i++) pool.push(AttackDieColor.Black);
    for (let i = 0; i < white; i++) pool.push(AttackDieColor.White);
  }

  return pool;
}
```

### 2.5B.3 — Update `upgradeDowgradeAttackDice` signature

The function signature stays the same (it operates on the pool array), but when implemented in the future it will need access to per-weapon `cumbersome`, `antiMaterielX`, `antiPersonnelX` data. For now it remains a no-op. Add a TODO comment noting the future per-weapon requirement.

**Tests (add to `src/engine/attackPool.test.ts`):**

```ts
describe('aggregateWeaponKeywords', () => {
  it('sums numeric keywords across weapons', () => { ... });
  it('ORs blast and suppressive', () => { ... });
  it('ANDs highVelocity (all must have it)', () => { ... });
  it('returns false for highVelocity when pool is empty', () => { ... });
  it('returns zeros/false for empty weapon array', () => { ... });
});

describe('formAttackPool — multi-weapon', () => {
  it('combines dice from multiple weapons', () => { ... });
  it('applies Spray only to the Spray weapon\'s dice', () => { ... });
  it('applies Spray to multiple weapons independently if both have Spray', () => { ... });
  it('does not multiply non-Spray weapon dice when another weapon has Spray', () => { ... });
});
```

---

## Step 2.5C — Update Step Function Signatures

Each step function that currently reads weapon keywords from `config.attacker.*` gains a `poolKeywords: AggregatedWeaponKeywords` parameter.

### 2.5C.1 — `convertAttackSurges` in `src/engine/attackSurges.ts`

**Current:** reads `config.attacker.criticalX`
**Change:** add `poolKeywords` parameter, read `poolKeywords.criticalX`

```ts
// Before:
export function convertAttackSurges(
  results: RolledAttackDie[],
  config: AttackConfig
): RolledAttackDie[]

// After:
export function convertAttackSurges(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords
): RolledAttackDie[]
```

Replace `config.attacker.criticalX` → `poolKeywords.criticalX` inside the function body.

### 2.5C.2 — `applyDodgeAndCover` in `src/engine/dodgeCover.ts`

**Current:** reads `config.attacker.blast`, `config.attacker.highVelocity`
**Change:** add `poolKeywords` parameter, read `poolKeywords.blast`, `poolKeywords.highVelocity`

```ts
// Before:
export function applyDodgeAndCover(
  results: RolledAttackDie[],
  config: AttackConfig
): { hits: number; crits: number; blanks: number; dodgeWasSpent: boolean }

// After:
export function applyDodgeAndCover(
  results: RolledAttackDie[],
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords
): { hits: number; crits: number; blanks: number; dodgeWasSpent: boolean }
```

Also update `determineCoverValue` in `src/engine/cover.ts`:
- **Current:** reads `config.attacker.blast`, `config.attacker.deathFromAbove`
- **Change:** add `poolBlast: boolean` parameter; `deathFromAbove` stays on `config.attacker`

```ts
// Before:
export function determineCoverValue(config: AttackConfig): number

// After:
export function determineCoverValue(
  config: AttackConfig,
  poolBlast: boolean
): number
```

### 2.5C.3 — `modifyAttackDice` in `src/engine/attackModifiers.ts`

**Current:** reads `config.attacker.impactX`, `config.attacker.ramX`, `config.attacker.lethalX`
**Change:** add `poolKeywords` parameter

```ts
// Before:
export function modifyAttackDice(
  results: { hits: number; crits: number; blanks: number },
  config: AttackConfig,
  aimsSpent: number,
  aimsSavedForMarksman: number
): { hits: number; crits: number; lethalPierce: number; guardianHits: number }

// After:
export function modifyAttackDice(
  results: { hits: number; crits: number; blanks: number },
  config: AttackConfig,
  aimsSpent: number,
  aimsSavedForMarksman: number,
  poolKeywords: AggregatedWeaponKeywords
): { hits: number; crits: number; lethalPierce: number; guardianHits: number }
```

Replace `config.attacker.impactX` → `poolKeywords.impactX`, `config.attacker.ramX` → `poolKeywords.ramX`, `config.attacker.lethalX` → `poolKeywords.lethalX`.

### 2.5C.4 — `modifyDefenseDice` in `src/engine/defenseModifiers.ts`

**Current:** reads `config.attacker.pierceX`
**Change:** add `poolPierceX: number` parameter (simpler than full `poolKeywords` since only Pierce is needed)

```ts
// Before:
export function modifyDefenseDice(
  results: RolledDefenseDie[],
  config: AttackConfig,
  dodgeWasSpent: boolean
): { blocks: number }

// After:
export function modifyDefenseDice(
  results: RolledDefenseDie[],
  config: AttackConfig,
  dodgeWasSpent: boolean,
  poolPierceX: number
): { blocks: number }
```

### 2.5C.5 — `compareResults` in `src/engine/compareResults.ts`

**Current:** reads `config.attacker.pierceX`, `config.attacker.suppressive`, `config.attacker.blast`
**Change:** add `poolKeywords` parameter

```ts
// Before:
export function compareResults(
  attackResults: { hits: number; crits: number },
  defenseResults: { mainTargetBlocks: number; guardianBlocks: number; guardianHits: number },
  config: AttackConfig,
  lethalPierce: number,
  pierceBonus: number,
  surgeCountBeforeConversion: number,
  rolledAttack: RolledAttackDie[],
  guardianWoundsNoPierce: number,
  guardianDeflectWounds: number,
  dodgeWasSpent: boolean
): AttackResult

// After (add poolKeywords after config):
export function compareResults(
  attackResults: { hits: number; crits: number },
  defenseResults: { mainTargetBlocks: number; guardianBlocks: number; guardianHits: number },
  config: AttackConfig,
  poolKeywords: AggregatedWeaponKeywords,
  lethalPierce: number,
  pierceBonus: number,
  surgeCountBeforeConversion: number,
  rolledAttack: RolledAttackDie[],
  guardianWoundsNoPierce: number,
  guardianDeflectWounds: number,
  dodgeWasSpent: boolean
): AttackResult
```

### 2.5C.6 — `rollDefenseDice` in `src/engine/defenseRoll.ts`

**Current:** reads `config.attacker.pierceX` for Impervious extra dice
**Change:** add `poolPierceX: number` parameter

```ts
// Check if rollDefenseDice reads pierceX — if so, add parameter.
// Impervious: rolls extra defense dice = total Pierce X value
```

### 2.5C.7 — `convertDefenseSurges` in `src/engine/defenseSurges.ts`

**Current:** may not read any weapon keywords directly
**Change:** verify — likely no change needed (surge conversion uses defender config + unit keywords)

---

## Step 2.5D — Test Helpers & Test Migration

### 2.5D.1 — Update `src/engine/testHelpers.ts`

```ts
import type { AttackerConfig, DefenderConfig, WeaponProfile, WeaponKeywords } from './types';

/**
 * Create a minimal valid weapon keywords object.
 * All keywords default to 0/false.
 */
export function createMinimalWeaponKeywords(
  overrides: Partial<WeaponKeywords> = {}
): WeaponKeywords {
  return {
    criticalX: 0,
    lethalX: 0,
    pierceX: 0,
    impactX: 0,
    ramX: 0,
    blast: false,
    highVelocity: false,
    suppressive: false,
    spray: false,
    antiMaterielX: 0,
    antiPersonnelX: 0,
    cumbersome: false,
    ...overrides,
  };
}

/**
 * Create a minimal valid weapon profile.
 * Defaults to 0 dice and no keywords.
 * Accepts flat keyword overrides for convenience:
 *   createMinimalWeapon({ redDice: 2, keywords: { pierceX: 3 } })
 */
export function createMinimalWeapon(
  overrides: Partial<WeaponProfile> & { keywords?: Partial<WeaponKeywords> } = {}
): WeaponProfile {
  const { keywords: keywordOverrides, ...rest } = overrides;
  return {
    redDice: 0,
    blackDice: 0,
    whiteDice: 0,
    keywords: createMinimalWeaponKeywords(keywordOverrides),
    ...rest,
  };
}

/**
 * Helper to create a minimal valid attacker config for testing.
 * If weapons is not provided, creates a single weapon with no dice.
 *
 * Convenience: weapon-level overrides can be passed directly if only
 * testing a single weapon:
 *   createMinimalAttacker({ weapons: [createMinimalWeapon({ redDice: 6 })] })
 */
export function createMinimalAttacker(
  overrides: Partial<AttackerConfig> = {}
): AttackerConfig {
  return {
    weapons: [createMinimalWeapon()],
    surgeChart: AttackSurgeChart.None,
    aimTokens: 0,
    surgeTokens: 0,
    observationTokens: 0,
    dodgeTokensAttacker: 0,
    preciseX: 0,
    sharpshooterX: 0,
    marksman: false,
    marksmanStrategy: MarksmanStrategy.Deterministic,
    rerollStrategy: RerollStrategy.Conservative,
    jediHunter: false,
    jarKaiMastery: false,
    duelistAttacker: false,
    makashiMastery: false,
    immuneDeflect: false,
    deathFromAbove: false,
    holdTheLine: false,
    unitCost: 0,
    ...overrides,
  };
}

/**
 * Convenience: create an attacker with a single weapon.
 * Merges weapon-level and unit-level overrides:
 *
 *   createAttackerWithWeapon(
 *     { redDice: 6, keywords: { pierceX: 3, impactX: 3 } },
 *     { surgeChart: AttackSurgeChart.ToCrit, preciseX: 1 }
 *   )
 */
export function createAttackerWithWeapon(
  weaponOverrides: Partial<WeaponProfile> & { keywords?: Partial<WeaponKeywords> } = {},
  unitOverrides: Partial<Omit<AttackerConfig, 'weapons'>> = {}
): AttackerConfig {
  return createMinimalAttacker({
    weapons: [createMinimalWeapon(weaponOverrides)],
    ...unitOverrides,
  });
}
```

### 2.5D.2 — Create `createMinimalPoolKeywords` helper

```ts
import type { AggregatedWeaponKeywords } from './types';

/**
 * Create a minimal aggregated weapon keywords object for testing
 * step functions that take poolKeywords directly.
 */
export function createMinimalPoolKeywords(
  overrides: Partial<AggregatedWeaponKeywords> = {}
): AggregatedWeaponKeywords {
  return {
    criticalX: 0,
    lethalX: 0,
    pierceX: 0,
    impactX: 0,
    ramX: 0,
    blast: false,
    suppressive: false,
    highVelocity: false,
    ...overrides,
  };
}
```

### 2.5D.3 — Test File Migration Guide

Each test file needs updates. The pattern for each:

**`attackPool.test.ts`** — High impact. Rewrite configs to use `weapons[]`. Add multi-weapon Spray tests.

**`attackModifiers.test.ts`** — Medium impact. Add `poolKeywords` parameter to all `modifyAttackDice()` calls. Replace `config.attacker.impactX: 2` with `poolKeywords: createMinimalPoolKeywords({ impactX: 2 })`.

**`attackSurges.test.ts`** — Medium impact. Add `poolKeywords` parameter to `convertAttackSurges()` calls. Replace `config.attacker.criticalX` with `poolKeywords.criticalX`.

**`dodgeCover.test.ts`** — Medium impact. Add `poolKeywords` parameter. Replace blast/highVelocity reads.

**`cover.test.ts`** — Low-medium impact. Add `poolBlast` parameter to `determineCoverValue()` calls.

**`defenseRoll.test.ts`** — Low impact. Add `poolPierceX` parameter if Impervious tests exist.

**`defenseSurges.test.ts`** — No changes expected (no weapon keyword reads).

**`compareResults.test.ts`** — Medium impact. Add `poolKeywords` parameter. Replace pierce/suppressive/blast reads.

**`attackSequence.test.ts`** — Medium impact. Update top-level configs to use weapons[]. The orchestrator handles aggregation internally.

**`dice.test.ts`** — No changes (dice rolling has no config dependency).

**`App.test.tsx`** — No changes (UI smoke test).

---

## Step 2.5E — Update Sequence Orchestrator

**File:** `src/engine/attackSequence.ts`

After `formAttackPool`, call `aggregateWeaponKeywords` and pass the result to downstream steps:

```ts
import { aggregateWeaponKeywords } from './attackPool';

export function executeAttackSequence(config: AttackConfig): AttackResult {
  // Step 2 — Form Attack Pool (per-weapon Spray applied here)
  const poolAfterStep2 = formAttackPool(config);

  // Aggregate weapon keywords for pool-level usage
  const poolKeywords = aggregateWeaponKeywords(config.attacker.weapons);

  // Step 4a — Upgrade/Downgrade Attack Dice
  const poolAfterStep4a = upgradeDowgradeAttackDice(poolAfterStep2, config);

  // Step 4b — Roll Attack Dice
  const rolledAttack = rollAttackDice(poolAfterStep4a);

  // Step 4c — Reroll Attack Dice
  const { results: afterRerolls, aimsSpent, pierceBonus, aimsSavedForMarksman } =
    rerollAttackDice(rolledAttack, config);

  // Step 4d — Convert Attack Surges (needs poolKeywords.criticalX)
  const afterSurgeConversion = convertAttackSurges(afterRerolls, config, poolKeywords);

  // Step 4d.5 — Apply Marksman
  const afterMarksman = applyMarksman(afterSurgeConversion, config, aimsSavedForMarksman);

  // Step 4d.6 — Apply Jar'Kai Mastery
  const afterJarKai = applyJarKai(afterMarksman, config);

  // Step 5 — Apply Dodge and Cover (needs poolKeywords.blast, .highVelocity)
  const { hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, blanks: blanksAfterDodgeCover, dodgeWasSpent } =
    applyDodgeAndCover(afterJarKai, config, poolKeywords);

  // Step 6 — Modify Attack Dice (needs poolKeywords.impactX, .ramX, .lethalX)
  const { hits, crits, lethalPierce, guardianHits } =
    modifyAttackDice(
      { hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, blanks: blanksAfterDodgeCover },
      config,
      aimsSpent,
      aimsSavedForMarksman,
      poolKeywords
    );

  // Step 6b — Roll Guardian Defense
  let guardianWoundsNoPierce = 0;
  let guardianBlocks = 0;
  let guardianDeflectWounds = 0;
  if (guardianHits > 0 && config.defender.guardianX > 0) {
    const guardianResult = rollGuardianDefense(guardianHits, config);
    guardianWoundsNoPierce = guardianResult.guardianWoundsNoPierce;
    guardianBlocks = guardianResult.guardianBlocks;
    guardianDeflectWounds = guardianResult.guardianDeflectWounds;
  }

  // Step 7 — Roll Defense Dice (needs poolKeywords.pierceX for Impervious)
  const { results: defenseResults, surgeCountBeforeConversion } =
    rollDefenseDice({ hits, crits }, config, lethalPierce, pierceBonus, dodgeWasSpent, poolKeywords.pierceX);

  // Step 7e — Convert Defense Surges
  const defenseAfterSurgeConversion = convertDefenseSurges(defenseResults, config, dodgeWasSpent);

  // Step 8 — Modify Defense Dice (needs poolKeywords.pierceX)
  const { blocks: mainTargetBlocks } = modifyDefenseDice(
    defenseAfterSurgeConversion,
    config,
    dodgeWasSpent,
    poolKeywords.pierceX
  );

  // Step 9 — Compare Results (needs poolKeywords.pierceX, .suppressive, .blast)
  const finalResult = compareResults(
    { hits, crits },
    { mainTargetBlocks, guardianBlocks, guardianHits },
    config,
    poolKeywords,
    lethalPierce,
    pierceBonus,
    surgeCountBeforeConversion,
    rolledAttack,
    guardianWoundsNoPierce,
    guardianDeflectWounds,
    dodgeWasSpent
  );

  return finalResult;
}
```

---

## Step 2.5F — Validation

1. **Run full test suite:** `npx vitest run` — all existing tests must pass
2. **Run coverage:** `npx vitest run --coverage` — no coverage drops
3. **New tests specifically validate:**
   - `aggregateWeaponKeywords` — correct sum/OR/AND behavior
   - `formAttackPool` with mixed Spray + non-Spray weapons
   - `formAttackPool` with single Spray weapon matches old behavior
   - End-to-end `executeAttackSequence` with multi-weapon config
   - End-to-end `executeAttackSequence` with single-weapon config matches old results

---

## Implementation Order

Execute steps in this order to minimize broken-state time:

```
2.5A  (types)           ← Everything breaks (expected)
2.5D.1 (test helpers)   ← Helpers compile but tests still fail
2.5B  (pool + aggregate) ← attackPool compiles
2.5C  (step signatures)  ← Step functions compile
2.5E  (orchestrator)     ← attackSequence compiles
2.5D.3 (test migration)  ← Tests compile and pass
2.5F  (validation)       ← Full green
```

---

## Downstream Impact Summary

### Phase 5A (State Management) — Impact: **High**

The Zustand `AttackConfigState` currently mirrors the flat `AttackerConfig` shape. With this change:
- **Remove flat dice/keyword fields** from the store (`redDice`, `blackDice`, `whiteDice`, `pierceX`, `impactX`, etc.)
- **Add `weapons: WeaponProfile[]`** to the store
- **Custom Pool mode:** The store manages a single weapon. The UI's "Dice Pool" and "Keywords" sections map to `weapons[0].redDice`, `weapons[0].keywords.pierceX`, etc.
- **Unit Builder mode (future):** The store manages multiple weapons. The UI shows per-weapon rows.
- **`selectAttackerConfig`** still produces a valid `AttackerConfig` — just with the new shape
- **`loadPreset`** must construct `weapons[]` from the preset profile

### Phase 5.5 (Unit Data & Upgrades) — Impact: **Medium**

- The `WeaponProfile` type in `src/data/types.ts` should be replaced with or aligned to `src/engine/types.ts`'s `WeaponProfile`
- The preset generator must produce `AttackerPresetProfile` with `weapons: WeaponProfile[]` instead of flat dice/keyword fields
- Unit enrichment (`src/data/enrichment/units.ts`) already defines weapon profiles per-weapon — these map directly to `WeaponProfile[]`
- Decision #8 ("each preset bakes in combined dice") evolves: presets can now represent the actual weapon breakdown, not just a pre-combined pool

### Phase 6 (UI Panels) — Impact: **High**

- Two-mode design: **Custom Pool** tab and **Unit Builder** tab on the attacker panel
- Custom Pool mode: existing flat controls map to `weapons[0].*` and `weapons[0].keywords.*`
- Unit Builder mode: weapon selection from unit data, per-weapon rows, auto Spray calculation
- See the separate wireframe document (`plans/wireframe-two-modes.md`) for detailed UI spec

### Phase 3 (Simulator) — Impact: **None**

The simulator calls `executeAttackSequence(config)`. The config shape change is transparent to it.

### Phase 7 (Results Panel) — Impact: **None**

Reads from the results store; doesn't touch `AttackerConfig` directly.

---

## Files Modified

| File | Change Type | Description |
|------|------------|-------------|
| `src/engine/types.ts` | **Major** | Add `WeaponKeywords`, `WeaponProfile`, `AggregatedWeaponKeywords`; restructure `AttackerConfig` |
| `src/engine/attackPool.ts` | **Major** | Rewrite `formAttackPool`; add `aggregateWeaponKeywords` |
| `src/engine/attackSequence.ts` | **Medium** | Call `aggregateWeaponKeywords`; pass `poolKeywords` to 5 steps |
| `src/engine/attackSurges.ts` | **Low** | Add `poolKeywords` param; `criticalX` from pool |
| `src/engine/attackModifiers.ts` | **Low** | Add `poolKeywords` param; `impactX`/`ramX`/`lethalX` from pool |
| `src/engine/dodgeCover.ts` | **Low** | Add `poolKeywords` param; `blast`/`highVelocity` from pool |
| `src/engine/cover.ts` | **Low** | Add `poolBlast` param; `blast` from pool instead of attacker |
| `src/engine/defenseModifiers.ts` | **Low** | Add `poolPierceX` param |
| `src/engine/defenseRoll.ts` | **Low** | Add `poolPierceX` param (Impervious) |
| `src/engine/compareResults.ts` | **Low** | Add `poolKeywords` param; `pierceX`/`suppressive`/`blast` from pool |
| `src/engine/testHelpers.ts` | **Medium** | Add `createMinimalWeapon`, `createMinimalWeaponKeywords`, `createAttackerWithWeapon`, `createMinimalPoolKeywords`; update `createMinimalAttacker` |
| `src/engine/attackPool.test.ts` | **Medium** | Update configs; add multi-weapon tests |
| `src/engine/attackModifiers.test.ts` | **Medium** | Pass `poolKeywords` to calls |
| `src/engine/attackSurges.test.ts` | **Medium** | Pass `poolKeywords` to calls |
| `src/engine/dodgeCover.test.ts` | **Medium** | Pass `poolKeywords` to calls |
| `src/engine/cover.test.ts` | **Low** | Pass `poolBlast` to calls |
| `src/engine/defenseRoll.test.ts` | **Low** | Pass `poolPierceX` if needed |
| `src/engine/compareResults.test.ts` | **Medium** | Pass `poolKeywords` to calls |
| `src/engine/attackSequence.test.ts` | **Medium** | Update configs to use `weapons[]` |
| `src/engine/index.ts` | **Low** | Export new types and `aggregateWeaponKeywords` |
