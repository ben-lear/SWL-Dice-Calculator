# Phase 2B — Modify Attack Dice (Step 6) — Detailed Implementation Plan

## Goal

Implement Step 6 of the attack sequence. This step applies keyword effects that modify the attack results after Dodge/Cover but before defense dice are rolled. It handles multiple keyword interactions with a strict ordering.

**File:** `src/engine/attackSequence.ts` — `modifyAttackDice()` function

**Depends on:** Step 5 output (`{ hits, crits }`), `aimsSpent`, `aimsSavedForMarksman` from Step 4c

---

## Data Flow

```
Input:  { hits: number, crits: number, blanks: number }  (from Step 5 + blanks from Step 4d.6)
        AttackConfig
        aimsSpent: number        (from Step 4c — aims consumed by rerolls)
        aimsSavedForMarksman: number (from Step 4c — aims consumed by Marksman)

Output: {
  hits: number,            // Remaining hits after modifications
  crits: number,           // Remaining crits (may increase from conversions)
  lethalPierce: number,    // Pierce bonus from Lethal X (aim-based)
  guardianHits: number     // Hits absorbed by Guardian X
}
```

---

## Operation Order

The order of operations in Step 6 is critical. Keywords must be applied in the following sequence:

```
1. Ram X        — Convert ANY results (blanks first, then hits) to crits
2. Impact X     — Convert hits → crits (to bypass Armor)
3. Armor X      — Cancel hits (crits bypass)
4. Shielded X   — Cancel crits first, then hits (Ranged only)
5. Backup       — Cancel up to 2 hits (Ranged only)
6. Guardian X   — Absorb up to X hits (Ranged only, separate defense)
7. Lethal X     — Calculate Pierce bonus from remaining aims
```

### Why This Order Matters

- **Ram before Impact:** Ram converts blanks→crits (free value), then hits→crits. Impact also converts hits→crits but specifically to bypass Armor. Ram should be applied first since it converts the least-valuable results (blanks) to the most-valuable (crits).
- **Impact before Armor:** Impact converts hits→crits so they survive Armor cancellation. Applying Impact after Armor would be too late.
- **Armor before Shielded/Backup/Guardian:** Armor is a direct cancellation. The remaining hits after Armor are what Shielded/Backup/Guardian then interact with.
- **Shielded before Backup:** Shielded cancels crits first (higher value to the attacker), so it's applied first to maximize defensive value. Then Backup cancels remaining hits.
- **Guardian after other cancellations:** Guardian absorbs hits for a SEPARATE defense roll. It should see the "final" hit count after all other cancellations.
- **Lethal last:** Lethal calculates Pierre from leftover aims. It doesn't modify hits/crits, just computes a number for Step 7/9.

---

## Implementation

```ts
/**
 * Step 6 — Modify Attack Dice
 *
 * Applies attacker and defender modification keywords to the attack results.
 * This is the last step before defense dice are rolled.
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Ram X — Convert up to X results (any face) to crits
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "While this unit is performing an attack, change X attack die
  // results to crit results."
  // Priority: blanks first (free value), then hits (upgrade)
  // Crits are already crits — skipped.
  if (attacker.ramX > 0) {
    let ramRemaining = attacker.ramX;

    // Convert blanks → crits
    const blanksConverted = Math.min(blanks, ramRemaining);
    blanks -= blanksConverted;
    crits += blanksConverted;
    ramRemaining -= blanksConverted;

    // Convert hits → crits (only if Ram budget remains)
    if (ramRemaining > 0) {
      const hitsConverted = Math.min(hits, ramRemaining);
      hits -= hitsConverted;
      crits += hitsConverted;
      ramRemaining -= hitsConverted;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Impact X — Convert up to X hits → crits (only when defender has Armor)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "While attacking a unit that has Armor, change up to X hit
  // results to crit results."
  // Impact only activates when the defender has Armor X > 0.
  if (attacker.impactX > 0 && defender.armorX > 0) {
    const impactConversions = Math.min(hits, attacker.impactX);
    hits -= impactConversions;
    crits += impactConversions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Armor X — Cancel up to X hits (crits bypass Armor)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "While a unit with Armor X is defending, cancel up to X hit
  // results." Crits are NOT cancelled by Armor.
  if (defender.armorX > 0) {
    const hitsCancelled = Math.min(hits, defender.armorX);
    hits -= hitsCancelled;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Shielded X — Cancel up to X results (crits first, then hits)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "Cancel up to X results" — applies to any result type.
  // Ranged attacks only.
  // Priority: cancel crits first (most valuable to attacker), then hits.
  if (
    defender.shieldedX > 0 &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
  ) {
    let shieldRemaining = defender.shieldedX;

    // Cancel crits first
    const critsCancelled = Math.min(crits, shieldRemaining);
    crits -= critsCancelled;
    shieldRemaining -= critsCancelled;

    // Cancel hits with remaining shield
    if (shieldRemaining > 0) {
      const hitsCancelled = Math.min(hits, shieldRemaining);
      hits -= hitsCancelled;
      shieldRemaining -= hitsCancelled;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Backup — Cancel up to 2 hits (Ranged only)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "When a unit with the Backup keyword is attacked by a ranged
  // attack, 2 hit results are canceled."
  if (
    defender.backup &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
  ) {
    const hitsCancelled = Math.min(hits, 2);
    hits -= hitsCancelled;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Guardian X — Absorb up to X hits (Ranged only)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "When a friendly unit is attacked, cancel up to X hit results."
  // Guardian absorbs hits but then rolls its OWN defense dice.
  // The absorbed hits are defended separately (Step 6b).
  // Pierce is NOT applied to Guardian — it's deferred to compareResults (Step 9).
  let guardianHits = 0;
  if (
    defender.guardianX > 0 &&
    (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)
  ) {
    guardianHits = Math.min(hits, defender.guardianX);
    hits -= guardianHits;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Lethal X — Calculate Pierce bonus from remaining Aim tokens
  // ═══════════════════════════════════════════════════════════════════════════
  // Per rulebook: "While attacking, if the attacking unit spends Aim tokens,
  // add Pierce X to the attack pool."
  //
  // Lethal X requires spending aim tokens SPECIFICALLY to gain Pierce.
  // Each aim dedicated to Lethal grants 1 Pierce, up to the Lethal X value.
  // Aims spent on rerolls or saved for Marksman do NOT count toward Lethal —
  // only aims that remain unspent after those steps are available for Lethal.
  //
  // The reroll engine (Step 4c) should reserve aims for Lethal by default,
  // limiting reroll/Marksman aim usage to: aimTokens - aimsToReserveForLethal.
  // This ensures leftover aims are available here.
  //
  // lethalPierce = min(lethalX, aimsLeftover)
  // where aimsLeftover = aimTokens - aimsSpent - aimsSavedForMarksman
  //
  // Note: Duelist is tracked separately (pierceBonus) and does NOT consume
  // an extra aim — it piggybacks on a reroll spend.
  const aimsLeftover = Math.max(0, attacker.aimTokens - aimsSpent - aimsSavedForMarksman);
  if (attacker.lethalX > 0 && aimsLeftover > 0) {
    lethalPierce = Math.min(attacker.lethalX, aimsLeftover);
  }

  return { hits, crits, lethalPierce, guardianHits };
}
```

---

## Lethal X — Detailed Analysis

### Aim Token Economy

Aim tokens are a shared pool consumed by multiple features. Each aim can only be used once:

```
Total Aims = attacker.aimTokens
  └─ aimsSpent             (consumed by rerolls in Step 4c)
  └─ aimsSavedForMarksman  (consumed by Marksman in Step 4d.5)
  └─ aimsLeftover          (available for Lethal X in Step 6)
      └─ lethalPierce = min(lethalX, aimsLeftover)
```

**Lethal X aim-spending rule:**
- `aimsLeftover = aimTokens - aimsSpent - aimsSavedForMarksman`
- `lethalPierce = min(lethalX, aimsLeftover)`
- If `aimsLeftover = 0` → no Lethal Pierce (all aims consumed by rerolls/Marksman)

**Upstream aim reservation (Step 4c):**
- The reroll engine should reserve `min(lethalX, aimTokens)` aims for Lethal by DEFAULT
- This limits the reroll/Marksman budget to `aimTokens - aimsToReserveForLethal`
- Override: if `defenderDiceEstimate <= currentPierceWithoutLethal`, Lethal adds no value
  → set `aimsToReserveForLethal = 0` → use all aims for rerolls/Marksman

**Duelist (attacker) interaction:**
- Duelist grants Pierce +1 from spending an Aim on rerolls (tracked separately as `pierceBonus`)
- Duelist does NOT consume an extra aim — it's a bonus on top of the reroll spend
- Lethal and Duelist stack: total Pierce = `attacker.pierceX + lethalPierce + duelistPierceBonus`

---

## Edge Cases

| Scenario | Expected |
|----------|----------|
| 0 total results (no hits or crits) | Return all zeros |
| Ram 2 + 1 blank + 1 hit + 1 crit | blank→crit, hit→crit → 3 crits total |
| Ram 1 + 0 blanks + 2 hits | hit→crit → 1 hit, 2 crits |
| Impact 3 + 2 hits + Armor 5 | 2 hits→crits, 0 hits cancelled by Armor → 0h + 2c |
| Impact 3 + 5 hits + Armor 2 | 3 hits→crits, 2 hits cancelled → 0h + 3c |
| Impact 0 + Armor 3 + 5 hits | 3 hits cancelled → 2h + 0c |
| Armor 0 + Impact 5 | Impact not activated (requires Armor > 0) |
| Shielded 3 + 2 crits + 2 hits | 2 crits cancelled, 1 hit cancelled → 1h + 0c |
| Shielded + Melee attack | Not applied (Ranged only) |
| Backup + 5 hits | 2 cancelled → 3h |
| Backup + 1 hit | 1 cancelled → 0h |
| Backup + Melee | Not applied (Ranged only) |
| Guardian 3 + 5 hits | 3 absorbed → 2h, guardianHits=3 |
| Guardian 5 + 2 hits | 2 absorbed → 0h, guardianHits=2 |
| Guardian + Melee | Not applied (Ranged only) |
| Lethal 2 + 3 aims, 1 spent reroll, 0 Marksman | lethalPierce = 2 (min(2, 3-1-0) = 2) |
| Lethal 3 + 2 aims, 0 spent, 0 Marksman | lethalPierce = 2 (min(3, 2) = 2, capped by available aims) |
| Lethal 2 + 2 aims, 2 spent reroll, 0 Marksman | lethalPierce = 0 (all aims used on rerolls) |
| Lethal 2 + 3 aims, 0 spent, 2 Marksman | lethalPierce = 1 (min(2, 3-0-2) = 1) |
| Lethal 2 + 0 aims | lethalPierce = 0 (no aims available) |
| Ram + Impact + Armor combined | Ram first (blanks→crits), Impact second (hits→crits), Armor last |
| Shielded + Backup + Guardian | Shielded first (crits), Backup second (2 hits), Guardian last |

---

## Interaction: Guardian Sub-Sequence

When `guardianHits > 0`, the main pipeline triggers `rollGuardianDefense()` in Step 6b. This is a mini defense sequence specifically for the Guardian unit:

```
Guardian hits → Roll guardian defense dice → Count guardian blocks
→ guardianWoundsNoPierce = guardianHits - guardianBlocks
```

The full Guardian defense implementation is covered in [phase2b-defense-sequence.md](phase2b-defense-sequence.md).

**Key point:** Pierce is NOT applied to Guardian defense. Pierce is applied globally in Step 9 (`compareResults`) to the combined block total from both the Guardian and the main defender.

---

## Unit Tests

```ts
describe('modifyAttackDice', () => {
  it('Ram X converts blanks first, then hits', () => {
    const result = modifyAttackDice(
      { hits: 2, crits: 1, blanks: 1 },
      makeConfig({ attacker: { ramX: 2 } }),
      0, 0
    );
    // Ram 2: 1 blank→crit, 1 hit→crit
    expect(result.hits).toBe(1);
    expect(result.crits).toBe(3); // 1 original + 1 from blank + 1 from hit
  });

  it('Impact X converts hits before Armor cancels', () => {
    const result = modifyAttackDice(
      { hits: 3, crits: 0, blanks: 0 },
      makeConfig({ attacker: { impactX: 2 }, defender: { armorX: 2 } }),
      0, 0
    );
    // Impact: 2 hits→crits, Armor: 1 remaining hit cancelled
    expect(result.hits).toBe(0);
    expect(result.crits).toBe(2);
  });

  it('Impact does not activate without Armor', () => {
    const result = modifyAttackDice(
      { hits: 3, crits: 0, blanks: 0 },
      makeConfig({ attacker: { impactX: 5 }, defender: { armorX: 0 } }),
      0, 0
    );
    expect(result.hits).toBe(3);
    expect(result.crits).toBe(0);
  });

  it('Armor only cancels hits, not crits', () => {
    const result = modifyAttackDice(
      { hits: 1, crits: 3, blanks: 0 },
      makeConfig({ defender: { armorX: 5 } }),
      0, 0
    );
    expect(result.hits).toBe(0);  // 1 cancelled
    expect(result.crits).toBe(3); // Unaffected
  });

  it('Shielded cancels crits first', () => {
    const result = modifyAttackDice(
      { hits: 2, crits: 2, blanks: 0 },
      makeConfig({ defender: { shieldedX: 3 }, attackType: AttackType.Ranged }),
      0, 0
    );
    // Shield 3: 2 crits cancelled, 1 hit cancelled
    expect(result.hits).toBe(1);
    expect(result.crits).toBe(0);
  });

  it('Shielded only active for Ranged/All', () => {
    const result = modifyAttackDice(
      { hits: 2, crits: 2, blanks: 0 },
      makeConfig({ defender: { shieldedX: 3 }, attackType: AttackType.Melee }),
      0, 0
    );
    expect(result.hits).toBe(2);
    expect(result.crits).toBe(2);
  });

  it('Backup cancels up to 2 hits', () => {
    const result = modifyAttackDice(
      { hits: 5, crits: 0, blanks: 0 },
      makeConfig({ defender: { backup: true }, attackType: AttackType.Ranged }),
      0, 0
    );
    expect(result.hits).toBe(3);
  });

  it('Guardian absorbs hits for separate defense', () => {
    const result = modifyAttackDice(
      { hits: 5, crits: 2, blanks: 0 },
      makeConfig({ defender: { guardianX: 3 }, attackType: AttackType.Ranged }),
      0, 0
    );
    expect(result.hits).toBe(2);
    expect(result.crits).toBe(2);
    expect(result.guardianHits).toBe(3);
  });

  it('Lethal X uses leftover aims for Pierce', () => {
    const result = modifyAttackDice(
      { hits: 3, crits: 0, blanks: 0 },
      makeConfig({ attacker: { lethalX: 2, aimTokens: 3 } }),
      1, 0 // 1 aim spent on rerolls → 2 leftover for Lethal
    );
    expect(result.lethalPierce).toBe(2); // min(2, 3-1-0) = 2
  });

  it('Lethal X grants no Pierce when all aims consumed', () => {
    const result = modifyAttackDice(
      { hits: 3, crits: 0, blanks: 0 },
      makeConfig({ attacker: { lethalX: 2, aimTokens: 2 } }),
      2, 0 // All aims spent on rerolls → 0 leftover
    );
    expect(result.lethalPierce).toBe(0);
  });

  it('Lethal X capped by leftover aims (not lethalX)', () => {
    const result = modifyAttackDice(
      { hits: 3, crits: 0, blanks: 0 },
      makeConfig({ attacker: { lethalX: 3, aimTokens: 3 } }),
      0, 2 // 2 aims saved for Marksman → 1 leftover
    );
    expect(result.lethalPierce).toBe(1); // min(3, 3-0-2) = 1
  });

  it('Lethal X grants no Pierce with 0 aim tokens', () => {
    const result = modifyAttackDice(
      { hits: 3, crits: 0, blanks: 0 },
      makeConfig({ attacker: { lethalX: 2, aimTokens: 0 } }),
      0, 0
    );
    expect(result.lethalPierce).toBe(0);
  });

  it('combined: Ram + Impact + Armor + Backup + Guardian', () => {
    const result = modifyAttackDice(
      { hits: 3, crits: 0, blanks: 2 },
      makeConfig({
        attacker: { ramX: 1, impactX: 1 },
        defender: { armorX: 2, backup: true, guardianX: 1 },
        attackType: AttackType.Ranged,
      }),
      0, 0
    );
    // Ram 1: 1 blank→crit → hits=3, crits=1, blanks=1
    // Impact 1: 1 hit→crit → hits=2, crits=2
    // Armor 2: 2 hits cancelled → hits=0, crits=2
    // Backup: 0 hits to cancel
    // Guardian 1: 0 hits to absorb
    expect(result.hits).toBe(0);
    expect(result.crits).toBe(2);
    expect(result.guardianHits).toBe(0);
  });
});
```

---

## Integration Notes

- `modifyAttackDice()` receives the `blanks` count from `afterMarksman` pool — this is needed for Ram X
- `guardianHits` triggers `rollGuardianDefense()` in the main pipeline
- `lethalPierce` is passed to `rollDefenseDice()` (for Impervious calculation) and `compareResults()` (for Pierce application)
- The `hits` and `crits` output are what the main defender will roll defense dice against
