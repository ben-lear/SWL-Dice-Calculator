import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from './Select';
import { describe, it, expect, vi } from 'vitest';

const surgeOptions = [
  { value: 'none', label: 'None' },
  { value: 'to-hit', label: 'c → a (Hit)' },
  { value: 'to-crit', label: 'c → b (Crit)' },
];

describe('Select', () => {
  // --- Rendering ---

  it('renders the label text', () => {
    render(
      <Select label="Surge chart" value="none" onChange={() => {}} options={surgeOptions} />
    );
    expect(screen.getByText('Surge chart')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(
      <Select label="Surge chart" value="none" onChange={() => {}} options={surgeOptions} />
    );
    const select = screen.getByRole('combobox');
    expect(select.children).toHaveLength(3);
  });

  it('displays the selected value', () => {
    render(
      <Select label="Surge chart" value="to-hit" onChange={() => {}} options={surgeOptions} />
    );
    expect(screen.getByRole('combobox')).toHaveValue('to-hit');
  });

  // --- Selection ---

  it('calls onChange with the new value when selection changes', async () => {
    const onChange = vi.fn();
    render(
      <Select label="Surge chart" value="none" onChange={onChange} options={surgeOptions} />
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), 'to-crit');
    expect(onChange).toHaveBeenCalledWith('to-crit');
  });

  // --- Disabled ---

  it('disables the select when disabled prop is true', () => {
    render(
      <Select label="Surge chart" value="none" onChange={() => {}} options={surgeOptions} disabled />
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  // --- Tooltip ---

  it('renders tooltip as title on the label', () => {
    render(
      <Select
        label="Surge chart"
        value="none"
        onChange={() => {}}
        options={surgeOptions}
        tooltip="Unit card surge conversion"
      />
    );
    expect(screen.getByText('Surge chart')).toHaveAttribute('title', 'Unit card surge conversion');
  });

  // --- Accessibility ---

  it('links label to select via htmlFor/id', () => {
    render(
      <Select
        label="Surge chart"
        value="none"
        onChange={() => {}}
        options={surgeOptions}
        id="surge-chart"
      />
    );
    expect(screen.getByText('Surge chart')).toHaveAttribute('for', 'surge-chart');
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'surge-chart');
  });
});
