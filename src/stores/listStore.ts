/**
 * List store — Zustand store for the List Analyzer page state.
 * Fifth store in the app's store architecture.
 */

import { create } from 'zustand';
import type { ResolvedList } from '../data/listTypes';
import { parseListJson } from '../data/listParser';

// ============================================================================
// State Interface
// ============================================================================

interface ListState {
  rawJson: string;
  resolvedList: ResolvedList | null;
  parseError: string | null;
  selectedUnitIndex: number | null;
  showArmyStats: boolean;

  importList: (json: string) => void;
  selectUnit: (index: number) => void;
  showArmyOverview: () => void;
  clearList: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const INITIAL_STATE = {
  rawJson: '',
  resolvedList: null as ResolvedList | null,
  parseError: null as string | null,
  selectedUnitIndex: null as number | null,
  showArmyStats: true,
};

// ============================================================================
// Store
// ============================================================================

export const useListStore = create<ListState>((set) => ({
  ...INITIAL_STATE,

  importList: (json: string) => {
    const result = parseListJson(json);

    if ('error' in result) {
      set({
        rawJson: json,
        resolvedList: null,
        parseError: result.error,
        selectedUnitIndex: null,
        showArmyStats: true,
      });
    } else {
      set({
        rawJson: json,
        resolvedList: result,
        parseError: null,
        selectedUnitIndex: null,
        showArmyStats: true,
      });
    }
  },

  selectUnit: (index: number) => {
    set({
      selectedUnitIndex: index,
      showArmyStats: false,
    });
  },

  showArmyOverview: () => {
    set({
      selectedUnitIndex: null,
      showArmyStats: true,
    });
  },

  clearList: () => {
    set({ ...INITIAL_STATE });
  },
}));
