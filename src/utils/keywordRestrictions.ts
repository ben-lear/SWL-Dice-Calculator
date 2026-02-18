import { AttackType } from '../engine/types';

// ============================================================================
// Keyword Attack-Type Restrictions
// ============================================================================

/**
 * Maps keyword field names to their attack-type restriction.
 * - 'all': active for all attack types (no restriction)
 * - 'ranged': active only for Ranged attacks
 * - 'melee': active only for Melee attacks
 * - 'ranged-melee': active for Ranged and Melee (disabled for Overrun)
 *
 * Fields not listed here are unrestricted ('all').
 *
 * Note: AttackType.Hybrid exists in the enum but is not user-selectable
 * in the UI — it is treated as unrestricted (all keywords enabled).
 */
export type KeywordRestriction = 'all' | 'ranged' | 'melee' | 'ranged-melee' | 'melee-overrun';

// ── Attacker Unit-Level Keywords ──
// These are fields on AttackConfigStore (set via store.setField()).

export const ATTACKER_KEYWORD_RESTRICTIONS: Record<string, KeywordRestriction> = {
  // Unrestricted (all attack types)
  surgeChart: 'all',
  aimTokens: 'all',
  surgeTokens: 'all',
  observationTokens: 'all',
  dodgeTokensAttacker: 'all',
  preciseX: 'all',
  arsenalX: 'all',
  marksman: 'all',
  marksmanStrategy: 'all',
  rerollStrategy: 'all',
  jediHunter: 'all',
  unitCost: 'all',

  // Ranged-only attacker unit keywords
  sharpshooterX: 'ranged',     // Reduces cover (cover is ranged-only concept)
  deathFromAbove: 'ranged',    // Cover interaction (ranged context)

  // Melee-only attacker unit keywords
  duelistAttacker: 'melee',    // Melee: spend Aim → Pierce 1
  makashiMastery: 'melee',     // Melee: reduce Pierce to disable Immune: Pierce
  jarKaiMastery: 'melee',      // Melee: spend attacker Dodge tokens for blank→hit, hit→crit
  holdTheLine: 'melee',        // While Engaged — attacker can only be engaged in Melee
  completeTheMission: 'all',   // CTM: adds Critical 2 near Priority Mission Token
};

// ── Attacker Weapon-Level Keywords ──
// These are fields on WeaponKeywords (set via store.setWeaponKeyword()).
// The field names here match the keys on the WeaponKeywords interface.

export const WEAPON_KEYWORD_RESTRICTIONS: Record<string, KeywordRestriction> = {
  // Unrestricted (aggregated across weapons, no attack-type restriction)
  criticalX: 'all',
  lethalX: 'all',
  pierceX: 'all',
  impactX: 'all',
  ramX: 'melee-overrun',     // Ram X only applies during Melee/Overrun attacks (per rulebook)
  blast: 'all',
  suppressive: 'all',
  spray: 'all',
  antiMaterielX: 'all',
  antiPersonnelX: 'all',
  cumbersome: 'all',

  // Ranged-only weapon keyword (AND-aggregated across weapons)
  highVelocity: 'ranged',      // Disables dodge/deflect (ranged-only interaction)

  // Ranged-only weapon keywords
  immuneDeflect: 'ranged',     // Deflect is ranged-only
  ionX: 'ranged',              // Shield interaction (Ranged only)
};

// ── Defender Keywords ──
// These are fields on DefenseConfigStore (set via store.setField()).

export const DEFENDER_KEYWORD_RESTRICTIONS: Record<string, KeywordRestriction> = {
  // Unrestricted (all attack types)
  dieColor: 'all',
  surgeChart: 'all',
  disableDefenseDice: 'all',
  dodgeTokens: 'all',            // Dodge can be spent in all attack types (HV check is separate)
  surgeTokens: 'all',
  suppressionTokens: 'all',
  minisInLOS: 'all',
  armorX: 'all',
  weakPointX: 'all',
  immunePierce: 'all',
  immuneBlast: 'all',
  impervious: 'all',
  dangerSenseX: 'all',
  uncannyLuckX: 'all',
  block: 'all',
  outmaneuver: 'all',
  unitCost: 'all',

  // Ranged+Melee (disabled for Overrun only)
  holdTheLine: 'ranged-melee',

  // Ranged-only defender keywords (cover/guardian/shielded ecosystem)
  coverType: 'ranged',         // Cover only applies to ranged attacks
  coverX: 'ranged',            // Cover X increases cover vs Ranged
  smokeTokens: 'ranged',       // Smoke improves cover
  suppressed: 'ranged',        // Suppressed improves cover
  lowProfile: 'ranged',        // Modifies cover pool roll (cover is ranged-only)
  dugIn: 'ranged',             // Red cover dice (cover pools are ranged-only)

  guardianX: 'ranged',         // Guardian only works vs Ranged attacks
  guardianDieColor: 'ranged',  // Guardian sub-config (shown only when Guardian X > 0)
  guardianSurgeChart: 'ranged', // Guardian sub-config
  guardianDeflect: 'ranged',   // Guardian unit's Deflect (ranged-only)
  guardianSoresuMastery: 'ranged', // Guardian unit's Soresu Mastery
  guardianDodgeTokens: 'ranged',   // Guardian unit's Dodge tokens

  deflect: 'ranged',           // Deflect: gains surge→block vs Ranged
  shienMastery: 'ranged',      // Modifies Deflect (ranged-only)
  soresuMastery: 'ranged',     // Reroll all defense dice (Ranged only)
  backup: 'ranged',            // Cancel up to 2 hits (Ranged only)
  shieldedX: 'ranged',         // Shielded cancels hits/crits (Ranged attacks only)

  // Melee-only defender keywords
  djemSoMastery: 'melee',      // Melee: attacker suffers wounds per blank
  duelistDefender: 'melee',    // Melee: Dodge → Immune: Pierce
  immuneMeleePierce: 'melee',  // Melee-only Immune: Pierce
  immuneMelee: 'melee',        // Immune: Melee — attack is impossible in melee
  completeTheMission: 'all',   // CTM: surge→block near Priority Mission Token
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine if a keyword field is active (should be enabled in the UI)
 * for the current attack type.
 *
 * When attackType is 'overrun', only unrestricted keywords are active.
 * When attackType is 'hybrid', all keywords are active (Hybrid is not
 * user-selectable but exists in the enum).
 */
export function isFieldActiveForAttackType(
  restriction: KeywordRestriction,
  attackType: AttackType,
): boolean {
  if (restriction === 'all') return true;

  // Hybrid is treated as unrestricted (all keywords enabled)
  if (attackType === AttackType.Hybrid) return true;

  switch (restriction) {
    case 'ranged':
      return attackType === AttackType.Ranged;
    case 'melee':
      return attackType === AttackType.Melee;
    case 'ranged-melee':
      return attackType === AttackType.Ranged || attackType === AttackType.Melee;
    case 'melee-overrun':
      return attackType === AttackType.Melee || attackType === AttackType.Overrun;
    default:
      return true;
  }
}
