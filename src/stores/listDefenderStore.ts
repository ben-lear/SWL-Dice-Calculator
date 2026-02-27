/**
 * List Analyzer Defender Store — independent defense config for the list
 * analyzer's defender profile. Completely isolated from the main simulator's
 * useDefenseConfigStore.
 */

import { createDefenseStore } from './defenseConfigStore';

export const useListDefenderStore = createDefenseStore();

/** @internal Test cleanup */
export function _clearListDefenderSnapshot() {
  const fn = (useListDefenderStore as unknown as Record<string, (() => void) | undefined>)._clearSnapshot;
  fn?.();
}
