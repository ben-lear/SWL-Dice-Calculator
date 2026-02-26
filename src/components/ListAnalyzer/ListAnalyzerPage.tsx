import { useListStore } from '../../stores/listStore';
import PanelShell from '../shared/PanelShell';
import JsonImportSection from './JsonImportSection';
import UnitListPanel from './UnitListPanel';
import DetailPanel from './DetailPanel';

/**
 * List Analyzer page — two-panel layout:
 *   Left:  unit list (with import section at top)
 *   Right: detail panel (army stats or unit detail)
 *
 * At small widths, stacks vertically.
 */
export default function ListAnalyzerPage() {
  const resolvedList = useListStore((s) => s.resolvedList);

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[minmax(280px,1fr)_minmax(320px,2fr)]">
      {/* Left Panel — Import + Unit List */}
      <PanelShell title="Army List">
        <div className="space-y-4">
          <JsonImportSection />
          {resolvedList && <UnitListPanel />}
        </div>
      </PanelShell>

      {/* Right Panel — Detail */}
      <PanelShell title="Details">
        <DetailPanel />
      </PanelShell>
    </div>
  );
}
