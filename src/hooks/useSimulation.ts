import { useEffect, useRef } from 'react';
import { useFullConfig } from '../stores/configSelectors';
import { useResultsStore } from '../stores/resultsStore';
import { SimulationWorkerClient } from '../engine/worker/simulationWorkerClient';
import { DEFAULT_ITERATIONS } from '../engine/simulator';
import type { AttackConfig } from '../engine/types';

/** Debounce delay in milliseconds before triggering a simulation */
const DEBOUNCE_MS = 300;

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
 * Hook that auto-runs Monte Carlo simulation when config changes.
 *
 * - Subscribes to the merged AttackConfig via useFullConfig()
 * - Debounces changes (300ms) to avoid excessive worker dispatches
 * - Dispatches to the SimulationWorkerClient (off main thread)
 * - Writes results to the ResultsStore
 * - Skips simulation when dice pool is empty
 *
 * Usage: Call once in the App shell or ResultsPanel. No arguments needed.
 *
 * ```tsx
 * function ResultsPanel() {
 *   useSimulation();
 *   const { result, loading, error } = useResultsStore();
 *   // ... render
 * }
 * ```
 */
export function useSimulation(): void {
  const config = useFullConfig();
  const { setResult, setLoading, setError, clear } = useResultsStore();
  const workerRef = useRef<SimulationWorkerClient | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize worker on mount, terminate on unmount
  useEffect(() => {
    workerRef.current = new SimulationWorkerClient();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Run simulation whenever config changes (debounced)
  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }

    // Skip simulation if no dice configured
    if (!hasDice(config)) {
      clear();
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (!workerRef.current) return;

      setLoading(true);

      try {
        const result = await workerRef.current.run(config, DEFAULT_ITERATIONS);
        setError(null); // Clear any previous error on success
        setResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }, DEBOUNCE_MS);

    // Cleanup debounce on re-render or unmount
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [config, setResult, setLoading, setError, clear]);
}
