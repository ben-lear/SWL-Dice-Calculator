import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import DefenderPanel from './DefenderPanel';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';

describe('DefenderPanel', () => {
  beforeEach(() => {
    useDefenseConfigStore.getState().resetDefenderConfig();
  });

  it('renders the panel header', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Defender')).toBeInTheDocument();
  });

  it('renders mode toggle buttons', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Custom Pool')).toBeInTheDocument();
    expect(screen.getByText('Unit Builder')).toBeInTheDocument();
  });

  it('defaults to custom pool mode', () => {
    render(<DefenderPanel />);
    const state = useDefenseConfigStore.getState();
    expect(state.activeDefenderMode).toBe('custom');
  });

  it('switches to unit builder mode on button click', () => {
    render(<DefenderPanel />);
    const unitBuilderButton = screen.getByText('Unit Builder');
    fireEvent.click(unitBuilderButton);
    expect(useDefenseConfigStore.getState().activeDefenderMode).toBe('unit-builder');
  });

  it('switches back to custom pool mode on button click', () => {
    render(<DefenderPanel />);
    
    // Switch to unit builder
    const unitBuilderButton = screen.getByText('Unit Builder');
    fireEvent.click(unitBuilderButton);
    expect(useDefenseConfigStore.getState().activeDefenderMode).toBe('unit-builder');
    
    // Switch back to custom pool
    const customPoolButton = screen.getByText('Custom Pool');
    fireEvent.click(customPoolButton);
    expect(useDefenseConfigStore.getState().activeDefenderMode).toBe('custom');
  });

  it('renders custom pool view by default', () => {
    render(<DefenderPanel />);
    // Check for custom pool-specific elements
    expect(screen.getByText('Defense')).toBeInTheDocument();
    expect(screen.getByText('Defense Die Color')).toBeInTheDocument();
  });

  it('renders unit builder view when mode is unit-builder', () => {
    useDefenseConfigStore.getState().setDefenderMode('unit-builder');
    render(<DefenderPanel />);
    // Check for unit builder-specific elements
    expect(screen.getByText('Unit Builder Mode')).toBeInTheDocument();
  });
});
