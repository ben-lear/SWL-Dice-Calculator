# Phase 3: Monte Carlo Simulator & Web Worker — Implementation Plan

## Goal

Build a simulation layer that runs the Phase 2 attack sequence engine thousands of times, collects wound counts, computes statistical outputs (mean, median, mode, distributions, efficiency metrics), and executes off the main thread via a Web Worker so the UI remains responsive. The simulator is a pure TypeScript module with no React dependencies.

---

## Overview

Phase 3 consists of two sub-phases:

- **3A:** Simulator — the `simulate()` function and statistical computation (`engine/simulator.ts`)
- **3B:** Web Worker Integration — off-thread execution wrapper (`engine/simulation.worker.ts`)

Phase 3 depends on Phase 2 (the `executeAttackSequence` function and its types). No React or state management code is needed — this phase produces a standalone simulation module that Phase 7 will consume via a `useSimulation` hook.

> **Note on `engine/probability.ts`:** The architecture tree in DESIGN_CONCEPT.md lists a `probability.ts` module for "exact probability calculations." For the MVP, all probability data is derived from Monte Carlo simulation — the simulator's distribution output already provides per-wound-count probabilities and cumulative probabilities to sufficient accuracy at 10,000 iterations. A future `probability.ts` module could implement closed-form analytical calculations (convolution of dice pools) for simple cases, but the combinatorial explosion from keywords like rerolls, Lethal, and surge conversion makes a general analytical solver impractical. **No implementation plan is needed for `probability.ts` in the MVP.** If added later, it would supplement (not replace) the Monte Carlo results.

---

## Design Clarifications

The following design decisions are documented for clarity:

1. **Iteration Count** — The default is 10,000 iterations. This provides a good balance of statistical accuracy (±1% on most probabilities) and performance (target < 500ms on modern hardware). The iteration count is passed as a parameter so calling code (UI, tests) can adjust it.

2. **Result Aggregation** — Each call to `executeAttackSequence` returns an `AttackResult` with `totalWounds`, `guardianWoundsNoPierce`, `mainTargetWoundsNoPierce`, `deflectWounds`, and `djemSoWounds`. The simulator collects all of these across iterations and computes statistics for each independently. The primary distribution shown in the UI is based on `totalWounds`.

3. **Points Efficiency** — Efficiency metrics are computed from the mean wounds and the unit costs passed in the config. These are simple derived calculations (division), not statistical aggregations. They are only meaningful when `unitCost > 0`, so the UI will conditionally display them. The simulator always computes them (returning `0` when costs are zero) and lets the UI decide what to show.

4. **Web Worker Message Protocol** — Uses a simple request/response pattern with `postMessage`. The worker receives a config + iteration count, runs the simulation synchronously inside the worker thread, and posts back the full results object. No streaming or chunked results in MVP — the simulation is fast enough to complete in one pass. A progress callback mechanism is stubbed for future use.

5. **Worker Lifecycle** — A single long-lived worker is created when the app initializes. It receives new simulation requests as configs change (debounced by the UI layer in Phase 7). If a new request arrives while a previous one is running, the previous result is discarded when it completes (superseded by the newer request). This is handled via a request ID.

6. **Guardian and Reflection Stats** — The simulator tracks guardian wounds, deflect/Shien reflection wounds, and Djem So wounds as secondary distributions. These are computed alongside the primary wound distribution but reported separately. The UI can display them as supplementary information.

---

## Step 3A.1 — Define Simulation Result Types

**File:** `src/engine/types.ts` (append to existing)

Add the types that represent simulation output.

```ts
// ============================================================================
// Simulation Results
// ============================================================================

/**
 * Distribution entry: maps a wound count to its probability.
 */
export interface DistributionEntry {
  wounds: number;         // X wounds
  count: number;          // Number of iterations that produced exactly X wounds
  probability: number;    // count / totalIterations (0–1)
  cumulative: number;     // P(≥ X wounds) (0–1)
}

/**
 * Core statistical summary for a set of simulation results.
 */
export interface StatsSummary {
  mean: number;
  median: number;
  mode: number;
  min: number;
  max: number;
  standardDeviation: number;
}

/**
 * Points efficiency metrics derived from simulation results and unit costs.
 */
export interface EfficiencyMetrics {
  attackerWoundsPerPoint: number;     // mean wounds / attacker cost
  attackerPointsPerWound: number;     // attacker cost / mean wounds
  defenderWoundsPerPoint: number;     // mean wounds / defender cost
  defenderPointsPerWound: number;     // defender cost / mean wounds
  attackerEfficiencyRatio: number;    // (mean wounds / attacker cost) / defender cost
}

/**
 * Full simulation output returned to the UI.
 */
export interface SimulationResult {
  // Config echo (for verifying results match the current config)
  iterations: number;
  durationMs: number;

  // Primary results — total wounds (with pierce)
  totalWounds: StatsSummary;
  totalWoundsDistribution: DistributionEntry[];

  // Secondary results — guardian wounds (without pierce)
  guardianWounds: StatsSummary;
  guardianWoundsDistribution: DistributionEntry[];

  // Secondary results — main target wounds (without pierce)
  mainTargetWounds: StatsSummary;
  mainTargetWoundsDistribution: DistributionEntry[];

  // Reflection damage to attacker
  deflectWounds: StatsSummary;
  deflectWoundsDistribution: DistributionEntry[];

  djemSoWounds: StatsSummary;
  djemSoWoundsDistribution: DistributionEntry[];

  // Suppression (constant per config, but included for completeness)
  suppressionPerAttack: number;

  // Points efficiency
  efficiency: EfficiencyMetrics;
}
```

**Verify:**
- TypeScript compiles without errors
- Types align with `AttackResult` from Phase 2 (fields map 1:1)

**Notes:**
- `DistributionEntry.probability` is a 0–1 float; the UI multiplies by 100 for display
- `cumulative` is computed as P(≥ X), i.e., summing from X to max wound count
- `standardDeviation` is included for potential future use (e.g., confidence intervals) even though the MVP UI doesn't display it

---

## Step 3A.2 — Implement Statistical Helper Functions

**File:** `src/engine/simulatorStats.ts`

Pure math functions that take an array of numbers and return statistical summaries. Separated from the simulation runner for testability.

```ts
import type { StatsSummary, DistributionEntry, EfficiencyMetrics } from './types';

/**
 * Compute mean, median, mode, min, max, and standard deviation
 * from an array of numeric values.
 *
 * Assumes values are non-negative integers (wound counts).
 * Returns all zeros if the array is empty.
 */
export function computeStatsSummary(values: number[]): StatsSummary {
  if (values.length === 0) {
    return { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 };
  }

  // Sort a copy for median calculation
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // Mean
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Median
  let median: number;
  if (n % 2 === 1) {
    median = sorted[Math.floor(n / 2)];
  } else {
    median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  }

  // Mode (most frequent value; if tie, pick the smallest)
  const frequencyMap = new Map<number, number>();
  let maxFreq = 0;
  let mode = sorted[0];

  for (const v of sorted) {
    const freq = (frequencyMap.get(v) ?? 0) + 1;
    frequencyMap.set(v, freq);
    if (freq > maxFreq || (freq === maxFreq && v < mode)) {
      maxFreq = freq;
      mode = v;
    }
  }

  // Min / Max
  const min = sorted[0];
  const max = sorted[n - 1];

  // Standard deviation (population)
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const standardDeviation = Math.sqrt(variance);

  return { mean, median, mode, min, max, standardDeviation };
}

/**
 * Compute the wound distribution (exact and cumulative probabilities)
 * from an array of wound counts.
 *
 * Returns one entry per wound value from 0 to max, even if count is 0.
 */
export function computeDistribution(values: number[]): DistributionEntry[] {
  if (values.length === 0) {
    return [{ wounds: 0, count: 0, probability: 0, cumulative: 0 }];
  }

  const n = values.length;

  // Find max without spreading (avoids stack overflow on large arrays)
  let maxWounds = 0;
  for (const v of values) {
    if (v > maxWounds) maxWounds = v;
  }

  // Count occurrences of each wound value
  const counts = new Array<number>(maxWounds + 1).fill(0);
  for (const v of values) {
    counts[v]++;
  }

  // Build distribution entries (exact probabilities)
  const entries: DistributionEntry[] = counts.map((count, wounds) => ({
    wounds,
    count,
    probability: count / n,
    cumulative: 0,  // filled in next pass
  }));

  // Compute cumulative P(≥ X) from right to left
  let cumulativeCount = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    cumulativeCount += entries[i].count;
    entries[i].cumulative = cumulativeCount / n;
  }

  return entries;
}

/**
 * Compute points efficiency metrics from mean wounds and unit costs.
 *
 * Returns Infinity/NaN for zero-cost divisions — the UI layer is
 * responsible for conditionally displaying these.
 */
export function computeEfficiency(
  meanWounds: number,
  attackerCost: number,
  defenderCost: number
): EfficiencyMetrics {
  const attackerWoundsPerPoint = attackerCost > 0 ? meanWounds / attackerCost : 0;
  const attackerPointsPerWound = meanWounds > 0 ? attackerCost / meanWounds : 0;
  const defenderWoundsPerPoint = defenderCost > 0 ? meanWounds / defenderCost : 0;
  const defenderPointsPerWound = meanWounds > 0 ? defenderCost / meanWounds : 0;
  const attackerEfficiencyRatio =
    attackerCost > 0 && defenderCost > 0
      ? (meanWounds / attackerCost) / defenderCost
      : 0;

  return {
    attackerWoundsPerPoint,
    attackerPointsPerWound,
    defenderWoundsPerPoint,
    defenderPointsPerWound,
    attackerEfficiencyRatio,
  };
}
```

**Verify:**
- `computeStatsSummary([1, 2, 3, 4, 5])` → `{ mean: 3, median: 3, mode: 1, min: 1, max: 5, ... }`
- `computeStatsSummary([2, 2, 2, 5, 5])` → mode is 2 (smaller wins tie)
- `computeDistribution([0, 1, 1, 2])` → 4 entries, cumulative[0] = 1.0, cumulative[1] = 0.75, cumulative[2] = 0.25
- `computeEfficiency(3, 100, 50)` → attackerWoundsPerPoint = 0.03, etc.
- Edge case: empty array returns zero stats

---

## Step 3A.3 — Write Unit Tests for Statistical Helpers

**File:** `src/engine/simulatorStats.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  computeStatsSummary,
  computeDistribution,
  computeEfficiency,
} from './simulatorStats';

// ============================================================================
// computeStatsSummary
// ============================================================================

describe('computeStatsSummary', () => {
  it('returns zeros for an empty array', () => {
    const result = computeStatsSummary([]);
    expect(result.mean).toBe(0);
    expect(result.median).toBe(0);
    expect(result.mode).toBe(0);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
    expect(result.standardDeviation).toBe(0);
  });

  it('computes correct stats for a simple sequence', () => {
    const result = computeStatsSummary([1, 2, 3, 4, 5]);
    expect(result.mean).toBe(3);
    expect(result.median).toBe(3);
    expect(result.min).toBe(1);
    expect(result.max).toBe(5);
  });

  it('computes correct median for even-length array', () => {
    const result = computeStatsSummary([1, 2, 3, 4]);
    expect(result.median).toBe(2.5);
  });

  it('picks the smallest value when mode is tied', () => {
    const result = computeStatsSummary([2, 2, 5, 5, 8]);
    expect(result.mode).toBe(2);
  });

  it('computes mode for single most frequent value', () => {
    const result = computeStatsSummary([1, 3, 3, 3, 5, 5]);
    expect(result.mode).toBe(3);
  });

  it('computes correct standard deviation', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, variance=4, sd=2
    const result = computeStatsSummary([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result.mean).toBe(5);
    expect(result.standardDeviation).toBeCloseTo(2, 5);
  });

  it('handles single-element array', () => {
    const result = computeStatsSummary([7]);
    expect(result.mean).toBe(7);
    expect(result.median).toBe(7);
    expect(result.mode).toBe(7);
    expect(result.min).toBe(7);
    expect(result.max).toBe(7);
    expect(result.standardDeviation).toBe(0);
  });

  it('handles all-zero array', () => {
    const result = computeStatsSummary([0, 0, 0, 0]);
    expect(result.mean).toBe(0);
    expect(result.median).toBe(0);
    expect(result.mode).toBe(0);
    expect(result.standardDeviation).toBe(0);
  });
});

// ============================================================================
// computeDistribution
// ============================================================================

describe('computeDistribution', () => {
  it('returns single zero entry for empty array', () => {
    const dist = computeDistribution([]);
    expect(dist).toHaveLength(1);
    expect(dist[0]).toEqual({ wounds: 0, count: 0, probability: 0, cumulative: 0 });
  });

  it('computes correct distribution for simple data', () => {
    const dist = computeDistribution([0, 1, 1, 2]);

    expect(dist).toHaveLength(3); // 0, 1, 2

    // wounds=0: count=1, prob=0.25, cumulative=1.0
    expect(dist[0].wounds).toBe(0);
    expect(dist[0].count).toBe(1);
    expect(dist[0].probability).toBe(0.25);
    expect(dist[0].cumulative).toBe(1.0);

    // wounds=1: count=2, prob=0.50, cumulative=0.75
    expect(dist[1].wounds).toBe(1);
    expect(dist[1].count).toBe(2);
    expect(dist[1].probability).toBe(0.5);
    expect(dist[1].cumulative).toBe(0.75);

    // wounds=2: count=1, prob=0.25, cumulative=0.25
    expect(dist[2].wounds).toBe(2);
    expect(dist[2].count).toBe(1);
    expect(dist[2].probability).toBe(0.25);
    expect(dist[2].cumulative).toBe(0.25);
  });

  it('includes zero-count entries for gaps', () => {
    // [0, 3] → entries for 0, 1, 2, 3
    const dist = computeDistribution([0, 3]);

    expect(dist).toHaveLength(4);
    expect(dist[1].count).toBe(0);
    expect(dist[1].probability).toBe(0);
    expect(dist[2].count).toBe(0);
    expect(dist[2].probability).toBe(0);
  });

  it('cumulative at wounds=0 is always 1.0', () => {
    const dist = computeDistribution([0, 1, 2, 3, 4, 5]);
    expect(dist[0].cumulative).toBe(1.0);
  });

  it('cumulative at max wounds equals its own probability', () => {
    const dist = computeDistribution([0, 1, 1, 3]);
    const last = dist[dist.length - 1];
    expect(last.cumulative).toBe(last.probability);
  });

  it('handles all same values', () => {
    const dist = computeDistribution([3, 3, 3, 3]);
    expect(dist).toHaveLength(4); // 0, 1, 2, 3
    expect(dist[3].count).toBe(4);
    expect(dist[3].probability).toBe(1.0);
    expect(dist[3].cumulative).toBe(1.0);
    expect(dist[0].count).toBe(0);
    expect(dist[0].cumulative).toBe(1.0);
  });
});

// ============================================================================
// computeEfficiency
// ============================================================================

describe('computeEfficiency', () => {
  it('computes correct efficiency for normal values', () => {
    const eff = computeEfficiency(3, 100, 50);

    expect(eff.attackerWoundsPerPoint).toBeCloseTo(0.03);
    expect(eff.attackerPointsPerWound).toBeCloseTo(33.333, 2);
    expect(eff.defenderWoundsPerPoint).toBeCloseTo(0.06);
    expect(eff.defenderPointsPerWound).toBeCloseTo(16.667, 2);
    expect(eff.attackerEfficiencyRatio).toBeCloseTo(0.0006, 4);
  });

  it('returns zero when attacker cost is zero', () => {
    const eff = computeEfficiency(3, 0, 50);
    expect(eff.attackerWoundsPerPoint).toBe(0);
    expect(eff.attackerEfficiencyRatio).toBe(0);
  });

  it('returns zero when defender cost is zero', () => {
    const eff = computeEfficiency(3, 100, 0);
    expect(eff.defenderWoundsPerPoint).toBe(0);
    expect(eff.attackerEfficiencyRatio).toBe(0);
  });

  it('returns zero when mean wounds is zero', () => {
    const eff = computeEfficiency(0, 100, 50);
    expect(eff.attackerPointsPerWound).toBe(0);
    expect(eff.defenderPointsPerWound).toBe(0);
  });

  it('handles all-zero inputs gracefully', () => {
    const eff = computeEfficiency(0, 0, 0);
    expect(eff.attackerWoundsPerPoint).toBe(0);
    expect(eff.attackerPointsPerWound).toBe(0);
    expect(eff.defenderWoundsPerPoint).toBe(0);
    expect(eff.defenderPointsPerWound).toBe(0);
    expect(eff.attackerEfficiencyRatio).toBe(0);
  });
});
```

**Run:** `npm test simulatorStats.test.ts`

**Expected:** All tests pass.

---

## Step 3A.4 — Implement the Simulate Function

**File:** `src/engine/simulator.ts`

The core simulation runner. Calls `executeAttackSequence` N times, collects results, and delegates to the stats helpers.

```ts
import type { AttackConfig, SimulationResult } from './types';
import { executeAttackSequence } from './attackSequence';
import {
  computeStatsSummary,
  computeDistribution,
  computeEfficiency,
} from './simulatorStats';

/**
 * Default iteration count for simulations.
 * 10,000 provides ±1% accuracy on most probabilities.
 */
export const DEFAULT_ITERATIONS = 10_000;

/**
 * Run a Monte Carlo simulation of the attack sequence.
 *
 * Executes `executeAttackSequence` for the given number of iterations,
 * collecting wound counts and computing statistical summaries.
 *
 * This function is synchronous and CPU-bound — call it inside a
 * Web Worker to avoid blocking the UI thread.
 */
export function simulate(
  config: AttackConfig,
  iterations: number = DEFAULT_ITERATIONS
): SimulationResult {
  const startTime = performance.now();

  // ── Run all iterations (single pass — no intermediate array) ───
  const totalWoundsArr: number[] = new Array(iterations);
  const guardianWoundsArr: number[] = new Array(iterations);
  const mainTargetWoundsArr: number[] = new Array(iterations);
  const deflectWoundsArr: number[] = new Array(iterations);
  const djemSoWoundsArr: number[] = new Array(iterations);
  let suppressionValue = 1;

  for (let i = 0; i < iterations; i++) {
    const r = executeAttackSequence(config);
    totalWoundsArr[i] = r.totalWounds;
    guardianWoundsArr[i] = r.guardianWoundsNoPierce;
    mainTargetWoundsArr[i] = r.mainTargetWoundsNoPierce;
    deflectWoundsArr[i] = r.deflectWounds;
    djemSoWoundsArr[i] = r.djemSoWounds;
    if (i === 0) suppressionValue = r.suppressionApplied;
  }

  // ── Compute statistics ──────────────────────────────────────────
  const totalWoundsStats = computeStatsSummary(totalWoundsArr);
  const guardianWoundsStats = computeStatsSummary(guardianWoundsArr);
  const mainTargetWoundsStats = computeStatsSummary(mainTargetWoundsArr);
  const deflectWoundsStats = computeStatsSummary(deflectWoundsArr);
  const djemSoWoundsStats = computeStatsSummary(djemSoWoundsArr);

  // ── Compute distributions ──────────────────────────────────────
  const totalWoundsDist = computeDistribution(totalWoundsArr);
  const guardianWoundsDist = computeDistribution(guardianWoundsArr);
  const mainTargetWoundsDist = computeDistribution(mainTargetWoundsArr);
  const deflectWoundsDist = computeDistribution(deflectWoundsArr);
  const djemSoWoundsDist = computeDistribution(djemSoWoundsArr);

  // ── Compute efficiency ─────────────────────────────────────────
  const efficiency = computeEfficiency(
    totalWoundsStats.mean,
    config.attacker.unitCost,
    config.defender.unitCost
  );

  const endTime = performance.now();

  return {
    iterations,
    durationMs: endTime - startTime,

    totalWounds: totalWoundsStats,
    totalWoundsDistribution: totalWoundsDist,

    guardianWounds: guardianWoundsStats,
    guardianWoundsDistribution: guardianWoundsDist,

    mainTargetWounds: mainTargetWoundsStats,
    mainTargetWoundsDistribution: mainTargetWoundsDist,

    deflectWounds: deflectWoundsStats,
    deflectWoundsDistribution: deflectWoundsDist,

    djemSoWounds: djemSoWoundsStats,
    djemSoWoundsDistribution: djemSoWoundsDist,

    suppressionPerAttack: suppressionValue,
    efficiency,
  };
}
```

**Verify:**
- TypeScript compiles
- `simulate(config, 100)` returns a valid `SimulationResult` with all fields populated
- `durationMs` is a positive number
- `totalWoundsDistribution[0].cumulative` is 1.0 (P ≥ 0 wounds is always 100%)
- `iterations` field matches the count passed in

**Notes:**
- Single-pass extraction avoids holding all 10k `AttackResult` objects in memory simultaneously
- Pre-allocating arrays with `new Array(iterations)` avoids dynamic resizing for better performance
- `performance.now()` provides sub-millisecond timing for benchmarking
- The suppression value is constant for a given config, so we capture it from the first iteration

---

## Step 3A.5 — Write Unit Tests for Simulator

**File:** `src/engine/simulator.test.ts`

Tests for the `simulate` function. These require the Phase 2 engine to be functional, so they serve as integration tests between the simulator and the attack sequence.

```ts
import { describe, it, expect } from 'vitest';
import { simulate, DEFAULT_ITERATIONS } from './simulator';
import type { AttackConfig } from './types';
import {
  AttackDieColor,
  DefenseDieColor,
  AttackSurgeChart,
  DefenseSurgeChart,
  CoverType,
  AttackType,
  MarksmanStrategy,
  RerollStrategy,
} from './types';

// ============================================================================
// Test Config Factory
// ============================================================================

/**
 * Creates a minimal valid AttackConfig with all defaults.
 * Override specific fields as needed.
 */
function createTestConfig(overrides?: {
  attacker?: Partial<AttackConfig['attacker']>;
  defender?: Partial<AttackConfig['defender']>;
  attackType?: AttackType;
}): AttackConfig {
  return {
    attacker: {
      redDice: 0,
      blackDice: 0,
      whiteDice: 0,
      surgeChart: AttackSurgeChart.None,
      aimTokens: 0,
      surgeTokens: 0,
      observationTokens: 0,
      preciseX: 0,
      criticalX: 0,
      lethalX: 0,
      sharpshooterX: 0,
      pierceX: 0,
      impactX: 0,
      ramX: 0,
      blast: false,
      highVelocity: false,
      suppressive: false,
      marksman: false,
      marksmanStrategy: MarksmanStrategy.Deterministic,
      rerollStrategy: RerollStrategy.Conservative,
      jediHunter: false,
      duelistAttacker: false,
      makashiMastery: false,
      spray: false,
      immuneDeflect: false,
      deathFromAbove: false,
      holdTheLine: false,
      antiMaterielX: 0,
      antiPersonnelX: 0,
      cumbersome: false,
      unitCost: 0,
      ...overrides?.attacker,
    },
    defender: {
      dieColor: DefenseDieColor.White,
      surgeChart: DefenseSurgeChart.None,
      coverType: CoverType.None,
      coverX: 0,
      smokeTokens: 0,
      suppressed: false,
      dodgeTokens: 0,
      surgeTokens: 0,
      suppressionTokens: 0,
      minisInLOS: 1,
      armorX: 0,
      weakPointX: 0,
      immunePierce: false,
      immuneMeleePierce: false,
      immuneBlast: false,
      impervious: false,
      dangerSenseX: 0,
      uncannyLuckX: 0,
      block: false,
      deflect: false,
      shienMastery: false,
      outmaneuver: false,
      lowProfile: false,
      shieldedX: 0,
      djemSoMastery: false,
      soresuMastery: false,
      duelistDefender: false,
      backup: false,
      holdTheLine: false,
      guardianX: 0,
      unitCost: 0,
      ...overrides?.defender,
    },
    attackType: overrides?.attackType ?? AttackType.All,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('simulate', () => {
  it('returns a valid SimulationResult', () => {
    const config = createTestConfig({
      attacker: { redDice: 2 },
    });
    const result = simulate(config, 100);

    expect(result.iterations).toBe(100);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.totalWounds.mean).toBeGreaterThanOrEqual(0);
    expect(result.totalWoundsDistribution.length).toBeGreaterThan(0);
    expect(result.totalWoundsDistribution[0].cumulative).toBe(1.0);
  });

  it('zero dice produces zero wounds', () => {
    const config = createTestConfig(); // No dice
    const result = simulate(config, 1000);

    expect(result.totalWounds.mean).toBe(0);
    expect(result.totalWounds.max).toBe(0);
    expect(result.totalWoundsDistribution).toHaveLength(1);
    expect(result.totalWoundsDistribution[0].wounds).toBe(0);
    expect(result.totalWoundsDistribution[0].probability).toBe(1.0);
  });

  it('more dice produces more wounds on average', () => {
    const configLow = createTestConfig({
      attacker: { redDice: 1 },
      defender: { dieColor: DefenseDieColor.White },
    });
    const configHigh = createTestConfig({
      attacker: { redDice: 6 },
      defender: { dieColor: DefenseDieColor.White },
    });

    const resultLow = simulate(configLow, 5000);
    const resultHigh = simulate(configHigh, 5000);

    expect(resultHigh.totalWounds.mean).toBeGreaterThan(resultLow.totalWounds.mean);
  });

  it('distribution probabilities sum to approximately 1.0', () => {
    const config = createTestConfig({
      attacker: { redDice: 4 },
    });
    const result = simulate(config, 5000);

    const totalProb = result.totalWoundsDistribution.reduce(
      (sum, entry) => sum + entry.probability, 0
    );
    expect(totalProb).toBeCloseTo(1.0, 5);
  });

  it('cumulative probability is monotonically non-increasing', () => {
    const config = createTestConfig({
      attacker: { blackDice: 3 },
    });
    const result = simulate(config, 5000);

    for (let i = 1; i < result.totalWoundsDistribution.length; i++) {
      expect(result.totalWoundsDistribution[i].cumulative)
        .toBeLessThanOrEqual(result.totalWoundsDistribution[i - 1].cumulative);
    }
  });

  it('computes efficiency metrics when unit costs are set', () => {
    const config = createTestConfig({
      attacker: { redDice: 4, unitCost: 200 },
      defender: { dieColor: DefenseDieColor.White, unitCost: 50 },
    });
    const result = simulate(config, 5000);

    expect(result.efficiency.attackerWoundsPerPoint).toBeGreaterThan(0);
    expect(result.efficiency.attackerPointsPerWound).toBeGreaterThan(0);
    expect(result.efficiency.defenderWoundsPerPoint).toBeGreaterThan(0);
    expect(result.efficiency.defenderPointsPerWound).toBeGreaterThan(0);
    expect(result.efficiency.attackerEfficiencyRatio).toBeGreaterThan(0);
  });

  it('returns zero efficiency when costs are zero', () => {
    const config = createTestConfig({
      attacker: { redDice: 4, unitCost: 0 },
      defender: { unitCost: 0 },
    });
    const result = simulate(config, 100);

    expect(result.efficiency.attackerWoundsPerPoint).toBe(0);
    expect(result.efficiency.defenderWoundsPerPoint).toBe(0);
    expect(result.efficiency.attackerEfficiencyRatio).toBe(0);
  });

  it('default iterations constant is 10,000', () => {
    expect(DEFAULT_ITERATIONS).toBe(10_000);
  });

  it('deflect/djemSo stats are populated (even if zero)', () => {
    const config = createTestConfig({
      attacker: { redDice: 2 },
    });
    const result = simulate(config, 100);

    expect(result.deflectWounds).toBeDefined();
    expect(result.deflectWoundsDistribution).toBeDefined();
    expect(result.djemSoWounds).toBeDefined();
    expect(result.djemSoWoundsDistribution).toBeDefined();
  });

  it('suppression per attack is at least 1', () => {
    const config = createTestConfig({
      attacker: { redDice: 1 },
    });
    const result = simulate(config, 100);
    expect(result.suppressionPerAttack).toBeGreaterThanOrEqual(1);
  });

  it('suppressive keyword adds +1 suppression', () => {
    const config = createTestConfig({
      attacker: { redDice: 1, suppressive: true },
    });
    const result = simulate(config, 100);
    expect(result.suppressionPerAttack).toBe(2);
  });
});

// ============================================================================
// Statistical Validation Tests
// ============================================================================

describe('simulate — statistical validation', () => {
  /**
   * Known scenario: 1 red attack die vs no defense.
   * Red die: 5/8 hit, 1/8 crit, 1/8 surge(→blank), 1/8 blank
   * No defense dice → wounds = hits + crits
   * Expected mean wounds ≈ 6/8 = 0.75 (surges convert to blank with no surge chart)
   */
  it('1 red die vs no defense, no surge conversion: mean ≈ 0.625', () => {
    const config = createTestConfig({
      attacker: {
        redDice: 1,
        surgeChart: AttackSurgeChart.None,
      },
      defender: {
        dieColor: DefenseDieColor.White,
      },
    });

    // Use high iteration count for statistical accuracy
    const result = simulate(config, 50_000);

    // With no defense dice rolling and no surge conversion:
    // P(wound) = P(hit) + P(crit) = 5/8 + 1/8 = 6/8 = 0.75
    // But defender rolls 1 white die per remaining hit/crit
    // White defense: 1/6 block, 1/6 surge(→blank), 4/6 blank
    // So P(block) = 1/6 with no surge conversion
    // Expected: 0.75 * (1 - 1/6) = 0.75 * 5/6 ≈ 0.625
    expect(result.totalWounds.mean).toBeCloseTo(0.625, 1);
  });
});
```

**Verify:** `npm test simulator.test.ts` — all tests pass.

**Notes:**
- The `createTestConfig` factory is essential for reducing boilerplate in tests. It will be reused in Phase 9 integration tests.
- Statistical validation tests use high iteration counts (50k) for tighter tolerances. Normal functional tests use 100–5000 iterations for speed.
- The known scenario test validates the full pipeline end-to-end: dice → no keywords → defense → wounds.

---

## Step 3B.1 — Define Worker Message Protocol

**File:** `src/engine/worker/protocol.ts`

Define the message types exchanged between the main thread and the Web Worker.

```ts
import type { AttackConfig, SimulationResult } from '../types';

// ============================================================================
// Main Thread → Worker Messages
// ============================================================================

export interface SimulationRequest {
  type: 'run';
  id: string;                // Unique request ID for result matching
  config: AttackConfig;
  iterations: number;
}

export interface CancelRequest {
  type: 'cancel';
  id: string;                // ID of the request to cancel
}

export type WorkerRequest = SimulationRequest | CancelRequest;

// ============================================================================
// Worker → Main Thread Messages
// ============================================================================

export interface SimulationResponse {
  type: 'result';
  id: string;                // Matches the request ID
  result: SimulationResult;
}

export interface SimulationError {
  type: 'error';
  id: string;
  error: string;
}

export interface SimulationProgress {
  type: 'progress';
  id: string;
  completed: number;         // Iterations completed so far
  total: number;             // Total iterations
}

export type WorkerResponse = SimulationResponse | SimulationError | SimulationProgress;
```

**Verify:**
- TypeScript compiles
- Types are self-documenting and match design spec

**Notes:**
- `CancelRequest` and `SimulationProgress` are defined for future use but not fully implemented in MVP. The cancel mechanism will simply cause the main thread to ignore stale results (via ID comparison).
- Request IDs allow the main thread to discard results from superseded simulations.

---

## Step 3B.2 — Implement the Web Worker

**File:** `src/engine/worker/simulation.worker.ts`

The actual worker script that runs in a separate thread.

```ts
import { simulate } from '../simulator';
import type { WorkerRequest, WorkerResponse } from './protocol';

/**
 * Web Worker entry point for simulation.
 *
 * Receives SimulationRequest messages, runs the simulation synchronously
 * (blocking this thread only — main thread stays responsive), and posts
 * back the results.
 */
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  switch (message.type) {
    case 'run': {
      try {
        const result = simulate(message.config, message.iterations);

        const response: WorkerResponse = {
          type: 'result',
          id: message.id,
          result,
        };
        self.postMessage(response);
      } catch (err) {
        const response: WorkerResponse = {
          type: 'error',
          id: message.id,
          error: err instanceof Error ? err.message : String(err),
        };
        self.postMessage(response);
      }
      break;
    }

    case 'cancel': {
      // MVP: No-op. Cancellation is handled by the main thread
      // discarding results with non-matching IDs.
      // Future: could use AbortController or chunked iteration
      // to actually stop mid-simulation.
      break;
    }
  }
};
```

**Verify:**
- TypeScript compiles (may need `tsconfig` adjustment for Web Worker `self` context — see Step 3B.4)
- No imports from React or DOM APIs (only engine + protocol types)

**Notes:**
- The worker runs `simulate()` synchronously. Since it's in a separate thread, this is fine — the main thread stays responsive.
- Error handling wraps the entire simulation in try/catch to prevent the worker from crashing silently.
- The `cancel` case is a no-op in MVP; the main thread handles cancellation by comparing request IDs.

---

## Step 3B.3 — Implement the Worker Client Wrapper

**File:** `src/engine/worker/simulationWorkerClient.ts`

This is the main-thread API for dispatching simulations to the worker. It manages the worker lifecycle, request IDs, and result callbacks.

```ts
import type { AttackConfig, SimulationResult } from '../types';
import type { SimulationRequest, WorkerResponse } from './protocol';

/**
 * Client wrapper for the simulation Web Worker.
 *
 * Provides a Promise-based API for running simulations off the main thread.
 * Handles request ID tracking to discard stale results when a new simulation
 * supersedes a previous one.
 */
export class SimulationWorkerClient {
  private worker: Worker;
  private currentRequestId: string | null = null;
  private pendingResolve: ((result: SimulationResult) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;
  private requestCounter = 0;

  constructor() {
    this.worker = new Worker(
      new URL('./simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.handleMessage(event.data);
    };

    this.worker.onerror = (event: ErrorEvent) => {
      if (this.pendingReject) {
        this.pendingReject(new Error(`Worker error: ${event.message}`));
        this.pendingResolve = null;
        this.pendingReject = null;
        this.currentRequestId = null;
      }
    };
  }

  /**
   * Run a simulation in the worker thread.
   *
   * If a previous simulation is still running, its result will be discarded
   * (the Promise from the previous call will never resolve).
   *
   * @returns Promise that resolves with the SimulationResult
   */
  run(config: AttackConfig, iterations: number): Promise<SimulationResult> {
    // Generate a unique request ID
    const id = `sim-${++this.requestCounter}-${Date.now()}`;

    // If there's a pending request, it's now superseded.
    // We don't reject it — we just let it be garbage collected.
    // The worker will still complete the old simulation, but we'll
    // ignore its result in handleMessage.

    return new Promise<SimulationResult>((resolve, reject) => {
      this.currentRequestId = id;
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      const request: SimulationRequest = {
        type: 'run',
        id,
        config,
        iterations,
      };

      this.worker.postMessage(request);
    });
  }

  /**
   * Terminate the worker. Call this when the component unmounts
   * or the worker is no longer needed.
   */
  terminate(): void {
    this.worker.terminate();
    this.pendingResolve = null;
    this.pendingReject = null;
    this.currentRequestId = null;
  }

  // ── Private ──────────────────────────────────────────────────────

  private handleMessage(message: WorkerResponse): void {
    // Ignore results from superseded requests
    if (message.id !== this.currentRequestId) {
      return;
    }

    switch (message.type) {
      case 'result': {
        if (this.pendingResolve) {
          this.pendingResolve(message.result);
        }
        this.pendingResolve = null;
        this.pendingReject = null;
        this.currentRequestId = null;
        break;
      }

      case 'error': {
        if (this.pendingReject) {
          this.pendingReject(new Error(message.error));
        }
        this.pendingResolve = null;
        this.pendingReject = null;
        this.currentRequestId = null;
        break;
      }

      case 'progress': {
        // MVP: progress events are received but not surfaced.
        // Future: pass to a progress callback for UI display.
        break;
      }
    }
  }
}
```

**Verify:**
- TypeScript compiles
- `new SimulationWorkerClient()` creates a worker instance without errors (in browser environment)
- `client.run(config, 1000)` returns a Promise
- `client.terminate()` cleans up

**Notes:**
- The Vite `new URL('./simulation.worker.ts', import.meta.url)` pattern enables proper bundling of the worker file with code splitting.
- When a new `run()` call supersedes a previous one, the old Promise is orphaned (never resolved/rejected). This is intentional — the UI only cares about the latest result. If this causes issues with Promise leak detection in tests, we can add explicit rejection of superseded promises.
- The `requestCounter` + `Date.now()` combination ensures unique IDs even across rapid successive calls.

---

## Step 3B.4 — Configure TypeScript for Web Worker

**File:** `tsconfig.app.json` (update)

Web Workers use `self` instead of `window`, and need the `webworker` lib for type checking. Since worker files and main-thread files coexist in the same project, we need to handle this carefully.

**Option A — Inline Triple-Slash Directive (Recommended for MVP):**

Add to the top of `simulation.worker.ts`:
```ts
/// <reference lib="webworker" />
```

This tells TypeScript to use Web Worker types for this specific file without affecting the rest of the project. No `tsconfig` changes needed.

**Option B — Separate `tsconfig.worker.json` (Future):**

For projects with many worker files, create a dedicated config:
```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "lib": ["ES2020", "WebWorker"]
  },
  "include": ["src/engine/worker/*.ts"]
}
```

**For MVP, use Option A.** Add the triple-slash directive to `simulation.worker.ts`:

```ts
/// <reference lib="webworker" />

import { simulate } from '../simulator';
import type { WorkerRequest, WorkerResponse } from './protocol';

// ... rest of worker code
```

**Verify:**
- `npx tsc --noEmit` passes without errors
- No red squiggles on `self.onmessage` or `self.postMessage` in the worker file
- Other files in `src/` still have access to DOM types (`window`, `document`)

---

## Step 3B.5 — Verify Vite Worker Bundling

Vite has built-in support for Web Workers using the `new URL(..., import.meta.url)` pattern. No additional plugins are required.

**Verify the following in the Vite config:**

1. The worker file (`simulation.worker.ts`) is **not** listed in `optimizeDeps.exclude` or any special config — Vite handles it automatically.

2. In development mode (`npm run dev`), Vite serves the worker as a separate module.

3. In production mode (`npm run build`), Vite bundles the worker as a separate chunk.

**Manual verification steps:**

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open browser DevTools → Sources tab. Confirm the worker file appears as a separate source.

3. Open DevTools → Application → Service Workers / Web Workers. Confirm a worker thread is active when a simulation runs.

4. Build for production:
   ```bash
   npm run build
   ```

5. Check `dist/assets/` for a separate worker chunk (e.g., `simulation.worker-[hash].js`).

**Notes:**
- Vite uses Rollup for production builds and esbuild for dev. Both support the `new URL` worker pattern natively.
- If the worker fails to load in dev, ensure the `type: 'module'` option is set in the `Worker` constructor (it is, in Step 3B.3).

---

## Step 3B.6 — Write Integration Tests for Worker Client

**File:** `src/engine/worker/simulationWorkerClient.test.ts`

Testing Web Workers in Vitest requires a special setup since Workers don't exist in the `jsdom` environment.

**Approach: Mock the Worker for unit testing; test the real Worker in browser E2E tests.**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SimulationResult } from '../types';
import type { WorkerResponse } from './protocol';

// ============================================================================
// Mock Worker
// ============================================================================

/**
 * Minimal mock Worker for testing the client wrapper.
 * Captures postMessage calls and allows manual response injection.
 */
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage = vi.fn();
  terminate = vi.fn();

  /** Simulate a message from the worker */
  simulateResponse(data: WorkerResponse) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }
}

// Mock the Worker constructor globally
let mockWorkerInstance: MockWorker;

vi.stubGlobal('Worker', class {
  constructor() {
    mockWorkerInstance = new MockWorker();
    return mockWorkerInstance;
  }
});

// ============================================================================
// Tests
// ============================================================================

// Dynamic import after mocking Worker
let SimulationWorkerClient: typeof import('./simulationWorkerClient').SimulationWorkerClient;

beforeEach(async () => {
  const mod = await import('./simulationWorkerClient');
  SimulationWorkerClient = mod.SimulationWorkerClient;
});

describe('SimulationWorkerClient', () => {
  it('posts a run message to the worker', () => {
    const client = new SimulationWorkerClient();
    const config = {} as any; // Minimal config for testing

    client.run(config, 1000);

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'run',
        config,
        iterations: 1000,
      })
    );
  });

  it('resolves the promise when worker responds with result', async () => {
    const client = new SimulationWorkerClient();
    const config = {} as any;

    const resultPromise = client.run(config, 1000);

    // Get the request ID from the posted message
    const postedMessage = mockWorkerInstance.postMessage.mock.calls[0][0];
    const requestId = postedMessage.id;

    // Simulate worker response
    const mockResult = { totalWounds: { mean: 3 } } as SimulationResult;
    mockWorkerInstance.simulateResponse({
      type: 'result',
      id: requestId,
      result: mockResult,
    });

    const result = await resultPromise;
    expect(result.totalWounds.mean).toBe(3);
  });

  it('rejects the promise when worker responds with error', async () => {
    const client = new SimulationWorkerClient();
    const config = {} as any;

    const resultPromise = client.run(config, 1000);

    const postedMessage = mockWorkerInstance.postMessage.mock.calls[0][0];

    mockWorkerInstance.simulateResponse({
      type: 'error',
      id: postedMessage.id,
      error: 'Simulation failed',
    });

    await expect(resultPromise).rejects.toThrow('Simulation failed');
  });

  it('ignores results from superseded requests', async () => {
    const client = new SimulationWorkerClient();
    const config = {} as any;

    // Start first simulation
    const promise1 = client.run(config, 1000);
    const id1 = mockWorkerInstance.postMessage.mock.calls[0][0].id;

    // Start second simulation (supersedes first)
    const promise2 = client.run(config, 2000);
    const id2 = mockWorkerInstance.postMessage.mock.calls[1][0].id;

    // Respond to the FIRST request (should be ignored)
    const staleResult = { totalWounds: { mean: 1 } } as SimulationResult;
    mockWorkerInstance.simulateResponse({
      type: 'result',
      id: id1,
      result: staleResult,
    });

    // Respond to the SECOND request (should be accepted)
    const freshResult = { totalWounds: { mean: 5 } } as SimulationResult;
    mockWorkerInstance.simulateResponse({
      type: 'result',
      id: id2,
      result: freshResult,
    });

    const result = await promise2;
    expect(result.totalWounds.mean).toBe(5);

    // promise1 never resolves (by design)
  });

  it('terminates the worker', () => {
    const client = new SimulationWorkerClient();
    client.terminate();
    expect(mockWorkerInstance.terminate).toHaveBeenCalled();
  });
});
```

**Run:** `npm test simulationWorkerClient.test.ts`

**Expected:** All tests pass.

**Notes:**
- We mock the `Worker` global because Vitest uses `jsdom` which doesn't support real Web Workers.
- The mock captures `postMessage` calls and allows injecting responses to test the client's state management.
- The superseded-request test verifies that stale results are properly discarded — this is critical for UI correctness when the user changes inputs rapidly.

---

## Step 3B.7 — Export Public API

**File:** `src/engine/index.ts` (create or update, depending on Phase 2 output)

Create a clean public API barrel file for the engine module.

```ts
// Types
export type {
  AttackConfig,
  AttackerConfig,
  DefenderConfig,
  AttackResult,
  SimulationResult,
  StatsSummary,
  DistributionEntry,
  EfficiencyMetrics,
  MarksmanDecision,
} from './types';

export {
  AttackDieColor,
  DefenseDieColor,
  AttackFace,
  DefenseFace,
  AttackType,
  AttackSurgeChart,
  DefenseSurgeChart,
  CoverType,
  MarksmanStrategy,
  RerollStrategy,
} from './types';

// Dice
export {
  rollAttackDie,
  rollDefenseDie,
  rollAttackPool,
  rollDefensePool,
  upgradeAttack,
  downgradeAttack,
  upgradeDefense,
  downgradeDefense,
} from './dice';

// Attack sequence
export { executeAttackSequence } from './attackSequence';

// Simulator
export { simulate, DEFAULT_ITERATIONS } from './simulator';

// Worker client
export { SimulationWorkerClient } from './worker/simulationWorkerClient';
```

**Verify:**
- All imports resolve correctly
- External consumers (hooks, components) can import from `@/engine` or `../engine`

---

## Verification Checklist

After completing all steps, confirm:

| Check | Command / Action |
|-------|-----------------|
| Types compile | `npx tsc --noEmit` passes with new `SimulationResult` types |
| Stats helpers pass | `npm test simulatorStats.test.ts` — all tests green |
| Simulator runs | `npm test simulator.test.ts` — all tests green |
| Worker client passes | `npm test simulationWorkerClient.test.ts` — all tests green |
| Statistical accuracy | 1 red die vs white defense, no keywords → mean ≈ 0.625 (±0.05) |
| Performance | `simulate(config, 10_000)` completes in < 500ms (check `durationMs`) |
| Distribution valid | `totalWoundsDistribution[0].cumulative === 1.0` for all configs |
| Probabilities sum to 1 | Sum of all `probability` entries ≈ 1.0 |
| Efficiency math correct | `meanWounds / cost` matches manual calculation |
| Worker builds | `npm run build` — worker chunk appears in `dist/assets/` |
| Dev server works | `npm run dev` — worker loads as separate module source |
| Full test suite | `npm test` — all Phase 2 + Phase 3 tests pass |

---

## Files Created/Modified in This Phase

| File | Status |
|------|--------|
| `src/engine/types.ts` | Modified (added `SimulationResult`, `StatsSummary`, `DistributionEntry`, `EfficiencyMetrics`) |
| `src/engine/simulatorStats.ts` | Created (statistical helper functions) |
| `src/engine/simulatorStats.test.ts` | Created (stats helper unit tests) |
| `src/engine/simulator.ts` | Created (Monte Carlo simulation runner) |
| `src/engine/simulator.test.ts` | Created (simulator integration tests) |
| `src/engine/worker/protocol.ts` | Created (worker message types) |
| `src/engine/worker/simulation.worker.ts` | Created (Web Worker script) |
| `src/engine/worker/simulationWorkerClient.ts` | Created (main-thread wrapper) |
| `src/engine/worker/simulationWorkerClient.test.ts` | Created (worker client tests) |
| `src/engine/index.ts` | Created or modified (barrel exports) |

---

## Dependency Summary

```
Phase 2 (Core Dice Engine)
  │
  └─► Phase 3A (Simulator)
        ├── types.ts (SimulationResult types)  ← Step 3A.1
        ├── simulatorStats.ts                  ← Step 3A.2
        ├── simulatorStats.test.ts             ← Step 3A.3
        ├── simulator.ts                       ← Step 3A.4
        └── simulator.test.ts                  ← Step 3A.5
              │
              └─► Phase 3B (Web Worker)
                    ├── worker/protocol.ts               ← Step 3B.1
                    ├── worker/simulation.worker.ts       ← Step 3B.2
                    ├── worker/simulationWorkerClient.ts  ← Step 3B.3
                    ├── tsconfig adjustment               ← Step 3B.4
                    ├── Vite bundling verification         ← Step 3B.5
                    ├── worker client tests                ← Step 3B.6
                    └── engine/index.ts exports            ← Step 3B.7
```

**Sequencing within Phase 3:**
- Steps 3A.1–3A.3 can be implemented without Phase 2 being complete (they only use types and pure math)
- Steps 3A.4–3A.5 require a working `executeAttackSequence` from Phase 2
- Steps 3B.1–3B.7 depend on 3A.4 (the `simulate` function)

---

## Notes for Phase 7 Integration

The `useSimulation` hook (Phase 7A) will consume the `SimulationWorkerClient`:

```ts
import { SimulationWorkerClient } from '../engine';

// In the hook:
const clientRef = useRef(new SimulationWorkerClient());

const runSimulation = useCallback(async (config: AttackConfig) => {
  setLoading(true);
  try {
    const result = await clientRef.current.run(config, DEFAULT_ITERATIONS);
    setResult(result);
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
}, []);

// Debounced trigger on config change...
// Cleanup on unmount: clientRef.current.terminate();
```

The hook depends on both the Worker Client (Phase 3B) and the Zustand stores (Phase 5A) for the merged config. This is why `useSimulation` is deferred to Phase 7A.

---

## Known Limitations & Future Work

1. **No progress reporting** — The MVP worker runs the full simulation and returns results in one message. For very high iteration counts (100k+), a chunked approach with progress callbacks would improve UX. The `SimulationProgress` message type is defined but not emitted.

2. **No cancellation** — If the user changes config rapidly, old simulations run to completion and their results are discarded. True cancellation (via `worker.terminate()` + respawn, or using `SharedArrayBuffer` for cooperative cancellation) is deferred.

3. **Single worker** — Only one worker thread is used. For multi-core performance, the workload could be split across multiple workers (e.g., 4 workers × 2,500 iterations each). This is unnecessary at 10k iterations but could help at 100k+.

4. **No streaming results** — The UI shows a loading state until all iterations complete. A streaming approach (partial results after every 1k iterations) would give the user faster feedback. Deferred to future optimization.

5. **Population standard deviation** — The simulator uses population SD (divides by N, not N−1). For 10k iterations this is effectively identical to sample SD, but the choice is documented.
