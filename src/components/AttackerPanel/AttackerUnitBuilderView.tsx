import { useMemo } from 'react';
import type { WeaponKeywords } from '../../engine/types';
import type { DisplayWeaponKeywords } from '../../data/enrichment/keywordTypes';
import { aggregateWeaponKeywords } from '../../engine/attackPool';
import { useAttackConfigStore } from '../../stores/attackConfigStore';
import { useWeaponKeywordDisabled } from '../../hooks/useKeywordDisabled';
import WeaponKeywordsSection from './WeaponKeywordsSection';
import { useDisplayWeapons } from '../../hooks/useDisplayWeapons';
import AttackerTokensSection from './AttackerTokensSection';
import AttackerUnitKeywordsSection from './AttackerUnitKeywordsSection';
import NumberSpinner from '../shared/NumberSpinner';
import SectionHeader from '../shared/SectionHeader';
import UpgradeSlotsSection from '../shared/UpgradeSlotsSection';
import DiceIconDisplay from '../shared/DiceIconDisplay';

/**
 * Converts a partial WeaponKeywords object into an array of short human-readable
 * labels, skipping keys that are zero/false.
 */
function formatWeaponKeywords(keywords: Partial<WeaponKeywords & DisplayWeaponKeywords>): string[] {
  const labels: string[] = [];
  // Engine keywords
  if (keywords.criticalX) labels.push(`Critical ${keywords.criticalX}`);
  if (keywords.lethalX)   labels.push(`Lethal ${keywords.lethalX}`);
  if (keywords.pierceX)   labels.push(`Pierce ${keywords.pierceX}`);
  if (keywords.impactX)   labels.push(`Impact ${keywords.impactX}`);
  if (keywords.ramX)      labels.push(`Ram ${keywords.ramX}`);
  if (keywords.ionX)      labels.push(`Ion ${keywords.ionX}`);
  if (keywords.antiMaterielX)  labels.push(`Anti-Mat ${keywords.antiMaterielX}`);
  if (keywords.antiPersonnelX) labels.push(`Anti-Per ${keywords.antiPersonnelX}`);
  if (keywords.blast)         labels.push('Blast');
  if (keywords.suppressive)   labels.push('Suppressive');
  if (keywords.highVelocity)  labels.push('High Velocity');
  if (keywords.immuneDeflect) labels.push('Immune: Deflect');
  if (keywords.primitive)     labels.push('Primitive');
  if (keywords.spray)         labels.push('Spray');
  if (keywords.cumbersome)    labels.push('Cumbersome');
  // Display weapon keywords
  if (keywords.longshot)       labels.push('Long Shot');
  if (keywords.scatter)        labels.push('Scatter');
  if (keywords.exhaust)        labels.push('Exhaust');
  if (keywords.expend)         labels.push('Expend');
  if (keywords.immobilizeX)    labels.push(`Immobilize ${keywords.immobilizeX}`);
  if (keywords.overrunX)       labels.push(`Overrun ${keywords.overrunX}`);
  if (keywords.fixed)          labels.push(`Fixed: ${keywords.fixed}`);
  if (keywords.areaWeapon)     labels.push('Area Weapon');
  if (keywords.beamX)          labels.push(`Beam ${keywords.beamX}`);
  if (keywords.poisonX)        labels.push(`Poison ${keywords.poisonX}`);
  if (keywords.selfDestructX)  labels.push(`Self-Destruct ${keywords.selfDestructX}`);
  if (keywords.towCable)       labels.push('Tow Cable');
  if (keywords.versatile)      labels.push('Versatile');
  if (keywords.armX)           labels.push(`Arm: ${keywords.armX}`);
  if (keywords.detonateX)      labels.push(`Detonate: ${keywords.detonateX}`);
  return labels;
}

// Default keywords used to fill in missing fields from displayWeapon.keywords
const EMPTY_KEYWORDS: WeaponKeywords = {
  criticalX: 0, lethalX: 0, pierceX: 0, impactX: 0, ramX: 0, ionX: 0,
  blast: false, suppressive: false, highVelocity: false, spray: false,
  antiMaterielX: 0, antiPersonnelX: 0, cumbersome: false,
  sidearmMelee: false, sidearmRanged: false, immuneDeflect: false, primitive: false,
  blackOps: false, krakenBlaster: false,
};

export default function AttackerUnitBuilderView() {
  const store = useAttackConfigStore();
  const { weapons: displayWeapons, isSingleMini } = useDisplayWeapons();
  const isWeaponDisabled = useWeaponKeywordDisabled();

  // Aggregate keywords only from ACTIVE display weapons (count > 0).
  // This means toggling weapons in the Weapons section correctly updates
  // the keyword display.
  const aggregatedKeywords = useMemo(() => {
    const activeProfiles = displayWeapons
      .filter((dw) => dw.count > 0)
      .map((dw) => ({
        enabled: true as const,
        redDice: 0,
        blackDice: 0,
        whiteDice: 0,
        keywords: { ...EMPTY_KEYWORDS, ...dw.keywords },
      }));
    return aggregateWeaponKeywords(activeProfiles);
  }, [displayWeapons]);

  // Merge aggregated weapon keywords with user overrides for display and editing.
  // Numeric: take the higher of aggregated vs override (weapons set the floor).
  // Boolean OR: either aggregated or override is sufficient.
  // Per-weapon fields (spray, cumbersome, etc.): come from overrides only.
  const mergedKeywords = useMemo((): Partial<WeaponKeywords> => {
    const ov = store.builderKeywordOverrides;
    return {
      criticalX: Math.max(aggregatedKeywords.criticalX, (ov.criticalX ?? 0)),
      lethalX:   Math.max(aggregatedKeywords.lethalX,   (ov.lethalX   ?? 0)),
      pierceX:   Math.max(aggregatedKeywords.pierceX,   (ov.pierceX   ?? 0)),
      impactX:   Math.max(aggregatedKeywords.impactX,   (ov.impactX   ?? 0)),
      ramX:      Math.max(aggregatedKeywords.ramX,      (ov.ramX      ?? 0)),
      ionX:      Math.max(aggregatedKeywords.ionX,      (ov.ionX      ?? 0)),
      blast:         aggregatedKeywords.blast         || (ov.blast         ?? false),
      suppressive:   aggregatedKeywords.suppressive   || (ov.suppressive   ?? false),
      highVelocity:  aggregatedKeywords.highVelocity  || (ov.highVelocity  ?? false),
      immuneDeflect: aggregatedKeywords.immuneDeflect || (ov.immuneDeflect ?? false),
      primitive:     aggregatedKeywords.primitive     || (ov.primitive     ?? false),
      spray:          ov.spray          ?? false,
      cumbersome:     ov.cumbersome     ?? false,
      antiMaterielX:  ov.antiMaterielX  ?? 0,
      antiPersonnelX: ov.antiPersonnelX ?? 0,
      sidearmMelee:   ov.sidearmMelee   ?? false,
      sidearmRanged:  ov.sidearmRanged  ?? false,
    };
  }, [aggregatedKeywords, store.builderKeywordOverrides]);

  return (
    <>
      <UpgradeSlotsSection
        selectedPresetId={store.selectedPresetId}
        effectiveUpgradeBar={store.effectiveUpgradeBar}
        upgradeBar={store.upgradeBar}
        equippedUpgradeIds={store.equippedUpgradeIds}
        equipUpgrade={store.equipUpgrade}
        unitApiId={store.unitApiId ?? undefined}
        selectedFaction={store.selectedFaction}
        selectedUnitRank={store.selectedUnitRank}
        selectedUnitType={store.selectedUnitType}
        selectedUnitAffiliation={store.selectedUnitAffiliation}
      />

      <SectionHeader title="Weapons">
        <div className="space-y-2 text-sm text-gray-400">
          {displayWeapons.length === 0 ? (
            <p>No weapons loaded. Select a preset to populate this list.</p>
          ) : (
            displayWeapons.map((weapon) => {
              const isActive = weapon.count > 0;
              return (
                <div
                  key={weapon.name}
                  className={`rounded border px-3 py-2 ${
                    isActive
                      ? 'border-gray-700'
                      : 'border-gray-800 bg-gray-950/60 text-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isSingleMini ? (
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) =>
                            store.setWeaponMiniCount(
                              weapon.name,
                              e.target.checked ? 1 : 0,
                            )
                          }
                          disabled={weapon.minCount > 0}
                          className="h-4 w-4 rounded border-gray-600 bg-gray-800
                                     text-blue-600 focus:ring-2 focus:ring-blue-500
                                     focus:ring-offset-0"
                        />
                      ) : (
                        <NumberSpinner
                          value={weapon.count}
                          onChange={(v) => store.setWeaponMiniCount(weapon.name, v)}
                          min={weapon.minCount}
                          max={weapon.maxCount}
                          compact
                        />
                      )}
                      <span>{weapon.name}</span>
                    </div>
                    <DiceIconDisplay
                      redDice={weapon.redDice}
                      blackDice={weapon.blackDice}
                      whiteDice={weapon.whiteDice}
                    />
                  </div>
                  {(() => {
                    const kwLabels = formatWeaponKeywords(weapon.keywords);
                    return kwLabels.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {kwLabels.map((label) => (
                          <span
                            key={label}
                            className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              );
            })
          )}
        </div>
      </SectionHeader>

      <AttackerTokensSection />

      <SectionHeader title="Weapon Keywords">
        <WeaponKeywordsSection
          keywords={mergedKeywords}
          onKeywordChange={(key, value) => store.setBuilderKeywordOverride(key, value)}
          isKeywordDisabled={isWeaponDisabled}
        />
      </SectionHeader>

      <AttackerUnitKeywordsSection />
    </>
  );
}
