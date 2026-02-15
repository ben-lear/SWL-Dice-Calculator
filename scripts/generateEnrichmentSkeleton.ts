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

const ATTACKER_KEYWORD_MAP: Record<string, string> = {
  Precise: 'preciseX',
  Sharpshooter: 'sharpshooterX',
  Marksman: 'marksman',
  'Jedi Hunter': 'jediHunter',
  "Jar'Kai Mastery": 'jarKaiMastery',
  Duelist: 'duelistAttacker',
  'Makashi Mastery': 'makashiMastery',
  'Immune: Deflect': 'immuneDeflect',
  'Death from Above': 'deathFromAbove',
  'Hold the Line': 'holdTheLine',
};

const DEFENDER_KEYWORD_MAP: Record<string, string> = {
  Armor: 'armorX',
  'Armor [X]': 'armorX',
  'Weak Point': 'weakPointX',
  'Danger Sense': 'dangerSenseX',
  'Uncanny Luck': 'uncannyLuckX',
  Shielded: 'shieldedX',
  Guardian: 'guardianX',
  Cover: 'coverX',
  'Immune: Pierce': 'immunePierce',
  'Immune: Melee Pierce': 'immuneMeleePierce',
  'Immune: Blast': 'immuneBlast',
  Impervious: 'impervious',
  Block: 'block',
  Deflect: 'deflect',
  'Shien Mastery': 'shienMastery',
  Outmaneuver: 'outmaneuver',
  'Low Profile': 'lowProfile',
  'Djem So Mastery': 'djemSoMastery',
  'Soresu Mastery': 'soresuMastery',
  Duelist: 'duelistDefender',
  Backup: 'backup',
  'Dug In': 'dugIn',
};

const WEAPON_KEYWORD_MAP: Record<string, string> = {
  Pierce: 'pierceX',
  Impact: 'impactX',
  Critical: 'criticalX',
  Lethal: 'lethalX',
  Ram: 'ramX',
  Blast: 'blast',
  Suppressive: 'suppressive',
  'High Velocity': 'highVelocity',
  Spray: 'spray',
  'Anti-Materiel': 'antiMaterielX',
  'Anti-Personnel': 'antiPersonnelX',
  Cumbersome: 'cumbersome',
};

const ALL_KEYWORD_MAP = {
  ...ATTACKER_KEYWORD_MAP,
  ...DEFENDER_KEYWORD_MAP,
  ...WEAPON_KEYWORD_MAP,
};

function isMagnitudeField(fieldName: string): boolean {
  return fieldName.endsWith('X');
}

function mapKeywordIdsToFields(keywordIds: number[] | null | undefined): Record<string, true | '<need human>'> {
  const mapped: Record<string, true | '<need human>'> = {};

  for (const keywordId of keywordIds ?? []) {
    const keyword = keywordById.get(String(keywordId));
    if (!keyword) continue;

    const fieldName = ALL_KEYWORD_MAP[keyword.name];
    if (!fieldName) continue;

    mapped[fieldName] = isMagnitudeField(fieldName) ? '<need human>' : true;
  }

  return mapped;
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
  const sourceKeywords = rawUnit?.keywords ?? rawUnit?.keyword_ids ?? [];
  const keywords = mapKeywordIdsToFields(sourceKeywords);

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
  unitEntries.push(`  '${unitId}': {\n    keywords: ${formatKeywordsObject(keywords)},\n    weapons: [],\n  }`);
}

// Multiple raw upgrades can share the same processed upgrade id (slot+name).
// This is intentional: they represent the same card scoped to different unit
// mappings. Merge them into one enrichment entry by unioning keyword fields.
const mergedUpgradeKeywords = new Map<string, Record<string, true | '<need human>'>>();

for (const processedUpgrade of processedUpgrades) {
  const rawUpgrade = rawUpgradeById.get(String(processedUpgrade.apiId));
  const keywords = mapKeywordIdsToFields(rawUpgrade?.keyword_ids ?? []);

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

fs.writeFileSync('src/data/enrichment/units.ts', unitsOutput);
fs.writeFileSync('src/data/enrichment/upgrades.ts', upgradesOutput);

console.log(`Generated units (raw): ${processedUnits.length}`);
console.log(`Generated units (unique keys): ${mergedUnitKeywords.size}`);
console.log(`Generated upgrades (raw): ${processedUpgrades.length}`);
console.log(`Generated upgrades (unique keys): ${mergedUpgradeKeywords.size}`);
