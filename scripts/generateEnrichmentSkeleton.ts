/**
 * Generate full skeleton enrichment entries for all processed units/upgrades.
 *
 * Rules:
 * - Map keywords from raw unit `keywords` (fallback: `keyword_ids`) and raw upgrade `keyword_ids`
 * - Boolean keywords => true
 * - Numeric (X) keywords => '<need human>'
 * - Include ALL processed units/upgrades (empty keywords object if nothing relevant maps)
 */

import * as fs from 'node:fs';

type RawUnit = {
  id: string | number;
  revamp?: boolean | null;
  keywords?: number[] | null;
  keyword_ids?: number[] | null;
};

type RawUpgrade = {
  id: string | number;
  revamp?: boolean | null;
  keywords?: number[] | null;
  keyword_ids?: number[] | null;
};

type ProcessedUnit = {
  id: string;
  apiId: number;
  name: string;
  faction: string;
  rank: string;
};

type ProcessedUpgradeWithMeta = {
  id: string;
  apiId: number;
  name: string;
  upgradeSlot: string;
};

type ProcessedKeyword = {
  id: string;
  name: string;
  hasMagnitude: boolean;
  isWeaponKeyword: boolean;
};

const rawUnitsJson = JSON.parse(fs.readFileSync('src/data/raw/units.json', 'utf-8'));
const rawUpgradesJson = JSON.parse(fs.readFileSync('src/data/raw/upgrades.json', 'utf-8'));
const processedUnits = JSON.parse(fs.readFileSync('src/data/processed/units.json', 'utf-8')) as ProcessedUnit[];
const processedUpgrades = JSON.parse(fs.readFileSync('src/data/processed/upgrades.json', 'utf-8')) as ProcessedUpgradeWithMeta[];
const processedKeywords = JSON.parse(fs.readFileSync('src/data/processed/keywords.json', 'utf-8')) as ProcessedKeyword[];

const allRawUnits = (rawUnitsJson.units ?? rawUnitsJson) as RawUnit[];
const allRawUpgrades = (rawUpgradesJson.upgrades ?? rawUpgradesJson) as RawUpgrade[];

// Ignore legacy entries explicitly marked as non-revamp.
// Keep entries where revamp is true or missing.
const rawUnits = allRawUnits.filter((u) => u.revamp !== false);
const rawUpgrades = allRawUpgrades.filter((u) => u.revamp !== false);

const keywordById = new Map<string, ProcessedKeyword>();
for (const keyword of processedKeywords) {
  keywordById.set(String(keyword.id), keyword);
}

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
  Duelist: ['duelistAttacker', 'duelistDefender'],
  Backup: 'backup',
  'Dug In': 'dugIn',
};

const WEAPON_KEYWORD_MAP: Record<string, string | string[]> = {
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
  'Ion': 'ionX',
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
  // Boolean — with enrichment examples
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

  // Numeric — with enrichment examples
  'Tactical X': 'tacticalX',
  Demoralize: 'demoralizeX',
  Inspire: 'inspireX',
  Target: 'targetX',
  '\u27a6Spotter': 'spotterX',
  '\u27a6Bolster': 'bolsterX',
  Strategize: 'strategizeX',
  Recharge: 'rechargeX',

  // String — with enrichment examples
  Aid: 'aid',
  Direct: 'direct',

  // Boolean — no enrichment examples
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

  // Numeric — no enrichment examples
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

const ALL_KEYWORD_MAP = {
  ...ATTACKER_KEYWORD_MAP,
  ...DEFENDER_KEYWORD_MAP,
  ...WEAPON_KEYWORD_MAP,
  ...DISPLAY_WEAPON_KEYWORD_MAP,
  ...DISPLAY_UNIT_KEYWORD_MAP,
};

function isMagnitudeField(fieldName: string): boolean {
  return fieldName.endsWith('X');
}

function toFieldNames(fieldValue: string | string[]): string[] {
  return Array.isArray(fieldValue) ? fieldValue : [fieldValue];
}

/** String-typed display keyword fields (parameterized keywords). */
const STRING_KEYWORD_FIELDS = new Set<string>([
  'fixed', 'armX', 'detonateX',
  'coordinate', 'aid', 'direct', 'ai', 'entourage', 'equip', 'retinue',
  'teamwork', 'associate', 'independent', 'mercenary', 'specialIssue',
  'repair', 'treat', 'hover', 'transport',
]);

function mapKeywordIdsToFields(
  keywordIds: number[] | null | undefined,
  includeWeaponKeywords: boolean,
): Record<string, true | '<need human>'> {
  const mapped: Record<string, true | '<need human>'> = {};

  for (const keywordId of keywordIds ?? []) {
    const keyword = keywordById.get(String(keywordId));
    if (!keyword) continue;

    if (!includeWeaponKeywords && keyword.isWeaponKeyword) continue;

    const fieldValue = ALL_KEYWORD_MAP[keyword.name];
    if (!fieldValue) continue;

    for (const fieldName of toFieldNames(fieldValue)) {
      if (STRING_KEYWORD_FIELDS.has(fieldName)) {
        mapped[fieldName] = '<need human>';
      } else {
        mapped[fieldName] = isMagnitudeField(fieldName) ? '<need human>' : true;
      }
    }
  }

  return mapped;
}

function getRawKeywordIds(record: { keywords?: number[] | null; keyword_ids?: number[] | null }): number[] {
  return record.keywords ?? record.keyword_ids ?? [];
}

function formatKeywordsObject(keywords: Record<string, true | '<need human>'>): string {
  const entries = Object.entries(keywords);
  if (entries.length === 0) return '{}';

  const lines = entries.map(([key, value]) => {
    const renderedValue = value === true ? 'true' : "'<need human>'";
    return `      ${key}: ${renderedValue},`;
  });

  return `{
${lines.join('\n')}
    }`;
}

const rawUnitById = new Map<string, RawUnit>();
for (const rawUnit of rawUnits) {
  rawUnitById.set(String(rawUnit.id), rawUnit);
}

const rawUpgradeById = new Map<string, RawUpgrade>();
for (const rawUpgrade of rawUpgrades) {
  rawUpgradeById.set(String(rawUpgrade.id), rawUpgrade);
}

const FACTION_ORDER: Record<string, number> = {
  'rebel-alliance': 1,
  'galactic-empire': 2,
  republic: 3,
  'separatist-alliance': 4,
  mercenaries: 5,
};

const RANK_ORDER: Record<string, number> = {
  commander: 1,
  operative: 2,
  corps: 3,
  'special-forces': 4,
  support: 5,
  heavy: 6,
};


const processedUnitById = new Map<string, ProcessedUnit>();
for (const unit of processedUnits) {
  processedUnitById.set(unit.id, unit);
}

const mergedUnitKeywords = new Map<string, Record<string, true | '<need human>'>>();

for (const processedUnit of processedUnits) {
  const rawUnit = rawUnitById.get(String(processedUnit.apiId));
  const sourceKeywords = rawUnit ? getRawKeywordIds(rawUnit) : [];
  const keywords = mapKeywordIdsToFields(sourceKeywords, false);

  const existing = mergedUnitKeywords.get(processedUnit.id) ?? {};
  for (const [fieldName, value] of Object.entries(keywords)) {
    existing[fieldName] = value;
  }
  mergedUnitKeywords.set(processedUnit.id, existing);
}

const unitEntries: string[] = [];
const sortedUnitIds = Array.from(mergedUnitKeywords.keys()).sort((a, b) => {
  const unitA = processedUnitById.get(a);
  const unitB = processedUnitById.get(b);
  if (!unitA || !unitB) return a.localeCompare(b);

  const factionCmp = (FACTION_ORDER[unitA.faction] ?? 99) - (FACTION_ORDER[unitB.faction] ?? 99);
  if (factionCmp !== 0) return factionCmp;

  const rankCmp = (RANK_ORDER[unitA.rank] ?? 99) - (RANK_ORDER[unitB.rank] ?? 99);
  if (rankCmp !== 0) return rankCmp;

  return unitA.name.localeCompare(unitB.name);
});

for (const unitId of sortedUnitIds) {
  const keywords = mergedUnitKeywords.get(unitId) ?? {};
  unitEntries.push(`  '${unitId}': {\n    attackSurgeChart: undefined,\n    defenseSurgeChart: undefined,\n    keywords: ${formatKeywordsObject(keywords)},\n    weapons: [],\n  }`);
}

// Multiple raw upgrades can share the same processed upgrade id (slot+name).
// This is intentional for *benign* duplicates: they represent the same physical
// card scoped to different unit mappings and have identical cost, keywords, and
// addsUpgradeSlot. Merge them into one enrichment entry by unioning keyword fields.
//
// Note: *True* collisions (different costs, keywords, or mechanics) are
// disambiguated upstream in processApiData.ts by appending a unit-name suffix to
// each conflicting entry's ID. By the time this generator runs, every collision
// group it encounters is guaranteed to be benign.
const mergedUpgradeKeywords = new Map<string, Record<string, true | '<need human>'>>();

for (const processedUpgrade of processedUpgrades) {
  const rawUpgrade = rawUpgradeById.get(String(processedUpgrade.apiId));
  const keywords = mapKeywordIdsToFields(
    rawUpgrade ? getRawKeywordIds(rawUpgrade) : [],
    true,
  );

  const existing = mergedUpgradeKeywords.get(processedUpgrade.id) ?? {};
  for (const [fieldName, value] of Object.entries(keywords)) {
    existing[fieldName] = value;
  }
  mergedUpgradeKeywords.set(processedUpgrade.id, existing);
}

const upgradeEntries: string[] = [];
const processedUpgradeById = new Map<string, ProcessedUpgradeWithMeta>();
for (const upgrade of processedUpgrades) {
  if (!processedUpgradeById.has(upgrade.id)) {
    processedUpgradeById.set(upgrade.id, upgrade);
  }
}

const sortedUpgradeIds = Array.from(mergedUpgradeKeywords.keys()).sort((a, b) => {
  const upgradeA = processedUpgradeById.get(a);
  const upgradeB = processedUpgradeById.get(b);
  if (!upgradeA || !upgradeB) return a.localeCompare(b);

  const slotCmp = upgradeA.upgradeSlot.localeCompare(upgradeB.upgradeSlot);
  if (slotCmp !== 0) return slotCmp;

  return upgradeA.name.localeCompare(upgradeB.name);
});

for (const upgradeId of sortedUpgradeIds) {
  const keywords = mergedUpgradeKeywords.get(upgradeId) ?? {};
  upgradeEntries.push(`  '${upgradeId}': {\n    keywords: ${formatKeywordsObject(keywords)},\n  }`);
}

const unitsOutput = `/**
 * Unit enrichment data skeleton generated from raw API keywords.
 *
 * - Includes all processed units.
 * - Boolean keywords are set to true.
 * - Numeric (X) keywords are set to '<need human>'.
 */

import type { UnitEnrichment } from './types';

export const UNIT_ENRICHMENTS: Record<string, UnitEnrichment> = {
${unitEntries.join(',\n\n')}
};
`;

const upgradesOutput = `/**
 * Upgrade enrichment data skeleton generated from raw API keywords.
 *
 * - Includes all processed upgrades.
 * - Boolean keywords are set to true.
 * - Numeric (X) keywords are set to '<need human>'.
 */

import type { UpgradeEnrichment } from './types';

export const UPGRADE_ENRICHMENTS: Record<string, UpgradeEnrichment> = {
${upgradeEntries.join(',\n\n')}
};
`;

// ============================================================================
// Safety Guard: never overwrite existing enrichment files
// ============================================================================
// Enrichment files contain manually curated weapon profiles, surge charts,
// defense stats, and keyword values that CANNOT be regenerated from the API.
// This script is for INITIAL scaffolding only. To update enrichment with new
// entries, use backfillEnrichmentKeywords.ts instead.
const forceOverwrite = process.argv.includes('--force');
const unitsPath = 'src/data/enrichment/units.ts';
const upgradesPath = 'src/data/enrichment/upgrades.ts';

if (!forceOverwrite && (fs.existsSync(unitsPath) || fs.existsSync(upgradesPath))) {
  console.error(
    '\n❌ Enrichment files already exist. This script would DESTROY manually curated data.\n' +
    '   Enrichment files contain human-curated weapon profiles, surge charts, and keyword\n' +
    '   values that cannot be regenerated from the API.\n\n' +
    '   To add NEW entries for newly discovered units/upgrades, use:\n' +
    '     npx tsx scripts/backfillEnrichmentKeywords.ts\n\n' +
    '   To force overwrite (DESTRUCTIVE — you will lose all curated data), use:\n' +
    '     npx tsx scripts/generateEnrichmentSkeleton.ts --force\n',
  );
  process.exit(1);
}

fs.writeFileSync(unitsPath, unitsOutput);
fs.writeFileSync(upgradesPath, upgradesOutput);

console.log(`Generated units (raw): ${processedUnits.length}`);
console.log(`Generated units (unique keys): ${mergedUnitKeywords.size}`);
console.log(`Generated upgrades (raw): ${processedUpgrades.length}`);
console.log(`Generated upgrades (unique keys): ${mergedUpgradeKeywords.size}`);
