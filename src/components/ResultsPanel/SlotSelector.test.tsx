import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlotSelector } from './SlotSelector';
import type { ResultSlot } from '../../stores/resultsStore';
import type { SimulationResult, AttackConfig } from '../../engine/types';
import { AttackType, AttackSurgeChart, DefenseDieColor, DefenseSurgeChart, CoverType, MarksmanStrategy, RerollStrategy } from '../../engine/types';

// Mock data
const createMockResult = (): SimulationResult => ({
  totalWounds: {
    mean: 3.2,
    median: 3,
    mode: 3,
    min: 0,
    max: 8,
    standardDeviation: 1.5,
  },
  totalWoundsDistribution: [
    { wounds: 0, probability: 0.1, cumulative: 1.0, count: 0 },
    { wounds: 1, probability: 0.2, cumulative: 0.9, count: 0 },
    { wounds: 2, probability: 0.3, cumulative: 0.7, count: 0 },
    { wounds: 3, probability: 0.4, cumulative: 0.4, count: 0 },
  ],
  guardianWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  guardianWoundsDistribution: [],
  mainTargetWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  mainTargetWoundsDistribution: [],
  deflectWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  deflectWoundsDistribution: [],
  djemSoWounds: { mean: 0, median: 0, mode: 0, min: 0, max: 0, standardDeviation: 0 },
  djemSoWoundsDistribution: [],
  suppressionPerAttack: 0,
  efficiency: {
    attackerWoundsPerPoint: 0.02,
    attackerPointsPerWound: 50,
    defenderWoundsPerPoint: 0.08,
    defenderPointsPerWound: 12.5,
    attackerEfficiencyRatio: 4.0,
  },
  iterations: 10000,
  durationMs: 42,
});

const createMockConfig = (): AttackConfig => ({
  attacker: {
    weapons: [{
      redDice: 6,
      blackDice: 0,
      whiteDice: 0,
      keywords: {
        criticalX: 0,
        lethalX: 0,
        pierceX: 0,
        impactX: 0,
        ramX: 0,
        blast: false,
        highVelocity: false,
        suppressive: false,
        immuneDeflect: false,
        primitive: false,
        ionX: 0,
        spray: false,
        antiMaterielX: 0,
        antiPersonnelX: 0,
        cumbersome: false,
        sidearmMelee: false,
        sidearmRanged: false,
        blackOps: false,
        krakenBlaster: false,
      },
    }],
    surgeChart: AttackSurgeChart.ToCrit,
    aimTokens: 0,
    surgeTokens: 0,
    observationTokens: 0,
    dodgeTokensAttacker: 0,
    preciseX: 0,
    sharpshooterX: 0,
    arsenalX: 0,
    marksman: false,
    marksmanStrategy: MarksmanStrategy.Deterministic,
    rerollStrategy: RerollStrategy.Conservative,
    jediHunter: false,
    jarKaiMastery: false,
    duelistAttacker: false,
    makashiMastery: false,
    holdTheLine: false,
    deathFromAbove: false,
    completeTheMission: false,
    unitCost: 0,
    defeatedMinis: 0,
  },
  defender: {
    dieColor: DefenseDieColor.White,
    surgeChart: DefenseSurgeChart.None,
    dodgeTokens: 0,
    surgeTokens: 0,
    minisInLOS: 1,
    coverType: CoverType.None,
    coverX: 0,
    smokeTokens: 0,
    suppressed: false,
    armorX: 0,
    weakPointX: 0,
    immunePierce: false,
    immuneBlast: false,
    immuneMelee: false,
    impervious: false,
    dangerSenseX: 0,
    deflect: false,
    shienMastery: false,
    soresuMastery: false,
    backup: false,
    shieldedX: 0,
    suppressionTokens: 0,
    lowProfile: false,
    uncannyLuckX: 0,
    block: false,
    outmaneuver: false,
    djemSoMastery: false,
    duelistDefender: false,
    immuneMeleePierce: false,
    guardianX: 0,
    guardianDieColor: DefenseDieColor.White,
    guardianSurgeChart: DefenseSurgeChart.None,
    dugIn: false,
    holdTheLine: false,
    completeTheMission: false,
    katarnPatternArmor: false,
    unitCost: 0,
  },
  attackType: AttackType.Ranged,
});

const createMockSlot = (id: string, label: string, color: string): ResultSlot => ({
  id,
  label,
  result: createMockResult(),
  configSnapshot: createMockConfig(),
  color,
});

describe('SlotSelector', () => {
  const mockOnSelect = vi.fn();
  const mockOnRemove = vi.fn();
  const mockOnRename = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when slots array is empty', () => {
    const { container } = render(
      <SlotSelector
        slots={[]}
        viewedSlotId={null}
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders one chip per slot with correct label and color dot', () => {
    const slots = [
      createMockSlot('slot-1', 'Sim 1', 'indigo'),
      createMockSlot('slot-2', 'Sim 2', 'emerald'),
    ];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    expect(screen.getByText('Sim 1')).toBeInTheDocument();
    expect(screen.getByText('Sim 2')).toBeInTheDocument();

    // Check color dots are present (we can't easily test the exact bg color in tests)
    const colorDots = screen.getAllByRole('generic');
    const indigo = colorDots.find(el => el.className.includes('bg-indigo-500'));
    const emerald = colorDots.find(el => el.className.includes('bg-emerald-500'));
    expect(indigo).toBeInTheDocument();
    expect(emerald).toBeInTheDocument();
  });

  it('highlights active chip with colored border', () => {
    const slots = [
      createMockSlot('slot-1', 'Sim 1', 'indigo'),
      createMockSlot('slot-2', 'Sim 2', 'emerald'),
    ];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    const chip1 = screen.getByText('Sim 1').closest('div');
    const chip2 = screen.getByText('Sim 2').closest('div');

    expect(chip1).toHaveClass('border-indigo-500');
    expect(chip2).toHaveClass('border-gray-700');
  });

  it('calls onSelect when clicking inactive chip', () => {
    const slots = [
      createMockSlot('slot-1', 'Sim 1', 'indigo'),
      createMockSlot('slot-2', 'Sim 2', 'emerald'),
    ];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    const chip2 = screen.getByText('Sim 2').closest('div');
    fireEvent.click(chip2!);

    expect(mockOnSelect).toHaveBeenCalledWith('slot-2');
  });

  it('calls onRemove when clicking × button', () => {
    const slots = [createMockSlot('slot-1', 'Sim 1', 'indigo')];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    const removeButton = screen.getByLabelText('Remove Sim 1');
    fireEvent.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith('slot-1');
  });

  it('enters edit mode on double-click label', () => {
    const slots = [createMockSlot('slot-1', 'Sim 1', 'indigo')];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    const label = screen.getByText('Sim 1');
    fireEvent.doubleClick(label);

    expect(screen.getByDisplayValue('Sim 1')).toBeInTheDocument();
  });

  it('confirms rename on Enter key', () => {
    const slots = [createMockSlot('slot-1', 'Sim 1', 'indigo')];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    const label = screen.getByText('Sim 1');
    fireEvent.doubleClick(label);

    const input = screen.getByDisplayValue('Sim 1');
    fireEvent.change(input, { target: { value: 'Custom Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnRename).toHaveBeenCalledWith('slot-1', 'Custom Name');
  });

  it('cancels rename on Escape key', () => {
    const slots = [createMockSlot('slot-1', 'Sim 1', 'indigo')];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    const label = screen.getByText('Sim 1');
    fireEvent.doubleClick(label);

    const input = screen.getByDisplayValue('Sim 1');
    fireEvent.change(input, { target: { value: 'Custom Name' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockOnRename).not.toHaveBeenCalled();
    expect(screen.getByText('Sim 1')).toBeInTheDocument();
  });

  it('confirms rename on blur', () => {
    const slots = [createMockSlot('slot-1', 'Sim 1', 'indigo')];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    const label = screen.getByText('Sim 1');
    fireEvent.doubleClick(label);

    const input = screen.getByDisplayValue('Sim 1');
    fireEvent.change(input, { target: { value: 'Custom Name' } });
    fireEvent.blur(input);

    expect(mockOnRename).toHaveBeenCalledWith('slot-1', 'Custom Name');
  });

  it('does not rename to empty string', () => {
    const slots = [createMockSlot('slot-1', 'Sim 1', 'indigo')];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    const label = screen.getByText('Sim 1');
    fireEvent.doubleClick(label);

    const input = screen.getByDisplayValue('Sim 1');
    fireEvent.change(input, { target: { value: '   ' } }); // Whitespace only
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnRename).not.toHaveBeenCalled();
  });

  it('renders chips when only one slot exists', () => {
    const slots = [createMockSlot('slot-1', 'Sim 1', 'indigo')];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    expect(screen.getByText('Sim 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Sim 1')).toBeInTheDocument();
  });

  it('prevents calling onSelect when in edit mode', () => {
    const slots = [createMockSlot('slot-1', 'Sim 1', 'indigo')];

    render(
      <SlotSelector
        slots={slots}
        viewedSlotId="slot-1"
        onSelect={mockOnSelect}
        onRemove={mockOnRemove}
        onRename={mockOnRename}
      />
    );

    const label = screen.getByText('Sim 1');
    fireEvent.doubleClick(label);

    // Now in edit mode - clicking the chip should not call onSelect
    const chip = screen.getByDisplayValue('Sim 1').closest('div');
    fireEvent.click(chip!);

    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});