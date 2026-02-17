import { useAttackConfigStore } from './attackConfigStore';
import { useDefenseConfigStore } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';
import { useResultsStore } from './resultsStore';

/**
 * Reset all stores to factory defaults.
 * Clears all results and form data.
 * 
 * This utility coordinates cross-store resets for the "Reset All" button.
 */
export function resetAll(): void {
  useAttackConfigStore.getState().reset();
  useDefenseConfigStore.getState().reset();
  useAttackTypeStore.getState().reset();
  useResultsStore.getState().clearAll();
}
