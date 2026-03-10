/**
 * Backfill enrichment files with missing API keywords.
 *
 * This script additively patches existing enrichment entries with keywords
 * detected from the API that are not yet present in the enrichment data.
 *
 * Rules:
 * - ADDITIVE ONLY — never overwrite existing values, never remove fields
 * - Boolean keywords → true
 * - Numeric (X) keywords → '<need human>'
 * - String (parameterized) keywords → '<need human>'
 * - exhaust/expend are card mechanics with no API keyword ID — not auto-populated
 * - Weapon keywords go to weapons on units, keyword block on upgrades
 *
 * Usage:
 *   npx tsx scripts/backfillEnrichmentKeywords.ts           # apply changes
 *   npx tsx scripts/backfillEnrichmentKeywords.ts --dry-run  # preview only
 */

import * as fs from 'node:fs';

// ============================================================================
// Types
// ============================================================================

type ProcessedUnit = {
  id: string;
  apiId: number;
  name: string;
  keywordNames: string[];
};

type ProcessedUpgrade = {
  id: string;
  apiId: number;
  name: string;
  keywordNames: string[];
  upgradeSlot: string;
};

type ProcessedKeyword = {
  id: string;
  name: string;
  hasMagnitude: boolean;
  isWeaponKeyword: boolean;
};

// ============================================================================
// Keyword Maps (mirrors of the runtime/skeleton maps)
// ============================================================================

const ATTACKER_KEYWORD_MAP: Record<string, string | string[]> = {
  Precise: 'preciseX',
  Sharpshooter: 'sharpshooterX',
  Arsenal: 'arsenalX',
  'Arsenal X': 'arsenalX',
  Marksman: 'marksman',
  'Jedi Hunter': 'jediHunter',
  "Jar'Kai Mastery": 'jarKaiMastery',
  Duelist: ['duelistAttacker', 'duelistDefender'],
  'Makashi Mastery': 'makashiMastery',
  'Death from Above': 'deathFromAbove',
  'Death From Above': 'deathFromAbove',
  'Hold the Line': 'holdTheLine',
  'Complete the Mission': 'completeTheMission',
};

const DEFENDER_KEYWORD_MAP: Record<string, string | string[]> = {
  Armor: 'armorX',
  'Armor [X]': 'armorX',
  'Armor X': 'armorX',
  'Weak Point': 'weakPointX',
  'Danger Sense': 'dangerSenseX',
  'Uncanny Luck': 'uncannyLuckX',
  Shielded: 'shieldedX',
  Guardian: 'guardianX',
  Cover: 'coverX',
  'Immune: Pierce': 'immunePierce',
  'Immune: Melee Pierce': 'immuneMeleePierce',
  'Immune: Blast': 'immuneBlast',
  'Immune: Melee': 'immuneMelee',
  Impervious: 'impervious',
  Block: 'block',
  Deflect: 'deflect',
  'Shien Mastery': 'shienMastery',
  Outmaneuver: 'outmaneuver',
  'Low Profile': 'lowProfile',
  'Djem So Mastery': 'djemSoMastery',
  'Soresu Mastery': 'soresuMastery',
  Backup: 'backup',
  'Dug In': 'dugIn',
};

const WEAPON_KEYWORD_MAP: Record<string, string> = {
  Pierce: 'pierceX',
  'Pierce X': 'pierceX',
  Impact: 'impactX',
  'Impact X': 'impactX',
  Critical: 'criticalX',
  'Critical X': 'criticalX',
  Lethal: 'lethalX',
  'Lethal X': 'lethalX',
  Ram: 'ramX',
  'Ram X': 'ramX',
  Blast: 'blast',
  Suppressive: 'suppressive',
  'High Velocity': 'highVelocity',
  Spray: 'spray',
  'Anti-Materiel': 'antiMaterielX',
  'Anti-Personnel': 'antiPersonnelX',
  Cumbersome: 'cumbersome',
  'Immune: Deflect': 'immuneDeflect',
  Ion: 'ionX',
  'Ion X': 'ionX',
  Primitive: 'primitive',
};

const DISPLAY_WEAPON_KEYWORD_MAP: Record<string, string> = {
  'Long Shot': 'longshot',
  Scatter: 'scatter',
  'Immobilize X': 'immobilizeX',
  'Overrun X': 'overrunX',
  'Area Weapon': 'areaWeapon',
  'Beam X': 'beamX',
  'Poison X': 'poisonX',
  'Self-Destruct X': 'selfDestructX',
  'Tow Cable': 'towCable',
  Versatile: 'versatile',
  'Fixed: Front/Rear': 'fixed',
  'Arm X: Charge Token Type': 'armX',
  'Detonate X: (Charge Type)': 'detonateX',
};

const DISPLAY_UNIT_KEYWORD_MAP: Record<string, string> = {
  Charge: 'charge',
  Dauntless: 'dauntless',
  Reconfigure: 'reconfigure',
  Cycle: 'cycle',
  Cunning: 'cunning',
  'Allies of Convenience': 'alliesOfConvenience',
  Exemplar: 'exemplar',
  'Prepared Position': 'preparedPosition',
  Indomitable: 'indomitable',
  Spur: 'spur',
  '\u27a6Quick Thinking': 'quickThinking',
  Infiltrate: 'infiltrate',
  Relentless: 'relentless',
  'Tactical X': 'tacticalX',
  Demoralize: 'demoralizeX',
  Inspire: 'inspireX',
  Target: 'targetX',
  '\u27a6Spotter': 'spotterX',
  '\u27a6Bolster': 'bolsterX',
  Strategize: 'strategizeX',
  Recharge: 'rechargeX',
  Aid: 'aid',
  Direct: 'direct',
  Nimble: 'nimble',
  Gunslinger: 'gunslinger',
  'Fire Support': 'fireSupport',
  Barrage: 'barrage',
  'Ataru Mastery': 'ataruMastery',
  'Juyo Mastery': 'juyoMastery',
  Steady: 'steady',
  Disengage: 'disengage',
  Scale: 'scale',
  'Covert Ops': 'covertOps',
  Incognito: 'incognito',
  Loadout: 'loadout',
  Sentinel: 'sentinel',
  Stationary: 'stationary',
  'Full Pivot': 'fullPivot',
  'Climbing Vehicle': 'climbingVehicle',
  'Expert Climber': 'expertClimber',
  Unhindered: 'unhindered',
  Plodding: 'plodding',
  Grounded: 'grounded',
  Reposition: 'reposition',
  'Attack Run': 'attackRun',
  Authoritative: 'authoritative',
  Bounty: 'bounty',
  // Cache is skipped — API keyword maps to cacheSurgeX/cacheDodgeX/cacheAimX which require human curation
  '\u27a6Calculate Odds': 'calculateOdds',
  Compel: 'compel',
  Detachment: 'detachment',
  Disgraced: 'disgraced',
  Distract: 'distract',
  'Divine Influence': 'divineInfluence',
  Divulge: 'divulge',
  'Faulty Equipment': 'faultyEquipment',
  'Field Commander': 'fieldCommander',
  Flawed: 'flawed',
  Guidance: 'guidance',
  'Heavy Weapon Team': 'heavyWeaponTeam',
  Hunted: 'hunted',
  "I'm Part of the Squad Too": 'imPartOfTheSquadToo',
  Inconspicuous: 'inconspicuous',
  Insecure: 'insecure',
  Interrogate: 'interrogate',
  'Latent Power': 'latentPower',
  Leader: 'leader',
  'Master Storyteller': 'masterStoryteller',
  Mobile: 'mobile',
  'My Mood is Based On Profit': 'myMoodIsBasedOnProfit',
  Noncombatant: 'noncombatantKeyword',
  'One Step Ahead': 'oneStepAhead',
  Override: 'overrideKeyword',
  Permanent: 'permanent',
  Programmed: 'programmed',
  '\u27a6Pulling the Strings': 'pullingTheStrings',
  Reinforcements: 'reinforcements',
  Restore: 'restore',
  Ruthless: 'ruthless',
  'Secret Mission': 'secretMission',
  'Self-Preservation': 'selfPreservation',
  Small: 'small',
  'Smoke Tokens': 'smokeTokens',
  Tempted: 'tempted',
  Unconcerned: 'unconcerned',
  Unstoppable: 'unstoppable',
  'Weighed Down': 'weighedDown',
  "We're Not Regs": 'wereNotRegs',
  'Wheel Mode': 'wheelMode',
  'Immune: Enemy Effects': 'immuneEnemyEffects',
  'Immune: Range 1 Weapons': 'immuneRange1Weapons',
  Agile: 'agileX',
  Reliable: 'reliableX',
  'Scout X': 'scoutX',
  Jump: 'jumpX',
  Speeder: 'speederX',
  Enrage: 'enrageX',
  Regenerate: 'regenerateX',
  'Master of the Force': 'masterOfTheForceX',
  Observe: 'observeX',
  Contingencies: 'contingenciesX',
  'Command Vehicle X': 'commandVehicleX',
  Defend: 'defendX',
  Disciplined: 'disciplinedX',
  'Flexible Response X': 'flexibleResponseX',
  Generator: 'generatorX',
  Ready: 'readyX',
  'Scouting Party': 'scoutingPartyX',
  Smoke: 'smokeX',
  '\u27a6Take Cover': 'takeCoverX',
  Wound: 'woundX',
  'Advanced Targeting: X': 'advancedTargetingX',
  'Light Transport X: Open': 'lightTransportX',
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
  Entourage: 'entourage',
  'Entourage: Imperial Death Troopers': 'entourage',
  'Entourage: Imperial Royal Guards': 'entourage',
  Equip: 'equip',
  'Equip: Del Meeko, Gideon Hask': 'equip',
  'Equip: Tristan Wren, Ursa Wren': 'equip',
  'Hover: Air X': 'hover',
  'Hover: Ground': 'hover',
  'Independent: Token X/Action': 'independent',
  'Mercenary: Faction': 'mercenary',
  'Repair 1: Capacity 2': 'repair',
  'Repair 2: Capacity 2': 'repair',
  'Repair X: Capacity Y': 'repair',
  Retinue: 'retinue',
  'Retinue: Iden Versio': 'retinue',
  'Retinue: Sabine Wren': 'retinue',
  'Special Issue: Battle Force': 'specialIssue',
  'Teamwork: Cassian Andor': 'teamwork',
  'Teamwork: Han Solo': 'teamwork',
  'Teamwork: Unit Name': 'teamwork',
  Transport: 'transport',
  'Transport X: Open': 'transport',
  'Treat X: Capacity Y': 'treat',
};

/** All keyword maps combined for lookup. */
const ALL_KEYWORD_MAP: Record<string, string | string[]> = {
  ...ATTACKER_KEYWORD_MAP,
  ...DEFENDER_KEYWORD_MAP,
  ...WEAPON_KEYWORD_MAP,
  ...DISPLAY_WEAPON_KEYWORD_MAP,
  ...DISPLAY_UNIT_KEYWORD_MAP,
};

/** Weapon keyword field names — for units, these go on weapon profiles, not the unit keywords block. */
const WEAPON_FIELDS = new Set<string>([
  ...Object.values(WEAPON_KEYWORD_MAP),
  ...Object.values(DISPLAY_WEAPON_KEYWORD_MAP),
]);

/** String-typed keyword fields (parameterized keywords). */
const STRING_KEYWORD_FIELDS = new Set<string>([
  'fixed', 'armX', 'detonateX',
  'coordinate', 'aid', 'direct', 'ai', 'entourage', 'equip', 'retinue',
  'teamwork', 'associate', 'independent', 'mercenary', 'specialIssue',
  'repair', 'treat', 'hover', 'transport',
]);

function isMagnitudeField(fieldName: string): boolean {
  return fieldName.endsWith('X');
}

function toFieldNames(v: string | string[]): string[] {
  return Array.isArray(v) ? v : [v];
}

function defaultValue(fieldName: string): string {
  if (STRING_KEYWORD_FIELDS.has(fieldName)) return "'<need human>'";
  if (isMagnitudeField(fieldName)) return "'<need human>'";
  return 'true';
}

// ============================================================================
// Load Data
// ============================================================================

const processedUnits = JSON.parse(
  fs.readFileSync('src/data/processed/units.json', 'utf-8'),
) as ProcessedUnit[];

const processedUpgrades = JSON.parse(
  fs.readFileSync('src/data/processed/upgrades.json', 'utf-8'),
) as ProcessedUpgrade[];

const processedKeywords = JSON.parse(
  fs.readFileSync('src/data/processed/keywords.json', 'utf-8'),
) as ProcessedKeyword[];

const keywordByName = new Map<string, ProcessedKeyword>();
for (const kw of processedKeywords) {
  keywordByName.set(kw.name, kw);
}

// ============================================================================
// Determine Missing Keywords
// ============================================================================

interface MissingKeywords {
  entryId: string;
  fields: Record<string, string>; // fieldName → default value string
}

// ============================================================================
// Depth-Aware Keyword Block Finder
// ============================================================================

/**
 * Find the top-level (unit/upgrade-level) `keywords: { ... }` block within an
 * entry. Uses brace-depth tracking so it skips weapon-level keyword blocks that
 * are nested inside `weapons: [{ keywords: { ... } }]`.
 *
 * The top-level keywords block sits at brace depth 1 inside the entry:
 *
 *   'entry-id': {                    // depth 0 → 1
 *     keywords: { ... },             // ← depth 1 (this is what we want)
 *     weapons: [
 *       { keywords: { ... } }        // ← depth 2+ (skip these)
 *     ]
 *   }
 *
 * Returns absolute positions into `source`, or null if no top-level keywords
 * block was found.
 */
function findTopLevelKeywordsBlock(
  source: string,
  entryOpenBraceEnd: number, // position right AFTER the opening { of the entry
): { contentStart: number; contentEnd: number } | null {
  let depth = 1; // we are inside the entry's opening {
  let i = entryOpenBraceEnd;

  while (i < source.length && depth > 0) {
    const ch = source[i];

    if (ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}') {
      depth--;
      if (depth === 0) break; // end of entry
      i++;
      continue;
    }

    // At depth 1 (top-level of the entry), look for `keywords` property
    if (depth === 1) {
      const kwMatch = /^keywords\s*:\s*\{/.exec(source.slice(i));
      if (kwMatch) {
        const contentStart = i + kwMatch[0].length; // right after the opening {

        // Find the matching closing }
        let blockDepth = 1;
        let j = contentStart;
        while (j < source.length && blockDepth > 0) {
          if (source[j] === '{') blockDepth++;
          else if (source[j] === '}') blockDepth--;
          j++;
        }
        return { contentStart, contentEnd: j - 1 };
      }
    }

    i++;
  }

  return null;
}

/**
 * Read an enrichment .ts file and extract the set of keyword field names
 * already present in the TOP-LEVEL keywords block for a given entry ID.
 *
 * Skips weapon-level keyword blocks by using brace-depth tracking.
 */
function getExistingKeywordFields(
  fileContent: string,
  entryId: string,
): Set<string> {
  const fields = new Set<string>();

  // Find the entry block — look for 'entryId': { ... } or "entryId": { ... }
  const escapedId = entryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entryPattern = new RegExp(
    `['"]${escapedId}['"]\\s*:\\s*\\{`,
  );
  const entryMatch = entryPattern.exec(fileContent);
  if (!entryMatch) return fields;

  const entryOpenBraceEnd = entryMatch.index + entryMatch[0].length;
  const block = findTopLevelKeywordsBlock(fileContent, entryOpenBraceEnd);
  if (!block) return fields;

  const keywordsContent = fileContent.slice(block.contentStart, block.contentEnd);

  // Extract field names (identifiers before colons)
  const fieldPattern = /(\w+)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = fieldPattern.exec(keywordsContent)) !== null) {
    fields.add(m[1]);
  }

  return fields;
}

function computeMissingKeywords(
  entries: { id: string; keywordNames: string[] }[],
  fileContent: string,
  includeWeaponKeywords: boolean,
): MissingKeywords[] {
  // Deduplicate entries by ID — processed data can have benign duplicates
  // (same card scoped to different units). Merge their keyword lists.
  const mergedEntries = new Map<string, string[]>();
  for (const entry of entries) {
    const existing = mergedEntries.get(entry.id);
    if (existing) {
      for (const kw of entry.keywordNames) {
        if (!existing.includes(kw)) existing.push(kw);
      }
    } else {
      mergedEntries.set(entry.id, [...entry.keywordNames]);
    }
  }

  const results: MissingKeywords[] = [];

  for (const [entryId, keywordNames] of mergedEntries) {
    // Only process entries that exist in the enrichment file
    const escapedId = entryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const entryPattern = new RegExp(`['"]${escapedId}['"]\\s*:`);
    if (!entryPattern.test(fileContent)) continue;

    const existingFields = getExistingKeywordFields(fileContent, entryId);
    const missingFields: Record<string, string> = {};

    for (const kwName of keywordNames) {
      const meta = keywordByName.get(kwName);
      // Skip weapon keywords on units (they go on weapon profiles)
      if (!includeWeaponKeywords && meta?.isWeaponKeyword) continue;

      const fieldValue = ALL_KEYWORD_MAP[kwName];
      if (!fieldValue) continue;

      for (const fieldName of toFieldNames(fieldValue)) {
        // Skip weapon fields on unit entries
        if (!includeWeaponKeywords && WEAPON_FIELDS.has(fieldName)) continue;

        if (!existingFields.has(fieldName)) {
          missingFields[fieldName] = defaultValue(fieldName);
        }
      }
    }

    if (Object.keys(missingFields).length > 0) {
      results.push({ entryId, fields: missingFields });
    }
  }

  return results;
}

// ============================================================================
// Patch File Content
// ============================================================================

function patchFileContent(
  content: string,
  missingList: MissingKeywords[],
): string {
  let result = content;

  for (const { entryId, fields } of missingList) {
    const escapedId = entryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Find the entry
    const entryPattern = new RegExp(`['"]${escapedId}['"]\\s*:\\s*\\{`);
    const entryMatch = entryPattern.exec(result);
    if (!entryMatch) continue;

    const entryOpenBraceEnd = entryMatch.index + entryMatch[0].length;

    // Find the top-level keywords block (depth-aware, skips weapon keywords)
    const block = findTopLevelKeywordsBlock(result, entryOpenBraceEnd);

    const fieldLines = Object.entries(fields)
      .map(([name, val]) => `      ${name}: ${val},`)
      .join('\n');

    if (!block) {
      // Entry exists but has no top-level keywords property — add one.
      // Insert right after the opening brace of the entry.
      const insertion = `\n    keywords: {\n${fieldLines}\n    },`;
      result =
        result.slice(0, entryOpenBraceEnd) +
        insertion +
        result.slice(entryOpenBraceEnd);
      continue;
    }

    const kwContent = result.slice(block.contentStart, block.contentEnd);

    // Check if the keywords block is empty
    const isEmpty = kwContent.trim() === '';

    if (isEmpty) {
      // Empty keywords: {} → expand to multi-line
      const replacement = `\n${fieldLines}\n    `;
      result =
        result.slice(0, block.contentStart) + replacement + result.slice(block.contentEnd);
    } else {
      // Non-empty: append before closing brace
      // Find the last non-whitespace before the closing }
      const trimmedContent = kwContent.trimEnd();
      const needsComma =
        trimmedContent.length > 0 && !trimmedContent.endsWith(',');
      const comma = needsComma ? ',' : '';

      const insertion = `${comma}\n${fieldLines}`;
      // Insert at the end of existing content (before trailing whitespace + closing })
      const insertPos = block.contentStart + trimmedContent.length;
      result =
        result.slice(0, insertPos) + insertion + result.slice(insertPos);
    }
  }

  return result;
}

// ============================================================================
// Main
// ============================================================================

const dryRun = process.argv.includes('--dry-run');

const unitsFilePath = 'src/data/enrichment/units.ts';
const upgradesFilePath = 'src/data/enrichment/upgrades.ts';

let unitsContent = fs.readFileSync(unitsFilePath, 'utf-8');
let upgradesContent = fs.readFileSync(upgradesFilePath, 'utf-8');

// Compute missing keywords for units (exclude weapon keywords — those go on weapon profiles)
const unitMissing = computeMissingKeywords(processedUnits, unitsContent, false);

// Compute missing keywords for upgrades (exclude weapon keywords — those go on weapon profiles,
// not the upgrade-level keywords block. Weapon keywords must be manually placed on weapons[].)
const upgradeMissing = computeMissingKeywords(
  processedUpgrades,
  upgradesContent,
  false,
);

console.log(`\n=== Backfill Enrichment Keywords ===\n`);
console.log(`Units with missing keywords: ${unitMissing.length}`);
console.log(`Upgrades with missing keywords: ${upgradeMissing.length}`);

if (unitMissing.length > 0) {
  console.log(`\n--- Unit Missing Keywords ---`);
  for (const m of unitMissing) {
    console.log(`  ${m.entryId}: +${Object.keys(m.fields).join(', ')}`);
  }
}

if (upgradeMissing.length > 0) {
  console.log(`\n--- Upgrade Missing Keywords ---`);
  for (const m of upgradeMissing) {
    console.log(`  ${m.entryId}: +${Object.keys(m.fields).join(', ')}`);
  }
}

if (dryRun) {
  console.log(`\n[DRY RUN] No files modified.\n`);
  process.exit(0);
}

if (unitMissing.length > 0) {
  unitsContent = patchFileContent(unitsContent, unitMissing);
  fs.writeFileSync(unitsFilePath, unitsContent, 'utf-8');
  console.log(`\n✓ Patched ${unitsFilePath}`);
}

if (upgradeMissing.length > 0) {
  upgradesContent = patchFileContent(upgradesContent, upgradeMissing);
  fs.writeFileSync(upgradesFilePath, upgradesContent, 'utf-8');
  console.log(`✓ Patched ${upgradesFilePath}`);
}

console.log(`\nDone.\n`);
