import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useResultsStore } from '../../stores/resultsStore';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import type { SimulationResult, AttackConfig } from '../../engine/types';
import { AttackType, DefenseDieColor, CoverType, DefenseSurgeChart, AttackSurgeChart, MarksmanStrategy, RerollStrategy } from '../../engine/types';

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

const mockConfig: AttackConfig = {
  attackType: AttackType.Ranged,
  attacker: {
    weapons: [{ redDice: 2, blackDice: 0, whiteDice: 0, keywords: { criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, blast: false, suppressive: false, highVelocity: false, immuneDeflect: false, primitive: false, ionX: 0, spray: false, antiMaterielX: 0, antiPersonnelX: 0, cumbersome: false, sidearmMelee: false, sidearmRanged: false } }],
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
    unitCost: 0,
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('ResultsPanel', () => {
  beforeEach(() => {
    useResultsStore.getState().clearAll();
    useDefenseConfigStore.getState().reset();
  });

  it('shows empty state when no results', () => {
    render(<ResultsPanel />);
    expect(screen.getByText('No Results Yet')).toBeInTheDocument();
  });

  it('shows "Run Simulation" button when no slots', () => {
    render(<ResultsPanel />);
    // "Run Simulation" appears in both the button and the instructional text
    expect(screen.getAllByText('Run Simulation')).toHaveLength(2);
  });

  it('shows "Add Simulation" button when slots exist', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    expect(screen.getByText('Add Simulation')).toBeInTheDocument();
  });

  it('shows core stats when a result slot exists', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('3.21')).toBeInTheDocument();
    expect(screen.getByText('Median')).toBeInTheDocument();
    expect(screen.getAllByText('3.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Mode')).toBeInTheDocument();
  });

  it('shows cumulative probability table', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    // "Sim 1" appears in slot chip, table header, and viewing label - at least 3 times
    expect(screen.getAllByText(/Sim 1/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('renders bar chart component', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders slot selector when slots exist', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    // Should show slot chips
    expect(screen.getAllByText(/Sim \d/).length).toBeGreaterThanOrEqual(2);
  });

  it('shows loading overlay when loading', () => {
    useResultsStore.getState().setLoading(true);

    render(<ResultsPanel />);

    expect(screen.getByText('Simulating...')).toBeInTheDocument();
  });

  it('shows error display on error', () => {
    useResultsStore.getState().setError('Worker crashed');

    render(<ResultsPanel />);

    expect(screen.getByText('Simulation Error')).toBeInTheDocument();
    expect(screen.getByText('Worker crashed')).toBeInTheDocument();
  });

  it('shows simulation duration for viewed slot', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    expect(screen.getByText(/10,000 sims/)).toBeInTheDocument();
    expect(screen.getByText(/150ms/)).toBeInTheDocument();
  });

  it('does not show efficiency section when costs are zero', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    expect(screen.queryByText('Points Efficiency')).not.toBeInTheDocument();
  });

  it('shows efficiency section when costs are set', () => {
    useResultsStore.getState().appendResult(
      createMockResult({
        efficiency: {
          attackerWoundsPerPoint: 0.03,
          attackerPointsPerWound: 33.3,
          defenderWoundsPerPoint: 0.06,
          defenderPointsPerWound: 16.7,
          attackerEfficiencyRatio: 0.0006,
        },
      }),
      mockConfig
    );

    render(<ResultsPanel />);

    expect(screen.getByText('Points Efficiency')).toBeInTheDocument();
  });

  it('shows secondary stats when deflect wounds > 0', () => {
    useResultsStore.getState().appendResult(
      createMockResult({
        deflectWounds: {
          mean: 0.5,
          median: 0,
          mode: 0,
          min: 0,
          max: 1,
          standardDeviation: 0.5,
        },
      }),
      mockConfig
    );

    render(<ResultsPanel />);

    expect(
      screen.getByText('Deflect/Shien wounds to attacker')
    ).toBeInTheDocument();
  });

  it('shows secondary stats when djem so wounds > 0', () => {
    useResultsStore.getState().appendResult(
      createMockResult({
        djemSoWounds: {
          mean: 1.2,
          median: 1,
          mode: 1,
          min: 0,
          max: 3,
          standardDeviation: 0.8,
        },
      }),
      mockConfig
    );

    render(<ResultsPanel />);

    expect(
      screen.getByText('Djem So wounds to attacker')
    ).toBeInTheDocument();
  });

  it('shows guardian breakdown when guardian is active', () => {
    useDefenseConfigStore.getState().setField('guardianX', 2);
    useResultsStore.getState().appendResult(
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
      }),
      mockConfig
    );

    render(<ResultsPanel />);

    expect(screen.getByText('Guardian wounds (no Pierce)')).toBeInTheDocument();
    expect(screen.getByText('Main target wounds (no Pierce)')).toBeInTheDocument();
  });

  it('does not show secondary stats section when no effects active', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    expect(screen.queryByText('Additional Effects')).not.toBeInTheDocument();
  });

  it('hides previous results when error occurs', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);
    const { rerender } = render(<ResultsPanel />);
    
    expect(screen.getByText('Mean')).toBeInTheDocument();

    useResultsStore.getState().setError('Some error');
    rerender(<ResultsPanel />);

    expect(screen.queryByText('Mean')).not.toBeInTheDocument();
    expect(screen.getByText('Simulation Error')).toBeInTheDocument();
  });

  it('preserves results while loading overlay is shown', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);
    useResultsStore.getState().setLoading(true);

    render(<ResultsPanel />);

    // Both results and loading overlay should be visible
    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('Simulating...')).toBeInTheDocument();
  });

  it('shows Reset All button', () => {
    render(<ResultsPanel />);
    expect(screen.getByText('Reset All')).toBeInTheDocument();
  });

  it('disables Add Simulation button at 4 slots', () => {
    // Fill to capacity
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    const button = screen.getByText('Add Simulation');
    expect(button).toBeDisabled();
    expect(screen.getByText('Remove a result to run another.')).toBeInTheDocument();
  });

  it('shows "Viewing: Sim X" label for viewed slot', () => {
    useResultsStore.getState().appendResult(createMockResult(), mockConfig);

    render(<ResultsPanel />);

    expect(screen.getByText(/Viewing:/)).toBeInTheDocument();
    // "Sim 1" appears in slot chip, table header, and viewing label - at least 3 times
    expect(screen.getAllByText(/Sim 1/).length).toBeGreaterThanOrEqual(3);
  });
});
