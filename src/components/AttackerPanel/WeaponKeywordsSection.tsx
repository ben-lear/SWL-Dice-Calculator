import type { WeaponKeywords } from '../../engine/types';
import NumberSpinner from '../shared/NumberSpinner';
import Checkbox from '../shared/Checkbox';

interface WeaponKeywordsSectionProps {
  keywords: Partial<WeaponKeywords>;
  /** If omitted, all controls are rendered as read-only (disabled). */
  onKeywordChange?: (key: keyof WeaponKeywords, value: number | boolean) => void;
  /** Per-keyword disable predicate (e.g. from useWeaponKeywordDisabled). */
  isKeywordDisabled?: (key: string) => boolean;
}

export default function WeaponKeywordsSection({
  keywords,
  onKeywordChange,
  isKeywordDisabled,
}: WeaponKeywordsSectionProps) {
  const allDisabled = !onKeywordChange;
  const isDisabled = (key: string) =>
    allDisabled || (isKeywordDisabled ? isKeywordDisabled(key) : false);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
        <NumberSpinner
          label="Critical X"
          value={keywords.criticalX ?? 0}
          onChange={(value) => onKeywordChange?.('criticalX', value)}
          min={0}
          max={99}
          compact
          disabled={isDisabled('criticalX')}
          tooltip="Convert the first X attack surge results into critical hits. Remaining surges still convert via the surge chart."
        />
        <NumberSpinner
          label="Lethal X"
          value={keywords.lethalX ?? 0}
          onChange={(value) => onKeywordChange?.('lethalX', value)}
          min={0}
          max={99}
          compact
          disabled={isDisabled('lethalX')}
          tooltip="Spend unspent aim tokens (up to X) to gain Pierce 1 per token. Aims spent this way cannot be used for rerolling."
        />
        <NumberSpinner
          label="Pierce X"
          value={keywords.pierceX ?? 0}
          onChange={(value) => onKeywordChange?.('pierceX', value)}
          min={0}
          max={99}
          compact
          disabled={isDisabled('pierceX')}
          tooltip="Cancel X of the defender's block results after defense dice are rolled."
        />
        <NumberSpinner
          label="Impact X"
          value={keywords.impactX ?? 0}
          onChange={(value) => onKeywordChange?.('impactX', value)}
          min={0}
          max={99}
          compact
          disabled={isDisabled('impactX')}
          tooltip="Convert up to X hit results into critical hits when attacking a unit with the Armor keyword."
        />
        <NumberSpinner
          label="Ram X"
          value={keywords.ramX ?? 0}
          onChange={(value) => onKeywordChange?.('ramX', value)}
          min={0}
          max={99}
          compact
          disabled={isDisabled('ramX')}
          tooltip="While performing a melee or overrun attack, convert up to X attack die results (blanks first, then hits) into critical hits."
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Checkbox
          label="Blast"
          value={keywords.blast ?? false}
          onChange={(value) => onKeywordChange?.('blast', value)}
          disabled={isDisabled('blast')}
          tooltip="This weapon ignores all cover when attacking."
        />
        <Checkbox
          label="Suppressive"
          value={keywords.suppressive ?? false}
          onChange={(value) => onKeywordChange?.('suppressive', value)}
          disabled={isDisabled('suppressive')}
          tooltip="This weapon applies 1 additional suppression token to the defender beyond the normal amount."
        />
        <Checkbox
          label="High Velocity"
          value={keywords.highVelocity ?? false}
          onChange={(value) => onKeywordChange?.('highVelocity', value)}
          disabled={isDisabled('highVelocity')}
          tooltip="The defender cannot spend dodge tokens when defending against this weapon."
        />
        <Checkbox
          label="Spray"
          value={keywords.spray ?? false}
          onChange={(value) => onKeywordChange?.('spray', value)}
          disabled={isDisabled('spray')}
          tooltip="This weapon's dice are added once per defending miniature in line of sight, multiplying its contribution to the attack pool."
        />
        <Checkbox
          label="Immune: Deflect"
          value={keywords.immuneDeflect ?? false}
          onChange={(value) => onKeywordChange?.('immuneDeflect', value)}
          disabled={isDisabled('immuneDeflect')}
          tooltip="This attack pool cannot suffer wounds from the Deflect keyword."
        />
        <Checkbox
          label="Primitive"
          value={keywords.primitive ?? false}
          onChange={(value) => onKeywordChange?.('primitive', value)}
          disabled={isDisabled('primitive')}
          tooltip="When attacking a unit with Armor X, after resolving Impact X, all crit results become hit results."
        />
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
        <NumberSpinner
          label="Ion X"
          value={keywords.ionX ?? 0}
          onChange={(value) => onKeywordChange?.('ionX', value)}
          min={0}
          max={99}
          compact
          disabled={isDisabled('ionX')}
          tooltip="At the start of Modify Attack Dice, flip up to X of the defender's active Shield tokens per hit/crit result, reducing shields available."
        />
      </div>
    </div>
  );
}
