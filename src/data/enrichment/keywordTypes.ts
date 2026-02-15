/**
 * Typed keyword interfaces for enrichment data.
 * 
 * These types ensure that enrichment files only use keywords that are actually
 * supported by the combat engine. All fields are optional (Partial) because
 * enrichment is additive — you only specify what you need to override/add.
 * 
 * Phase 5.5: Type-safe enrichment keywords
 */

/** Placeholder used for magnitude keywords that require manual curation. */
export type NeedHumanValue = '<need human>';

/** Numeric enrichment values can be concrete numbers or human placeholders. */
export type EnrichmentNumericValue = number | NeedHumanValue;

// ============================================================================
// Weapon Keywords (for weapon profiles)
// ============================================================================

/**
 * Keywords that can be specified on weapon profiles in enrichment data.
 * All fields are optional — enrich only what's needed.
 * 
 * Use these for weapon.keywords in UnitEnrichment weapon profiles.
 */
export interface EnrichmentWeaponKeywords {
  pierceX?: EnrichmentNumericValue;
  impactX?: EnrichmentNumericValue;
  criticalX?: EnrichmentNumericValue;
  lethalX?: EnrichmentNumericValue;
  ramX?: EnrichmentNumericValue;
  blast?: boolean;
  suppressive?: boolean;
  highVelocity?: boolean;
  spray?: boolean;
  antiMaterielX?: EnrichmentNumericValue;
  antiPersonnelX?: EnrichmentNumericValue;
  cumbersome?: boolean;
}

// ============================================================================
// Unit-Level Attacker Keywords
// ============================================================================

/**
 * Attacker-side unit keywords that can be specified in enrichment data.
 * All fields are optional — enrich only what's needed.
 * 
 * Use these for unit-level keywords in attacker UnitEnrichment.
 */
export interface AttackerUnitKeywords {
  // Numeric keywords
  preciseX?: EnrichmentNumericValue;
  sharpshooterX?: EnrichmentNumericValue;

  // Boolean keywords
  marksman?: boolean;
  jediHunter?: boolean;
  jarKaiMastery?: boolean;
  duelistAttacker?: boolean;
  makashiMastery?: boolean;
  immuneDeflect?: boolean;
  deathFromAbove?: boolean;
  holdTheLine?: boolean;
}

// ============================================================================
// Unit-Level Defender Keywords
// ============================================================================

/**
 * Defender-side unit keywords that can be specified in enrichment data.
 * All fields are optional — enrich only what's needed.
 * 
 * Use these for unit-level keywords in defender UnitEnrichment.
 */
export interface DefenderUnitKeywords {
  // Numeric keywords
  armorX?: EnrichmentNumericValue;
  weakPointX?: EnrichmentNumericValue;
  dangerSenseX?: EnrichmentNumericValue;
  uncannyLuckX?: EnrichmentNumericValue;
  shieldedX?: EnrichmentNumericValue;
  guardianX?: EnrichmentNumericValue;
  coverX?: EnrichmentNumericValue;

  // Boolean keywords
  immunePierce?: boolean;
  immuneMeleePierce?: boolean;
  immuneBlast?: boolean;
  impervious?: boolean;
  block?: boolean;
  deflect?: boolean;
  shienMastery?: boolean;
  outmaneuver?: boolean;
  lowProfile?: boolean;
  djemSoMastery?: boolean;
  soresuMastery?: boolean;
  duelistDefender?: boolean;
  backup?: boolean;
  holdTheLine?: boolean;
  dugIn?: boolean;
}

// ============================================================================
// Combined Unit Keywords (for enrichment that doesn't distinguish side)
// ============================================================================

/**
 * Combined attacker and defender keywords for unit-level enrichment.
 * Allows specifying keywords that could apply to either attacking or defending.
 * 
 * Use this in UnitEnrichment.keywords when the unit could be both attacker/defender.
 */
export type UnitKeywords = AttackerUnitKeywords & DefenderUnitKeywords;

// ============================================================================
// Upgrade Keywords
// ============================================================================

/**
 * Keywords that upgrades can grant. Upgrades can grant weapon keywords,
 * attacker keywords, or defender keywords depending on the upgrade type.
 * 
 * Use this in UpgradeEnrichment.keywords.
 */
export type UpgradeKeywords = EnrichmentWeaponKeywords & UnitKeywords;
