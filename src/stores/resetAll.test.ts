import { describe, it, expect, beforeEach } from 'vitest';
import { resetAll } from './resetAll';
import { useAttackConfigStore } from './attackConfigStore';
import { useDefenseConfigStore } from './defenseConfigStore';
import { useAttackTypeStore } from './attackTypeStore';
import { useResultsStore } from './resultsStore';
import {
  AttackType,
  AttackSurgeChart,
  DefenseDieColor,
  DefenseSurgeChart,
  CoverType,
  MarksmanStrategy,
  RerollStrategy,
} from '../engine/types';
import type { SimulationResult, AttackConfig } from '../engine/types';

// Mock data for creating result slots
const createMockResult = (): SimulationResult => ({
  totalWounds: {
    mean: 3.2,
    median: 3,
    mode: 3,
    standardDeviation: 1.5,
  },
  totalWoundsDistribution: [
    { wounds: 0, probability: 0.1, cumulative: 1.0 },
    { wounds: 1, probability: 0.2, cumulative: 0.9 },
    { wounds: 2, probability: 0.3, cumulative: 0.7 },
    { wounds: 3, probability: 0.4, cumulative: 0.4 },
  ],
  attackerWounds: {
    mean: 0,
    median: 0,
    mode: 0,
    standardDeviation: 0,
  },
  attackerWoundsDistribution: [],
  defenderWounds: {
    mean: 0,
    median: 0,
    mode: 0,
    standardDeviation: 0,
  },
  defenderWoundsDistribution: [],
  guardianBreakdown: {
    totalDamageBlocked: {
      mean: 0,
      median: 0,
      mode: 0,
      standardDeviation: 0,
    },
    woundsOnDefender: {
      mean: 0,
      median: 0,
      mode: 0,
      standardDeviation: 0,
    },
    woundsOnGuardian: {
      mean: 0,
      median: 0,
      mode: 0,
      standardDeviation: 0,
    },
    distributionBreakdown: [],
  },
  efficiency: {
    attackerWoundsPerPoint: 0.02,
    defenderWoundsPerPoint: 0.08,
    ratio: 4.0,
  },
  iterations: 10000,
  durationMs: 42,
});

const createMockConfig = (): AttackConfig => ({
  attacker: {
    redDice: 6,
    blackDice: 0,
    whiteDice: 0,
    surgeChart: AttackSurgeChart.ToCrit,
    aimTokens: 0,
    surgeTokens: 0,
    observationTokens: 0,
    dodgeTokensAttacker: 0,
    preciseX: 0,
    criticalX: 0,
    lethalX: 0,
    sharpshooterX: 0,
    pierceX: 0,
    impactX: 0,
    ramX: 0,
    blast: false,
    highVelocity: false,
    suppressive: false,
    marksman: false,
    marksmanStrategy: MarksmanStrategy.RerollBlanks,
    rerollStrategy: RerollStrategy.RerollBlanks,
    jediHunter: false,
    spray: false,
    antiMaterielX: 0,
    antiPersonnelX: 0,
    cumbersome: false,
    duelistAttacker: false,
    makashiMastery: false,
    jarKaiMastery: false,
    immuneDeflect: false,
    holdTheLine: false,
    deathFromAbove: false,
    unitCost: 0,
  },
  defender: {
    dieColor: DefenseDieColor.White,
    surgeChart: DefenseSurgeChart.None,
    dodgeTokens: 0,
    surgeTokens: 0,
    minisInLOS: 1,
    coverType: CoverType.None,
    coverX: 0,
    smokeTokens: 0,
    suppressed: false,
    armorX: 0,
    weakPointX: 0,
    immunePierce: false,
    immuneBlast: false,
    impervious: false,
    dangerSenseX: 0,
    deflect: false,
    shienMastery: false,
    soresuMastery: false,
    backup: false,
    shieldedX: 0,
    suppressionTokens: 0,
    lowProfile: false,
    uncannyLuckX: 0,
    block: false,
    outmaneuver: false,
    djemSoMastery: false,
    duelistDefender: false,
    immuneMeleePierce: false,
    guardianX: 0,
    guardianDieColor: DefenseDieColor.White,
    guardianSurgeChart: DefenseSurgeChart.None,
    dugIn: false,
    holdTheLine: false,
    unitCost: 0,
  },
  attackType: AttackType.Ranged,
});

describe('resetAll', () => {
  beforeEach(() => {
    // Start with clean state for each test
    useAttackConfigStore.getState().reset();
    useDefenseConfigStore.getState().reset();
    useAttackTypeStore.getState().reset();
    useResultsStore.getState().clearAll();
  });

  it('resets all stores to default state', () => {
    // Mutate all stores to non-default values
    
    // Attack config
    const attackStore = useAttackConfigStore.getState();
    attackStore.setWeaponDice(0, 'red', 5);
    attackStore.setField('surgeChart', AttackSurgeChart.ToCrit);
    attackStore.setWeaponKeyword(0, 'pierceX', 2);
    attackStore.setField('marksman', true);
    attackStore.setField('unitCost', 150);
    
    // Defense config
    const defenseStore = useDefenseConfigStore.getState();
    defenseStore.setField('dieColor', DefenseDieColor.Red);
    defenseStore.setField('surgeChart', DefenseSurgeChart.ToBlock);
    defenseStore.setField('coverType', CoverType.Heavy);
    defenseStore.setField('armorX', 2);
    defenseStore.setField('deflect', true);
    defenseStore.setField('unitCost', 80);
    
    // Attack type
    const attackTypeStore = useAttackTypeStore.getState();
    attackTypeStore.setAttackType(AttackType.Melee);
    
    // Results (add some result slots)
    const resultsStore = useResultsStore.getState();
    resultsStore.appendResult(createMockResult(), createMockConfig());
    resultsStore.appendResult(createMockResult(), createMockConfig());
    resultsStore.setLoading(true);
    resultsStore.setError('Test error');
    resultsStore.markStale();
    
    // Verify stores are mutated
    expect(useAttackConfigStore.getState().weapons[0].redDice).toBe(5);
    expect(useDefenseConfigStore.getState().dieColor).toBe(DefenseDieColor.Red);
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Melee);
    expect(useResultsStore.getState().slots.length).toBe(2);
    
    // Call resetAll
    resetAll();
    
    // Verify all stores are reset to defaults
    const attackState = useAttackConfigStore.getState();
    expect(attackState.weapons[0].redDice).toBe(0);
    expect(attackState.surgeChart).toBe(AttackSurgeChart.None);
    expect(attackState.weapons[0].keywords.pierceX).toBe(0);
    expect(attackState.marksman).toBe(false);
    expect(attackState.unitCost).toBe(0);
    
    const defenseState = useDefenseConfigStore.getState();
    expect(defenseState.dieColor).toBe(DefenseDieColor.White);
    expect(defenseState.surgeChart).toBe(DefenseSurgeChart.None);
    expect(defenseState.coverType).toBe(CoverType.None);
    expect(defenseState.armorX).toBe(0);
    expect(defenseState.deflect).toBe(false);
    expect(defenseState.unitCost).toBe(0);
    
    const attackTypeState = useAttackTypeStore.getState();
    expect(attackTypeState.attackType).toBe(AttackType.Ranged); // Default is Ranged, not All
    
    const resultsState = useResultsStore.getState();
    expect(resultsState.slots).toEqual([]);
    expect(resultsState.viewedSlotId).toBe(null);
    expect(resultsState.loading).toBe(false);
    expect(resultsState.error).toBe(null);
    expect(resultsState.stale).toBe(false);
  });

  it('resets result slot counter', () => {
    // Add some slots to increment the counter
    const resultsStore = useResultsStore.getState();
    resultsStore.appendResult(createMockResult(), createMockConfig()); // "Sim 1"
    resultsStore.appendResult(createMockResult(), createMockConfig()); // "Sim 2"
    resultsStore.appendResult(createMockResult(), createMockConfig()); // "Sim 3"
    
    // Verify we have multiple slots
    expect(useResultsStore.getState().slots.length).toBe(3);
    expect(useResultsStore.getState().slots[2].label).toBe('Sim 3');
    
    // Call resetAll
    resetAll();
    
    // Add new slot - should be "Sim 1" again (counter reset)
    useResultsStore.getState().appendResult(createMockResult(), createMockConfig());
    expect(useResultsStore.getState().slots[0].label).toBe('Sim 1');
    expect(useResultsStore.getState().slots.length).toBe(1);
  });

  it('can be called multiple times without error', () => {
    // Mutate stores
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 3);
    useDefenseConfigStore.getState().setField('armorX', 1);
    useResultsStore.getState().appendResult(createMockResult(), createMockConfig());
    
    // Call resetAll multiple times
    expect(() => {
      resetAll();
      resetAll();
      resetAll();
    }).not.toThrow();
    
    // Verify state is still clean
    expect(useAttackConfigStore.getState().weapons[0].redDice).toBe(0);
    expect(useDefenseConfigStore.getState().armorX).toBe(0);
    expect(useResultsStore.getState().slots.length).toBe(0);
  });

  it('resets stores even when some are already at defaults', () => {
    // Only mutate some stores
    useAttackConfigStore.getState().setWeaponDice(0, 'red', 4);
    useResultsStore.getState().appendResult(createMockResult(), createMockConfig());
    
    // Defense and attackType are already at defaults
    expect(useDefenseConfigStore.getState().dieColor).toBe(DefenseDieColor.White);
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Ranged);
    
    // Call resetAll
    resetAll();
    
    // Everything should be at defaults
    expect(useAttackConfigStore.getState().weapons[0].redDice).toBe(0);
    expect(useDefenseConfigStore.getState().dieColor).toBe(DefenseDieColor.White);
    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Ranged);
    expect(useResultsStore.getState().slots.length).toBe(0);
  });

  it('preserves store references after reset', () => {
    const attackStore = useAttackConfigStore;
    const defenseStore = useDefenseConfigStore;
    const attackTypeStore = useAttackTypeStore;
    const resultsStore = useResultsStore;
    
    resetAll();
    
    // Store references should be unchanged
    expect(useAttackConfigStore).toBe(attackStore);
    expect(useDefenseConfigStore).toBe(defenseStore);
    expect(useAttackTypeStore).toBe(attackTypeStore);
    expect(useResultsStore).toBe(resultsStore);
  });
});