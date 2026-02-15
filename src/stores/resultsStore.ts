import { create } from 'zustand';
import type { SimulationResult } from '../engine/types';

// ============================================================================
// State Interface
// ============================================================================

export interface ResultsState {
  /** The latest simulation result, or null if no simulation has run yet */
  result: SimulationResult | null;

  /** True while a simulation is in progress */
  loading: boolean;

  /** Error message if the last simulation failed */
  error: string | null;

  // ── Actions ──
  setResult: (result: SimulationResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useResultsStore = create<ResultsState>((set) => ({
  result: null,
  loading: false,
  error: null,

  setResult: (result) =>
    set({
      result,
      loading: false,
      error: null,
    }),

  setLoading: (loading) =>
    set({ loading }),

  setError: (error) =>
    set({
      error,
      loading: false,
    }),

  clear: () =>
    set({
      result: null,
      loading: false,
      error: null,
    }),
}));
