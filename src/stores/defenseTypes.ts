// ============================================================================
// Defender Preset Types (stub for Phase 5.5)
// ============================================================================

import type { DefenseDieColor, DefenseSurgeChart } from '../engine/types';

export interface DefenderPreset {
  id: string;
  name: string;
  faction: string;
  unitType: 'trooper' | 'commander' | 'operative' | 'support' | 'heavy';
  
  // Core defense configuration that gets loaded into DefenseConfigState
  dieColor: DefenseDieColor;
  surgeChart: DefenseSurgeChart;
  unitCost: number;
  
  // Unit keywords (base, before upgrades)
  armorX: number;
  weakPointX: number;
  dangerSenseX: number;
  uncannyLuckX: number;
  shieldedX: number;
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
  
  // Guardian configuration (if applicable)
  guardianX: number;
  guardianDieColor: DefenseDieColor;
  guardianSurgeChart: DefenseSurgeChart;
  guardianDeflect: boolean;
  guardianSoresuMastery: boolean;
  
  // Available upgrade slots (from API data)
  upgradeBar: string[]; // Array of upgrade slot types
}

// ============================================================================
// Upgrade Types (stub for Phase 5.5)
// ============================================================================

export interface DefenderUpgrade {
  id: string;
  name: string;
  cost: number;
  slotType: string; // Matches upgradeBar entries
  
  // Keyword effects
  keywordEffects: {
    armorX?: number;
    weakPointX?: number;
    dangerSenseX?: number;
    uncannyLuckX?: number;
    shieldedX?: number;
    immunePierce?: boolean;
    immuneMeleePierce?: boolean;
    immuneBlast?: boolean;
    impervious?: boolean;
    block?: boolean;
    deflect?: boolean;
    shienMastery?: boolean;
    outmaneuver?: boolean;
    lowProfile?: boolean;
    djemSoMastery?: boolean;
    soresuMastery?: boolean;
    duelistDefender?: boolean;
    backup?: boolean;
    holdTheLine?: boolean;
    dugIn?: boolean;
  };
}