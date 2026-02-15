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

  // Apply equipped upgrades (adds cost + keywords)
  const attacker = applyAttackerUpgrades(
    baseAttacker,
    attackState.equippedUpgradeIds,
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
  const defenderConfig = useDefenseConfigStore(selectDefenderConfig);
  const defenderUpgradeIds = useDefenseConfigStore(
    (s) => s.equippedUpgradeIds,
  );
  const attackType = useAttackTypeStore((s) => s.attackType);

  const attacker = applyAttackerUpgrades(attackerConfig, attackerUpgradeIds);
  const defender = applyDefenderUpgrades(defenderConfig, defenderUpgradeIds);

  return {
    attacker,
    defender,
    attackType,
  };
}
