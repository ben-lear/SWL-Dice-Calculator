# Phase 2B — Compare Results (Step 9) — Detailed Implementation Plan

## Goal

Implement Step 9 of the attack sequence: comparing attack results against defense results to calculate wounds, reflection damage, and suppression. This is the culmination step where Pierce is finally applied and all defensive keyword reactions are resolved.

**File:** `src/engine/attackSequence.ts`

**Depends on:** Steps 6, 7, 8 outputs, plus original attack roll for Djem So

---

## Data Flow

```
Inputs:
  attackResults:      { hits, crits }         (from Step 6)
  defenseInfo:        { mainTargetBlocks,     (from Step 8)
                        guardianBlocks,        (from Step 6b)
                        guardianHits }         (from Step 6)
  config:             AttackConfig
  lethalPierce:       number                  (from Step 6 Lethal X)
  duelistPierceBonus: number                  (from Step 4c Duelist attacker)
  surgeCountBeforeConversion: number          (from Step 7, captured before 7e)
  originalAttackRollResults: RolledAttackDie[] (from Step 4b, before any Marksman)
  guardianWoundsNoPierce: number              (from Step 6b)
  guardianDeflectWounds: number               (from Step 6b)
  dodgeWasSpent:      boolean                 (from Step 5)

Output:
  AttackResult {
    guardianWoundsNoPierce: number;
    mainTargetWoundsNoPierce: number;
    totalWounds: number;
    deflectWounds: number;
    djemSoWounds: number;
    suppressionApplied: number;
  }
```

---

## Why Three Wound Numbers?

The calculator reports three separate wound values because **Pierce cannot be optimally allocated** between Guardian and the main target without human decision-making:

| Value | Formula | Purpose |
|-------|---------|---------|
| `guardianWoundsNoPierce` | guardianHits − guardianBlocks | Wounds Guardian takes if Pierce targets main target |
| `mainTargetWoundsNoPierce` | (hits+crits) − mainTargetBlocks | Wounds main target takes if Pierce targets Guardian |
| `totalWounds` | totalHits − max(0, combinedBlocks − totalPierce) | Combined wounds with optimal Pierce on combined pool |

---

## Operation Order

The order of operations inside `compareResults()` is critical. This is the correct sequence:

```
1. Calculate individual target wounds WITHOUT Pierce
2. Determine total Pierce from all sources
3. Apply Makashi Mastery Pierce reduction (attacker keyword)
4. Apply Immune: Pierce / Immune: Melee Pierce (defender keyword)
5. Apply Duelist (defender) — sets Pierce to 0 under conditions  ◀ MUST BE BEFORE step 6
6. Apply Pierce to combined blocks → compute totalWounds
7. Calculate Deflect / Shien Mastery reflection wounds
8. Calculate Djem So Mastery reflection wounds
9. Calculate suppression (including Shien suppression override)
```

### BUG FIX: Duelist Defender Timing

**The original plan has a timing bug.** In the original code:

```ts
// BUG: blocksAfterPierce computed with full totalPierce
const blocksAfterPierce = Math.max(0, combinedBlocks - totalPierce);
const totalWounds = Math.max(0, totalHits - blocksAfterPierce);
// ...
// BUG: Duelist sets totalPierce = 0 here, but blocksAfterPierce already used the old value!
if (defender.duelistDefender && config.attackType === AttackType.Melee && dodgeWasSpent) {
  totalPierce = 0;
}
```

**The fix:** Move the Duelist defender check BEFORE the `blocksAfterPierce` calculation:

```ts
// CORRECT: Duelist check before applying Pierce
if (defender.duelistDefender && config.attackType === AttackType.Melee && dodgeWasSpent) {
  totalPierce = 0;
}

const blocksAfterPierce = Math.max(0, combinedBlocks - totalPierce);
const totalWounds = Math.max(0, totalHits - blocksAfterPierce);
```

---

## Full Implementation: `compareResults()`

```ts
/**
 * Step 9 — Compare Results
 *
 * Three wound outputs:
 *   - guardianWoundsNoPierce: guardian hits − guardian blocks (pierce excluded)
 *   - mainTargetWoundsNoPierce: (hits + crits) − main target blocks (pierce excluded)
 *   - totalWounds: (all hits) − (combined blocks − pierce)
 *
 * Reflection wounds (dealt back to attacker):
 *   - deflectWounds: Deflect/Shien + Guardian Deflect
 *   - djemSoWounds: Djem So Mastery
 *
 * Suppression:
 *   - suppressionApplied: 1 (or 2 with Suppressive), 0 if Shien suppresses
 */
function compareResults(
  attackResults: { hits: number; crits: number },
  defenseInfo: {
    mainTargetBlocks: number;
    guardianBlocks: number;
    guardianHits: number;
  },
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

  // ════════════════════════════════════════════════════════════
  // 1. Individual target wounds WITHOUT Pierce
  // ════════════════════════════════════════════════════════════

  const mainTargetHits = attackResults.hits + attackResults.crits;
  const mainTargetWoundsNoPierce = Math.max(0, mainTargetHits - defenseInfo.mainTargetBlocks);

  // guardianWoundsNoPierce is already computed in Step 6b and passed in.

  // ════════════════════════════════════════════════════════════
  // 2. Calculate total Pierce from all sources
  // ════════════════════════════════════════════════════════════

  let totalPierce = attacker.pierceX + lethalPierce + duelistPierceBonus;

  // ════════════════════════════════════════════════════════════
  // 3. Makashi Mastery (attacker) — Reduce Pierce by 1 in Melee
  // ════════════════════════════════════════════════════════════
  //
  // Makashi Mastery does two things:
  //   1. Reduce the attacker's total Pierce X by 1 (minimum 0) for Melee attacks.
  //      This is the "cost" of using Makashi — the attacker trades 1 Pierce
  //      for the ability to bypass Immune: Pierce and Impervious.
  //   2. Disable Immune: Pierce and Impervious on the defender for Melee attacks.
  //      This is handled in Steps 4 and 7b (Impervious check) — not here.
  //
  // The Pierce reduction is applied to the collective total from ALL sources
  // (keyword Pierce X + Lethal Pierce + Duelist Pierce), reduced by 1.
  if (
    attacker.makashiMastery &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All)
  ) {
    totalPierce = Math.max(0, totalPierce - 1);
  }

  // ════════════════════════════════════════════════════════════
  // 4. Immune: Pierce / Immune: Melee Pierce (defender)
  // ════════════════════════════════════════════════════════════
  //
  // Immune: Pierce — ignores ALL Pierce (unless Makashi Mastery overrides in Melee)
  // Immune: Melee Pierce — ignores Pierce from Melee attacks only (unless Makashi)
  //
  // Check logic:
  //   immuneActive = (Immune: Pierce AND NOT (Makashi + Melee))
  //               OR (Immune: Melee Pierce AND Melee AND NOT (Makashi + Melee))
  //
  // Simplification: Makashi overrides BOTH Immune: Pierce and Immune: Melee Pierce
  // for Melee attacks only.

  const isMeleeWithMakashi =
    attacker.makashiMastery &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All);

  const immuneToThisPierce =
    (defender.immunePierce && !isMeleeWithMakashi) ||
    (defender.immuneMeleePierce &&
      config.attackType === AttackType.Melee &&
      !isMeleeWithMakashi);

  if (immuneToThisPierce) {
    totalPierce = 0;
  }

  // ════════════════════════════════════════════════════════════
  // 5. Duelist (defender) — Pierce immunity on Melee + Dodge spent
  // ════════════════════════════════════════════════════════════
  //
  // Per rulebook: "When this unit defends against a Melee attack, if it
  // spends 1 or more Dodge tokens, its defense dice cannot be canceled
  // by Pierce X."
  //
  // *** MUST be checked BEFORE blocksAfterPierce calculation ***
  // (See BUG FIX section above)

  if (
    defender.duelistDefender &&
    config.attackType === AttackType.Melee &&
    dodgeWasSpent
  ) {
    totalPierce = 0;
  }

  // ════════════════════════════════════════════════════════════
  // 6. Apply Pierce to combined blocks → total wounds
  // ════════════════════════════════════════════════════════════

  const combinedBlocks = defenseInfo.mainTargetBlocks + defenseInfo.guardianBlocks;
  const totalHits = mainTargetHits + defenseInfo.guardianHits;

  const blocksAfterPierce = Math.max(0, combinedBlocks - totalPierce);
  const totalWounds = Math.max(0, totalHits - blocksAfterPierce);

  // ════════════════════════════════════════════════════════════
  // 7. Deflect / Shien Mastery — Reflection wounds to attacker
  // ════════════════════════════════════════════════════════════
  //
  // Conditions for Deflect activation:
  //   - defender.deflect = true
  //   - Attack is Ranged (or All)
  //   - Attacker does NOT have High Velocity (HV disables all Deflect effects)
  //   - Attacker does NOT have Immune: Deflect
  //   - At least 1 surge result existed BEFORE conversion (surgeCountBeforeConversion > 0)
  //
  // High Velocity completely disables Deflect — both surge conversion (Step 7e)
  // and wound reflection (here in Step 9). HV is effectively a stronger version
  // of Immune: Deflect. If HV is active, skip the Deflect check entirely.
  //
  // Shien Mastery upgrade: instead of 1 wound per attack, deal 1 wound PER surge.

  let deflectWounds = 0;

  if (
    defender.deflect &&
    !attacker.highVelocity &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All) &&
    !attacker.immuneDeflect
  ) {
    if (surgeCountBeforeConversion > 0) {
      if (defender.shienMastery) {
        // Shien Mastery: 1 wound per surge result (before conversion)
        deflectWounds = surgeCountBeforeConversion;
      } else {
        // Standard Deflect: exactly 1 wound if any surges existed
        deflectWounds = 1;
      }
    }
  }

  // Add Guardian Deflect wounds (calculated separately in Step 6b)
  deflectWounds += guardianDeflectWounds;

  // ════════════════════════════════════════════════════════════
  // 8. Djem So Mastery — Reflection wound to attacker
  // ════════════════════════════════════════════════════════════
  //
  // Conditions:
  //   - defender.djemSoMastery = true
  //   - Attack is Melee (or All)
  //   - ORIGINAL attack roll (before Marksman conversions) has blank results
  //   - Deals exactly 1 wound (not per-blank)
  //
  // The "original attack roll" is the roll from Step 4b, before any
  // Marksman blank→hit or hit→crit conversions in Step 4d.5.
  //
  // Design note: We pass originalAttackRollResults (from Step 4b) specifically
  // for this check. Do NOT use post-Marksman results.

  let djemSoWounds = 0;

  if (
    defender.djemSoMastery &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All)
  ) {
    const attackBlanks = originalAttackRollResults.filter(
      d => d.face === AttackFace.Blank
    ).length;
    if (attackBlanks > 0) {
      djemSoWounds = 1; // Exactly 1, regardless of blank count
    }
  }

  // ════════════════════════════════════════════════════════════
  // 9. Suppression
  // ════════════════════════════════════════════════════════════
  //
  // Base: 1 suppression per ranged attack
  // Suppressive keyword: 2 suppression instead of 1
  // Shien Mastery override: 0 suppression if defender took 0 wounds
  //
  // Melee and Overrun attacks do NOT cause suppression.
  //
  // Note: Shien uses totalWounds (the Pierce-adjusted combined value).
  // If totalWounds = 0, no suppression is applied.

  let suppressionApplied: number;

  if (config.attackType === AttackType.Melee || config.attackType === AttackType.Overrun) {
    // Melee and Overrun attacks do not cause suppression
    suppressionApplied = 0;
  } else {
    suppressionApplied = attacker.suppressive ? 2 : 1;
  }

  // Shien Mastery: no suppression if 0 wounds dealt
  if (defender.shienMastery && totalWounds === 0) {
    suppressionApplied = 0;
  }

  // ════════════════════════════════════════════════════════════
  // Return
  // ════════════════════════════════════════════════════════════

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

---

## Keyword Interaction Matrix

| Attacker Keyword | Defender Keyword | Interaction |
|-----------------|-----------------|-------------|
| Pierce X | Immune: Pierce | Pierce = 0 (unless Makashi overrides) |
| Pierce X | Immune: Melee Pierce | Pierce = 0 for Melee only (unless Makashi) |
| Makashi Mastery | Immune: Pierce | Makashi overrides Immune in Melee |
| Makashi Mastery | Immune: Melee Pierce | Makashi overrides Immune in Melee |
| Lethal X | Duelist (defender) | Duelist zeroes ALL Pierce (Lethal included) |
| Pierce X | Duelist (defender) + Dodge | All Pierce cancelled (Melee + Dodge spent) |
| Any | Deflect | 1 wound reflection (Ranged, if surges pre-conversion) |
| Immune: Deflect | Deflect | No reflection wound, but surges still convert |
| Any | Shien Mastery | N wounds reflection (N = surge count pre-conversion) |
| Any (Melee) | Djem So Mastery | 1 wound reflection if original roll had blanks |
| Suppressive | Shien Mastery | Suppression = 0 if totalWounds = 0 |

---

## Edge Cases

| Scenario | Expected Result |
|----------|-----------------|
| 0 hits, 0 crits reaching Step 9 | All wounds = 0, deflect still possible if surges existed |
| Pierce 3, 0 combined blocks | blocksAfterPierce = 0, Pierce has no additional effect |
| Pierce 3, 5 combined blocks | blocksAfterPierce = 2, Pierce cancels 3 blocks |
| Immune: Pierce + Makashi (Ranged attack) | Immune: Pierce active (Makashi only works in Melee) |
| Immune: Pierce + Makashi (Melee attack) | Makashi overrides → Pierce works normally |
| Immune: Melee Pierce + Ranged attack | Immune inactive → Pierce works normally |
| Duelist defender + Melee + Dodge NOT spent | Duelist inactive → Pierce works normally |
| Duelist defender + Melee + Dodge spent | totalPierce = 0 |
| Duelist defender + Ranged attack + Dodge spent | Duelist inactive (Melee only) |
| Deflect + 0 surges pre-conversion | deflectWounds = 0 |
| Deflect + 3 surges + Shien | deflectWounds = 3 |
| Deflect + 3 surges + no Shien | deflectWounds = 1 |
| Guardian Deflect wound + main Deflect wound | deflectWounds = sum of both |
| Deflect + Immune: Deflect | deflectWounds = 0, but surges still convert to blocks |
| Djem So + Ranged attack | djemSoWounds = 0 (Melee only) |
| Djem So + Melee + 0 blanks in original roll | djemSoWounds = 0 |
| Djem So + Melee + 5 blanks in original roll | djemSoWounds = 1 (always exactly 1) |
| Djem So + Marksman converted blanks | Still checks ORIGINAL roll (pre-Marksman) |
| Shien + 0 wounds dealt | suppressionApplied = 0 |
| Shien + 1+ wounds dealt | suppressionApplied = normal (1 or 2) |
| Suppressive + Ranged | suppressionApplied = 2 |
| Melee attack (any) | suppressionApplied = 0 |
| Overrun attack (any) | suppressionApplied = 0 |
| Guardian 2 absorbed + Guardian 1 blocked + main 1 blocked + Pierce 3 | guardianWoundsNoPierce = 1, mainTargetWoundsNoPierce = hits-1, totalWounds = totalHits - max(0, 2 - 3) = totalHits |
| All keywords active simultaneously | Each processes independently in order |

---

## Immune: Deflect Clarification

`Immune: Deflect` on the attacker prevents the **wound reflection**, but does NOT prevent Deflect from converting surges to blocks. Deflect has two effects:
1. Surge → Block conversion (always active)
2. Wound reflection (blocked by Immune: Deflect)

This means in `convertDefenseSurges()` (Step 7e), Deflect still converts surges even if attacker has `Immune: Deflect`. The immunity check ONLY appears in `compareResults()` when calculating reflection wounds.

---

## Unit Tests

### Pierce Application Tests

```ts
describe('compareResults — Pierce', () => {
  it('applies Pierce to combined blocks', () => {
    const result = compareResults(
      { hits: 4, crits: 1 },
      { mainTargetBlocks: 2, guardianBlocks: 1, guardianHits: 2 },
      makeConfig({ attacker: { pierceX: 2 } }),
      0, 0, 0, [], 1, 0, false
    );
    // Combined blocks = 3, Pierce 2 → blocksAfterPierce = 1
    // Total hits = 5 + 2 = 7
    // totalWounds = 7 - 1 = 6
    expect(result.totalWounds).toBe(6);
  });

  it('Immune: Pierce zeroes all Pierce', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 1, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({ attacker: { pierceX: 2 }, defender: { immunePierce: true } }),
      0, 0, 0, [], 0, 0, false
    );
    // Pierce 0 (immune), blocks = 1
    // totalWounds = 3 - 1 = 2
    expect(result.totalWounds).toBe(2);
  });

  it('Makashi overrides Immune: Pierce in Melee', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 1, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        attacker: { pierceX: 3, makashiMastery: true },
        defender: { immunePierce: true },
        attackType: AttackType.Melee,
      }),
      0, 0, 0, [], 0, 0, false
    );
    // Pierce 3, Makashi -1 = 2, Immune overridden by Makashi
    // blocks 1 - Pierce 2 = 0 → totalWounds = 3
    expect(result.totalWounds).toBe(3);
  });

  it('Makashi does NOT override Immune: Pierce in Ranged', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 1, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        attacker: { pierceX: 3, makashiMastery: true },
        defender: { immunePierce: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 0, [], 0, 0, false
    );
    // Makashi only works Melee → Immune: Pierce active → Pierce = 0
    // blocks 1 → totalWounds = 3 - 1 = 2
    expect(result.totalWounds).toBe(2);
  });
});
```

### Duelist Defender Tests

```ts
describe('compareResults — Duelist defender', () => {
  it('Duelist zeroes Pierce on Melee + Dodge spent', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 2, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        attacker: { pierceX: 3 },
        defender: { duelistDefender: true },
        attackType: AttackType.Melee,
      }),
      0, 0, 0, [], 0, 0, true // dodgeWasSpent = true
    );
    // Pierce zeroed → blocks = 2 → totalWounds = 3 - 2 = 1
    expect(result.totalWounds).toBe(1);
  });

  it('Duelist inactive on Ranged', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 2, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        attacker: { pierceX: 2 },
        defender: { duelistDefender: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 0, [], 0, 0, true
    );
    // Duelist only Melee → Pierce 2 → blocks 0 → totalWounds = 3
    expect(result.totalWounds).toBe(3);
  });

  it('Duelist inactive when Dodge NOT spent', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 2, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        attacker: { pierceX: 2 },
        defender: { duelistDefender: true },
        attackType: AttackType.Melee,
      }),
      0, 0, 0, [], 0, 0, false // dodgeWasSpent = false
    );
    // Dodge not spent → Pierce active → blocks 0 → totalWounds = 3
    expect(result.totalWounds).toBe(3);
  });

  it('Duelist zeroes Lethal Pierce too', () => {
    const result = compareResults(
      { hits: 4, crits: 0 },
      { mainTargetBlocks: 3, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        attacker: { pierceX: 1 },
        defender: { duelistDefender: true },
        attackType: AttackType.Melee,
      }),
      2, 0, 0, [], 0, 0, true // lethalPierce = 2
    );
    // totalPierce would be 3 (1 + 2), Duelist zeroes → blocks = 3 → totalWounds = 1
    expect(result.totalWounds).toBe(1);
  });
});
```

### Deflect / Shien Tests

```ts
describe('compareResults — Deflect & Shien', () => {
  it('standard Deflect reflects exactly 1 wound', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { deflect: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 4, [], 0, 0, false // 4 surges before conversion
    );
    expect(result.deflectWounds).toBe(1);
  });

  it('Shien Mastery reflects per-surge', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { deflect: true, shienMastery: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 4, [], 0, 0, false // 4 surges before conversion
    );
    expect(result.deflectWounds).toBe(4);
  });

  it('Immune: Deflect prevents reflection', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        attacker: { immuneDeflect: true },
        defender: { deflect: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 3, [], 0, 0, false
    );
    expect(result.deflectWounds).toBe(0);
  });

  it('Deflect is inactive on Melee', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { deflect: true },
        attackType: AttackType.Melee,
      }),
      0, 0, 3, [], 0, 0, false
    );
    expect(result.deflectWounds).toBe(0);
  });

  it('adds Guardian Deflect wounds to total', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { deflect: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 2, [], 0, 1, false // guardianDeflectWounds = 1
    );
    // Main Deflect: 1 (standard), Guardian: 1 → total = 2
    expect(result.deflectWounds).toBe(2);
  });

  it('0 surges before conversion → no Deflect', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { deflect: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 0, [], 0, 0, false // 0 surges
    );
    expect(result.deflectWounds).toBe(0);
  });
});
```

### Djem So Tests

```ts
describe('compareResults — Djem So', () => {
  it('reflects 1 wound on Melee with blanks', () => {
    const originalRoll: RolledAttackDie[] = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const result = compareResults(
      { hits: 2, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { djemSoMastery: true },
        attackType: AttackType.Melee,
      }),
      0, 0, 0, originalRoll, 0, 0, false
    );
    expect(result.djemSoWounds).toBe(1);
  });

  it('exactly 1 wound regardless of blank count', () => {
    const originalRoll: RolledAttackDie[] = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Blank },
    ];
    const result = compareResults(
      { hits: 0, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { djemSoMastery: true },
        attackType: AttackType.Melee,
      }),
      0, 0, 0, originalRoll, 0, 0, false
    );
    expect(result.djemSoWounds).toBe(1); // Still just 1
  });

  it('inactive on Ranged', () => {
    const originalRoll: RolledAttackDie[] = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
    ];
    const result = compareResults(
      { hits: 0, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { djemSoMastery: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 0, originalRoll, 0, 0, false
    );
    expect(result.djemSoWounds).toBe(0);
  });

  it('checks original roll, not post-Marksman', () => {
    // Original roll had blanks, but Marksman would have converted them.
    // Djem So still fires because it checks the ORIGINAL roll.
    const originalRoll: RolledAttackDie[] = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const result = compareResults(
      { hits: 2, crits: 0 }, // Marksman converted blank→hit
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { djemSoMastery: true },
        attackType: AttackType.Melee,
      }),
      0, 0, 0, originalRoll, 0, 0, false
    );
    expect(result.djemSoWounds).toBe(1);
  });

  it('no blanks in original roll → 0 wounds', () => {
    const originalRoll: RolledAttackDie[] = [
      { color: AttackDieColor.Red, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Crit },
    ];
    const result = compareResults(
      { hits: 1, crits: 1 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { djemSoMastery: true },
        attackType: AttackType.Melee,
      }),
      0, 0, 0, originalRoll, 0, 0, false
    );
    expect(result.djemSoWounds).toBe(0);
  });
});
```

### Suppression Tests

```ts
describe('compareResults — Suppression', () => {
  it('Ranged attack: 1 suppression', () => {
    const result = compareResults(
      { hits: 1, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({ attackType: AttackType.Ranged }),
      0, 0, 0, [], 0, 0, false
    );
    expect(result.suppressionApplied).toBe(1);
  });

  it('Melee attack: 0 suppression', () => {
    const result = compareResults(
      { hits: 1, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({ attackType: AttackType.Melee }),
      0, 0, 0, [], 0, 0, false
    );
    expect(result.suppressionApplied).toBe(0);
  });

  it('Overrun attack: 0 suppression', () => {
    const result = compareResults(
      { hits: 1, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({ attackType: AttackType.Overrun }),
      0, 0, 0, [], 0, 0, false
    );
    expect(result.suppressionApplied).toBe(0);
  });

  it('Suppressive: 2 suppression', () => {
    const result = compareResults(
      { hits: 1, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({ attacker: { suppressive: true }, attackType: AttackType.Ranged }),
      0, 0, 0, [], 0, 0, false
    );
    expect(result.suppressionApplied).toBe(2);
  });

  it('Shien Mastery: 0 suppression when 0 wounds', () => {
    const result = compareResults(
      { hits: 1, crits: 0 },
      { mainTargetBlocks: 1, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { shienMastery: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 0, [], 0, 0, false
    );
    // 1 hit - 1 block = 0 wounds → Shien suppresses suppression
    expect(result.suppressionApplied).toBe(0);
  });

  it('Shien Mastery: normal suppression when wounds dealt', () => {
    const result = compareResults(
      { hits: 2, crits: 0 },
      { mainTargetBlocks: 0, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({
        defender: { shienMastery: true },
        attackType: AttackType.Ranged,
      }),
      0, 0, 0, [], 0, 0, false
    );
    // 2 hits - 0 blocks = 2 wounds → Shien does NOT suppress
    expect(result.suppressionApplied).toBe(1);
  });
});
```

### Three-Wound Output Tests

```ts
describe('compareResults — wound outputs', () => {
  it('guardianWoundsNoPierce is passed through', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 1, guardianBlocks: 1, guardianHits: 2 },
      makeConfig({ attacker: { pierceX: 2 } }),
      0, 0, 0, [], 1, 0, false // guardianWoundsNoPierce = 1
    );
    expect(result.guardianWoundsNoPierce).toBe(1);
  });

  it('mainTargetWoundsNoPierce excludes Pierce', () => {
    const result = compareResults(
      { hits: 3, crits: 0 },
      { mainTargetBlocks: 2, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({ attacker: { pierceX: 5 } }),
      0, 0, 0, [], 0, 0, false
    );
    // mainTargetWoundsNoPierce = 3 - 2 = 1 (Pierce NOT included)
    expect(result.mainTargetWoundsNoPierce).toBe(1);
    // totalWounds = 3 - max(0, 2 - 5) = 3 - 0 = 3 (Pierce IS included)
    expect(result.totalWounds).toBe(3);
  });

  it('totalWounds uses combined blocks and Pierce', () => {
    const result = compareResults(
      { hits: 4, crits: 1 },
      { mainTargetBlocks: 2, guardianBlocks: 1, guardianHits: 2 },
      makeConfig({ attacker: { pierceX: 2 } }),
      0, 0, 0, [], 1, 0, false
    );
    // totalHits = 5 + 2 = 7
    // combinedBlocks = 3, Pierce 2 → blocksAfterPierce = 1
    // totalWounds = 7 - 1 = 6
    expect(result.totalWounds).toBe(6);
  });

  it('wounds cannot be negative', () => {
    const result = compareResults(
      { hits: 1, crits: 0 },
      { mainTargetBlocks: 5, guardianBlocks: 0, guardianHits: 0 },
      makeConfig({}),
      0, 0, 0, [], 0, 0, false
    );
    expect(result.mainTargetWoundsNoPierce).toBe(0);
    expect(result.totalWounds).toBe(0);
  });
});
```

---

## Integration Notes

- `compareResults()` is the final function called in the pipeline. Its output is the `AttackResult` returned by `executeAttackSequence()`.
- The `originalAttackRollResults` parameter must be the Step 4b roll (before Marksman conversions) — this is specifically for Djem So's blank check.
- The `surgeCountBeforeConversion` must be captured between Step 7d (reroll) and Step 7e (conversion) — it cannot be recalculated after conversion.
- `guardianDeflectWounds` comes from Step 6b (`rollGuardianDefense()`) and is added to the Deflect total.
- `dodgeWasSpent` flows from Step 5 and affects both `convertDefenseSurges()` (Block keyword) and `compareResults()` (Duelist defender).
