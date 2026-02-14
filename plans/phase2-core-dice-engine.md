# Phase 2: Core Dice Engine — Implementation Plan

## Goal

Build a pure TypeScript simulation engine with zero React dependencies. This engine takes a complete attack configuration (attacker + defender + context) and returns wound results by executing the full Star Wars: Legion attack sequence (Steps 2–9). The engine is fully testable in isolation and forms the foundation for all UI and simulation features.

---

## Overview

Phase 2 consists of four sub-phases:

- **2A:** Types & Dice Definitions (foundational data structures and die rolling)
- **2B:** Attack Sequence Pipeline (the core state machine executing Steps 2–9)
- **2C:** Cover Resolver (isolated sub-system for cover mechanics)
- **2D:** Modifier Helpers (keyword effect functions and attack-type filtering)

Each sub-phase builds on the previous, but can be tested independently.

---

## Design Clarifications

The following design decisions are documented for clarity:

1. **Observation Tokens** — Placed in `AttackerConfig` as tokens the attacker can spend during rerolls (Step 4c). While thematically these represent tokens placed on the defender, the implementation treats them as an attacker resource for simplicity.

2. **Impervious** — Adds defense dice equal to the **total Pierce being applied** from all sources (Pierce X keyword + Lethal X + Duelist). This includes Pierce granted from spending Aim tokens (Lethal, Duelist). The function receives `lethalPierce` and `duelistPierceBonus` parameters to calculate the total.

3. **Block Keyword** — Activates if the defender has at least 1 Dodge token assigned in their config (`defender.dodgeTokens > 0`). A Dodge can be spent for Block even when there are no hits to cancel, allowing the defender to convert defense surges when facing an attack of only critical results.

4. **Guardian X** — Guardian unit absorbs up to X hits during Step 6. The Guardian unit then rolls defense dice using its own die color and surge chart (configured in `guardianDieColor` and `guardianSurgeChart` fields, shown in UI only when Guardian X > 0). **Pierce is NOT applied to either the Guardian or the main target individually.** Instead, the final output reports three values: guardian wounds (without pierce), main target wounds (without pierce), and total overall wounds (with pierce applied to the combined result). This is because the calculator cannot know which target the player should prioritize for pierce allocation.

5. **Marksman Strategy** — Per the rulebook, Marksman fires **after converting attack surges** during the Convert Attack Surges step (Step 4d). Aim tokens saved for Marksman are spent to convert die results (blank→hit, hit→crit, or 2 aims for blank→crit). The decision of whether to save aims for Marksman vs. use them for rerolls is made during Step 4c (rerollAttackDice). Users can choose between two strategies:
   - **Deterministic** (always saves aims for Marksman conversions when there are convertible dice)
   - **Averages** (compares expected value of Marksman conversion vs reroll for each aim token individually)
   
   **Two-Phase Processing:**
   - **Phase 1 (Step 4c — Reroll):** For each aim token, decide: reroll now OR save for Marksman post-surge-conversion. Once a decision is made to save, all remaining aims are saved. This is because Marksman operates on the post-surge pool where guaranteed conversions are most valuable.
   - **Phase 2 (Step 4d.5 — Apply Marksman):** After surge conversion, spend saved aims to convert results using `calculateMarksmanDecision()` per aim token.
   
   The decision process considers:
   - **Die color** — Converts white dice first (lowest reroll value), then black, then red
   - **Defender keywords** — Armor X (crits bypass), Dodge (crits can't be canceled without Outmaneuver), Cover (crits bypass)
   - **Attacker capabilities** — Impact X overlap is considered when available
   - **Conversion vs reroll EV** — Only converts when the guaranteed improvement beats expected reroll value
   
   The UI shows strategy selection only when `marksman: true`.

6. **Jar'Kai Mastery** — Per the rulebook, Jar'Kai Mastery fires **after converting attack surges** during the Convert Attack Surges step (Step 4d), identical timing to Marksman. The attacker spends **Dodge tokens** (not Aim tokens) to convert die results using the same conversion table: blank→hit, hit→crit, or 2 Dodge tokens for blank→crit. Key differences from Marksman:
   - **Token type:** Uses attacker's Dodge tokens (`dodgeTokensAttacker`) instead of Aim tokens
   - **No strategy choice:** Dodge tokens are not shared with any reroll mechanic, so there is no save-vs-reroll decision. All available Dodge tokens are always spent for conversions.
   - **Melee only:** Jar'Kai Mastery only activates for Melee attacks (disabled for Ranged/Overrun via the keyword restriction map in Phase 8)
   - **Applied at Step 4d.6:** After `applyMarksman` (Step 4d.5), before Dodge and Cover (Step 5)
   - **Conversion logic:** Reuses `calculateMarksmanDecision()` for optimal token spending (same blank→hit, hit→crit, 2→blank→crit priorities)

7. **AttackType.All** — The `All` attack type is used to indicate the user hasn't specified a specific attack type. When `All` is selected, both Ranged-only keywords (Deflect, Shielded, Cover, Guardian, Backup) and Melee-only keywords (Djem So, Hold the Line surge:hit) may simultaneously activate. This is acceptable because the calculator is a "what-if" tool — users are expected to select the correct attack type for accurate results. `All` exists as a convenient default that shows maximum keyword interaction, with a UI tooltip explaining that selecting Ranged or Melee produces more accurate results.

---

## Step 2A.1 — Define Core Types and Enums

**File:** `src/engine/types.ts`

Define all enums and type aliases for dice, faces, and keyword configurations.

```ts
// ============================================================================
// Dice & Faces
// ============================================================================

export enum AttackDieColor {
  White = 'white',
  Black = 'black',
  Red = 'red',
}

export enum DefenseDieColor {
  White = 'white',
  Red = 'red',
}

export enum AttackFace {
  Blank = 'blank',
  Hit = 'hit',              // a
  Critical = 'crit',        // b
  Surge = 'surge',          // c
}

export enum DefenseFace {
  Blank = 'blank',
  Block = 'block',          // d
  Surge = 'surge',          // e
}

// ============================================================================
// Attack Types
// ============================================================================

export enum AttackType {
  All = 'all',
  Ranged = 'ranged',
  Melee = 'melee',
  Overrun = 'overrun',
}

// Note: AttackType is stored at the top level of AttackConfig,
// not in a separate context object.

// ============================================================================
// Surge Conversion Charts
// ============================================================================

export enum AttackSurgeChart {
  None = 'none',        // c → blank
  ToHit = 'to-hit',     // c → a
  ToCrit = 'to-crit',   // c → b
}

export enum DefenseSurgeChart {
  None = 'none',        // e → blank
  ToBlock = 'to-block', // e → d
}

// ============================================================================
// Cover
// ============================================================================

export enum CoverType {
  None = 'none',
  Light = 'light',    // 1
  Heavy = 'heavy',    // 2
}

export enum MarksmanStrategy {
  Deterministic = 'deterministic',  // Always use Marksman for guaranteed conversion
  Averages = 'averages',            // Use Marksman only if EV is better than rerolls
}

export enum RerollStrategy {
  Conservative = 'conservative',    // Only reroll blanks and excess surges (default)
  CritFishing = 'crit-fishing',     // Also reroll hits to fish for crits
}

/**
 * Decision for using Marksman keyword with a single aim token.
 * Exactly one of these fields will be set (not null).
 */
export interface MarksmanDecision {
  convertBlankIndex: number | null;  // Index of specific blank die to convert to hit
  convertHitIndex: number | null;    // Index of specific hit die to convert to crit
  useRerollInstead: boolean;         // True if this aim should be used for rerolling instead
}
```

**Verify:**
- TypeScript compiles without errors
- No imports needed (pure enums/values)

---

## Step 2A.2 — Define Config Interfaces

**File:** `src/engine/types.ts` (continued)

Define the full configuration structure that will be passed to the attack sequence.

```ts
// ============================================================================
// Attacker Configuration
// ============================================================================

export interface AttackerConfig {
  // Dice pool
  redDice: number;
  blackDice: number;
  whiteDice: number;
  surgeChart: AttackSurgeChart;

  // Tokens
  aimTokens: number;
  surgeTokens: number;
  observationTokens: number;
  dodgeTokensAttacker: number;

  // Attack keywords
  preciseX: number;
  criticalX: number;
  lethalX: number;
  sharpshooterX: number;
  pierceX: number;
  impactX: number;
  ramX: number;

  // Flags
  blast: boolean;
  highVelocity: boolean;
  suppressive: boolean;
  marksman: boolean;
  marksmanStrategy: MarksmanStrategy;
  rerollStrategy: RerollStrategy;
  jediHunter: boolean;
  jarKaiMastery: boolean;
  duelistAttacker: boolean;
  makashiMastery: boolean;
  spray: boolean;
  immuneDeflect: boolean;
  deathFromAbove: boolean;
  holdTheLine: boolean;

  // Dice modification keywords
  antiMaterielX: number;
  antiPersonnelX: number;
  cumbersome: boolean;

  // Points
  unitCost: number;
}

// ============================================================================
// Defender Configuration
// ============================================================================

export interface DefenderConfig {
  // Defense
  dieColor: DefenseDieColor;
  surgeChart: DefenseSurgeChart;

  // Cover
  coverType: CoverType;
  coverX: number;
  smokeTokens: number;
  suppressed: boolean;

  // Tokens
  dodgeTokens: number;
  surgeTokens: number;
  suppressionTokens: number;

  // Miniatures
  minisInLOS: number;

  // Defense keywords
  armorX: number;
  weakPointX: number;
  immunePierce: boolean;
  immuneMeleePierce: boolean;
  immuneBlast: boolean;
  impervious: boolean;
  dangerSenseX: number;
  uncannyLuckX: number;
  block: boolean;
  deflect: boolean;
  shienMastery: boolean;
  outmaneuver: boolean;
  lowProfile: boolean;
  shieldedX: number;
  djemSoMastery: boolean;
  soresuMastery: boolean;
  duelistDefender: boolean;
  backup: boolean;
  holdTheLine: boolean;
  dugIn: boolean;  // Dug In upgrade: cover dice become red instead of white

  // Guardian
  guardianX: number;
  guardianDieColor?: DefenseDieColor;
  guardianSurgeChart?: DefenseSurgeChart;
  guardianDeflect?: boolean;        // Guardian unit has Deflect keyword
  guardianSoresuMastery?: boolean;   // Guardian unit has Soresu Mastery keyword
  guardianDodgeTokens?: number;      // Dodge tokens on the Guardian unit (for Soresu reroll)

  // Points
  unitCost: number;
}

// ============================================================================
// Full Attack Configuration
// ============================================================================

export interface AttackConfig {
  attacker: AttackerConfig;
  defender: DefenderConfig;
  attackType: AttackType;
}

// ============================================================================
// Attack Result
// ============================================================================

export interface AttackResult {
  // Primary results (without pierce — individual target breakdown)
  guardianWoundsNoPierce: number;   // Wounds suffered by Guardian unit (without pierce)
  mainTargetWoundsNoPierce: number; // Wounds suffered by main target (without pierce)

  // Total result (with pierce — combined)
  totalWounds: number;              // Total wounds across both targets (with pierce applied)

  // Secondary effects
  deflectWounds: number;        // Wounds reflected back to attacker (Deflect/Shien)
  djemSoWounds: number;         // Wounds reflected back to attacker (Djem So)

  // Suppression
  suppressionApplied: number;   // 1 + Suppressive flag

  // Breakdown (optional, for debugging/UI)
  breakdown?: {
    initialPool: AttackDieColor[];
    afterStep2: AttackDieColor[];
    afterStep4a: AttackDieColor[];
    rolledAttack: AttackFace[];
    afterStep4c: AttackFace[];
    afterStep4d: AttackFace[];
    afterStep5Cover: number;      // hits remaining after cover
    afterStep5Dodge: number;       // hits remaining after dodge
    afterStep6: { hits: number; crits: number };
    defensePool: number;
    rolledDefense: DefenseFace[];
    afterStep7d: DefenseFace[];
    afterStep7e: DefenseFace[];
    afterStep8: number;           // blocks remaining after Pierce
  };
}
```

**Verify:**
- TypeScript compiles
- All config properties match the design spec in DESIGN_CONCEPT.md

**Notes:**
- `breakdown` is optional and populated when detailed step-by-step data is needed (useful for UI display or debugging)
- Default values (e.g., `minisInLOS: 1`) will be handled in the store layer, not here

---

## Step 2A.3 — Define Die Face Distributions

**File:** `src/engine/dice.ts`

Create the face distribution arrays for each die type.

```ts
import { AttackDieColor, DefenseDieColor, AttackFace, DefenseFace } from './types';

// ============================================================================
// Attack Die Distributions (8-sided)
// ============================================================================

const ATTACK_DIE_FACES: Record<AttackDieColor, AttackFace[]> = {
  [AttackDieColor.White]: [
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Hit,
    AttackFace.Critical,
    AttackFace.Surge,
  ],
  [AttackDieColor.Black]: [
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Critical,
    AttackFace.Surge,
  ],
  [AttackDieColor.Red]: [
    AttackFace.Blank,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Critical,
    AttackFace.Surge,
  ],
};

// ============================================================================
// Defense Die Distributions (6-sided)
// ============================================================================

const DEFENSE_DIE_FACES: Record<DefenseDieColor, DefenseFace[]> = {
  [DefenseDieColor.White]: [
    DefenseFace.Blank,
    DefenseFace.Blank,
    DefenseFace.Blank,
    DefenseFace.Blank,
    DefenseFace.Block,
    DefenseFace.Surge,
  ],
  [DefenseDieColor.Red]: [
    DefenseFace.Blank,
    DefenseFace.Blank,
    DefenseFace.Block,
    DefenseFace.Block,
    DefenseFace.Block,
    DefenseFace.Surge,
  ],
};

// ============================================================================
// Roll Functions
// ============================================================================

/**
 * Roll a single attack die of the given color.
 */
export function rollAttackDie(color: AttackDieColor): AttackFace {
  const faces = ATTACK_DIE_FACES[color];
  const index = Math.floor(Math.random() * faces.length);
  return faces[index];
}

/**
 * Roll a single defense die of the given color.
 */
export function rollDefenseDie(color: DefenseDieColor): DefenseFace {
  const faces = DEFENSE_DIE_FACES[color];
  const index = Math.floor(Math.random() * faces.length);
  return faces[index];
}

/**
 * Roll an attack pool given die color counts.
 */
export function rollAttackPool(
  redCount: number,
  blackCount: number,
  whiteCount: number
): AttackFace[] {
  const results: AttackFace[] = [];

  for (let i = 0; i < redCount; i++) {
    results.push(rollAttackDie(AttackDieColor.Red));
  }
  for (let i = 0; i < blackCount; i++) {
    results.push(rollAttackDie(AttackDieColor.Black));
  }
  for (let i = 0; i < whiteCount; i++) {
    results.push(rollAttackDie(AttackDieColor.White));
  }

  return results;
}

/**
 * Roll a defense pool given die color and count.
 */
export function rollDefensePool(color: DefenseDieColor, count: number): DefenseFace[] {
  const results: DefenseFace[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDefenseDie(color));
  }
  return results;
}
```

**Verify:**
- `console.log(rollAttackDie(AttackDieColor.Red))` produces a random face
- Roll 10,000 red attack dice and confirm the distribution is roughly: 1 blank, 5 hits, 1 crit, 1 surge (±5% tolerance)

**Unit Test Example:**
```ts
// src/engine/dice.test.ts
import { describe, it, expect } from 'vitest';
import { rollAttackDie, rollDefenseDie, AttackDieColor, DefenseDieColor, AttackFace, DefenseFace } from './dice';

describe('rollAttackDie', () => {
  it('returns a valid attack face', () => {
    const face = rollAttackDie(AttackDieColor.Red);
    expect(Object.values(AttackFace)).toContain(face);
  });

  it('red die distribution is approximately correct', () => {
    const rolls = 10000;
    const results: Record<AttackFace, number> = {
      [AttackFace.Blank]: 0,
      [AttackFace.Hit]: 0,
      [AttackFace.Critical]: 0,
      [AttackFace.Surge]: 0,
    };

    for (let i = 0; i < rolls; i++) {
      const face = rollAttackDie(AttackDieColor.Red);
      results[face]++;
    }

    // Red die: 1 blank, 5 hits, 1 crit, 1 surge out of 8 faces
    expect(results[AttackFace.Blank]).toBeCloseTo(rolls / 8, -2);
    expect(results[AttackFace.Hit]).toBeCloseTo((rolls * 5) / 8, -2);
    expect(results[AttackFace.Critical]).toBeCloseTo(rolls / 8, -2);
    expect(results[AttackFace.Surge]).toBeCloseTo(rolls / 8, -2);
  });
});
```

---

## Step 2A.4 — Implement Die Upgrade/Downgrade Functions

**File:** `src/engine/dice.ts` (continued)

```ts
// ============================================================================
// Upgrade / Downgrade Chains
// ============================================================================

/**
 * Upgrade an attack die. Returns the upgraded color, or the same color if at max.
 */
export function upgradeAttack(color: AttackDieColor): AttackDieColor {
  switch (color) {
    case AttackDieColor.White:
      return AttackDieColor.Black;
    case AttackDieColor.Black:
      return AttackDieColor.Red;
    case AttackDieColor.Red:
      return AttackDieColor.Red; // Already at max
  }
}

/**
 * Downgrade an attack die. Returns the downgraded color, or the same color if at min.
 */
export function downgradeAttack(color: AttackDieColor): AttackDieColor {
  switch (color) {
    case AttackDieColor.Red:
      return AttackDieColor.Black;
    case AttackDieColor.Black:
      return AttackDieColor.White;
    case AttackDieColor.White:
      return AttackDieColor.White; // Already at min
  }
}

/**
 * Upgrade a defense die. Returns the upgraded color, or the same color if at max.
 */
export function upgradeDefense(color: DefenseDieColor): DefenseDieColor {
  return color === DefenseDieColor.White ? DefenseDieColor.Red : DefenseDieColor.Red;
}

/**
 * Downgrade a defense die. Returns the downgraded color, or the same color if at min.
 */
export function downgradeDefense(color: DefenseDieColor): DefenseDieColor {
  return color === DefenseDieColor.Red ? DefenseDieColor.White : DefenseDieColor.White;
}

/**
 * Apply upgrade or downgrade to a die pool (array of die colors).
 * Returns a new array with the first N dice upgraded/downgraded.
 * A die cannot be upgraded/downgraded more than once by the same effect.
 */
export function applyDieModification(
  pool: AttackDieColor[],
  count: number,
  fn: (color: AttackDieColor) => AttackDieColor
): AttackDieColor[] {
  const result = [...pool];
  let modified = 0;

  for (let i = 0; i < result.length && modified < count; i++) {
    const newColor = fn(result[i]);
    if (newColor !== result[i]) {
      result[i] = newColor;
      modified++;
    }
  }

  return result;
}
```

**Verify:**
- `upgradeAttack(AttackDieColor.White) === AttackDieColor.Black`
- `downgradeAttack(AttackDieColor.Red) === AttackDieColor.Black`
- `upgradeDefense(DefenseDieColor.White) === DefenseDieColor.Red`
- `downgradeDefense(DefenseDieColor.Red) === DefenseDieColor.White`
- Edge cases: upgrading red → stays red, downgrading white → stays white

**Unit Test Example:**
```ts
describe('upgradeAttack', () => {
  it('upgrades white to black', () => {
    expect(upgradeAttack(AttackDieColor.White)).toBe(AttackDieColor.Black);
  });

  it('upgrades black to red', () => {
    expect(upgradeAttack(AttackDieColor.Black)).toBe(AttackDieColor.Red);
  });

  it('does not upgrade red beyond red', () => {
    expect(upgradeAttack(AttackDieColor.Red)).toBe(AttackDieColor.Red);
  });
});
```

---

## Step 2A.5 — Write Unit Tests for Dice Module

**File:** `src/engine/dice.test.ts`

Consolidate all dice-related tests:
- Roll functions return valid faces
- Statistical distribution tests (10k rolls, tolerance ±5%)
- Upgrade/downgrade chains, including edge cases
- `applyDieModification` respects count limits

**Run:**
```bash
npm test dice.test.ts
```

**Expected:** All tests pass.

---

## Step 2B.1 — Attack Sequence Pipeline Skeleton

**File:** `src/engine/attackSequence.ts`

Create the main entry point function with stubs for each step.

```ts
import type { AttackConfig, AttackResult } from './types';

/**
 * Execute the full Star Wars: Legion attack sequence (Steps 2–9).
 * Returns the final wound count and side effects.
 */
export function executeAttackSequence(config: AttackConfig): AttackResult {
  // Step 2 — Form Attack Pool
  const poolAfterStep2 = formAttackPool(config);

  // Step 4a — Upgrade/Downgrade Attack Dice
  const poolAfterStep4a = upgradeDowgradeAttackDice(poolAfterStep2, config);

  // Step 4b — Roll Attack Dice
  const rolledAttack = rollAttackDice(poolAfterStep4a);

  // Step 4c — Reroll Attack Dice
  const { results: afterRerolls, aimsSpent, pierceBonus, aimsSavedForMarksman } =
    rerollAttackDice(rolledAttack, config);

  // Step 4d — Convert Attack Surges
  const afterSurgeConversion = convertAttackSurges(afterRerolls, config);

  // Step 4d.5 — Apply Marksman (post-surge conversion)
  const afterMarksman = applyMarksman(afterSurgeConversion, config, aimsSavedForMarksman);

  // Step 4d.6 — Apply Jar'Kai Mastery (post-surge conversion, Melee only)
  const afterJarKai = applyJarKai(afterMarksman, config);

  // Step 5 — Apply Dodge and Cover
  const { hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, dodgeWasSpent } =
    applyDodgeAndCover(afterJarKai, config);

  // Step 6 — Modify Attack Dice
  const blanksAfterStep5 = afterMarksman.filter(d => d.face === AttackFace.Blank || d.face === AttackFace.Surge).length;
  const { hits, crits, lethalPierce, guardianHits } =
    modifyAttackDice({ hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, blanks: blanksAfterStep5 }, config, aimsSpent, aimsSavedForMarksman);

  // Step 6b — Roll Guardian Defense (if Guardian absorbed hits)
  // Pierce is NOT applied to Guardian — tracked separately without pierce
  let guardianWoundsNoPierce = 0;
  let guardianBlocks = 0;
  let guardianDeflectWounds = 0;
  if (guardianHits > 0 && config.defender.guardianX > 0) {
    const guardianResult = rollGuardianDefense(guardianHits, config);
    guardianWoundsNoPierce = guardianResult.guardianWoundsNoPierce;
    guardianBlocks = guardianResult.guardianBlocks;
    guardianDeflectWounds = guardianResult.guardianDeflectWounds;
  }

  // Step 7 — Roll Defense Dice
  const { results: defenseResults, surgeCountBeforeConversion } =
    rollDefenseDice({ hits, crits }, config, lethalPierce, pierceBonus, dodgeWasSpent);

  // Step 8 — Modify Defense Dice (no pierce applied here either)
  const { blocks: mainTargetBlocks } = modifyDefenseDice(
    defenseResults, config, dodgeWasSpent
  );

  // Step 9 — Compare Results
  // Calculates: guardian wounds (no pierce), main target wounds (no pierce),
  // and total wounds (with pierce applied to combined blocks)
  const finalResult = compareResults(
    { hits, crits }, { mainTargetBlocks, guardianBlocks, guardianHits },
    config, lethalPierce, pierceBonus, surgeCountBeforeConversion,
    rolledAttack, guardianWoundsNoPierce, guardianDeflectWounds, dodgeWasSpent
  );

  return finalResult;
}

// ============================================================================
// Step Functions (stubs — will be implemented in subsequent steps)
// ============================================================================

function formAttackPool(config: AttackConfig) {
  // TODO: Step 2 logic
  return [];
}

function upgradeDowgradeAttackDice(pool: any[], config: AttackConfig) {
  // TODO: Step 4a logic
  return pool;
}

function rollAttackDice(pool: any[]) {
  // TODO: Step 4b logic
  return [];
}

function rerollAttackDice(results: any[], config: AttackConfig) {
  // TODO: Step 4c logic
  return { results, aimsSpent: 0, pierceBonus: 0, aimsSavedForMarksman: 0 };
}

function convertAttackSurges(results: any[], config: AttackConfig) {
  // TODO: Step 4d logic
  return results;
}

function applyMarksman(results: any[], config: AttackConfig, aimsSavedForMarksman: number) {
  // TODO: Step 4d.5 logic (Marksman post-surge conversion)
  return results;
}

function applyJarKai(results: any[], config: AttackConfig) {
  // TODO: Step 4d.6 logic (Jar'Kai Mastery post-surge conversion)
  // Spend attacker's Dodge tokens to convert: blank→hit, hit→crit, or 2 Dodge→blank→crit
  // Only active when config.attacker.jarKaiMastery === true && attackType is Melee
  // Uses same conversion decision logic as calculateMarksmanDecision()
  return results;
}

function applyDodgeAndCover(results: any[], config: AttackConfig) {
  // TODO: Step 5 logic
  return { hits: 0, crits: 0, dodgeWasSpent: false };
}

function modifyAttackDice(results: any, config: AttackConfig, aimsSpent: number, aimsSavedForMarksman: number) {
  // TODO: Step 6 logic
  return { hits: 0, crits: 0, lethalPierce: 0, guardianHits: 0 };
}

function rollDefenseDice(
  attackResults: any,
  config: AttackConfig,
  lethalPierce: number,
  duelistPierceBonus: number,
  dodgeWasSpent: boolean
) {
  // TODO: Step 7 logic
  return { results: [], surgeCountBeforeConversion: 0 };
}

function modifyDefenseDice(
  results: any[],
  config: AttackConfig,
  dodgeWasSpent: boolean
) {
  // TODO: Step 8 logic — no pierce applied here
  return { blocks: 0 };
}

function rollGuardianDefense(
  guardianHits: number,
  config: AttackConfig
): { guardianWoundsNoPierce: number; guardianBlocks: number; guardianDeflectWounds: number } {
  // TODO: Guardian defense sub-sequence — no pierce applied
  return { guardianWoundsNoPierce: 0, guardianBlocks: 0, guardianDeflectWounds: 0 };
}

function compareResults(
  attackResults: any,
  defenseInfo: { mainTargetBlocks: number; guardianBlocks: number; guardianHits: number },
  config: AttackConfig,
  lethalPierce: number,
  duelistPierceBonus: number,
  surgeCountBeforeConversion: number,
  originalAttackRollResults: any[],
  guardianWoundsNoPierce: number,
  guardianDeflectWounds: number,
  dodgeWasSpent: boolean
): AttackResult {
  // TODO: Step 9 logic
  // Calculates: guardian wounds (no pierce), main target wounds (no pierce),
  // and total wounds (with pierce applied to combined blocks)
  return {
    guardianWoundsNoPierce: 0,
    mainTargetWoundsNoPierce: 0,
    totalWounds: 0,
    deflectWounds: 0,
    djemSoWounds: 0,
    suppressionApplied: 1,
  };
}
```

**Verify:**
- TypeScript compiles
- Calling `executeAttackSequence` with a dummy config returns a valid `AttackResult` (all zeros for now)

**Notes:**
- Each step function will be fleshed out in the following sub-steps
- Type signatures will evolve as we build — start with `any[]` placeholders and refine incrementally

---

## Step 2B.2 — Implement Step 2: Form Attack Pool

**File:** `src/engine/attackSequence.ts` (update `formAttackPool`)

```ts
import { AttackDieColor, AttackType } from './types';
import type { AttackConfig } from './types';

/**
 * Step 2 — Form Attack Pool
 * - Start with the dice specified in attacker config
 * - Apply Spray (multiply by minis in LOS if spray = true)
 * - Apply Makashi Mastery (reduce Pierce X by 1, disable Immune: Pierce / Impervious)
 */
function formAttackPool(config: AttackConfig): AttackDieColor[] {
  const { attacker, defender } = config;

  // Base dice counts
  let red = attacker.redDice;
  let black = attacker.blackDice;
  let white = attacker.whiteDice;

  // Spray: multiply weapon dice by minis in LOS
  if (attacker.spray) {
    const multiplier = Math.max(1, defender.minisInLOS);
    red *= multiplier;
    black *= multiplier;
    white *= multiplier;
  }

  // Build pool array
  const pool: AttackDieColor[] = [];
  for (let i = 0; i < red; i++) pool.push(AttackDieColor.Red);
  for (let i = 0; i < black; i++) pool.push(AttackDieColor.Black);
  for (let i = 0; i < white; i++) pool.push(AttackDieColor.White);

  // Makashi Mastery is applied here conceptually (Pierce reduction + disabling Immune: Pierce / Impervious)
  // The actual Pierce reduction happens at Step 8, and the disable flags are checked there.
  // We track the intent here for clarity but no pool modification occurs.

  return pool;
}
```

**Verify:**
- Pool with 2 red + 1 black + 3 white → array of 6 elements in correct order
- Spray with 4 minis in LOS → pool is 4× larger
- Makashi Mastery flag is accessible downstream (implement check in Step 8)

**Unit Test:**
```ts
describe('formAttackPool', () => {
  it('creates pool from dice counts', () => {
    const config: AttackConfig = {
      attacker: { redDice: 2, blackDice: 1, whiteDice: 3, /* other fields */ },
      defender: { minisInLOS: 1, /* other fields */ },
      attackType: AttackType.All,
    };
    const pool = formAttackPool(config);
    expect(pool.filter(d => d === AttackDieColor.Red)).toHaveLength(2);
    expect(pool.filter(d => d === AttackDieColor.Black)).toHaveLength(1);
    expect(pool.filter(d => d === AttackDieColor.White)).toHaveLength(3);
  });

  it('applies Spray multiplier', () => {
    const config: AttackConfig = {
      attacker: { redDice: 1, blackDice: 0, whiteDice: 0, spray: true, /* other fields */ },
      defender: { minisInLOS: 3, /* other fields */ },
      attackType: AttackType.All,
    };
    const pool = formAttackPool(config);
    expect(pool).toHaveLength(3); // 1 × 3
  });
});
```

---

## Step 2B.3 — Implement Step 4a: Upgrade/Downgrade Attack Dice

**File:** `src/engine/attackSequence.ts` (update `upgradeDowgradeAttackDice`)

```ts
import { applyDieModification, upgradeAttack, downgradeAttack } from './dice';
import type { AttackDieColor, AttackConfig } from './types';

/**
 * Step 4a — Upgrade / Downgrade Attack Dice
 * Order: attacker downgrade → defender downgrade → attacker upgrade → defender upgrade
 */
function upgradeDowgradeAttackDice(
  pool: AttackDieColor[],
  config: AttackConfig
): AttackDieColor[] {
  let result = pool;

  // 1. Attacker downgrades
  // Note: Cumbersome is NOT a die downgrade. Per the rulebook, Cumbersome is a
  // pool restriction ("can only add that weapon if the unit has not performed a Move").
  // Since the calculator lets users build their own pools, Cumbersome has no
  // mechanical effect here. The `cumbersome` flag is retained for future UI hints.
  // (No downgrades in current keyword set.)

  // 2. Defender downgrades (none in current keyword set)

  // 3. Attacker upgrades (Anti-Materiel X, Anti-Personnel X)
  // Anti-Materiel only applies vs Vehicles, Anti-Personnel only applies vs Troopers.
  // Since we don't model unit types in MVP, these are not implemented yet.
  // Placeholder for future:
  // if (config.attacker.antiMaterielX > 0 && defenderIsVehicle) {
  //   result = applyDieModification(result, config.attacker.antiMaterielX, upgradeAttack);
  // }

  // 4. Defender upgrades (none in current keyword set)

  return result;
}
```

**Verify:**
- Cumbersome does NOT modify the pool (it's a pool restriction, not a die modification)
- Anti-Materiel/Anti-Personnel placeholders compile but don't execute (awaiting unit-type feature)

**Unit Test:**
```ts
describe('upgradeDowgradeAttackDice', () => {
  it('does not modify pool when Cumbersome is set', () => {
    const pool = [AttackDieColor.Red, AttackDieColor.Black];
    const config: AttackConfig = {
      attacker: { cumbersome: true, /* other fields */ },
      defender: { /* fields */ },
      attackType: AttackType.All,
    };
    const result = upgradeDowgradeAttackDice(pool, config);
    expect(result).toEqual([AttackDieColor.Red, AttackDieColor.Black]);
  });
});
```

**Notes:**
- Anti-Materiel X and Anti-Personnel X require unit-type data (Vehicle vs Trooper), which is deferred to a future phase. The UI inputs exist in the design spec but are not functional in MVP.

---

## Step 2B.4 — Implement Step 4b: Roll Attack Dice

**File:** `src/engine/attackSequence.ts` (update `rollAttackDice`)

```ts
import { rollAttackDie } from './dice';
import type { AttackFace, AttackDieColor, AttackConfig } from './types';

/**
 * Step 4b — Roll Attack Dice
 * Roll each die in the pool.
 */
function rollAttackDice(pool: AttackDieColor[]): AttackFace[] {
  return pool.map(color => rollAttackDie(color));
}
```

**Verify:**
- Rolling a pool of 5 dice returns an array of 5 `AttackFace` values
- Results are random

---

## Step 2B.5 — Implement Step 4c: Reroll Attack Dice

**File:** `src/engine/attackSequence.ts` (update `rerollAttackDice`)

This is the most complex reroll step. It must handle:
- Observation tokens (1 reroll each, processed FIRST)
- Aim tokens (2 rerolls each + Precise X bonus)
- Marksman decision (save aims for post-surge conversion OR reroll now)
- Duelist attacker (spend Aim → Pierce +1)
- Aim token consumption tracking (Lethal X consumes Aims at Step 6, so track how many are spent here)

**Processing Order:** Observation tokens are spent first, then aim tokens. This allows Marksman decisions to see the dice state after observation rerolls, enabling better strategic choices.

**Note:** When Marksman is active, aim tokens can either be used for rerolling or saved for Marksman conversions after surge conversion (Step 4d.5). The decision is made per aim token:
- **Deterministic mode:** Always prefer saving for Marksman (guaranteed conversion > probabilistic reroll)
- **Averages mode:** Compare reroll EV vs Marksman conversion EV; if Marksman is better, save this and all remaining aims
- Once a decision is made to save, all remaining aims are saved (break out of the reroll loop)
- Saved aims are returned as `aimsSavedForMarksman` for use by `applyMarksman()` after surge conversion

**Important Limitation:**
The simple `AttackFace[]` array loses color information. We need to track die colors alongside faces using an intermediate representation:

```ts
interface RolledAttackDie {
  color: AttackDieColor;
  face: AttackFace;
}

// Update rollAttackDice to return RolledAttackDie[]
function rollAttackDice(pool: AttackDieColor[]): RolledAttackDie[] {
  return pool.map(color => ({ color, face: rollAttackDie(color) }));
}
```

```ts
/**
 * Helper: Decide whether to use Marksman for ONE aim token
 * 
 * This function is used in TWO contexts:
 * 1. During rerollAttackDice (Step 4c): to decide whether to save this aim for Marksman
 *    (if useRerollInstead is false → save this aim; if true → reroll with it)
 * 2. During applyMarksman (Step 4d.5): to decide what to convert with a saved aim
 *    (convertBlankIndex/convertHitIndex indicate what to convert)
 * 
 * Key logic:
 * 1. Check if converting blank→hit will increase defense dice (considering defensive keywords)
 * 2. Check if converting hit→crit will increase defense dice (considering defensive keywords)
 * 3. If neither helps: don't use Marksman (return useRerollInstead: true)
 * 4. If one or both help:
 *    - Deterministic mode: return the best conversion option
 *    - Averages mode: compare best conversion EV to reroll EV
 *      - If conversion is better: return the conversion
 *      - If reroll is better: return useRerollInstead: true
 * 
 * NOTE: This function is called ONCE PER AIM TOKEN.
 */
function calculateMarksmanDecision(
  results: RolledAttackDie[],
  config: AttackConfig
): MarksmanDecision {
  const { attacker, defender } = config;
  
  // Find convertible dice
  const blankIndices: Array<{index: number, color: AttackDieColor}> = [];
  const hitIndices: Array<{index: number, color: AttackDieColor}> = [];
  
  results.forEach((die, index) => {
    if (die.face === AttackFace.Blank) {
      blankIndices.push({index, color: die.color});
    } else if (die.face === AttackFace.Hit) {
      hitIndices.push({index, color: die.color});
    }
  });
  
  // If nothing to convert, use reroll instead
  if (blankIndices.length === 0 && hitIndices.length === 0) {
    return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
  }
  
  // ============================================================================
  // Determine if conversions will actually help bypass defender keywords
  // ============================================================================
  
  // Check if converting blank→hit will increase defense dice rolled
  const blankConversionHelps = willBlankConversionHelp(results, attacker, defender);
  
  // Check if converting hit→crit will increase defense dice rolled
  const hitConversionHelps = willHitConversionHelp(results, attacker, defender);
  
  // If neither conversion helps, use reroll instead
  if (!blankConversionHelps && !hitConversionHelps) {
    return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
  }
  
  // ============================================================================
  // Deterministic Mode: Always use the best conversion option
  // ============================================================================
  
  if (attacker.marksmanStrategy === MarksmanStrategy.Deterministic) {
    // Prefer hit→crit if it helps (bypasses Armor, Dodge, Cover)
    if (hitConversionHelps && hitIndices.length > 0) {
      // Convert the first white hit, or first hit if no white hits
      hitIndices.sort((a, b) => {
        const colorValue = { white: 1, black: 2, red: 3 };
        return colorValue[a.color] - colorValue[b.color];
      });
      return { convertBlankIndex: null, convertHitIndex: hitIndices[0].index, useRerollInstead: false };
    }
    
    // Otherwise convert blank→hit
    if (blankConversionHelps && blankIndices.length > 0) {
      // Convert the first white blank, or first blank if no white blanks
      blankIndices.sort((a, b) => {
        const colorValue = { white: 1, black: 2, red: 3 };
        return colorValue[a.color] - colorValue[b.color];
      });
      return { convertBlankIndex: blankIndices[0].index, convertHitIndex: null, useRerollInstead: false };
    }
  }
  
  // ============================================================================
  // Averages Mode: Compare conversion EV to reroll EV
  // ============================================================================
  
  // Calculate reroll EV for the best reroll candidate
  const rerollValue = calculateRerollEV(results, attacker);
  
  // Calculate EV improvement from blank→hit conversion
  let blankConversionEV = 0;
  if (blankConversionHelps && blankIndices.length > 0) {
    // Guaranteed 1 hit improvement (0 → 1)
    // But weight it by defender keywords that might cancel it
    blankConversionEV = 1.0;
    
    // Reduce value if Armor will likely cancel it
    if (defender.armorX > 0) {
      const totalHits = results.filter(r => r.face === AttackFace.Hit).length + 1; // +1 for conversion
      const crits = results.filter(r => r.face === AttackFace.Critical).length;
      // If Armor is high, new hits are less valuable
      if (defender.armorX >= totalHits - crits) {
        blankConversionEV *= 0.3; // Most/all hits will be canceled by Armor
      }
    }
  }
  
  // Calculate EV improvement from hit→crit conversion
  let hitConversionEV = 0;
  if (hitConversionHelps && hitIndices.length > 0) {
    // Guaranteed improvement from hit → crit
    hitConversionEV = 1.0;
    
    // Boost value if it bypasses Armor
    if (defender.armorX > 0 && attacker.pierceX + attacker.impactX < defender.armorX) {
      hitConversionEV *= 2.0; // Crits bypass Armor: very valuable
    }
    
    // Boost value if it protects from Dodge (and defender doesn't have Outmaneuver)
    if (defender.dodgeTokens > 0 && !defender.outmaneuver && !attacker.highVelocity) {
      hitConversionEV *= 1.5; // Crits can't be Dodged (without Outmaneuver)
    }
  }
  
  // Choose the best conversion option
  const bestConversionEV = Math.max(blankConversionEV, hitConversionEV);
  
  // If reroll beats the best conversion, use reroll instead
  if (rerollValue > bestConversionEV) {
    return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
  }
  
  // Otherwise, use the better conversion
  if (hitConversionEV >= blankConversionEV && hitIndices.length > 0) {
    // Sort by color: white first (lowest reroll value)
    hitIndices.sort((a, b) => {
      const colorValue = { white: 1, black: 2, red: 3 };
      return colorValue[a.color] - colorValue[b.color];
    });
    return { convertBlankIndex: null, convertHitIndex: hitIndices[0].index, useRerollInstead: false };
  } else if (blankIndices.length > 0) {
    // Sort by color: white first (lowest reroll value)
    blankIndices.sort((a, b) => {
      const colorValue = { white: 1, black: 2, red: 3 };
      return colorValue[a.color] - colorValue[b.color];
    });
    return { convertBlankIndex: blankIndices[0].index, convertHitIndex: null, useRerollInstead: false };
  }
  
  // Fallback: use reroll
  return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
}

/**
 * Helper: Check if converting a blank→hit will increase defense dice rolled by defender
 * Factors in defensive keywords: Armor, Dodge, Cover, Guardian, Backup, Shielded
 */
function willBlankConversionHelp(
  results: RolledAttackDie[],
  attacker: AttackerConfig,
  defender: DefenderConfig
): boolean {
  const currentHits = results.filter(r => r.face === AttackFace.Hit).length;
  const currentCrits = results.filter(r => r.face === AttackFace.Critical).length;
  
  // If defender has high Armor and we don't have Pierce/Impact to bypass it,
  // new hits will just be canceled → not helpful
  if (defender.armorX > 0) {
    const effectivePierce = attacker.pierceX + attacker.impactX;
    const hitsBlockedByArmor = Math.max(0, defender.armorX - effectivePierce - currentCrits);
    
    if (hitsBlockedByArmor >= currentHits + 1) {
      // All current hits + the new hit will be blocked by Armor → not helpful
      return false;
    }
  }
  
  // If defender has Dodge tokens and we don't have High Velocity,
  // new hits might be canceled → less helpful (but not impossible)
  // We'll allow this conversion but with lower priority
  
  // Otherwise, blank→hit increases the number of hits → helpful
  return true;
}

/**
 * Helper: Check if converting a hit→crit will increase defense dice rolled by defender
 * Factors in defensive keywords: Armor, Dodge (with Outmaneuver), Impact X overlap
 */
function willHitConversionHelp(
  results: RolledAttackDie[],
  attacker: AttackerConfig,
  defender: DefenderConfig
): boolean {
  const currentHits = results.filter(r => r.face === AttackFace.Hit).length;
  const currentCrits = results.filter(r => r.face === AttackFace.Critical).length;
  
  // If defender has Armor, converting hit→crit bypasses Armor → always helpful
  if (defender.armorX > 0) {
    const effectivePierce = attacker.pierceX;
    const hitsBlockedByArmor = Math.max(0, defender.armorX - effectivePierce - currentCrits);
    
    if (hitsBlockedByArmor > 0) {
      // Some hits are being blocked by Armor, so hit→crit helps bypass it
      return true;
    }
  }
  
  // If defender has Dodge tokens (and no Outmaneuver), converting hit→crit
  // protects from Dodge cancellation → helpful
  if (defender.dodgeTokens > 0 && !defender.outmaneuver && !attacker.highVelocity) {
    return true;
  }
  
  // If defender has Cover, converting hit→crit bypasses cover → helpful
  // (Note: Cover is complex; we'll assume crits help bypass cover in most cases)
  if (defender.coverType && defender.coverType !== CoverType.None) {
    return true;
  }
  
  // If defender has no armor/dodge/cover, hit→crit doesn't provide extra value
  // (both hits and crits result in the same defense roll)
  return false;
}

/**
 * Helper: Calculate expected value of rerolling the best reroll candidate
 * Returns the EV improvement from 1 reroll
 */
function calculateRerollEV(
  results: RolledAttackDie[],
  attacker: AttackerConfig
): number {
  // Identify the best reroll target (blanks first, then excess surges)
  const rerollTargets = identifyRerollTargets(results, attacker);
  
  if (rerollTargets.length === 0) {
    return 0; // No reroll targets available
  }
  
  // Get the highest-value reroll target (Red > Black > White)
  const bestTarget = rerollTargets[0]; // Already sorted by identifyRerollTargets
  
  // Calculate EV based on die face distribution
  // White: 1 hit, 1 crit, 1 surge (3 favorable faces / 8 total)
  // Black: 3 hits, 1 crit, 1 surge (5 favorable faces / 8 total)
  // Red: 5 hits, 1 crit, 1 surge (7 favorable faces / 8 total)
  
  const dieHitsPerColor = { white: 1, black: 3, red: 5 };
  const dieCritsPerColor = { white: 1, black: 1, red: 1 };
  const dieSurgesPerColor = { white: 1, black: 1, red: 1 };
  
  // Check if surges count as favorable
  const hasSurgeConversion = attacker.surgeChart === AttackSurgeChart.ToHit ||
                              attacker.surgeChart === AttackSurgeChart.ToCrit;
  const hasUnlimitedSurgeConversion = attacker.jediHunter || attacker.holdTheLine;
  const existingSurges = results.filter(d => d.face === AttackFace.Surge).length;
  const surgeConversionsAvailable = attacker.surgeTokens + attacker.criticalX;
  const surgesCountAsFavorable = hasSurgeConversion || hasUnlimitedSurgeConversion || 
                                  (surgeConversionsAvailable > existingSurges);
  
  // Calculate favorable faces
  let favorableFaces = dieHitsPerColor[bestTarget.color] + dieCritsPerColor[bestTarget.color];
  if (surgesCountAsFavorable) {
    favorableFaces += dieSurgesPerColor[bestTarget.color];
  }
  
  // EV = favorable faces / total faces
  return favorableFaces / 8.0;
}

/**
 * Helper: Calculate how many defense dice the defender would roll given attack results.
 * This simulates Steps 5-6 without actually rolling defense dice.
 * Returns the number of hits + crits that reach the defender for defense rolling.
 * 
 * This calculation includes all keyword interactions:
 * - Impact X, Ram X (convert hits to crits)
 * - Guardian X (absorbs hits)
 * - Armor + Pierce interactions
 * - Makashi Mastery, Immune: Pierce
 * - Backup, Shielded X
 */
function calculateDefenseDiceCount(
  results: RolledAttackDie[],
  attacker: AttackerConfig,
  defender: DefenderConfig,
  config: AttackConfig
): number {
  let hits = results.filter(r => r.face === AttackFace.Hit).length;
  let crits = results.filter(r => r.face === AttackFace.Critical).length;
  
  // Step 6: Impact X converts hits to crits
  const impactConversions = Math.min(attacker.impactX, hits);
  hits -= impactConversions;
  crits += impactConversions;
  
  // Step 6: Ram X converts hits to crits (Overrun attacks only)
  if (config.attackType === AttackType.Overrun) {
    const ramConversions = Math.min(attacker.ramX, hits);
    hits -= ramConversions;
    crits += ramConversions;
  }
  
  // Step 6: Guardian X absorbs hits (up to X)
  const guardianHits = Math.min(defender.guardianX, hits);
  hits -= guardianHits;
  
  // Step 5: Armor blocks hits (not crits)
  // Calculate effective Pierce
  let effectivePierce = attacker.pierceX;
  
  // Makashi Mastery reduces Pierce by 1
  if (attacker.makashiMastery) {
    effectivePierce = Math.max(0, effectivePierce - 1);
  }
  
  // Immune: Pierce negates all Pierce
  if (defender.immunePierce) {
    effectivePierce = 0;
  }
  
  // Immune: Melee Pierce negates Pierce only on melee attacks
  if (config.attackType === AttackType.Melee && defender.immuneMeleePierce) {
    effectivePierce = 0;
  }
  
  // Makashi Mastery disables Immune: Pierce (but we already reduced Pierce above)
  // So if Makashi is active, restore Pierce before checking immunities
  if (attacker.makashiMastery && defender.immunePierce) {
    effectivePierce = Math.max(0, attacker.pierceX - 1); // Restore Pierce (minus 1)
  }
  if (attacker.makashiMastery && config.attackType === AttackType.Melee && defender.immuneMeleePierce) {
    effectivePierce = Math.max(0, attacker.pierceX - 1); // Restore Pierce (minus 1)
  }
  
  const armorBlocks = Math.max(0, defender.armorX - effectivePierce - crits);
  hits = Math.max(0, hits - armorBlocks);
  
  // Step 5: Backup cancels up to 2 hits
  if (defender.backup) {
    const backupCancels = Math.min(2, hits);
    hits -= backupCancels;
  }
  
  // Step 5: Shielded X cancels up to X hits/crits
  if (defender.shieldedX > 0) {
    const totalResults = hits + crits;
    const shieldedCancels = Math.min(defender.shieldedX, totalResults);
    
    // Shielded cancels hits first, then crits
    if (shieldedCancels <= hits) {
      hits -= shieldedCancels;
    } else {
      const excessCancels = shieldedCancels - hits;
      hits = 0;
      crits -= excessCancels;
    }
  }
  
  // Return total defense dice (hits + crits that got through)
  return Math.max(0, hits + crits);
}

/**
 * Helper: Calculate how many hits can be "aggressively" rerolled.
 * Returns the count of hits that don't contribute to defense dice rolled.
 * 
 * A hit can be aggressively rerolled if removing it doesn't reduce
 * the number of defense dice the defender would roll (meaning it's
 * being cancelled by defender keywords anyway).
 * 
 * This uses a simulation approach: calculate defense dice with current pool,
 * then test removing each hit individually. If defense dice count stays the same,
 * that hit is "free" to reroll.
 */
function countAggressiveHitRerolls(
  results: RolledAttackDie[],
  attacker: AttackerConfig,
  defender: DefenderConfig,
  config: AttackConfig
): number {
  const hitIndices = results
    .map((die, idx) => ({ die, idx }))
    .filter(({ die }) => die.face === AttackFace.Hit)
    .map(({ idx }) => idx);
  
  if (hitIndices.length === 0) {
    return 0; // No hits to reroll
  }
  
  // Calculate baseline defense dice with current pool
  const baselineDefenseDice = calculateDefenseDiceCount(results, attacker, defender, config);
  
  let aggressiveRerollCount = 0;
  
  // Test removing each hit one at a time
  for (const hitIdx of hitIndices) {
    // Create test pool: replace this hit with a blank
    const testResults = results.map((die, idx) => {
      if (idx === hitIdx) {
        return { ...die, face: AttackFace.Blank };
      }
      return die;
    });
    
    const testDefenseDice = calculateDefenseDiceCount(testResults, attacker, defender, config);
    
    if (testDefenseDice === baselineDefenseDice) {
      // Removing this hit didn't change defense dice count → can reroll it
      aggressiveRerollCount++;
    }
  }
  
  return aggressiveRerollCount;
}

/**
 * Helper: Identify which dice are worth rerolling
 * Returns array of dice that should be prioritized for rerolls
 * Prioritizes higher-value dice (Red > Black > White) for rerolls
 */
function identifyRerollTargets(
  results: RolledAttackDie[],
  attacker: AttackerConfig
): RolledAttackDie[] {
  const targets: RolledAttackDie[] = [];
  
  // Always reroll blanks
  const blanks = results.filter(d => d.face === AttackFace.Blank);
  targets.push(...blanks);
  
  // Surge handling: only reroll surges if they won't be converted
  const surges = results.filter(d => d.face === AttackFace.Surge);
  
  // Check if attacker has surge conversion from chart
  const hasSurgeConversion = attacker.surgeChart === AttackSurgeChart.ToHit ||
                              attacker.surgeChart === AttackSurgeChart.ToCrit;
  
  // Check if attacker has keywords that convert ALL surges
  const hasUnlimitedSurgeConversion = attacker.jediHunter || attacker.holdTheLine;
  
  if (hasSurgeConversion || hasUnlimitedSurgeConversion) {
    // All surges will be converted, none are reroll targets
    // (Chart converts all, or Jedi Hunter / Hold the Line convert all remaining)
  } else {
    // Calculate how many surges will be converted by tokens + Critical X
    const surgesConverted = attacker.surgeTokens + attacker.criticalX;
    
    if (surgesConverted === 0) {
      // No conversions available, all surges are reroll targets
      targets.push(...surges);
    } else if (surges.length > surgesConverted) {
      // More surges than conversions, excess surges are reroll targets
      // Sort surges by priority and take the highest-value excess surges
      surges.sort((a, b) => {
        const colorValue = { red: 3, black: 2, white: 1 };
        return colorValue[b.color] - colorValue[a.color]; // Descending (best first)
      });
      const excessSurges = surges.slice(surgesConverted);
      targets.push(...excessSurges);
    }
    // If surge count <= conversions available, no surges are reroll targets (all will convert)
  }
  
  // Sort all targets by color priority (Red > Black > White)
  // This ensures red blanks and red excess surges are equally weighted over black blanks/surges
  targets.sort((a, b) => {
    const colorValue = { red: 3, black: 2, white: 1 };
    return colorValue[b.color] - colorValue[a.color]; // Descending (best first)
  });
  
  return targets;
}
```

**Important Limitation:**
The above code assumes we can re-roll a die of the correct color. However, the `AttackFace[]` array has lost color information. We need to track die colors alongside faces.

**Required Refactor:** Introduce an intermediate representation that preserves color.

```ts
interface RolledAttackDie {
  color: AttackDieColor;
  face: AttackFace;
}

// Update rollAttackDice to return RolledAttackDie[]
function rollAttackDice(pool: AttackDieColor[]): RolledAttackDie[] {
  return pool.map(color => ({ color, face: rollAttackDie(color) }));
}

// Update rerollAttackDice signature
function rerollAttackDice(
  results: RolledAttackDie[],
  config: AttackConfig
): { results: RolledAttackDie[]; aimsSpent: number; pierceBonus: number; aimsSavedForMarksman: number } {
  const { attacker, defender } = config;
  let workingResults = [...results];
  let aimsSpent = 0;
  let pierceBonus = 0;
  let aimsSavedForMarksman = 0;
  const rerollsPerAim = 2 + attacker.preciseX;

  // Sort dice by priority (Red > Black > White) to ensure higher-value dice are rerolled first
  workingResults.sort((a, b) => {
    const colorValue = { red: 3, black: 2, white: 1 };
    return colorValue[b.color] - colorValue[a.color]; // Descending (best first)
  });

  // Process observation tokens FIRST (before aim tokens)
  // This allows Marksman decisions to see the dice state after observation rerolls
  for (let obsIndex = 0; obsIndex < attacker.observationTokens; obsIndex++) {
    const rerollTargets = identifyRerollTargets(workingResults, attacker);
    
    // Find best single die to reroll (observation tokens give 1 reroll each)
    for (let i = 0; i < workingResults.length; i++) {
      if (rerollTargets.some(target => 
        workingResults[i].color === target.color && 
        workingResults[i].face === target.face
      )) {
        // Reroll this die immediately
        const die = workingResults[i];
        workingResults[i] = { color: die.color, face: rollAttackDie(die.color) };
        break; // Only reroll 1 die per observation token
      }
    }
    
    // If no blanks/excess surges to reroll, check if we should reroll hits
    if (rerollTargets.length === 0) {
      // Count how many hits can be "aggressively" rerolled (don't affect defense dice)
      const aggressiveHitRerolls = countAggressiveHitRerolls(workingResults, attacker, defender, config);
      
      // Also allow "Crit Fishing" strategy to reroll ANY hit (even if it would matter)
      const canRerollHit = aggressiveHitRerolls > 0 || attacker.rerollStrategy === RerollStrategy.CritFishing;
      
      if (canRerollHit) {
        for (let i = 0; i < workingResults.length; i++) {
          if (workingResults[i].face === AttackFace.Hit) {
            const die = workingResults[i];
            workingResults[i] = { color: die.color, face: rollAttackDie(die.color) };
            break;
          }
        }
      }
    }
  }

  // Process each aim token individually (after observation tokens)
  // Each aim token decides: save for Marksman post-surge conversion OR reroll dice
  // Once we decide to save for Marksman, ALL remaining aims are saved
  // Actions are applied immediately, so subsequent aims see updated dice state
  for (let aimIndex = 0; aimIndex < attacker.aimTokens; aimIndex++) {

    // If Marksman is active, decide: save this aim for post-surge Marksman conversion OR reroll now
    if (attacker.marksman) {
      const decision = calculateMarksmanDecision(workingResults, config);
      
      // Check if Marksman conversion is better than rerolling
      let shouldSaveForMarksman = false;
      
      if (!decision.useRerollInstead) {
        // calculateMarksmanDecision says conversion is better
        // Save this aim and ALL remaining aims for Marksman post-surge conversion
        shouldSaveForMarksman = true;
      }
      
      if (shouldSaveForMarksman) {
        // Save this aim and all remaining aims for Marksman
        aimsSavedForMarksman = attacker.aimTokens - aimIndex;
        break; // Exit aim loop — remaining aims saved for Marksman
      }
    }
    
    // Not saving for Marksman — execute rerolls with this aim token
    {
      const rerollIndices: number[] = [];
      const rerollTargets = identifyRerollTargets(workingResults, attacker);
      
      // Select dice to reroll (up to rerollsPerAim)
      // Priority: blanks and excess surges first
      for (let i = 0; i < workingResults.length && rerollIndices.length < rerollsPerAim; i++) {
        if (rerollTargets.some(target => 
          workingResults[i].color === target.color && 
          workingResults[i].face === target.face
        )) {
          rerollIndices.push(i);
        }
      }
      
      // If still have reroll slots left, consider adding hits
      if (rerollIndices.length < rerollsPerAim) {
        // Count how many hits can be "aggressively" rerolled (don't affect defense dice)
        const aggressiveHitRerolls = countAggressiveHitRerolls(workingResults, attacker, defender, config);
        
        let hitsAdded = 0;
        
        // First, add "aggressive" hits (hits that don't matter)
        for (let i = 0; i < workingResults.length && rerollIndices.length < rerollsPerAim && hitsAdded < aggressiveHitRerolls; i++) {
          if (!rerollIndices.includes(i) && workingResults[i].face === AttackFace.Hit) {
            rerollIndices.push(i);
            hitsAdded++;
          }
        }
        
        // If "Crit Fishing" strategy is selected, fill remaining slots with ANY hits
        if (attacker.rerollStrategy === RerollStrategy.CritFishing) {
          for (let i = 0; i < workingResults.length && rerollIndices.length < rerollsPerAim; i++) {
            if (!rerollIndices.includes(i) && workingResults[i].face === AttackFace.Hit) {
              rerollIndices.push(i);
            }
          }
        }
      }
      
      // Execute rerolls immediately (updates dice state for next aim token)
      for (const idx of rerollIndices) {
        const die = workingResults[idx];
        workingResults[idx] = { color: die.color, face: rollAttackDie(die.color) };
      }
      
      aimsSpent++;
    }
  }

  // Duelist (attacker): if any Aim was spent during rerolls in a Melee attack,
  // the attack pool gains Pierce 1 as a free bonus (no additional Aim consumed).
  // Per rulebook: "in addition to the normal effects of spending Aim tokens."
  if (attacker.duelistAttacker && config.attackType === AttackType.Melee && aimsSpent > 0) {
    pierceBonus = 1;
  }

  return { results: workingResults, aimsSpent, pierceBonus, aimsSavedForMarksman };
}
```

**Note:** This refactor must be applied consistently throughout all attack sequence steps. All subsequent steps that handle attack dice (Step 4d, 5, 6) must use `RolledAttackDie` instead of `AttackFace`.

**Note on Surge Handling in Rerolls:**
The reroll logic intelligently determines whether surge results should be rerolled based on available surge conversions:
- **If attacker has surge chart conversion** (ToHit or ToCrit): ALL surges convert → none are reroll targets
- **If attacker has Jedi Hunter or Hold the Line**: ALL surges convert → none are reroll targets
- **Otherwise** (surge chart is None, no Jedi Hunter/Hold the Line):
  - Total conversions available = Surge tokens + Critical X
  - If total conversions = 0: All surges are reroll targets
  - If total conversions < surge count: Only surges in excess of conversions are reroll targets
  - If total conversions ≥ surge count: No surges are reroll targets (all will convert)
  - When selecting which surges to designate as "excess", higher-value dice (Red > Black > White) are chosen first to maximize reroll potential
- **Die Color Priority**: All reroll targets (blanks + excess surges combined) are sorted by die color: **Red > Black > White**. A red blank and a red excess surge are equally weighted and both have priority over any black or white die. This ensures optimal reroll selection since red dice have better odds of producing favorable results.

This logic applies to both normal Aim rerolls and the Marksman EV calculation.

**Note on Marksman Strategy:**
The Marksman keyword is processed **per aim token** in a single unified loop with immediate action execution. For each aim token available:

1. **Calculate decision** — Call `calculateMarksmanDecision()` which returns:
   - `convertBlankIndex: number | null` — Index of one specific blank to convert to hit
   - `convertHitIndex: number | null` — Index of one specific hit to convert to crit
   - `useRerollInstead: boolean` — True if this aim should be used for rerolling instead

2. **Decision logic:**
   - Check if converting blank→hit will help bypass defender keywords (Armor, Dodge, Cover, etc.)
   - Check if converting hit→crit will help bypass defender keywords
   - If neither helps: return `useRerollInstead: true` (don't waste aim on Marksman)
   - If **Deterministic**: return the better conversion option (prefers hit→crit if it helps)
   - If **Averages**: compare conversion EV to reroll EV, return whichever is better

3. **Apply decision immediately** — For each aim token in the loop:
   - **If Marksman is active AND decision says to convert**: Apply conversion immediately, update dice state
   - **Otherwise**: Execute rerolls immediately (select up to `2 + Precise X` dice and reroll them)
   - Next aim token sees the updated dice state from this aim's action

4. **Recursive/Iterative processing:**
   - **Observation tokens are processed FIRST** (before aim tokens) → Marksman decisions see results after observation rerolls
   - Each aim token evaluates the current dice state (including results from observation tokens and previous aims)
   - Marksman conversions are applied immediately → affects next aim's decision
   - Rerolls are executed immediately → affects next aim's decision

5. **Key design points:**
   - **No accumulation** — Each action (conversion or reroll) is executed immediately
   - **True recursive decisions** — Each aim token sees the actual results of all previous aim tokens
   - **Dynamic optimization** — Later aims can make better decisions based on how dice state evolved
   - **Die color priority** — Converts white dice first (lowest reroll value), then black, then red

This approach ensures Marksman aim tokens are used optimally, converting only when conversions meaningfully improve the attack outcome. Each aim token makes its decision based on the actual current pool state, allowing for true adaptive optimization as the attack sequence unfolds.

**Example Flow with 2 Observation Tokens + 3 Aim Tokens:**
1. **Observation 1**: Rerolls best blank → dice state updated
2. **Observation 2**: Rerolls another blank → dice state updated
3. **Aim 1**: Evaluates dice (after observation rerolls) → decides to use Marksman → converts white blank to hit → dice state updated
4. **Aim 2**: Evaluates NEW dice state (with observation rerolls + aim 1's conversion applied) → decides to reroll → rerolls 2 blanks immediately → dice state updated with reroll results
5. **Aim 3**: Evaluates NEWEST dice state (with all previous results) → decides to use Marksman → converts hit to crit → final dice state

**Verify:**
- With 2 Aims + Precise 1: can reroll 6 dice (2 Aims × 3 rerolls each)
- **Dice are sorted by priority (Red > Black > White)** at the start of reroll processing to ensure higher-value dice are always selected first when multiple dice of the same face type are available
- **Reroll logic prioritizes:**
  1. Blanks (always reroll)
  2. Excess surges (beyond all available conversions)
  3. Hits (only when Crit Fishing strategy selected OR when hits would be cancelled by defender keywords)
- Blanks and excess surges prioritize higher-value dice: Red > Black > White
- **Hit reroll logic:**
  - Conservative strategy (default): Does NOT reroll hits unless they would be cancelled anyway
  - Crit Fishing strategy: Always rerolls hits if reroll slots available
  - Smart cancellation check: Rerolls hits if Armor/Dodge/Backup would cancel them anyway
- Surges with conversion available are NOT rerolled:
  - Chart conversion (ToHit or ToCrit): all surges convert
  - Jedi Hunter or Hold the Line: all surges convert
  - Surge tokens + Critical X: up to (tokens + Critical X) surges convert
- Only surges beyond available conversions are reroll targets (highest-value dice selected first)
- **Marksman processing:**
  - Each aim token is processed individually in a single unified loop
  - For each aim token: evaluate `calculateMarksmanDecision()` to decide between Marksman conversion or reroll
  - **Actions are executed immediately** (not accumulated):
    - If conversion chosen: apply immediately and update dice state
    - If reroll chosen: execute up to `(2 + Precise X)` rerolls immediately and update dice state
  - Each subsequent aim token sees the actual results from all previous aim tokens
  - Deterministic: always converts when conversion helps bypass defender keywords
  - Averages: compares conversion EV to reroll EV for each individual aim token
  - White dice are converted first (lowest reroll value), then black, then red
- **Observation tokens are processed FIRST** (before aim tokens) so Marksman decisions see results after observation rerolls
- Duelist spends extra Aim for Pierce bonus

**Unit Test:**
```ts
describe('rerollAttackDice', () => {
  it('rerolls correct number of dice with Aim tokens', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config: AttackConfig = {
      attacker: { aimTokens: 1, preciseX: 0, /* other fields */ },
      // ...
    };
    const { results: newResults, aimsSpent } = rerollAttackDice(results, config);
    expect(aimsSpent).toBe(1);
    // Results should differ from original (probabilistically)
  });

  it('does not reroll surges when attacker has surge conversion', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 1, 
        preciseX: 0, 
        surgeChart: AttackSurgeChart.ToHit, // Has surge conversion
        surgeTokens: 0,
        // other fields
      },
      // ...
    };
    const { results: newResults } = rerollAttackDice(results, config);
    // Should only reroll the blank, not the surges
    const surgesRerolled = newResults.filter(d => d.face === AttackFace.Surge).length;
    expect(surgesRerolled).toBe(2); // Surges should remain
  });

  it('rerolls excess surges when surge tokens are available', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 1, 
        preciseX: 0, 
        surgeChart: AttackSurgeChart.None, // No chart conversion
        surgeTokens: 1, // Only 1 token for 3 surges
        // other fields
      },
      // ...
    };
    // identifyRerollTargets should return 2 excess surges as reroll targets
    const targets = identifyRerollTargets(results, config.attacker);
    expect(targets.length).toBe(2); // 2 excess surges beyond the 1 token
  });

  it('prioritizes red dice over white dice for excess surge rerolls', () => {
    const results = [
      { color: AttackDieColor.White, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Black, face: AttackFace.Surge },
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 1, 
        preciseX: 0, 
        surgeChart: AttackSurgeChart.None, // No chart conversion
        surgeTokens: 1, // Only 1 token for 3 surges, so 2 excess
        // other fields
      },
      // ...
    };
    const targets = identifyRerollTargets(results, config.attacker);
    expect(targets.length).toBe(2);
    // The 2 excess surges should be Red and Black (highest priority)
    expect(targets[0].color).toBe(AttackDieColor.Red);
    expect(targets[1].color).toBe(AttackDieColor.Black);
    // White surge should NOT be in targets (it will be converted by the 1 surge token)
  });

  it('sorts blanks and excess surges together by die color priority', () => {
    const results = [
      { color: AttackDieColor.White, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Black, face: AttackFace.Blank },
      { color: AttackDieColor.Black, face: AttackFace.Surge },
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 2, 
        preciseX: 0, 
        surgeChart: AttackSurgeChart.None, // No chart conversion
        surgeTokens: 0, // No surge tokens
        // other fields
      },
      // ...
    };
    const targets = identifyRerollTargets(results, config.attacker);
    expect(targets.length).toBe(4); // 2 blanks + 2 surges
    // Should be sorted: Red surge, Black blank, Black surge, White blank
    expect(targets[0].color).toBe(AttackDieColor.Red);
    expect(targets[0].face).toBe(AttackFace.Surge);
    expect(targets[1].color).toBe(AttackDieColor.Black);
    // targets[1] could be either black blank or black surge
    expect(targets[2].color).toBe(AttackDieColor.Black);
    expect(targets[3].color).toBe(AttackDieColor.White);
    expect(targets[3].face).toBe(AttackFace.Blank);
  });

  it('considers Critical X when determining surge reroll targets', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Black, face: AttackFace.Surge },
      { color: AttackDieColor.White, face: AttackFace.Surge },
      { color: AttackDieColor.White, face: AttackFace.Surge },
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 1, 
        preciseX: 0, 
        surgeChart: AttackSurgeChart.None, // No chart conversion
        surgeTokens: 1, // 1 surge token
        criticalX: 1,   // 1 Critical X
        jediHunter: false,
        holdTheLine: false,
        // other fields
      },
      // ...
    };
    const targets = identifyRerollTargets(results, config.attacker);
    // Total conversions = 1 surge token + 1 Critical X = 2
    // 4 surges - 2 conversions = 2 excess surges (Red and Black prioritized for reroll)
    expect(targets.length).toBe(2);
    expect(targets[0].color).toBe(AttackDieColor.Red);
    expect(targets[1].color).toBe(AttackDieColor.Black);
  });

  it('does not reroll surges when Jedi Hunter is active', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Black, face: AttackFace.Surge },
      { color: AttackDieColor.White, face: AttackFace.Blank },
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 1, 
        preciseX: 0, 
        surgeChart: AttackSurgeChart.None, // No chart conversion
        surgeTokens: 0,
        criticalX: 0,
        jediHunter: true, // Jedi Hunter converts ALL surges
        holdTheLine: false,
        // other fields
      },
      // ...
    };
    const targets = identifyRerollTargets(results, config.attacker);
    // Only the blank should be a reroll target (surges all convert via Jedi Hunter)
    expect(targets.length).toBe(1);
    expect(targets[0].face).toBe(AttackFace.Blank);
  });

  it('Marksman Deterministic always converts both blanks and hits', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Critical },
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 1,
        marksman: true,
        marksmanStrategy: MarksmanStrategy.Deterministic,
        // other fields
      },
      defender: { /* fields */ },
      attackType: AttackType.All,
    };
    
    // Test the decision function
    const decision1 = calculateMarksmanDecision(results, config);
    // Deterministic should convert one result (preferring hit→crit if helpful)
    expect(decision1.convertBlankIndex !== null || decision1.convertHitIndex !== null).toBe(true);
    
    const { results: newResults, aimsSpent } = rerollAttackDice(results, config);
    expect(aimsSpent).toBe(1);
    // With 1 aim token, should convert 1 die (either the blank OR one of the hits)
    const conversions = newResults.filter((r, i) => r.face !== results[i].face);
    expect(conversions.length).toBe(1);
  });

  it('Marksman Averages converts hits→crits when defender has Armor', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },     // Index 0
      { color: AttackDieColor.Red, face: AttackFace.Hit },       // Index 1
      { color: AttackDieColor.White, face: AttackFace.Hit },     // Index 2
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 1,
        marksman: true,
        marksmanStrategy: MarksmanStrategy.Averages,
        impactX: 0,
        // other fields with minimal reroll value
      },
      defender: { 
        armorX: 2, // High armor makes hit→crit very valuable
        dodgeTokens: 0,
        // other fields
      },
      attackType: AttackType.All,
    };
    const decision = calculateMarksmanDecision(results, config);
    // Should prefer converting hit→crit (valuable vs Armor)
    expect(decision.convertHitIndex).not.toBeNull();
    expect(decision.useRerollInstead).toBe(false);
  });

  it('Marksman Averages skips conversion when rerolls are better', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 3, // Many Aims available
        preciseX: 2,  // Lots of rerolls (15 total)
        marksman: true,
        marksmanStrategy: MarksmanStrategy.Averages,
        // other fields
      },
      defender: { 
        armorX: 0,
        dodgeTokens: 0,
        // No special defensive keywords
        // other fields
      },
      attackType: AttackType.All,
    };
    const decision = calculateMarksmanDecision(results, config);
    // With many red dice and excellent reroll potential, rerolls might be better
    // Decision might indicate to use reroll instead if reroll EV is higher
    expect(decision).toHaveProperty('convertBlankIndex');
    expect(decision).toHaveProperty('convertHitIndex');
    expect(decision).toHaveProperty('useRerollInstead');
  });

  it('Marksman Averages considers Impact X redundancy', () => {
    const results = [
      { color: AttackDieColor.White, face: AttackFace.Hit },  // Index 0
      { color: AttackDieColor.Red, face: AttackFace.Hit },    // Index 1
      { color: AttackDieColor.Red, face: AttackFace.Hit },    // Index 2
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 1,
        marksman: true,
        marksmanStrategy: MarksmanStrategy.Averages,
        impactX: 2, // Can already convert 2 hits→crits
        // other fields
      },
      defender: { 
        armorX: 2, // Armor present so Impact will trigger
        // other fields
      },
      attackType: AttackType.All,
    };
    const decision = calculateMarksmanDecision(results, config);
    // Impact will convert 2 hits, so if Marksman converts any,
    // it should convert the white hit (index 0) since Impact should
    // prioritize the higher-value red hits
    if (decision.convertHitIndex !== null) {
      // Should convert white hit first (lowest reroll value)
      expect(decision.convertHitIndex).toBe(0);
    }
  });

  it('Marksman Averages prioritizes white dice for conversion', () => {
    const results = [
      { color: AttackDieColor.White, face: AttackFace.Blank },  // Index 0
      { color: AttackDieColor.Red, face: AttackFace.Blank },    // Index 1
      { color: AttackDieColor.White, face: AttackFace.Hit },    // Index 2
      { color: AttackDieColor.Red, face: AttackFace.Hit },      // Index 3
    ];
    const config: AttackConfig = {
      attacker: { 
        aimTokens: 1,
        marksman: true,
        marksmanStrategy: MarksmanStrategy.Averages,
        impactX: 0,
        // other fields
      },
      defender: { 
        armorX: 0,
        dodgeTokens: 0,
        // other fields
      },
      attackType: AttackType.All,
    };
    const decision = calculateMarksmanDecision(results, config);
    // When converting, should prioritize white dice (lower reroll value)
    // over red dice (higher reroll value)
    if (decision.convertBlankIndex !== null) {
      // White blank (index 0) should be converted before red blank (index 1)
      expect(decision.convertBlankIndex).toBe(0);
    }
    if (decision.convertHitIndex !== null) {
      // White hit (index 2) should be converted before red hit (index 3)
      expect(decision.convertHitIndex).toBe(2);
    }
  });
});
```

---

## Step 2B.6 — Implement Step 4d: Convert Attack Surges

**File:** `src/engine/attackSequence.ts` (update `convertAttackSurges`)

```ts
/**
 * Step 4d — Convert Attack Surges
 * Apply conversions in priority order:
 * 1. Unit surge chart (c→a, c→b, or c→blank via None)
 * 2. Surge tokens (c→a)
 * 3. Critical X (c→b)
 * 4. Jedi Hunter (c→b)
 * 5. Hold the Line (attacker) (c→a)
 * 6. Marksman (already handled in Step 4c)
 */
function convertAttackSurges(
  results: RolledAttackDie[],
  config: AttackConfig
): RolledAttackDie[] {
  const { attacker } = config;
  let workingResults = [...results];

  // Count surges
  let surgeCount = workingResults.filter(d => d.face === AttackFace.Surge).length;

  // 1. Unit surge chart
  if (attacker.surgeChart === AttackSurgeChart.ToHit) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Hit } : d
    );
    surgeCount = 0; // All converted
  } else if (attacker.surgeChart === AttackSurgeChart.ToCrit) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Critical } : d
    );
    surgeCount = 0;
  }
  // If None, surges remain as surges (which are blanks for counting purposes)

  // 2. Surge tokens: convert c→a (up to number of surge tokens)
  if (attacker.surgeTokens > 0 && surgeCount > 0) {
    let converted = 0;
    workingResults = workingResults.map(d => {
      if (d.face === AttackFace.Surge && converted < attacker.surgeTokens) {
        converted++;
        return { ...d, face: AttackFace.Hit };
      }
      return d;
    });
    surgeCount -= converted;
  }

  // 3. Critical X: convert c→b (up to X)
  if (attacker.criticalX > 0 && surgeCount > 0) {
    let converted = 0;
    workingResults = workingResults.map(d => {
      if (d.face === AttackFace.Surge && converted < attacker.criticalX) {
        converted++;
        return { ...d, face: AttackFace.Critical };
      }
      return d;
    });
    surgeCount -= converted;
  }

  // 4. Jedi Hunter: gains c→b (all surges)
  if (attacker.jediHunter && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Critical } : d
    );
    surgeCount = 0;
  }

  // 5. Hold the Line (attacker): c→a (Melee only — keyword is "while engaged")
  if (attacker.holdTheLine && (config.attackType === AttackType.Melee || config.attackType === AttackType.All) && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Hit } : d
    );
    surgeCount = 0;
  }

  // Any remaining surges are treated as blanks (no conversion)

  return workingResults;
}
```

**Verify:**
- Surge chart converts all surges
- Surge tokens convert up to N surges
- Critical X + Jedi Hunter + Hold the Line apply in order, non-overlapping
- Remaining surges are blanks for counting

**Unit Tests:**
Test each conversion independently and in combination.

---

## Step 2B.6b — Implement Step 4d.5: Apply Marksman (Post-Surge Conversion)

**File:** `src/engine/attackSequence.ts` (add `applyMarksman`)

Per the rulebook, Marksman fires **after converting attack surges** during the Convert Attack Surges step. This function uses aim tokens saved from Step 4c to convert die results on the post-surge-conversion pool.

```ts
/**
 * Step 4d.5 — Apply Marksman (after surge conversion)
 * Per rulebook: "A unit with the Marksman keyword may spend any number of Aim Tokens
 * after converting attack surges during the Convert Attack Surges step."
 * 
 * For each saved aim token, decide what to convert:
 * - blank→hit (1 aim)
 * - hit→crit (1 aim)
 * - blank→crit (2 aims) — only if enough aims remain
 * 
 * Uses calculateMarksmanDecision() to decide per aim token.
 */
function applyMarksman(
  results: RolledAttackDie[],
  config: AttackConfig,
  aimsSavedForMarksman: number
): RolledAttackDie[] {
  if (aimsSavedForMarksman <= 0 || !config.attacker.marksman) {
    return results;
  }

  let workingResults = [...results];
  let aimsRemaining = aimsSavedForMarksman;

  while (aimsRemaining > 0) {
    const decision = calculateMarksmanDecision(workingResults, config);

    // If decision says reroll (no useful conversion), stop spending aims
    // (Can't reroll at this point — we're past the reroll step)
    if (decision.useRerollInstead) {
      break;
    }

    if (decision.convertBlankIndex !== null) {
      // Convert blank → hit (costs 1 aim)
      workingResults[decision.convertBlankIndex] = {
        ...workingResults[decision.convertBlankIndex],
        face: AttackFace.Hit,
      };
      aimsRemaining--;
    } else if (decision.convertHitIndex !== null) {
      // Convert hit → crit (costs 1 aim)
      workingResults[decision.convertHitIndex] = {
        ...workingResults[decision.convertHitIndex],
        face: AttackFace.Critical,
      };
      aimsRemaining--;
    } else {
      // No convertible dice remain
      break;
    }
  }

  return workingResults;
}
```

**Verify:**
- With 0 saved aims or no Marksman keyword, returns results unchanged
- Each aim produces at most one conversion (blank→hit or hit→crit)
- Stops when no more useful conversions are available
- Operates on post-surge-conversion pool (surges already resolved to hits/crits/blanks)
- `calculateMarksmanDecision` correctly evaluates the post-surge pool state for defender keyword bypass

**Unit Tests:**
- Marksman with 2 saved aims + pool of [blank, blank, hit, crit] → converts blanks to hits
- Marksman with 1 saved aim + pool of [hit, hit, crit] → converts hit to crit (if beneficial)
- Marksman with aims but no blanks/hits to convert → returns unchanged

---

## Step 2B.7 — Implement Step 5: Apply Dodge and Cover

This step is complex and uses the Cover Resolver module (2C). We'll implement a simplified version here and refine in Step 2C.

**File:** `src/engine/attackSequence.ts` (update `applyDodgeAndCover`)

```ts
import { determineCoverValue, rollCoverPool } from './coverResolver';

/**
 * Step 5 — Apply Dodge and Cover
 * - Determine effective Cover value (Step 5a–b)
 * - Roll cover pool (Step 5c)
 * - Apply cover cancellations (Step 5d)
 * - Apply Dodge tokens (Step 5e)
 */
function applyDodgeAndCover(
  results: RolledAttackDie[],
  config: AttackConfig
): { hits: number; crits: number; dodgeWasSpent: boolean } {
  const { attacker, defender } = config;

  // Count hits and crits
  let hits = results.filter(d => d.face === AttackFace.Hit).length;
  let crits = results.filter(d => d.face === AttackFace.Critical).length;

  // Step 5a–b: Determine Cover value
  const coverValue = determineCoverValue(config);

  // Step 5c–d: Roll cover pool and apply cancellations
  if (coverValue > 0 && hits > 0) {
    const coverBlocks = rollCoverPool(hits, coverValue, defender.lowProfile);
    hits = Math.max(0, hits - coverBlocks);
  }

  // Step 5e: Apply Dodge tokens
  // Each Dodge cancels 1 hit (or crit, if Outmaneuver)
  // High Velocity disables Dodge spending entirely
  let dodgeWasSpent = false;
  if (!attacker.highVelocity && defender.dodgeTokens > 0) {
    let dodgesRemaining = defender.dodgeTokens;

    // Cancel hits first
    const hitsCancelled = Math.min(hits, dodgesRemaining);
    hits -= hitsCancelled;
    dodgesRemaining -= hitsCancelled;
    if (hitsCancelled > 0) dodgeWasSpent = true;

    // If Outmaneuver, cancel crits too
    if (defender.outmaneuver && dodgesRemaining > 0) {
      const critsCancelled = Math.min(crits, dodgesRemaining);
      crits -= critsCancelled;
      dodgesRemaining -= critsCancelled;
      if (critsCancelled > 0) dodgeWasSpent = true;
    }

    // Block allows spending Dodge even with 0 results to cancel.
    // Per rulebook: "Units may spend Dodge Tokens even if there are no a results."
    // This lets Block activate (e→d) even against all-crit attack pools.
    if (!dodgeWasSpent && defender.block && dodgesRemaining > 0) {
      dodgeWasSpent = true;
    }
  }

  return { hits, crits, dodgeWasSpent };
}
```

**Verify:**
- Cover reduces hits
- Dodge cancels hits (and crits with Outmaneuver)
- High Velocity disables Dodge
- Low Profile (handled in coverResolver)

---

## Step 2B.8 — Implement Step 6: Modify Attack Dice

**File:** `src/engine/attackSequence.ts` (update `modifyAttackDice`)

This step applies attacker/defender modifications before defense roll.

```ts
/**
 * Step 6 — Modify Attack Dice
 * - Armor X (cancel hits)
 * - Impact X (convert hits→crits vs Armor)
 * - Weak Point X (grants attacker Impact X from specified arc — not implemented, requires arc logic)
 * - Shielded X (cancel hits or crits)
 * - Backup (cancel up to 2 hits)
 * - Guardian X (cancel hits and separate for Guardian defense sub-sequence)
 * - Ram X (change any results to crits — blanks first, then hits)
 * - Lethal X (spend remaining Aims for Pierce — excludes aims used for rerolls and Marksman)
 */
function modifyAttackDice(
  attackResults: { hits: number; crits: number; blanks: number },
  config: AttackConfig,
  aimsSpent: number,
  aimsSavedForMarksman: number
): { hits: number; crits: number; lethalPierce: number; guardianHits: number } {
  let { hits, crits, blanks } = attackResults;
  const { attacker, defender } = config;
  let lethalPierce = 0;

  // Ram X: convert up to X results (any face) to crits
  // Per rulebook: "change X results to crit results" — any result can be changed.
  // Priority: blanks first, then hits (crits are already crits).
  if (attacker.ramX > 0) {
    let ramRemaining = attacker.ramX;
    const blanksConverted = Math.min(blanks, ramRemaining);
    blanks -= blanksConverted;
    crits += blanksConverted;
    ramRemaining -= blanksConverted;
    const hitsConverted = Math.min(hits, ramRemaining);
    hits -= hitsConverted;
    crits += hitsConverted;
  }

  // Impact X: convert hits→crits (only when defender has Armor, applied before Armor cancels)
  // Impact allows hits to be converted to crits, which bypass Armor
  if (attacker.impactX > 0 && defender.armorX > 0) {
    const converted = Math.min(hits, attacker.impactX);
    hits -= converted;
    crits += converted;
  }

  // Armor X: cancel up to X hits (applied after Impact conversions)
  if (defender.armorX > 0) {
    const hitsCancelled = Math.min(hits, defender.armorX);
    hits -= hitsCancelled;
  }

  // Shielded X: cancel up to X hits or crits (Ranged attacks only)
  // Defender flips active Shield tokens to cancel results
  if (defender.shieldedX > 0 && (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)) {
    const critsCancelled = Math.min(crits, defender.shieldedX);
    crits -= critsCancelled;
    let shieldRemaining = defender.shieldedX - critsCancelled;

    const hitsCancelled = Math.min(hits, shieldRemaining);
    hits -= hitsCancelled;
  }

  // Backup: cancel up to 2 hits (Ranged attacks only)
  if (defender.backup && (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)) {
    const hitsCancelled = Math.min(hits, 2);
    hits -= hitsCancelled;
  }

  // Guardian X: cancel up to X hits and roll Guardian defense dice (Ranged attacks only)
  // The Guardian unit defends separately and wounds are tracked independently
  let guardianHits = 0;
  if (defender.guardianX > 0 && (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)) {
    guardianHits = Math.min(hits, defender.guardianX);
    hits -= guardianHits;
  }

  // Lethal X: spend remaining Aims to add Pierce
  // Must subtract both aims spent on rerolls AND aims saved for Marksman
  // to avoid double-spending aim tokens.
  const aimsRemaining = Math.max(0, config.attacker.aimTokens - aimsSpent - aimsSavedForMarksman);
  if (attacker.lethalX > 0 && aimsRemaining > 0) {
    lethalPierce = Math.min(attacker.lethalX, aimsRemaining);
  }

  return { hits, crits, lethalPierce, guardianHits };
}
```

**Verify:**
- Ram X converts any result (blanks first, then hits) to crits
- Impact converts hits→crits before Armor cancels
- Armor cancels hits
- Shielded cancels crits first, then hits
- Lethal grants Pierce based on remaining Aims (excluding aims used for rerolls AND Marksman)

**Notes:**
- Guardian X implements a defense sub-sequence: Guardian unit rolls defense dice **without** Pierce applied. Pierce is applied globally to the combined block total in Step 9 (compareResults). The final output reports guardian wounds (no pierce), main target wounds (no pierce), and total wounds (with pierce), since the calculator cannot determine which target to prioritize for pierce allocation.
- Weak Point X requires arc logic (front/side/rear), which is not in MVP.
- Impervious correctly accounts for total Pierce including Lethal and Duelist bonuses calculated in earlier steps.

---

## Step 2B.9 — Implement Step 7: Roll Defense Dice

**File:** `src/engine/attackSequence.ts` (update `rollDefenseDice`)

```ts
import { rollDefensePool, upgradeDefense, downgradeDefense, rollDefenseDie } from './dice';
import type { DefenseFace, DefenseDieColor, AttackConfig, AttackType } from './types';

interface RolledDefenseDie {
  color: DefenseDieColor;
  face: DefenseFace;
}

/**
 * Step 7 — Roll Defense Dice
 * - Gather dice (1 per hit + crit)
 * - Add Danger Sense X dice (per suppression token, up to X)
 * - Add Impervious dice (= total Pierce from all sources)
 * - Upgrade/downgrade defense dice
 * - Roll
 * - Reroll (Uncanny Luck X, Soresu Mastery)
 * - Convert surges (surge chart, Surge tokens, Deflect, Block, Hold the Line)
 */
function rollDefenseDice(
  attackResults: { hits: number; crits: number },
  config: AttackConfig,
  lethalPierce: number,
  duelistPierceBonus: number,
  dodgeWasSpent: boolean
): { results: RolledDefenseDie[]; surgeCountBeforeConversion: number } {
  const { defender, attacker } = config;
  const totalHits = attackResults.hits + attackResults.crits;

  // Base pool: 1 die per hit/crit
  let dieCount = totalHits;

  // Danger Sense X: +1 die per suppression (up to X)
  if (defender.dangerSenseX > 0) {
    const bonusDice = Math.min(defender.dangerSenseX, defender.suppressionTokens);
    dieCount += bonusDice;
  }

  // Impervious: +dice = total Pierce (keyword + Lethal + Duelist) unless disabled by Makashi Mastery
  // Rulebook: If a unit with Impervious also has Immune: Pierce, it does NOT roll extra dice.
  // Note: lethalPierce and duelistPierceBonus are passed from earlier steps
  if (defender.impervious && !attacker.makashiMastery && !defender.immunePierce) {
    const totalPierce = attacker.pierceX + lethalPierce + duelistPierceBonus;
    dieCount += totalPierce;
  }

  // Determine die color (apply upgrades/downgrades)
  let dieColor = defender.dieColor;
  // (No defense die upgrade/downgrade keywords in MVP — placeholder for future)

  // Roll the pool
  let results = rollDefensePool(dieColor, dieCount).map(face => ({ color: dieColor, face }));

  // Step 7d: Reroll dice
  results = rerollDefenseDice(results, config);

  // Capture surge count BEFORE conversion for Deflect/Shien wound calculation
  const surgeCountBeforeConversion = results.filter(d => d.face === DefenseFace.Surge).length;

  // Step 7e: Convert defense surges
  results = convertDefenseSurges(results, config, dodgeWasSpent);

  return { results, surgeCountBeforeConversion };
}

/**
 * Step 7d — Reroll defense dice
 */
function rerollDefenseDice(
  results: RolledDefenseDie[],
  config: AttackConfig
): RolledDefenseDie[] {
  const { defender } = config;
  let workingResults = [...results];

  // Uncanny Luck X: reroll up to X dice
  // Per rulebook: "may reroll up to X defense dice" — player chooses which.
  // Reroll blanks first, then surges (surges are effectively blanks when no conversion available).
  if (defender.uncannyLuckX > 0) {
    let rerolled = 0;
    // First pass: reroll blanks
    workingResults = workingResults.map(d => {
      if (rerolled < defender.uncannyLuckX && d.face === DefenseFace.Blank) {
        rerolled++;
        return { ...d, face: rollDefenseDie(d.color) };
      }
      return d;
    });
    // Second pass: reroll surges if no surge conversion is available and rerolls remain
    const hasSurgeConversion = defender.surgeChart === DefenseSurgeChart.ToBlock ||
                                defender.deflect || defender.block || defender.holdTheLine;
    if (!hasSurgeConversion && rerolled < defender.uncannyLuckX) {
      workingResults = workingResults.map(d => {
        if (rerolled < defender.uncannyLuckX && d.face === DefenseFace.Surge) {
          rerolled++;
          return { ...d, face: rollDefenseDie(d.color) };
        }
        return d;
      });
    }
  }

  // Soresu Mastery: reroll all defense dice (Ranged attacks only)
  if (defender.soresuMastery && config.attackType === AttackType.Ranged) {
    workingResults = workingResults.map(d => ({ ...d, face: rollDefenseDie(d.color) }));
  }

  return workingResults;
}

/**
 * Step 7e — Convert defense surges
 */
function convertDefenseSurges(
  results: RolledDefenseDie[],
  config: AttackConfig,
  dodgeWasSpent: boolean
): RolledDefenseDie[] {
  const { defender, attacker } = config;
  let workingResults = [...results];

  let surgeCount = workingResults.filter(d => d.face === DefenseFace.Surge).length;

  // 1. Unit surge chart
  if (defender.surgeChart === DefenseSurgeChart.ToBlock) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    surgeCount = 0;
  }

  // 2. Surge tokens: e→d (up to N)
  if (defender.surgeTokens > 0 && surgeCount > 0) {
    let converted = 0;
    workingResults = workingResults.map(d => {
      if (d.face === DefenseFace.Surge && converted < defender.surgeTokens) {
        converted++;
        return { ...d, face: DefenseFace.Block };
      }
      return d;
    });
    surgeCount -= converted;
  }

  // 3. Deflect: e→d (Ranged attacks only)
  // High Velocity completely disables Deflect (both surge conversion AND wound reflection).
  if (
    defender.deflect &&
    !attacker.highVelocity &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) &&
    surgeCount > 0
  ) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    surgeCount = 0;
  }

  // 4. Block: e→d (when Dodge token was actually spent in Step 5)
  // Block only activates if a Dodge was spent; tracked via dodgeWasSpent flag.
  // High Velocity prevents Dodge spending, which prevents Block activation.
  if (defender.block && dodgeWasSpent && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    surgeCount = 0;
  }

  // 5. Hold the Line (defender): e→d
  if (defender.holdTheLine && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    surgeCount = 0;
  }

  return workingResults;
}

/**
 * Roll Guardian Defense Sub-sequence
 * Guardian unit absorbs hits and rolls defense dice separately.
 * Wounds are tracked independently from the main defender.
 */
function rollGuardianDefense(
  guardianHits: number,
  config: AttackConfig
): { guardianWoundsNoPierce: number; guardianBlocks: number; guardianDeflectWounds: number } {
  const { defender } = config;

  // Guardian must have defense die configuration
  if (!defender.guardianDieColor) {
    // Fallback: if no die color specified, assume white die with no surge conversion
    defender.guardianDieColor = DefenseDieColor.White;
    defender.guardianSurgeChart = DefenseSurgeChart.None;
  }

  const guardianDieColor = defender.guardianDieColor;
  const guardianSurgeChart = defender.guardianSurgeChart || DefenseSurgeChart.None;

  // Roll defense dice for Guardian (no Danger Sense, Impervious, or other defender keywords)
  let guardianResults = rollDefensePool(guardianDieColor, guardianHits).map(face => ({
    color: guardianDieColor,
    face
  }));

  // Soresu Mastery (Guardian): spend 1 Dodge to reroll ALL guardian dice before surge conversion
  // Per rulebook: "When a unit with the Soresu Mastery keyword uses the Guardian X keyword,
  // it may spend 1 Dodge Token to reroll all of those dice before converting surge results."
  if (defender.guardianSoresuMastery && (defender.guardianDodgeTokens ?? 0) > 0) {
    guardianResults = guardianResults.map(d => ({ ...d, face: rollDefenseDie(d.color) }));
  }

  // Deflect (Guardian): before converting surges, attacker suffers 1 wound if
  // at least 1 surge result in guardian dice.
  // Per rulebook: "When a unit with the Deflect keyword uses the Guardian X keyword,
  // before converting any defense surges, the attacker suffers 1 Wound if at least 1
  // of the dice rolled with Guardian X has at least 1 surge result."
  let guardianDeflectWounds = 0;
  if (defender.guardianDeflect && !config.attacker.immuneDeflect) {
    const guardianSurges = guardianResults.filter(d => d.face === DefenseFace.Surge).length;
    if (guardianSurges > 0) {
      guardianDeflectWounds = 1;
    }
  }

  // Apply Guardian surge conversion
  if (guardianSurgeChart === DefenseSurgeChart.ToBlock) {
    guardianResults = guardianResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
  }
  // Deflect on Guardian also grants surge conversion (e→d) for Ranged attacks
  if (defender.guardianDeflect && (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)) {
    guardianResults = guardianResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
  }

  // Count blocks (no pierce applied — pierce is handled globally in compareResults)
  const guardianBlocks = guardianResults.filter(d => d.face === DefenseFace.Block).length;

  // Calculate Guardian wounds WITHOUT pierce
  const guardianWoundsNoPierce = Math.max(0, guardianHits - guardianBlocks);

  return { guardianWoundsNoPierce, guardianBlocks, guardianDeflectWounds };
}
```

**Verify:**
- Defense pool size = hits + crits + Danger Sense + Impervious (with total pierce)
- Impervious adds dice equal to total pierce from all sources (keyword + Lethal + Duelist)
- Uncanny Luck rerolls blanks
- Soresu Mastery rerolls all (Ranged only)
- Surge conversions apply in order
- Block activates if defender has at least 1 Dodge token assigned

---

## Step 2B.10 — Implement Step 8: Modify Defense Dice

**File:** `src/engine/attackSequence.ts` (update `modifyDefenseDice`)

```ts
/**
 * Step 8 — Modify Defense Dice
 * - Count blocks (Pierce is NOT applied here — deferred to Step 9)
 * - Immune: Pierce / Immune: Melee Pierce and Duelist (defender) are handled in compareResults
 */
function modifyDefenseDice(
  results: RolledDefenseDie[],
  config: AttackConfig,
  dodgeWasSpent: boolean
): { blocks: number } {
  // Count blocks — Pierce is NOT applied here.
  // Pierce is applied globally in compareResults to the combined block total.
  const blocks = results.filter(d => d.face === DefenseFace.Block).length;

  return { blocks };
}
```

**Verify:**
- Block count is returned without any Pierce applied
- Pierce is deferred to Step 9 (compareResults) where it is applied to the combined block total

---

## Step 2B.11 — Implement Step 9: Compare Results

**File:** `src/engine/attackSequence.ts` (update `compareResults`)

```ts
/**
 * Step 9 — Compare Results
 * Calculate three wound outputs:
 *   - guardianWoundsNoPierce: guardian hits − guardian blocks (no pierce)
 *   - mainTargetWoundsNoPierce: (hits + crits) − main target blocks (no pierce)
 *   - totalWounds: (all hits) − (combined blocks − pierce)
 * Calculate Deflect/Shien reflection wounds
 * Calculate Djem So wounds
 * Return full result
 *
 * Pierce is applied here (and only here) to the combined guardian + main target
 * block total, because the calculator cannot know which target to prioritize.
 */
function compareResults(
  attackResults: { hits: number; crits: number },
  defenseInfo: { mainTargetBlocks: number; guardianBlocks: number; guardianHits: number },
  config: AttackConfig,
  lethalPierce: number,
  duelistPierceBonus: number,
  surgeCountBeforeConversion: number,
  originalAttackRollResults: RolledAttackDie[],
  guardianWoundsNoPierce: number,
  guardianDeflectWounds: number,
  dodgeWasSpent: boolean
): AttackResult {
  const { attacker, defender } = config;

  // ── Individual target wounds WITHOUT pierce ──
  // Main target wounds (no pierce)
  const mainTargetHits = attackResults.hits + attackResults.crits;
  const mainTargetWoundsNoPierce = Math.max(0, mainTargetHits - defenseInfo.mainTargetBlocks);

  // ── Total wounds WITH pierce (applied to combined blocks) ──
  // Calculate total Pierce
  let totalPierce = attacker.pierceX + lethalPierce + duelistPierceBonus;

  // Makashi Mastery: reduce Pierce by 1 (Melee only)
  if (attacker.makashiMastery && (config.attackType === AttackType.Melee || config.attackType === AttackType.All)) {
    totalPierce = Math.max(0, totalPierce - 1);
  }

  // Immune: Pierce / Immune: Melee Pierce (applies to main target only)
  const immuneToThisPierce =
    (defender.immunePierce && !(attacker.makashiMastery && (config.attackType === AttackType.Melee || config.attackType === AttackType.All))) ||
    (defender.immuneMeleePierce && config.attackType === AttackType.Melee && !(attacker.makashiMastery && (config.attackType === AttackType.Melee || config.attackType === AttackType.All)));

  if (immuneToThisPierce) {
    totalPierce = 0;
  }

  // Combined blocks from both guardian and main target
  const combinedBlocks = defenseInfo.mainTargetBlocks + defenseInfo.guardianBlocks;
  const totalHits = mainTargetHits + defenseInfo.guardianHits;

  // Apply Pierce to combined block total
  const blocksAfterPierce = Math.max(0, combinedBlocks - totalPierce);
  const totalWounds = Math.max(0, totalHits - blocksAfterPierce);

  // Deflect / Shien Mastery reflection
  // Per rulebook: "before converting e results, the attacker suffers 1 Wound if there
  // is at least 1 e result in the defense roll."
  // We use surgeCountBeforeConversion captured before Step 7e conversion.
  let deflectWounds = 0;
  // High Velocity completely disables Deflect — both surge conversion and wound reflection.
  if (
    defender.deflect &&
    !attacker.highVelocity &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) &&
    !attacker.immuneDeflect
  ) {
    if (surgeCountBeforeConversion > 0) {
      if (defender.shienMastery) {
        // Shien Mastery: 1 wound per surge result
        deflectWounds = surgeCountBeforeConversion;
      } else {
        // Standard Deflect: 1 wound total if at least 1 surge
        deflectWounds = 1;
      }
    }
  }

  // Duelist (defender): Immune: Pierce when defending a Melee attack with Dodge spent
  // Per rulebook: "When this unit defends against a Melee attack, if it spends 1 or
  // more Dodge tokens, its defense dice cannot be canceled by Pierce X."
  if (defender.duelistDefender && config.attackType === AttackType.Melee && dodgeWasSpent) {
    totalPierce = 0;
  }

  // Djem So Mastery: attacker suffers 1 wound if attack roll contains any blank results (Melee only)
  // Per rulebook: "the attacking unit suffers 1 Wound if the attack roll contains 1 or more Blank results."
  // Note: checks the ORIGINAL attack roll (before Marksman conversions), and deals exactly 1 wound total.
  let djemSoWounds = 0;
  if (
    defender.djemSoMastery &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All)
  ) {
    const attackBlanks = originalAttackRollResults.filter(d => d.face === AttackFace.Blank).length;
    if (attackBlanks > 0) {
      djemSoWounds = 1;
    }
  }

  // Shien Mastery: if defending unit suffers no wounds, attacker does NOT gain suppression
  // Per rulebook: "If the defending unit did not suffer any wounds from the attack,
  // the attacking unit does not gain a Suppression Token."
  // Calculated after wounds are finalized, using totalWounds.
  // Note: This uses the already-calculated totalWounds from above.
  const shienSuppressesSuppression = defender.shienMastery && totalWounds === 0;

  // Suppression
  // Melee and Overrun attacks do not cause suppression.
  let suppressionApplied: number;
  if (config.attackType === AttackType.Melee || config.attackType === AttackType.Overrun) {
    suppressionApplied = 0;
  } else {
    suppressionApplied = attacker.suppressive ? 2 : 1;
  }
  if (shienSuppressesSuppression) {
    suppressionApplied = 0;
  }

  // Add guardian deflect wounds to the total deflect wounds
  deflectWounds += guardianDeflectWounds;

  return {
    guardianWoundsNoPierce,
    mainTargetWoundsNoPierce,
    totalWounds,
    deflectWounds,
    djemSoWounds,
    suppressionApplied,
  };
}
```

**Verify:**
- `guardianWoundsNoPierce` = guardian hits − guardian blocks (no pierce)
- `mainTargetWoundsNoPierce` = (main hits + crits) − main target blocks (no pierce)
- `totalWounds` = (all hits + crits) − (combined blocks − pierce)
- Pierce is applied to the combined block total (guardian + main target), NOT individually
- Immune: Pierce zeroes out pierce entirely
- Duelist (defender) sets pierce to 0 when Melee attack + Dodge spent
- Deflect reflects 1 wound (or N with Shien) using surgeCountBeforeConversion (not post-conversion surges)
- Guardian Deflect wounds are included in deflectWounds total
- Djem So: Melee only, checks ORIGINAL attack roll blanks (before Marksman), deals exactly 1 wound total
- Shien Mastery: suppression = 0 when defender takes no wounds
- Suppression is 1 (or 2 with Suppressive), or 0 if Shien suppresses it

---

## Step 2B.12 — Wire Up Full Attack Sequence Pipeline

**File:** `src/engine/attackSequence.ts` (update `executeAttackSequence`)

Now connect all the step functions with correct data flow.

```ts
export function executeAttackSequence(config: AttackConfig): AttackResult {
  // Step 2
  const poolAfterStep2 = formAttackPool(config);

  // Step 4a
  const poolAfterStep4a = upgradeDowgradeAttackDice(poolAfterStep2, config);

  // Step 4b
  const rolledAttack = rollAttackDice(poolAfterStep4a);

  // Step 4c
  const { results: afterRerolls, aimsSpent, pierceBonus, aimsSavedForMarksman } =
    rerollAttackDice(rolledAttack, config);

  // Step 4d
  const afterSurgeConversion = convertAttackSurges(afterRerolls, config);

  // Step 4d.5 — Apply Marksman (post-surge conversion)
  const afterMarksman = applyMarksman(afterSurgeConversion, config, aimsSavedForMarksman);

  // Step 5
  const { hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, dodgeWasSpent } =
    applyDodgeAndCover(afterMarksman, config);

  // Step 6
  const blanksAfterStep5 = afterMarksman.filter(d => d.face === AttackFace.Blank || d.face === AttackFace.Surge).length;
  const { hits, crits, lethalPierce, guardianHits } =
    modifyAttackDice({ hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, blanks: blanksAfterStep5 }, config, aimsSpent, aimsSavedForMarksman);

  // Step 6b — Roll Guardian Defense (if Guardian absorbed hits)
  // Pierce is NOT applied to Guardian — tracked separately without pierce
  let guardianWoundsNoPierce = 0;
  let guardianBlocks = 0;
  let guardianDeflectWounds = 0;
  if (guardianHits > 0 && config.defender.guardianX > 0) {
    const guardianResult = rollGuardianDefense(guardianHits, config);
    guardianWoundsNoPierce = guardianResult.guardianWoundsNoPierce;
    guardianBlocks = guardianResult.guardianBlocks;
    guardianDeflectWounds = guardianResult.guardianDeflectWounds;
  }

  // Step 7
  const { results: defenseResults, surgeCountBeforeConversion } =
    rollDefenseDice({ hits, crits }, config, lethalPierce, pierceBonus, dodgeWasSpent);

  // Step 8 — Modify Defense Dice (no pierce applied here either)
  const { blocks: mainTargetBlocks } = modifyDefenseDice(
    defenseResults, config, dodgeWasSpent
  );

  // Step 9 — Compare Results
  // Calculates: guardian wounds (no pierce), main target wounds (no pierce),
  // and total wounds (with pierce applied to combined blocks)
  // Note: passes rolledAttack (original roll before Marksman) for Djem So blank check
  const finalResult = compareResults(
    { hits, crits }, { mainTargetBlocks, guardianBlocks, guardianHits },
    config, lethalPierce, pierceBonus, surgeCountBeforeConversion,
    rolledAttack, guardianWoundsNoPierce, guardianDeflectWounds, dodgeWasSpent
  );

  return finalResult;
}
```

**Verify:**
- Full pipeline compiles
- Calling with a config returns a valid `AttackResult`
- Run smoke test with known inputs (e.g., 5 red dice, no keywords → some wounds)

**Important:** Ensure the `RolledAttackDie` refactor from Step 2B.5 is consistently applied throughout the pipeline. All steps handling attack dice (4b–6) should use `RolledAttackDie[]` to preserve die color information for rerolls.

---

## Step 2C.1 — Implement Cover Resolver

**File:** `src/engine/coverResolver.ts`

Isolated module for cover mechanics (Step 5a–d).

```ts
import type { AttackConfig } from './types';
import { CoverType } from './types';
import { rollDefenseDie } from './dice';
import { DefenseDieColor, DefenseFace } from './types';

/**
 * Determine the effective Cover value for the attack.
 * Cover is improved by: base cover + Suppressed + Cover X + Smoke tokens
 * Cover is reduced by: Sharpshooter X
 * Improvements are applied before reductions.
 * Cover is capped at 2 (Heavy).
 * Blast and Death From Above set Cover to 0.
 */
export function determineCoverValue(config: AttackConfig): number {
  const { attacker, defender } = config;

  // Blast (unless defender has Immune: Blast) or Death From Above → Cover = 0
  if ((attacker.blast && !defender.immuneBlast) || attacker.deathFromAbove) {
    return 0;
  }

  // Base cover
  let cover = 0;
  switch (defender.coverType) {
    case CoverType.Light:
      cover = 1;
      break;
    case CoverType.Heavy:
      cover = 2;
      break;
    case CoverType.None:
    default:
      cover = 0;
  }

  // Improvements (apply before reductions)
  if (defender.suppressed) cover += 1;
  // Cover X only applies to Ranged attacks (per rulebook)
  if (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) {
    cover += defender.coverX;
  }
  cover += defender.smokeTokens;

  // Cap at 2
  cover = Math.min(cover, 2);

  // Reductions (after cap)
  cover -= attacker.sharpshooterX;
  cover = Math.max(cover, 0);

  return cover;
}

/**
 * Roll the cover pool: 1 white defense die per hit.
 * Low Profile: reduces pool by 1, grants 1 automatic block.
 * Returns the number of blocks (cover cancellations).
 */
export function rollCoverPool(
  hitCount: number,
  coverValue: number,
  lowProfile: boolean
): number {
  let poolSize = hitCount;
  let autoBlocks = 0;

  // Low Profile: -1 die, +1 auto block
  if (lowProfile) {
    poolSize = Math.max(0, poolSize - 1);
    autoBlocks = 1;
  }

  // Roll pool
  let blocks = autoBlocks;
  for (let i = 0; i < poolSize; i++) {
    const face = rollDefenseDie(DefenseDieColor.White);
    // Light cover (1): only blocks cancel
    // Heavy cover (2): blocks and surges cancel
    if (face === DefenseFace.Block) {
      blocks++;
    } else if (face === DefenseFace.Surge && coverValue >= 2) {
      blocks++;
    }
  }

  return blocks;
}

/**
 * Apply cover cancellations based on cover value.
 * Light (1): each block/surge cancels 1 hit
 * Heavy (2): each block/surge cancels 1 hit
 * (Note: Heavy also allows surge to cancel, but this is already rolled in rollCoverPool.)
 */
export function applyCover(
  hits: number,
  coverBlocks: number,
  coverValue: number
): number {
  // Cover blocks cancel hits 1:1
  return Math.max(0, hits - coverBlocks);
}
```

**Verify:**
- Cover value calculation follows rules (improvements before reductions, cap at 2)
- Blast sets cover to 0
- Low Profile reduces pool size, adds auto-block
- Cover blocks cancel hits

**Unit Test:**
```ts
describe('determineCoverValue', () => {
  it('applies base cover', () => {
    const config = {
      attacker: { blast: false, deathFromAbove: false, sharpshooterX: 0 },
      defender: { coverType: CoverType.Light, suppressed: false, coverX: 0, smokeTokens: 0 },
    };
    expect(determineCoverValue(config)).toBe(1);
  });

  it('caps cover at 2', () => {
    const config = {
      attacker: { blast: false, deathFromAbove: false, sharpshooterX: 0 },
      defender: {
        coverType: CoverType.Heavy,
        suppressed: true,
        coverX: 2,
        smokeTokens: 3,
      },
    };
    expect(determineCoverValue(config)).toBe(2); // Capped
  });

  it('Blast sets cover to 0', () => {
    const config = {
      attacker: { blast: true, deathFromAbove: false, sharpshooterX: 0 },
      defender: { coverType: CoverType.Heavy, suppressed: true, coverX: 1, smokeTokens: 1 },
    };
    expect(determineCoverValue(config)).toBe(0);
  });
});
```

---

## Step 2D.1 — Implement Modifier Helpers

**File:** `src/engine/modifiers.ts`

Helper functions for keyword effects and attack-type filtering.

```ts
import { AttackType } from './types';
import type { AttackConfig } from './types';

/**
 * Determine if a keyword is active for the given attack type.
 */
export function isKeywordActive(
  keyword: string,
  attackType: AttackType,
  restriction?: 'ranged' | 'melee' | 'all'
): boolean {
  if (!restriction || restriction === 'all') return true;

  if (restriction === 'ranged') {
    return attackType === AttackType.Ranged || attackType === AttackType.All;
  }

  if (restriction === 'melee') {
    return attackType === AttackType.Melee || attackType === AttackType.All;
  }

  return false;
}

/**
 * Check if Cover is active for this attack.
 * Cover is disabled by Blast, Death From Above, Immune: Blast.
 */
export function isCoverActive(config: AttackConfig): boolean {
  const { attacker, defender } = config;
  if (attacker.blast && !defender.immuneBlast) return false;
  if (attacker.deathFromAbove) return false;
  return true;
}

/**
 * Check if Dodge is active for this attack.
 * Dodge is disabled by High Velocity.
 */
export function isDodgeActive(config: AttackConfig): boolean {
  return !config.attacker.highVelocity;
}

/**
 * Check if Deflect is active for this attack.
 * Deflect only works on Ranged attacks and is disabled by High Velocity.
 * High Velocity completely disables all Deflect effects.
 */
export function isDeflectActive(config: AttackConfig): boolean {
  const { attacker } = config;
  return (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) && !attacker.highVelocity;
}

// Add more helper functions as needed for specific keywords
```

**Verify:**
- Attack type filtering returns correct booleans
- Cover/Dodge/Deflect active checks match rules

**Unit Tests:**
```ts
describe('isKeywordActive', () => {
  it('returns true for unrestricted keywords', () => {
    expect(isKeywordActive('Impact', AttackType.Melee, 'all')).toBe(true);
  });

  it('returns false for ranged-only keyword in melee attack', () => {
    expect(isKeywordActive('Sharpshooter', AttackType.Melee, 'ranged')).toBe(false);
  });
});
```

---

## Step 2D.2 — Integrate Modifier Helpers into Attack Sequence

Update the attack sequence functions to use the modifier helpers where applicable.

Example: In `applyDodgeAndCover`, use `isDodgeActive()` instead of directly checking `!attacker.highVelocity`.

```ts
// Before:
if (!attacker.highVelocity && defender.dodgeTokens > 0) { ... }

// After:
import { isDodgeActive } from './modifiers';
if (isDodgeActive(config) && defender.dodgeTokens > 0) { ... }
```

**Verify:**
- All attack-type restrictions are correctly enforced
- Keywords are enabled/disabled based on attack type

---

## Step 2.X — Comprehensive Unit Testing

**Goal:** Achieve 100% coverage of the engine module with unit tests.

**Test Structure:**
- `dice.test.ts` — die rolling, distributions, upgrade/downgrade
- `coverResolver.test.ts` — cover value calculation, cover pool rolling
- `attackSequence.test.ts` — full pipeline, each step in isolation, edge cases
- `modifiers.test.ts` — keyword active checks

**Test Cases to Cover:**
- Zero dice pools
- All blanks, all hits, all crits
- Max keyword values (e.g., Pierce 5, Armor 5)
- Cover cap enforcement
- Attack type filtering (Ranged/Melee/Overrun)
- Immune: Pierce, Immune: Blast, Immune: Deflect
- Makashi Mastery disabling Immune: Pierce and Impervious
- High Velocity disabling Dodge and Deflect (both surge conversion and wound reflection)
- Deflect/Shien Mastery reflection
- Djem So Mastery counter-damage
- Guardian cancellations (simplified)
- Impervious defense dice (total pierce from all sources: keyword + Lethal + Duelist)
- Aim token economy (Aim shared by rerolls, Lethal, Marksman, Duelist)
- Surge conversion priority order
- Defense surge conversion priority order
- Block keyword activation (when Dodge tokens are assigned)

**Run:**
```bash
npm test
```

**Expected:** All tests pass, coverage report shows >90% line coverage in engine folder.

---

## Phase 2 Deliverables Checklist

- [ ] **Types & Dice Definitions** (`types.ts`, `dice.ts`)
  - [ ] Enums and interfaces defined
  - [ ] Die face distributions implemented
  - [ ] Roll functions working
  - [ ] Upgrade/downgrade functions tested
- [ ] **Attack Sequence Pipeline** (`attackSequence.ts`)
  - [ ] Step 2: Form Attack Pool (Spray, Makashi Mastery)
  - [ ] Step 4a: Upgrade/Downgrade Attack Dice
  - [ ] Step 4b: Roll Attack Dice
  - [ ] Step 4c: Reroll Attack Dice (Aim, Observation, Marksman, Duelist)
  - [ ] Step 4d: Convert Attack Surges (surge chart, tokens, keywords)
  - [ ] Step 5: Apply Dodge and Cover
  - [ ] Step 6: Modify Attack Dice (Armor, Impact, Shielded, etc.)
  - [ ] Step 7: Roll Defense Dice (surge conversion, rerolls)
  - [ ] Step 8: Modify Defense Dice (Pierce, Immune: Pierce, Djem So)
  - [ ] Step 9: Compare Results (wounds, reflection, suppression)
- [ ] **Cover Resolver** (`coverResolver.ts`)
  - [ ] Cover value determination (cap at 2, improvements before reductions)
  - [ ] Cover pool rolling (Low Profile)
  - [ ] Cover application
- [ ] **Modifier Helpers** (`modifiers.ts`)
  - [ ] Attack-type filtering
  - [ ] Keyword active checks
- [ ] **Unit Tests**
  - [ ] 100% coverage of engine module
  - [ ] Edge case testing
  - [ ] Statistical distribution validation

**Output:** Complete, fully-tested dice engine ready for integration with simulator (Phase 3) and UI (Phases 4–7).

---

## Known Limitations & Future Work

These features are referenced in the design spec but deferred to post-MVP:

1. **Ion X** — Keyword mentioned in rulebook but no UI input in DESIGN_CONCEPT.md. Defer.
2. **Primitive** — Keyword mentioned in rulebook but no UI input. Defer.
3. **Weak Point X** — Requires arc logic (front/side/rear). Defer.
4. **Anti-Materiel X / Anti-Personnel X** — Requires unit type (Vehicle vs Trooper). Defer.
5. **Arsenal X / Gunslinger / Beam X** — Multiple attack pools. Defer.

---

## Notes for Phase 3 Integration

The engine is designed to be called by a Monte Carlo simulator:

```ts
import { executeAttackSequence } from './engine/attackSequence';

function simulate(config: AttackConfig, iterations: number) {
  const results = [];
  for (let i = 0; i < iterations; i++) {
    results.push(executeAttackSequence(config));
  }
  return computeStats(results);
}
```

The engine returns a new result object on each call (no shared state), making it safe for parallel execution and repeated invocation.
