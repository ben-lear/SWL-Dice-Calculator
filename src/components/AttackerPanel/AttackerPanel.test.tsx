import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import AttackerPanel from './AttackerPanel';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import { getAttackerPresets, getFactionOptions } from '../../data/presetHelpers';
import { AttackType } from '../../engine/types';
import type { Faction } from '../../data/presets';

describe('AttackerPanel', () => {
  beforeEach(() => {
    useAttackConfigStore.getState().reset();
  });

  it('renders attacker header', () => {
    render(<AttackerPanel />);

    expect(screen.getByText('Attacker')).toBeInTheDocument();
  });

  it('updates mode from the mode select', () => {
    render(<AttackerPanel />);

    // Mode is now a segmented control (radio button group), not a select
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    expect(useAttackConfigStore.getState().activeMode).toBe('unit-builder');
  });

  it('renders upgrade slots section in unit-builder mode', () => {
    render(<AttackerPanel />);

    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    expect(screen.getByText('Upgrade Slots')).toBeInTheDocument();
  });

  it('toggles weapon enabled state in unit-builder mode', async () => {
    render(<AttackerPanel />);

    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    // Load a preset so weapons are populated
    const preset = getAttackerPresets(null, AttackType.Ranged)[0];
    expect(preset).toBeDefined();
    const baseUnitName = preset.name.replace(/\s*\([^)]*\)$/, '');
    const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
    const displayName = `${baseUnitName} (${rankLabel})`;

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    await userEvent.click(screen.getByRole('option', { name: displayName }));

    // Weapon checkbox is rendered as a plain checkbox in unit-builder mode
    const weaponCheckboxes = screen.getAllByRole('checkbox');
    // Find the first checkbox inside the Weapons section (weapon enable toggle)
    const weaponToggle = weaponCheckboxes[0];
    expect(weaponToggle).toBeChecked();

    fireEvent.click(weaponToggle);
    expect(useAttackConfigStore.getState().weapons[0]?.enabled).toBe(false);
  });

  it('updates weapon dice in custom mode', () => {
    render(<AttackerPanel />);

    // Dice labels now use icons; find the Red Dice spinner via its Increase button
    const increaseRedBtn = screen.getByRole('button', { name: 'Increase Red Dice' });
    // Click Increase 3 times to set Red Dice to 3
    fireEvent.click(increaseRedBtn);
    fireEvent.click(increaseRedBtn);
    fireEvent.click(increaseRedBtn);

    expect(useAttackConfigStore.getState().weapons[0]?.redDice).toBe(3);
  });

  it('shows marksman strategy only when marksman is enabled', async () => {
    render(<AttackerPanel />);

    expect(screen.queryByLabelText('Marksman Strategy')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Marksman' }));

    expect(await screen.findByLabelText('Marksman Strategy')).toBeInTheDocument();
  });

  it("shows Jar'Kai dodge token input only when Jar'Kai Mastery is enabled", async () => {
    render(<AttackerPanel />);

    expect(screen.queryByText("Dodge")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: "Jar'Kai Mastery" }));

    expect(await screen.findByText("Dodge")).toBeInTheDocument();
  });

  it('updates selected faction and filters unit options', async () => {
    render(<AttackerPanel />);

    // Need to be in unit-builder mode to see the Unit Preset section
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    const factionValue = getFactionOptions()[0]?.value as Faction;
    const filteredPresets = getAttackerPresets(factionValue, AttackType.Ranged);
    // Count unique units by unitApiId (matching component logic)
    const uniqueUnitIds = new Set(filteredPresets.map(p => p.unitApiId));
    const expectedOptions = uniqueUnitIds.size;

    fireEvent.change(screen.getByLabelText('Faction'), {
      target: { value: factionValue },
    });

    expect(useAttackConfigStore.getState().selectedFaction).toBe(factionValue);

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    const listbox = screen.getByRole('listbox', { name: 'Unit options' });
    expect(within(listbox).getAllByRole('option')).toHaveLength(expectedOptions);
  });

  it('loads selected attacker preset from combobox', async () => {
    render(<AttackerPanel />);

    // Need to be in unit-builder mode to see the Unit Preset section
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    const preset = getAttackerPresets(null, AttackType.Ranged)[0];
    expect(preset).toBeDefined();
    // Strip weapon suffix and add rank (matching component logic)
    const baseUnitName = preset.name.replace(/\s*\([^)]*\)$/, '');
    const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
    const displayName = `${baseUnitName} (${rankLabel})`;

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    await userEvent.click(screen.getByRole('option', { name: displayName }));

    expect(useAttackConfigStore.getState().selectedPresetId).toBe(preset.id);
  });

  it('clearing selection clears selected preset without resetting fields', async () => {
    render(<AttackerPanel />);

    // Need to be in unit-builder mode to see the Unit Preset section
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    const preset = getAttackerPresets(null, AttackType.Ranged)[0];
    expect(preset).toBeDefined();
    // Strip weapon suffix and add rank (matching component logic)
    const baseUnitName = preset.name.replace(/\s*\([^)]*\)$/, '');
    const rankLabel = preset.rank.charAt(0).toUpperCase() + preset.rank.slice(1);
    const displayName = `${baseUnitName} (${rankLabel})`;

    await userEvent.click(screen.getByRole('combobox', { name: 'Unit' }));
    await userEvent.click(screen.getByRole('option', { name: displayName }));

    const previousRedDice = useAttackConfigStore.getState().weapons[0]?.redDice;

    // Clear the selection using the Clear button
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(useAttackConfigStore.getState().selectedPresetId).toBeNull();
    expect(useAttackConfigStore.getState().weapons[0]?.redDice).toBe(previousRedDice);
  });

  it('hides Unit Preset section in Custom Pool mode', () => {
    render(<AttackerPanel />);

    // Initially in custom mode, Unit Preset section should not be visible
    expect(screen.queryByText('Unit Preset')).not.toBeInTheDocument();

    // Switch to unit-builder mode
    fireEvent.click(screen.getByRole('radio', { name: 'Unit Builder' }));

    // Now Unit Preset section should be visible
    expect(screen.getByText('Unit Preset')).toBeInTheDocument();
  });
});
