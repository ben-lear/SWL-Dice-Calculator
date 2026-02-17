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
  const suppressionArr: number[] = new Array(iterations);

  for (let i = 0; i < iterations; i++) {
    const r = executeAttackSequence(config);
    totalWoundsArr[i] = r.totalWounds;
    guardianWoundsArr[i] = r.guardianWoundsNoPierce;
    mainTargetWoundsArr[i] = r.mainTargetWoundsNoPierce;
    deflectWoundsArr[i] = r.deflectWounds;
    djemSoWoundsArr[i] = r.djemSoWounds;
    suppressionArr[i] = r.suppressionApplied;
  }

  // ── Compute statistics ──────────────────────────────────────────
  const totalWoundsStats = computeStatsSummary(totalWoundsArr);
  const guardianWoundsStats = computeStatsSummary(guardianWoundsArr);
  const mainTargetWoundsStats = computeStatsSummary(mainTargetWoundsArr);
  const deflectWoundsStats = computeStatsSummary(deflectWoundsArr);
  const djemSoWoundsStats = computeStatsSummary(djemSoWoundsArr);

  // ── Compute suppression value (mode across all iterations) ──────
  // Suppression can vary when Shien Mastery is active (0 if no wounds)
  const suppressionStats = computeStatsSummary(suppressionArr);
  const suppressionValue = suppressionStats.mode;

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
