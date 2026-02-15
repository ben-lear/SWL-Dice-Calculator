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
