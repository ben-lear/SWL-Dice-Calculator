import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchableCombobox from './SearchableCombobox';
import { describe, it, expect, vi } from 'vitest';

const unitOptions = [
  { value: 'vader', label: 'Darth Vader (Lightsaber)' },
  { value: 'stormtroopers', label: 'Stormtroopers (DLT-19)' },
  { value: 'shore', label: 'Shore Troopers (T-21B)' },
  { value: 'luke', label: 'Luke Skywalker (Lightsaber)' },
  { value: 'rebels', label: 'Rebel Troopers' },
];

describe('SearchableCombobox', () => {
  // --- Rendering ---

  it('renders the label text', () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    expect(screen.getByText('Unit')).toBeInTheDocument();
  });

  it('displays placeholder when no value is selected', () => {
    render(
      <SearchableCombobox
        label="Unit"
        value=""
        onChange={() => {}}
        options={unitOptions}
        placeholder="Select a unit..."
      />
    );
    expect(screen.getByPlaceholderText('Select a unit...')).toBeInTheDocument();
  });

  it('displays selected option label when value is set', () => {
    render(
      <SearchableCombobox label="Unit" value="vader" onChange={() => {}} options={unitOptions} />
    );
    expect(screen.getByRole('combobox')).toHaveValue('Darth Vader (Lightsaber)');
  });

  // --- Opening ---

  it('opens dropdown on focus', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  // --- Filtering ---

  it('filters options as user types', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'vader');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Darth Vader');
  });

  it('shows "No matches found" when filter produces no results', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'zzzzz');
    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  it('filters case-insensitively', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'STORM');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Stormtroopers');
  });

  // --- Selection ---

  it('calls onChange when an option is clicked', async () => {
    const onChange = vi.fn();
    render(
      <SearchableCombobox label="Unit" value="" onChange={onChange} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Darth Vader (Lightsaber)'));
    expect(onChange).toHaveBeenCalledWith('vader');
  });

  it('closes dropdown after selection', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Darth Vader (Lightsaber)'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // --- Clear ---

  it('shows clear button when value is selected', () => {
    render(
      <SearchableCombobox label="Unit" value="vader" onChange={() => {}} options={unitOptions} />
    );
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('calls onChange with empty string when clear is clicked', async () => {
    const onChange = vi.fn();
    render(
      <SearchableCombobox label="Unit" value="vader" onChange={onChange} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  // --- Keyboard Navigation ---

  it('navigates options with arrow keys and selects with Enter', async () => {
    const onChange = vi.fn();
    render(
      <SearchableCombobox label="Unit" value="" onChange={onChange} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}'); // highlight second option
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('stormtroopers');
  });

  it('closes dropdown on Escape without selecting', async () => {
    const onChange = vi.fn();
    render(
      <SearchableCombobox label="Unit" value="" onChange={onChange} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  // --- Disabled ---

  it('does not open dropdown when disabled', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} disabled />
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // --- Accessibility ---

  it('sets aria-expanded correctly', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('links label to input via htmlFor/id', () => {
    render(
      <SearchableCombobox
        label="Unit"
        value=""
        onChange={() => {}}
        options={unitOptions}
        id="unit-select"
      />
    );
    expect(screen.getByText('Unit')).toHaveAttribute('for', 'unit-select');
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'unit-select');
  });
});
