import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Checkbox from './Checkbox';

describe('Checkbox', () => {
  it('renders with label text', () => {
    render(<Checkbox value={false} onChange={() => {}} label="Test Checkbox" />);
    expect(screen.getByText('Test Checkbox')).toBeInTheDocument();
  });

  it('displays checked state', () => {
    render(<Checkbox value={true} onChange={() => {}} label="Test" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('displays unchecked state', () => {
    render(<Checkbox value={false} onChange={() => {}} label="Test" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('respects disabled state', () => {
    render(<Checkbox value={false} onChange={() => {}} label="Test" disabled={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('displays tooltip on span', () => {
    render(<Checkbox value={false} onChange={() => {}} label="Test" tooltip="Test tooltip" />);
    const span = screen.getByText('Test');
    expect(span).toHaveAttribute('title', 'Test tooltip');
  });
});
