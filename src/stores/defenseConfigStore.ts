import { create } from 'zustand';
import {
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
  DefenderConfig,
} from '../engine/types';

// ============================================================================
// State Interface
// ============================================================================

export interface DefenseConfigState {
  // ── Defense ──
  dieColor: DefenseDieColor;
  surgeChart: DefenseSurgeChart;
  disableDefenseDice: boolean;

  // ── Cover ──
  coverType: CoverType;
  coverX: number;
  smokeTokens: number;
  suppressed: boolean;

  // ── Tokens ──
  dodgeTokens: number;
  surgeTokens: number;
  suppressionTokens: number;

  // ── Miniatures ──
  minisInLOS: number;

  // ── Keywords (numeric) ──
  armorX: number;
  weakPointX: number;
  dangerSenseX: number;
  uncannyLuckX: number;
  shieldedX: number;

  // ── Keywords (boolean) ──
  immunePierce: boolean;
  immuneMeleePierce: boolean;
  immuneBlast: boolean;
  impervious: boolean;
  block: boolean;
  deflect: boolean;
  shienMastery: boolean;
  outmaneuver: boolean;
  lowProfile: boolean;
  djemSoMastery: boolean;
  soresuMastery: boolean;
  duelistDefender: boolean;
  backup: boolean;
  holdTheLine: boolean;
  dugIn: boolean;

  // ── Guardian Sub-config ──
  guardianX: number;
  guardianDieColor: DefenseDieColor;
  guardianSurgeChart: DefenseSurgeChart;
  guardianDeflect: boolean;
  guardianSoresuMastery: boolean;
  guardianDodgeTokens: number;

  // ── Points ──
  unitCost: number;

  // ── Mode Tracking (Phase 2.6) ──
  activeDefenderMode: 'custom' | 'unit-builder';
  selectedDefenderFaction: string | null;
  selectedDefenderPresetId: string | null;

  // ── Actions ──
  setField: <K extends keyof Omit<DefenseConfigState, 
    'setField' | 'setDefenderMode' | 'setDefenderFaction' | 
    'loadDefenderPreset' | 'resetDefenderConfig' | 
    'activeDefenderMode' | 'selectedDefenderFaction' | 'selectedDefenderPresetId'>>(
    field: K,
    value: DefenseConfigState[K]
  ) => void;
  setDefenderMode: (mode: 'custom' | 'unit-builder') => void;
  setDefenderFaction: (faction: string | null) => void;
  loadDefenderPreset: (id: string, config: Partial<DefenderConfig>) => void;
  resetDefenderConfig: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_DEFENSE_CONFIG = {
  // Defense
  dieColor: DefenseDieColor.White,
  surgeChart: DefenseSurgeChart.None,
  disableDefenseDice: false,

  // Cover
  coverType: CoverType.None,
  coverX: 0,
  smokeTokens: 0,
  suppressed: false,

  // Tokens
  dodgeTokens: 0,
  surgeTokens: 0,
  suppressionTokens: 0,

  // Miniatures
  minisInLOS: 1,

  // Keywords (numeric)
  armorX: 0,
  weakPointX: 0,
  dangerSenseX: 0,
  uncannyLuckX: 0,
  shieldedX: 0,

  // Keywords (boolean)
  immunePierce: false,
  immuneMeleePierce: false,
  immuneBlast: false,
  impervious: false,
  block: false,
  deflect: false,
  shienMastery: false,
  outmaneuver: false,
  lowProfile: false,
  djemSoMastery: false,
  soresuMastery: false,
  duelistDefender: false,
  backup: false,
  holdTheLine: false,
  dugIn: false,

  // Guardian
  guardianX: 0,
  guardianDieColor: DefenseDieColor.White,
  guardianSurgeChart: DefenseSurgeChart.None,
  guardianDeflect: false,
  guardianSoresuMastery: false,
  guardianDodgeTokens: 0,

  // Points
  unitCost: 0,
} as const;

// ============================================================================
// Store
// ============================================================================

export const useDefenseConfigStore = create<DefenseConfigState>((set) => ({
  // Spread defaults as initial state
  ...DEFAULT_DEFENSE_CONFIG,

  // Mode tracking (Phase 2.6)
  activeDefenderMode: 'custom',
  selectedDefenderFaction: null,
  selectedDefenderPresetId: null,

  // Generic setter for any field
  setField: (field, value) =>
    set((state) => ({
      ...state,
      [field]: value,
    })),

  // Set defender mode (Phase 2.6)
  setDefenderMode: (mode) => set({ activeDefenderMode: mode }),

  // Set defender faction (Phase 2.6)
  setDefenderFaction: (faction) => set({ selectedDefenderFaction: faction }),

  // Load a defender preset (Phase 2.6)
  loadDefenderPreset: (id, config) =>
    set(() => ({
      ...DEFAULT_DEFENSE_CONFIG,
      ...config,
      selectedDefenderPresetId: id,
      // Reset situational fields (user must set these per-attack)
      coverType: CoverType.None,
      dodgeTokens: 0,
      surgeTokens: 0,
      suppressionTokens: 0,
      suppressed: false,
      smokeTokens: 0,
      guardianX: 0,
    })),

  // Full reset to defaults
  resetDefenderConfig: () =>
    set(() => ({
      ...DEFAULT_DEFENSE_CONFIG,
      activeDefenderMode: 'custom',
      selectedDefenderFaction: null,
      selectedDefenderPresetId: null,
    })),
}));

/**
 * Selector: extract the engine-compatible DefenderConfig from the store.
 * Excludes UI-only fields.
 */
export function selectDefenderConfig(state: DefenseConfigState): DefenderConfig {
  const {
    activeDefenderMode,
    selectedDefenderFaction,
    selectedDefenderPresetId,
    setField,
    setDefenderMode,
    setDefenderFaction,
    loadDefenderPreset,
    resetDefenderConfig,
    ...config
  } = state;
  return config;
}

/**
 * Get the full defender config from the store.
 * This is the function that the simulation engine will use.
 */
export function getFullDefenderConfig(): DefenderConfig {
  const state = useDefenseConfigStore.getState();
  return selectDefenderConfig(state);
}
