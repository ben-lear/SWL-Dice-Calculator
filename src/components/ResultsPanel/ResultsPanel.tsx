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
  // Wire up the simulation hook (auto-runs on config change)
  useSimulation();

  // Read results from store
  const result = useResultsStore((s) => s.result);
  const loading = useResultsStore((s) => s.loading);
  const error = useResultsStore((s) => s.error);

  // Read guardian state for secondary stats
  const guardianActive = useDefenseConfigStore((s) => s.guardianX > 0);

  return (
    <div className="relative flex flex-col gap-4 rounded-xl bg-gray-900 p-4">
      {/* Panel Header */}
      <h2 className="text-center text-lg font-bold text-gray-100">
        Results
      </h2>

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
