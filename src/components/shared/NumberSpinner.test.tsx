import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NumberSpinner from './NumberSpinner';
import { describe, it, expect, vi } from 'vitest';

describe('NumberSpinner', () => {
  // --- Rendering ---

  it('renders the label and current value', () => {
    render(<NumberSpinner label="Red dice" value={3} onChange={() => {}} />);
    expect(screen.getByText('Red dice')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue('3');
  });

  it('renders increment and decrement buttons', () => {
    render(<NumberSpinner label="Tokens" value={0} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /decrease/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /increase/i })).toBeInTheDocument();
  });

  // --- Increment / Decrement ---

  it('calls onChange with incremented value when + is clicked', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={2} onChange={onChange} max={10} />);
    await userEvent.click(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with decremented value when − is clicked', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={3} onChange={onChange} min={0} />);
    await userEvent.click(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  // --- Boundaries ---

  it('disables decrement button at min value', () => {
    render(<NumberSpinner label="Dice" value={0} onChange={() => {}} min={0} />);
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
  });

  it('disables increment button at max value', () => {
    render(<NumberSpinner label="Dice" value={5} onChange={() => {}} max={5} />);
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled();
  });

  it('does not call onChange when clicking + at max', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={5} onChange={onChange} max={5} />);
    await userEvent.click(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when clicking − at min', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={0} onChange={onChange} min={0} />);
    await userEvent.click(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  // --- Direct Input ---

  it('clamps typed value above max to max', () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={0} onChange={onChange} min={0} max={12} />);
    const input = screen.getByRole('spinbutton');
    // Use fireEvent.change to simulate a complete value entry.
    // userEvent.type on a controlled component with mock onChange doesn't accumulate
    // keystrokes because the value prop never updates between characters.
    fireEvent.change(input, { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith(12);
  });

  it('clamps typed value below min to min', () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={5} onChange={onChange} min={2} max={12} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('treats empty input as min value', () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={3} onChange={onChange} min={0} max={12} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  // --- Keyboard ---

  it('increments on ArrowUp key', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={3} onChange={onChange} max={10} />);
    const input = screen.getByRole('spinbutton');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('decrements on ArrowDown key', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={3} onChange={onChange} min={0} />);
    const input = screen.getByRole('spinbutton');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenCalledWith(2);
  });

  // --- Custom Step ---

  it('increments by custom step size', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Cost" value={100} onChange={onChange} step={5} max={999} />);
    await userEvent.click(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(105);
  });

  // --- Disabled State ---

  it('disables all inputs when disabled prop is true', () => {
    render(<NumberSpinner label="Dice" value={3} onChange={() => {}} disabled />);
    expect(screen.getByRole('spinbutton')).toBeDisabled();
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled();
  });

  // --- Tooltip ---

  it('renders tooltip as title on the label', () => {
    render(
      <NumberSpinner
        label="Pierce"
        value={2}
        onChange={() => {}}
        tooltip="Cancel defense results"
      />
    );
    expect(screen.getByText('Pierce')).toHaveAttribute('title', 'Cancel defense results');
  });

  // --- Accessibility ---

  it('links label to input via htmlFor/id', () => {
    render(<NumberSpinner label="Red dice" value={0} onChange={() => {}} id="red-dice" />);
    const label = screen.getByText('Red dice');
    expect(label).toHaveAttribute('for', 'red-dice');
    expect(screen.getByRole('spinbutton')).toHaveAttribute('id', 'red-dice');
  });

  it('sets aria-valuemin, aria-valuemax, and aria-valuenow', () => {
    render(<NumberSpinner label="Aim" value={2} onChange={() => {}} min={0} max={5} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-valuemin', '0');
    expect(input).toHaveAttribute('aria-valuemax', '5');
    expect(input).toHaveAttribute('aria-valuenow', '2');
  });
});
