import { create } from 'zustand';
import {
  AttackSurgeChart,
  MarksmanStrategy,
  RerollStrategy,
  WeaponProfile,
  WeaponKeywords,
} from '../engine/types';
import type { Faction, AttackerPresetProfile } from '../data/presets';
import type { UpgradeSlot, WeaponProfile as DataLayerWeaponProfile } from '../data/types';
import { getResolvedUpgradeById } from '../data/upgradeResolver';

// ============================================================================
// State Interface
// ============================================================================

export interface AttackConfigState {
  // ── Weapons Array (dice pool + weapon keywords) ──
  weapons: WeaponProfile[];  // In Custom Pool mode: single weapon at index 0
                              // In Unit Builder mode: multiple weapons from preset
  
  // ── Surge Chart (unit-level) ──
  surgeChart: AttackSurgeChart;

  // ── Tokens ──
  aimTokens: number;
  surgeTokens: number;
  observationTokens: number;
  dodgeTokensAttacker: number;

  // ── Unit-Level Keywords (numeric) ──
  preciseX: number;
  sharpshooterX: number;
  arsenalX: number;

  // ── Unit-Level Keywords (boolean) ──
  marksman: boolean;
  marksmanStrategy: MarksmanStrategy;
  rerollStrategy: RerollStrategy;
  jediHunter: boolean;
  jarKaiMastery: boolean;
  duelistAttacker: boolean;
  makashiMastery: boolean;
  deathFromAbove: boolean;
  holdTheLine: boolean;
  completeTheMission: boolean;

  // ── Points ──
  unitCost: number;
  baseUnitCost: number;  // Base cost before upgrades (for auto-calculation)

  // ── UI State (not sent to engine) ──
  selectedFaction: Faction | null;
  selectedPresetId: string | null;
  activeMode: 'custom' | 'unit-builder';  // Track which mode is active

  /** API ID of the selected unit. Used for filtering upgrade dropdowns. UI-only. */
  unitApiId: number | null;

  /**
   * Base miniature count for the selected unit (before upgrades).
   * Determines how many weapon entries start in the weapons array.
   * Set by loadPreset from the preset's baseMiniatureCount field.
   * Defaults to 1 for Custom Pool mode.
   */
  baseMiniatureCount: number;

  /**
   * All weapon profiles available on the unit card (ALL attack types).
   * Used by the config selector to pass to applyAttackerUpgrades for
   * per-miniature weapon resolution (base weapon expansion + sidearm fallback).
   * Set by loadPreset from the preset's unitBaseWeapons field.
   * Not used in Custom Pool mode (empty array).
   */
  unitBaseWeapons: DataLayerWeaponProfile[];

  // ── Upgrade System ──
  /** Available upgrade slots for the selected unit (set by loadPreset) */
  upgradeBar: UpgradeSlot[];
  /** Parallel array to upgradeBar: ID of equipped upgrade in each slot, or null */
  equippedUpgradeIds: (string | null)[];

  /**
   * User overrides for how many miniatures use each weapon (by weapon name).
   * Empty map = use defaults from applyAttackerUpgrades.
   * Only meaningful in Unit Builder mode.
   */
  weaponMiniCounts: Record<string, number>;

  // ── Actions ──
  setField: <K extends keyof AttackConfigFields>(
    field: K,
    value: AttackConfigFields[K]
  ) => void;
  
  // Weapon mutation actions
  setWeaponDice: (weaponIndex: number, color: 'red' | 'black' | 'white', count: number) => void;
  setWeaponKeyword: (weaponIndex: number, keyword: keyof WeaponKeywords, value: number | boolean) => void;
  setWeaponEnabled: (weaponIndex: number, enabled: boolean) => void;
  addWeapon: (weapon?: Partial<WeaponProfile>) => void;
  removeWeapon: (weaponIndex: number) => void;
  /** Set how many miniatures use a specific weapon (by name). */
  setWeaponMiniCount: (weaponName: string, count: number) => void;
  
  setSelectedFaction: (faction: Faction | null) => void;
  setSelectedPresetId: (presetId: string | null) => void;
  setActiveMode: (mode: 'custom' | 'unit-builder') => void;
  clearUnit: () => void;
  loadPreset: (
    presetId: string,
    profile: AttackerPresetProfile,
    upgradeBar?: UpgradeSlot[],
    unitApiId?: number
  ) => void;
  /** Equip an upgrade in a specific slot (by index in upgradeBar) */
  equipUpgrade: (slotIndex: number, upgradeId: string | null) => void;
  reset: () => void;
}

/**
 * All settable fields (excludes actions and UI-only state).
 * Used for type-safe generic setter.
 */
type AttackConfigFields = Omit<
  AttackConfigState,
  | 'setField'
  | 'setWeaponDice'
  | 'setWeaponKeyword'
  | 'setWeaponEnabled'
  | 'addWeapon'
  | 'removeWeapon'
  | 'setWeaponMiniCount'
  | 'setSelectedFaction'
  | 'setSelectedPresetId'
  | 'setActiveMode'
  | 'clearUnit'
  | 'loadPreset'
  | 'reset'
  | 'selectedFaction'
  | 'selectedPresetId'
  | 'activeMode'
  | 'baseMiniatureCount'
  | 'unitBaseWeapons'
  | 'upgradeBar'
  | 'equippedUpgradeIds'
  | 'equipUpgrade'
  | 'unitApiId'
  | 'weaponMiniCounts'
>;

// ============================================================================
// Default Values
// ============================================================================

/** Helper: create an empty weapon profile */
function createEmptyWeapon(): WeaponProfile {
  return {
    enabled: true,
    redDice: 0,
    blackDice: 0,
    whiteDice: 0,
    keywords: {
      criticalX: 0,
      lethalX: 0,
      pierceX: 0,
      impactX: 0,
      ramX: 0,
      blast: false,
      suppressive: false,
      highVelocity: false,
      spray: false,
      antiMaterielX: 0,
      antiPersonnelX: 0,
      cumbersome: false,
      sidearmMelee: false,
      sidearmRanged: false,
      immuneDeflect: false,
      primitive: false,
      ionX: 0,
    },
  };
}

const DEFAULT_ATTACK_CONFIG: AttackConfigFields = {
  // Weapons array: starts with one empty weapon for Custom Pool mode
  weapons: [createEmptyWeapon()],
  
  // Surge chart
  surgeChart: AttackSurgeChart.None,

  // Tokens
  aimTokens: 0,
  surgeTokens: 0,
  observationTokens: 0,
  dodgeTokensAttacker: 0,

  // Unit-level keywords (numeric)
  preciseX: 0,
  sharpshooterX: 0,
  arsenalX: 0,

  // Unit-level keywords (boolean)
  marksman: false,
  marksmanStrategy: MarksmanStrategy.Deterministic,
  rerollStrategy: RerollStrategy.Conservative,
  jediHunter: false,
  jarKaiMastery: false,
  duelistAttacker: false,
  makashiMastery: false,
  deathFromAbove: false,
  holdTheLine: false,
  completeTheMission: false,

  // Points
  unitCost: 0,
  baseUnitCost: 0,
};

// ============================================================================
// Store
// ============================================================================

export const useAttackConfigStore = create<AttackConfigState>((set) => ({
  // Spread defaults as initial state
  ...DEFAULT_ATTACK_CONFIG,

  // UI state
  selectedFaction: null,
  selectedPresetId: null,
  activeMode: 'custom',  // Default to Custom Pool mode
  baseMiniatureCount: 1,    // ← NEW: default for Custom Pool
  unitBaseWeapons: [],      // ← NEW: empty in Custom Pool mode
  unitApiId: null,          // ← NEW: API ID for upgrade filtering

  // Upgrade system
  upgradeBar: [],
  equippedUpgradeIds: [],
  weaponMiniCounts: {},

  // Generic setter for any unit-level field
  setField: (field, value) =>
    set((state) => ({
      ...state,
      [field]: value,
    })),

  // Weapon mutation actions
  setWeaponDice: (weaponIndex, color, count) =>
    set((state) => {
      const weapons = [...state.weapons];
      weapons[weaponIndex] = { ...weapons[weaponIndex], [`${color}Dice`]: count };
      return { weapons };
    }),

  setWeaponKeyword: (weaponIndex, keyword, value) =>
    set((state) => {
      const weapons = [...state.weapons];
      weapons[weaponIndex] = {
        ...weapons[weaponIndex],
        keywords: { ...weapons[weaponIndex].keywords, [keyword]: value },
      };
      return { weapons };
    }),

  setWeaponEnabled: (weaponIndex, enabled) =>
    set((state) => {
      const weapons = [...state.weapons];
      weapons[weaponIndex] = { ...weapons[weaponIndex], enabled };
      return { weapons };
    }),

  addWeapon: (weapon) =>
    set((state) => {
      const emptyWeapon = createEmptyWeapon();
      return {
        weapons: [
          ...state.weapons,
          {
            ...emptyWeapon,
            ...weapon,
            enabled: weapon?.enabled ?? true,
            keywords: { ...emptyWeapon.keywords, ...weapon?.keywords },
          },
        ],
      };
    }),

  removeWeapon: (weaponIndex) =>
    set((state) => {
      if (state.weapons.length <= 1) return state; // Don't remove the last weapon
      return { weapons: state.weapons.filter((_, i) => i !== weaponIndex) };
    }),

  setWeaponMiniCount: (weaponName, count) =>
    set((state) => ({
      weaponMiniCounts: {
        ...state.weaponMiniCounts,
        [weaponName]: count,
      },
    })),

  // Setter for faction dropdown (UI-only state)
  setSelectedFaction: (faction) =>
    set({ selectedFaction: faction }),

  // Setter for preset combobox (UI-only state)
  setSelectedPresetId: (presetId) =>
    set({ selectedPresetId: presetId }),

  // Setter for mode toggle
  setActiveMode: (mode) =>
    set({ activeMode: mode }),

  // Clear all unit-related state, preserving faction, mode and reroll settings
  clearUnit: () =>
    set((state) => ({
      ...DEFAULT_ATTACK_CONFIG,
      selectedFaction: state.selectedFaction,
      activeMode: state.activeMode,
      rerollStrategy: state.rerollStrategy,
      selectedPresetId: null,
      baseMiniatureCount: 1,
      unitBaseWeapons: [],
      upgradeBar: [],
      equippedUpgradeIds: [],
      weaponMiniCounts: {},
      unitApiId: null,
    })),

  // Load a preset: reset to defaults, then apply preset overrides
  loadPreset: (presetId, profile, upgradeBar = [], unitApiId) =>
    set(() => {
      const emptyWeapon = createEmptyWeapon();
      const normalizedWeapons = profile.weapons?.map((weapon) => ({
        ...emptyWeapon,
        ...weapon,
        enabled: weapon.enabled ?? true,
        keywords: { ...emptyWeapon.keywords, ...weapon.keywords },
      }));

      const baseCost = profile.unitCost ?? 0;

      return {
        ...DEFAULT_ATTACK_CONFIG,
        ...profile,
        weapons: normalizedWeapons ?? DEFAULT_ATTACK_CONFIG.weapons,
        baseMiniatureCount: profile.baseMiniatureCount ?? 1,  // ← NEW
        unitBaseWeapons: profile.unitBaseWeapons ?? [],        // ← NEW
        selectedPresetId: presetId,
        upgradeBar: upgradeBar ?? [],
        equippedUpgradeIds: new Array((upgradeBar ?? []).length).fill(null),
        unitApiId: unitApiId ?? null,  // ← NEW: store API ID for upgrade filtering
        unitCost: baseCost,
        baseUnitCost: baseCost,  // Store base cost for upgrade calculations
        weaponMiniCounts: {},     // Reset weapon mini count overrides on preset load
      };
    }),

  // Equip an upgrade in a specific slot (by index in upgradeBar)
  equipUpgrade: (slotIndex, upgradeId) =>
    set((state) => {
      if (slotIndex < 0 || slotIndex >= state.equippedUpgradeIds.length) return state;
      const newIds = [...state.equippedUpgradeIds];
      newIds[slotIndex] = upgradeId;

      // Calculate total cost: base cost + sum of all equipped upgrade costs
      let totalCost = state.baseUnitCost;
      for (const id of newIds) {
        if (id !== null) {
          const upgrade = getResolvedUpgradeById(id);
          if (upgrade) {
            totalCost += upgrade.cost;
          }
        }
      }

      return {
        equippedUpgradeIds: newIds,
        unitCost: totalCost,
        weaponMiniCounts: {},  // Reset overrides on upgrade change
      };
    }),

  // Full reset to defaults
  reset: () =>
    set(() => ({
      ...DEFAULT_ATTACK_CONFIG,
      selectedFaction: null,
      selectedPresetId: null,
      activeMode: 'custom',
      baseMiniatureCount: 1,
      unitBaseWeapons: [],
      upgradeBar: [],
      equippedUpgradeIds: [],
      weaponMiniCounts: {},
      unitApiId: null,
    })),
}));

/**
 * Selector: extract the engine-compatible AttackerConfig from the store.
 * Excludes UI-only fields (selectedFaction, selectedPresetId, activeMode).
 * Excludes action functions.
 */
export function selectAttackerConfig(state: AttackConfigState) {
  const {
    selectedFaction,
    selectedPresetId,
    activeMode,
    baseMiniatureCount,      // ← exclude from engine config
    unitBaseWeapons,          // ← exclude (passed separately)
    unitApiId,                // ← exclude (UI-only)
    upgradeBar,
    equippedUpgradeIds,
    weaponMiniCounts,         // ← exclude (consumed separately by display hook/configSelectors)
    setField,
    setWeaponDice,
    setWeaponKeyword,
    setWeaponEnabled,
    addWeapon,
    removeWeapon,
    setWeaponMiniCount,
    setSelectedFaction,
    setSelectedPresetId,
    setActiveMode,
    loadPreset,
    reset,
    equipUpgrade,
    clearUnit,
    ...config
  } = state;

  const enabledWeapons = config.weapons.filter((weapon) => weapon.enabled !== false);
  return {
    ...config,
    weapons: enabledWeapons.length > 0 ? enabledWeapons : [createEmptyWeapon()],
  };
}
