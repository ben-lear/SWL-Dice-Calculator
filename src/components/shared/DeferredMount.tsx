import { useState, useEffect, type ReactNode } from 'react';

export interface DeferredMountProps {
  children: ReactNode;
}

/**
 * Defers rendering of children by one animation frame.
 *
 * Useful when a child component (e.g. Recharts' ResponsiveContainer)
 * measures its parent on mount — deferring by one frame ensures the
 * parent container has been painted with real dimensions first.
 */
export default function DeferredMount({ children }: DeferredMountProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return ready ? <>{children}</> : null;
}
