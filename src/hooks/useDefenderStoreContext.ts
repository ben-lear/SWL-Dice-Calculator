/**
 * React context for defender store injection — allows the DefenderPanel
 * component tree to be wired to either the main simulator's defense store
 * or the list analyzer's independent defense store.
 *
 * Placed in src/hooks/ (not src/components/) to avoid a reverse dependency:
 * useKeywordDisabled.ts needs useDisableAttackTypeRestrictions, and hooks
 * should not depend on component-layer modules.
 */

import { createContext, useContext } from 'react';
import { useDefenseConfigStore } from '../stores/defenseConfigStore';
import type { DefenseConfigState } from '../stores/defenseConfigStore';
import type { StoreApi, UseBoundStore } from 'zustand';

export interface DefenderStoreContextValue {
  useStore: UseBoundStore<StoreApi<DefenseConfigState>>;
  disableAttackTypeRestrictions?: boolean;
}

/**
 * Default context points to the main simulator's defense store.
 * Components that are not wrapped in a provider automatically use
 * useDefenseConfigStore — no change needed for the main simulator page.
 */
export const DefenderStoreContext = createContext<DefenderStoreContextValue>({
  useStore: useDefenseConfigStore,
  disableAttackTypeRestrictions: false,
});

/**
 * Hook: returns the full defense store state from the context-provided store.
 * Matches the existing `const store = useDefenseConfigStore()` pattern used
 * in DefenderPanel component files.
 */
export function useDefenderStore(): DefenseConfigState {
  const { useStore } = useContext(DefenderStoreContext);
  return useStore();
}

/**
 * Hook: returns the Zustand store API (for .getState(), .subscribe(), etc.)
 * from the context-provided store.
 */
export function useDefenderStoreApi(): UseBoundStore<StoreApi<DefenseConfigState>> {
  const { useStore } = useContext(DefenderStoreContext);
  return useStore;
}

/**
 * Hook: returns whether attack-type restrictions should be disabled
 * for the current context. In the list analyzer, all defender keywords
 * remain enabled regardless of attack type.
 */
export function useDisableAttackTypeRestrictions(): boolean {
  const { disableAttackTypeRestrictions } = useContext(DefenderStoreContext);
  return disableAttackTypeRestrictions ?? false;
}
