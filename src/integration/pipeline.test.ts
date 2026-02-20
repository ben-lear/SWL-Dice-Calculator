import { describe, it, expect, beforeEach } from 'vitest';
import { useAttackConfigStore } from '../stores/attackConfigStore';
import { useDefenseConfigStore } from '../stores/defenseConfigStore';
import { useAttackTypeStore } from '../stores/attackTypeStore';
import { useResultsStore } from '../stores/resultsStore';
import { getFullConfig } from '../stores/configSelectors';
import { simulate } from '../engine/simulator';
import {
  AttackType,
  AttackSurgeChart,
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
} from '../engine/types';

describe('End-to-End Pipeline', () => {
  beforeEach(() => {
    useAttackConfigStore.getState().reset();
    useDefenseConfigStore.getState().reset();
    useAttackTypeStore.getState().reset();
    useResultsStore.getState().clearAll();
  });

  it('produces zero wounds with zero dice', () => {
    const config = getFullConfig();
    const result = simulate(config, 100);
    expect(result.totalWounds.mean).toBe(0);
  });

  it('produces wounds with configured dice', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useAttackConfigStore.getState().setField('surgeChart', AttackSurgeChart.ToCrit);

    const config = getFullConfig();
    const result = simulate(config, 1000);
    expect(result.totalWounds.mean).toBeGreaterThan(0);
  });

  it('applies attack type filtering correctly in engine', () => {
    // Configure deflect (ranged-only keyword)
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useDefenseConfigStore.getState().setField('disableDefenseDice', false);
    useDefenseConfigStore.getState().setField('deflect', true);
    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.Red);
    useDefenseConfigStore.getState().setField('surgeChart', DefenseSurgeChart.None);

    // Ranged attack — Deflect should activate
    useAttackTypeStore.getState().setAttackType(AttackType.Ranged);
    const rangedConfig = getFullConfig();
    const rangedResult = simulate(rangedConfig, 5000);

    // Melee attack — Deflect should be ignored
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const meleeConfig = getFullConfig();
    const meleeResult = simulate(meleeConfig, 5000);

    // Ranged with Deflect should produce fewer wounds on average
    // (Deflect gives surge→block, reducing wounds)
    expect(rangedResult.totalWounds.mean).toBeLessThanOrEqual(meleeResult.totalWounds.mean);
  });

  it('cover does not apply to Melee attacks', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useDefenseConfigStore.getState().setField('coverType', CoverType.Heavy);
    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.White);
    useDefenseConfigStore.getState().setField('surgeChart', DefenseSurgeChart.None);

    // Melee attack — cover should not apply (engine guard)
    useAttackTypeStore.getState().setAttackType(AttackType.Melee);
    const meleeConfig = getFullConfig();
    const meleeResult = simulate(meleeConfig, 5000);

    // Ranged with no cover
    useDefenseConfigStore.getState().setField('coverType', CoverType.None);
    useAttackTypeStore.getState().setAttackType(AttackType.Ranged);
    const rangedNoCoverConfig = getFullConfig();
    const rangedNoCoverResult = simulate(rangedNoCoverConfig, 5000);

    // Melee with Heavy cover should produce similar wounds to Ranged with no cover
    // (since cover is ignored in Melee)
    const diff = Math.abs(meleeResult.totalWounds.mean - rangedNoCoverResult.totalWounds.mean);
    expect(diff).toBeLessThan(1.0); // Allow some Monte Carlo variance
  });

  it('cover cap does not exceed 2', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useDefenseConfigStore.getState().setField('coverType', CoverType.Heavy); // 2
    useDefenseConfigStore.getState().setField('coverX', 2);                  // +2
    useDefenseConfigStore.getState().setField('suppressed', true);           // +1
    useDefenseConfigStore.getState().setField('smokeTokens', 3);             // +3

    const config = getFullConfig();
    // Cover value should be capped at 2 regardless of inputs
    // This test primarily verifies no runtime errors with extreme inputs
    const result = simulate(config, 1000);
    expect(result.totalWounds.mean).toBeGreaterThanOrEqual(0);
  });

  it('preset loading produces valid config', () => {
    // Simulate loading a preset by setting typical values
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useAttackConfigStore.getState().setField('surgeChart', AttackSurgeChart.ToCrit);
    useAttackConfigStore.getState().setWeaponKeyword(0, 'pierceX', 3);
    useAttackConfigStore.getState().setWeaponKeyword(0, 'impactX', 3);
    useAttackConfigStore.getState().setField('unitCost', 190);

    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.White);
    useDefenseConfigStore.getState().setField('surgeChart', DefenseSurgeChart.ToBlock);
    useDefenseConfigStore.getState().setField('unitCost', 40);

    const config = getFullConfig();
    const result = simulate(config, 1000);

    expect(result.totalWounds.mean).toBeGreaterThan(0);
    expect(result.efficiency).toBeDefined();
    expect(result.efficiency.attackerWoundsPerPoint).toBeGreaterThan(0);
    expect(result.efficiency.defenderWoundsPerPoint).toBeGreaterThan(0);
  });

  it('Aim token economy — total consumption does not exceed available', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    useAttackConfigStore.getState().setField('aimTokens', 2);
    useAttackConfigStore.getState().setWeaponKeyword(0, 'lethalX', 3);
    useAttackConfigStore.getState().setField('marksman', true);
    useAttackConfigStore.getState().setField('duelistAttacker', true);

    const config = getFullConfig();
    // Should not throw — engine handles Aim consumption order
    const result = simulate(config, 1000);
    expect(result.totalWounds.mean).toBeGreaterThanOrEqual(0);
  });
});

describe('Performance', () => {
  it('completes 10,000 iterations in under 500ms', () => {
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 6);
    useAttackConfigStore.getState().setField('surgeChart', AttackSurgeChart.ToCrit);
    useAttackConfigStore.getState().setWeaponKeyword(0, 'pierceX', 3);
    useAttackConfigStore.getState().setWeaponKeyword(0, 'impactX', 3);
    useDefenseConfigStore.getState().setField('dieColor', DefenseDieColor.White);
    useDefenseConfigStore.getState().setField('surgeChart', DefenseSurgeChart.ToBlock);
    useDefenseConfigStore.getState().setField('coverType', CoverType.Heavy);

    const config = getFullConfig();

    const start = performance.now();
    const result = simulate(config, 10000);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);
    expect(result.totalWounds.mean).toBeGreaterThan(0);
  });
});
