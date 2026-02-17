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

    // Attack Type is now a segmented control (radio group)
    expect(screen.getByRole('radio', { name: 'Ranged' })).toHaveAttribute('aria-checked', 'true');
  });

  it('renders and updates attack type store', () => {
    render(<AttackTypeSelector />);

    fireEvent.click(screen.getByRole('radio', { name: 'Melee'}));

    expect(useAttackTypeStore.getState().attackType).toBe(AttackType.Melee);
  });

  it('renders all phase 6 attack type options', () => {
    render(<AttackTypeSelector />);

    expect(screen.getByRole('radio', { name: 'Ranged' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Melee' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Overrun' })).toBeInTheDocument();
  });
});
