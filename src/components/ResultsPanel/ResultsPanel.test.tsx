import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useResultsStore } from '../../stores/resultsStore';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import type { SimulationResult } from '../../engine/types';

// Mock the useSimulation hook (we don't want actual worker interaction)
vi.mock('../../hooks/useSimulation', () => ({
  useSimulation: () => ({ runSimulation: vi.fn() }),
}));

// Mock Recharts to avoid canvas rendering issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}));

// Import after mocking
import ResultsPanel from './ResultsPanel';

// ============================================================================
// Helpers
// ============================================================================

function createMockResult(
  overrides?: Partial<SimulationResult>
): SimulationResult {
  return {
    iterations: 10000,
    durationMs: 150,
    totalWounds: {
      mean: 3.21,
      median: 3,
      mode: 3,
      min: 0,
      max: 7,
      standardDeviation: 1.5,
    },
    totalWoundsDistribution: [
      { wounds: 0, count: 500, probability: 0.05, cumulative: 1.0 },
      { wounds: 1, count: 1000, probability: 0.10, cumulative: 0.95 },
      { wounds: 2, count: 2000, probability: 0.20, cumulative: 0.85 },
      { wounds: 3, count: 3000, probability: 0.30, cumulative: 0.65 },
      { wounds: 4, count: 2000, probability: 0.20, cumulative: 0.35 },
      { wounds: 5, count: 1000, probability: 0.10, cumulative: 0.15 },
      { wounds: 6, count: 400, probability: 0.04, cumulative: 0.05 },
      { wounds: 7, count: 100, probability: 0.01, cumulative: 0.01 },
    ],
    guardianWounds: {
      mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0,
    },
    guardianWoundsDistribution: [
      { wounds: 0, count: 10000, probability: 1, cumulative: 1 },
    ],
    mainTargetWounds: {
      mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0,
    },
    mainTargetWoundsDistribution: [
      { wounds: 0, count: 10000, probability: 1, cumulative: 1 },
    ],
    deflectWounds: {
      mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0,
    },
    deflectWoundsDistribution: [
      { wounds: 0, count: 10000, probability: 1, cumulative: 1 },
    ],
    djemSoWounds: {
      mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0,
    },
    djemSoWoundsDistribution: [
      { wounds: 0, count: 10000, probability: 1, cumulative: 1 },
    ],
    suppressionPerAttack: 1,
    efficiency: {
      attackerWoundsPerPoint: 0,
      attackerPointsPerWound: 0,
      defenderWoundsPerPoint: 0,
      defenderPointsPerWound: 0,
      attackerEfficiencyRatio: 0,
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ResultsPanel', () => {
  beforeEach(() => {
    useResultsStore.getState().clear();
    useDefenseConfigStore.getState().reset();
  });

  it('shows empty state when no results', () => {
    render(<ResultsPanel />);
    expect(screen.getByText('No Results Yet')).toBeInTheDocument();
  });

  it('shows core stats when results are available', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('3.21')).toBeInTheDocument();
    expect(screen.getByText('Median')).toBeInTheDocument();
    expect(screen.getAllByText('3.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Mode')).toBeInTheDocument();
  });

  it('shows cumulative probability table', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.getByText('P(≥ X)')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('renders bar chart component', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('shows loading overlay when loading', () => {
    useResultsStore.getState().setLoading(true);

    render(<ResultsPanel />);

    expect(screen.getByText('Simulating…')).toBeInTheDocument();
  });

  it('shows error display on error', () => {
    useResultsStore.getState().setError('Worker crashed');

    render(<ResultsPanel />);

    expect(screen.getByText('Simulation Error')).toBeInTheDocument();
    expect(screen.getByText('Worker crashed')).toBeInTheDocument();
  });

  it('shows simulation duration when results available', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.getByText(/10,000 sims/)).toBeInTheDocument();
    expect(screen.getByText(/150ms/)).toBeInTheDocument();
  });

  it('does not show efficiency section when costs are zero', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.queryByText('Points Efficiency')).not.toBeInTheDocument();
  });

  it('shows efficiency section when costs are set', () => {
    useResultsStore.getState().setResult(
      createMockResult({
        efficiency: {
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
          defenderWoundsPerPoint: 0.06,
          defenderPointsPerWound: 16.7,
          attackerEfficiencyRatio: 0.0006,
        },
      })
    );

    render(<ResultsPanel />);

    expect(screen.getByText('Points Efficiency')).toBeInTheDocument();
  });

  it('shows secondary stats when deflect wounds > 0', () => {
    useResultsStore.getState().setResult(
      createMockResult({
        deflectWounds: {
          mean: 0.5,
          median: 0,
          mode: 0,
          min: 0,
          max: 1,
          standardDeviation: 0.5,
        },
      })
    );

    render(<ResultsPanel />);

    expect(
      screen.getByText('Deflect/Shien wounds to attacker')
    ).toBeInTheDocument();
  });

  it('shows secondary stats when djem so wounds > 0', () => {
    useResultsStore.getState().setResult(
      createMockResult({
        djemSoWounds: {
          mean: 1.2,
          median: 1,
          mode: 1,
          min: 0,
          max: 3,
          standardDeviation: 0.8,
        },
      })
    );

    render(<ResultsPanel />);

    expect(
      screen.getByText('Djem So wounds to attacker')
    ).toBeInTheDocument();
  });

  it('shows guardian breakdown when guardian is active', () => {
    useDefenseConfigStore.getState().setField('guardianX', 2);
    useResultsStore.getState().setResult(
      createMockResult({
        guardianWounds: {
          mean: 1.5,
          median: 1,
          mode: 1,
          min: 0,
          max: 3,
          standardDeviation: 0.9,
        },
        mainTargetWounds: {
          mean: 1.7,
          median: 2,
          mode: 2,
          min: 0,
          max: 4,
          standardDeviation: 1.1,
        },
      })
    );

    render(<ResultsPanel />);

    expect(screen.getByText('Guardian wounds (no Pierce)')).toBeInTheDocument();
    expect(screen.getByText('Main target wounds (no Pierce)')).toBeInTheDocument();
  });

  it('does not show secondary stats section when no effects active', () => {
    useResultsStore.getState().setResult(createMockResult());

    render(<ResultsPanel />);

    expect(screen.queryByText('Additional Effects')).not.toBeInTheDocument();
  });

  it('hides previous results when error occurs', () => {
    useResultsStore.getState().setResult(createMockResult());
    const { rerender } = render(<ResultsPanel />);
    
    expect(screen.getByText('Mean')).toBeInTheDocument();

    useResultsStore.getState().setError('Some error');
    rerender(<ResultsPanel />);

    expect(screen.queryByText('Mean')).not.toBeInTheDocument();
    expect(screen.getByText('Simulation Error')).toBeInTheDocument();
  });

  it('preserves results while loading overlay is shown', () => {
    useResultsStore.getState().setResult(createMockResult());
    useResultsStore.getState().setLoading(true);

    render(<ResultsPanel />);

    // Both results and loading overlay should be visible
    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('Simulating…')).toBeInTheDocument();
  });
});
