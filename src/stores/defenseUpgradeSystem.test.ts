import { describe, it, expect } from 'vitest';
import { getDefenderUpgrades, getDefenderUpgradeById, getDefenderUpgradesByType } from './defenseUpgradeHelpers';
import { applyDefenderUpgrades, getEquippedDefenderUpgrades } from './defenseUpgradeApplicator';
import type { DefenderConfig } from '../engine/types';
import { DefenseDieColor, DefenseSurgeChart, CoverType } from '../engine/types';

describe('Defender Upgrade System', () => {
  const baseConfig: DefenderConfig = {
    dieColor: DefenseDieColor.White,
    surgeChart: DefenseSurgeChart.None,
    disableDefenseDice: false,
    coverType: CoverType.None,
    coverX: 0,
    smokeTokens: 0,
    suppressed: false,
    dodgeTokens: 0,
    surgeTokens: 0,
    suppressionTokens: 0,
    minisInLOS: 1,
    armorX: 0,
    weakPointX: 0,
    dangerSenseX: 0,
    uncannyLuckX: 0,
    shieldedX: 0,
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
    guardianX: 0,
    guardianDieColor: DefenseDieColor.White,
    guardianSurgeChart: DefenseSurgeChart.None,
    guardianDeflect: false,
    guardianSoresuMastery: false,
    guardianDodgeTokens: 0,
    unitCost: 44,
  };

  describe('defenseUpgradeHelpers', () => {
    it('should return stub upgrade data', () => {
      const upgrades = getDefenderUpgrades();
      expect(upgrades).toHaveLength(3);
      expect(upgrades[0].id).toBe('stub-armor-upgrade');
      expect(upgrades[0].name).toBe('Armor Plating');
      expect(upgrades[0].keywordEffects.armorX).toBe(1);
    });

    it('should find upgrades by ID', () => {
      const upgrade = getDefenderUpgradeById('stub-armor-upgrade');
      expect(upgrade).toBeDefined();
      expect(upgrade?.name).toBe('Armor Plating');
      
      const notFound = getDefenderUpgradeById('nonexistent');
      expect(notFound).toBeNull();
    });

    it('should filter upgrades by slot type', () => {
      const gearUpgrades = getDefenderUpgradesByType('gear');
      expect(gearUpgrades).toHaveLength(1);
      expect(gearUpgrades[0].id).toBe('stub-defensive-upgrade');
    });
  });

  describe('defenseUpgradeApplicator', () => {
    it('should get equipped upgrades by ID', () => {
      const equippedIds = ['stub-armor-upgrade', 'stub-defensive-upgrade'];
      const equipped = getEquippedDefenderUpgrades(equippedIds);
      
      expect(equipped).toHaveLength(2);
      expect(equipped[0].name).toBe('Armor Plating');
      expect(equipped[1].name).toBe('Emergency Stims');
    });

    it('should apply upgrade effects to base config', () => {
      const upgrades = getEquippedDefenderUpgrades(['stub-armor-upgrade', 'stub-defensive-upgrade']);
      const result = applyDefenderUpgrades(baseConfig, upgrades);
      
      // Should add armor from the armor upgrade
      expect(result.armorX).toBe(1);
      
      // Should add uncanny luck from the defensive upgrade
      expect(result.uncannyLuckX).toBe(1);
      
      // Should add upgrade costs
      expect(result.unitCost).toBe(44 + 12 + 8); // base + armor + gear

      // Should not modify the original config
      expect(baseConfig.armorX).toBe(0);
      expect(baseConfig.unitCost).toBe(44);
    });

    it('should handle empty upgrade list', () => {
      const result = applyDefenderUpgrades(baseConfig, []);
      expect(result).toEqual(baseConfig);
    });

    it('should handle unknown upgrade IDs gracefully', () => {
      const equipped = getEquippedDefenderUpgrades(['nonexistent-upgrade']);
      expect(equipped).toHaveLength(0);
      
      const result = applyDefenderUpgrades(baseConfig, equipped);
      expect(result).toEqual(baseConfig);
    });
  });
});