// ============================================================================
// Shared UI Options — single source of truth for SegmentedControl options
// ============================================================================

import type { SegmentedControlOption } from '../components/shared/SegmentedControl';
import {
  AttackSurgeChart,
  CoverType,
  DefenseDieColor,
  DefenseSurgeChart,
  RerollStrategy,
} from '../engine/types';

// ============================================================================
// Defense Options
// ============================================================================

/** UI-only type for defense die selector (includes 'none' option) */
export type DefenseDieOption = 'none' | DefenseDieColor;

export const DEFENSE_DIE_OPTIONS: SegmentedControlOption<DefenseDieOption>[] = [
  { value: 'none', label: 'None' },
  { value: DefenseDieColor.White, label: 'White' },
  { value: DefenseDieColor.Red, label: 'Red' },
];

/** Guardian die color options (no 'none' option for Guardian) */
export const GUARDIAN_DIE_OPTIONS = [
  { value: DefenseDieColor.White, label: 'White' },
  { value: DefenseDieColor.Red, label: 'Red' },
];

export const DEFENSE_SURGE_OPTIONS: SegmentedControlOption<DefenseSurgeChart>[] = [
  { value: DefenseSurgeChart.None, label: 'None' },
  { value: DefenseSurgeChart.ToBlock, label: 'Block' },
];

export const COVER_OPTIONS: SegmentedControlOption<CoverType>[] = [
  { value: CoverType.None, label: 'None' },
  { value: CoverType.Light, label: 'Light' },
  { value: CoverType.Heavy, label: 'Heavy' },
];

// ============================================================================
// Attack Options
// ============================================================================

export const ATTACK_SURGE_OPTIONS: SegmentedControlOption<AttackSurgeChart>[] = [
  { value: AttackSurgeChart.None, label: 'None' },
  { value: AttackSurgeChart.ToHit, label: 'Hit' },
  { value: AttackSurgeChart.ToCrit, label: 'Crit' },
];

export const REROLL_STRATEGY_OPTIONS: SegmentedControlOption<RerollStrategy>[] = [
  { value: RerollStrategy.Conservative, label: 'Conservative' },
  { value: RerollStrategy.CritFishing, label: 'Crit Fishing' },
];
