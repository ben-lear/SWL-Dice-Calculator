import { useState } from 'react';

export interface SectionHeaderProps {
  /** Section title text */
  title: string;
  /** Content to show/hide */
  children: React.ReactNode;
  /** Whether the section starts expanded (default: true) */
  defaultExpanded?: boolean;
}

export default function SectionHeader({
  title,
  children,
  defaultExpanded = true,
}: SectionHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-t border-gray-800 pt-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between py-2 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {title}
        </span>
        <span
          className={`text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      <div
        className={`transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="space-y-2 pb-1">
          {children}
        </div>
      </div>
    </div>
  );
}
