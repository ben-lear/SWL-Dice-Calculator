import { describe, it, expect } from 'vitest';
import { modifyDefenseDice } from './defenseModifiers';
import { DefenseFace, DefenseDieColor } from './types';
import { createMinimalAttacker, createMinimalDefender } from './testHelpers';

describe('defenseModifiers', () => {
  it('counts blocks correctly', () => {
    const config = {
      attacker: createMinimalAttacker(),
      defender: createMinimalDefender(),
      attackType: 'ranged' as any,
    };

    const results = [
      { color: DefenseDieColor.Red, face: DefenseFace.Block },
      { color: DefenseDieColor.Red, face: DefenseFace.Block },
      { color: DefenseDieColor.White, face: DefenseFace.Blank },
      { color: DefenseDieColor.Red, face: DefenseFace.Surge },
    ];

    const { blocks } = modifyDefenseDice(results, config, false);

    expect(blocks).toBe(2);
  });

  it('handles empty results', () => {
    const config = {
      attacker: createMinimalAttacker(),
      defender: createMinimalDefender(),
      attackType: 'ranged' as any,
    };

    const { blocks } = modifyDefenseDice([], config, false);

    expect(blocks).toBe(0);
  });

  it('handles no blocks in results', () => {
    const config = {
      attacker: createMinimalAttacker(),
      defender: createMinimalDefender(),
      attackType: 'ranged' as any,
    };

    const results = [
      { color: DefenseDieColor.White, face: DefenseFace.Blank },
      { color: DefenseDieColor.Red, face: DefenseFace.Surge },
    ];

    const { blocks } = modifyDefenseDice(results, config, false);

    expect(blocks).toBe(0);
  });

  it('handles all blocks', () => {
    const config = {
      attacker: createMinimalAttacker(),
      defender: createMinimalDefender(),
      attackType: 'ranged' as any,
    };

    const results = [
      { color: DefenseDieColor.Red, face: DefenseFace.Block },
      { color: DefenseDieColor.Red, face: DefenseFace.Block },
      { color: DefenseDieColor.White, face: DefenseFace.Block },
    ];

    const { blocks } = modifyDefenseDice(results, config, false);

    expect(blocks).toBe(3);
  });

  it('ignores config and dodge parameters (simple implementation)', () => {
    const config1 = {
      attacker: createMinimalAttacker({ aimTokens: 5 }),
      defender: createMinimalDefender({ armorX: 10 }),
      attackType: 'melee' as any,
    };

    const config2 = {
      attacker: createMinimalAttacker(),
      defender: createMinimalDefender(),
      attackType: 'ranged' as any,
    };

    const results = [
      { color: DefenseDieColor.Red, face: DefenseFace.Block },
      { color: DefenseDieColor.White, face: DefenseFace.Block },
    ];

    const { blocks: blocks1 } = modifyDefenseDice(results, config1, true);
    const { blocks: blocks2 } = modifyDefenseDice(results, config2, false);

    // Should be the same regardless of config or dodge status
    expect(blocks1).toBe(2);
    expect(blocks2).toBe(2);
  });
});