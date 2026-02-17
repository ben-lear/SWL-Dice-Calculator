import { create } from 'zustand';
import type { SimulationResult, AttackConfig } from '../engine/types';

// ============================================================================
// Constants
// ============================================================================

const MAX_SLOTS = 4;

/** Fixed 4-color palette for result slots */
const COLOR_PALETTE = ['indigo', 'emerald', 'amber', 'rose'] as const;

// ============================================================================
// Types
// ============================================================================

/** A single saved simulation result with its context */
export interface ResultSlot {
  /** Unique identifier (e.g., 'slot-1', 'slot-2') */
  id: string;
  /** User-facing label (e.g., 'Sim 1', 'Sim 2'; user-renamable) */
  label: string;
  /** The simulation result data */
  result: SimulationResult;
  /** Snapshot of the config that produced this result */
  configSnapshot: AttackConfig;
  /** Assigned display color (Tailwind class prefix, e.g., 'indigo', 'emerald') */
  color: string;
}

// ============================================================================
// State Interface
// ============================================================================

export interface ResultsState {
  /** All saved result slots (max 4) */
  slots: ResultSlot[];
  /** Which slot's detail stats are currently viewed (CoreStats, SecondaryStats, Efficiency) */
  viewedSlotId: string | null;
  /** True while a simulation is in progress */
  loading: boolean;
  /** Error message if the last simulation failed */
  error: string | null;
  /** True when config has changed since the last simulation run (from 7.1A) */
  stale: boolean;

  // ── Actions ──
  /** Append a new result slot (no-op if already at max). Auto-labels, assigns color. */
  appendResult: (result: SimulationResult, configSnapshot: AttackConfig) => void;
  /** Remove a slot by ID. Reassigns viewedSlotId if needed. */
  removeSlot: (id: string) => void;
  /** Update a slot's display label */
  renameSlot: (id: string, label: string) => void;
  /** Switch which slot's detail stats are shown */
  setViewedSlotId: (id: string) => void;
  /** Mark results as stale (config changed since last run) */
  markStale: () => void;
  /** Clear all slots and reset to empty state */
  clearAll: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ============================================================================
// Derived State Selectors
// ============================================================================

/** True if maximum slots are filled */
export const selectIsFull = (state: ResultsState): boolean => 
  state.slots.length >= MAX_SLOTS;

/** Get the currently viewed slot, if any */
export const selectViewedSlot = (state: ResultsState): ResultSlot | null =>
  state.slots.find((s) => s.id === state.viewedSlotId) ?? null;

// ============================================================================
// Store Implementation
// ============================================================================

let nextSlotId = 1;
let nextSimNumber = 1;

/** Get the lowest available color index from the palette */
function getNextColor(existingSlots: ResultSlot[]): string {
  const usedColors = new Set(existingSlots.map((s) => s.color));
  for (const color of COLOR_PALETTE) {
    if (!usedColors.has(color)) {
      return color;
    }
  }
  // Fallback (should never happen with MAX_SLOTS = 4 and 4 colors)
  return COLOR_PALETTE[0];
}

export const useResultsStore = create<ResultsState>((set, get) => ({
  slots: [],
  viewedSlotId: null,
  loading: false,
  error: null,
  stale: false,

  appendResult: (result, configSnapshot) => {
    const { slots } = get();
    if (slots.length >= MAX_SLOTS) {
      return; // no-op if full
    }

    const newSlot: ResultSlot = {
      id: `slot-${nextSlotId++}`,
      label: `Sim ${nextSimNumber++}`,
      result,
      configSnapshot,
      color: getNextColor(slots),
    };

    set({
      slots: [...slots, newSlot],
      viewedSlotId: newSlot.id,
      stale: false,
      loading: false,
      error: null,
    });
  },

  removeSlot: (id) => {
    const { slots, viewedSlotId } = get();
    const newSlots = slots.filter((s) => s.id !== id);

    let newViewedSlotId = viewedSlotId;
    if (viewedSlotId === id) {
      // If we removed the viewed slot, switch to the last remaining slot
      newViewedSlotId = newSlots.length > 0 ? newSlots[newSlots.length - 1].id : null;
    }

    set({
      slots: newSlots,
      viewedSlotId: newViewedSlotId,
    });
  },

  renameSlot: (id, label) => {
    set((state) => ({
      slots: state.slots.map((slot) =>
        slot.id === id ? { ...slot, label } : slot
      ),
    }));
  },

  setViewedSlotId: (id) => {
    set({ viewedSlotId: id });
  },

  markStale: () => {
    set({ stale: true });
  },

  clearAll: () => {
    nextSimNumber = 1; // Reset label counter
    set({
      slots: [],
      viewedSlotId: null,
      loading: false,
      error: null,
      stale: false,
    });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({
      error,
      loading: false,
    });
  },
}));
