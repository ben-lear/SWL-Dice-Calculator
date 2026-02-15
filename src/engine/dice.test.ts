import { describe, it, expect } from 'vitest';
import {
  rollAttackDie,
  rollDefenseDie,
  rollAttackPool,
  rollDefensePool,
  upgradeAttack,
  downgradeAttack,
  upgradeDefense,
  downgradeDefense,
  applyDieModification,
} from './dice';
import { AttackDieColor, DefenseDieColor, AttackFace, DefenseFace } from './types';

describe('rollAttackDie', () => {
  it('returns a valid attack face', () => {
    const face = rollAttackDie(AttackDieColor.Red);
    expect(Object.values(AttackFace)).toContain(face);
  });

  it('returns valid faces for all colors (smoke test)', () => {
    for (let i = 0; i < 100; i++) {
      const redFace = rollAttackDie(AttackDieColor.Red);
      const blackFace = rollAttackDie(AttackDieColor.Black);
      const whiteFace = rollAttackDie(AttackDieColor.White);
      
      expect(Object.values(AttackFace)).toContain(redFace);
      expect(Object.values(AttackFace)).toContain(blackFace);
      expect(Object.values(AttackFace)).toContain(whiteFace);
    }
  });

  describe('statistical distributions', () => {
    const N = 60_000;
    const tolerance = 0.02; // ±2% absolute tolerance

    it('red die: 1/8 blank, 5/8 hit, 1/8 crit, 1/8 surge', () => {
      const counts = { blank: 0, hit: 0, crit: 0, surge: 0 };
      
      for (let i = 0; i < N; i++) {
        const face = rollAttackDie(AttackDieColor.Red);
        if (face === AttackFace.Blank) counts.blank++;
        else if (face === AttackFace.Hit) counts.hit++;
        else if (face === AttackFace.Critical) counts.crit++;
        else if (face === AttackFace.Surge) counts.surge++;
      }

      expect(counts.blank / N).toBeCloseTo(1 / 8, 1);
      expect(counts.hit / N).toBeCloseTo(5 / 8, 1);
      expect(counts.crit / N).toBeCloseTo(1 / 8, 1);
      expect(counts.surge / N).toBeCloseTo(1 / 8, 1);

      // Absolute tolerance check
      expect(Math.abs(counts.blank / N - 1 / 8)).toBeLessThan(tolerance);
      expect(Math.abs(counts.hit / N - 5 / 8)).toBeLessThan(tolerance);
      expect(Math.abs(counts.crit / N - 1 / 8)).toBeLessThan(tolerance);
      expect(Math.abs(counts.surge / N - 1 / 8)).toBeLessThan(tolerance);
    });

    it('black die: 3/8 blank, 3/8 hit, 1/8 crit, 1/8 surge', () => {
      const counts = { blank: 0, hit: 0, crit: 0, surge: 0 };
      
      for (let i = 0; i < N; i++) {
        const face = rollAttackDie(AttackDieColor.Black);
        if (face === AttackFace.Blank) counts.blank++;
        else if (face === AttackFace.Hit) counts.hit++;
        else if (face === AttackFace.Critical) counts.crit++;
        else if (face === AttackFace.Surge) counts.surge++;
      }

      expect(counts.blank / N).toBeCloseTo(3 / 8, 1);
      expect(counts.hit / N).toBeCloseTo(3 / 8, 1);
      expect(counts.crit / N).toBeCloseTo(1 / 8, 1);
      expect(counts.surge / N).toBeCloseTo(1 / 8, 1);

      expect(Math.abs(counts.blank / N - 3 / 8)).toBeLessThan(tolerance);
      expect(Math.abs(counts.hit / N - 3 / 8)).toBeLessThan(tolerance);
      expect(Math.abs(counts.crit / N - 1 / 8)).toBeLessThan(tolerance);
      expect(Math.abs(counts.surge / N - 1 / 8)).toBeLessThan(tolerance);
    });

    it('white die: 5/8 blank, 1/8 hit, 1/8 crit, 1/8 surge', () => {
      const counts = { blank: 0, hit: 0, crit: 0, surge: 0 };
      
      for (let i = 0; i < N; i++) {
        const face = rollAttackDie(AttackDieColor.White);
        if (face === AttackFace.Blank) counts.blank++;
        else if (face === AttackFace.Hit) counts.hit++;
        else if (face === AttackFace.Critical) counts.crit++;
        else if (face === AttackFace.Surge) counts.surge++;
      }

      expect(counts.blank / N).toBeCloseTo(5 / 8, 1);
      expect(counts.hit / N).toBeCloseTo(1 / 8, 1);
      expect(counts.crit / N).toBeCloseTo(1 / 8, 1);
      expect(counts.surge / N).toBeCloseTo(1 / 8, 1);

      expect(Math.abs(counts.blank / N - 5 / 8)).toBeLessThan(tolerance);
      expect(Math.abs(counts.hit / N - 1 / 8)).toBeLessThan(tolerance);
      expect(Math.abs(counts.crit / N - 1 / 8)).toBeLessThan(tolerance);
      expect(Math.abs(counts.surge / N - 1 / 8)).toBeLessThan(tolerance);
    });
  });
});

describe('rollDefenseDie', () => {
  it('returns a valid defense face', () => {
    const face = rollDefenseDie(DefenseDieColor.Red);
    expect(Object.values(DefenseFace)).toContain(face);
  });

  it('returns valid faces for all colors (smoke test)', () => {
    for (let i = 0; i < 100; i++) {
      const redFace = rollDefenseDie(DefenseDieColor.Red);
      const whiteFace = rollDefenseDie(DefenseDieColor.White);
      
      expect(Object.values(DefenseFace)).toContain(redFace);
      expect(Object.values(DefenseFace)).toContain(whiteFace);
    }
  });

  describe('statistical distributions', () => {
    const N = 60_000;
    const tolerance = 0.02; // ±2% absolute tolerance

    it('red defense die: 2/6 blank, 3/6 block, 1/6 surge', () => {
      const counts = { blank: 0, block: 0, surge: 0 };
      
      for (let i = 0; i < N; i++) {
        const face = rollDefenseDie(DefenseDieColor.Red);
        if (face === DefenseFace.Blank) counts.blank++;
        else if (face === DefenseFace.Block) counts.block++;
        else if (face === DefenseFace.Surge) counts.surge++;
      }

      expect(counts.blank / N).toBeCloseTo(2 / 6, 1);
      expect(counts.block / N).toBeCloseTo(3 / 6, 1);
      expect(counts.surge / N).toBeCloseTo(1 / 6, 1);

      expect(Math.abs(counts.blank / N - 2 / 6)).toBeLessThan(tolerance);
      expect(Math.abs(counts.block / N - 3 / 6)).toBeLessThan(tolerance);
      expect(Math.abs(counts.surge / N - 1 / 6)).toBeLessThan(tolerance);
    });

    it('white defense die: 4/6 blank, 1/6 block, 1/6 surge', () => {
      const counts = { blank: 0, block: 0, surge: 0 };
      
      for (let i = 0; i < N; i++) {
        const face = rollDefenseDie(DefenseDieColor.White);
        if (face === DefenseFace.Blank) counts.blank++;
        else if (face === DefenseFace.Block) counts.block++;
        else if (face === DefenseFace.Surge) counts.surge++;
      }

      expect(counts.blank / N).toBeCloseTo(4 / 6, 1);
      expect(counts.block / N).toBeCloseTo(1 / 6, 1);
      expect(counts.surge / N).toBeCloseTo(1 / 6, 1);

      expect(Math.abs(counts.blank / N - 4 / 6)).toBeLessThan(tolerance);
      expect(Math.abs(counts.block / N - 1 / 6)).toBeLessThan(tolerance);
      expect(Math.abs(counts.surge / N - 1 / 6)).toBeLessThan(tolerance);
    });
  });
});

describe('rollAttackPool', () => {
  it('returns correct number of dice', () => {
    const results = rollAttackPool(2, 1, 3);
    expect(results).toHaveLength(6);
  });

  it('returns valid faces', () => {
    const results = rollAttackPool(1, 1, 1);
    results.forEach(face => {
      expect(Object.values(AttackFace)).toContain(face);
    });
  });

  it('handles zero dice', () => {
    const results = rollAttackPool(0, 0, 0);
    expect(results).toHaveLength(0);
  });
});

describe('rollDefensePool', () => {
  it('returns correct number of dice', () => {
    const results = rollDefensePool(DefenseDieColor.Red, 5);
    expect(results).toHaveLength(5);
  });

  it('returns valid faces', () => {
    const results = rollDefensePool(DefenseDieColor.White, 3);
    results.forEach(face => {
      expect(Object.values(DefenseFace)).toContain(face);
    });
  });

  it('handles zero dice', () => {
    const results = rollDefensePool(DefenseDieColor.Red, 0);
    expect(results).toHaveLength(0);
  });
});

describe('upgradeAttack', () => {
  it('upgrades white to black', () => {
    expect(upgradeAttack(AttackDieColor.White)).toBe(AttackDieColor.Black);
  });

  it('upgrades black to red', () => {
    expect(upgradeAttack(AttackDieColor.Black)).toBe(AttackDieColor.Red);
  });

  it('does not upgrade red beyond red', () => {
    expect(upgradeAttack(AttackDieColor.Red)).toBe(AttackDieColor.Red);
  });
});

describe('downgradeAttack', () => {
  it('downgrades red to black', () => {
    expect(downgradeAttack(AttackDieColor.Red)).toBe(AttackDieColor.Black);
  });

  it('downgrades black to white', () => {
    expect(downgradeAttack(AttackDieColor.Black)).toBe(AttackDieColor.White);
  });

  it('does not downgrade white below white', () => {
    expect(downgradeAttack(AttackDieColor.White)).toBe(AttackDieColor.White);
  });
});

describe('upgradeDefense', () => {
  it('upgrades white to red', () => {
    expect(upgradeDefense(DefenseDieColor.White)).toBe(DefenseDieColor.Red);
  });

  it('does not upgrade red beyond red', () => {
    expect(upgradeDefense(DefenseDieColor.Red)).toBe(DefenseDieColor.Red);
  });
});

describe('downgradeDefense', () => {
  it('downgrades red to white', () => {
    expect(downgradeDefense(DefenseDieColor.Red)).toBe(DefenseDieColor.White);
  });

  it('does not downgrade white below white', () => {
    expect(downgradeDefense(DefenseDieColor.White)).toBe(DefenseDieColor.White);
  });
});

describe('applyDieModification', () => {
  it('upgrades specified number of dice', () => {
    const pool = [AttackDieColor.White, AttackDieColor.White, AttackDieColor.White];
    const result = applyDieModification(pool, 2, upgradeAttack);
    
    expect(result[0]).toBe(AttackDieColor.Black);
    expect(result[1]).toBe(AttackDieColor.Black);
    expect(result[2]).toBe(AttackDieColor.White);
  });

  it('downgrades specified number of dice', () => {
    const pool = [AttackDieColor.Red, AttackDieColor.Red, AttackDieColor.Black];
    const result = applyDieModification(pool, 2, downgradeAttack);
    
    expect(result[0]).toBe(AttackDieColor.Black);
    expect(result[1]).toBe(AttackDieColor.Black);
    expect(result[2]).toBe(AttackDieColor.Black);
  });

  it('does not modify dice that are already at max/min', () => {
    const pool = [AttackDieColor.Red, AttackDieColor.Red];
    const result = applyDieModification(pool, 5, upgradeAttack);
    
    // Can only upgrade 0 dice (both are already red)
    expect(result).toEqual([AttackDieColor.Red, AttackDieColor.Red]);
  });

  it('handles empty pool', () => {
    const pool: AttackDieColor[] = [];
    const result = applyDieModification(pool, 2, upgradeAttack);
    expect(result).toEqual([]);
  });

  it('handles count larger than pool size', () => {
    const pool = [AttackDieColor.White, AttackDieColor.White];
    const result = applyDieModification(pool, 10, upgradeAttack);
    
    expect(result[0]).toBe(AttackDieColor.Black);
    expect(result[1]).toBe(AttackDieColor.Black);
  });

  it('does not modify original pool', () => {
    const pool = [AttackDieColor.White, AttackDieColor.White];
    const result = applyDieModification(pool, 1, upgradeAttack);
    
    expect(pool).toEqual([AttackDieColor.White, AttackDieColor.White]);
    expect(result).toEqual([AttackDieColor.Black, AttackDieColor.White]);
  });

  it('handles count of 0', () => {
    const pool = [AttackDieColor.White, AttackDieColor.Black];
    const result = applyDieModification(pool, 0, upgradeAttack);
    
    expect(result).toEqual([AttackDieColor.White, AttackDieColor.Black]);
  });

  it('handles negative count as 0', () => {
    const pool = [AttackDieColor.White, AttackDieColor.Black];
    const result = applyDieModification(pool, -5, upgradeAttack);
    
    expect(result).toEqual([AttackDieColor.White, AttackDieColor.Black]);
  });

  it('respects modification limit (one die cannot be upgraded twice)', () => {
    const pool = [AttackDieColor.White];
    // First modification
    const result1 = applyDieModification(pool, 1, upgradeAttack);
    expect(result1).toEqual([AttackDieColor.Black]);
    
    // Second modification should NOT double-upgrade the same die in one call
    const result2 = applyDieModification(pool, 2, upgradeAttack);
    expect(result2).toEqual([AttackDieColor.Black]); // Only upgrades once
  });
});

describe('edge cases and boundary conditions', () => {
  describe('rollAttackPool edge cases', () => {
    it('handles all zeros', () => {
      const results = rollAttackPool(0, 0, 0);
      expect(results).toHaveLength(0);
    });

    it('handles large pool counts', () => {
      const results = rollAttackPool(10, 10, 10);
      expect(results).toHaveLength(30);
      results.forEach(face => {
        expect(Object.values(AttackFace)).toContain(face);
      });
    });

    it('handles single die of each color', () => {
      const results = rollAttackPool(1, 1, 1);
      expect(results).toHaveLength(3);
    });
  });

  describe('rollDefensePool edge cases', () => {
    it('handles zero count', () => {
      const results = rollDefensePool(DefenseDieColor.Red, 0);
      expect(results).toHaveLength(0);
    });

    it('handles large count', () => {
      const results = rollDefensePool(DefenseDieColor.White, 20);
      expect(results).toHaveLength(20);
      results.forEach(face => {
        expect(Object.values(DefenseFace)).toContain(face);
      });
    });
  });

  describe('upgrade/downgrade boundary conditions', () => {
    it('multiple upgrades stay at ceiling', () => {
      let color = AttackDieColor.White;
      color = upgradeAttack(color); // → Black
      color = upgradeAttack(color); // → Red
      color = upgradeAttack(color); // → Red (stays)
      color = upgradeAttack(color); // → Red (stays)
      
      expect(color).toBe(AttackDieColor.Red);
    });

    it('multiple downgrades stay at floor', () => {
      let color = AttackDieColor.Red;
      color = downgradeAttack(color); // → Black
      color = downgradeAttack(color); // → White
      color = downgradeAttack(color); // → White (stays)
      color = downgradeAttack(color); // → White (stays)
      
      expect(color).toBe(AttackDieColor.White);
    });

    it('defense upgrade ceiling', () => {
      let color = DefenseDieColor.White;
      color = upgradeDefense(color); // → Red
      color = upgradeDefense(color); // → Red (stays)
      
      expect(color).toBe(DefenseDieColor.Red);
    });

    it('defense downgrade floor', () => {
      let color = DefenseDieColor.Red;
      color = downgradeDefense(color); // → White
      color = downgradeDefense(color); // → White (stays)
      
      expect(color).toBe(DefenseDieColor.White);
    });
  });

  describe('pool modification with mixed colors', () => {
    it('upgrades worst colors first (white before black before red)', () => {
      const pool = [AttackDieColor.Red, AttackDieColor.White, AttackDieColor.Black];
      const result = applyDieModification(pool, 1, upgradeAttack);
      
      // Should upgrade the first upgradeable die (Red can't upgrade, White can)
      const whiteUpgraded = result.filter(c => c === AttackDieColor.Black).length;
      const redCount = result.filter(c => c === AttackDieColor.Red).length;
      
      expect(whiteUpgraded).toBeGreaterThanOrEqual(1);
      expect(redCount).toBe(1); // Red stays Red
    });

    it('downgrades all red dice to black when count is high', () => {
      const pool = [AttackDieColor.Red, AttackDieColor.Red, AttackDieColor.Red];
      const result = applyDieModification(pool, 10, downgradeAttack);
      
      expect(result.every(c => c === AttackDieColor.Black)).toBe(true);
    });
  });
});