import { useState, useEffect, type RefObject } from 'react';

export interface DynamicDividerProps {
  /** Ref to the panel element on the left side of the divider */
  leftRef: RefObject<HTMLDivElement | null>;
  /** Ref to the panel element on the right side of the divider */
  rightRef: RefObject<HTMLDivElement | null>;
  /** Additional CSS classes (e.g., responsive visibility) */
  className?: string;
}

/**
 * A vertical divider line between two panels whose height dynamically
 * adjusts to min(leftPanel.height, rightPanel.height) using ResizeObserver.
 */
export default function DynamicDivider({ leftRef, rightRef, className = '' }: DynamicDividerProps) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const update = () => {
      const leftH = leftRef.current?.offsetHeight ?? 0;
      const rightH = rightRef.current?.offsetHeight ?? 0;
      setHeight(Math.min(leftH, rightH));
    };

    const observer = new ResizeObserver(update);
    if (leftRef.current) observer.observe(leftRef.current);
    if (rightRef.current) observer.observe(rightRef.current);
    update();

    return () => observer.disconnect();
  }, [leftRef, rightRef]);

  return (
    <div
      className={`w-px flex-shrink-0 bg-gray-800 ${className}`}
      style={{ height: `${height}px` }}
    />
  );
}
