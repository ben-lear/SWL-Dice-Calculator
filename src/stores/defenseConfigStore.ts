import { create } from 'zustand';
import {
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
  DefenderConfig,
} from '../engine/types';
import type { UpgradeSlot } from '../data/types';
import type { Faction, DefenderPresetProfile } from '../data/presets';

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

  // ── UI State (not sent to engine) ──
  selectedFaction: Faction | null;
  selectedPresetId: string | null;
  activeMode: 'custom' | 'unit-builder';  // Track which mode is active

  // ── Upgrade System ──
  /** Available upgrade slots for the selected unit (set by loadPreset) */
  upgradeBar: UpgradeSlot[];
  /** Parallel array to upgradeBar: ID of equipped upgrade in each slot, or null */
  equippedUpgradeIds: (string | null)[];

  // ── Actions ──
  // ── Actions ──
  setField: <K extends keyof DefenseConfigFields>(
    field: K,
    value: DefenseConfigFields[K]
  ) => void;
  
  setSelectedFaction: (faction: Faction | null) => void;
  setSelectedPresetId: (presetId: string | null) => void;
  setActiveMode: (mode: 'custom' | 'unit-builder') => void;
  loadPreset: (
    presetId: string,
    profile: DefenderPresetProfile,
    upgradeBar?: UpgradeSlot[]
  ) => void;
  /** Equip an upgrade in a specific slot (by index in upgradeBar) */
  equipUpgrade: (slotIndex: number, upgradeId: string | null) => void;
  reset: () => void;
}

/**
 * All settable fields (excludes actions and UI-only state).
 * Used for type-safe generic setter.
 */
type DefenseConfigFields = Omit<
  DefenseConfigState,
  | 'setField'
  | 'setSelectedFaction'
  | 'setSelectedPresetId'
  | 'setActiveMode'
  | 'loadPreset'
  | 'reset'
  | 'selectedFaction'
  | 'selectedPresetId'
  | 'activeMode'
  | 'upgradeBar'
  | 'equippedUpgradeIds'
  | 'equipUpgrade'
>;

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

  // UI state
  selectedFaction: null,
  selectedPresetId: null,
  activeMode: 'custom',

  // Upgrade system
  upgradeBar: [],
  equippedUpgradeIds: [],

  // Generic setter for any field
  setField: (field, value) =>
    set((state) => ({
      ...state,
      [field]: value,
    })),

  // Set selected faction (UI-only state)
  setSelectedFaction: (faction) =>
    set({ selectedFaction: faction }),

  // Set selected preset (UI-only state)
  setSelectedPresetId: (presetId) =>
    set({ selectedPresetId: presetId }),

  // Setter for mode toggle
  setActiveMode: (mode) =>
    set({ activeMode: mode }),

  // Load a preset: reset to defaults, then apply preset overrides
  loadPreset: (presetId, profile, upgradeBar = []) =>
    set(() => ({
      ...DEFAULT_DEFENSE_CONFIG,
      ...profile,
      selectedPresetId: presetId,
      upgradeBar,
      equippedUpgradeIds: new Array(upgradeBar.length).fill(null),
      // Reset situational fields (user must set these per-attack)
      coverType: CoverType.None,
      dodgeTokens: 0,
      surgeTokens: 0,
      suppressionTokens: 0,
      suppressed: false,
      smokeTokens: 0,
      guardianX: 0,
    })),

  // Equip an upgrade in a specific slot (by index in upgradeBar)
  equipUpgrade: (slotIndex, upgradeId) =>
    set((state) => {
      if (slotIndex < 0 || slotIndex >= state.equippedUpgradeIds.length) return state;
      const newIds = [...state.equippedUpgradeIds];
      newIds[slotIndex] = upgradeId;
      return { equippedUpgradeIds: newIds };
    }),

  // Full reset to defaults
  reset: () =>
    set(() => ({
      ...DEFAULT_DEFENSE_CONFIG,
      selectedFaction: null,
      selectedPresetId: null,
      activeMode: 'custom',
      upgradeBar: [],
      equippedUpgradeIds: [],
    })),
}));

/**
 * Selector: extract the engine-compatible DefenderConfig from the store.
 * Excludes UI-only fields and upgrade fields.
 */
export function selectDefenderConfig(state: DefenseConfigState): DefenderConfig {
  const {
    selectedFaction,
    selectedPresetId,
    activeMode,
    upgradeBar,
    equippedUpgradeIds,
    setField,
    setSelectedFaction,
    setSelectedPresetId,
    setActiveMode,
    loadPreset,
    reset,
    equipUpgrade,
    ...config
  } = state;
  return config;
}
