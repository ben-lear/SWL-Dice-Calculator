import type { AttackConfig, WeaponProfile, WeaponKeywords } from '../engine/types';
import { useAttackConfigStore, selectAttackerConfig } from './attackConfigStore';
import { useDefenseConfigStore, selectDefenderConfig } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';
import {
  applyAttackerUpgrades,
  applyDefenderUpgrades,
} from '../data/upgradeApplicator';
import { rebuildWeaponsFromCounts } from '../utils/weaponCounts';
import { aggregateWeaponKeywords } from '../engine/attackPool';

// ── Builder keyword override helpers ────────────────────────────────────────

const EMPTY_KEYWORDS: WeaponKeywords = {
  criticalX: 0,
  lethalX: 0,
  pierceX: 0,
  impactX: 0,
  ramX: 0,
  ionX: 0,
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
  blackOps: false,
  krakenBlaster: false,
};

function makeEmptyWeapon(): WeaponProfile {
  return {
    enabled: true,
    redDice: 0,
    blackDice: 0,
    whiteDice: 0,
    keywords: { ...EMPTY_KEYWORDS },
  };
}

/**
 * After the final weapon list is assembled (post-upgrade + post-minicount),
 * inject a synthetic 0-dice weapon that carries any keyword values the user
 * explicitly added above what the active weapons already provide.
 */
function applyBuilderKeywordOverrides(
  weapons: WeaponProfile[],
  overrides: Partial<WeaponKeywords>,
): WeaponProfile[] {
  if (Object.keys(overrides).length === 0) return weapons;

  const agg = aggregateWeaponKeywords(weapons);
  const delta = makeEmptyWeapon();
  let hasDelta = false;

  // Summed numeric keywords — inject only the amount above what weapons provide
  const numericKeys = ['criticalX', 'lethalX', 'pierceX', 'impactX', 'ramX', 'ionX'] as const;
  for (const k of numericKeys) {
    const ov = overrides[k];
    if (typeof ov === 'number' && ov > agg[k]) {
      delta.keywords[k] = ov - agg[k];
      hasDelta = true;
    }
  }

  // Boolean OR keywords — add to delta only if the override is true and
  // weapons don't already provide it
  const boolOrKeys = ['blast', 'suppressive', 'highVelocity', 'immuneDeflect', 'primitive'] as const;
  for (const k of boolOrKeys) {
    const ov = overrides[k];
    if (ov === true && !agg[k]) {
      delta.keywords[k] = true;
      hasDelta = true;
    }
  }

  return hasDelta ? [...weapons, delta] : weapons;
}

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
    attackState.baseMiniatureCount,
  );

  // Apply weaponMiniCounts overrides (Unit Builder mode)
  const rebuiltWeapons = rebuildWeaponsFromCounts(
    attackerWithUpgrades.weapons,
    attackState.weaponMiniCounts,
    attackerWithUpgrades.weapons,
  );

  // Apply builder keyword overrides on top of the truly-active weapon list
  const finalWeapons =
    attackState.activeMode === 'unit-builder'
      ? applyBuilderKeywordOverrides(rebuiltWeapons, attackState.builderKeywordOverrides)
      : rebuiltWeapons;

  const attacker = { ...attackerWithUpgrades, weapons: finalWeapons };

  const defender = applyDefenderUpgrades(
    baseDefender,
    defenseState.equippedUpgradeIds,
    attackTypeState.attackType,
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
  const activeMode = useAttackConfigStore((s) => s.activeMode);
  const builderKeywordOverrides = useAttackConfigStore((s) => s.builderKeywordOverrides);
  const baseMiniatureCount = useAttackConfigStore((s) => s.baseMiniatureCount);
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
    baseMiniatureCount,
  );

  // Apply weaponMiniCounts overrides (Unit Builder mode)
  const rebuiltWeapons = rebuildWeaponsFromCounts(
    attackerWithUpgrades.weapons,
    weaponMiniCounts,
    attackerWithUpgrades.weapons,
  );

  // Apply builder keyword overrides on top of the truly-active weapon list
  const finalWeapons =
    activeMode === 'unit-builder'
      ? applyBuilderKeywordOverrides(rebuiltWeapons, builderKeywordOverrides)
      : rebuiltWeapons;

  const attacker = { ...attackerWithUpgrades, weapons: finalWeapons };

  const defender = applyDefenderUpgrades(defenderConfig, defenderUpgradeIds, attackType);

  return {
    attacker,
    defender,
    attackType,
  };
}
