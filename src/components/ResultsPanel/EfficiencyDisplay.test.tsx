import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EfficiencyDisplay from './EfficiencyDisplay';
import type { EfficiencyMetrics } from '../../engine/types';

function createMetrics(overrides?: Partial<EfficiencyMetrics>): EfficiencyMetrics {
  return {
    attackerWoundsPerPoint: 0,
    attackerPointsPerWound: 0,
    defenderWoundsPerPoint: 0,
    defenderPointsPerWound: 0,
    attackerEfficiencyRatio: 0,
    ...overrides,
  };
}

describe('EfficiencyDisplay', () => {
  it('renders nothing when all metrics are zero', () => {
    const { container } = render(
      <EfficiencyDisplay efficiency={createMetrics()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when attacker cost produces metrics', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
        })}
      />
    );

    expect(screen.getByText('Points Efficiency')).toBeInTheDocument();
    expect(screen.getByText('0.0300')).toBeInTheDocument();
    expect(screen.getByText('33.3')).toBeInTheDocument();
  });

  it('shows dash for defender metrics when defender cost is zero', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
          defenderWoundsPerPoint: 0,
          defenderPointsPerWound: 0,
        })}
      />
    );

    // Defender metrics should show "—"
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders all metrics when both costs are set', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
          defenderWoundsPerPoint: 0.06,
          defenderPointsPerWound: 16.7,
          attackerEfficiencyRatio: 0.0006,
        })}
      />
    );

    expect(screen.getByText('0.0300')).toBeInTheDocument();
    expect(screen.getByText('33.3')).toBeInTheDocument();
    expect(screen.getByText('0.0600')).toBeInTheDocument();
    expect(screen.getByText('16.7')).toBeInTheDocument();
    expect(screen.getByText('0.000600')).toBeInTheDocument();
  });

  it('renders when only defender cost is set', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          defenderWoundsPerPoint: 0.05,
          defenderPointsPerWound: 20,
        })}
      />
    );

    expect(screen.getByText('Points Efficiency')).toBeInTheDocument();
    expect(screen.getByText('0.0500')).toBeInTheDocument();
    expect(screen.getByText('20.0')).toBeInTheDocument();
  });

  it('displays tooltips on efficiency rows', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
        })}
      />
    );

    const rowWithTooltip = screen.getByText('Wounds / attacker pt').closest('div');
    expect(rowWithTooltip).toHaveAttribute('title', 'Average wounds dealt per point of attacker cost');
  });

  it('efficiency ratio spans full width on larger screens', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          attackerWoundsPerPoint: 0.03,
          attackerEfficiencyRatio: 0.0006,
        })}
      />
    );

    const ratioRow = screen.getByText('Efficiency ratio').closest('div');
    expect(ratioRow?.className).toContain('sm:col-span-2');
  });

  it('formats metrics according to specification', () => {
    render(
      <EfficiencyDisplay
        efficiency={createMetrics({
          attackerWoundsPerPoint: 0.0299,
          attackerPointsPerWound: 33.678,
          defenderWoundsPerPoint: 0.0601,
          defenderPointsPerWound: 16.234,
          attackerEfficiencyRatio: 0.000598,
        })}
      />
    );

    // Per-point should have 4 decimals
    expect(screen.getByText('0.0299')).toBeInTheDocument();
    expect(screen.getByText('0.0601')).toBeInTheDocument();

    // Per-wound should have 1 decimal
    expect(screen.getByText('33.7')).toBeInTheDocument();
    expect(screen.getByText('16.2')).toBeInTheDocument();

    // Ratio should have 6 decimals
    expect(screen.getByText('0.000598')).toBeInTheDocument();
  });
});
