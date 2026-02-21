import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WoundDistributionChart from './WoundDistributionChart';
import type { DistributionEntry } from '../../engine/types';

// Mock Recharts components to avoid issues in test environment
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => <div data-testid={`x-axis-${dataKey}`} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
}));

// Mock DeferredMount to render children immediately in tests
vi.mock('../shared/DeferredMount', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const createMockDistribution = (): DistributionEntry[] => [
  { wounds: 0, probability: 0.1, cumulative: 1.0, count: 0 },
  { wounds: 1, probability: 0.2, cumulative: 0.9, count: 0 },
  { wounds: 2, probability: 0.3, cumulative: 0.7, count: 0 },
  { wounds: 3, probability: 0.25, cumulative: 0.4, count: 0 },
  { wounds: 4, probability: 0.15, cumulative: 0.15, count: 0 },
];

const createMockDistribution2 = (): DistributionEntry[] => [
  { wounds: 0, probability: 0.15, cumulative: 1.0, count: 0 },
  { wounds: 1, probability: 0.25, cumulative: 0.85, count: 0 },
  { wounds: 2, probability: 0.35, cumulative: 0.6, count: 0 },
  { wounds: 3, probability: 0.2, cumulative: 0.25, count: 0 },
  { wounds: 4, probability: 0.05, cumulative: 0.05, count: 0 },
];

describe('WoundDistributionChart', () => {
  it('renders nothing when series array is empty', () => {
    const { queryByTestId } = render(<WoundDistributionChart series={[]} />);
    
    expect(queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('renders single-series chart correctly (backward compatibility)', () => {
    const series = [
      {
        label: 'Test Simulation',
        distribution: createMockDistribution(),
        color: 'indigo',
        mode: 2,
      },
    ];

    const { getByTestId } = render(<WoundDistributionChart series={series} />);

    // Chart structure should be present
    expect(getByTestId('responsive-container')).toBeInTheDocument();
    expect(getByTestId('bar-chart')).toBeInTheDocument();
    expect(getByTestId('x-axis-wounds')).toBeInTheDocument();
    expect(getByTestId('y-axis')).toBeInTheDocument();
    expect(getByTestId('cartesian-grid')).toBeInTheDocument();

    // Should have one Bar element
    expect(getByTestId('bar-Test Simulation')).toBeInTheDocument();
    expect(getByTestId('bar-Test Simulation')).toHaveAttribute('data-fill', '#6366f1'); // Indigo color
  });

  it('renders multi-series chart with multiple bars', () => {
    const series = [
      {
        label: 'Sim 1',
        distribution: createMockDistribution(),
        color: 'indigo',
        mode: 2,
      },
      {
        label: 'Sim 2',
        distribution: createMockDistribution2(),
        color: 'emerald',
        mode: 1,
      },
    ];

    const { getByTestId } = render(<WoundDistributionChart series={series} />);

    // Should have multiple Bar elements
    expect(getByTestId('bar-Sim 1')).toBeInTheDocument();
    expect(getByTestId('bar-Sim 2')).toBeInTheDocument();

    // Check colors are mapped correctly
    expect(getByTestId('bar-Sim 1')).toHaveAttribute('data-fill', '#6366f1'); // Indigo
    expect(getByTestId('bar-Sim 2')).toHaveAttribute('data-fill', '#10b981'); // Emerald
  });

  it('handles series with different wound count ranges', () => {
    const shortDistribution: DistributionEntry[] = [
      { wounds: 0, probability: 0.5, cumulative: 1.0, count: 0 },
      { wounds: 1, probability: 0.5, cumulative: 0.5, count: 0 },
    ];

    const longDistribution: DistributionEntry[] = [
      { wounds: 0, probability: 0.1, cumulative: 1.0, count: 0 },
      { wounds: 1, probability: 0.2, cumulative: 0.9, count: 0 },
      { wounds: 2, probability: 0.3, cumulative: 0.7, count: 0 },
      { wounds: 3, probability: 0.25, cumulative: 0.4, count: 0 },
      { wounds: 4, probability: 0.1, cumulative: 0.15, count: 0 },
      { wounds: 5, probability: 0.05, cumulative: 0.05, count: 0 },
    ];

    const series = [
      {
        label: 'Short',
        distribution: shortDistribution,
        color: 'amber',
        mode: 0,
      },
      {
        label: 'Long',
        distribution: longDistribution,
        color: 'rose',
        mode: 3,
      },
    ];

    const { getByTestId } = render(<WoundDistributionChart series={series} />);

    // Both series should render
    expect(getByTestId('bar-Short')).toBeInTheDocument();
    expect(getByTestId('bar-Long')).toBeInTheDocument();

    // This tests the union of wound counts functionality
    // The chart should handle wound counts 0-5 even though Short only has 0-1
  });

  it('uses correct colors from palette', () => {
    const series = [
      { label: 'Indigo', distribution: createMockDistribution(), color: 'indigo', mode: 1 },
      { label: 'Emerald', distribution: createMockDistribution(), color: 'emerald', mode: 1 },
      { label: 'Amber', distribution: createMockDistribution(), color: 'amber', mode: 1 },
      { label: 'Rose', distribution: createMockDistribution(), color: 'rose', mode: 1 },
    ];

    const { getByTestId } = render(<WoundDistributionChart series={series} />);

    expect(getByTestId('bar-Indigo')).toHaveAttribute('data-fill', '#6366f1');
    expect(getByTestId('bar-Emerald')).toHaveAttribute('data-fill', '#10b981');
    expect(getByTestId('bar-Amber')).toHaveAttribute('data-fill', '#f59e0b');
    expect(getByTestId('bar-Rose')).toHaveAttribute('data-fill', '#f43f5e');
  });

  it('falls back to default color for unknown color names', () => {
    const series = [
      {
        label: 'Unknown Color',
        distribution: createMockDistribution(),
        color: 'nonexistent',
        mode: 1,
      },
    ];

    const { getByTestId } = render(<WoundDistributionChart series={series} />);

    // Should fall back to indigo
    expect(getByTestId('bar-Unknown Color')).toHaveAttribute('data-fill', '#6366f1');
  });

  it('handles empty distributions gracefully', () => {
    const series = [
      {
        label: 'Empty',
        distribution: [],
        color: 'indigo',
        mode: 0,
      },
    ];

    // Should not throw
    expect(() => {
      render(<WoundDistributionChart series={series} />);
    }).not.toThrow();
  });

  it('renders tooltip component', () => {
    const series = [
      {
        label: 'Test',
        distribution: createMockDistribution(),
        color: 'indigo',
        mode: 2,
      },
    ];

    const { getByTestId } = render(<WoundDistributionChart series={series} />);
    
    expect(getByTestId('tooltip')).toBeInTheDocument();
  });
});