import { useState, type ReactNode } from 'react';
import type { SegmentedControlOption } from './SegmentedControl';

export const MODE_OPTIONS: SegmentedControlOption<'custom' | 'unit-builder'>[] = [
  { value: 'custom', label: 'Custom Pool' },
  { value: 'unit-builder', label: 'Unit Builder' },
];

export interface PanelShellProps {
  title: string;
  children: ReactNode;
  /** Enable collapse/expand toggle on the panel header. Default: false */
  collapsible?: boolean;
  /** Whether the panel starts expanded. Default: true */
  defaultExpanded?: boolean;
}

export default function PanelShell({
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
}: PanelShellProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const headerContent = (
    <>
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">{title}</h2>
      {collapsible && (
        <span
          className={`text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      )}
    </>
  );

  return (
    <div className="flex flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 lg:max-h-[calc(100vh-5rem)]">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className="flex w-full items-center justify-between text-left"
          >
            {headerContent}
          </button>
        ) : (
          headerContent
        )}
      </div>

      <div
        className={`transition-all duration-200 ease-in-out ${
          collapsible && !isExpanded
            ? 'max-h-0 opacity-0 overflow-hidden'
            : 'max-h-[5000px] opacity-100 overflow-visible'
        }`}
      >
        <div className="space-y-4 px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
