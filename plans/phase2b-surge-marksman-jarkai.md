# Phase 2B — Surge Conversion, Marksman & Jar'Kai (Steps 4d, 4d.5, 4d.6) — Detailed Implementation Plan

## Goal

Implement the full surge conversion pipeline and post-surge token spending for Marksman and Jar'Kai Mastery. These three steps execute sequentially after rerolls and form the final attack dice modification before Dodge/Cover.

**File:** `src/engine/attackSequence.ts`

**Depends on:** `RolledAttackDie`, `calculateMarksmanDecision()`, `rerollAttackDice()` (provides `aimsSavedForMarksman`)

---

## Data Flow

```
Step 4d:   RolledAttackDie[] → convertAttackSurges()   → RolledAttackDie[] (surges resolved)
Step 4d.5: RolledAttackDie[] → applyMarksman()          → RolledAttackDie[] (blanks/hits converted)
Step 4d.6: RolledAttackDie[] → applyJarKai()            → RolledAttackDie[] (blanks/hits converted)
```

---

## Step 4d — Convert Attack Surges

### Conversion Priority Order

Surges are converted in a strict priority order. Each source consumes surges and reduces the remaining count. Once a surge is converted, it cannot be converted again.

```
Priority 1: Critical X (converts up to X surges → crits)
  - Crits bypass Armor, Dodge (without Outmaneuver), and Cover
  - Maximizes value by converting to crits before other sources convert to hits

Priority 2: Jedi Hunter (converts ALL remaining surges → crits)
  - "gain surge:crit" keyword — converts all remaining surges to crits
  - Applied after Critical X to handle any remaining surges

Priority 3: Surge Chart (converts ALL remaining surges)
  - ToHit:  surge → hit
  - ToCrit: surge → crit
  - None:   no conversion (surges remain as-is, fall through to lower priorities)

Priority 4: Hold the Line — Attacker (converts ALL remaining surges → hits)
  - Active in Melee and All attack types
  - "While a unit with the Hold the Line keyword is engaged, it gains surge:hit"

Priority 5: Surge Tokens (converts up to N remaining surges → hits)
  - Each token converts 1 surge to hit
  - Applied last to preserve tokens when keywords handle conversion
```

### Implementation

```ts
function convertAttackSurges(
  results: RolledAttackDie[],
  config: AttackConfig
): RolledAttackDie[] {
  const { attacker } = config;
  let workingResults = results.map(d => ({ ...d })); // Clone

  // Track remaining surge count
  let surgeCount = workingResults.filter(d => d.face === AttackFace.Surge).length;
  if (surgeCount === 0) return workingResults;

  // ── Priority 1: Critical X (surge → crit) ──
  // Crits bypass Armor, Dodge (without Outmaneuver), and Cover.
  // Applied first to maximize crit conversions before other sources convert to hits.
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
    if (surgeCount === 0) return workingResults;
  }

  // ── Priority 2: Jedi Hunter (all remaining surges → crit) ──
  if (attacker.jediHunter && surgeCount > 0) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Critical } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── Priority 3: Surge Chart ──
  if (attacker.surgeChart === AttackSurgeChart.ToHit) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Hit } : d
    );
    return workingResults; // All remaining surges consumed
  }
  if (attacker.surgeChart === AttackSurgeChart.ToCrit) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Critical } : d
    );
    return workingResults; // All remaining surges consumed
  }
  // Chart is None — surges remain, fall through to keyword/token conversions

  // ── Priority 4: Hold the Line — Attacker (all remaining surges → hit) ──
  if (
    attacker.holdTheLine &&
    surgeCount > 0 &&
    (config.attackType === AttackType.Melee || config.attackType === AttackType.All)
  ) {
    workingResults = workingResults.map(d =>
      d.face === AttackFace.Surge ? { ...d, face: AttackFace.Hit } : d
    );
    return workingResults; // All remaining surges consumed
  }

  // ── Priority 5: Surge Tokens (surge → hit) ──
  // Applied last to preserve tokens when keywords handle conversion.
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

  // Any remaining surges stay as surge faces (treated as blanks for wound counting)
  return workingResults;
}
```

### Edge Cases

| Scenario | Result |
|----------|--------|
| Critical X 2 + 5 surges + Surge chart ToHit | 2→crits (CritX first), 3→hits (chart handles rest) |
| Surge chart None + 0 tokens + 0 Critical X | All surges remain (blanks) |
| Critical X 1 + Surge chart None + 2 tokens + 5 surges | 1→crit, 2→hits (tokens last), 2 remain as surges |
| Jedi Hunter + Critical X 2 + 5 surges | 2→crits (CritX), 3→crits (Jedi Hunter) = 5 crits |
| Hold the Line + Ranged attack | Hold the Line does NOT activate (Melee/All only) |
| Hold the Line + Surge tokens 2 + 3 surges (Melee) | 3→hits (HTL converts all before tokens are used) |
| 0 surges in pool | Return unchanged (early exit) |
| Surge chart ToCrit + Critical X 1 + 3 surges | 1→crit (CritX), 2→crits (chart) = 3 crits |

### Interaction: Priority maximizes crit conversions
Critical X and Jedi Hunter are applied BEFORE the surge chart to maximize the number of surges converted to crits. If the surge chart is ToCrit, this is redundant (chart would also produce crits). But if the chart is ToHit, applying Critical X first ensures those surges become crits instead of merely hits. Surge tokens are applied last since they only convert to hits and consume a limited resource.

---

## Step 4d.5 — Apply Marksman (Post-Surge Conversion)

### Overview

Marksman spends Aim tokens **saved from Step 4c** to convert die results on the post-surge pool. At this point, surges have already been converted to hits/crits/blanks, so Marksman operates on a pool containing only `Hit`, `Critical`, and `Blank` faces.

### Conversion Table

| Cost | Conversion |
|------|-----------|
| 1 Aim | blank → hit |
| 1 Aim | hit → crit |
| 2 Aims | blank → crit (blank→hit + hit→crit in sequence) |

The 2-aim "blank→crit" path is handled naturally by the iterative loop: first aim converts blank→hit, second aim sees the new hit and converts hit→crit.

### Algorithm

```ts
function applyMarksman(
  results: RolledAttackDie[],
  config: AttackConfig,
  aimsSavedForMarksman: number
): RolledAttackDie[] {
  // Guard: no saved aims or no Marksman keyword
  if (aimsSavedForMarksman <= 0 || !config.attacker.marksman) {
    return results;
  }

  let workingResults = results.map(d => ({ ...d })); // Clone
  let aimsRemaining = aimsSavedForMarksman;

  // Iterative conversion loop:
  // Each iteration spends 1 aim to convert 1 die (blank→hit or hit→crit).
  // The loop naturally handles blank→crit by taking 2 iterations.
  while (aimsRemaining > 0) {
    // Ask calculateMarksmanDecision what to convert, given current pool state
    const decision = calculateMarksmanDecision(workingResults, config);

    if (decision.useRerollInstead) {
      // No useful conversion available — stop spending aims.
      // We can't reroll at this point (past Step 4c), so remaining aims are lost.
      break;
    }

    if (decision.convertBlankIndex !== null) {
      // Convert blank → hit
      workingResults[decision.convertBlankIndex] = {
        ...workingResults[decision.convertBlankIndex],
        face: AttackFace.Hit,
      };
      aimsRemaining--;
    } else if (decision.convertHitIndex !== null) {
      // Convert hit → crit
      workingResults[decision.convertHitIndex] = {
        ...workingResults[decision.convertHitIndex],
        face: AttackFace.Critical,
      };
      aimsRemaining--;
    } else {
      // No convertible dice (all crits?) — stop
      break;
    }
  }

  return workingResults;
}
```

### `calculateMarksmanDecision()` — Full Detail

This function is the core decision engine for Marksman. It evaluates the current pool state and returns a decision for ONE aim token.

```ts
function calculateMarksmanDecision(
  results: RolledAttackDie[],
  config: AttackConfig
): MarksmanDecision {
  const { attacker, defender } = config;

  // ── Find convertible dice by index ──
  const blankIndices: Array<{ index: number; color: AttackDieColor }> = [];
  const hitIndices: Array<{ index: number; color: AttackDieColor }> = [];

  results.forEach((die, index) => {
    if (die.face === AttackFace.Blank || die.face === AttackFace.Surge) {
      // Post-surge: remaining surges are effectively blanks
      blankIndices.push({ index, color: die.color });
    } else if (die.face === AttackFace.Hit) {
      hitIndices.push({ index, color: die.color });
    }
  });

  // Nothing to convert → use reroll (or waste aim at this stage)
  if (blankIndices.length === 0 && hitIndices.length === 0) {
    return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
  }

  // ── Evaluate conversion value ──
  const blankToHitHelps = blankIndices.length > 0 && willBlankConversionHelp(results, attacker, defender);
  const hitToCritHelps = hitIndices.length > 0 && willHitConversionHelp(results, attacker, defender);

  // Neither conversion helps → waste
  if (!blankToHitHelps && !hitToCritHelps) {
    return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
  }

  // ── Sort by die color: White first (lowest reroll value sacrificed) ──
  const colorValue: Record<string, number> = {
    [AttackDieColor.White]: 1,
    [AttackDieColor.Black]: 2,
    [AttackDieColor.Red]: 3,
  };
  blankIndices.sort((a, b) => colorValue[a.color] - colorValue[b.color]);
  hitIndices.sort((a, b) => colorValue[a.color] - colorValue[b.color]);

  // ── Deterministic Mode ──
  if (attacker.marksmanStrategy === MarksmanStrategy.Deterministic) {
    // Priority: hit→crit is more impactful when it bypasses keywords
    if (hitToCritHelps && hitIndices.length > 0) {
      return { convertBlankIndex: null, convertHitIndex: hitIndices[0].index, useRerollInstead: false };
    }
    if (blankToHitHelps && blankIndices.length > 0) {
      return { convertBlankIndex: blankIndices[0].index, convertHitIndex: null, useRerollInstead: false };
    }
  }

  // ── Averages Mode ──
  // Compare conversion EV to reroll EV
  const rerollEV = calculateRerollEV(results, attacker);

  // Blank→Hit EV
  let blankToHitEV = 0;
  if (blankToHitHelps && blankIndices.length > 0) {
    blankToHitEV = 1.0; // Guaranteed +1 hit

    // Reduce if Armor will cancel the new hit
    if (defender.armorX > 0) {
      const currentHits = results.filter(r => r.face === AttackFace.Hit).length + 1;
      const currentCrits = results.filter(r => r.face === AttackFace.Critical).length;
      const hitsAfterArmor = Math.max(0, currentHits - Math.max(0, defender.armorX - attacker.impactX));
      const hitsBeforeConversion = results.filter(r => r.face === AttackFace.Hit).length;
      const hitsBeforeAfterArmor = Math.max(0, hitsBeforeConversion - Math.max(0, defender.armorX - attacker.impactX));
      if (hitsAfterArmor <= hitsBeforeAfterArmor) {
        blankToHitEV *= 0.3; // New hit gets cancelled by Armor
      }
    }
  }

  // Hit→Crit EV
  let hitToCritEV = 0;
  if (hitToCritHelps && hitIndices.length > 0) {
    hitToCritEV = 1.0; // Guaranteed upgrade

    // Boost for bypassing Armor
    if (defender.armorX > 0) {
      const currentHits = results.filter(r => r.face === AttackFace.Hit).length;
      if (currentHits > 0 && defender.armorX > 0) {
        hitToCritEV *= 2.0; // Crits bypass Armor
      }
    }

    // Boost for bypassing Dodge (crits can't be Dodged without Outmaneuver)
    if (defender.dodgeTokens > 0 && !defender.outmaneuver && !attacker.highVelocity) {
      hitToCritEV *= 1.5;
    }

    // Reduce if Impact X already handles hit→crit conversion at Step 6
    if (attacker.impactX > 0 && defender.armorX > 0) {
      const currentHits = results.filter(r => r.face === AttackFace.Hit).length;
      if (attacker.impactX >= currentHits) {
        // Impact already converts all hits — Marksman hit→crit is redundant
        hitToCritEV *= 0.2;
      }
    }
  }

  const bestConversionEV = Math.max(blankToHitEV, hitToCritEV);

  // If reroll beats conversion, use reroll
  if (rerollEV > bestConversionEV) {
    return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
  }

  // Use the better conversion
  if (hitToCritEV >= blankToHitEV && hitIndices.length > 0) {
    return { convertBlankIndex: null, convertHitIndex: hitIndices[0].index, useRerollInstead: false };
  }
  if (blankIndices.length > 0) {
    return { convertBlankIndex: blankIndices[0].index, convertHitIndex: null, useRerollInstead: false };
  }

  return { convertBlankIndex: null, convertHitIndex: null, useRerollInstead: true };
}
```

### Helper: `willBlankConversionHelp()`

```ts
/**
 * Will converting blank→hit actually contribute to wounds?
 * Returns false if defender keywords would cancel the new hit anyway.
 */
function willBlankConversionHelp(
  results: RolledAttackDie[],
  attacker: AttackerConfig,
  defender: DefenderConfig
): boolean {
  const currentHits = results.filter(r => r.face === AttackFace.Hit).length;
  const currentCrits = results.filter(r => r.face === AttackFace.Critical).length;

  // Check Armor: if all current hits + new hit would be cancelled
  if (defender.armorX > 0) {
    const effectiveImpact = attacker.impactX;
    // After Impact: min(hits, impactX) hits become crits
    const hitsAfterImpact = Math.max(0, (currentHits + 1) - effectiveImpact);
    const critsAfterImpact = currentCrits + Math.min(currentHits + 1, effectiveImpact);
    // Armor cancels remaining hits
    const hitsSurvivingArmor = Math.max(0, hitsAfterImpact - defender.armorX);

    // Compare with baseline (without conversion)
    const baseHitsAfterImpact = Math.max(0, currentHits - effectiveImpact);
    const baseHitsSurvivingArmor = Math.max(0, baseHitsAfterImpact - defender.armorX);

    if (hitsSurvivingArmor <= baseHitsSurvivingArmor) {
      return false; // New hit doesn't survive Armor
    }
  }

  return true; // New hit contributes to wounds
}
```

### Helper: `willHitConversionHelp()`

```ts
/**
 * Will converting hit→crit provide benefit beyond leaving it as a hit?
 * Returns true when crits bypass defender keywords that hits cannot.
 */
function willHitConversionHelp(
  results: RolledAttackDie[],
  attacker: AttackerConfig,
  defender: DefenderConfig
): boolean {
  // Armor: crits bypass Armor entirely
  if (defender.armorX > 0) {
    const currentHits = results.filter(r => r.face === AttackFace.Hit).length;
    // Only helpful if there are hits being cancelled by Armor
    // (after Impact conversion)
    const hitsAfterImpact = Math.max(0, currentHits - attacker.impactX);
    if (hitsAfterImpact > 0 && defender.armorX > 0) {
      return true; // Converting a hit to crit saves it from Armor
    }
  }

  // Dodge: crits can't be Dodged (without Outmaneuver)
  if (defender.dodgeTokens > 0 && !defender.outmaneuver && !attacker.highVelocity) {
    return true;
  }

  // Cover: crits bypass cover
  if (defender.coverType !== CoverType.None) {
    // Check if cover would actually apply (Blast, etc.)
    if (!attacker.blast || defender.immuneBlast) {
      return true;
    }
  }

  // No keyword benefit from hit→crit
  return false;
}
```

### Helper: `calculateRerollEV()`

```ts
/**
 * Calculate expected value improvement from rerolling the best available target.
 * Returns a value between 0 and 1 representing the probability of getting
 * a useful result from one reroll.
 *
 * Die face distributions:
 *   White: 5 blank, 1 hit, 1 crit, 1 surge → 1-3 favorable / 8
 *   Black: 3 blank, 3 hit, 1 crit, 1 surge → 3-5 favorable / 8
 *   Red:   1 blank, 5 hit, 1 crit, 1 surge → 5-7 favorable / 8
 *
 * "Favorable" includes hits, crits, and surges (if surge will be converted).
 */
function calculateRerollEV(
  results: RolledAttackDie[],
  attacker: AttackerConfig
): number {
  // We need a target die to evaluate. Use the best blank/surge target.
  const targetIndices = identifyRerollTargetIndices(results, attacker);
  if (targetIndices.length === 0) return 0;

  const targetDie = results[targetIndices[0]];

  // Count favorable faces for this die color
  const hitFaces: Record<string, number> = {
    [AttackDieColor.White]: 1,
    [AttackDieColor.Black]: 3,
    [AttackDieColor.Red]: 5,
  };
  const critFaces = 1; // Same for all colors
  const surgeFaces = 1; // Same for all colors

  let favorable = hitFaces[targetDie.color] + critFaces;

  // Include surge as favorable if it will be converted
  const hasSurgeConversion =
    attacker.surgeChart === AttackSurgeChart.ToHit ||
    attacker.surgeChart === AttackSurgeChart.ToCrit;
  const hasUnlimitedConversion = attacker.jediHunter || attacker.holdTheLine;
  const currentSurges = results.filter(d => d.face === AttackFace.Surge).length;
  const limitedConversions = attacker.surgeTokens + attacker.criticalX;

  if (hasSurgeConversion || hasUnlimitedConversion || limitedConversions > currentSurges) {
    favorable += surgeFaces;
  }

  return favorable / 8.0;
}
```

---

## Step 4d.6 — Apply Jar'Kai Mastery (Post-Surge Conversion)

### Overview

Jar'Kai Mastery is mechanically identical to Marksman but uses **Dodge tokens** instead of Aim tokens. It activates only for **Melee attacks**.

### Key Differences from Marksman

| Aspect | Marksman | Jar'Kai Mastery |
|--------|----------|-----------------|
| Token type | Aim tokens (saved from Step 4c) | Attacker's Dodge tokens |
| Strategy choice | Deterministic / Averages | None (always convert) |
| Save-vs-reroll decision | Yes (complex) | No (Dodge tokens have no reroll use) |
| Attack type restriction | None (all types) | Melee only |
| Conversion table | blank→hit, hit→crit, 2→blank→crit | Same |
| Decision function | `calculateMarksmanDecision()` | Same function, reused |

### Implementation

```ts
/**
 * Step 4d.6 — Apply Jar'Kai Mastery
 *
 * Spend attacker's Dodge tokens to convert die results:
 *   - blank → hit (1 Dodge)
 *   - hit → crit (1 Dodge)
 *   - blank → crit (2 Dodges, via iterative loop)
 *
 * Only active when:
 *   - attacker.jarKaiMastery === true
 *   - attackType is Melee (or All)
 *   - attacker.dodgeTokensAttacker > 0
 *
 * Uses calculateMarksmanDecision() for optimal conversion decisions.
 * No strategy choice — always converts when beneficial (equivalent to Deterministic).
 */
function applyJarKai(
  results: RolledAttackDie[],
  config: AttackConfig
): RolledAttackDie[] {
  const { attacker } = config;

  // Guard conditions
  if (!attacker.jarKaiMastery) return results;
  if (config.attackType !== AttackType.Melee && config.attackType !== AttackType.All) return results;
  if (attacker.dodgeTokensAttacker <= 0) return results;

  let workingResults = results.map(d => ({ ...d })); // Clone
  let dodgeRemaining = attacker.dodgeTokensAttacker;

  // Override strategy to Deterministic for the decision function.
  // Jar'Kai always converts (no save-vs-reroll decision needed).
  const jarKaiConfig: AttackConfig = {
    ...config,
    attacker: {
      ...config.attacker,
      marksmanStrategy: MarksmanStrategy.Deterministic,
    },
  };

  while (dodgeRemaining > 0) {
    const decision = calculateMarksmanDecision(workingResults, jarKaiConfig);

    if (decision.useRerollInstead) {
      // No useful conversion available — stop spending Dodge tokens
      break;
    }

    if (decision.convertBlankIndex !== null) {
      workingResults[decision.convertBlankIndex] = {
        ...workingResults[decision.convertBlankIndex],
        face: AttackFace.Hit,
      };
      dodgeRemaining--;
    } else if (decision.convertHitIndex !== null) {
      workingResults[decision.convertHitIndex] = {
        ...workingResults[decision.convertHitIndex],
        face: AttackFace.Critical,
      };
      dodgeRemaining--;
    } else {
      break; // No convertible dice
    }
  }

  return workingResults;
}
```

### Edge Cases

| Scenario | Result |
|----------|--------|
| jarKaiMastery=false | Return unchanged |
| Melee attack + 2 Dodge + [blank, hit, crit] | blank→hit (1 Dodge), hit→crit (1 Dodge) |
| Ranged attack + jarKaiMastery | Return unchanged (Melee only) |
| Overrun attack + jarKaiMastery | Return unchanged (Melee only) |
| 0 Dodge tokens | Return unchanged |
| All crits in pool | Decision returns useRerollInstead, no conversion |
| AttackType.All + jarKaiMastery | Activates (All includes Melee) |
| 1 Dodge + [blank, blank] | Converts 1 blank→hit, second blank untouched |

### Note on Dodge Token Consumption

Jar'Kai Mastery consumes the **attacker's** Dodge tokens (`dodgeTokensAttacker`), NOT the defender's Dodge tokens. These are separate token pools:
- `attacker.dodgeTokensAttacker` — used by Jar'Kai Mastery
- `defender.dodgeTokens` — used by the defender for Dodge/Block in Step 5

---

## Unit Tests

### Surge Conversion Tests

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
    expect(converted.filter(d => d.face === AttackFace.Hit)).toHaveLength(3);
    expect(converted.filter(d => d.face === AttackFace.Surge)).toHaveLength(0);
  });

  it('Critical X converts before surge tokens', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
    ];
    const config = makeConfig({
      attacker: { surgeChart: AttackSurgeChart.None, surgeTokens: 1, criticalX: 1 },
    });
    const converted = convertAttackSurges(results, config);
    // Critical X converts 1 to crit (Priority 1), then tokens convert 1 to hit (Priority 5)
    expect(converted.filter(d => d.face === AttackFace.Critical)).toHaveLength(1);
    expect(converted.filter(d => d.face === AttackFace.Hit)).toHaveLength(1);
    expect(converted.filter(d => d.face === AttackFace.Surge)).toHaveLength(1);
  });

  it('Jedi Hunter converts remaining surges after tokens', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
    ];
    const config = makeConfig({
      attacker: { surgeChart: AttackSurgeChart.None, surgeTokens: 0, criticalX: 0, jediHunter: true },
    });
    const converted = convertAttackSurges(results, config);
    expect(converted.filter(d => d.face === AttackFace.Critical)).toHaveLength(2);
  });

  it('Hold the Line only activates for Melee', () => {
    const results = [{ color: AttackDieColor.Red, face: AttackFace.Surge }];

    // Melee: converts
    const meleeConfig = makeConfig({
      attacker: { surgeChart: AttackSurgeChart.None, holdTheLine: true },
      attackType: AttackType.Melee,
    });
    expect(convertAttackSurges(results, meleeConfig)[0].face).toBe(AttackFace.Hit);

    // Ranged: does NOT convert
    const rangedConfig = makeConfig({
      attacker: { surgeChart: AttackSurgeChart.None, holdTheLine: true },
      attackType: AttackType.Ranged,
    });
    expect(convertAttackSurges(results, rangedConfig)[0].face).toBe(AttackFace.Surge);
  });

  it('Critical X converts before chart (ToHit)', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Surge },
      { color: AttackDieColor.Red, face: AttackFace.Surge },
    ];
    const config = makeConfig({
      attacker: {
        surgeChart: AttackSurgeChart.ToHit, // Chart would convert to hits
        criticalX: 1, // But Critical X converts 1 to crit first
      },
    });
    const converted = convertAttackSurges(results, config);
    // Critical X converts 1 to crit (Priority 1), chart converts 1 to hit (Priority 3)
    expect(converted.filter(d => d.face === AttackFace.Critical)).toHaveLength(1);
    expect(converted.filter(d => d.face === AttackFace.Hit)).toHaveLength(1);
  });

  it('zero surges returns unchanged', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Blank },
    ];
    const config = makeConfig({ attacker: { surgeChart: AttackSurgeChart.ToHit } });
    const converted = convertAttackSurges(results, config);
    expect(converted).toEqual(results);
  });
});
```

### Marksman Tests

```ts
describe('applyMarksman', () => {
  it('converts blanks to hits with saved aims', () => {
    const results = [
      { color: AttackDieColor.White, face: AttackFace.Blank },
      { color: AttackDieColor.White, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Critical },
    ];
    const config = makeConfig({
      attacker: { marksman: true, marksmanStrategy: MarksmanStrategy.Deterministic },
    });
    const converted = applyMarksman(results, config, 2);
    expect(converted.filter(d => d.face === AttackFace.Hit)).toHaveLength(2);
    expect(converted.filter(d => d.face === AttackFace.Blank)).toHaveLength(0);
  });

  it('converts hits to crits when Armor present', () => {
    const results = [
      { color: AttackDieColor.White, face: AttackFace.Hit },
      { color: AttackDieColor.Red, face: AttackFace.Critical },
    ];
    const config = makeConfig({
      attacker: { marksman: true, marksmanStrategy: MarksmanStrategy.Deterministic },
      defender: { armorX: 2 },
    });
    const converted = applyMarksman(results, config, 1);
    expect(converted[0].face).toBe(AttackFace.Critical); // hit→crit
  });

  it('blank→crit costs 2 aims (via iterative loop)', () => {
    const results = [
      { color: AttackDieColor.White, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Critical },
    ];
    const config = makeConfig({
      attacker: { marksman: true, marksmanStrategy: MarksmanStrategy.Deterministic },
      defender: { armorX: 2 },
    });
    const converted = applyMarksman(results, config, 2);
    // First aim: blank→hit, second aim: hit→crit
    expect(converted[0].face).toBe(AttackFace.Critical);
  });

  it('returns unchanged when no Marksman keyword', () => {
    const results = [{ color: AttackDieColor.White, face: AttackFace.Blank }];
    const config = makeConfig({ attacker: { marksman: false } });
    const converted = applyMarksman(results, config, 3);
    expect(converted[0].face).toBe(AttackFace.Blank);
  });

  it('returns unchanged when 0 saved aims', () => {
    const results = [{ color: AttackDieColor.White, face: AttackFace.Blank }];
    const config = makeConfig({
      attacker: { marksman: true, marksmanStrategy: MarksmanStrategy.Deterministic },
    });
    const converted = applyMarksman(results, config, 0);
    expect(converted[0].face).toBe(AttackFace.Blank);
  });

  it('prefers converting white dice over red dice', () => {
    const results = [
      { color: AttackDieColor.Red, face: AttackFace.Blank },
      { color: AttackDieColor.White, face: AttackFace.Blank },
    ];
    const config = makeConfig({
      attacker: { marksman: true, marksmanStrategy: MarksmanStrategy.Deterministic },
    });
    const converted = applyMarksman(results, config, 1);
    // White blank (index 1) should be converted first
    expect(converted[1].face).toBe(AttackFace.Hit);
    expect(converted[0].face).toBe(AttackFace.Blank);
  });
});
```

### Jar'Kai Tests

```ts
describe('applyJarKai', () => {
  it('converts blanks and hits in Melee', () => {
    const results = [
      { color: AttackDieColor.White, face: AttackFace.Blank },
      { color: AttackDieColor.Red, face: AttackFace.Hit },
    ];
    const config = makeConfig({
      attacker: { jarKaiMastery: true, dodgeTokensAttacker: 2 },
      attackType: AttackType.Melee,
      defender: { armorX: 1 }, // Makes hit→crit valuable
    });
    const converted = applyJarKai(results, config);
    // Should convert both
    const blanks = converted.filter(d => d.face === AttackFace.Blank).length;
    const hits = converted.filter(d => d.face === AttackFace.Hit).length;
    expect(blanks + hits).toBeLessThan(2);
  });

  it('does nothing for Ranged attacks', () => {
    const results = [{ color: AttackDieColor.White, face: AttackFace.Blank }];
    const config = makeConfig({
      attacker: { jarKaiMastery: true, dodgeTokensAttacker: 2 },
      attackType: AttackType.Ranged,
    });
    const converted = applyJarKai(results, config);
    expect(converted[0].face).toBe(AttackFace.Blank);
  });

  it('does nothing when jarKaiMastery is false', () => {
    const results = [{ color: AttackDieColor.White, face: AttackFace.Blank }];
    const config = makeConfig({
      attacker: { jarKaiMastery: false, dodgeTokensAttacker: 2 },
      attackType: AttackType.Melee,
    });
    const converted = applyJarKai(results, config);
    expect(converted[0].face).toBe(AttackFace.Blank);
  });

  it('stops when dodge tokens run out', () => {
    const results = [
      { color: AttackDieColor.White, face: AttackFace.Blank },
      { color: AttackDieColor.White, face: AttackFace.Blank },
      { color: AttackDieColor.White, face: AttackFace.Blank },
    ];
    const config = makeConfig({
      attacker: { jarKaiMastery: true, dodgeTokensAttacker: 1 },
      attackType: AttackType.Melee,
    });
    const converted = applyJarKai(results, config);
    // Only 1 conversion (1 Dodge token)
    expect(converted.filter(d => d.face === AttackFace.Hit)).toHaveLength(1);
    expect(converted.filter(d => d.face === AttackFace.Blank)).toHaveLength(2);
  });
});
```
