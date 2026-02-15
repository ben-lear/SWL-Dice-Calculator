import { describe, it, expect, beforeEach } from 'vitest';
import { useResultsStore } from './resultsStore';
import type { SimulationResult } from '../engine/types';

// Minimal mock result for testing
const mockResult: SimulationResult = {
  iterations: 100,
  durationMs: 50,
  totalWounds: { mean: 3, median: 3, mode: 3, min: 0, max: 7, standardDeviation: 1.2 },
  totalWoundsDistribution: [],
  guardianWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  guardianWoundsDistribution: [],
  mainTargetWounds: { mean: 3, median: 3, mode: 3, min: 0, max: 7, standardDeviation: 1.2 },
  mainTargetWoundsDistribution: [],
  deflectWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  deflectWoundsDistribution: [],
  djemSoWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  djemSoWoundsDistribution: [],
  suppressionPerAttack: 1,
  efficiency: {
    attackerWoundsPerPoint: 0,
    attackerPointsPerWound: 0,
    defenderWoundsPerPoint: 0,
    defenderPointsPerWound: 0,
    attackerEfficiencyRatio: 0,
  },
};

describe('resultsStore', () => {
  beforeEach(() => {
    useResultsStore.getState().clear();
  });

  it('initializes with null result and not loading', () => {
    const state = useResultsStore.getState();
    expect(state.result).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets loading state', () => {
    useResultsStore.getState().setLoading(true);
    expect(useResultsStore.getState().loading).toBe(true);
  });

  it('sets result and clears loading/error', () => {
    useResultsStore.getState().setLoading(true);
    useResultsStore.getState().setError('previous error');

    useResultsStore.getState().setResult(mockResult);

    const state = useResultsStore.getState();
    expect(state.result).toBe(mockResult);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error and clears loading', () => {
    useResultsStore.getState().setLoading(true);

    useResultsStore.getState().setError('Simulation failed');

    const state = useResultsStore.getState();
    expect(state.error).toBe('Simulation failed');
    expect(state.loading).toBe(false);
  });

  it('clears all state', () => {
    useResultsStore.getState().setResult(mockResult);
    useResultsStore.getState().setError('error');

    useResultsStore.getState().clear();

    const state = useResultsStore.getState();
    expect(state.result).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
