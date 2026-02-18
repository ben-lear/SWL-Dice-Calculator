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
  'Immune: Blast': 'immuneBlast',  'Immune: Melee': 'immuneMelee',  'Impervious': 'impervious',
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

/**
 * Maps keyword names to display keyword field names.
 * Used for unit/upgrade keywords that are not combat-relevant
 * but should be resolved to canonical field names for display/tagging.
 */
export const DISPLAY_KEYWORD_FIELD_MAP: Record<string, string> = {
  // Boolean — with enrichment examples
  'Charge': 'charge',
  'Dauntless': 'dauntless',
  'Reconfigure': 'reconfigure',
  'Cycle': 'cycle',
  'Cunning': 'cunning',
  'Allies of Convenience': 'alliesOfConvenience',
  'Exemplar': 'exemplar',
  'Prepared Position': 'preparedPosition',
  'Indomitable': 'indomitable',
  'Spur': 'spur',
  '\u27a6Quick Thinking': 'quickThinking',
  'Infiltrate': 'infiltrate',
  'Relentless': 'relentless',

  // Numeric — with enrichment examples
  'Tactical X': 'tacticalX',
  'Demoralize': 'demoralizeX',
  'Inspire': 'inspireX',
  'Target': 'targetX',
  '\u27a6Spotter': 'spotterX',
  '\u27a6Bolster': 'bolsterX',
  'Strategize': 'strategizeX',
  'Recharge': 'rechargeX',

  // String — with enrichment examples
  'Aid': 'aid',
  'Direct': 'direct',

  // Boolean — no enrichment examples
  'Nimble': 'nimble',
  'Gunslinger': 'gunslinger',
  'Fire Support': 'fireSupport',
  'Barrage': 'barrage',
  'Ataru Mastery': 'ataruMastery',
  'Juyo Mastery': 'juyoMastery',
  'Steady': 'steady',
  'Disengage': 'disengage',
  'Scale': 'scale',
  'Covert Ops': 'covertOps',
  'Incognito': 'incognito',
  'Loadout': 'loadout',
  'Sentinel': 'sentinel',
  'Stationary': 'stationary',
  'Full Pivot': 'fullPivot',
  'Climbing Vehicle': 'climbingVehicle',
  'Expert Climber': 'expertClimber',
  'Unhindered': 'unhindered',
  'Plodding': 'plodding',
  'Grounded': 'grounded',
  'Reposition': 'reposition',
  'Attack Run': 'attackRun',
  'Authoritative': 'authoritative',
  'Bounty': 'bounty',
  'Cache': 'cache',
  '\u27a6Calculate Odds': 'calculateOdds',
  'Compel': 'compel',
  'Detachment': 'detachment',
  'Disgraced': 'disgraced',
  'Distract': 'distract',
  'Divine Influence': 'divineInfluence',
  'Divulge': 'divulge',
  'Faulty Equipment': 'faultyEquipment',
  'Field Commander': 'fieldCommander',
  'Flawed': 'flawed',
  'Guidance': 'guidance',
  'Heavy Weapon Team': 'heavyWeaponTeam',
  'Hunted': 'hunted',
  "I'm Part of the Squad Too": 'imPartOfTheSquadToo',
  'Inconspicuous': 'inconspicuous',
  'Insecure': 'insecure',
  'Interrogate': 'interrogate',
  'Latent Power': 'latentPower',
  'Leader': 'leader',
  'Master Storyteller': 'masterStoryteller',
  'Mobile': 'mobile',
  'My Mood is Based On Profit': 'myMoodIsBasedOnProfit',
  'Noncombatant': 'noncombatantKeyword',
  'One Step Ahead': 'oneStepAhead',
  'Override': 'overrideKeyword',
  'Permanent': 'permanent',
  'Programmed': 'programmed',
  '\u27a6Pulling the Strings': 'pullingTheStrings',
  'Reinforcements': 'reinforcements',
  'Restore': 'restore',
  'Ruthless': 'ruthless',
  'Secret Mission': 'secretMission',
  'Self-Preservation': 'selfPreservation',
  'Small': 'small',
  'Smoke Tokens': 'smokeTokens',
  'Tempted': 'tempted',
  'Unconcerned': 'unconcerned',
  'Unstoppable': 'unstoppable',
  'Weighed Down': 'weighedDown',
  "We're Not Regs": 'wereNotRegs',
  'Wheel Mode': 'wheelMode',
  'Immune: Enemy Effects': 'immuneEnemyEffects',
  'Immune: Range 1 Weapons': 'immuneRange1Weapons',

  // Numeric — no enrichment examples
  'Agile': 'agileX',
  'Reliable': 'reliableX',
  'Scout X': 'scoutX',
  'Jump': 'jumpX',
  'Speeder': 'speederX',
  'Enrage': 'enrageX',
  'Regenerate': 'regenerateX',
  'Master of the Force': 'masterOfTheForceX',
  'Observe': 'observeX',
  'Contingencies': 'contingenciesX',
  'Command Vehicle X': 'commandVehicleX',
  'Defend': 'defendX',
  'Disciplined': 'disciplinedX',
  'Flexible Response X': 'flexibleResponseX',
  'Generator': 'generatorX',
  'Ready': 'readyX',
  'Scouting Party': 'scoutingPartyX',
  'Smoke': 'smokeX',
  '\u27a6Take Cover': 'takeCoverX',
  'Wound': 'woundX',
  'Advanced Targeting: X': 'advancedTargetingX',
  'Light Transport X: Open': 'lightTransportX',

  // String/parameterized — no enrichment examples
  'AI: Action': 'ai',
  'AI: Attack': 'ai',
  'AI: Attack, Move': 'ai',
  'AI: Dodge, Move': 'ai',
  'AI: Move': 'ai',
  'Aid: Pyke Syndicate': 'aid',
  'Associate: Unit Name': 'associate',
  'Coordinate: Droid Trooper': 'coordinate',
  'Coordinate: Emplacement Trooper': 'coordinate',
  'Coordinate: Unit Name/Unit Type': 'coordinate',
  'Coordinate: Vehicle': 'coordinate',
  'Direct: ;r2 Clone Trooper Unit': 'direct',
  'Direct: ;r2 Droid Trooper Unit': 'direct',
  'Entourage': 'entourage',
  'Entourage: Imperial Death Troopers': 'entourage',
  'Entourage: Imperial Royal Guards': 'entourage',
  'Equip': 'equip',
  'Equip: Del Meeko, Gideon Hask': 'equip',
  'Equip: Tristan Wren, Ursa Wren': 'equip',
  'Hover: Air X': 'hover',
  'Hover: Ground': 'hover',
  'Independent: Token X/Action': 'independent',
  'Mercenary: Faction': 'mercenary',
  'Repair 1: Capacity 2': 'repair',
  'Repair 2: Capacity 2': 'repair',
  'Repair X: Capacity Y': 'repair',
  'Retinue': 'retinue',
  'Retinue: Iden Versio': 'retinue',
  'Retinue: Sabine Wren': 'retinue',
  'Special Issue: Battle Force': 'specialIssue',
  'Teamwork: Cassian Andor': 'teamwork',
  'Teamwork: Han Solo': 'teamwork',
  'Teamwork: Unit Name': 'teamwork',
  'Transport': 'transport',
  'Transport X: Open': 'transport',
  'Treat X: Capacity Y': 'treat',
};