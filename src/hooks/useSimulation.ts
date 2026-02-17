import { useEffect, useRef } from 'react';
import { getFullConfig } from '../stores/configSelectors';
import { useResultsStore, selectIsFull } from '../stores/resultsStore';
import { useAttackConfigStore } from '../stores/attackConfigStore';
import { useDefenseConfigStore } from '../stores/defenseConfigStore';
import { useAttackTypeStore } from '../stores/attackTypeStore';
import { SimulationWorkerClient } from '../engine/worker/simulationWorkerClient';
import { DEFAULT_ITERATIONS } from '../engine/simulator';
import type { AttackConfig } from '../engine/types';

/**
 * Check whether the attack config has any dice to roll.
 * If all dice counts are zero, simulation is skipped.
 */
function hasDice(config: AttackConfig): boolean {
  return config.attacker.weapons.some(
    (weapon) => weapon.redDice > 0 || weapon.blackDice > 0 || weapon.whiteDice > 0
  );
}

/**
 * Hook that provides imperative simulation control (button-triggered).
 *
 * - Manages the SimulationWorkerClient lifecycle
 * - Exposes a `runSimulation()` function to trigger simulation on-demand
 * - Appends results to the ResultsStore (multi-slot model)
 * - Skips simulation when dice pool is empty or max slots reached
 *
 * Note: Staleness tracking is handled by subscribing to config changes.
 *
 * Usage: Call once in the ResultsPanel and use the returned function.
 *
 * ```tsx
 * function ResultsPanel() {
 *   const { runSimulation } = useSimulation();
 *   const { slots, loading, error, stale } = useResultsStore();
 *
 *   return (
 *     <button onClick={runSimulation}>Run Simulation</button>
 *   );
 * }
 * ```
 */
export function useSimulation(): { runSimulation: () => void } {
  const { slots, appendResult, setLoading, setError, clearAll, markStale } = useResultsStore();
  const workerRef = useRef<SimulationWorkerClient | null>(null);

  // Initialize worker on mount, terminate on unmount
  useEffect(() => {
    workerRef.current = new SimulationWorkerClient();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Track staleness: subscribe to all config stores and mark stale when any changes
  // Only mark stale if we have results to compare against
  useEffect(() => {
    const unsubAttack = useAttackConfigStore.subscribe(() => {
      if (slots.length > 0) {
        markStale();
      }
    });

    const unsubDefense = useDefenseConfigStore.subscribe(() => {
      if (slots.length > 0) {
        markStale();
      }
    });

    const unsubAttackType = useAttackTypeStore.subscribe(() => {
      if (slots.length > 0) {
        markStale();
      }
    });

    return () => {
      unsubAttack();
      unsubDefense();
      unsubAttackType();
    };
  }, [slots.length, markStale]);

  /**
   * Imperatively run the simulation with the current config snapshot.
   * Called when the user clicks the "Run Simulation" or "Add Simulation" button.
   */
  const runSimulation = async () => {
    // Read current config (non-reactive snapshot) before dispatch
    const currentConfig = getFullConfig();

    // Skip simulation if no dice configured
    if (!hasDice(currentConfig)) {
      clearAll();
      return;
    }

    // Guard: no-op if already at max slots
    if (selectIsFull(useResultsStore.getState())) {
      return;
    }

    if (!workerRef.current) return;

    setLoading(true);

    try {
      const simResult = await workerRef.current.run(currentConfig, DEFAULT_ITERATIONS);
      setError(null); // Clear any previous error on success
      appendResult(simResult, currentConfig); // appendResult also clears stale flag
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return { runSimulation };
}
