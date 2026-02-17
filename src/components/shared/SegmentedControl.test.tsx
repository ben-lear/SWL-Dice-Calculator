import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SegmentedControl from './SegmentedControl';
import { describe, it, expect, vi } from 'vitest';

const modeOptions = [
  { value: 'custom-pool', label: 'Custom Pool' },
  { value: 'unit-builder', label: 'Unit Builder' },
];

const attackTypeOptions = [
  { value: 'ranged', label: 'Ranged' },
  { value: 'melee', label: 'Melee' },
  { value: 'overrun', label: 'Overrun' },
];

describe('SegmentedControl', () => {
  // --- Rendering ---

  it('renders the label text', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
      />
    );
    expect(screen.getByText('Mode')).toBeInTheDocument();
  });

  it('renders all option buttons with correct labels', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
      />
    );
    expect(screen.getByRole('radio', { name: 'Custom Pool' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Unit Builder' })).toBeInTheDocument();
  });

  it('renders all three options for attack type', () => {
    render(
      <SegmentedControl
        label="Attack Type"
        value="ranged"
        onChange={() => {}}
        options={attackTypeOptions}
      />
    );
    expect(screen.getByRole('radio', { name: 'Ranged' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Melee' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Overrun' })).toBeInTheDocument();
  });

  // --- Active State ---

  it('marks the active option with aria-checked="true"', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="unit-builder"
        onChange={() => {}}
        options={modeOptions}
      />
    );
    expect(screen.getByRole('radio', { name: 'Unit Builder' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'Custom Pool' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('applies active styling to the selected option', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
      />
    );
    const activeButton = screen.getByRole('radio', { name: 'Custom Pool' });
    expect(activeButton.className).toContain('bg-blue-600');
    expect(activeButton.className).toContain('text-white');
  });

  it('applies inactive styling to non-selected options', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
      />
    );
    const inactiveButton = screen.getByRole('radio', { name: 'Unit Builder' });
    expect(inactiveButton.className).toContain('bg-transparent');
    expect(inactiveButton.className).toContain('text-gray-400');
  });

  // --- Interaction ---

  it('calls onChange with the new value when inactive option is clicked', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={onChange}
        options={modeOptions}
      />
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));
    expect(onChange).toHaveBeenCalledWith('unit-builder');
  });

  it('does not call onChange when already-active option is clicked', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={onChange}
        options={modeOptions}
      />
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Custom Pool' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  // --- Disabled State ---

  it('disables all buttons when disabled prop is true', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
        disabled
      />
    );
    expect(screen.getByRole('radio', { name: 'Custom Pool' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Unit Builder' })).toBeDisabled();
  });

  it('prevents interaction when disabled', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={onChange}
        options={modeOptions}
        disabled
      />
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  // --- Keyboard Navigation ---

  it('navigates to next option with ArrowRight', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Attack Type"
        value="ranged"
        onChange={onChange}
        options={attackTypeOptions}
      />
    );
    const rangedButton = screen.getByRole('radio', { name: 'Ranged' });
    rangedButton.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('melee');
  });

  it('navigates to previous option with ArrowLeft', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Attack Type"
        value="melee"
        onChange={onChange}
        options={attackTypeOptions}
      />
    );
    const meleeButton = screen.getByRole('radio', { name: 'Melee' });
    meleeButton.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith('ranged');
  });

  it('wraps to first option when ArrowRight on last option', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Attack Type"
        value="overrun"
        onChange={onChange}
        options={attackTypeOptions}
      />
    );
    const overrunButton = screen.getByRole('radio', { name: 'Overrun' });
    overrunButton.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('ranged');
  });

  it('wraps to last option when ArrowLeft on first option', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Attack Type"
        value="ranged"
        onChange={onChange}
        options={attackTypeOptions}
      />
    );
    const rangedButton = screen.getByRole('radio', { name: 'Ranged' });
    rangedButton.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith('overrun');
  });

  it('jumps to first option with Home key', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Attack Type"
        value="overrun"
        onChange={onChange}
        options={attackTypeOptions}
      />
    );
    const overrunButton = screen.getByRole('radio', { name: 'Overrun' });
    overrunButton.focus();
    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenCalledWith('ranged');
  });

  it('jumps to last option with End key', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Attack Type"
        value="ranged"
        onChange={onChange}
        options={attackTypeOptions}
      />
    );
    const rangedButton = screen.getByRole('radio', { name: 'Ranged' });
    rangedButton.focus();
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenCalledWith('overrun');
  });

  // --- Tooltip ---

  it('renders tooltip as title on the label', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
        tooltip="Choose your configuration mode"
      />
    );
    expect(screen.getByText('Mode')).toHaveAttribute('title', 'Choose your configuration mode');
  });

  // --- Accessibility ---

  it('renders with role="radiogroup"', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
      />
    );
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('sets aria-label on the radiogroup', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
      />
    );
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Mode');
  });

  it('only active option has tabIndex 0', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
      />
    );
    expect(screen.getByRole('radio', { name: 'Custom Pool' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('radio', { name: 'Unit Builder' })).toHaveAttribute('tabIndex', '-1');
  });

  it('uses explicit id when provided', () => {
    render(
      <SegmentedControl
        label="Mode"
        value="custom-pool"
        onChange={() => {}}
        options={modeOptions}
        id="mode-control"
      />
    );
    expect(screen.getByRole('radiogroup')).toHaveAttribute('id', 'mode-control');
  });
});
