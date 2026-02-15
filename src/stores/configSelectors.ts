import type { AttackConfig } from '../engine/types';
import { useAttackConfigStore, selectAttackerConfig } from './attackConfigStore';
import { useDefenseConfigStore, selectDefenderConfig } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';
import {
  applyAttackerUpgrades,
  applyDefenderUpgrades,
} from '../data/upgradeApplicator';

/**
 * Read-only selector that merges all three input stores into the engine's
 * AttackConfig format, WITH equipped upgrades applied.
 */
export function getFullConfig(): AttackConfig {
  const attackState = useAttackConfigStore.getState();
  const defenseState = useDefenseConfigStore.getState();
  const attackTypeState = useAttackTypeStore.getState();

  // Get base configs (without upgrade fields)
  const baseAttacker = selectAttackerConfig(attackState);
  const baseDefender = selectDefenderConfig(defenseState);

  // Apply equipped upgrades (adds cost + keywords + per-mini weapon assembly)
  // Pass attackType and unitBaseWeapons for per-mini weapon selection
  const attacker = applyAttackerUpgrades(
    baseAttacker,
    attackState.equippedUpgradeIds,
    attackTypeState.attackType,       // ← NEW: for weapon selection
    attackState.unitBaseWeapons ?? [], // ← NEW: for sidearm fallback
  );
  const defender = applyDefenderUpgrades(
    baseDefender,
    defenseState.equippedUpgradeIds,
  );

  return {
    attacker,
    defender,
    attackType: attackTypeState.attackType,
  };
}

/**
 * React hook version — subscribes to all three stores and returns
 * the merged config with upgrades applied.
 */
export function useFullConfig(): AttackConfig {
  const attackerConfig = useAttackConfigStore(selectAttackerConfig);
  const attackerUpgradeIds = useAttackConfigStore(
    (s) => s.equippedUpgradeIds,
  );
  const unitBaseWeapons = useAttackConfigStore(
    (s) => s.unitBaseWeapons,
  );
  const defenderConfig = useDefenseConfigStore(selectDefenderConfig);
  const defenderUpgradeIds = useDefenseConfigStore(
    (s) => s.equippedUpgradeIds,
  );
  const attackType = useAttackTypeStore((s) => s.attackType);

  // Pass attackType and unitBaseWeapons for per-mini weapon assembly
  const attacker = applyAttackerUpgrades(
    attackerConfig,
    attackerUpgradeIds,
    attackType,              // ← NEW
    unitBaseWeapons ?? [],   // ← NEW
  );
  const defender = applyDefenderUpgrades(defenderConfig, defenderUpgradeIds);

  return {
    attacker,
    defender,
    attackType,
  };
}
