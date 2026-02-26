import { useState, useCallback } from 'react';
import { CollapseChevron } from './CollapseChevron';

export interface SectionHeaderProps {
  /** Section title text */
  title: string;
  /** Content to show/hide */
  children: React.ReactNode;
  /** Whether the section starts expanded (default: true) */
  defaultExpanded?: boolean;
  /** Optional tooltip shown on hover over the section title */
  tooltip?: string;
}

export default function SectionHeader({
  title,
  children,
  defaultExpanded = true,
  tooltip,
}: SectionHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleToggle = useCallback(() => {
    setIsTransitioning(true);
    setIsExpanded((prev) => !prev);
  }, []);

  const handleTransitionEnd = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  // overflow-hidden during collapse or while transitioning; overflow-visible when fully expanded
  const overflowClass =
    !isExpanded ? 'overflow-hidden' : isTransitioning ? 'overflow-hidden' : 'overflow-visible';

  return (
    <div className="border-t border-gray-800 pt-2">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between py-2 text-left"
      >
        <span className={`section-heading ${tooltip ? 'cursor-help' : ''}`} title={tooltip}>
          {title}
        </span>
        <CollapseChevron isExpanded={isExpanded} />
      </button>
      <div
        onTransitionEnd={handleTransitionEnd}
        className={`${overflowClass} transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-2 pb-1">
          {children}
        </div>
      </div>
    </div>
  );
}
