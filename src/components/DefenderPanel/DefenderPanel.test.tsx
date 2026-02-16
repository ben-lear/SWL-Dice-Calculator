import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import DefenderPanel from './DefenderPanel';
import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import { getDefenderPresets, getFactionOptions } from '../../data/presetHelpers';
import type { Faction } from '../../data/presets';

describe('DefenderPanel', () => {
  beforeEach(() => {
    useDefenseConfigStore.getState().reset();
  });

  it('renders the panel header', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Defender')).toBeInTheDocument();
  });

  it('renders mode selector', () => {
    render(<DefenderPanel />);
    expect(screen.getByLabelText('Mode')).toBeInTheDocument();
  });

  it('defaults to custom pool mode', () => {
    render(<DefenderPanel />);
    const state = useDefenseConfigStore.getState();
    expect(state.activeMode).toBe('custom');
  });

  it('switches to unit builder mode from select', () => {
    render(<DefenderPanel />);
    fireEvent.change(screen.getByLabelText('Mode'), {
      target: { value: 'unit-builder' },
    });
    expect(useDefenseConfigStore.getState().activeMode).toBe('unit-builder');
  });

  it('switches back to custom pool mode from select', () => {
    render(<DefenderPanel />);

    fireEvent.change(screen.getByLabelText('Mode'), {
      target: { value: 'unit-builder' },
    });
    expect(useDefenseConfigStore.getState().activeMode).toBe('unit-builder');

    fireEvent.change(screen.getByLabelText('Mode'), {
      target: { value: 'custom' },
    });
    expect(useDefenseConfigStore.getState().activeMode).toBe('custom');
  });

  it('renders defense controls by default', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Defense')).toBeInTheDocument();
    expect(screen.getByText('Defense Die Color')).toBeInTheDocument();
  });

  it('renders upgrade section when mode is unit-builder', () => {
    render(<DefenderPanel />);
    fireEvent.change(screen.getByLabelText('Mode'), {
      target: { value: 'unit-builder' },
    });
    expect(screen.getByText('Upgrade Slots')).toBeInTheDocument();
  });

  it('shows Shien Mastery only when Deflect is enabled', () => {
    render(<DefenderPanel />);

    expect(screen.queryByRole('switch', { name: 'Shien Mastery' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Deflect' }));

    expect(screen.getByRole('switch', { name: 'Shien Mastery' })).toBeInTheDocument();
  });

  it('shows suppression token input when Danger Sense X is above zero', () => {
    useDefenseConfigStore.getState().setField('dangerSenseX', 1);

    render(<DefenderPanel />);

    expect(screen.getByText('Suppression Tokens')).toBeInTheDocument();
  });

  it('shows guardian sub-config when Guardian X is above zero', () => {
    useDefenseConfigStore.getState().setField('guardianX', 1);

    render(<DefenderPanel />);

    expect(screen.getByLabelText('Guardian Die Color')).toBeInTheDocument();
    expect(screen.getByLabelText('Guardian Surge')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Guardian Deflect' })).toBeInTheDocument();
  });

  it('hides defense die controls when defense dice are disabled', () => {
    render(<DefenderPanel />);

    expect(screen.getByLabelText('Defense Die Color')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Disable Defense Dice' }));

    expect(screen.queryByLabelText('Defense Die Color')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Surge Chart')).not.toBeInTheDocument();
  });

  it('updates selected faction and filters defender unit options', async () => {
    render(<DefenderPanel />);

    const factionValue = getFactionOptions()[0]?.value as Faction;
    const expectedOptions = getDefenderPresets(factionValue).length + 1;

    fireEvent.change(screen.getByLabelText('Faction'), {
      target: { value: factionValue },
    });

    expect(useDefenseConfigStore.getState().selectedFaction).toBe(factionValue);

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    const listbox = screen.getByRole('listbox', { name: 'Unit options' });
    expect(within(listbox).getAllByRole('option')).toHaveLength(expectedOptions);
  });

  it('loads selected defender preset from combobox', async () => {
    render(<DefenderPanel />);

    const preset = getDefenderPresets(null)[0];
    expect(preset).toBeDefined();

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    await userEvent.click(screen.getByRole('option', { name: preset.name }));

    expect(useDefenseConfigStore.getState().selectedPresetId).toBe(preset.id);
  });

  it('selecting Custom clears defender selected preset without resetting fields', async () => {
    render(<DefenderPanel />);

    const preset = getDefenderPresets(null)[0];
    expect(preset).toBeDefined();

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    await userEvent.click(screen.getByRole('option', { name: preset.name }));

    const previousDieColor = useDefenseConfigStore.getState().dieColor;

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    await userEvent.click(screen.getByRole('option', { name: 'Custom' }));

    expect(useDefenseConfigStore.getState().selectedPresetId).toBeNull();
    expect(useDefenseConfigStore.getState().dieColor).toBe(previousDieColor);
  });
});
