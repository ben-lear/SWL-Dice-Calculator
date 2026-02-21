import { useDefenseConfigStore } from '../../stores/defenseConfigStore';
import UpgradeSlotsSection from '../shared/UpgradeSlotsSection';

export default function DefenderUnitBuilderView() {
  const store = useDefenseConfigStore();

  return (
    <UpgradeSlotsSection
      selectedPresetId={store.selectedPresetId}
      effectiveUpgradeBar={store.effectiveUpgradeBar}
      upgradeBar={store.upgradeBar}
      equippedUpgradeIds={store.equippedUpgradeIds}
      equipUpgrade={store.equipUpgrade}
      grantedByIndex={store.grantedByIndex}
      unitApiId={store.unitApiId ?? undefined}
      selectedFaction={store.selectedFaction}
      selectedUnitRank={store.selectedUnitRank}
      selectedUnitType={store.selectedUnitType}
      selectedUnitAffiliation={store.selectedUnitAffiliation}
    />
  );
}
