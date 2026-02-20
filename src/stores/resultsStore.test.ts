import { describe, it, expect, beforeEach } from 'vitest';
import { useResultsStore, selectIsFull, selectViewedSlot } from './resultsStore';
import type { SimulationResult, AttackConfig } from '../engine/types';
import { AttackType, DefenseDieColor, CoverType, DefenseSurgeChart, AttackSurgeChart, MarksmanStrategy, RerollStrategy } from '../engine/types';

// Minimal mock result for testing
const mockResult: SimulationResult = {
  iterations: 100,
  durationMs: 50,
  totalWounds: { mean: 3, median: 3, mode: 3, min: 0, max: 7, standardDeviation: 1.2 },
  totalWoundsDistribution: [
    { wounds: 0, count: 1000, probability: 0.1, cumulative: 1.0 },
    { wounds: 1, count: 2000, probability: 0.2, cumulative: 0.9 },
    { wounds: 2, count: 3000, probability: 0.3, cumulative: 0.7 },
    { wounds: 3, count: 4000, probability: 0.4, cumulative: 0.4 },
  ],
  guardianWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  guardianWoundsDistribution: [],
  mainTargetWounds: { mean: 3, median: 3, mode: 3, min: 0, max: 7, standardDeviation: 1.2 },
  mainTargetWoundsDistribution: [],
  deflectWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  deflectWoundsDistribution: [],
  djemSoWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  djemSoWoundsDistribution: [],
  suppressionPerAttack: 1,
  hitsBeforeDefense: { mean: 2, median: 2, mode: 2, min: 0, max: 5, standardDeviation: 1 },
  critsBeforeDefense: { mean: 1, median: 1, mode: 1, min: 0, max: 3, standardDeviation: 0.5 },
  efficiency: {
    attackerWoundsPerPoint: 0,
    attackerPointsPerWound: 0,
    defenderWoundsPerPoint: 0,
    defenderPointsPerWound: 0,
    attackerEfficiencyRatio: 0,
  },
};

const mockConfig: AttackConfig = {
  attackType: AttackType.Ranged,
  attacker: {
    weapons: [{ redDice: 2, blackDice: 0, whiteDice: 0, keywords: { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false, immuneDeflect: false, primitive: false, ionX: 0, spray: false, antiMaterielX: 0, antiPersonnelX: 0, cumbersome: false, sidearmMelee: false, sidearmRanged: false, blackOps: false, krakenBlaster: false } }],
    surgeChart: AttackSurgeChart.None,
    aimTokens: 0,
    surgeTokens: 0,
    observationTokens: 0,
    dodgeTokensAttacker: 0,
    preciseX: 0,
    sharpshooterX: 0,
    arsenalX: 0,
    marksman: false,
    marksmanStrategy: MarksmanStrategy.Deterministic,
    rerollStrategy: RerollStrategy.Conservative,
    jediHunter: false,
    jarKaiMastery: false,
    duelistAttacker: false,
    makashiMastery: false,
    deathFromAbove: false,
    holdTheLine: false,
    completeTheMission: false,
    unitCost: 0,
    defeatedMinis: 0,
  },
  defender: {
    dieColor: DefenseDieColor.White,
    surgeChart: DefenseSurgeChart.None,
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
    immunePierce: false,
    immuneMeleePierce: false,
    immuneBlast: false,
    immuneMelee: false,
    impervious: false,
    dangerSenseX: 0,
    uncannyLuckX: 0,
    block: false,
    deflect: false,
    shienMastery: false,
    outmaneuver: false,
    lowProfile: false,
    shieldedX: 0,
    djemSoMastery: false,
    soresuMastery: false,
    duelistDefender: false,
    backup: false,
    holdTheLine: false,
    dugIn: false,
    guardianX: 0,
    completeTheMission: false,
    katarnPatternArmor: false,
    unitCost: 0,
  },
};

describe('resultsStore', () => {
  beforeEach(() => {
    useResultsStore.getState().clearAll();
  });

  it('initializes with empty slots and not loading', () => {
    const state = useResultsStore.getState();
    expect(state.slots).toEqual([]);
    expect(state.viewedSlotId).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.stale).toBe(false);
  });

  it('appends a result slot with correct label, color, and data', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const state = useResultsStore.getState();
    expect(state.slots).toHaveLength(1);
    expect(state.slots[0].label).toBe('Sim 1');
    expect(state.slots[0].color).toBe('indigo');
    expect(state.slots[0].result).toBe(mockResult);
    expect(state.slots[0].configSnapshot).toBe(mockConfig);
  });

  it('appends result and sets viewedSlotId to new slot', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const state = useResultsStore.getState();
    expect(state.viewedSlotId).toBe(state.slots[0].id);
  });

  it('appends result and clears stale, loading, error', () => {
    useResultsStore.getState().setLoading(true);
    useResultsStore.getState().setError('previous error');
    useResultsStore.getState().markStale();

    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const state = useResultsStore.getState();
    expect(state.stale).toBe(false);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('assigns colors in order (indigo, emerald, amber, rose)', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const state = useResultsStore.getState();
    expect(state.slots[0].color).toBe('indigo');
    expect(state.slots[1].color).toBe('emerald');
    expect(state.slots[2].color).toBe('amber');
    expect(state.slots[3].color).toBe('rose');
  });

  it('appendResult is no-op when at max slots (4)', () => {
    // Fill to capacity
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    expect(useResultsStore.getState().slots).toHaveLength(4);

    // Try to add 5th
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    expect(useResultsStore.getState().slots).toHaveLength(4);
  });

  it('selectIsFull returns true when at max slots', () => {
    expect(selectIsFull(useResultsStore.getState())).toBe(false);

    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    expect(selectIsFull(useResultsStore.getState())).toBe(true);
  });

  it('removeSlot removes the correct slot', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const slotIdToRemove = useResultsStore.getState().slots[0].id;
    useResultsStore.getState().removeSlot(slotIdToRemove);

    const state = useResultsStore.getState();
    expect(state.slots).toHaveLength(1);
    expect(state.slots[0].label).toBe('Sim 2');
  });

  it('removeSlot reassigns viewedSlotId when removing viewed slot', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const firstSlotId = useResultsStore.getState().slots[0].id;
    const secondSlotId = useResultsStore.getState().slots[1].id;

    // Set viewed to first slot
    useResultsStore.getState().setViewedSlotId(firstSlotId);

    // Remove first slot
    useResultsStore.getState().removeSlot(firstSlotId);

    // Should switch to second slot
    expect(useResultsStore.getState().viewedSlotId).toBe(secondSlotId);
  });

  it('removeSlot sets viewedSlotId to null when removing last slot', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const slotId = useResultsStore.getState().slots[0].id;
    useResultsStore.getState().removeSlot(slotId);

    expect(useResultsStore.getState().viewedSlotId).toBeNull();
  });

  it('renameSlot updates the label', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const slotId = useResultsStore.getState().slots[0].id;
    useResultsStore.getState().renameSlot(slotId, 'Custom Name');

    expect(useResultsStore.getState().slots[0].label).toBe('Custom Name');
  });

  it('setViewedSlotId switches viewed slot', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const firstSlotId = useResultsStore.getState().slots[0].id;

    useResultsStore.getState().setViewedSlotId(firstSlotId);

    expect(useResultsStore.getState().viewedSlotId).toBe(firstSlotId);
  });

  it('markStale sets stale to true', () => {
    useResultsStore.getState().markStale();

    expect(useResultsStore.getState().stale).toBe(true);
  });

  it('clearAll resets everything including label counter', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().setError('error');
    useResultsStore.getState().markStale();

    useResultsStore.getState().clearAll();

    const state = useResultsStore.getState();
    expect(state.slots).toEqual([]);
    expect(state.viewedSlotId).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.stale).toBe(false);

    // Add a new result to verify counter reset
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    expect(useResultsStore.getState().slots[0].label).toBe('Sim 1');
  });

  it('selectViewedSlot returns the viewed slot', () => {
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const slotId = useResultsStore.getState().slots[0].id;
    useResultsStore.getState().setViewedSlotId(slotId);

    const viewedSlot = selectViewedSlot(useResultsStore.getState());
    expect(viewedSlot).toBe(useResultsStore.getState().slots[0]);
  });

  it('selectViewedSlot returns null when no slot is viewed', () => {
    const viewedSlot = selectViewedSlot(useResultsStore.getState());
    expect(viewedSlot).toBeNull();
  });

  it('setLoading sets loading state', () => {
    useResultsStore.getState().setLoading(true);
    expect(useResultsStore.getState().loading).toBe(true);
  });

  it('setError sets error and clears loading', () => {
    useResultsStore.getState().setLoading(true);

    useResultsStore.getState().setError('Simulation failed');

    const state = useResultsStore.getState();
    expect(state.error).toBe('Simulation failed');
    expect(state.loading).toBe(false);
  });

  it('color recycling: removed slot color becomes available', () => {
    // Add 3 slots
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    // Colors: indigo, emerald, amber

    // Remove the emerald slot (slot 2)
    const emeraldSlotId = useResultsStore.getState().slots[1].id;
    useResultsStore.getState().removeSlot(emeraldSlotId);

    // Add a new slot - should get emerald color (lowest available)
    useResultsStore.getState().appendResult(mockResult, mockConfig);

    const state = useResultsStore.getState();
    expect(state.slots[2].color).toBe('emerald');
  });
});
