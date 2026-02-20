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
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));
    expect(useDefenseConfigStore.getState().activeMode).toBe('unit-builder');
  });

  it('switches back to custom pool mode from select', () => {
    render(<DefenderPanel />);

    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));
    expect(useDefenseConfigStore.getState().activeMode).toBe('unit-builder');

    fireEvent.click(screen.getByRole('radio', { name: 'Custom Pool' }));
    expect(useDefenseConfigStore.getState().activeMode).toBe('custom');
  });

  it('renders defense controls by default', () => {
    render(<DefenderPanel />);
    expect(screen.getByText('Defense')).toBeInTheDocument();
    expect(screen.getByText('Defense Die')).toBeInTheDocument();
  });

  it('renders upgrade section when mode is unit-builder', () => {
    render(<DefenderPanel />);
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));
    expect(screen.getByText('Upgrade Slots')).toBeInTheDocument();
  });

  it('shows Shien Mastery only when Deflect is enabled', () => {
    render(<DefenderPanel />);

    expect(screen.queryByRole('checkbox', { name: 'Shien Mastery' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Deflect' }));

    expect(screen.getByRole('checkbox', { name: 'Shien Mastery' })).toBeInTheDocument();
  });

  it('shows suppression token input when Danger Sense X is above zero', () => {
    useDefenseConfigStore.getState().setField('dangerSenseX', 1);

    render(<DefenderPanel />);

    expect(screen.getByText('Suppression')).toBeInTheDocument();
  });

  it('shows guardian sub-config when Guardian X is above zero', () => {
    useDefenseConfigStore.getState().setField('guardianX', 1);

    render(<DefenderPanel />);

    expect(screen.getByLabelText('Guardian Die Color')).toBeInTheDocument();
    expect(screen.getByLabelText('Guardian Surge')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Guardian Deflect' })).toBeInTheDocument();
  });

  it('hides Surge Chart when Defense Die is set to None', () => {
    // Start with defense dice enabled (White die)
    useDefenseConfigStore.getState().setField('disableDefenseDice', false);

    render(<DefenderPanel />);

    // Surge Chart should be visible when Defense Die is White
    expect(screen.getByLabelText('Surge Chart')).toBeInTheDocument();

    // Find the Defense Die control and click the 'None' option within it
    const defenseDieControl = screen.getByLabelText('Defense Die');
    const noneButton = within(defenseDieControl).getByRole('radio', { name: 'None' });
    fireEvent.click(noneButton);

    // Surge Chart should now be hidden
    expect(screen.queryByLabelText('Surge Chart')).not.toBeInTheDocument();
  });

  it('updates selected faction and filters defender unit options', async () => {
    render(<DefenderPanel />);

    // Need to be in unit-builder mode to see the Unit Preset section
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    const factionValue = getFactionOptions()[0]?.value as Faction;
    const expectedOptions = getDefenderPresets(factionValue).length;

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

    // Need to be in unit-builder mode to see the Unit Preset section
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    const preset = getDefenderPresets(null)[0];
    expect(preset).toBeDefined();
    const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
    const displayName = `${preset.name} (${rankLabel})`;

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    await userEvent.click(screen.getByRole('option', { name: displayName }));

    expect(useDefenseConfigStore.getState().selectedPresetId).toBe(preset.id);
  });

  it('clearing selection clears defender selected preset without resetting fields', async () => {
    render(<DefenderPanel />);

    // Need to be in unit-builder mode to see the Unit Preset section
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    const preset = getDefenderPresets(null)[0];
    expect(preset).toBeDefined();
    const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
    const displayName = `${preset.name} (${rankLabel})`;

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    await userEvent.click(screen.getByRole('option', { name: displayName }));

    const previousDieColor = useDefenseConfigStore.getState().dieColor;

    // Clear the selection using the Clear button
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(useDefenseConfigStore.getState().selectedPresetId).toBeNull();
    expect(useDefenseConfigStore.getState().dieColor).toBe(previousDieColor);
  });

  it('hides Unit Preset section in Custom Pool mode', () => {
    render(<DefenderPanel />);

    // Initially in custom mode, Unit Preset section should not be visible
    expect(screen.queryByText('Unit Preset')).not.toBeInTheDocument();

    // Switch to unit-builder mode
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    // Now Unit Preset section should be visible
    expect(screen.getByText('Unit Preset')).toBeInTheDocument();
  });
});
