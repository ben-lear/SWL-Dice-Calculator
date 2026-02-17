import { useEffect, useRef } from 'react';
import { getFullConfig } from '../stores/configSelectors';
import { useResultsStore } from '../stores/resultsStore';
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
 * - Writes results to the ResultsStore
 * - Skips simulation when dice pool is empty
 *
 * Note: Staleness tracking is handled by the consuming component by comparing
 * config changes manually or through user interaction patterns.
 *
 * Usage: Call once in the ResultsPanel and use the returned function.
 *
 * ```tsx
 * function ResultsPanel() {
 *   const { runSimulation } = useSimulation();
 *   const { result, loading, error, stale } = useResultsStore();
 *
 *   return (
 *     <button onClick={runSimulation}>Run Simulation</button>
 *   );
 * }
 * ```
 */
export function useSimulation(): { runSimulation: () => void } {
  const { result, setResult, setLoading, setError, clear, markStale } = useResultsStore();
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
  useEffect(() => {
    const unsubAttack = useAttackConfigStore.subscribe(() => {
      if (result !== null) {
        markStale();
      }
    });

    const unsubDefense = useDefenseConfigStore.subscribe(() => {
      if (result !== null) {
        markStale();
      }
    });

    const unsubAttackType = useAttackTypeStore.subscribe(() => {
      if (result !== null) {
        markStale();
      }
    });

    return () => {
      unsubAttack();
      unsubDefense();
      unsubAttackType();
    };
  }, [result, markStale]);

  /**
   * Imperatively run the simulation with the current config snapshot.
   * Called when the user clicks the "Run Simulation" button.
   */
  const runSimulation = async () => {
    // Read current config (non-reactive snapshot)
    const currentConfig = getFullConfig();

    // Skip simulation if no dice configured
    if (!hasDice(currentConfig)) {
      clear();
      return;
    }

    if (!workerRef.current) return;

    setLoading(true);

    try {
      const simResult = await workerRef.current.run(currentConfig, DEFAULT_ITERATIONS);
      setError(null); // Clear any previous error on success
      setResult(simResult); // setResult also clears stale flag
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return { runSimulation };
}
