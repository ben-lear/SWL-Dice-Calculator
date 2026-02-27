/**
 * List store — Zustand store for the List Analyzer page state.
 * Fifth store in the app's store architecture.
 */

import { create } from 'zustand';
import type { ResolvedList, ArmyStats, RangeBandDice } from '../data/listTypes';
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

  // Simulation state
  simulatedStats: ArmyStats | null;
  simulatedUnitResults: Map<number, RangeBandDice[]> | null;
  simulationLoading: boolean;
  simulationError: string | null;
  simulationStale: boolean;

  importList: (json: string) => void;
  selectUnit: (index: number) => void;
  showArmyOverview: () => void;
  clearList: () => void;

  // Simulation actions
  setSimulatedResults: (stats: ArmyStats, unitResults: Map<number, RangeBandDice[]>) => void;
  setSimulationLoading: (loading: boolean) => void;
  setSimulationError: (error: string | null) => void;
  markSimulationStale: () => void;
  clearSimulationResults: () => void;
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
  simulatedStats: null as ArmyStats | null,
  simulatedUnitResults: null as Map<number, RangeBandDice[]> | null,
  simulationLoading: false,
  simulationError: null as string | null,
  simulationStale: false,
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
        simulatedStats: null,
        simulatedUnitResults: null,
        simulationLoading: false,
        simulationError: null,
        simulationStale: false,
      });
    } else {
      set({
        rawJson: json,
        resolvedList: result,
        parseError: null,
        selectedUnitIndex: null,
        showArmyStats: true,
        simulatedStats: null,
        simulatedUnitResults: null,
        simulationLoading: false,
        simulationError: null,
        simulationStale: false,
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

  // Simulation actions
  setSimulatedResults: (stats: ArmyStats, unitResults: Map<number, RangeBandDice[]>) => {
    set({
      simulatedStats: stats,
      simulatedUnitResults: unitResults,
      simulationLoading: false,
      simulationError: null,
      simulationStale: false,
    });
  },

  setSimulationLoading: (loading: boolean) => {
    set({ simulationLoading: loading });
  },

  setSimulationError: (error: string | null) => {
    set({ simulationError: error, simulationLoading: false });
  },

  markSimulationStale: () => {
    set({ simulationStale: true });
  },

  clearSimulationResults: () => {
    set({
      simulatedStats: null,
      simulatedUnitResults: null,
      simulationLoading: false,
      simulationError: null,
      simulationStale: false,
    });
  },
}));
