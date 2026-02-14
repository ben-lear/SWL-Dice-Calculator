# Phase 2 — Comprehensive Testing Plan

## Goal

Achieve 100% branch coverage of the dice engine with unit and integration tests. Every keyword interaction, edge case, and statistical distribution must be validated. Tests are organized by module and listed in implementation order.

**Test Framework:** Vitest  
**Run:** `npm test`  
**Coverage:** `npm test -- --coverage`

---

## Test File Structure

```
src/engine/
  dice.test.ts            — Die rolling, distributions, upgrade/downgrade
  coverResolver.test.ts   — Cover value, cover pool, Low Profile
  modifiers.test.ts       — Keyword active checks, attack-type filtering
  attackSequence.test.ts   — Full pipeline + each step in isolation
```

---

## 1. `dice.test.ts` — Die Rolling & Distributions

### 1a. Roll Functions Return Valid Faces

```ts
describe('rollAttackDie', () => {
  it.each([AttackDieColor.Red, AttackDieColor.Black, AttackDieColor.White])(
    '%s die returns a valid AttackFace',
    (color) => {
      for (let i = 0; i < 100; i++) {
        const face = rollAttackDie(color);
        expect(Object.values(AttackFace)).toContain(face);
      }
    }
  );
});

describe('rollDefenseDie', () => {
  it.each([DefenseDieColor.Red, DefenseDieColor.White])(
    '%s die returns a valid DefenseFace',
    (color) => {
      for (let i = 0; i < 100; i++) {
        const face = rollDefenseDie(color);
        expect(Object.values(DefenseFace)).toContain(face);
      }
    }
  );
});
```

### 1b. Statistical Distribution Tests

Run 60,000 rolls per die color. Tolerance: ±2% absolute.

```ts
describe('attack die distributions (statistical)', () => {
  const N = 60_000;
  const tolerance = 0.02;

  it('red die: 1/8 blank, 5/8 hit, 1/8 crit, 1/8 surge', () => {
    const counts = { blank: 0, hit: 0, crit: 0, surge: 0 };
    for (let i = 0; i < N; i++) {
      const face = rollAttackDie(AttackDieColor.Red);
      if (face === AttackFace.Blank) counts.blank++;
      else if (face === AttackFace.Hit) counts.hit++;
      else if (face === AttackFace.Crit) counts.crit++;
      else if (face === AttackFace.Surge) counts.surge++;
    }
    expect(counts.blank / N).toBeCloseTo(1 / 8, 1);
    expect(counts.hit / N).toBeCloseTo(5 / 8, 1);
    expect(counts.crit / N).toBeCloseTo(1 / 8, 1);
    expect(counts.surge / N).toBeCloseTo(1 / 8, 1);
  });

  it('black die: 3/8 blank, 3/8 hit, 1/8 crit, 1/8 surge', () => {
    const counts = { blank: 0, hit: 0, crit: 0, surge: 0 };
    for (let i = 0; i < N; i++) {
      const face = rollAttackDie(AttackDieColor.Black);
      if (face === AttackFace.Blank) counts.blank++;
      else if (face === AttackFace.Hit) counts.hit++;
      else if (face === AttackFace.Crit) counts.crit++;
      else if (face === AttackFace.Surge) counts.surge++;
    }
    expect(counts.blank / N).toBeCloseTo(3 / 8, 1);
    expect(counts.hit / N).toBeCloseTo(3 / 8, 1);
    expect(counts.crit / N).toBeCloseTo(1 / 8, 1);
    expect(counts.surge / N).toBeCloseTo(1 / 8, 1);
  });

  it('white die: 5/8 blank, 1/8 hit, 1/8 crit, 1/8 surge', () => {
    const counts = { blank: 0, hit: 0, crit: 0, surge: 0 };
    for (let i = 0; i < N; i++) {
      const face = rollAttackDie(AttackDieColor.White);
      if (face === AttackFace.Blank) counts.blank++;
      else if (face === AttackFace.Hit) counts.hit++;
      else if (face === AttackFace.Crit) counts.crit++;
      else if (face === AttackFace.Surge) counts.surge++;
    }
    expect(counts.blank / N).toBeCloseTo(5 / 8, 1);
    expect(counts.hit / N).toBeCloseTo(1 / 8, 1);
    expect(counts.crit / N).toBeCloseTo(1 / 8, 1);
    expect(counts.surge / N).toBeCloseTo(1 / 8, 1);
  });
});

describe('defense die distributions (statistical)', () => {
  const N = 60_000;

  it('red defense die: 2/6 blank, 3/6 block, 1/6 surge', () => {
    const counts = { blank: 0, surge: 0, block: 0 };
    for (let i = 0; i < N; i++) {
      const face = rollDefenseDie(DefenseDieColor.Red);
      if (face === DefenseFace.Blank) counts.blank++;
      else if (face === DefenseFace.Surge) counts.surge++;
      else if (face === DefenseFace.Block) counts.block++;
    }
    expect(counts.blank / N).toBeCloseTo(2 / 6, 1);
    expect(counts.block / N).toBeCloseTo(3 / 6, 1);
    expect(counts.surge / N).toBeCloseTo(1 / 6, 1);
  });

  it('white defense die: 4/6 blank, 1/6 block, 1/6 surge', () => {
    const counts = { blank: 0, surge: 0, block: 0 };
    for (let i = 0; i < N; i++) {
      const face = rollDefenseDie(DefenseDieColor.White);
      if (face === DefenseFace.Blank) counts.blank++;
      else if (face === DefenseFace.Surge) counts.surge++;
      else if (face === DefenseFace.Block) counts.block++;
    }
    expect(counts.blank / N).toBeCloseTo(4 / 6, 1);
    expect(counts.block / N).toBeCloseTo(1 / 6, 1);
    expect(counts.surge / N).toBeCloseTo(1 / 6, 1);
  });
});
```

### 1c. Upgrade / Downgrade Tests

```ts
describe('upgradeAttack', () => {
  it('white → black', () => {
    expect(upgradeAttack(AttackDieColor.White)).toBe(AttackDieColor.Black);
  });
  it('black → red', () => {
    expect(upgradeAttack(AttackDieColor.Black)).toBe(AttackDieColor.Red);
  });
  it('red → red (ceiling)', () => {
    expect(upgradeAttack(AttackDieColor.Red)).toBe(AttackDieColor.Red);
  });
});

describe('downgradeAttack', () => {
  it('red → black', () => {
    expect(downgradeAttack(AttackDieColor.Red)).toBe(AttackDieColor.Black);
  });
  it('black → white', () => {
    expect(downgradeAttack(AttackDieColor.Black)).toBe(AttackDieColor.White);
  });
  it('white → white (floor)', () => {
    expect(downgradeAttack(AttackDieColor.White)).toBe(AttackDieColor.White);
  });
});
```

---

## 2. `coverResolver.test.ts` — Cover System

### 2a. `determineCoverValue()` Tests

```ts
describe('determineCoverValue', () => {
  // Base cover values
  it('None → 0', () => { ... });
  it('Light → 1', () => { ... });
  it('Heavy → 2', () => { ... });

  // Improvements (applied before cap)
  it('Light + Suppressed → 2', () => { ... });
  it('None + Cover 2 → 2', () => { ... });
  it('Light + Smoke 1 → 2', () => { ... });

  // Cap at 2
  it('Heavy + Cover 3 + Smoke 2 → capped at 2', () => { ... });

  // Reductions (applied after cap)
  it('Heavy - Sharpshooter 1 → 1', () => { ... });
  it('Light - Sharpshooter 2 → 0 (floor)', () => { ... });
  it('None - Sharpshooter 3 → 0', () => { ... });

  // Blast / Death From Above
  it('Blast → 0 regardless of cover', () => { ... });
  it('Blast + Immune: Blast → cover preserved', () => { ... });
  it('Death From Above → 0', () => { ... });

  // Interaction: improvements + reductions
  it('Light + Suppressed + Sharpshooter 1 → 1', () => {
    // base=1, +1(suppressed)=2, cap=2, -1(sharp)=1
  });
  it('None + Cover 1 + Sharpshooter 1 → 0', () => {
    // base=0, +1=1, cap=1, -1=0
  });
});
```

### 2b. `rollCoverPool()` Statistical Tests

```ts
describe('rollCoverPool', () => {
  it('Light cover: only blocks cancel (statistical)', () => {
    // With cover=1, only DefenseFace.Block cancels.
    // White die: 1/6 chance of block per die.
    // Roll 6000 times with 1 hit → ~1000 blocks
    let blocks = 0;
    const N = 6000;
    for (let i = 0; i < N; i++) {
      blocks += rollCoverPool(1, 1, false);
    }
    const rate = blocks / N;
    // Should be approximately 1/6 ≈ 0.167
    expect(rate).toBeGreaterThan(0.1);
    expect(rate).toBeLessThan(0.25);
  });

  it('Heavy cover: blocks AND surges cancel (statistical)', () => {
    let blocks = 0;
    const N = 6000;
    for (let i = 0; i < N; i++) {
      blocks += rollCoverPool(1, 2, false);
    }
    const rate = blocks / N;
    // Should be approximately 2/6 ≈ 0.333
    expect(rate).toBeGreaterThan(0.25);
    expect(rate).toBeLessThan(0.42);
  });

  it('Low Profile: -1 die, +1 auto block', () => {
    // With 1 hit + Low Profile + cover → 0 dice rolled + 1 auto block = always 1 cancel
    for (let i = 0; i < 100; i++) {
      const blocks = rollCoverPool(1, 1, true);
      expect(blocks).toBe(1);
    }
  });

  it('Low Profile with 0 hits: returns 0 (no cover dice to activate LP)', () => {
    // Edge case: 0 hits. No cover dice would be rolled, so LP has no effect.
    const blocks = rollCoverPool(0, 1, true);
    expect(blocks).toBe(0);
  });

  it('Low Profile with 0 cover: returns 0 (Blast/SS/no cover disables LP)', () => {
    // Edge case: cover = 0 (Blast, Sharpshooter reduces to 0, or no cover).
    // LP only applies when defender would roll 1+ cover dice.
    const blocks = rollCoverPool(3, 0, true);
    expect(blocks).toBe(0);
  });

  it('0 hits without Low Profile: 0 blocks', () => {
    const blocks = rollCoverPool(0, 2, false);
    expect(blocks).toBe(0);
  });
});
```

---

## 3. `modifiers.test.ts` — Keyword Helpers

```ts
describe('isKeywordActive', () => {
  it('unrestricted keyword: active for any attack type', () => {
    expect(isKeywordActive('Impact', AttackType.Melee)).toBe(true);
    expect(isKeywordActive('Impact', AttackType.Ranged)).toBe(true);
  });

  it('ranged-only keyword: active for Ranged, inactive for Melee', () => {
    expect(isKeywordActive('Sharpshooter', AttackType.Ranged, 'ranged')).toBe(true);
    expect(isKeywordActive('Sharpshooter', AttackType.Melee, 'ranged')).toBe(false);
  });

  it('melee-only keyword: active for Melee, inactive for Ranged', () => {
    expect(isKeywordActive('Ram', AttackType.Melee, 'melee')).toBe(true);
    expect(isKeywordActive('Ram', AttackType.Ranged, 'melee')).toBe(false);
  });

  it('AttackType.All: active for both restrictions', () => {
    expect(isKeywordActive('Test', AttackType.All, 'ranged')).toBe(true);
    expect(isKeywordActive('Test', AttackType.All, 'melee')).toBe(true);
  });
});

describe('isDodgeActive', () => {
  it('active when no High Velocity', () => {
    const config = makeConfig({ attacker: { highVelocity: false } });
    expect(isDodgeActive(config)).toBe(true);
  });
  it('inactive when High Velocity', () => {
    const config = makeConfig({ attacker: { highVelocity: true } });
    expect(isDodgeActive(config)).toBe(false);
  });
});
```

---

## 4. `attackSequence.test.ts` — Attack Sequence Pipeline

### Helper: `makeConfig()`

Create a test utility that builds an `AttackConfig` with reasonable defaults, allowing overrides:

```ts
function makeConfig(overrides: Partial<{
  attacker: Partial<AttackerConfig>;
  defender: Partial<DefenderConfig>;
  attackType: AttackType;
}>): AttackConfig {
  return {
    attackType: overrides.attackType ?? AttackType.Ranged,
    attacker: {
      redDice: 0, blackDice: 0, whiteDice: 0,
      surgeChart: AttackSurgeChart.None,
      surgeTokens: 0, aimTokens: 0,
      pierceX: 0, impactX: 0, sharpshooterX: 0,
      criticalX: 0, lethalX: 0,
      blast: false, highVelocity: false, suppressive: false,
      makashiMastery: false, duelistAttacker: false,
      immuneDeflect: false,
      ramX: 0, spray: false,
      ...overrides.attacker,
    },
    defender: {
      dieColor: DefenseDieColor.White,
      surgeChart: DefenseSurgeChart.None,
      surgeTokens: 0, dodgeTokens: 0,
      armorX: 0, shieldedX: 0,
      dangerSenseX: 0, suppressionTokens: 0,
      uncannyLuckX: 0,
      impervious: false, immunePierce: false, immuneMeleePierce: false,
      immuneBlast: false,
      deflect: false, shienMastery: false,
      djemSoMastery: false, soresuMastery: false,
      block: false, duelistDefender: false,
      holdTheLine: false, lowProfile: false,
      coverType: CoverType.None, coverX: 0, smokeTokens: 0,
      suppressed: false,
      guardianX: 0,
      backupX: 0,
      ...overrides.defender,
    },
  };
}
```

### 4a. Step 2 — Form Attack Pool

```ts
describe('formAttackPool', () => {
  it('creates pool from dice counts', () => {
    const config = makeConfig({ attacker: { redDice: 2, blackDice: 1, whiteDice: 3 } });
    const pool = formAttackPool(config);
    expect(pool.filter(c => c === AttackDieColor.Red)).toHaveLength(2);
    expect(pool.filter(c => c === AttackDieColor.Black)).toHaveLength(1);
    expect(pool.filter(c => c === AttackDieColor.White)).toHaveLength(3);
  });

  it('empty pool when all counts are 0', () => {
    const config = makeConfig({});
    const pool = formAttackPool(config);
    expect(pool).toHaveLength(0);
  });

  it('Spray doubles pool', () => {
    const config = makeConfig({ attacker: { redDice: 2, spray: true } });
    const pool = formAttackPool(config);
    expect(pool).toHaveLength(4);
  });

  it('Makashi Mastery removes 1 white die', () => {
    // Per plan: Makashi in Melee removes 1 die (worst color first)
    const config = makeConfig({
      attacker: { redDice: 1, whiteDice: 2, makashiMastery: true },
      attackType: AttackType.Melee,
    });
    const pool = formAttackPool(config);
    expect(pool).toHaveLength(2); // 3 - 1 = 2
    expect(pool.filter(c => c === AttackDieColor.White)).toHaveLength(1);
  });
});
```

### 4b. Step 4c — Reroll Attack Dice

```ts
describe('rerollAttackDice', () => {
  // These are statistical tests — run many iterations, check averages

  it('observation tokens reroll worst dice first', () => {
    // With observation tokens, blanks should be rerolled
    // Test: all blanks + 1 observation → at least 1 die rerolled
    // Statistical: after 1000 runs, average should improve
  });

  it('aim tokens reroll blanks and excess surges', () => {
    // With surgeChart: ToHit and more surges than needed
    // Excess surges should be rerolled
  });

  it('Marksman save-vs-reroll decision (Deterministic)', () => {
    // With 1 aim + Marksman + blanks:
    // If blank→hit conversion helps (cover < 2), save the aim
    // If all hits would be blocked anyway, reroll instead
  });

  it('Duelist attacker uses 1 aim for Pierce bonus', () => {
    // With duelistAttacker + aimTokens=2:
    // 1 aim consumed for +1 pierceBonus
    // 1 aim available for rerolling
  });

  it('no aims or observation tokens: no rerolls', () => {
    const config = makeConfig({
      attacker: { redDice: 3, aimTokens: 0 },
    });
    // The results should be unchanged
  });

  it('Crit Fishing: spent all aims, no blanks, only reroll hits→crits', () => {
    // This is the aggressive hit reroll path
    // Only activates when all non-crit results are hits (no blanks, no surges)
    // Should reroll worst-color hits hoping for crits
  });
});
```

### 4c. Step 4d — Convert Attack Surges

```ts
describe('convertAttackSurges', () => {
  it('chart ToHit converts all surges to hits', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config = makeConfig({ attacker: { surgeChart: AttackSurgeChart.ToHit } });
    const converted = convertAttackSurges(results, config);
    const hits = converted.filter(d => d.face === AttackFace.Hit).length;
    expect(hits).toBe(3);
  });

  it('chart ToCrit converts all surges to crits', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config = makeConfig({ attacker: { surgeChart: AttackSurgeChart.ToCrit } });
    const converted = convertAttackSurges(results, config);
    const crits = converted.filter(d => d.face === AttackFace.Crit).length;
    expect(crits).toBe(1);
  });

  it('surge tokens convert limited surges', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
    ];
    const config = makeConfig({ attacker: { surgeTokens: 2 } });
    const converted = convertAttackSurges(results, config);
    const hits = converted.filter(d => d.face === AttackFace.Hit).length;
    expect(hits).toBe(2);
    const surges = converted.filter(d => d.face === AttackFace.Surge).length;
    expect(surges).toBe(1);
  });

  it('Critical X converts hits to crits (after surge conversion)', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config = makeConfig({
      attacker: { surgeChart: AttackSurgeChart.ToHit, criticalX: 1 },
    });
    const converted = convertAttackSurges(results, config);
    const crits = converted.filter(d => d.face === AttackFace.Crit).length;
    // 1 surge→hit, then Critical 1 converts 1 hit→crit
    expect(crits).toBe(1);
  });

  it('no conversion sources: surges remain', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
    ];
    const config = makeConfig({});
    const converted = convertAttackSurges(results, config);
    expect(converted[0].face).toBe(AttackFace.Surge);
  });

  it('priority: Critical X → Jedi Hunter → chart → HTL → tokens', () => {
    // Critical X converts first to maximize crits, then chart/keywords, tokens last
    // Then Critical X processes post-conversion hits
  });
});
```

### 4d. Step 4d.5 — Marksman

```ts
describe('applyMarksman', () => {
  it('converts blank→hit with 1 saved aim', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config = makeConfig({ attacker: { marksman: true } });
    const converted = applyMarksman(results, config, 1);
    const blanks = converted.filter(d => d.face === AttackFace.Blank).length;
    expect(blanks).toBe(0);
  });

  it('converts hit→crit with 1 saved aim (no blanks)', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Crit },
    ];
    const config = makeConfig({ attacker: { marksman: true } });
    const converted = applyMarksman(results, config, 1);
    const crits = converted.filter(d => d.face === AttackFace.Crit).length;
    expect(crits).toBe(2);
  });

  it('0 saved aims: no conversion', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
    ];
    const config = makeConfig({ attacker: { marksman: true } });
    const converted = applyMarksman(results, config, 0);
    expect(converted[0].face).toBe(AttackFace.Blank);
  });

  it('blank→crit costs 2 aims (blank→hit→crit)', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
    ];
    const config = makeConfig({ attacker: { marksman: true } });
    const converted = applyMarksman(results, config, 2);
    expect(converted[0].face).toBe(AttackFace.Crit);
  });
});
```

### 4e. Step 5 — Dodge and Cover

```ts
describe('applyDodgeAndCover', () => {
  it('Dodge cancels 1 hit', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config = makeConfig({ defender: { dodgeTokens: 1 } });
    const { hits, dodgeWasSpent } = applyDodgeAndCover(results, config);
    expect(hits).toBe(1);
    expect(dodgeWasSpent).toBe(true);
  });

  it('Dodge cancels crits only with Outmaneuver', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Crit },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config = makeConfig({
      defender: { dodgeTokens: 1, outmaneuver: true },
    });
    const { crits } = applyDodgeAndCover(results, config);
    // Outmaneuver: Dodge can cancel crits
    expect(crits).toBe(0);
  });

  it('High Velocity prevents Dodge', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config = makeConfig({
      attacker: { highVelocity: true },
      defender: { dodgeTokens: 3 },
    });
    const { hits, dodgeWasSpent } = applyDodgeAndCover(results, config);
    expect(hits).toBe(1);
    expect(dodgeWasSpent).toBe(false);
  });

  it('Block keyword allows Dodge spend even with 0 hits', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
    ];
    const config = makeConfig({
      defender: { dodgeTokens: 1, block: true },
    });
    const { dodgeWasSpent } = applyDodgeAndCover(results, config);
    expect(dodgeWasSpent).toBe(true);
  });

  it('cover cancels hits but not crits', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Crit },
    ];
    const config = makeConfig({
      defender: { coverType: CoverType.Heavy },
    });
    // Statistical: cover removes some hits, never crits
    // Hard to test deterministically due to cover roll randomness
  });
});
```

### 4f. Step 6 — Modify Attack Dice

```ts
describe('modifyAttackDice', () => {
  it('Ram X adds hits (Melee only)', () => {
    const config = makeConfig({
      attacker: { ramX: 2 },
      attackType: AttackType.Melee,
    });
    const { hits } = modifyAttackDice({ hits: 1, crits: 0, blanks: 0 }, config, 0, 0);
    expect(hits).toBe(3);
  });

  it('Ram X inactive for Ranged', () => {
    const config = makeConfig({
      attacker: { ramX: 2 },
      attackType: AttackType.Ranged,
    });
    const { hits } = modifyAttackDice({ hits: 1, crits: 0, blanks: 0 }, config, 0, 0);
    expect(hits).toBe(1);
  });

  it('Impact X converts hits to crits vs Armor', () => {
    const config = makeConfig({
      attacker: { impactX: 2 },
      defender: { armorX: 1 },
    });
    const { hits, crits } = modifyAttackDice({ hits: 3, crits: 0, blanks: 0 }, config, 0, 0);
    expect(crits).toBe(2);
    expect(hits).toBe(1);
  });

  it('Impact X does nothing without Armor', () => {
    const config = makeConfig({ attacker: { impactX: 3 } });
    const { hits, crits } = modifyAttackDice({ hits: 3, crits: 0, blanks: 0 }, config, 0, 0);
    expect(crits).toBe(0);
    expect(hits).toBe(3);
  });

  it('Armor cancels non-crit hits', () => {
    const config = makeConfig({ defender: { armorX: 3 } });
    const { hits, crits } = modifyAttackDice({ hits: 2, crits: 1, blanks: 0 }, config, 0, 0);
    expect(hits).toBe(0); // All cancelled by Armor
    expect(crits).toBe(1); // Crits untouched
  });

  it('Shielded X cancels crits first, then hits', () => {
    const config = makeConfig({ defender: { shieldedX: 2 } });
    const { hits, crits } = modifyAttackDice({ hits: 2, crits: 1, blanks: 0 }, config, 0, 0);
    expect(crits).toBe(0); // 1 crit cancelled
    expect(hits).toBe(1); // 1 hit cancelled (Shielded 2 - 1 crit = 1 remains)
  });

  it('Guardian X transfers hits to Guardian unit', () => {
    const config = makeConfig({ defender: { guardianX: 2 } });
    const { hits, guardianHits } = modifyAttackDice(
      { hits: 3, crits: 1, blanks: 0 }, config, 0, 0
    );
    expect(guardianHits).toBe(2);
    expect(hits).toBe(1);
  });

  it('Guardian does NOT transfer crits', () => {
    const config = makeConfig({ defender: { guardianX: 5 } });
    const { crits, guardianHits } = modifyAttackDice(
      { hits: 1, crits: 3, blanks: 0 }, config, 0, 0
    );
    expect(crits).toBe(3); // Crits not transferred
    expect(guardianHits).toBe(1); // Only the 1 hit transferred
  });

  it('Lethal X uses leftover aims for Pierce', () => {
    const config = makeConfig({ attacker: { lethalX: 3, aimTokens: 3 } });
    const { lethalPierce } = modifyAttackDice(
      { hits: 2, crits: 0, blanks: 0 }, config, 1, 0 // 1 aim spent on rerolls → 2 leftover
    );
    expect(lethalPierce).toBe(2); // min(3, 3-1-0) = 2
  });

  it('Lethal X = 0 when all aims consumed by rerolls', () => {
    const config = makeConfig({ attacker: { lethalX: 3, aimTokens: 2 } });
    const { lethalPierce } = modifyAttackDice(
      { hits: 2, crits: 0, blanks: 0 }, config, 2, 0 // All aims on rerolls
    );
    expect(lethalPierce).toBe(0);
  });

  it('operation order: Ram → Impact → Armor → Shielded → Backup → Guardian → Lethal', () => {
    // Test with all keywords active to ensure correct ordering
    const config = makeConfig({
      attacker: { ramX: 1, impactX: 1, lethalX: 1 },
      defender: { armorX: 1, shieldedX: 1, guardianX: 1, backupX: 1 },
      attackType: AttackType.Melee,
    });
    // Verify each step processes in order without interfering
    const result = modifyAttackDice({ hits: 3, crits: 0, blanks: 0 }, config, 1, 0);
    expect(result.lethalPierce).toBe(1);
  });
});
```

### 4g. Step 7-8 — Defense Sequence

```ts
describe('rollDefenseDice', () => {
  it('rolls 1 die per remaining hit+crit', () => {
    const config = makeConfig({ defender: { dieColor: DefenseDieColor.White } });
    const { results } = rollDefenseDice({ hits: 3, crits: 2 }, config, 0, 0, false);
    expect(results).toHaveLength(5);
  });

  it('Danger Sense adds bonus dice', () => {
    const config = makeConfig({
      defender: { dieColor: DefenseDieColor.White, dangerSenseX: 3, suppressionTokens: 5 },
    });
    const { results } = rollDefenseDice({ hits: 2, crits: 0 }, config, 0, 0, false);
    expect(results).toHaveLength(5); // 2 + min(3,5) = 5
  });

  it('Impervious adds dice equal to total Pierce', () => {
    const config = makeConfig({
      attacker: { pierceX: 2 },
      defender: { dieColor: DefenseDieColor.White, impervious: true },
    });
    const { results } = rollDefenseDice({ hits: 1, crits: 0 }, config, 1, 1, false);
    expect(results).toHaveLength(5); // 1 + (2+1+1) = 5
  });

  it('captures surgeCountBeforeConversion correctly', () => {
    // Need mock or statistical test
    // After rolling, count surges before conversion
  });
});

describe('convertDefenseSurges', () => {
  it('chart converts all surges to blocks', () => { ... });
  it('Deflect converts remaining surges (Ranged)', () => { ... });
  it('Deflect active even with High Velocity', () => { ... });
  it('Block requires Dodge spent', () => { ... });
  it('conversion priority: chart > Deflect > Block > HTL > tokens', () => { ... });
});
```

### 4h. Step 9 — Compare Results

See [phase2b-compare-results.md](phase2b-compare-results.md) for the complete test suite covering:
- Pierce application to combined blocks
- Immune: Pierce / Makashi interactions
- Duelist defender timing (MUST zero Pierce BEFORE blocksAfterPierce)
- Deflect / Shien wound reflection
- Djem So counter-damage
- Suppression calculation
- Three-wound output validation

### 4i. Full Pipeline Integration Tests

```ts
describe('executeAttackSequence (integration)', () => {
  it('smoke test: 5 red dice, no keywords → some wounds', () => {
    const config = makeConfig({
      attacker: { redDice: 5 },
      defender: { dieColor: DefenseDieColor.White },
    });
    const results: AttackResult[] = [];
    for (let i = 0; i < 100; i++) {
      results.push(executeAttackSequence(config));
    }
    const avgWounds = results.reduce((s, r) => s + r.totalWounds, 0) / results.length;
    expect(avgWounds).toBeGreaterThan(0);
  });

  it('smoke test: all keywords off → simple hit/block comparison', () => {
    const config = makeConfig({
      attacker: { redDice: 3 },
      defender: { dieColor: DefenseDieColor.Red },
    });
    const result = executeAttackSequence(config);
    expect(result.totalWounds).toBeGreaterThanOrEqual(0);
    expect(result.deflectWounds).toBe(0);
    expect(result.djemSoWounds).toBe(0);
  });

  it('Deflect reflects 1 wound (Ranged)', () => {
    const config = makeConfig({
      attacker: { redDice: 5 },
      defender: { dieColor: DefenseDieColor.White, deflect: true },
      attackType: AttackType.Ranged,
    });
    // Statistical: over many runs, some should have deflectWounds = 1
    let deflectSeen = false;
    for (let i = 0; i < 200; i++) {
      const result = executeAttackSequence(config);
      if (result.deflectWounds > 0) {
        deflectSeen = true;
        break;
      }
    }
    expect(deflectSeen).toBe(true);
  });

  it('Djem So reflects 1 wound (Melee)', () => {
    const config = makeConfig({
      attacker: { redDice: 3 },
      defender: { dieColor: DefenseDieColor.White, djemSoMastery: true },
      attackType: AttackType.Melee,
    });
    // Statistical: over many runs, some should have djemSoWounds = 1
    // Red die has 1/8 blank chance → 1-(7/8)^3 ≈ 33% chance of at least 1 blank
    let djemSoSeen = false;
    for (let i = 0; i < 200; i++) {
      const result = executeAttackSequence(config);
      if (result.djemSoWounds > 0) {
        djemSoSeen = true;
        break;
      }
    }
    expect(djemSoSeen).toBe(true);
  });

  it('Pierce increases wounds', () => {
    // Compare identical configs with and without Pierce
    const baseCfg = makeConfig({
      attacker: { blackDice: 4 },
      defender: { dieColor: DefenseDieColor.Red },
    });
    const pierceCfg = makeConfig({
      attacker: { blackDice: 4, pierceX: 2 },
      defender: { dieColor: DefenseDieColor.Red },
    });

    const N = 2000;
    let baseTotal = 0, pierceTotal = 0;
    for (let i = 0; i < N; i++) {
      baseTotal += executeAttackSequence(baseCfg).totalWounds;
      pierceTotal += executeAttackSequence(pierceCfg).totalWounds;
    }
    expect(pierceTotal / N).toBeGreaterThan(baseTotal / N);
  });

  it('Immune: Pierce negates Pierce benefit', () => {
    const pierceCfg = makeConfig({
      attacker: { redDice: 4, pierceX: 3 },
      defender: { dieColor: DefenseDieColor.Red, immunePierce: true },
    });
    const nopierceCfg = makeConfig({
      attacker: { redDice: 4, pierceX: 0 },
      defender: { dieColor: DefenseDieColor.Red },
    });

    const N = 2000;
    let pierceTotal = 0, nopierceTotal = 0;
    for (let i = 0; i < N; i++) {
      pierceTotal += executeAttackSequence(pierceCfg).totalWounds;
      nopierceTotal += executeAttackSequence(nopierceCfg).totalWounds;
    }
    // With Immune: Pierce, Pierce 3 should have no effect
    const diff = Math.abs(pierceTotal / N - nopierceTotal / N);
    expect(diff).toBeLessThan(0.2); // Statistically similar
  });

  it('Guardian splits wounds correctly', () => {
    const config = makeConfig({
      attacker: { redDice: 5 },
      defender: {
        dieColor: DefenseDieColor.White,
        guardianX: 2,
        guardianDieColor: DefenseDieColor.Red,
        guardianSurgeChart: DefenseSurgeChart.ToBlock,
      },
    });
    const result = executeAttackSequence(config);
    expect(result.guardianWoundsNoPierce).toBeGreaterThanOrEqual(0);
    expect(result.mainTargetWoundsNoPierce).toBeGreaterThanOrEqual(0);
  });

  it('melee attack: 0 suppression', () => {
    const config = makeConfig({
      attacker: { redDice: 3 },
      defender: { dieColor: DefenseDieColor.White },
      attackType: AttackType.Melee,
    });
    const result = executeAttackSequence(config);
    expect(result.suppressionApplied).toBe(0);
  });

  it('Suppressive: 2 suppression (Ranged)', () => {
    const config = makeConfig({
      attacker: { redDice: 3, suppressive: true },
      defender: { dieColor: DefenseDieColor.White },
      attackType: AttackType.Ranged,
    });
    const result = executeAttackSequence(config);
    expect(result.suppressionApplied).toBe(2);
  });
});
```

---

## 5. Edge Case Checklist

### Zero / Empty Cases
- [ ] 0 attack dice → 0 wounds, 0 deflect, 0 djem so
- [ ] 0 defense dice → all hits become wounds
- [ ] 0 aim tokens → no rerolls
- [ ] 0 dodge tokens → no dodge cancellation
- [ ] 0 surges rolled → no surge conversion needed

### Maximum / Overflow Cases
- [ ] Pierce > blocks → blocks = 0, no negative
- [ ] Shielded > hits+crits → hits=0, crits=0
- [ ] Guardian > hits → guardianHits = hits, no overflow
- [ ] Danger Sense 10 + 2 suppression → only 2 bonus dice
- [ ] Impact > hits → only convert available hits

### Keyword Conflict Cases
- [ ] Immune: Pierce + Makashi (Melee) → Makashi overrides Immune
- [ ] Immune: Pierce + Makashi (Ranged) → Immune wins
- [ ] High Velocity + Deflect → Deflect STILL works
- [ ] High Velocity + Block → Block does NOT work
- [ ] Blast + Immune: Blast → Cover preserved
- [ ] Duelist (defender) + Ranged → Duelist inactive
- [ ] Duelist (defender) + Melee + no Dodge → Duelist inactive
- [ ] Impervious + Makashi → Impervious disabled

### Multi-Keyword Compound Scenarios
- [ ] Pierce 2 + Lethal 2 + Duelist attacker 1 → total Pierce 5
- [ ] Pierce 2 + Lethal 2 + Immune: Pierce (no Makashi) → Pierce 0
- [ ] Guardian + Deflect (Guardian) + Deflect (main) → combined deflect wounds
- [ ] Shien Mastery + 0 wounds → suppression = 0
- [ ] Soresu Mastery + Uncanny Luck → Soresu rerolls all, Uncanny redundant

---

## 6. Test Data: Known Scenarios

### Scenario A: Basic Stormtrooper Attack

```ts
// 2 white dice, surge:hit, vs White defense die, no cover
const config = makeConfig({
  attacker: { whiteDice: 2, surgeChart: AttackSurgeChart.ToHit },
  defender: { dieColor: DefenseDieColor.White },
  attackType: AttackType.Ranged,
});
// Expected average wounds ≈ 0.38 (2 × 2/8 × 5/6 roughly)
```

### Scenario B: Clone Trooper Aim + Fire

```ts
// 2 black dice, surge:crit, 1 aim token, vs Red defense die
const config = makeConfig({
  attacker: { blackDice: 2, surgeChart: AttackSurgeChart.ToCrit, aimTokens: 1 },
  defender: { dieColor: DefenseDieColor.Red },
  attackType: AttackType.Ranged,
});
// Expected: higher wound rate than without aim
```

### Scenario C: Vader Melee with Pierce + Impact

```ts
// 6 red dice, surge:crit, Pierce 3, Impact 3, vs Red + Armor
const config = makeConfig({
  attacker: {
    redDice: 6,
    surgeChart: AttackSurgeChart.ToCrit,
    pierceX: 3,
    impactX: 3,
  },
  defender: {
    dieColor: DefenseDieColor.Red,
    armorX: 1,
    surgeChart: DefenseSurgeChart.None,
  },
  attackType: AttackType.Melee,
});
// Expected: high wound output, Impact converts for Armor penetration
```

### Scenario D: Guardian + Multiple Pierce Sources

```ts
// 4 black dice, Lethal 2, Pierce 1, 1 aim, Duelist attacker
// Defender: Guardian 2, Red defense die, Red guardian die with surge:block
const config = makeConfig({
  attacker: {
    blackDice: 4,
    pierceX: 1,
    lethalX: 2,
    duelistAttacker: true,
    aimTokens: 2,
  },
  defender: {
    dieColor: DefenseDieColor.Red,
    guardianX: 2,
    guardianDieColor: DefenseDieColor.Red,
    guardianSurgeChart: DefenseSurgeChart.ToBlock,
  },
  attackType: AttackType.Ranged,
});
// Expected: Pierce = 1 (keyword) + 2 (lethal, since aims spent) + 1 (duelist) = 4
// Guardian absorbs 2 hits, both defend separately without Pierce
// Total wounds use combined blocks - 4 Pierce
```

---

## 7. Coverage Targets

| Module | Target | Metric |
|--------|--------|--------|
| `dice.ts` | 100% | Line + branch |
| `coverResolver.ts` | 100% | Line + branch |
| `modifiers.ts` | 100% | Line + branch |
| `attackSequence.ts` | 95%+ | Line, 90%+ branch |
| **Overall engine/** | **95%+** | Line coverage |

### How to Measure

```bash
npx vitest run --coverage
```

Configure in `vitest.config.ts`:
```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/engine/**'],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
      },
    },
  },
});
```

---

## 8. Test Organization Rules

1. **One `describe` per public function** — mirrors the module API
2. **Deterministic tests first** — unit tests with mocked dice or known inputs
3. **Statistical tests second** — labeled with `(statistical)`, use high N (2000+)
4. **Edge case tests last** — labeled with `(edge)`, test boundary conditions
5. **Integration tests in separate `describe('integration')`** — test full pipeline
6. **No test should depend on another test's state** — each test is isolated
7. **Use `makeConfig()` helper** — avoid boilerplate, only specify relevant overrides
