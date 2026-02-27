import { useDefenderStore } from '../../hooks/useDefenderStoreContext';
import UpgradeSlotsSection from '../shared/UpgradeSlotsSection';

export default function DefenderUnitBuilderView() {
  const store = useDefenderStore();

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
