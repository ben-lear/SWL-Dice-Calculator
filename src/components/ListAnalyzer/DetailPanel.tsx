import { useListStore } from '../../stores/listStore';
import ArmyStatsView from './ArmyStatsView';
import UnitDetailView from './UnitDetailView';

/**
 * Right-side detail panel: shows army stats overview, individual unit
 * detail, or an empty state prompt depending on store selection.
 */
export default function DetailPanel() {
  const resolvedList = useListStore((s) => s.resolvedList);
  const selectedIndex = useListStore((s) => s.selectedUnitIndex);
  const showArmyStats = useListStore((s) => s.showArmyStats);
  const showArmyOverview = useListStore((s) => s.showArmyOverview);

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

  // Army-level stats view
  if (showArmyStats) {
    return <ArmyStatsView stats={resolvedList.stats} meta={resolvedList.meta} />;
  }

  // Individual unit selected
  if (
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < resolvedList.units.length
  ) {
    const unit = resolvedList.units[selectedIndex];
    return (
      <UnitDetailView unit={unit} onBackToArmy={() => showArmyOverview()} />
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
