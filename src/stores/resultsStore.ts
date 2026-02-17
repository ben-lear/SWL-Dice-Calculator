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

  /** True when config has changed since the last simulation run */
  stale: boolean;

  // ── Actions ──
  setResult: (result: SimulationResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markStale: () => void;
  clear: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useResultsStore = create<ResultsState>((set) => ({
  result: null,
  loading: false,
  error: null,
  stale: false,

  setResult: (result) =>
    set({
      result,
      loading: false,
      error: null,
      stale: false,
    }),

  setLoading: (loading) =>
    set({ loading }),

  setError: (error) =>
    set({
      error,
      loading: false,
    }),

  markStale: () =>
    set({ stale: true }),

  clear: () =>
    set({
      result: null,
      loading: false,
      error: null,
      stale: false,
    }),
}));
