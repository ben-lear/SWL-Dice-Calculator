import { useSimulation } from '../../hooks/useSimulation';
import { useResultsStore } from '../../stores/resultsStore';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import CoreStats from './CoreStats';
import WoundDistributionChart from './WoundDistributionChart';
import CumulativeTable from './CumulativeTable';
import SecondaryStats from './SecondaryStats';
import EfficiencyDisplay from './EfficiencyDisplay';
import EmptyState from './EmptyState';
import LoadingOverlay from './LoadingOverlay';
import ErrorDisplay from './ErrorDisplay';

export default function ResultsPanel() {
  // Get imperative simulation trigger
  const { runSimulation } = useSimulation();

  // Read results from store
  const result = useResultsStore((s) => s.result);
  const loading = useResultsStore((s) => s.loading);
  const error = useResultsStore((s) => s.error);
  const stale = useResultsStore((s) => s.stale);

  // Read guardian state for secondary stats
  const guardianActive = useDefenseConfigStore((s) => s.guardianX > 0);

  return (
    <div className="relative flex flex-col gap-4 rounded-xl bg-gray-900 p-4">
      {/* Panel Header */}
      <h2 className="text-center text-lg font-bold text-gray-100">
        Results
      </h2>

      {/* Run Simulation Button */}
      <button
        onClick={runSimulation}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
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
            Simulating...
          </>
        ) : (
          'Run Simulation'
        )}
      </button>

      {/* Stale results indicator */}
      {stale && result && (
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
          <span>Config changed — results may be outdated. Click Run to update.</span>
        </div>
      )}

      {/* Duration indicator (subtle, top-right) */}
      {result && !loading && (
        <div className="absolute right-4 top-4 text-xs text-gray-600">
          {new Intl.NumberFormat('en-US').format(result.iterations)} sims · {result.durationMs.toFixed(0)}ms
        </div>
      )}

      {/* Loading overlay (shown on top of existing results) */}
      <LoadingOverlay visible={loading} />

      {/* Error state */}
      {error && !loading && <ErrorDisplay message={error} />}

      {/* Empty state (no results yet and no error) */}
      {!result && !error && !loading && <EmptyState />}

      {/* Results content */}
      {result && !error && (
        <div className="flex flex-col gap-4">
          {/* Core stats: Mean / Median / Mode */}
          <CoreStats stats={result.totalWounds} />

          {/* Wound distribution bar chart */}
          <WoundDistributionChart
            distribution={result.totalWoundsDistribution}
            mode={result.totalWounds.mode}
          />

          {/* Cumulative probability table */}
          <CumulativeTable
            distribution={result.totalWoundsDistribution}
          />

          {/* Secondary stats (Deflect, Djem So, Guardian) */}
          <SecondaryStats
            result={result}
            guardianActive={guardianActive}
          />

          {/* Points efficiency (shown when any unit cost > 0) */}
          <EfficiencyDisplay efficiency={result.efficiency} />
        </div>
      )}
    </div>
  );
}
