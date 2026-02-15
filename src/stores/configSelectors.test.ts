import { describe, it, expect, beforeEach } from 'vitest';
import { useAttackConfigStore } from './attackConfigStore';
import { useDefenseConfigStore } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';
import { getFullConfig } from './configSelectors';
import { AttackType, AttackSurgeChart, DefenseDieColor } from '../engine/types';
import { Faction } from '../data/presets';

describe('getFullConfig', () => {
  beforeEach(() => {
    useAttackConfigStore.getState().reset();
    useDefenseConfigStore.getState().reset();
    useAttackTypeStore.getState().reset();
  });

  it('returns a valid AttackConfig from default stores', () => {
    const config = getFullConfig();
    
    expect(config).toHaveProperty('attacker');
    expect(config).toHaveProperty('defender');
    expect(config).toHaveProperty('attackType');
    
    expect(config.attacker.weapons).toHaveLength(1);
    expect(config.attacker.surgeChart).toBe(AttackSurgeChart.None);
    expect(config.defender.dieColor).toBe(DefenseDieColor.White);
    expect(config.attackType).toBe(AttackType.Ranged);
  });

  it('reflects changes from individual stores', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useAttackConfigStore.getState().setField('preciseX', 2);
    
    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.Red);
    useDefenseConfigStore.getState().setField('armorX', 2);
    
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);

    const config = getFullConfig();
    
    expect(config.attacker.weapons[0].redDice).toBe(6);
    expect(config.attacker.preciseX).toBe(2);
    expect(config.defender.dieColor).toBe(DefenseDieColor.Red);
    expect(config.defender.armorX).toBe(2);
    expect(config.attackType).toBe(AttackType.Melee);
  });

  it('does not include UI-only fields', () => {
    useAttackConfigStore.getState().setSelectedFaction('empire' as any);
    useDefenseConfigStore.getState().setSelectedFaction(Faction.RebelAlliance);

    const config = getFullConfig();
    
    expect(config.attacker).not.toHaveProperty('selectedFaction');
    expect(config.attacker).not.toHaveProperty('selectedPresetId');
    expect(config.attacker).not.toHaveProperty('activeMode');
    expect(config.defender).not.toHaveProperty('selectedFaction');
    expect(config.defender).not.toHaveProperty('selectedPresetId');
    expect(config.defender).not.toHaveProperty('activeMode');
  });

  it('attacker config includes weapons array', () => {
    useAttackConfigStore.getState().addWeapon();
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    useAttackConfigStore.getState().setWeaponDice(1, 'black', 2);

    const config = getFullConfig();
    
    expect(config.attacker.weapons).toHaveLength(2);
    expect(config.attacker.weapons[0].redDice).toBe(4);
    expect(config.attacker.weapons[1].blackDice).toBe(2);
  });

  it('defender config includes guardian fields', () => {
    useDefenseConfigStore.getState().setField('guardianX', 2);
    useDefenseConfigStore.getState().setField('guardianDeflect', true);

    const config = getFullConfig();
    
    expect(config.defender.guardianX).toBe(2);
    expect(config.defender.guardianDeflect).toBe(true);
  });
});
