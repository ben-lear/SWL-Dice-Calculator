import { describe, it, expect } from 'vitest';
import { calculateAvailableSurgeConversions, calculateSurgeConversionsByType } from './surgeConversionUtils';
import { AttackType, AttackSurgeChart, RerollStrategy, MarksmanStrategy } from './types';
import type { AttackerConfig, AggregatedWeaponKeywords } from './types';

describe('surgeConversionUtils', () => {
  // Helper to create minimal attacker config
  const createAttacker = (overrides: Partial<AttackerConfig> = {}): AttackerConfig => ({
    weapons: [],
    aimTokens: 0,
    surgeTokens: 0,
    surgeChart: AttackSurgeChart.None,
    observationTokens: 0,
    dodgeTokensAttacker: 0,
    preciseX: 0,
    sharpshooterX: 0,
    arsenalX: 0,
    marksman: false,
    marksmanStrategy: MarksmanStrategy.Deterministic,
    jediHunter: false,
    jarKaiMastery: false,
    duelistAttacker: false,
    makashiMastery: false,
    deathFromAbove: false,
    holdTheLine: false,
    completeTheMission: false,
    unitCost: 0,
    rerollStrategy: RerollStrategy.Conservative,
    ...overrides,
  });

  const createKeywords = (overrides: Partial<AggregatedWeaponKeywords> = {}): AggregatedWeaponKeywords => ({
    criticalX: 0,
    lethalX: 0,
    pierceX: 0,
    impactX: 0,
    ramX: 0,
    blast: false,
    suppressive: false,
    highVelocity: false,
    immuneDeflect: false,
    primitive: false,
    ionX: 0,
    ...overrides,
  });

  describe('calculateSurgeConversionsByType', () => {
    it('returns only criticalX conversions when only criticalX is present', () => {
      const attacker = createAttacker();
      const keywords = createKeywords({ criticalX: 2 });
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: 2, hitConversions: 0 });
    });

    it('returns only surge token conversions when only surge tokens present', () => {
      const attacker = createAttacker({ surgeTokens: 3 });
      const keywords = createKeywords();
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: 0, hitConversions: 3 });
    });

    it('returns mixed limited conversions with both criticalX and surge tokens', () => {
      const attacker = createAttacker({ surgeTokens: 2 });
      const keywords = createKeywords({ criticalX: 1 });
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Melee);
      
      expect(result).toEqual({ critConversions: 1, hitConversions: 2 });
    });

    it('returns infinite crit conversions for Jedi Hunter', () => {
      const attacker = createAttacker({ jediHunter: true });
      const keywords = createKeywords();
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: Infinity, hitConversions: 0 });
    });

    it('returns infinite crit conversions for ToCrit chart', () => {
      const attacker = createAttacker({ surgeChart: AttackSurgeChart.ToCrit });
      const keywords = createKeywords();
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: Infinity, hitConversions: 0 });
    });

    it('returns infinite hit conversions for ToHit chart', () => {
      const attacker = createAttacker({ surgeChart: AttackSurgeChart.ToHit });
      const keywords = createKeywords();
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: 0, hitConversions: Infinity });
    });

    it('returns infinite hit conversions for Hold the Line in melee', () => {
      const attacker = createAttacker({ holdTheLine: true });
      const keywords = createKeywords();
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Melee);
      
      expect(result).toEqual({ critConversions: 0, hitConversions: Infinity });
    });

    it('does NOT return infinite hit conversions for Hold the Line in ranged attack', () => {
      const attacker = createAttacker({ holdTheLine: true, surgeTokens: 1 });
      const keywords = createKeywords();
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: 0, hitConversions: 1 });
    });

    it('returns zero conversions when no sources available', () => {
      const attacker = createAttacker();
      const keywords = createKeywords();
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: 0, hitConversions: 0 });
    });

    it('prioritizes Jedi Hunter over surge tokens', () => {
      const attacker = createAttacker({ jediHunter: true, surgeTokens: 5 });
      const keywords = createKeywords();
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: Infinity, hitConversions: 0 });
    });

    it('prioritizes ToCrit chart over criticalX', () => {
      const attacker = createAttacker({ surgeChart: AttackSurgeChart.ToCrit });
      const keywords = createKeywords({ criticalX: 3 });
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: Infinity, hitConversions: 0 });
    });

    it('prioritizes ToHit chart over surge tokens', () => {
      const attacker = createAttacker({ 
        surgeChart: AttackSurgeChart.ToHit,
        surgeTokens: 2 
      });
      const keywords = createKeywords();
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: 0, hitConversions: Infinity });
    });

    it('combines criticalX from keywords with surge tokens from attacker', () => {
      const attacker = createAttacker({ surgeTokens: 3 });
      const keywords = createKeywords({ criticalX: 2 });
      
      const result = calculateSurgeConversionsByType(attacker, keywords, AttackType.Ranged);
      
      expect(result).toEqual({ critConversions: 2, hitConversions: 3 });
    });
  });

  describe('calculateAvailableSurgeConversions (existing function)', () => {
    it('returns total conversions combining all limited sources', () => {
      const attacker = createAttacker({ surgeTokens: 2 });
      const keywords = createKeywords({ criticalX: 1 });
      
      const result = calculateAvailableSurgeConversions(attacker, keywords, AttackType.Melee);
      
      expect(result).toBe(3); // 1 + 2
    });

    it('returns Infinity for Jedi Hunter', () => {
      const attacker = createAttacker({ jediHunter: true });
      const keywords = createKeywords();
      
      const result = calculateAvailableSurgeConversions(attacker, keywords, AttackType.Ranged);
      
      expect(result).toBe(Infinity);
    });
  });
});
