import { useListStore } from '../../stores/listStore';
import { useListDefenderStore } from '../../stores/listDefenderStore';
import { DefenderStoreContext } from '../../hooks/useDefenderStoreContext';
import { useListAnalyzerSimulation } from '../../hooks/useListAnalyzerSimulation';
import PanelShell from '../shared/PanelShell';
import { DefenderPanelCompact } from '../DefenderPanel';
import JsonImportSection from './JsonImportSection';
import UnitListPanel from './UnitListPanel';
import DetailPanel from './DetailPanel';

/**
 * Context value that wires DefenderPanel components to the list analyzer's
 * independent defense store, with attack-type restrictions disabled.
 */
const LIST_DEFENDER_CONTEXT = {
  useStore: useListDefenderStore,
  disableAttackTypeRestrictions: true,
};

/**
 * List Analyzer page — two-row layout:
 *   Row 1: unit list (left) + detail panel (right)
 *   Row 2: defender profile (full width, collapsible)
 *
 * At small widths, stacks vertically.
 */
export default function ListAnalyzerPage() {
  const resolvedList = useListStore((s) => s.resolvedList);
  const simulationLoading = useListStore((s) => s.simulationLoading);
  const simulationStale = useListStore((s) => s.simulationStale);
  const simulatedStats = useListStore((s) => s.simulatedStats);
  const { runSimulation } = useListAnalyzerSimulation();

  const analyzeButton = resolvedList ? (
    <button
      type="button"
      onClick={runSimulation}
      disabled={simulationLoading}
      className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${
        simulationLoading
          ? 'cursor-not-allowed bg-gray-700 text-gray-400'
          : simulationStale
            ? 'bg-yellow-600 text-white hover:bg-yellow-500'
            : simulatedStats
              ? 'bg-green-700 text-white hover:bg-green-600'
              : 'bg-blue-600 text-white hover:bg-blue-500'
      }`}
    >
      {simulationLoading
        ? 'Analyzing…'
        : simulationStale
          ? 'Re-Analyze'
          : simulatedStats
            ? 'Re-Analyze'
            : 'Analyze'}
    </button>
  ) : null;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Row 1 — Army List + Details */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(280px,1fr)_minmax(320px,2fr)]">
        {/* Left Panel — Import + Unit List */}
        <PanelShell title="Army List">
          <div className="space-y-4">
            <JsonImportSection />
            {resolvedList && <UnitListPanel />}
          </div>
        </PanelShell>

        {/* Right Panel — Detail */}
        <PanelShell title="Details" headerRight={analyzeButton}>
          <DetailPanel />
        </PanelShell>
      </div>

      {/* Row 2 — Defender Profile (full width) */}
      <DefenderStoreContext.Provider value={LIST_DEFENDER_CONTEXT}>
        <PanelShell title="Defender Profile" collapsible defaultExpanded={false}>
          <DefenderPanelCompact />
        </PanelShell>
      </DefenderStoreContext.Provider>
    </div>
  );
}
