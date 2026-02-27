import { useEffect, useRef, useCallback } from 'react';
import { useListStore } from '../stores/listStore';
import { useListDefenderStore } from '../stores/listDefenderStore';
import { selectDefenderConfig } from '../stores/defenseConfigStore';
import { BatchSimulationClient } from '../engine/worker/batchSimulationClient';
import {
  buildListSimulationJobs,
  aggregateSimulatedArmyStats,
} from '../data/armyStats';
import type { RangeBandDice } from '../data/listTypes';

/**
 * Hook that manages the batch simulation lifecycle for the List Analyzer.
 *
 * - Creates/cleans up a BatchSimulationClient (Web Worker)
 * - Exposes `runSimulation()` for triggering simulation on demand
 * - Marks results as stale when defender config changes
 * - Writes results to the list store
 */
export function useListAnalyzerSimulation(): { runSimulation: () => void } {
  const workerRef = useRef<BatchSimulationClient | null>(null);

  const {
    resolvedList,
    setSimulatedResults,
    setSimulationLoading,
    setSimulationError,
    markSimulationStale,
  } = useListStore();

  // Initialize worker on mount, terminate on unmount
  useEffect(() => {
    workerRef.current = new BatchSimulationClient();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Mark stale when defender config changes (only if we have results)
  useEffect(() => {
    const unsub = useListDefenderStore.subscribe(() => {
      if (useListStore.getState().simulatedStats !== null) {
        markSimulationStale();
      }
    });
    return unsub;
  }, [markSimulationStale]);

  const runSimulation = useCallback(async () => {
    if (!resolvedList || !workerRef.current) return;

    const units = resolvedList.units;
    if (units.length === 0) return;

    // Snapshot defender config at call time
    const defenderConfig = selectDefenderConfig(useListDefenderStore.getState());

    // Build batch jobs
    const { jobs, jobMapping, diceCounts } = buildListSimulationJobs(
      units,
      defenderConfig,
    );

    if (jobs.length === 0) {
      // No dice to simulate — clear results
      setSimulationError(null);
      setSimulationLoading(false);
      return;
    }

    setSimulationLoading(true);
    setSimulationError(null);

    try {
      const resultMap = await workerRef.current.runBatch(jobs);

      // Map simulation results back to per-unit dice data
      const perUnitDice = new Map<number, RangeBandDice[]>();

      for (const [unitIndex, bandMap] of jobMapping.entries()) {
        const skeleton = diceCounts.get(unitIndex);
        if (!skeleton) continue;

        const filledBands: RangeBandDice[] = skeleton.map((band) => {
          const ids = bandMap.get(band.rangeBand);
          if (!ids) return band;

          const stdResult = resultMap.get(ids.stdJobId);
          const adjResult = resultMap.get(ids.adjJobId);

          return {
            ...band,
            expectedSuccesses: stdResult?.totalWounds.mean ?? 0,
            adjustedExpectedSuccesses: adjResult?.totalWounds.mean ?? 0,
            attackingEfficacy:
              band.totalDice > 0
                ? (stdResult?.totalWounds.mean ?? 0) / band.totalDice
                : 0,
          };
        });

        perUnitDice.set(unitIndex, filledBands);
      }

      // Aggregate army-level stats from simulation results
      const stats = aggregateSimulatedArmyStats(
        units,
        perUnitDice,
        {
          commandCards: resolvedList.meta?.listLink ? undefined : undefined,
        },
      );

      // Preserve command cards + contingencies from the parsed list
      stats.commandCards = resolvedList.stats.commandCards;
      stats.contingencies = resolvedList.stats.contingencies;

      setSimulatedResults(stats, perUnitDice);
    } catch (err) {
      setSimulationError(
        err instanceof Error ? err.message : String(err),
      );
    }
  }, [resolvedList, setSimulatedResults, setSimulationLoading, setSimulationError]);

  // Stable ref so the auto-simulate effect doesn't re-fire on every render
  const runSimulationRef = useRef(runSimulation);
  useEffect(() => {
    runSimulationRef.current = runSimulation;
  }, [runSimulation]);

  // Auto-simulate when a new list is imported
  const resolvedListRef = useRef(resolvedList);
  useEffect(() => {
    if (resolvedList && resolvedList !== resolvedListRef.current) {
      resolvedListRef.current = resolvedList;
      // Defer to next tick so the store state is fully settled
      const timer = setTimeout(() => {
        runSimulationRef.current();
      }, 0);
      return () => clearTimeout(timer);
    }
    if (!resolvedList) {
      resolvedListRef.current = null;
    }
  }, [resolvedList]);

  return { runSimulation };
}
