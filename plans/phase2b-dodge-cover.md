# Phase 2B — Dodge & Cover (Step 5) + Cover Resolver — Detailed Implementation Plan

## Goal

Implement Step 5 of the attack sequence (Apply Dodge and Cover) and the standalone Cover Resolver module. This step reduces the attack's hit count through cover mechanics and Dodge token spending.

**Files:**
- `src/engine/attackSequence.ts` — `applyDodgeAndCover()` function
- `src/engine/coverResolver.ts` — Cover value computation and cover pool rolling

**Depends on:** `RolledAttackDie`, modifier helpers (`isDodgeActive()`, `isCoverActive()`)

---

## Data Flow

```
Input:  RolledAttackDie[]  (from Step 4d.6 — post-surge, post-Marksman, post-Jar'Kai)
        AttackConfig       (full config)

Output: {
  hits: number,            // Remaining hits after cover and dodge
  crits: number,           // Remaining crits (only reduced by Outmaneuver+Dodge)
  dodgeWasSpent: boolean   // Whether at least 1 Dodge token was spent (for Block/Duelist)
}
```

**Note:** After this step, we lose the `RolledAttackDie[]` representation and work with aggregate `{ hits, crits }` counts for the remaining pipeline steps.

---

## Step 5a-b — Determine Cover Value

### Cover Value Calculation Rules

Cover is computed as an integer 0-2, following this order:

```
1. Check overrides: Blast → 0, Death From Above → 0
2. Start with base cover type: None=0, Light=1, Heavy=2
3. Apply improvements (additive, BEFORE cap):
   - Suppressed: +1
   - Cover X: +X (Ranged attacks only)
   - Smoke tokens: +1 per token
4. Cap at 2 (Heavy maximum)
5. Apply reductions (AFTER cap):
   - Sharpshooter X: -X
6. Floor at 0
```

### Implementation: `determineCoverValue()`

```ts
export function determineCoverValue(config: AttackConfig): number {
  const { attacker, defender } = config;

  // ── Override checks ──
  // Blast sets cover to 0 (unless defender has Immune: Blast)
  if (attacker.blast && !defender.immuneBlast) {
    return 0;
  }
  // Death From Above sets cover to 0 (no immunity)
  if (attacker.deathFromAbove) {
    return 0;
  }

  // ── Base cover value ──
  let cover = 0;
  switch (defender.coverType) {
    case CoverType.None:
      cover = 0;
      break;
    case CoverType.Light:
      cover = 1;
      break;
    case CoverType.Heavy:
      cover = 2;
      break;
  }

  // ── Improvements (additive) ──
  // Suppressed: +1 cover
  if (defender.suppressed) {
    cover += 1;
  }

  // Cover X: +X (only applies to Ranged attacks per rulebook)
  if (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) {
    cover += defender.coverX;
  }

  // Smoke tokens: +1 per token
  cover += defender.smokeTokens;

  // ── Cap at 2 ──
  cover = Math.min(cover, 2);

  // ── Reductions (after cap) ──
  cover -= attacker.sharpshooterX;

  // ── Floor at 0 ──
  cover = Math.max(cover, 0);

  return cover;
}
```

### Edge Cases

| Scenario | Cover Value |
|----------|------------|
| None, no modifiers | 0 |
| Light, no modifiers | 1 |
| Heavy, no modifiers | 2 |
| Light + Suppressed | 2 (1+1, capped at 2) |
| Heavy + Suppressed + Cover 2 + Smoke 3 | 2 (capped) |
| Heavy + Sharpshooter 1 | 1 (2 - 1) |
| Heavy + Sharpshooter 3 | 0 (floored at 0) |
| Light + Sharpshooter 2 | 0 (1 - 2, floored) |
| Light + Suppressed + Sharpshooter 1 | 1 (1+1=2, cap=2, -1=1) |
| Blast + Heavy | 0 (override) |
| Blast + Immune: Blast + Heavy | 2 (Blast negated by immunity) |
| Death From Above + Heavy | 0 (override, no immunity) |
| None + Cover 3 | 2 (0+3=3, capped at 2) |
| Cover X + Melee attack | 0 (Cover X is Ranged only) |
| Cover X + All attack type | X (All includes Ranged) |

---

## Step 5c — Roll Cover Pool

### Cover Pool Mechanics

The cover pool consists of **white defense dice** — one per hit (a) result. Crits (b) are **not** affected by cover (they bypass cover entirely).

The number of cover cancellations depends on the cover value:
- **Light (1):** Only `Block (d)` faces cancel hits
- **Heavy (2):** Both `Block (d)` and `Surge (e)` faces cancel hits

### Low Profile Interaction

Low Profile modifies the cover pool:
- Pool size reduced by 1 (minimum 0)
- +1 automatic block (guaranteed cancellation)

**Important edge case:** Low Profile only applies its auto-block when the defender **would roll 1 or more cover dice** — meaning `hitCount > 0` AND `coverValue > 0`. If cover is disabled (by Blast, Sharpshooter reducing cover to 0, or simply having no cover), Low Profile has no effect. This matches the rulebook: "While defending against a ranged attack, during the Roll Cover Pool step, if the defending unit would roll 1 or more cover dice, it rolls 1 fewer cover die and adds 1 automatic block result."

### Implementation: `rollCoverPool()`

```ts
/**
 * Roll the cover pool and count cancellations.
 *
 * @param hitCount - Number of hit (a) results to roll cover for
 * @param coverValue - Effective cover (1=Light, 2=Heavy)
 * @param lowProfile - Whether defender has Low Profile keyword
 * @returns Number of hits cancelled by cover
 */
export function rollCoverPool(
  hitCount: number,
  coverValue: number,
  lowProfile: boolean,
  dugIn: boolean = false
): number {
  if (hitCount <= 0 || coverValue <= 0) return 0;

  let poolSize = hitCount;
  let autoBlocks = 0;

  // Low Profile: -1 die, +1 guaranteed block
  // Only applies when the defender would roll 1 or more cover dice.
  // If cover is 0 (due to Blast, Sharpshooter, or no cover), Low Profile has no effect.
  if (lowProfile && poolSize > 0) {
    autoBlocks = 1;
    poolSize = Math.max(0, poolSize - 1);
  }

  // Roll cover dice — normally white, but red if the defender has the Dug In upgrade
  const coverDieColor = dugIn ? DefenseDieColor.Red : DefenseDieColor.White;
  let blocks = autoBlocks;
  for (let i = 0; i < poolSize; i++) {
    const face = rollDefenseDie(coverDieColor);

    if (face === DefenseFace.Block) {
      // Block always cancels (Light or Heavy)
      blocks++;
    } else if (face === DefenseFace.Surge && coverValue >= 2) {
      // Surge only cancels with Heavy cover
      blocks++;
    }
    // Blanks never cancel
  }

  // Cover cancellations cannot exceed the number of hits
  return Math.min(blocks, hitCount);
}
```

### Cover Die Distribution (for reference)

**White Defense Die (default):**
```
Faces: Blank ×4, Block ×1, Surge ×1  (6-sided)
Block rate: 1/6 ≈ 16.7%
Block+Surge rate: 2/6 ≈ 33.3%
```

**Red Defense Die (Dug In upgrade):**
```
Faces: Blank ×2, Block ×3, Surge ×1  (6-sided)
Block rate: 3/6 = 50.0%
Block+Surge rate: 4/6 ≈ 66.7%
```

**Expected cancellations per hit:**
- Light cover (white): 1/6 ≈ 0.167 hits cancelled per die
- Heavy cover (white): 2/6 ≈ 0.333 hits cancelled per die
- Light cover (red / Dug In): 3/6 = 0.500 hits cancelled per die
- Heavy cover (red / Dug In): 4/6 ≈ 0.667 hits cancelled per die

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| 0 hits | 0 cancellations (no dice to roll) |
| 0 cover value | 0 cancellations (no cover) |
| 5 hits + Light cover | Roll 5 white dice, count blocks only |
| 5 hits + Heavy cover | Roll 5 white dice, count blocks + surges |
| 5 hits + Light + Dug In | Roll 5 red dice, count blocks only (higher block rate) |
| 5 hits + Heavy + Dug In | Roll 5 red dice, count blocks + surges |
| 1 hit + Low Profile + Light | Pool size = 0, auto block = 1 → 1 cancellation |
| 3 hits + Low Profile + Heavy | Pool size = 2, auto block = 1 → 1 + roll 2 dice |
| Low Profile + 0 hits | 0 (no pool to modify) |
| Low Profile + 0 cover (Blast, SS, or None) | 0 (Low Profile requires cover dice to activate) |
| Cancellations > hits | Capped at hit count |

---

## Step 5d — Apply Cover Cancellations

```ts
export function applyCover(
  hits: number,
  coverBlocks: number,
  coverValue: number
): number {
  if (coverValue <= 0) return hits;
  return Math.max(0, hits - coverBlocks);
}
```

---

## Step 5e — Apply Dodge

### Dodge Rules

1. Each Dodge token cancels 1 hit (a) result
2. **Outmaneuver:** Dodge tokens can also cancel crit (b) results
3. **High Velocity:** Prevents spending Dodge tokens entirely
4. **Block keyword:** Allows spending Dodge even when there are no hits to cancel (activates defense surge conversion in Step 7e)

### Dodge Priority

When Outmaneuver is active:
- Cancel **hits first**, then crits (hits are more efficiently removed since crits bypass other keywords)

When Outmaneuver is NOT active:
- Cancel hits only (crits cannot be cancelled)

### Implementation: `applyDodgeAndCover()` (Full Function)

```ts
function applyDodgeAndCover(
  results: RolledAttackDie[],
  config: AttackConfig
): { hits: number; crits: number; dodgeWasSpent: boolean } {
  const { attacker, defender } = config;

  // ── Count results ──
  let hits = results.filter(d => d.face === AttackFace.Hit).length;
  let crits = results.filter(d => d.face === AttackFace.Critical).length;

  // ── Step 5a-d: Cover ──
  const coverValue = determineCoverValue(config);

  if (coverValue > 0 && hits > 0) {
    const coverBlocks = rollCoverPool(hits, coverValue, defender.lowProfile, defender.dugIn);
    hits = Math.max(0, hits - coverBlocks);
  }

  // ── Step 5e: Dodge ──
  let dodgeWasSpent = false;

  // High Velocity prevents Dodge spending entirely
  if (attacker.highVelocity) {
    // No Dodge processing — dodgeWasSpent stays false
    // This also prevents Block activation (Block requires Dodge spent)
    return { hits, crits, dodgeWasSpent };
  }

  if (defender.dodgeTokens > 0) {
    let dodgesRemaining = defender.dodgeTokens;

    // Cancel hits first
    if (hits > 0 && dodgesRemaining > 0) {
      const hitsCancelled = Math.min(hits, dodgesRemaining);
      hits -= hitsCancelled;
      dodgesRemaining -= hitsCancelled;
      dodgeWasSpent = true;
    }

    // Outmaneuver: cancel crits with remaining Dodge tokens
    if (defender.outmaneuver && crits > 0 && dodgesRemaining > 0) {
      const critsCancelled = Math.min(crits, dodgesRemaining);
      crits -= critsCancelled;
      dodgesRemaining -= critsCancelled;
      dodgeWasSpent = true;
    }

    // Block: spend Dodge even with nothing to cancel
    // This enables Block's defense surge conversion (e→d) in Step 7e.
    // Per rulebook: "Units may spend Dodge Tokens even if there are
    // no hit results to cancel."
    // Important: Block only matters if defender HAS the Block keyword.
    if (!dodgeWasSpent && defender.block && dodgesRemaining > 0) {
      dodgeWasSpent = true;
      // No actual cancellation occurs — just marks that a Dodge was spent
    }
  }

  return { hits, crits, dodgeWasSpent };
}
```

### `dodgeWasSpent` Downstream Effects

The `dodgeWasSpent` flag controls:
1. **Block (Step 7e):** When `dodgeWasSpent === true` and defender has Block keyword, all defense surges convert to blocks
2. **Duelist Defender (Step 9):** When `dodgeWasSpent === true` and Melee attack, defender gains Immune: Pierce

---

## Edge Cases

| Scenario | Expected |
|----------|----------|
| No cover, no Dodge | hits/crits unchanged, dodgeWasSpent=false |
| Heavy cover + 3 hits + 2 crits | Cover rolls for 3 hits, crits unaffected |
| 2 Dodge + 3 hits | 2 hits cancelled, dodgeWasSpent=true |
| 3 Dodge + 1 hit | 1 hit cancelled, 2 Dodges unused, dodgeWasSpent=true |
| 1 Dodge + Outmaneuver + 0 hits + 2 crits | 1 crit cancelled, dodgeWasSpent=true |
| 2 Dodge + Outmaneuver + 3 hits + 2 crits | 2 hits cancelled (hits first), 0 crits cancelled |
| High Velocity + 3 Dodge | No cancellation, dodgeWasSpent=false |
| Block + 1 Dodge + 0 hits + 0 crits | dodgeWasSpent=true (Block activation) |
| Block + 0 Dodge | dodgeWasSpent=false (need at least 1 Dodge) |
| Block + High Velocity + 1 Dodge | dodgeWasSpent=false (HV prevents Dodge) |
| Cover + Dodge combined | Cover applied first, then Dodge on remaining hits |
| All results are blanks/surges (0 hits, 0 crits) | Cover rolls 0 dice, Dodge has nothing to cancel |
| Low Profile + Light + 1 hit | Auto-block cancels the 1 hit |
| Low Profile + Heavy + 0 hits | 0 cancellations |

---

## Unit Tests

### Cover Value Tests

```ts
describe('determineCoverValue', () => {
  it('returns 0 for no cover', () => {
    const config = makeConfig({ defender: { coverType: CoverType.None } });
    expect(determineCoverValue(config)).toBe(0);
  });

  it('returns 1 for light cover', () => {
    const config = makeConfig({ defender: { coverType: CoverType.Light } });
    expect(determineCoverValue(config)).toBe(1);
  });

  it('returns 2 for heavy cover', () => {
    const config = makeConfig({ defender: { coverType: CoverType.Heavy } });
    expect(determineCoverValue(config)).toBe(2);
  });

  it('caps cover at 2 regardless of improvements', () => {
    const config = makeConfig({
      defender: {
        coverType: CoverType.Heavy,
        suppressed: true,
        coverX: 3,
        smokeTokens: 5,
      },
    });
    expect(determineCoverValue(config)).toBe(2);
  });

  it('applies Sharpshooter after cap', () => {
    const config = makeConfig({
      attacker: { sharpshooterX: 1 },
      defender: { coverType: CoverType.Heavy },
    });
    expect(determineCoverValue(config)).toBe(1); // 2 - 1
  });

  it('Sharpshooter cannot reduce below 0', () => {
    const config = makeConfig({
      attacker: { sharpshooterX: 5 },
      defender: { coverType: CoverType.Light },
    });
    expect(determineCoverValue(config)).toBe(0);
  });

  it('Blast overrides to 0', () => {
    const config = makeConfig({
      attacker: { blast: true },
      defender: { coverType: CoverType.Heavy },
    });
    expect(determineCoverValue(config)).toBe(0);
  });

  it('Immune: Blast negates Blast', () => {
    const config = makeConfig({
      attacker: { blast: true },
      defender: { coverType: CoverType.Heavy, immuneBlast: true },
    });
    expect(determineCoverValue(config)).toBe(2);
  });

  it('Death From Above overrides to 0 (no immunity)', () => {
    const config = makeConfig({
      attacker: { deathFromAbove: true },
      defender: { coverType: CoverType.Heavy, immuneBlast: true },
    });
    expect(determineCoverValue(config)).toBe(0);
  });

  it('Suppressed improves cover before cap', () => {
    const config = makeConfig({
      defender: { coverType: CoverType.Light, suppressed: true },
    });
    expect(determineCoverValue(config)).toBe(2); // 1 + 1 = 2, capped
  });

  it('Cover X only applies to Ranged/All', () => {
    const meleeConfig = makeConfig({
      defender: { coverType: CoverType.None, coverX: 2 },
      attackType: AttackType.Melee,
    });
    expect(determineCoverValue(meleeConfig)).toBe(0);

    const rangedConfig = makeConfig({
      defender: { coverType: CoverType.None, coverX: 2 },
      attackType: AttackType.Ranged,
    });
    expect(determineCoverValue(rangedConfig)).toBe(2);
  });

  it('Smoke tokens add to cover', () => {
    const config = makeConfig({
      defender: { coverType: CoverType.None, smokeTokens: 2 },
    });
    expect(determineCoverValue(config)).toBe(2); // 0 + 2, capped at 2
  });

  it('improvements then reductions example: Light + Suppressed + Smoke + SS1', () => {
    const config = makeConfig({
      attacker: { sharpshooterX: 1 },
      defender: {
        coverType: CoverType.Light,
        suppressed: true,
        smokeTokens: 1,
      },
    });
    // Light(1) + Suppressed(1) + Smoke(1) = 3, cap = 2, - SS(1) = 1
    expect(determineCoverValue(config)).toBe(1);
  });
});
```

### Cover Pool Tests

```ts
describe('rollCoverPool', () => {
  it('returns 0 for 0 hits', () => {
    expect(rollCoverPool(0, 1, false)).toBe(0);
  });

  it('returns 0 for 0 cover value', () => {
    expect(rollCoverPool(5, 0, false)).toBe(0);
  });

  it('Low Profile adds 1 auto-block and reduces pool by 1', () => {
    // With 1 hit and Low Profile: pool size = 0, auto block = 1
    const result = rollCoverPool(1, 1, true);
    expect(result).toBe(1); // Just the auto-block
  });

  it('Low Profile with 0 hits returns 0', () => {
    // 0 hits + Low Profile → no cover dice to roll, LP doesn't activate
    expect(rollCoverPool(0, 1, true)).toBe(0);
  });

  it('Low Profile with 0 cover returns 0', () => {
    // Blast/Sharpshooter/no cover → cover = 0, LP doesn't activate
    expect(rollCoverPool(3, 0, true)).toBe(0);
  });

  it('cancellations cannot exceed hit count', () => {
    // Even with lots of blocks, can't cancel more hits than exist
    // This is hard to test deterministically without mocking
    // Use statistical test: run many times, ensure never exceeds hitCount
    for (let i = 0; i < 100; i++) {
      const result = rollCoverPool(2, 2, true);
      expect(result).toBeLessThanOrEqual(2);
    }
  });

  it('light cover only counts blocks (statistical)', () => {
    // Light cover: only Block (d) faces cancel → ~1/6 ≈ 16.7%
    const iterations = 10000;
    let totalCancels = 0;
    for (let i = 0; i < iterations; i++) {
      totalCancels += rollCoverPool(1, 1, false);
    }
    const rate = totalCancels / iterations;
    expect(rate).toBeCloseTo(1 / 6, 1); // ±0.05
  });

  it('heavy cover counts blocks and surges (statistical)', () => {
    // Heavy cover: Block + Surge → ~2/6 ≈ 33.3%
    const iterations = 10000;
    let totalCancels = 0;
    for (let i = 0; i < iterations; i++) {
      totalCancels += rollCoverPool(1, 2, false);
    }
    const rate = totalCancels / iterations;
    expect(rate).toBeCloseTo(2 / 6, 1); // ±0.05
  });

  it('Dug In uses red dice — light cover (statistical)', () => {
    // Red die: 3/6 block → ~50% cancel rate for light cover
    const iterations = 10000;
    let totalCancels = 0;
    for (let i = 0; i < iterations; i++) {
      totalCancels += rollCoverPool(1, 1, false, true);
    }
    const rate = totalCancels / iterations;
    expect(rate).toBeCloseTo(3 / 6, 1); // ±0.05
  });

  it('Dug In uses red dice — heavy cover (statistical)', () => {
    // Red die: 3/6 block + 1/6 surge → ~66.7% cancel rate for heavy cover
    const iterations = 10000;
    let totalCancels = 0;
    for (let i = 0; i < iterations; i++) {
      totalCancels += rollCoverPool(1, 2, false, true);
    }
    const rate = totalCancels / iterations;
    expect(rate).toBeCloseTo(4 / 6, 1); // ±0.05
  });
});
```

### Dodge Tests

```ts
describe('applyDodgeAndCover (dodge logic)', () => {
  it('Dodge cancels hits', () => {
    const results = makeDice([
      { color: AttackDieColor.Red, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Critical },
    ]);
    const config = makeConfig({
      defender: { dodgeTokens: 1, coverType: CoverType.None },
    });
    const { hits, crits, dodgeWasSpent } = applyDodgeAndCover(results, config);
    expect(hits).toBe(1); // 2 - 1
    expect(crits).toBe(1); // Unaffected
    expect(dodgeWasSpent).toBe(true);
  });

  it('Outmaneuver allows cancelling crits after hits', () => {
    const results = makeDice([
      { color: AttackDieColor.Red, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Critical },
      { color: AttackDieColor.Red, face: AttackFace.Critical },
    ]);
    const config = makeConfig({
      defender: { dodgeTokens: 3, outmaneuver: true, coverType: CoverType.None },
    });
    const { hits, crits, dodgeWasSpent } = applyDodgeAndCover(results, config);
    expect(hits).toBe(0); // 1 hit cancelled
    expect(crits).toBe(0); // 2 crits cancelled
    expect(dodgeWasSpent).toBe(true);
  });

  it('High Velocity prevents all Dodge spending', () => {
    const results = makeDice([
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ]);
    const config = makeConfig({
      attacker: { highVelocity: true },
      defender: { dodgeTokens: 3, coverType: CoverType.None },
    });
    const { hits, dodgeWasSpent } = applyDodgeAndCover(results, config);
    expect(hits).toBe(1); // No cancellation
    expect(dodgeWasSpent).toBe(false);
  });

  it('Block allows spending Dodge with 0 hits', () => {
    const results = makeDice([
      { color: AttackDieColor.Red, face: AttackFace.Critical },
    ]);
    const config = makeConfig({
      defender: { dodgeTokens: 1, block: true, coverType: CoverType.None },
    });
    const { crits, dodgeWasSpent } = applyDodgeAndCover(results, config);
    expect(crits).toBe(1); // Not cancelled (no Outmaneuver)
    expect(dodgeWasSpent).toBe(true); // Block triggered Dodge spend
  });

  it('Block + High Velocity: Dodge not spent', () => {
    const results = makeDice([
      { color: AttackDieColor.Red, face: AttackFace.Critical },
    ]);
    const config = makeConfig({
      attacker: { highVelocity: true },
      defender: { dodgeTokens: 1, block: true, coverType: CoverType.None },
    });
    const { dodgeWasSpent } = applyDodgeAndCover(results, config);
    expect(dodgeWasSpent).toBe(false); // HV prevents Dodge
  });
});
```

---

## Integration Notes

- `determineCoverValue()` and `rollCoverPool()` are exported from `coverResolver.ts` for independent testing
- `applyDodgeAndCover()` is a step function inside `attackSequence.ts`
- The `dodgeWasSpent` flag is passed downstream to:
  - `convertDefenseSurges()` (Step 7e) — for Block activation
  - `compareResults()` (Step 9) — for Duelist defender Immune: Pierce
- Cover only affects hit (a) results, never crit (b) results
- Dodge cancels hits (and crits with Outmaneuver) — the distinction matters for Impact/Armor interactions in Step 6
