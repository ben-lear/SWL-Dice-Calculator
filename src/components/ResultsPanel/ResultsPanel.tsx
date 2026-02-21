import { useState, useEffect } from 'react';
import { useSimulation } from '../../hooks/useSimulation';
import { useResultsStore, selectIsFull, selectViewedSlot } from '../../stores/resultsStore';
import { resetAll } from '../../stores/resetAll';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import { SlotSelector } from './SlotSelector';
import CoreStats from './CoreStats';
import WoundDistributionChart from './WoundDistributionChart';
import CumulativeTable from './CumulativeTable';
import SecondaryStats from './SecondaryStats';
import EfficiencyDisplay from './EfficiencyDisplay';
import EmptyState from './EmptyState';
import LoadingOverlay from './LoadingOverlay';
import ErrorDisplay from './ErrorDisplay';
import PreDefenseStats from './PreDefenseStats';

export default function ResultsPanel() {
  // Get imperative simulation trigger
  const { runSimulation } = useSimulation();

  // Read results from store
  const slots = useResultsStore((s) => s.slots);
  const viewedSlotId = useResultsStore((s) => s.viewedSlotId);
  const loading = useResultsStore((s) => s.loading);
  const error = useResultsStore((s) => s.error);
  const stale = useResultsStore((s) => s.stale);
  const isFull = useResultsStore(selectIsFull);

  // Store actions
  const setViewedSlotId = useResultsStore((s) => s.setViewedSlotId);
  const removeSlot = useResultsStore((s) => s.removeSlot);
  const renameSlot = useResultsStore((s) => s.renameSlot);

  // Derived: viewed slot
  const viewedSlot = useResultsStore(selectViewedSlot);

  // Read guardian state for secondary stats
  const guardianActive = useDefenseConfigStore((s) => s.guardianX > 0);

  // Reset All confirmation state
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Clear Results confirmation state
  const [confirmingClearResults, setConfirmingClearResults] = useState(false);

  // Reset confirmation timeout (2 seconds)
  useEffect(() => {
    if (!confirmingReset) return;

    const timeout = setTimeout(() => {
      setConfirmingReset(false);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [confirmingReset]);

  // Clear Results confirmation timeout (2 seconds)
  useEffect(() => {
    if (!confirmingClearResults) return;
    const timeout = setTimeout(() => setConfirmingClearResults(false), 2000);
    return () => clearTimeout(timeout);
  }, [confirmingClearResults]);

  // Handle Clear Results button (results only, preserves config)
  const handleClearResults = () => {
    if (!confirmingClearResults) {
      setConfirmingClearResults(true);
    } else {
      useResultsStore.getState().clearAll();
      setConfirmingClearResults(false);
    }
  };

  // Handle Reset All button
  const handleResetAll = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
    } else {
      resetAll();
      setConfirmingReset(false);
    }
  };

  // Button label logic
  const getRunButtonLabel = (): string => {
    if (loading) return 'Simulating...';
    if (slots.length === 0) return 'Run Simulation';
    return 'Add Simulation';
  };

  // Build series arrays for chart and table
  const chartSeries = slots.map((slot) => ({
    label: slot.label,
    distribution: slot.result.totalWoundsDistribution,
    color: slot.color,
    mode: slot.result.totalWounds.mode,
  }));

  const tableSeries = slots.map((slot) => ({
    label: slot.label,
    distribution: slot.result.totalWoundsDistribution,
    color: slot.color,
  }));

  return (
    <div className="relative flex flex-col gap-4 rounded-xl bg-gray-900 p-4">
      {/* Panel Header */}
      <h2 className="text-center text-lg font-bold text-gray-100">
        Results
      </h2>

      {/* Action buttons: Run/Add Simulation + Clear Results + Clear All */}
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <button
          onClick={runSimulation}
          disabled={loading || isFull}
          className="w-full sm:w-auto sm:flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
        >
          {loading ? (
            <>
              <svg
                className="h-5 w-5 animate-spin text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {getRunButtonLabel()}
            </>
          ) : (
            getRunButtonLabel()
          )}
        </button>

        <button
          onClick={handleClearResults}
          disabled={loading || slots.length === 0}
          className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 ${
            confirmingClearResults
              ? 'bg-amber-700 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-amber-700 hover:text-white'
          }`}
        >
          {confirmingClearResults ? 'Confirm?' : 'Clear Results'}
        </button>

        <button
          onClick={handleResetAll}
          disabled={loading}
          className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 ${
            confirmingReset
              ? 'bg-red-700 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-red-700 hover:text-white'
          }`}
        >
          {confirmingReset ? 'Confirm?' : 'Clear All'}
        </button>
      </div>

      {/* Max slots hint */}
      {isFull && !loading && (
        <div className="text-xs text-gray-500 text-center -mt-2">
          Remove a result to run another.
        </div>
      )}

      {/* Stale results indicator */}
      {stale && slots.length > 0 && (
        <div className="flex items-center gap-2 rounded border border-amber-700/50 bg-amber-900/30 px-3 py-2 text-sm text-amber-400">
          <svg
            className="h-5 w-5 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>Config changed — results may be outdated. Click Add to run with new config.</span>
        </div>
      )}

      {/* Duration indicator (for viewed slot) */}
      {viewedSlot && !loading && (
        <div className="absolute right-4 top-4 text-xs text-gray-600">
          {new Intl.NumberFormat('en-US').format(viewedSlot.result.iterations)} sims · {viewedSlot.result.durationMs.toFixed(0)}ms
        </div>
      )}

      {/* Loading overlay (shown on top of existing results) */}
      <LoadingOverlay visible={loading} />

      {/* Error state */}
      {error && !loading && <ErrorDisplay message={error} />}

      {/* Empty state (no results yet and no error) */}
      {slots.length === 0 && !error && !loading && <EmptyState />}

      {/* Results content */}
      {slots.length > 0 && !error && (
        <div className="flex flex-col gap-4">
          {/* Slot selector chips */}
          <SlotSelector
            slots={slots}
            viewedSlotId={viewedSlotId}
            onSelect={setViewedSlotId}
            onRemove={removeSlot}
            onRename={renameSlot}
          />

          {/* Wound distribution bar chart (multi-series) */}
          <WoundDistributionChart series={chartSeries} />

          {/* Cumulative probability table (multi-column) */}
          <CumulativeTable series={tableSeries} />

          {/* Detail stats for viewed slot */}
          {viewedSlot && (
            <>
              {/* Viewed slot label */}
              <div className="text-sm text-gray-400 border-t border-gray-700 pt-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
                  Stats at a Glance
                </h2>
              </div>             

              {/* Viewed slot label */}
              <div className="text-sm text-gray-400">
                Viewing: <span className="text-gray-200 font-medium">{viewedSlot.label}</span>
              </div>

              {/* Pre-defense results */}
              <PreDefenseStats
                hitsBeforeDefense={viewedSlot.result.hitsBeforeDefense}
                critsBeforeDefense={viewedSlot.result.critsBeforeDefense}
                accentColor={viewedSlot.color}
              />

              {/* Post-defense results sub-header */}
              <h3 className="section-heading">
                Post-defense results
              </h3>

              {/* Core stats: Mean / Median / Mode */}
              <CoreStats
                stats={viewedSlot.result.totalWounds}
                accentColor={viewedSlot.color}
              />

              {/* Secondary stats (Deflect, Djem So, Guardian) */}
              <SecondaryStats
                result={viewedSlot.result}
                guardianActive={guardianActive}
              />

              {/* Points efficiency (shown when any unit cost > 0) */}
              <EfficiencyDisplay efficiency={viewedSlot.result.efficiency} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
