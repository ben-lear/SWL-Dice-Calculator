/**
 * Keyword mapping utilities for runtime access to keyword data
 * Phase 5.5A.4: Create keyword map from processed API data
 */

import keywordsData from './processed/keywords.json';

export interface KeywordInfo {
  id: string;
  name: string;
  hasMagnitude: boolean;
  isWeaponKeyword: boolean;
}

export type KeywordMap = Map<string, KeywordInfo>;

/**
 * Create a Map for fast keyword lookups by name
 */
function createKeywordMap(): KeywordMap {
  const keywordMap = new Map<string, KeywordInfo>();
  
  for (const keyword of keywordsData) {
    keywordMap.set(keyword.name, keyword);
  }
  
  return keywordMap;
}

/**
 * Singleton keyword map for efficient runtime access
 */
export const KEYWORD_MAP: KeywordMap = createKeywordMap();

/**
 * Get keyword info by name
 * @param name - The keyword name to lookup
 * @returns KeywordInfo if found, undefined otherwise
 */
export function getKeyword(name: string): KeywordInfo | undefined {
  return KEYWORD_MAP.get(name);
}

/**
 * Check if a keyword exists in the data
 * @param name - The keyword name to check
 * @returns true if keyword exists, false otherwise
 */
export function hasKeyword(name: string): boolean {
  return KEYWORD_MAP.has(name);
}

/**
 * Get all keywords that have magnitude (variable values)
 * @returns Array of KeywordInfo for keywords with magnitude
 */
export function getMagnitudeKeywords(): KeywordInfo[] {
  return Array.from(KEYWORD_MAP.values()).filter(keyword => keyword.hasMagnitude);
}

/**
 * Get all weapon keywords
 * @returns Array of KeywordInfo for weapon-specific keywords
 */
export function getWeaponKeywords(): KeywordInfo[] {
  return Array.from(KEYWORD_MAP.values()).filter(keyword => keyword.isWeaponKeyword);
}

/**
 * Get keywords by category for UI/filtering purposes
 */
export function getKeywordsByCategory() {
  const all = Array.from(KEYWORD_MAP.values());
  
  return {
    all,
    withMagnitude: all.filter(k => k.hasMagnitude),
    weaponKeywords: all.filter(k => k.isWeaponKeyword),
    unitKeywords: all.filter(k => !k.isWeaponKeyword),
    fixedKeywords: all.filter(k => !k.hasMagnitude)
  };
}

/**
 * Debug utility: get keyword statistics
 */
export function getKeywordStats() {
  const categories = getKeywordsByCategory();
  
  return {
    total: categories.all.length,
    withMagnitude: categories.withMagnitude.length,
    weaponKeywords: categories.weaponKeywords.length,
    unitKeywords: categories.unitKeywords.length,
    fixedKeywords: categories.fixedKeywords.length
  };
}

// ============================================================================
// Keyword → Field Mappings for Preset Generation
// ============================================================================

/**
 * Maps keyword names to attacker config field names.
 * Used by preset generator and upgrade applicator to convert
 * enriched keyword data to actual store fields.
 */
export const ATTACKER_KEYWORD_FIELD_MAP: Record<string, string> = {
  // Numeric Keywords
  'Precise': 'preciseX',
  'Sharpshooter': 'sharpshooterX',
  'Arsenal': 'arsenalX',
  'Arsenal X': 'arsenalX',
  
  // Boolean Keywords
  'Marksman': 'marksman',
  'Jedi Hunter': 'jediHunter',
  'Jar\'Kai Mastery': 'jarKaiMastery',
  'Duelist': 'duelistAttacker', // Special mapping for attacker side
  'Makashi Mastery': 'makashiMastery',
  'Death from Above': 'deathFromAbove',
  'Hold the Line': 'holdTheLine',
};

/**
 * Maps keyword names to defender config field names.
 * Used by preset generator and upgrade applicator to convert
 * enriched keyword data to actual store fields.
 */
export const DEFENDER_KEYWORD_FIELD_MAP: Record<string, string> = {
  // Numeric Keywords
  'Armor': 'armorX',
  'Armor [X]': 'armorX',
  'Weak Point': 'weakPointX',
  'Danger Sense': 'dangerSenseX',
  'Uncanny Luck': 'uncannyLuckX', 
  'Shielded': 'shieldedX',
  'Guardian': 'guardianX',
  'Cover': 'coverX',
  
  // Boolean Keywords
  'Immune: Pierce': 'immunePierce',
  'Immune: Melee Pierce': 'immuneMeleePierce',
  'Immune: Blast': 'immuneBlast',
  'Impervious': 'impervious',
  'Block': 'block',
  'Deflect': 'deflect',
  'Shien Mastery': 'shienMastery',
  'Outmaneuver': 'outmaneuver',
  'Low Profile': 'lowProfile',
  'Djem So Mastery': 'djemSoMastery',
  'Soresu Mastery': 'soresuMastery',
  'Duelist': 'duelistDefender', // Special mapping for defender side
  'Backup': 'backup',
  'Hold the Line': 'holdTheLine',
  'Dug In': 'dugIn',
};

/**
 * Helper function to check if a keyword requires magnitude (X value)
 */
export function hasMagnitude(keywordName: string): boolean {
  const keyword = getKeyword(keywordName);
  return keyword?.hasMagnitude ?? false;
}