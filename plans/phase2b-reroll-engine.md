# Phase 2B — Reroll Engine (Step 4c) — Detailed Implementation Plan

## Goal

Implement the complete reroll logic for Step 4c of the attack sequence. This is the most complex single function in the engine, handling Observation tokens, Aim tokens, Precise X, Marksman save-vs-reroll decisions, Duelist attacker Pierce bonus, Crit Fishing strategy, and aggressive hit rerolls.

**File:** `src/engine/attackSequence.ts`

**Depends on:** `RolledAttackDie` interface, `rollAttackDie()`, `identifyRerollTargets()`, `calculateMarksmanDecision()`

---

## Data Flow

```
Input:  RolledAttackDie[]  (from Step 4b)
        AttackConfig       (full config)

Output: {
  results: RolledAttackDie[],    // Modified dice array
  aimsSpent: number,             // Aims consumed by rerolls (not saved for Marksman)
  pierceBonus: number,           // +1 if Duelist attacker triggered
  aimsSavedForMarksman: number   // Aims reserved for Step 4d.5
}
```

---

## Algorithm: Top-Level Flow

```
1. Clone results array (immutable input)
2. Process Observation tokens (one at a time, 1 reroll each)
3. Process Aim tokens (one at a time, unified decision loop)
4. Calculate Duelist attacker Pierce bonus
5. Return modified results + tracking counters
```

---

## Step 1 — Clone and Sort

```ts
function rerollAttackDice(
  results: RolledAttackDie[],
  config: AttackConfig
): { results: RolledAttackDie[]; aimsSpent: number; pierceBonus: number; aimsSavedForMarksman: number } {
  const { attacker, defender } = config;
  let workingResults = results.map(d => ({ ...d })); // Deep clone each die
  let aimsSpent = 0;
  let pierceBonus = 0;
  let aimsSavedForMarksman = 0;
  const rerollsPerAim = 2 + attacker.preciseX;

  // ── Lethal X Aim Reservation ──
  // Lethal X requires spending aims SPECIFICALLY for Pierce (not just any aim spent).
  // By default, reserve aims for Lethal so they aren't consumed by rerolls/Marksman.
  // Override: if existing Pierce already covers the defender's expected defense dice,
  // additional Pierce from Lethal adds no value → don't reserve aims.
  let aimsToReserveForLethal = 0;
  if (attacker.lethalX > 0 && attacker.aimTokens > 0) {
    aimsToReserveForLethal = Math.min(attacker.lethalX, attacker.aimTokens);

    // Check if Lethal adds value: estimate defense dice vs current Pierce
    const currentHits = workingResults.filter(r => r.face === AttackFace.Hit).length;
    const currentCrits = workingResults.filter(r => r.face === AttackFace.Critical).length;
    const currentSurges = workingResults.filter(r => r.face === AttackFace.Surge).length;
    const hasSurgeConversion =
      attacker.surgeChart !== AttackSurgeChart.None ||
      attacker.jediHunter || attacker.holdTheLine ||
      attacker.surgeTokens > 0 || attacker.criticalX > 0;
    const convertedSurges = hasSurgeConversion ? currentSurges : 0;
    const estimatedDefenseDice = currentHits + currentCrits + convertedSurges;
    const currentPierceWithoutLethal = attacker.pierceX; // Base Pierce (no Lethal, no Duelist yet)

    if (estimatedDefenseDice <= currentPierceWithoutLethal) {
      // Adding more Pierce has no effect — don't reserve aims for Lethal
      aimsToReserveForLethal = 0;
    }
  }
  const aimsAvailableForRerolls = attacker.aimTokens - aimsToReserveForLethal;

  // No sorting of dice array — we use index-based selection throughout.
  // identifyRerollTargets() returns indices sorted by priority (Red > Black > White).
```

**Key decision:** We do NOT sort the `workingResults` array itself. Sorting would invalidate indices used by `calculateMarksmanDecision()` (which returns specific die indices). Instead, `identifyRerollTargets()` returns an array of **indices** sorted by priority.

---

## Step 2 — Process Observation Tokens

Observation tokens are processed FIRST (before Aim tokens) so that Marksman decisions in the Aim loop see the dice state after observation rerolls.

Each Observation token provides **exactly 1 reroll**.

```ts
  for (let obs = 0; obs < attacker.observationTokens; obs++) {
    // Get reroll targets as indices, sorted by priority
    const targetIndices = identifyRerollTargetIndices(workingResults, attacker);

    if (targetIndices.length > 0) {
      // Reroll the highest-priority target (1 reroll per observation token)
      const idx = targetIndices[0];
      workingResults[idx] = {
        color: workingResults[idx].color,
        face: rollAttackDie(workingResults[idx].color),
      };
    } else {
      // No blanks or excess surges — check for aggressive hit rerolls
      const aggressiveHitIndices = findAggressiveHitRerollIndices(workingResults, config);

      if (aggressiveHitIndices.length > 0) {
        const idx = aggressiveHitIndices[0];
        workingResults[idx] = {
          color: workingResults[idx].color,
          face: rollAttackDie(workingResults[idx].color),
        };
      } else if (attacker.rerollStrategy === RerollStrategy.CritFishing) {
        // Crit Fishing: reroll any hit even if it matters
        const hitIdx = workingResults.findIndex(d => d.face === AttackFace.Hit);
        if (hitIdx !== -1) {
          workingResults[hitIdx] = {
            color: workingResults[hitIdx].color,
            face: rollAttackDie(workingResults[hitIdx].color),
          };
        }
      }
      // else: no dice worth rerolling, observation token is wasted
    }
  }
```

**Edge cases:**
- 0 observation tokens → skip this loop entirely
- All dice are crits → observation token is wasted (nothing to reroll)
- Pool has only hits + crits → observation uses aggressive hit reroll or Crit Fishing

---

## Step 3 — Process Aim Tokens (Unified Decision Loop)

Each Aim token goes through a decision process:

```
For each aim token:
  1. If Marksman is active:
     a. Call calculateMarksmanDecision(workingResults, config)
     b. If decision says "save for Marksman" (useRerollInstead === false):
        → Save THIS aim and ALL remaining aims for Marksman
        → Break out of aim loop
     c. If decision says "use reroll instead":
        → Fall through to reroll logic below
  2. Execute rerolls with this aim token:
     a. Identify reroll targets (blanks + excess surges, by index)
     b. Add aggressive hit rerolls if slots remain
     c. Add Crit Fishing hits if strategy selected and slots remain
     d. Reroll up to (2 + PreciseX) selected dice
     e. Increment aimsSpent
```

```ts
  for (let aimIndex = 0; aimIndex < aimsAvailableForRerolls; aimIndex++) {

    // ── Marksman Decision ──
    if (attacker.marksman) {
      const decision = calculateMarksmanDecision(workingResults, config);

      if (!decision.useRerollInstead) {
        // Save this aim and ALL remaining aims for Marksman post-surge conversion
        aimsSavedForMarksman = aimsAvailableForRerolls - aimIndex;
        break; // Exit aim loop
      }
      // else: decision says reroll is better, fall through to reroll below
    }

    // ── Execute Rerolls ──
    const selectedIndices: number[] = [];

    // Phase A: Select blanks and excess surges
    const targetIndices = identifyRerollTargetIndices(workingResults, attacker);
    for (const idx of targetIndices) {
      if (selectedIndices.length >= rerollsPerAim) break;
      selectedIndices.push(idx);
    }

    // Phase B: Fill remaining slots with aggressive hit rerolls
    if (selectedIndices.length < rerollsPerAim) {
      const aggressiveHitIndices = findAggressiveHitRerollIndices(workingResults, config);
      for (const idx of aggressiveHitIndices) {
        if (selectedIndices.length >= rerollsPerAim) break;
        if (!selectedIndices.includes(idx)) {
          selectedIndices.push(idx);
        }
      }
    }

    // Phase C: Crit Fishing — fill remaining slots with ANY hits
    if (attacker.rerollStrategy === RerollStrategy.CritFishing && selectedIndices.length < rerollsPerAim) {
      for (let i = 0; i < workingResults.length; i++) {
        if (selectedIndices.length >= rerollsPerAim) break;
        if (!selectedIndices.includes(i) && workingResults[i].face === AttackFace.Hit) {
          selectedIndices.push(i);
        }
      }
    }

    // Phase D: Execute all selected rerolls
    for (const idx of selectedIndices) {
      workingResults[idx] = {
        color: workingResults[idx].color,
        face: rollAttackDie(workingResults[idx].color),
      };
    }

    aimsSpent++;
  }
```

**Critical detail — "save all remaining":** When Marksman decides to save, we save `aimsAvailableForRerolls - aimIndex` (the current aim plus all remaining non-reserved aims). This is because once Marksman conversion is deemed worthwhile, guaranteed conversions are always better than probabilistic rerolls for subsequent aims too. Note: aims reserved for Lethal X are NOT included in this count — they remain available for Lethal in Step 6.

**Edge cases:**
- 0 aim tokens → skip loop entirely
- All dice are already crits → no reroll targets, aim is wasted (but Marksman might still convert blanks)
- Marksman active but no convertible dice → `calculateMarksmanDecision` returns `useRerollInstead: true`, falls through to reroll
- Precise X = 0 → 2 rerolls per aim (default)
- Precise X = 3 → 5 rerolls per aim

---

## Step 4 — Duelist Attacker Pierce Bonus

```ts
  // Duelist (attacker): spending Aim in a Melee attack grants Pierce +1
  // "in addition to the normal effects of spending Aim tokens"
  // Only requires at least 1 aim to have been spent on rerolls
  if (
    attacker.duelistAttacker &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All) &&
    aimsSpent > 0
  ) {
    pierceBonus = 1;
  }

  return { results: workingResults, aimsSpent, pierceBonus, aimsSavedForMarksman };
}
```

**Note:** Duelist Pierce bonus is always exactly 1, regardless of how many aims were spent. It only requires `aimsSpent > 0`.

---

## Helper: `identifyRerollTargetIndices()`

Returns **indices** (not die objects) sorted by reroll priority.

```ts
/**
 * Identify indices of dice worth rerolling.
 * Returns indices sorted by die color priority: Red > Black > White.
 *
 * Targets:
 * - All blanks
 * - Excess surges (surges beyond available conversions)
 *
 * NOT targets:
 * - Hits (handled separately by aggressive/crit-fishing logic)
 * - Crits (never rerolled)
 * - Surges that will be converted (by chart, tokens, Critical X, Jedi Hunter, Hold the Line)
 */
function identifyRerollTargetIndices(
  results: RolledAttackDie[],
  attacker: AttackerConfig
): number[] {
  const blankIndices: Array<{ idx: number; colorRank: number }> = [];
  const surgeIndices: Array<{ idx: number; colorRank: number }> = [];

  const colorRank: Record<string, number> = {
    [AttackDieColor.Red]: 3,
    [AttackDieColor.Black]: 2,
    [AttackDieColor.White]: 1,
  };

  results.forEach((die, idx) => {
    if (die.face === AttackFace.Blank) {
      blankIndices.push({ idx, colorRank: colorRank[die.color] });
    } else if (die.face === AttackFace.Surge) {
      surgeIndices.push({ idx, colorRank: colorRank[die.color] });
    }
  });

  // Determine how many surges are "excess" (won't be converted)
  const excessSurgeIndices = calculateExcessSurgeIndices(surgeIndices, attacker);

  // Combine blanks + excess surges, sort by color rank descending (Red first)
  const allTargets = [...blankIndices, ...excessSurgeIndices];
  allTargets.sort((a, b) => b.colorRank - a.colorRank);

  return allTargets.map(t => t.idx);
}
```

---

## Helper: `calculateExcessSurgeIndices()`

Determines which surges won't be converted and are therefore reroll candidates.

```ts
/**
 * From all surge dice, determine which are "excess" — they won't be converted
 * by any available conversion source and should be treated as blanks for rerolling.
 *
 * Conversion sources (checked in order):
 * 1. Surge chart (ToHit or ToCrit) → converts ALL surges
 * 2. Jedi Hunter → converts ALL remaining surges to crits
 * 3. Hold the Line (attacker) → converts ALL remaining surges to hits
 * 4. Surge tokens → converts up to N surges to hits
 * 5. Critical X → converts up to X surges to crits
 *
 * If sources 1-3 are active, ALL surges convert → no excess.
 * Otherwise: excess = total surges - (surgeTokens + criticalX)
 *
 * When selecting which surges to KEEP (convert) vs designate as excess:
 * - Keep the LOWEST-value surges (White first) since they have the worst reroll odds
 * - Designate the HIGHEST-value surges (Red first) as excess reroll targets
 */
function calculateExcessSurgeIndices(
  surgeIndices: Array<{ idx: number; colorRank: number }>,
  attacker: AttackerConfig
): Array<{ idx: number; colorRank: number }> {
  if (surgeIndices.length === 0) return [];

  // Check for unlimited conversion sources
  const hasChartConversion =
    attacker.surgeChart === AttackSurgeChart.ToHit ||
    attacker.surgeChart === AttackSurgeChart.ToCrit;
  const hasUnlimitedConversion = attacker.jediHunter || attacker.holdTheLine;

  if (hasChartConversion || hasUnlimitedConversion) {
    // All surges will be converted → none are excess
    return [];
  }

  // Limited conversion: surgeTokens + criticalX
  const totalConversions = attacker.surgeTokens + attacker.criticalX;

  if (totalConversions === 0) {
    // No conversions at all → ALL surges are excess
    return [...surgeIndices];
  }

  if (totalConversions >= surgeIndices.length) {
    // Enough conversions for all surges → none are excess
    return [];
  }

  // Partial conversion: keep lowest-value surges, excess the highest-value
  // Sort ascending by color rank (White=1 first → kept for conversion)
  const sorted = [...surgeIndices].sort((a, b) => a.colorRank - b.colorRank);

  // Keep the first `totalConversions` (lowest value), excess the rest
  const excessSurges = sorted.slice(totalConversions);

  return excessSurges;
}
```

**Example:**
- Pool: Red surge, Black surge, White surge, White surge (4 surges)
- Surge tokens: 1, Critical X: 1 → 2 conversions
- Keep: White surge, White surge (lowest value, will be converted)
- Excess: Red surge, Black surge (highest value, better to reroll)

---

## Helper: `findAggressiveHitRerollIndices()`

Identifies hits that can be rerolled without reducing the defender's effective wound count.

```ts
/**
 * Find hits that are "free" to reroll — removing them doesn't reduce
 * the number of wounds the attack inflicts.
 *
 * A hit is "free" when it would be cancelled by a defender keyword anyway:
 * - Armor X cancels hits (not crits)
 * - Dodge tokens cancel hits (without Outmaneuver, can't cancel crits)
 * - Guardian X absorbs hits
 * - Backup cancels up to 2 hits
 *
 * Algorithm:
 * 1. Calculate baseline wounds with current pool
 * 2. For each hit, simulate removing it (replace with blank)
 * 3. If baseline wounds unchanged → this hit is "free" to reroll
 *
 * Returns indices sorted by color priority (Red > Black > White).
 */
function findAggressiveHitRerollIndices(
  results: RolledAttackDie[],
  config: AttackConfig
): number[] {
  const hitIndices: Array<{ idx: number; colorRank: number }> = [];
  const colorRank: Record<string, number> = {
    [AttackDieColor.Red]: 3,
    [AttackDieColor.Black]: 2,
    [AttackDieColor.White]: 1,
  };

  results.forEach((die, idx) => {
    if (die.face === AttackFace.Hit) {
      hitIndices.push({ idx, colorRank: colorRank[die.color] });
    }
  });

  if (hitIndices.length === 0) return [];

  // Calculate baseline expected wound contribution from current pool
  const baselineWounds = estimateWoundContribution(results, config);

  const freeHits: Array<{ idx: number; colorRank: number }> = [];

  for (const hit of hitIndices) {
    // Simulate removing this hit
    const testResults = results.map((d, i) =>
      i === hit.idx ? { ...d, face: AttackFace.Blank } : d
    );
    const testWounds = estimateWoundContribution(testResults, config);

    if (testWounds >= baselineWounds) {
      // Removing this hit didn't reduce wounds → it's being cancelled
      freeHits.push(hit);
    }
  }

  // Sort by color priority: Red > Black > White (best reroll odds first)
  freeHits.sort((a, b) => b.colorRank - a.colorRank);
  return freeHits.map(h => h.idx);
}
```

---

## Helper: `estimateWoundContribution()`

Estimates how many wounds the current attack pool will inflict, accounting for defender keywords that cancel results. This is a fast approximation used for reroll decisions — it doesn't need to be exact (it doesn't roll defense dice).

```ts
/**
 * Estimate the number of attack results that will "survive" to cause wounds.
 * This simulates Steps 5-6 deterministically (no dice rolls for defense).
 *
 * Used by: findAggressiveHitRerollIndices(), calculateMarksmanDecision()
 *
 * The estimate counts hits and crits that survive:
 * - Impact X conversion (hits→crits)
 * - Ram X conversion (any→crits)
 * - Armor X cancellation (cancels hits)
 * - Dodge cancellation (cancels hits, or hits+crits with Outmaneuver)
 * - Cover cancellation (estimated average, not rolled)
 * - Guardian X absorption (absorbs hits)
 * - Backup cancellation (cancels up to 2 hits)
 * - Shielded X cancellation (cancels crits first, then hits)
 */
function estimateWoundContribution(
  results: RolledAttackDie[],
  config: AttackConfig
): number {
  const { attacker, defender } = config;

  let hits = results.filter(r => r.face === AttackFace.Hit).length;
  let crits = results.filter(r => r.face === AttackFace.Critical).length;
  let surges = results.filter(r => r.face === AttackFace.Surge).length;

  // Estimate surge conversion (add to hits/crits)
  // Priority: Critical X → Jedi Hunter → Surge Chart → Hold the Line → Surge Tokens
  // 1. Critical X (surge → crit, up to X)
  if (attacker.criticalX > 0 && surges > 0) {
    const critConv = Math.min(attacker.criticalX, surges);
    crits += critConv; surges -= critConv;
  }
  // 2. Jedi Hunter (all remaining → crit)
  if (attacker.jediHunter && surges > 0) {
    crits += surges; surges = 0;
  }
  // 3. Surge Chart
  if (surges > 0) {
    if (attacker.surgeChart === AttackSurgeChart.ToCrit) {
      crits += surges; surges = 0;
    } else if (attacker.surgeChart === AttackSurgeChart.ToHit) {
      hits += surges; surges = 0;
    }
  }
  // 4. Hold the Line (Melee/All only)
  if (surges > 0 && attacker.holdTheLine && (config.attackType === AttackType.Melee || config.attackType === AttackType.All)) {
    hits += surges; surges = 0;
  }
  // 5. Surge Tokens (up to N → hit)
  if (surges > 0 && attacker.surgeTokens > 0) {
    const hitConv = Math.min(attacker.surgeTokens, surges);
    hits += hitConv; surges -= hitConv;
  }

  // Ram X: blanks→crits, then hits→crits
  if (attacker.ramX > 0) {
    const blanks = results.filter(r => r.face === AttackFace.Blank).length + surges; // remaining surges = blanks
    let ramRemaining = attacker.ramX;
    const blanksConverted = Math.min(blanks, ramRemaining);
    crits += blanksConverted; ramRemaining -= blanksConverted;
    const hitsConverted = Math.min(hits, ramRemaining);
    hits -= hitsConverted; crits += hitsConverted;
  }

  // Impact X: hits→crits (only meaningful if defender has Armor)
  if (attacker.impactX > 0 && defender.armorX > 0) {
    const impactConv = Math.min(hits, attacker.impactX);
    hits -= impactConv;
    crits += impactConv;
  }

  // Armor X: cancel hits
  if (defender.armorX > 0) {
    hits = Math.max(0, hits - defender.armorX);
  }

  // Cover: estimate average cancellation (don't actually roll)
  // Light cover: ~1/6 chance per hit to cancel (white die block rate)
  // Heavy cover: ~2/6 chance per hit to cancel (block + surge)
  if (!attacker.blast || defender.immuneBlast) {
    let coverValue = 0;
    if (defender.coverType === CoverType.Light) coverValue = 1;
    if (defender.coverType === CoverType.Heavy) coverValue = 2;
    if (defender.suppressed) coverValue += 1;
    coverValue += defender.coverX + defender.smokeTokens;
    coverValue = Math.min(coverValue, 2);
    coverValue = Math.max(0, coverValue - attacker.sharpshooterX);

    if (coverValue > 0 && hits > 0) {
      // Estimate: white die has 1/6 block (light) or 2/6 block+surge (heavy)
      const cancelRate = coverValue >= 2 ? 2.0 / 6.0 : 1.0 / 6.0;
      const estimatedCancels = Math.round(hits * cancelRate);
      hits = Math.max(0, hits - estimatedCancels);
    }
  }

  // Dodge cancellation
  if (!attacker.highVelocity && defender.dodgeTokens > 0) {
    let dodges = defender.dodgeTokens;
    const hitDodged = Math.min(hits, dodges);
    hits -= hitDodged; dodges -= hitDodged;
    if (defender.outmaneuver && dodges > 0) {
      const critDodged = Math.min(crits, dodges);
      crits -= critDodged;
    }
  }

  // Guardian X: absorb hits (Ranged only)
  if (defender.guardianX > 0 && (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)) {
    const absorbed = Math.min(hits, defender.guardianX);
    hits -= absorbed;
    // Guardian hits still cause wounds (just to a different unit), so we DON'T subtract them from total
    // For the purpose of "will this hit cause a wound", guardian-absorbed hits DO cause wounds
    hits += absorbed; // Add back — they still count as wounds (to guardian)
  }

  // Backup: cancel up to 2 hits (Ranged only)
  if (defender.backup && (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)) {
    hits = Math.max(0, hits - 2);
  }

  // Shielded X: cancel crits first, then hits (Ranged only)
  if (defender.shieldedX > 0 && (config.attackType === AttackType.Ranged || config.attackType === AttackType.All)) {
    let shield = defender.shieldedX;
    const critCancel = Math.min(crits, shield);
    crits -= critCancel; shield -= critCancel;
    const hitCancel = Math.min(hits, shield);
    hits -= hitCancel;
  }

  return Math.max(0, hits + crits);
}
```

**Important:** This is an estimate, not exact. It doesn't roll defense dice. For aggressive hit reroll decisions, we only need to know if removing a hit changes the wound count — the estimate is sufficient for this comparison.

---

## Marksman Decision Integration

The Marksman decision in the Aim loop uses `calculateMarksmanDecision()` which is detailed in [phase2b-surge-marksman-jarkai.md](phase2b-surge-marksman-jarkai.md). The key interaction point:

- During Step 4c, `calculateMarksmanDecision()` is called to decide **save vs reroll**
- The function returns `useRerollInstead: true` → reroll with this aim
- The function returns `useRerollInstead: false` → save this + all remaining aims
- The actual Marksman conversion happens later in Step 4d.5 using the saved aims

**Why save ALL remaining once we decide to save?**
Once Marksman conversion is determined to be better than rerolling for aim N, it will also be better for aims N+1, N+2, etc. This is because:
1. Each reroll potentially improves the pool, making Marksman less valuable
2. But we've already determined the pool is "good enough" that conversion beats reroll
3. Subsequent aims would see an even better pool (post-conversion), making reroll even less valuable

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| 0 Observation + 0 Aim tokens | Return input unchanged, aimsSpent=0 |
| Observation tokens but all dice are crits | Observation wasted, no reroll occurs |
| Aim tokens but all dice are crits | No reroll targets, aim wasted (unless Marksman can convert) |
| Marksman + 0 convertible dice | `calculateMarksmanDecision` returns `useRerollInstead: true` |
| Marksman saves all aims | aimsSpent=0, aimsSavedForMarksman=aimTokens |
| Marksman saves after 2 rerolls | aimsSpent=2, aimsSavedForMarksman=remaining |
| Precise 0 + Aim | 2 rerolls per aim |
| Precise 3 + Aim | 5 rerolls per aim |
| Duelist + 0 aims spent | pierceBonus=0 (requires at least 1 reroll) |
| Duelist + Ranged attack | pierceBonus=0 (Melee only) |
| Duelist + Melee + 1 aim spent | pierceBonus=1 |
| Crit Fishing + all blanks | Blanks rerolled first, no hits to fish |
| Crit Fishing + all hits | All hits rerolled (up to rerollsPerAim) |
| Pool is empty (0 dice) | Return empty array, no processing |
| Surge chart = None, 0 tokens, 3 surges | All 3 surges are excess → reroll targets |
| Surge chart = ToHit, 3 surges | 0 surges are excess → not reroll targets |
| 1 surge token + 3 surges + Critical 1 | 2 conversions, 1 excess surge is reroll target |
| Observation reroll changes blank→surge | Next aim's `identifyRerollTargetIndices` reflects new pool state |
| Lethal 2 + 3 aims + pool has 4 results | Reserve 2 aims for Lethal, 1 aim for rerolls/Marksman |
| Lethal 2 + 1 aim + pool has 4 results | Reserve 1 aim for Lethal, 0 aims for rerolls (aimTokens < lethalX) |
| Lethal 2 + 3 aims + Pierce 5 + 2 hits | Pierce already covers dice → don't reserve, all 3 aims for rerolls |
| Lethal 3 + 3 aims + Marksman saves 1 | aimsAvailableForRerolls=0 (all reserved), Marksman N/A, 3 leftover for Lethal |

---

## Unit Tests

### Test: Observation tokens reroll blanks first
```ts
it('observation tokens reroll blanks before surges', () => {
  // Seed RNG or mock rollAttackDie to return deterministic values
  const results: RolledAttackDie[] = [
    { color: AttackDieColor.Red, face: AttackFace.Blank },
    { color: AttackDieColor.Red, face: AttackFace.Hit },
    { color: AttackDieColor.Red, face: AttackFace.Critical },
  ];
  const config = makeConfig({
    attacker: { observationTokens: 1, aimTokens: 0 },
  });
  // The blank at index 0 should be rerolled
  // Assert that index 0's face changed (probabilistically)
});
```

### Test: Aim token rerolls correct count with Precise
```ts
it('rerolls 2 + PreciseX dice per aim token', () => {
  const results = Array(10).fill(null).map(() => ({
    color: AttackDieColor.White,
    face: AttackFace.Blank,
  }));
  const config = makeConfig({
    attacker: { aimTokens: 1, preciseX: 1 }, // 3 rerolls
  });
  const { aimsSpent } = rerollAttackDice(results, config);
  expect(aimsSpent).toBe(1);
  // Exactly 3 dice should have been rerolled
});
```

### Test: Excess surges are reroll targets
```ts
it('rerolls excess surges when conversions are limited', () => {
  const results: RolledAttackDie[] = [
    { color: AttackDieColor.Red, face: AttackFace.Surge },
    { color: AttackDieColor.Black, face: AttackFace.Surge },
    { color: AttackDieColor.White, face: AttackFace.Surge },
  ];
  const config = makeConfig({
    attacker: { surgeChart: AttackSurgeChart.None, surgeTokens: 1, criticalX: 0 },
  });
  // 1 conversion for 3 surges → 2 excess
  const targets = identifyRerollTargetIndices(results, config.attacker);
  expect(targets).toHaveLength(2);
  // Red and Black surges should be excess (highest value reroll targets)
  expect(results[targets[0]].color).toBe(AttackDieColor.Red);
  expect(results[targets[1]].color).toBe(AttackDieColor.Black);
});
```

### Test: Duelist only grants Pierce for Melee
```ts
it('Duelist attacker only grants Pierce +1 for Melee attacks', () => {
  const results = [{ color: AttackDieColor.Red, face: AttackFace.Blank }];

  // Melee → Pierce bonus
  const meleeConfig = makeConfig({
    attacker: { duelistAttacker: true, aimTokens: 1 },
    attackType: AttackType.Melee,
  });
  const meleeResult = rerollAttackDice(results, meleeConfig);
  expect(meleeResult.pierceBonus).toBe(1);

  // Ranged → no Pierce bonus
  const rangedConfig = makeConfig({
    attacker: { duelistAttacker: true, aimTokens: 1 },
    attackType: AttackType.Ranged,
  });
  const rangedResult = rerollAttackDice(results, rangedConfig);
  expect(rangedResult.pierceBonus).toBe(0);
});
```

### Test: Marksman saves remaining aims
```ts
it('saves all remaining aims when Marksman decides to convert', () => {
  const results: RolledAttackDie[] = [
    { color: AttackDieColor.White, face: AttackFace.Blank },
    { color: AttackDieColor.Red, face: AttackFace.Hit },
  ];
  const config = makeConfig({
    attacker: {
      aimTokens: 3,
      marksman: true,
      marksmanStrategy: MarksmanStrategy.Deterministic,
    },
    defender: { armorX: 2 }, // Makes conversion valuable
  });
  const { aimsSpent, aimsSavedForMarksman } = rerollAttackDice(results, config);
  // If Marksman decided to save on first aim: aimsSpent=0, saved=3
  // If decided after 1 reroll: aimsSpent=1, saved=2
  // Note: sum equals aimsAvailableForRerolls (= aimTokens when lethalX = 0)
  expect(aimsSpent + aimsSavedForMarksman).toBe(3);
});
```

### Test: Aggressive hit rerolls
```ts
it('rerolls hits that would be cancelled by Armor', () => {
  const results: RolledAttackDie[] = [
    { color: AttackDieColor.Red, face: AttackFace.Hit },
    { color: AttackDieColor.Red, face: AttackFace.Hit },
    { color: AttackDieColor.Red, face: AttackFace.Critical },
  ];
  const config = makeConfig({
    attacker: { aimTokens: 1, impactX: 0 },
    defender: { armorX: 3 }, // All 2 hits will be cancelled
  });
  // Both hits are "free" to reroll since Armor cancels them
  const aggressiveIndices = findAggressiveHitRerollIndices(results, config);
  expect(aggressiveIndices.length).toBe(2);
});
```

---

## Integration Notes

- `rerollAttackDice()` returns `aimsSavedForMarksman` which is consumed by `applyMarksman()` in Step 4d.5
- `aimsSpent` is consumed by `modifyAttackDice()` in Step 6 for Lethal X calculation (leftover aims = aimTokens - aimsSpent - aimsSavedForMarksman)
- `pierceBonus` from Duelist is consumed by `rollDefenseDice()` in Step 7 (for Impervious) and `compareResults()` in Step 9
- The `workingResults` array preserves die color information (`RolledAttackDie[]`) throughout
