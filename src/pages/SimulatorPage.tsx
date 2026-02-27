import { useRef } from 'react';
import { AttackerPanel, DefenderPanel, ResultsPanel } from '../components';
import DynamicDivider from '../components/shared/DynamicDivider';

export default function SimulatorPage() {
  const attackerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const defenderRef = useRef<HTMLDivElement>(null);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2 md:gap-0 md:divide-x md:divide-gray-800 lg:grid-cols-[5fr_auto_6fr_auto_5fr] lg:gap-0 lg:divide-x-0 lg:items-start">
      <div ref={attackerRef} className="order-1 flex min-h-0 flex-col lg:pr-4">
        <div className="flex-1 overflow-y-auto">
          <AttackerPanel />
        </div>
      </div>

      <DynamicDivider leftRef={attackerRef} rightRef={resultsRef} className="hidden lg:block lg:order-2" />

      <div ref={resultsRef} className="order-3 flex min-h-0 flex-col md:col-span-2 lg:order-3 lg:col-span-1 lg:px-4">
        <div className="flex-1 overflow-y-auto">
          <ResultsPanel />
        </div>
      </div>

      <DynamicDivider leftRef={resultsRef} rightRef={defenderRef} className="hidden lg:block lg:order-4" />

      <div ref={defenderRef} className="order-2 flex min-h-0 flex-col lg:order-5 lg:pl-4">
        <div className="flex-1 overflow-y-auto">
          <DefenderPanel />
        </div>
      </div>
    </div>
  );
}
