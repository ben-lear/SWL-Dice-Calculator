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
