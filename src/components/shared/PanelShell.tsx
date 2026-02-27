import { useState, useRef, useCallback, type ReactNode } from 'react';
import { CollapseChevron } from './CollapseChevron';
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
  /** Optional content rendered at the right edge of the header row */
  headerRight?: ReactNode;
}

export default function PanelShell({
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
  headerRight,
}: PanelShellProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  // Track whether the expand/collapse transition is in progress
  const [isTransitioning, setIsTransitioning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setIsTransitioning(true);
    setIsExpanded((prev) => !prev);
  }, []);

  const handleTransitionEnd = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  // overflow-hidden during collapse or while transitioning; overflow-visible when fully expanded
  const overflowClass =
    collapsible && !isExpanded ? 'overflow-hidden' : isTransitioning ? 'overflow-hidden' : 'overflow-visible';

  const headerContent = (
    <>
      <h2 className="section-heading">{title}</h2>
      {collapsible && (
        <CollapseChevron isExpanded={isExpanded} />
      )}
    </>
  );

  return (
    <div className="flex flex-col overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 lg:max-h-[calc(100vh-5rem)]">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        {collapsible ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={isExpanded}
            className="flex w-full items-center justify-between text-left"
          >
            {headerContent}
          </button>
        ) : (
          <div className="flex items-center justify-between">
            {headerContent}
            {headerRight && <div className="ml-auto">{headerRight}</div>}
          </div>
        )}
      </div>

      <div
        ref={contentRef}
        onTransitionEnd={handleTransitionEnd}
        className={`${overflowClass} transition-all duration-200 ease-in-out ${
          collapsible && !isExpanded
            ? 'max-h-0 opacity-0'
            : 'max-h-[5000px] opacity-100'
        }`}
      >
        <div className="space-y-4 px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
