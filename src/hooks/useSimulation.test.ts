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
    hitsBeforeDefense: { mean: 2, median: 2, mode: 2, min: 0, max: 5, standardDeviation: 1 },
    critsBeforeDefense: { mean: 1, median: 1, mode: 1, min: 0, max: 3, standardDeviation: 0.5 },
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
    mockRun.mockReset();
    mockTerminate.mockReset();
    useAttackConfigStore.getState().reset();
    useResultsStore.getState().clearAll();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns a runSimulation function', () => {
    const { result } = renderHook(() => useSimulation());
    expect(result.current.runSimulation).toBeInstanceOf(Function);
  });

  it('does not auto-run simulation when config changes', () => {
    renderHook(() => useSimulation());

    // Change config
    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    // Simulation should not have been triggered
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('runs simulation when runSimulation is called with dice configured', async () => {
    mockRun.mockResolvedValue(createMockResult());

    // Set some dice
    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    const { result } = renderHook(() => useSimulation());

    // Manually trigger simulation
    await act(async () => {
      await result.current.runSimulation();
    });

    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(useResultsStore.getState().slots).toHaveLength(1);
  });

  it('clears results when runSimulation is called with no dice', async () => {
    // First, run a simulation with dice
    mockRun.mockResolvedValue(createMockResult());

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    const { result } = renderHook(() => useSimulation());

    await act(async () => {
      await result.current.runSimulation();
    });

    expect(useResultsStore.getState().slots).toHaveLength(1);

    // Now remove all dice
    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 0);
    });

    // Run simulation with no dice
    await act(async () => {
      await result.current.runSimulation();
    });

    // Results should be cleared
    expect(useResultsStore.getState().slots).toHaveLength(0);
  });

  it('sets loading state while simulation is running', async () => {
    mockRun.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(createMockResult()), 100))
    );

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    const { result } = renderHook(() => useSimulation());

    const simulationPromise = act(async () => {
      const promise = result.current.runSimulation();
      // Check loading state immediately after call
      expect(useResultsStore.getState().loading).toBe(true);
      await promise;
    });

    await simulationPromise;

    // After completion, loading should be false
    expect(useResultsStore.getState().loading).toBe(false);
  });

  it('handles simulation errors', async () => {
    const errorMessage = 'Simulation failed';
    mockRun.mockRejectedValue(new Error(errorMessage));

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    const { result } = renderHook(() => useSimulation());

    await act(async () => {
      await result.current.runSimulation();
    });

    expect(useResultsStore.getState().error).toBe(errorMessage);
    expect(useResultsStore.getState().loading).toBe(false);
  });

  it('marks results as stale when attack config changes after a result exists', async () => {
    mockRun.mockResolvedValue(createMockResult());

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    const { result } = renderHook(() => useSimulation());

    // Run initial simulation
    await act(async () => {
      await result.current.runSimulation();
    });

    expect(useResultsStore.getState().stale).toBe(false);

    // Change attack config
    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'black', 2);
    });

    // Results should be marked stale
    expect(useResultsStore.getState().stale).toBe(true);
  });

  it('clears stale flag when simulation completes', async () => {
    mockRun.mockResolvedValue(createMockResult());

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    const { result } = renderHook(() => useSimulation());

    // Run initial simulation
    await act(async () => {
      await result.current.runSimulation();
    });

    // Change config to mark stale
    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'black', 2);
    });

    expect(useResultsStore.getState().stale).toBe(true);

    // Run simulation again
    await act(async () => {
      await result.current.runSimulation();
    });

    // Stale flag should be cleared
    expect(useResultsStore.getState().stale).toBe(false);
  });

  it('writes simulation results to a slot', async () => {
    const mockResult = createMockResult({ totalWounds: { mean: 5, median: 5, mode: 5, min: 0, max: 10, standardDeviation: 2 } });
    mockRun.mockResolvedValue(mockResult);

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    const { result } = renderHook(() => useSimulation());

    await act(async () => {
      await result.current.runSimulation();
    });

    const slots = useResultsStore.getState().slots;
    expect(slots).toHaveLength(1);
    expect(slots[0].result).toEqual(mockResult);
  });

  it('appends multiple results to slots', async () => {
    mockRun.mockResolvedValue(createMockResult());

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    const { result } = renderHook(() => useSimulation());

    await act(async () => {
      await result.current.runSimulation();
    });

    expect(useResultsStore.getState().slots).toHaveLength(1);

    await act(async () => {
      await result.current.runSimulation();
    });

    expect(useResultsStore.getState().slots).toHaveLength(2);
  });

  it('does nothing when store is full (4 slots)', async () => {
    mockRun.mockResolvedValue(createMockResult());

    act(() => {
      useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    });

    const { result } = renderHook(() => useSimulation());

    // Fill to capacity
    await act(async () => {
      await result.current.runSimulation();
      await result.current.runSimulation();
      await result.current.runSimulation();
      await result.current.runSimulation();
    });

    expect(useResultsStore.getState().slots).toHaveLength(4);
    const callCount = mockRun.mock.calls.length;

    // Try to run again
    await act(async () => {
      await result.current.runSimulation();
    });

    // Should not have called the worker again
    expect(mockRun).toHaveBeenCalledTimes(callCount);
    expect(useResultsStore.getState().slots).toHaveLength(4);
  });

  it('terminates worker on unmount', () => {
    const { unmount } = renderHook(() => useSimulation());

    unmount();

    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });
});
