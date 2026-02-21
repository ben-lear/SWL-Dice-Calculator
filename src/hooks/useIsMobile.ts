import { useSyncExternalStore } from 'react';

const query = '(max-width: 639px)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(query).matches;
}

function getServerSnapshot() {
  return false; // SSR fallback: assume desktop
}

/** Returns true when the viewport is below the sm: breakpoint (< 640px). */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
