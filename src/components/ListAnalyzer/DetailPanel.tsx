import { useListStore } from '../../stores/listStore';
import ArmyStatsView from './ArmyStatsView';
import UnitDetailView from './UnitDetailView';

/** Stale results warning banner — mirrors the pattern in ResultsPanel */
function StaleNotification() {
  return (
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
      <span>Defender profile changed — simulation results may be outdated. Click Re-Analyze to update.</span>
    </div>
  );
}

/**
 * Right-side detail panel: shows army stats overview, individual unit
 * detail, or an empty state prompt depending on store selection.
 *
 * When simulation results are available, prefers those over the
 * deterministic estimates in resolvedList.stats.
 */
export default function DetailPanel() {
  const resolvedList = useListStore((s) => s.resolvedList);
  const selectedIndex = useListStore((s) => s.selectedUnitIndex);
  const showArmyStats = useListStore((s) => s.showArmyStats);
  const showArmyOverview = useListStore((s) => s.showArmyOverview);
  const simulatedStats = useListStore((s) => s.simulatedStats);
  const simulatedUnitResults = useListStore((s) => s.simulatedUnitResults);
  const simulationLoading = useListStore((s) => s.simulationLoading);
  const simulationStale = useListStore((s) => s.simulationStale);

  // No list imported — empty state
  if (!resolvedList) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <p className="text-center text-sm">
          Import a list to see army stats and unit details.
        </p>
      </div>
    );
  }

  // Use simulation stats when available, fall back to deterministic
  const activeStats = simulatedStats ?? resolvedList.stats;

  // Stale banner shown for both army and unit views
  const staleBanner = simulationStale && simulatedStats !== null && !simulationLoading
    ? <StaleNotification />
    : null;

  // Army-level stats view
  if (showArmyStats) {
    return (
      <div className="space-y-3">
        {staleBanner}
        <ArmyStatsView
          stats={activeStats}
          meta={resolvedList.meta}
          isSimulated={simulatedStats !== null}
          isLoading={simulationLoading}
        />
      </div>
    );
  }

  // Individual unit selected
  if (
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < resolvedList.units.length
  ) {
    const unit = resolvedList.units[selectedIndex];
    const unitSimDice = simulatedUnitResults?.get(selectedIndex) ?? null;
    return (
      <div className="space-y-3">
        {staleBanner}
        <UnitDetailView
          unit={unit}
          armyStats={activeStats}
          onBackToArmy={() => showArmyOverview()}
          simulatedDice={unitSimDice}
          isSimulated={simulatedStats !== null}
          isLoading={simulationLoading}
        />
      </div>
    );
  }

  // Fallback — prompt to select
  return (
    <div className="flex h-full items-center justify-center text-gray-500">
      <p className="text-center text-sm">
        Select a unit or view army stats.
      </p>
    </div>
  );
}
