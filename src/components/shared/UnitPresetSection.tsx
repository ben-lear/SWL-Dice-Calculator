import type { ReactNode } from 'react';
import SearchableCombobox, { type ComboboxOption } from './SearchableCombobox';
import SectionHeader from './SectionHeader';
import Select, { type SelectOption } from './Select';

export interface UnitPresetSectionProps {
  faction: string;
  onFactionChange: (faction: string) => void;
  factionOptions: SelectOption<string>[];
  unitValue: string;
  onUnitChange: (unitId: string) => void;
  unitOptions: ComboboxOption[];
  /** Optional extra content rendered below the unit selector. */
  children?: ReactNode;
}

export default function UnitPresetSection({
  faction,
  onFactionChange,
  factionOptions,
  unitValue,
  onUnitChange,
  unitOptions,
  children,
}: UnitPresetSectionProps) {
  return (
    <SectionHeader title="Unit Preset">
      <div className="space-y-3">
        <Select
          label="Faction"
          value={faction}
          onChange={onFactionChange}
          options={factionOptions}
        />
        <SearchableCombobox
          label="Unit"
          value={unitValue}
          onChange={onUnitChange}
          options={unitOptions}
          placeholder="Search units..."
        />
        {children}
      </div>
    </SectionHeader>
  );
}
