import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSimulation } from './useSimulation';
import { useAttackConfigStore } from '../stores/attackConfigStore';
import { useResultsStore } from '../stores/resultsStore';
import type { SimulationResult } from '../engine/types';

// ============================================================================
// Mock Web Worker Client
// ============================================================================

const { mockRun, mockTerminate } = vi.hoisted(() => {
  return {
    mockRun: vi.fn(),
    mockTerminate: vi.fn(),
  };
});

vi.mock('../engine/worker/simulationWorkerClient', () => {
  class MockSimulationWorkerClient {
    run = mockRun;
    terminate = mockTerminate;
  }

  return {
    SimulationWorkerClient: MockSimulationWorkerClient,
  };
});

// ============================================================================
// Mock Result Factory
// ============================================================================

function createMockResult(overrides?: Partial<SimulationResult>): SimulationResult {
  return {
    iterations: 10000,
    durationMs: 100,
    totalWounds: { mean: 3, median: 3, mode: 3, min: 0, max: 6, standardDeviation: 1.5 },
    totalWoundsDistribution: [{ wounds: 0, count: 0, probability: 0, cumulative: 1 }],
    guardianWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
    guardianWoundsDistribution: [{ wounds: 0, count: 10000, probability: 1, cumulative: 1 }],
    mainTargetWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
    mainTargetWoundsDistribution: [{ wounds: 0, count: 10000, probability: 1, cumulative: 1 }],
    deflectWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
    deflectWoundsDistribution: [{ wounds: 0, count: 10000, probability: 1, cumulative: 1 }],
    djemSoWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
    djemSoWoundsDistribution: [{ wounds: 0, count: 10000, probability: 1, cumulative: 1 }],
    suppressionPerAttack: 1,
    efficiency: {
      attackerWoundsPerPoint: 0,
      attackerPointsPerWound: 0,
      defenderWoundsPerPoint: 0,
      defenderPointsPerWound: 0,
      attackerEfficiencyRatio: 0,
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useSimulation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRun.mockReset();
    mockTerminate.mockReset();
    useAttackConfigStore.getState().reset();
    useResultsStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not run simulation when all weapons have zero dice', () => {
    renderHook(() => useSimulation());

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockRun).not.toHaveBeenCalled();
  });

  it('runs simulation after debounce when dice are configured', async () => {
    mockRun.mockResolvedValue(createMockResult());

    // Set some dice on the first weapon
    act(() => {
      useAttackConfigStore.getState().updateWeapon(0, { redDice: 4 });
    });

    renderHook(() => useSimulation());

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid config changes', async () => {
    renderHook(() => useSimulation());

    // Set initial dice
    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 1);
    });

    // Simulate rapid changes within debounce window
    act(() => {
      vi.advanceTimersByTime(100);
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 2);
    });

    act(() => {
      vi.advanceTimersByTime(100);
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 3);
    });

    act(() => {
      vi.advanceTimersByTime(100);
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    // Now advance past the full debounce from last change
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // Should only run once despite 4 changes
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('terminates worker on unmount', () => {
    const { unmount } = renderHook(() => useSimulation());

    unmount();

    expect(mockTerminate).toHaveBeenCalled();
  });

  it('clears results when all dice are set to zero', () => {
    // Start with dice configured
    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    renderHook(() => useSimulation());

    // Remove all dice
    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 0);
      useAttackConfigStore.getState().setWeaponDice(0, 'black', 0);
      useAttackConfigStore.getState().setWeaponDice(0, 'white', 0);
    });

    // Results should be cleared
    const resultsState = useResultsStore.getState();
    expect(resultsState.result).toBeNull();
  });

  it('sets loading state before running simulation', async () => {
    mockRun.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(createMockResult()), 100)));

    act(() => {
      useAttackConfigStore.getState().updateWeapon(0, { redDice: 4 });
    });

    renderHook(() => useSimulation());

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Should be loading now
    expect(useResultsStore.getState().loading).toBe(true);

    // Complete the async work
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
  });

  it('sets error state when worker throws', async () => {
    const errorMessage = 'Worker crashed';
    mockRun.mockRejectedValue(new Error(errorMessage));

    act(() => {
      useAttackConfigStore.getState().updateWeapon(0, { redDice: 4 });
    });

    renderHook(() => useSimulation());

    // Advance past debounce and let error propagate
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const resultsState = useResultsStore.getState();
    expect(resultsState.error).toBe(errorMessage);
    expect(resultsState.loading).toBe(false);
  });

  it('clears error on successful simulation after previous error', async () => {
    // First simulation fails
    mockRun.mockRejectedValueOnce(new Error('First error'));

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    renderHook(() => useSimulation());

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(useResultsStore.getState().error).toBe('First error');

    // Second simulation succeeds
    mockRun.mockResolvedValueOnce(createMockResult());

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'black', 2);
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const resultsState = useResultsStore.getState();
    expect(resultsState.error).toBeNull();
    expect(resultsState.result).not.toBeNull();
  });
});
