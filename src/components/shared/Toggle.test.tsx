import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toggle from './Toggle';
import { describe, it, expect, vi } from 'vitest';

describe('Toggle', () => {
  // --- Rendering ---

  it('renders the label text', () => {
    render(<Toggle label="Blast" value={false} onChange={() => {}} />);
    expect(screen.getByText('Blast')).toBeInTheDocument();
  });

  it('renders as a switch role', () => {
    render(<Toggle label="Blast" value={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  // --- Toggle Behavior ---

  it('calls onChange with true when toggled from off', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when toggled from on', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={true} onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('toggles when clicking the label', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} />);
    await userEvent.click(screen.getByText('Blast'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  // --- Aria State ---

  it('sets aria-checked to true when value is true', () => {
    render(<Toggle label="Blast" value={true} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('sets aria-checked to false when value is false', () => {
    render(<Toggle label="Blast" value={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  // --- Keyboard ---

  it('toggles on Space key (native button behavior)', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch');
    toggle.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('toggles on Enter key (native button behavior)', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch');
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // --- Disabled ---

  it('does not call onChange when disabled', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('button is disabled when disabled prop is true', () => {
    render(<Toggle label="Blast" value={false} onChange={() => {}} disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  // --- Tooltip ---

  it('renders tooltip as title on the label', () => {
    render(
      <Toggle label="Blast" value={false} onChange={() => {}} tooltip="Ignore cover" />
    );
    expect(screen.getByText('Blast')).toHaveAttribute('title', 'Ignore cover');
  });
});
