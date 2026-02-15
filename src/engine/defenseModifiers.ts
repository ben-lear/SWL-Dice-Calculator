import type { AttackConfig, RolledDefenseDie } from './types';
import { DefenseFace } from './types';

/**
 * Step 8 — Modify Defense Dice
 * Just count blocks. Pierce is NOT applied here (deferred to Step 9).
 */
export function modifyDefenseDice(
  results: RolledDefenseDie[],
  _config: AttackConfig,
  _dodgeWasSpent: boolean
): { blocks: number } {
  const blocks = results.filter(d => d.face === DefenseFace.Block).length;
  return { blocks };
}
