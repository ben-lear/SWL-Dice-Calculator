import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import DefenderPanelCompact from './DefenderPanelCompact';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';

describe('DefenderPanelCompact', () => {
  beforeEach(() => {
    useDefenseConfigStore.getState().reset();
  });

  it('renders mode selector', () => {
    render(<DefenderPanelCompact />);
    expect(screen.getByLabelText('Mode')).toBeInTheDocument();
  });

  it('renders Defense, Cover, and Tokens section headings', () => {
    render(<DefenderPanelCompact />);
    expect(screen.getByText('Defense')).toBeInTheDocument();
    expect(screen.getByText('Cover')).toBeInTheDocument();
    expect(screen.getByText('Tokens')).toBeInTheDocument();
  });

  it('renders defense controls inline (not collapsible)', () => {
    render(<DefenderPanelCompact />);
    expect(screen.getByText('Defense Die')).toBeInTheDocument();
    expect(screen.getByText('Cover Type')).toBeInTheDocument();
    expect(screen.getByText('Dodge')).toBeInTheDocument();
  });

  it('renders Keywords section collapsed by default', () => {
    render(<DefenderPanelCompact />);
    const keywordsButton = screen.getByRole('button', { name: /keywords/i });
    expect(keywordsButton).toBeInTheDocument();
    expect(keywordsButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders Guardian section collapsed by default', () => {
    render(<DefenderPanelCompact />);
    const guardianButton = screen.getByRole('button', { name: /^guardian$/i });
    expect(guardianButton).toBeInTheDocument();
    expect(guardianButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('switches to unit builder mode and shows Unit Preset', () => {
    render(<DefenderPanelCompact />);

    // Initially no Unit Preset section
    expect(screen.queryByText('Unit Preset')).not.toBeInTheDocument();

    // Switch to unit-builder mode
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    // Unit Preset section should appear
    expect(screen.getByText('Unit Preset')).toBeInTheDocument();
  });

  it('shows Upgrade Slots when in unit-builder mode', () => {
    render(<DefenderPanelCompact />);
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));
    expect(screen.getByText('Upgrade Slots')).toBeInTheDocument();
  });

  it('renders Unit Cost spinner', () => {
    render(<DefenderPanelCompact />);
    expect(screen.getByText('Unit Cost')).toBeInTheDocument();
  });

  it('hides Surge Chart when Defense Die is set to None', () => {
    useDefenseConfigStore.getState().setField('disableDefenseDice', false);
    render(<DefenderPanelCompact />);

    expect(screen.getByLabelText('Surge Chart')).toBeInTheDocument();

    // Click None on Defense Die
    const defenseDieControl = screen.getByLabelText('Defense Die');
    const noneButton = defenseDieControl.querySelector('[role="radio"][aria-label="None"]')
      ?? screen.getAllByRole('radio', { name: 'None' })[0];
    fireEvent.click(noneButton);

    expect(screen.queryByLabelText('Surge Chart')).not.toBeInTheDocument();
  });
});
