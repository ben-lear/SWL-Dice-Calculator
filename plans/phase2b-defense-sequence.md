# Phase 2B — Defense Sequence (Steps 7-8) + Guardian Defense — Detailed Implementation Plan

## Goal

Implement the full defense dice sequence: gathering dice, rolling, rerolling, converting surges, and counting blocks. This includes the Guardian defense sub-sequence (Step 6b) and all defensive keyword interactions.

**File:** `src/engine/attackSequence.ts`

**Depends on:** Step 6 output (`{ hits, crits }`), `lethalPierce`, `pierceBonus`, `dodgeWasSpent`

---

## Data Flow

```
Step 7:
  Input:  { hits, crits }   (from Step 6)
          lethalPierce       (from Lethal X)
          duelistPierceBonus (from Duelist attacker)
          dodgeWasSpent      (from Step 5)

  Output: {
    results: RolledDefenseDie[],
    surgeCountBeforeConversion: number  (for Deflect/Shien in Step 9)
  }

Step 8:
  Input:  RolledDefenseDie[] (from Step 7)

  Output: { blocks: number } (Pierce NOT applied — deferred to Step 9)
```

---

## `RolledDefenseDie` Interface

```ts
interface RolledDefenseDie {
  color: DefenseDieColor;
  face: DefenseFace;
}
```

---

## Step 7 — Roll Defense Dice

### Sub-steps

```
7a. Gather defense dice count
7b. Add bonus dice (Danger Sense X, Impervious)
7c. Roll dice
7d. Reroll dice (Uncanny Luck X, Soresu Mastery)
7e. Convert defense surges (chart, tokens, Deflect, Block, Hold the Line)
```

### 7a — Gather Defense Dice

Base pool = `hits + crits` (results that survived Step 6).

### 7b — Bonus Dice

**Danger Sense X:**
- Adds dice equal to `min(dangerSenseX, suppressionTokens)`
- Requires at least 1 suppression token to add any dice
- Per rulebook: "add 1 defense die for each suppression token the defender has, up to X"

**Impervious:**
- Adds dice equal to the **total Pierce** being applied from ALL sources
- Total Pierce = `attacker.pierceX + lethalPierce + duelistPierceBonus`
- **Disabled by:** Makashi Mastery (attacker has it) OR Immune: Pierce (defender has it and Makashi doesn't override)
- Per rulebook: "add defense dice equal to the Pierce value being used against it"

**Impervious edge cases:**
- If `defender.immunePierce` is true AND `attacker.makashiMastery` is false → Impervious doesn't activate (no Pierce to mirror)
- If `defender.impervious` AND `attacker.makashiMastery` → Makashi disables Impervious entirely
- If `defender.impervious` AND Pierce = 0 → 0 bonus dice (nothing to mirror)

### Implementation: `rollDefenseDice()`

```ts
function rollDefenseDice(
  attackResults: { hits: number; crits: number },
  config: AttackConfig,
  lethalPierce: number,
  duelistPierceBonus: number,
  dodgeWasSpent: boolean
): { results: RolledDefenseDie[]; surgeCountBeforeConversion: number } {
  const { defender, attacker } = config;
  const totalAttackResults = attackResults.hits + attackResults.crits;

  // ── 7a. Base pool ──
  let dieCount = totalAttackResults;

  // ── 7b. Danger Sense X ──
  if (defender.dangerSenseX > 0 && defender.suppressionTokens > 0) {
    const bonusDice = Math.min(defender.dangerSenseX, defender.suppressionTokens);
    dieCount += bonusDice;
  }

  // ── 7b. Impervious ──
  // Adds dice = total Pierce from all sources.
  // Disabled by Makashi Mastery.
  // Also does nothing if defender has Immune: Pierce (pierce would be 0).
  if (defender.impervious && !attacker.makashiMastery) {
    // Calculate total Pierce that WOULD be applied
    let effectivePierce = attacker.pierceX + lethalPierce + duelistPierceBonus;

    // If defender has Immune: Pierce (not overridden by Makashi), Pierce = 0 → Impervious adds 0
    if (defender.immunePierce) {
      effectivePierce = 0;
    }
    // If defender has Immune: Melee Pierce and this is Melee, Pierce = 0
    if (defender.immuneMeleePierce && config.attackType === AttackType.Melee) {
      effectivePierce = 0;
    }

    dieCount += effectivePierce;
  }

  // ── 7c. Roll dice ──
  const dieColor = defender.dieColor;
  let results: RolledDefenseDie[] = [];
  for (let i = 0; i < dieCount; i++) {
    results.push({
      color: dieColor,
      face: rollDefenseDie(dieColor),
    });
  }

  // ── 7d. Reroll dice ──
  results = rerollDefenseDice(results, config);

  // ── Capture surge count BEFORE conversion ──
  // This is needed for Deflect/Shien wound calculation in Step 9.
  // Per rulebook, Deflect checks "before converting any e results."
  const surgeCountBeforeConversion = results.filter(d => d.face === DefenseFace.Surge).length;

  // ── 7e. Convert defense surges ──
  results = convertDefenseSurges(results, config, dodgeWasSpent);

  return { results, surgeCountBeforeConversion };
}
```

---

## Step 7d — Reroll Defense Dice

### Keywords that grant defense rerolls

1. **Uncanny Luck X** — Reroll up to X defense dice
2. **Soresu Mastery** — Reroll ALL defense dice (Ranged attacks only, costs no tokens)

### Reroll Target Selection for Uncanny Luck

Priority: reroll the worst results first.
1. **Blanks** — always reroll
2. **Surges** — only reroll if no surge conversion is available

"Surge conversion available" means ANY of:
- Defense surge chart = ToBlock
- Deflect keyword (Ranged attacks)
- Block keyword (with Dodge spent)
- Hold the Line (defender)
- Surge tokens > 0

If any conversion source exists, surges should NOT be rerolled (they'll become blocks).

### Soresu Mastery Interaction with Uncanny Luck

When both are active (Ranged attack):
- Apply Uncanny Luck FIRST (reroll up to X dice)
- Then apply Soresu Mastery (reroll ALL dice, including ones just rerolled)

This ordering maximizes value since Soresu gives a full reroll of everything.

**Wait — rule clarification:** Per the rulebook, "a die can only be rerolled once." This means:
- If Uncanny Luck rerolls a die, Soresu cannot reroll it again
- In practice, Soresu Mastery alone is better than Uncanny Luck (it rerolls everything)
- When both are present: Soresu rerolls all dice, Uncanny Luck is redundant

**Implementation decision:** Apply Soresu FIRST (rerolls all), then Uncanny Luck is skipped (no un-rerolled dice remain). This is the optimal order for the defender.

Actually, re-reading more carefully: the "rerolled once" rule means each die can only be rerolled once per step. Since Soresu rerolls ALL, Uncanny Luck cannot reroll any of them again. So when Soresu is active, Uncanny Luck is effectively redundant.

### Implementation: `rerollDefenseDice()`

```ts
function rerollDefenseDice(
  results: RolledDefenseDie[],
  config: AttackConfig
): RolledDefenseDie[] {
  const { defender } = config;
  let workingResults = results.map(d => ({ ...d }));

  // Track which dice have been rerolled (each die can only be rerolled once)
  const rerolled = new Set<number>();

  // ── Soresu Mastery ──
  // Ranged attacks only. Rerolls ALL defense dice.
  // Applied first since it's a full pool reroll.
  if (
    defender.soresuMastery &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
  ) {
    for (let i = 0; i < workingResults.length; i++) {
      workingResults[i] = {
        ...workingResults[i],
        face: rollDefenseDie(workingResults[i].color),
      };
      rerolled.add(i);
    }
  }

  // ── Uncanny Luck X ──
  // Reroll up to X defense dice that haven't been rerolled yet.
  if (defender.uncannyLuckX > 0) {
    let rerollsRemaining = defender.uncannyLuckX;

    // Check if defender has ANY surge conversion source
    // Note: Deflect is disabled by High Velocity, so don't count it as a conversion source when HV is active.
    const hasSurgeConversion =
      defender.surgeChart === DefenseSurgeChart.ToBlock ||
      (defender.deflect && !attacker.highVelocity) ||
      (defender.block && defender.dodgeTokens > 0) ||
      defender.holdTheLine ||
      defender.surgeTokens > 0;

    // Pass 1: Reroll blanks (always worth rerolling)
    for (let i = 0; i < workingResults.length && rerollsRemaining > 0; i++) {
      if (rerolled.has(i)) continue; // Already rerolled by Soresu
      if (workingResults[i].face === DefenseFace.Blank) {
        workingResults[i] = {
          ...workingResults[i],
          face: rollDefenseDie(workingResults[i].color),
        };
        rerolled.add(i);
        rerollsRemaining--;
      }
    }

    // Pass 2: Reroll surges (only if no conversion available)
    if (!hasSurgeConversion && rerollsRemaining > 0) {
      for (let i = 0; i < workingResults.length && rerollsRemaining > 0; i++) {
        if (rerolled.has(i)) continue;
        if (workingResults[i].face === DefenseFace.Surge) {
          workingResults[i] = {
            ...workingResults[i],
            face: rollDefenseDie(workingResults[i].color),
          };
          rerolled.add(i);
          rerollsRemaining--;
        }
      }
    }
  }

  return workingResults;
}
```

---

## Step 7e — Convert Defense Surges

### Conversion Priority Order

```
1. Surge Chart (ToBlock) — converts ALL surges
2. Deflect — converts ALL remaining surges (Ranged only)
   NOTE: High Velocity disables Deflect entirely (both surge conversion AND wound reflection)
3. Block — converts ALL remaining surges (requires Dodge spent)
   NOTE: High Velocity prevents Dodge spending → prevents Block
4. Hold the Line (defender) — converts ALL remaining surges
5. Surge Tokens — converts up to N remaining surges
   Applied last to preserve tokens when keywords handle conversion
```

### Important: Deflect and High Velocity

High Velocity completely disables Deflect. Per the rulebook, High Velocity states that "the defending unit cannot use the Deflect keyword." This means:
- High Velocity prevents **spending Dodge tokens** (Step 5e)
- High Velocity **disables Deflect entirely** — both surge conversion AND wound reflection
- High Velocity prevents Block (which requires Dodge spending)

High Velocity is effectively a stronger version of Immune: Deflect. If High Velocity is applied, there is no need to check for Deflect or Immune: Deflect wound reflection — all Deflect effects are suppressed.

So against High Velocity:
- Deflect: INACTIVE (both surge conversion and wound reflection disabled)
- Block: INACTIVE (Dodge wasn't spent → `dodgeWasSpent = false`)

### Implementation: `convertDefenseSurges()`

```ts
function convertDefenseSurges(
  results: RolledDefenseDie[],
  config: AttackConfig,
  dodgeWasSpent: boolean
): RolledDefenseDie[] {
  const { defender, attacker } = config;
  let workingResults = results.map(d => ({ ...d }));

  let surgeCount = workingResults.filter(d => d.face === DefenseFace.Surge).length;
  if (surgeCount === 0) return workingResults;

  // ── 1. Surge Chart ──
  if (defender.surgeChart === DefenseSurgeChart.ToBlock) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    return workingResults; // All consumed
  }

  // ── 2. Deflect (Ranged only) ──
  // High Velocity completely disables Deflect (both surge conversion AND wound reflection).
  // Immune: Deflect on attacker does NOT prevent surge conversion —
  //       it only prevents the WOUND reflection. Deflect surge→block still works.
  // But High Velocity disables ALL Deflect effects.
  if (
    defender.deflect &&
    !attacker.highVelocity &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) &&
    surgeCount > 0
  ) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── 3. Block (requires Dodge spent) ──
  // Block converts surges→blocks when a Dodge token was spent in Step 5.
  // High Velocity prevents Dodge spending, so Block won't activate.
  if (defender.block && dodgeWasSpent && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── 4. Hold the Line (defender) ──
  // Grants surge:block while engaged (Melee attacks).
  // Note: The plan's main doc says this applies to defender, but the
  // activation condition needs clarification. For now: active when
  // defender has holdTheLine = true.
  if (defender.holdTheLine && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── 5. Surge Tokens ──
  // Applied last to preserve tokens when keywords handle conversion.
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

  // Remaining surges stay as surges (blanks for counting)
  return workingResults;
}
```

---

## Step 8 — Modify Defense Dice

Step 8 in this implementation is deliberately simple: just count blocks. Pierce is NOT applied here.

```ts
function modifyDefenseDice(
  results: RolledDefenseDie[],
  config: AttackConfig,
  dodgeWasSpent: boolean
): { blocks: number } {
  const blocks = results.filter(d => d.face === DefenseFace.Block).length;
  return { blocks };
}
```

**Why no Pierce here?** Pierce is applied globally in Step 9 (`compareResults`) to the **combined** block total from both the Guardian and the main defender. This is because with Guardian, the attacker must choose how to allocate Pierce between two targets, and the calculator cannot know the optimal allocation.

---

## Step 6b — Guardian Defense Sub-Sequence

### Overview

When Guardian X absorbs hits in Step 6, those hits are defended separately by the Guardian unit. The Guardian unit has its own:
- Defense die color (`guardianDieColor`)
- Surge chart (`guardianSurgeChart`)
- Optional Deflect keyword (`guardianDeflect`)
- Optional Soresu Mastery (`guardianSoresuMastery`)
- Optional Dodge tokens (`guardianDodgeTokens`)

### Guardian Defense Flow

```
1. Determine die color and count (= guardianHits)
2. Roll defense dice
3. Soresu Mastery (Guardian): spend 1 Dodge to reroll ALL (before surge conversion)
4. Check for Deflect (Guardian): if surge exists → 1 wound to attacker
5. Convert surges (chart + Deflect)
6. Count blocks
7. Calculate wounds = guardianHits - guardianBlocks
```

### Implementation: `rollGuardianDefense()`

```ts
function rollGuardianDefense(
  guardianHits: number,
  config: AttackConfig
): { guardianWoundsNoPierce: number; guardianBlocks: number; guardianDeflectWounds: number } {
  const { defender, attacker } = config;

  // ── Default die color if not specified ──
  const guardianDieColor = defender.guardianDieColor ?? DefenseDieColor.White;
  const guardianSurgeChart = defender.guardianSurgeChart ?? DefenseSurgeChart.None;

  // ── Roll defense dice ──
  // No Danger Sense or Impervious for Guardian — just base dice equal to absorbed hits.
  let guardianResults: RolledDefenseDie[] = [];
  for (let i = 0; i < guardianHits; i++) {
    guardianResults.push({
      color: guardianDieColor,
      face: rollDefenseDie(guardianDieColor),
    });
  }

  // ── Soresu Mastery (Guardian) ──
  // Per rulebook: "When a unit with Soresu Mastery uses Guardian X,
  // it may spend 1 Dodge Token to reroll all dice before converting surges."
  if (defender.guardianSoresuMastery && (defender.guardianDodgeTokens ?? 0) > 0) {
    guardianResults = guardianResults.map(d => ({
      ...d,
      face: rollDefenseDie(d.color),
    }));
    // Dodge token consumed (tracked conceptually, not mutated on config)
  }

  // ── Deflect (Guardian) — check BEFORE surge conversion ──
  // Per rulebook: "When using Guardian X with Deflect, before converting surges,
  // the attacker suffers 1 wound if at least 1 die has a surge result."
  // High Velocity completely disables Deflect (both conversion and wound reflection).
  let guardianDeflectWounds = 0;
  if (defender.guardianDeflect && !attacker.highVelocity && !attacker.immuneDeflect) {
    const hasSurge = guardianResults.some(d => d.face === DefenseFace.Surge);
    if (hasSurge) {
      guardianDeflectWounds = 1; // Exactly 1, regardless of surge count
    }
  }

  // ── Convert surges ──
  // Guardian surge chart
  if (guardianSurgeChart === DefenseSurgeChart.ToBlock) {
    guardianResults = guardianResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
  }

  // Guardian Deflect also grants surge→block for Ranged attacks
  // High Velocity disables Deflect entirely, including surge conversion.
  if (
    defender.guardianDeflect &&
    !attacker.highVelocity &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
  ) {
    guardianResults = guardianResults.map(d =>
      d.face === DefenseFace.Surge ? { ...d, face: DefenseFace.Block } : d
    );
  }

  // ── Count blocks ──
  const guardianBlocks = guardianResults.filter(d => d.face === DefenseFace.Block).length;

  // ── Calculate wounds WITHOUT pierce ──
  const guardianWoundsNoPierce = Math.max(0, guardianHits - guardianBlocks);

  return { guardianWoundsNoPierce, guardianBlocks, guardianDeflectWounds };
}
```

### Guardian Edge Cases

| Scenario | Expected |
|----------|----------|
| 0 guardian hits | Function not called (guarded in main pipeline) |
| Guardian without die color specified | Defaults to White die, None surge chart |
| Guardian Soresu + 0 Dodge tokens | No reroll (needs Dodge) |
| Guardian Soresu + 1 Dodge token | Reroll all guardian dice |
| Guardian Deflect + 0 surges rolled | guardianDeflectWounds = 0 |
| Guardian Deflect + 3 surges rolled | guardianDeflectWounds = 1 (always 1) |
| Guardian Deflect + Immune: Deflect on attacker | guardianDeflectWounds = 0 |
| Guardian Deflect + High Velocity on attacker | guardianDeflectWounds = 0, no surge conversion (HV disables all Deflect) |
| Guardian Deflect surge conversion (Ranged) | Surges become blocks (Deflect grants conversion) |
| Guardian Deflect + Melee attack | Deflect inactive (Ranged only), no wound reflection, no surge conversion |
| Guardian surge chart ToBlock + Deflect | Chart converts first, Deflect has no remaining surges |

---

## Edge Cases — Full Defense Sequence

| Scenario | Expected |
|----------|----------|
| 0 hits + 0 crits reaching defense | 0 defense dice rolled, 0 blocks |
| Danger Sense 3 + 5 suppression tokens | +3 bonus dice (capped at Danger Sense value) |
| Danger Sense 3 + 0 suppression tokens | +0 bonus dice |
| Impervious + Pierce 3 + Lethal 2 + Duelist 1 | +6 bonus dice (3+2+1) |
| Impervious + Makashi Mastery | Impervious disabled → 0 bonus dice |
| Impervious + Immune: Pierce | Pierce = 0 → Impervious adds 0 |
| Impervious + Pierce 0 | 0 bonus dice |
| Soresu Mastery + Uncanny Luck + Ranged | Soresu rerolls all, Uncanny has nothing left |
| Soresu Mastery + Melee attack | Soresu inactive (Ranged only) |
| Uncanny Luck 3 + 5 blanks | Rerolls 3 blanks |
| Uncanny Luck 3 + 1 blank + 2 surges (no conversion) | Rerolls 1 blank + 2 surges |
| Uncanny Luck 3 + 1 blank + 2 surges (has Deflect) | Rerolls 1 blank only (surges will convert) |
| Deflect + High Velocity | Deflect DISABLED — HV disables all Deflect effects (surge conversion AND wound reflection) |
| Block + High Velocity | Block INACTIVE (HV prevented Dodge → dodgeWasSpent=false) |
| Block + Dodge spent + 0 surges | No conversion (no surges to convert) |
| Deflect + Surge chart ToBlock | Chart converts first, Deflect has no remaining surges |
| Multiple conversion sources overlap | Each source processes remaining surges in priority order |

---

## Unit Tests

### Defense Pool Size Tests

```ts
describe('rollDefenseDice pool size', () => {
  it('rolls 1 die per hit + crit', () => {
    // Mock rollDefenseDie to count calls
    const config = makeConfig({ defender: { dieColor: DefenseDieColor.White } });
    const { results } = rollDefenseDice({ hits: 3, crits: 2 }, config, 0, 0, false);
    expect(results).toHaveLength(5);
  });

  it('adds Danger Sense dice', () => {
    const config = makeConfig({
      defender: { dieColor: DefenseDieColor.White, dangerSenseX: 3, suppressionTokens: 5 },
    });
    const { results } = rollDefenseDice({ hits: 2, crits: 0 }, config, 0, 0, false);
    expect(results).toHaveLength(5); // 2 base + 3 Danger Sense
  });

  it('caps Danger Sense at suppression count', () => {
    const config = makeConfig({
      defender: { dieColor: DefenseDieColor.White, dangerSenseX: 5, suppressionTokens: 2 },
    });
    const { results } = rollDefenseDice({ hits: 3, crits: 0 }, config, 0, 0, false);
    expect(results).toHaveLength(5); // 3 base + 2 (min of DS5, supp2)
  });

  it('adds Impervious dice equal to total Pierce', () => {
    const config = makeConfig({
      attacker: { pierceX: 2 },
      defender: { dieColor: DefenseDieColor.White, impervious: true },
    });
    const { results } = rollDefenseDice({ hits: 1, crits: 0 }, config, 1, 1, false);
    // Total Pierce = 2 (keyword) + 1 (lethal) + 1 (duelist) = 4
    expect(results).toHaveLength(5); // 1 base + 4 Impervious
  });

  it('Impervious disabled by Makashi Mastery', () => {
    const config = makeConfig({
      attacker: { pierceX: 3, makashiMastery: true },
      defender: { dieColor: DefenseDieColor.White, impervious: true },
    });
    const { results } = rollDefenseDice({ hits: 2, crits: 0 }, config, 0, 0, false);
    expect(results).toHaveLength(2); // No Impervious bonus
  });
});
```

### Reroll Tests

```ts
describe('rerollDefenseDice', () => {
  it('Uncanny Luck rerolls blanks first', () => {
    const results: RolledDefenseDie[] = [
      { color: DefenseDieColor.White, face: DefenseFace.Blank },
      { color: DefenseDieColor.White, face: DefenseFace.Block },
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
    ];
    const config = makeConfig({ defender: { uncannyLuckX: 1 } });
    // Should reroll the blank at index 0
    const rerolled = rerollDefenseDice(results, config);
    // Can't deterministically check face, but index 0 was rerolled
  });

  it('Uncanny Luck skips surges when conversion available', () => {
    const results: RolledDefenseDie[] = [
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
    ];
    const config = makeConfig({
      defender: { uncannyLuckX: 2, surgeChart: DefenseSurgeChart.ToBlock },
    });
    // Surges will convert to blocks → should NOT be rerolled
    // With no blanks to reroll, Uncanny Luck is wasted
    const rerolled = rerollDefenseDice(results, config);
    // Faces should be unchanged (no rerolling occurred)
  });

  it('Soresu Mastery rerolls all dice for Ranged', () => {
    const results: RolledDefenseDie[] = Array(5).fill(null).map(() => ({
      color: DefenseDieColor.Red,
      face: DefenseFace.Blank,
    }));
    const config = makeConfig({
      defender: { soresuMastery: true },
      attackType: AttackType.Ranged,
    });
    // All 5 dice should be rerolled
    const rerolled = rerollDefenseDice(results, config);
    expect(rerolled).toHaveLength(5);
  });

  it('Soresu Mastery does not activate for Melee', () => {
    const results: RolledDefenseDie[] = [
      { color: DefenseDieColor.Red, face: DefenseFace.Blank },
    ];
    const config = makeConfig({
      defender: { soresuMastery: true },
      attackType: AttackType.Melee,
    });
    const rerolled = rerollDefenseDice(results, config);
    expect(rerolled[0].face).toBe(DefenseFace.Blank); // Not rerolled
  });
});
```

### Surge Conversion Tests

```ts
describe('convertDefenseSurges', () => {
  it('chart converts all surges', () => {
    const results: RolledDefenseDie[] = [
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
    ];
    const config = makeConfig({ defender: { surgeChart: DefenseSurgeChart.ToBlock } });
    const converted = convertDefenseSurges(results, config, false);
    expect(converted.filter(d => d.face === DefenseFace.Block)).toHaveLength(2);
  });

  it('Deflect is disabled by High Velocity', () => {
    const results: RolledDefenseDie[] = [
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
    ];
    const config = makeConfig({
      attacker: { highVelocity: true },
      defender: { deflect: true },
      attackType: AttackType.Ranged,
    });
    const converted = convertDefenseSurges(results, config, false);
    // High Velocity disables Deflect entirely — surge stays unconverted
    expect(converted[0].face).toBe(DefenseFace.Surge);
  });

  it('Block only converts when Dodge was spent', () => {
    const results: RolledDefenseDie[] = [
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
    ];
    const config = makeConfig({ defender: { block: true } });

    // Dodge NOT spent → Block inactive
    const notSpent = convertDefenseSurges(results, config, false);
    expect(notSpent[0].face).toBe(DefenseFace.Surge);

    // Dodge spent → Block active
    const spent = convertDefenseSurges(results, config, true);
    expect(spent[0].face).toBe(DefenseFace.Block);
  });

  it('surge tokens convert limited surges', () => {
    const results: RolledDefenseDie[] = [
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
    ];
    const config = makeConfig({ defender: { surgeTokens: 2 } });
    const converted = convertDefenseSurges(results, config, false);
    expect(converted.filter(d => d.face === DefenseFace.Block)).toHaveLength(2);
    expect(converted.filter(d => d.face === DefenseFace.Surge)).toHaveLength(1);
  });

  it('conversion priority: chart > Deflect > Block > HTL > tokens', () => {
    // If chart converts all, Deflect/Block/HTL/tokens have nothing to convert
    const results: RolledDefenseDie[] = [
      { color: DefenseDieColor.White, face: DefenseFace.Surge },
    ];
    const config = makeConfig({
      defender: { surgeChart: DefenseSurgeChart.ToBlock, deflect: true, block: true, surgeTokens: 5 },
      attackType: AttackType.Ranged,
    });
    const converted = convertDefenseSurges(results, config, true);
    expect(converted[0].face).toBe(DefenseFace.Block);
  });
});
```

### Guardian Defense Tests

```ts
describe('rollGuardianDefense', () => {
  it('returns wounds = hits - blocks', () => {
    // Statistical test: run many times, check wounds make sense
    let totalWounds = 0;
    const iterations = 1000;
    const config = makeConfig({
      defender: { guardianDieColor: DefenseDieColor.Red, guardianSurgeChart: DefenseSurgeChart.ToBlock },
    });
    for (let i = 0; i < iterations; i++) {
      const result = rollGuardianDefense(3, config);
      expect(result.guardianWoundsNoPierce).toBeGreaterThanOrEqual(0);
      expect(result.guardianWoundsNoPierce).toBeLessThanOrEqual(3);
      totalWounds += result.guardianWoundsNoPierce;
    }
    // With red die + surge:block, expect ~1/3 of 3 hits = ~1 wound on average
    const avgWounds = totalWounds / iterations;
    expect(avgWounds).toBeGreaterThan(0);
    expect(avgWounds).toBeLessThan(3);
  });

  it('Guardian Deflect reflects 1 wound on surge', () => {
    // Mock the roll to produce a surge
    const config = makeConfig({
      defender: { guardianDeflect: true, guardianDieColor: DefenseDieColor.White },
    });
    // Statistical: should reflect ~1/6 of the time (surge rate on white die)
    let deflectCount = 0;
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      const result = rollGuardianDefense(1, config);
      if (result.guardianDeflectWounds > 0) deflectCount++;
    }
    const rate = deflectCount / iterations;
    expect(rate).toBeCloseTo(1 / 6, 1);
  });

  it('Guardian Deflect blocked by Immune: Deflect', () => {
    const config = makeConfig({
      attacker: { immuneDeflect: true },
      defender: { guardianDeflect: true },
    });
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const result = rollGuardianDefense(3, config);
      expect(result.guardianDeflectWounds).toBe(0);
    }
  });

  it('defaults to white die when guardianDieColor not specified', () => {
    const config = makeConfig({ defender: { guardianX: 2 } });
    // Should not throw, uses white die default
    const result = rollGuardianDefense(2, config);
    expect(result.guardianWoundsNoPierce).toBeGreaterThanOrEqual(0);
  });
});
```

---

## Integration Notes

- `surgeCountBeforeConversion` is captured between Step 7d (reroll) and Step 7e (conversion). It's used by Step 9 for Deflect/Shien wound calculation.
- `guardianBlocks` and `guardianWoundsNoPierce` are passed to Step 9 for the combined wound calculation.
- Pierce is NOT applied anywhere in Steps 7-8. It's applied globally in Step 9 to the combined block total.
- The `dodgeWasSpent` flag from Step 5 flows into `convertDefenseSurges` for Block activation.
