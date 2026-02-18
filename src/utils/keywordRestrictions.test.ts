import { describe, it, expect } from 'vitest';
import { AttackType } from '../engine/types';
import {
  ATTACKER_KEYWORD_RESTRICTIONS,
  WEAPON_KEYWORD_RESTRICTIONS,
  DEFENDER_KEYWORD_RESTRICTIONS,
  isFieldActiveForAttackType,
} from './keywordRestrictions';

describe('isFieldActiveForAttackType', () => {
  // ── 'all' restriction (no type restriction) ──
  it('returns true for unrestricted keywords regardless of attack type', () => {
    expect(isFieldActiveForAttackType('all', AttackType.Ranged)).toBe(true);
    expect(isFieldActiveForAttackType('all', AttackType.Melee)).toBe(true);
    expect(isFieldActiveForAttackType('all', AttackType.Overrun)).toBe(true);
  });

  // ── Ranged attack type ──
  it('enables ranged-only keywords for Ranged attacks', () => {
    expect(isFieldActiveForAttackType('ranged', AttackType.Ranged)).toBe(true);
  });

  it('disables melee-only keywords for Ranged attacks', () => {
    expect(isFieldActiveForAttackType('melee', AttackType.Ranged)).toBe(false);
  });

  it('enables ranged-melee keywords for Ranged attacks', () => {
    expect(isFieldActiveForAttackType('ranged-melee', AttackType.Ranged)).toBe(true);
  });

  // ── Melee attack type ──
  it('disables ranged-only keywords for Melee attacks', () => {
    expect(isFieldActiveForAttackType('ranged', AttackType.Melee)).toBe(false);
  });

  it('enables melee-only keywords for Melee attacks', () => {
    expect(isFieldActiveForAttackType('melee', AttackType.Melee)).toBe(true);
  });

  it('enables ranged-melee keywords for Melee attacks', () => {
    expect(isFieldActiveForAttackType('ranged-melee', AttackType.Melee)).toBe(true);
  });

  // ── Overrun attack type ──
  it('disables ranged-only keywords for Overrun', () => {
    expect(isFieldActiveForAttackType('ranged', AttackType.Overrun)).toBe(false);
  });

  it('disables melee-only keywords for Overrun', () => {
    expect(isFieldActiveForAttackType('melee', AttackType.Overrun)).toBe(false);
  });

  it('disables ranged-melee keywords for Overrun', () => {
    expect(isFieldActiveForAttackType('ranged-melee', AttackType.Overrun)).toBe(false);
  });

  // ── 'melee-overrun' restriction ──
  it('enables melee-overrun keywords for Melee attacks', () => {
    expect(isFieldActiveForAttackType('melee-overrun', AttackType.Melee)).toBe(true);
  });

  it('enables melee-overrun keywords for Overrun attacks', () => {
    expect(isFieldActiveForAttackType('melee-overrun', AttackType.Overrun)).toBe(true);
  });

  it('disables melee-overrun keywords for Ranged attacks', () => {
    expect(isFieldActiveForAttackType('melee-overrun', AttackType.Ranged)).toBe(false);
  });

  it('enables unrestricted keywords for Overrun', () => {
    expect(isFieldActiveForAttackType('all', AttackType.Overrun)).toBe(true);
  });

  // ── Hybrid attack type ──
  it('enables all keywords for Hybrid', () => {
    expect(isFieldActiveForAttackType('ranged', AttackType.Hybrid)).toBe(true);
    expect(isFieldActiveForAttackType('melee', AttackType.Hybrid)).toBe(true);
    expect(isFieldActiveForAttackType('ranged-melee', AttackType.Hybrid)).toBe(true);
    expect(isFieldActiveForAttackType('melee-overrun', AttackType.Hybrid)).toBe(true);
    expect(isFieldActiveForAttackType('all', AttackType.Hybrid)).toBe(true);
  });
});

describe('ATTACKER_KEYWORD_RESTRICTIONS', () => {
  it('sharpshooterX is ranged-only', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['sharpshooterX']).toBe('ranged');
  });

  it('duelistAttacker is melee-only', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['duelistAttacker']).toBe('melee');
  });

  it('marksman is unrestricted', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['marksman']).toBe('all');
  });

  it('holdTheLine (attacker) is melee-only', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['holdTheLine']).toBe('melee');
  });

  it('jarKaiMastery is melee-only', () => {
    expect(ATTACKER_KEYWORD_RESTRICTIONS['jarKaiMastery']).toBe('melee');
  });
});

describe('WEAPON_KEYWORD_RESTRICTIONS', () => {
  it('highVelocity is unrestricted (no attack type restriction per rulebook)', () => {
    expect(WEAPON_KEYWORD_RESTRICTIONS['highVelocity']).toBe('all');
  });

  it('pierceX is unrestricted', () => {
    expect(WEAPON_KEYWORD_RESTRICTIONS['pierceX']).toBe('all');
  });

  it('blast is unrestricted', () => {
    expect(WEAPON_KEYWORD_RESTRICTIONS['blast']).toBe('all');
  });

  it('ramX is melee-overrun (only applies during Melee/Overrun attacks)', () => {
    expect(WEAPON_KEYWORD_RESTRICTIONS['ramX']).toBe('melee-overrun');
  });
});

describe('DEFENDER_KEYWORD_RESTRICTIONS', () => {
  it('deflect is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['deflect']).toBe('ranged');
  });

  it('djemSoMastery is melee-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['djemSoMastery']).toBe('melee');
  });

  it('armorX is unrestricted', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['armorX']).toBe('all');
  });

  it('coverType is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['coverType']).toBe('ranged');
  });

  it('guardianX is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['guardianX']).toBe('ranged');
  });

  it('lowProfile is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['lowProfile']).toBe('ranged');
  });

  it('dugIn is ranged-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['dugIn']).toBe('ranged');
  });

  it('holdTheLine (defender) is ranged-melee', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['holdTheLine']).toBe('ranged-melee');
  });

  it('duelistDefender is melee-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['duelistDefender']).toBe('melee');
  });

  it('immuneMeleePierce is melee-only', () => {
    expect(DEFENDER_KEYWORD_RESTRICTIONS['immuneMeleePierce']).toBe('melee');
  });
});
