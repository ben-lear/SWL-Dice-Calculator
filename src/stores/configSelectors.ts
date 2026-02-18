import type { AttackConfig } from '../engine/types';
import { useAttackConfigStore, selectAttackerConfig } from './attackConfigStore';
import { useDefenseConfigStore, selectDefenderConfig } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';
import {
  applyAttackerUpgrades,
  applyDefenderUpgrades,
} from '../data/upgradeApplicator';
import { rebuildWeaponsFromCounts } from '../utils/weaponCounts';

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
  const attackerWithUpgrades = applyAttackerUpgrades(
    baseAttacker,
    attackState.equippedUpgradeIds,
    attackTypeState.attackType,
    attackState.unitBaseWeapons ?? [],
  );

  // Apply weaponMiniCounts overrides (Unit Builder mode)
  const attacker = {
    ...attackerWithUpgrades,
    weapons: rebuildWeaponsFromCounts(
      attackerWithUpgrades.weapons,
      attackState.weaponMiniCounts,
      attackerWithUpgrades.weapons,
    ),
  };

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
  const weaponMiniCounts = useAttackConfigStore(
    (s) => s.weaponMiniCounts,
  );
  const defenderConfig = useDefenseConfigStore(selectDefenderConfig);
  const defenderUpgradeIds = useDefenseConfigStore(
    (s) => s.equippedUpgradeIds,
  );
  const attackType = useAttackTypeStore((s) => s.attackType);

  // Apply equipped upgrades
  const attackerWithUpgrades = applyAttackerUpgrades(
    attackerConfig,
    attackerUpgradeIds,
    attackType,
    unitBaseWeapons ?? [],
  );

  // Apply weaponMiniCounts overrides (Unit Builder mode)
  const attacker = {
    ...attackerWithUpgrades,
    weapons: rebuildWeaponsFromCounts(
      attackerWithUpgrades.weapons,
      weaponMiniCounts,
      attackerWithUpgrades.weapons,
    ),
  };

  const defender = applyDefenderUpgrades(defenderConfig, defenderUpgradeIds);

  return {
    attacker,
    defender,
    attackType,
  };
}
