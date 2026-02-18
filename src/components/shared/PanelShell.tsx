import type { ReactNode } from 'react';
import type { SegmentedControlOption } from './SegmentedControl';

export const MODE_OPTIONS: SegmentedControlOption<'custom' | 'unit-builder'>[] = [
  { value: 'custom', label: 'Custom Pool' },
  { value: 'unit-builder', label: 'Unit Builder' },
];

export interface PanelShellProps {
  title: string;
  children: ReactNode;
}

export default function PanelShell({ title, children }: PanelShellProps) {
  return (
    <div className="flex flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 lg:max-h-[calc(100vh-5rem)]" >
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">{title}</h2>
      </div>

      <div className="space-y-4 px-4 py-4">
        {children}
      </div>
    </div>
  );
}
