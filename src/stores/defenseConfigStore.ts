import { create } from 'zustand';
import {
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
  DefenderConfig,
} from '../engine/types';
import type { UpgradeSlot, UnitRank, UnitType } from '../data/types';
import type { Faction, DefenderPresetProfile } from '../data/presets';
import { getResolvedUpgradeById } from '../data/upgradeResolver';
import { recomputeEffectiveUpgradeBar } from './upgradeBarHelpers';

// ============================================================================
// Module-level snapshot: preserves Unit Builder state across mode toggles
// ============================================================================

/** Saved Unit Builder state when switching to Custom Pool */
let _savedDefenderUBSnapshot: Record<string, unknown> | null = null;

/** @internal Exported for testing only */
export function _getDefenderUBSnapshot() { return _savedDefenderUBSnapshot; }
export function _clearDefenderUBSnapshot() { _savedDefenderUBSnapshot = null; }

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
  immuneMelee: boolean;
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
  completeTheMission: boolean;
  katarnPatternArmor: boolean;  // Expend: cap wounds to 1 from non-melee attacks

  // ── Guardian Sub-config ──
  guardianX: number;
  guardianDieColor: DefenseDieColor;
  guardianSurgeChart: DefenseSurgeChart;
  guardianDeflect: boolean;
  guardianSoresuMastery: boolean;
  guardianDodgeTokens: number;

  // ── Points ──
  unitCost: number;
  baseUnitCost: number;  // Base cost before upgrades (for auto-calculation)

  // ── UI State (not sent to engine) ──
  selectedFaction: Faction | null;
  selectedPresetId: string | null;
  activeMode: 'custom' | 'unit-builder';  // Track which mode is active

  /** API ID of the selected unit. Used for filtering upgrade dropdowns. UI-only. */
  unitApiId: number | null;
  /** Unit rank for upgrade filtering. UI-only. */
  selectedUnitRank: UnitRank | null;
  /** Unit type for upgrade filtering. UI-only. */
  selectedUnitType: UnitType | null;
  /** Mercenary affiliation slug for upgrade filtering. UI-only. */
  selectedUnitAffiliation: string | null;

  // ── Upgrade System ──
  /** Available upgrade slots for the selected unit (set by loadPreset) */
  upgradeBar: UpgradeSlot[];
  /** Parallel array to upgradeBar: ID of equipped upgrade in each slot, or null */
  equippedUpgradeIds: (string | null)[];
  /** Effective upgrade bar: base bar + dynamic slots from equipped upgrades with addsUpgradeSlot */
  effectiveUpgradeBar: UpgradeSlot[];
  /** Index of the granting slot for each dynamic slot, or null for base slots */
  grantedByIndex: (number | null)[];

  // ── Actions ──
  // ── Actions ──
  setField: <K extends keyof DefenseConfigFields>(
    field: K,
    value: DefenseConfigFields[K]
  ) => void;
  
  setSelectedFaction: (faction: Faction | null) => void;
  setSelectedPresetId: (presetId: string | null) => void;
  setActiveMode: (mode: 'custom' | 'unit-builder') => void;
  clearUnit: () => void;
  loadPreset: (
    presetId: string,
    profile: DefenderPresetProfile,
    upgradeBar?: UpgradeSlot[],
    unitApiId?: number,
    unitMeta?: { rank: UnitRank; unitType: UnitType; affiliation: string | null; faction?: Faction | null }
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
  | 'clearUnit'
  | 'loadPreset'
  | 'reset'
  | 'selectedFaction'
  | 'selectedPresetId'
  | 'activeMode'
  | 'upgradeBar'
  | 'equippedUpgradeIds'
  | 'effectiveUpgradeBar'
  | 'grantedByIndex'
  | 'equipUpgrade'
  | 'unitApiId'
  | 'selectedUnitRank'
  | 'selectedUnitType'
  | 'selectedUnitAffiliation'
>;

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_DEFENSE_CONFIG = {
  // Defense
  dieColor: DefenseDieColor.White,
  surgeChart: DefenseSurgeChart.None,
  disableDefenseDice: true,

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
  immuneMelee: false,
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
  completeTheMission: false,
  katarnPatternArmor: false,

  // Guardian
  guardianX: 0,
  guardianDieColor: DefenseDieColor.White,
  guardianSurgeChart: DefenseSurgeChart.None,
  guardianDeflect: false,
  guardianSoresuMastery: false,
  guardianDodgeTokens: 0,

  // Points
  unitCost: 0,
  baseUnitCost: 0,
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
  unitApiId: null,  // ← NEW: API ID for upgrade filtering
  selectedUnitRank: null,
  selectedUnitType: null,
  selectedUnitAffiliation: null,

  // Upgrade system
  upgradeBar: [],
  equippedUpgradeIds: [],
  effectiveUpgradeBar: [],
  grantedByIndex: [],

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
  // When switching from Unit Builder → Custom Pool, save a snapshot of
  // unit builder state and reset gameplay fields. When switching back,
  // restore the saved snapshot.
  setActiveMode: (mode) =>
    set((state) => {
      if (state.activeMode === 'unit-builder' && mode === 'custom') {
        // Save unit builder state before resetting
        const {
          setField: _a, setSelectedFaction: _b, setSelectedPresetId: _c,
          setActiveMode: _d, clearUnit: _e, loadPreset: _f,
          equipUpgrade: _g, reset: _h,
          activeMode: _i, selectedFaction: _j,
          ...dataFields
        } = state;
        _savedDefenderUBSnapshot = dataFields;

        return {
          ...DEFAULT_DEFENSE_CONFIG,
          activeMode: 'custom' as const,
          selectedFaction: state.selectedFaction,
          selectedPresetId: null,
          upgradeBar: [],
          equippedUpgradeIds: [],
          effectiveUpgradeBar: [],
          grantedByIndex: [],
          unitApiId: null,
          selectedUnitRank: null,
          selectedUnitType: null,
          selectedUnitAffiliation: null,
        };
      }
      if (state.activeMode === 'custom' && mode === 'unit-builder' && _savedDefenderUBSnapshot) {
        const snapshot = _savedDefenderUBSnapshot;
        _savedDefenderUBSnapshot = null;
        return {
          ...snapshot,
          activeMode: 'unit-builder' as const,
        };
      }
      return { activeMode: mode };
    }),

  // Clear all unit-related state, preserving faction and mode
  clearUnit: () =>
    set((state) => ({
      ...DEFAULT_DEFENSE_CONFIG,
      selectedFaction: state.selectedFaction,
      activeMode: state.activeMode,
      selectedPresetId: null,
      upgradeBar: [],
      equippedUpgradeIds: [],
      effectiveUpgradeBar: [],
      grantedByIndex: [],
      unitApiId: null,
      selectedUnitRank: null,
      selectedUnitType: null,
      selectedUnitAffiliation: null,
    })),

  // Load a preset: reset to defaults, then apply preset overrides
  loadPreset: (presetId, profile, upgradeBar = [], unitApiId, unitMeta) =>
    set((state) => {
      const baseCost = profile.unitCost ?? 0;

      return {
        ...DEFAULT_DEFENSE_CONFIG,
        ...profile,
        disableDefenseDice: profile.dieColor === undefined,
        selectedPresetId: presetId,
        upgradeBar: upgradeBar ?? [],
        equippedUpgradeIds: new Array((upgradeBar ?? []).length).fill(null),
        effectiveUpgradeBar: upgradeBar ?? [],
        grantedByIndex: new Array((upgradeBar ?? []).length).fill(null),
        unitApiId: unitApiId ?? null,  // ← NEW: store API ID for upgrade filtering
        selectedFaction: unitMeta?.faction ?? state.selectedFaction,
        selectedUnitRank: unitMeta?.rank ?? null,
        selectedUnitType: unitMeta?.unitType ?? null,
        selectedUnitAffiliation: unitMeta?.affiliation ?? null,
        unitCost: baseCost,
        baseUnitCost: baseCost,  // Store base cost for upgrade calculations
        // Reset situational fields (user must set these per-attack)
        coverType: CoverType.None,
        dodgeTokens: 0,
        surgeTokens: 0,
        suppressionTokens: 0,
        suppressed: false,
        smokeTokens: 0,
        guardianX: 0,
      };
    }),

  // Equip an upgrade in a specific slot (by index in upgradeBar)
  equipUpgrade: (slotIndex, upgradeId) =>
    set((state) => {
      const maxLen = state.effectiveUpgradeBar.length;
      if (slotIndex < 0 || slotIndex >= maxLen) return state;

      const newIds = [...state.equippedUpgradeIds];
      while (newIds.length < maxLen) newIds.push(null);
      newIds[slotIndex] = upgradeId;

      const result = recomputeEffectiveUpgradeBar(state.upgradeBar, newIds);

      let totalCost = state.baseUnitCost;
      for (const id of result.equippedUpgradeIds) {
        if (id !== null) {
          const upgrade = getResolvedUpgradeById(id);
          if (upgrade) totalCost += upgrade.cost;
        }
      }

      return {
        equippedUpgradeIds: result.equippedUpgradeIds,
        effectiveUpgradeBar: result.effectiveUpgradeBar,
        grantedByIndex: result.grantedByIndex,
        unitCost: totalCost,
      };
    }),

  // Full reset to defaults
  reset: () => {
    _savedDefenderUBSnapshot = null;
    return set(() => ({
      ...DEFAULT_DEFENSE_CONFIG,
      selectedFaction: null,
      selectedPresetId: null,
      activeMode: 'custom',
      upgradeBar: [],
      equippedUpgradeIds: [],
      effectiveUpgradeBar: [],
      grantedByIndex: [],
      unitApiId: null,  // ← NEW: reset API ID
      selectedUnitRank: null,
      selectedUnitType: null,
      selectedUnitAffiliation: null,
    }));
  },
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
    unitApiId,  // ← NEW: exclude (UI-only)
    selectedUnitRank,
    selectedUnitType,
    selectedUnitAffiliation,
    upgradeBar,
    equippedUpgradeIds,
    effectiveUpgradeBar,
    grantedByIndex,
    setField,
    setSelectedFaction,
    setSelectedPresetId,
    setActiveMode,
    loadPreset,
    reset,
    equipUpgrade,
    clearUnit,
    ...config
  } = state;
  return config;
}
