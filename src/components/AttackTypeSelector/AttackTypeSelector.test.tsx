import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AttackType } from '../../engine/types';
import { useAttackTypeStore } from '../../stores/attackTypeStore';
import AttackTypeSelector from './AttackTypeSelector';

describe('AttackTypeSelector', () => {
  beforeEach(() => {
    useAttackTypeStore.getState().reset();
  });

  it('defaults to ranged attack type', () => {
    render(<AttackTypeSelector />);

    expect(screen.getByLabelText('Attack Type')).toHaveValue(AttackType.Ranged);
  });

  it('renders and updates attack type store', () => {
    render(<AttackTypeSelector />);

    const select = screen.getByLabelText('Attack Type');
    fireEvent.change(select, { target: { value: AttackType.Melee } });

    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Melee);
  });

  it('renders all phase 6 attack type options', () => {
    render(<AttackTypeSelector />);

    expect(screen.getByRole('option', { name: 'Ranged' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Melee' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Overrun' })).toBeInTheDocument();
  });
});
