import { describe, it, expect } from 'vitest';
import {
  formatWoundStat,
  formatPercent,
  formatPerPoint,
  formatPerWound,
  formatEfficiencyRatio,
} from './format';

describe('formatWoundStat', () => {
  it('formats to 2 decimal places', () => {
    expect(formatWoundStat(3.21428)).toBe('3.21');
  });

  it('pads to 2 decimal places', () => {
    expect(formatWoundStat(3)).toBe('3.00');
  });

  it('rounds correctly', () => {
    expect(formatWoundStat(3.999)).toBe('4.00');
  });

  it('formats zero', () => {
    expect(formatWoundStat(0)).toBe('0.00');
  });
});

describe('formatPercent', () => {
  it('converts 0–1 to percentage with 1 decimal', () => {
    expect(formatPercent(0.9423)).toBe('94.2%');
  });

  it('formats 100%', () => {
    expect(formatPercent(1.0)).toBe('100.0%');
  });

  it('formats 0%', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats small probabilities', () => {
    expect(formatPercent(0.001)).toBe('0.1%');
  });
});

describe('formatPerPoint', () => {
  it('formats non-zero to 4 decimal places', () => {
    expect(formatPerPoint(0.03)).toBe('0.0300');
  });

  it('returns dash for zero', () => {
    expect(formatPerPoint(0)).toBe('—');
  });

  it('returns dash for Infinity', () => {
    expect(formatPerPoint(Infinity)).toBe('—');
  });

  it('returns dash for NaN', () => {
    expect(formatPerPoint(NaN)).toBe('—');
  });
});

describe('formatPerWound', () => {
  it('formats non-zero to 1 decimal place', () => {
    expect(formatPerWound(33.333)).toBe('33.3');
  });

  it('returns dash for zero', () => {
    expect(formatPerWound(0)).toBe('—');
  });
});

describe('formatEfficiencyRatio', () => {
  it('formats non-zero to 6 decimal places', () => {
    expect(formatEfficiencyRatio(0.0006)).toBe('0.000600');
  });

  it('returns dash for zero', () => {
    expect(formatEfficiencyRatio(0)).toBe('—');
  });
});
