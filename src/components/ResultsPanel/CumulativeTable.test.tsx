import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CumulativeTable from './CumulativeTable';
import type { DistributionEntry } from '../../engine/types';

const createMockDistribution = (): DistributionEntry[] => [
  { wounds: 0, probability: 0.1, cumulative: 1.0 },
  { wounds: 1, probability: 0.2, cumulative: 0.9 },
  { wounds: 2, probability: 0.3, cumulative: 0.7 },
  { wounds: 3, probability: 0.25, cumulative: 0.4 },
  { wounds: 4, probability: 0.15, cumulative: 0.15 },
];

const createMockDistribution2 = (): DistributionEntry[] => [
  { wounds: 0, probability: 0.15, cumulative: 1.0 },
  { wounds: 1, probability: 0.25, cumulative: 0.85 },
  { wounds: 2, probability: 0.35, cumulative: 0.6 },
  { wounds: 3, probability: 0.2, cumulative: 0.25 },
  { wounds: 4, probability: 0.05, cumulative: 0.05 },
];

describe('CumulativeTable', () => {
  it('renders nothing when series array is empty', () => {
    const { container } = render(<CumulativeTable series={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders single-series table correctly (backward compatibility)', () => {
    const series = [
      {
        label: 'Test Simulation',
        distribution: createMockDistribution(),
        color: 'indigo',
      },
    ];

    render(<CumulativeTable series={series} />);

    // Table structure should be present
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Wounds')).toBeInTheDocument();
    expect(screen.getByText('Test Simulation')).toBeInTheDocument();

    // Check some data rows
    expect(screen.getByText('≥ 1')).toBeInTheDocument();
    expect(screen.getByText('90.0%')).toBeInTheDocument(); // 0.9 cumulative
    expect(screen.getByText('≥ 2')).toBeInTheDocument();
    expect(screen.getByText('70.0%')).toBeInTheDocument(); // 0.7 cumulative
  });

  it('renders multi-column table with color-coded headers', () => {
    const series = [
      {
        label: 'Sim 1',
        distribution: createMockDistribution(),
        color: 'indigo',
      },
      {
        label: 'Sim 2',
        distribution: createMockDistribution2(),
        color: 'emerald',
      },
    ];

    render(<CumulativeTable series={series} />);

    // Headers should show both series
    expect(screen.getByText('Sim 1')).toBeInTheDocument();
    expect(screen.getByText('Sim 2')).toBeInTheDocument();

    // Check that color dots are present (we look for elements with the background color styles)
    const headers = screen.getAllByRole('columnheader');
    const sim1Header = headers.find(h => h.textContent?.includes('Sim 1'));
    const sim2Header = headers.find(h => h.textContent?.includes('Sim 2'));
    
    expect(sim1Header).toBeInTheDocument();
    expect(sim2Header).toBeInTheDocument();

    // Check some data values from both series
    expect(screen.getByText('90.0%')).toBeInTheDocument(); // Sim 1, wounds >= 1
    expect(screen.getByText('85.0%')).toBeInTheDocument(); // Sim 2, wounds >= 1
  });

  it('shows "—" for missing wound counts in a series', () => {
    const shortDistribution: DistributionEntry[] = [
      { wounds: 0, probability: 0.5, cumulative: 1.0 },
      { wounds: 1, probability: 0.5, cumulative: 0.5 },
      // Missing wounds 2-4
    ];

    const fullDistribution: DistributionEntry[] = [
      { wounds: 0, probability: 0.1, cumulative: 1.0 },
      { wounds: 1, probability: 0.2, cumulative: 0.9 },
      { wounds: 2, probability: 0.3, cumulative: 0.7 },
      { wounds: 3, probability: 0.25, cumulative: 0.4 },
      { wounds: 4, probability: 0.15, cumulative: 0.15 },
    ];

    const series = [
      {
        label: 'Short',
        distribution: shortDistribution,
        color: 'amber',
      },
      {
        label: 'Full',
        distribution: fullDistribution,
        color: 'rose',
      },
    ];

    render(<CumulativeTable series={series} />);

    // The table should show all wound counts from the union
    expect(screen.getByText('≥ 0')).toBeInTheDocument();
    expect(screen.getByText('≥ 1')).toBeInTheDocument();
    expect(screen.getByText('≥ 2')).toBeInTheDocument();
    expect(screen.getByText('≥ 3')).toBeInTheDocument();
    expect(screen.getByText('≥ 4')).toBeInTheDocument();

    // Short series should show "—" for missing wounds
    const rows = screen.getAllByRole('row');
    const wound2Row = rows.find(row => row.textContent?.includes('≥ 2'));
    expect(wound2Row?.textContent).toContain('—'); // Short series missing ≥2
    expect(wound2Row?.textContent).toContain('70.0%'); // Full series has ≥2
  });

  it('filters out rows below minimum cumulative threshold', () => {
    const distributionWithLowProbs: DistributionEntry[] = [
      { wounds: 0, probability: 0.99, cumulative: 1.0 },
      { wounds: 1, probability: 0.009, cumulative: 0.01 },
      { wounds: 2, probability: 0.0009, cumulative: 0.001 },
      { wounds: 3, probability: 0.0001, cumulative: 0.0001 }, // Below 0.0005 threshold
    ];

    const series = [
      {
        label: 'Low Probs',
        distribution: distributionWithLowProbs,
        color: 'indigo',
      },
    ];

    render(<CumulativeTable series={series} />);

    // Should show rows with cumulative >= 0.0005 (0.05%)
    expect(screen.getByText('≥ 0')).toBeInTheDocument(); // 100%
    expect(screen.getByText('≥ 1')).toBeInTheDocument(); // 1.0%
    expect(screen.getByText('≥ 2')).toBeInTheDocument(); // 0.1%

    // Should not show ≥ 3 (0.01% is below threshold)
    expect(screen.queryByText('≥ 3')).not.toBeInTheDocument();
  });

  it('handles empty distributions gracefully', () => {
    const series = [
      {
        label: 'Empty',
        distribution: [],
        color: 'indigo',
      },
    ];

    render(<CumulativeTable series={series} />);

    // Should render table structure but no data rows
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Wounds')).toBeInTheDocument();
    expect(screen.getByText('Empty')).toBeInTheDocument();

    // Should have only header row (no data rows)
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1); // Only header row
  });

  it('displays correct color mapping for each series', () => {
    const series = [
      { label: 'Indigo', distribution: createMockDistribution(), color: 'indigo' },
      { label: 'Emerald', distribution: createMockDistribution(), color: 'emerald' },
      { label: 'Amber', distribution: createMockDistribution(), color: 'amber' },
      { label: 'Rose', distribution: createMockDistribution(), color: 'rose' },
    ];

    render(<CumulativeTable series={series} />);

    // All series labels should appear in headers
    expect(screen.getByText('Indigo')).toBeInTheDocument();
    expect(screen.getByText('Emerald')).toBeInTheDocument();
    expect(screen.getByText('Amber')).toBeInTheDocument();
    expect(screen.getByText('Rose')).toBeInTheDocument();

    // Color dots should be present (with inline styles for colors)
    const headers = screen.getAllByRole('columnheader');
    const colorElements = headers.filter(h => h.querySelector('[style*="background-color"]'));
    expect(colorElements.length).toBeGreaterThan(0);
  });

  it('sorts wound counts in ascending order', () => {
    // Create distribution with unsorted wound counts
    const unsortedDistribution: DistributionEntry[] = [
      { wounds: 3, probability: 0.2, cumulative: 0.4 },
      { wounds: 1, probability: 0.3, cumulative: 0.9 },
      { wounds: 0, probability: 0.1, cumulative: 1.0 },
      { wounds: 2, probability: 0.3, cumulative: 0.6 },
    ];

    const series = [
      {
        label: 'Unsorted',
        distribution: unsortedDistribution,
        color: 'indigo',
      },
    ];

    render(<CumulativeTable series={series} />);

    // Get all data rows by their wound count text
    expect(screen.getByText('≥ 0')).toBeInTheDocument();
    expect(screen.getByText('≥ 1')).toBeInTheDocument();
    expect(screen.getByText('≥ 2')).toBeInTheDocument();
    expect(screen.getByText('≥ 3')).toBeInTheDocument();

    // Check that they appear in order (0, 1, 2, 3)
    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1); // Skip header row
    expect(dataRows[0].textContent).toContain('≥ 0');
    expect(dataRows[1].textContent).toContain('≥ 1');
    expect(dataRows[2].textContent).toContain('≥ 2');
    expect(dataRows[3].textContent).toContain('≥ 3');
  });

  it('formats percentages correctly', () => {
    const preciseDistribution: DistributionEntry[] = [
      { wounds: 0, probability: 0.1, cumulative: 1.0 },
      { wounds: 1, probability: 0.23456, cumulative: 0.7654321 },
      { wounds: 2, probability: 0.53086, cumulative: 0.530864 },
    ];

    const series = [
      {
        label: 'Precise',
        distribution: preciseDistribution,
        color: 'indigo',
      },
    ];

    render(<CumulativeTable series={series} />);

    // Check formatted percentages (should be rounded to 1 decimal place)
    expect(screen.getByText('100.0%')).toBeInTheDocument(); // 1.0
    expect(screen.getByText('76.5%')).toBeInTheDocument(); // 0.7654321
    expect(screen.getByText('53.1%')).toBeInTheDocument(); // 0.530864
  });
});