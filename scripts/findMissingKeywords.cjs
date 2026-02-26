const fs = require('fs');
const path = require('path');

const units = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/processed/units.json'), 'utf8'));
const enrichSrc = fs.readFileSync(path.join(__dirname, '../src/data/enrichment/units.ts'), 'utf8');

// Mapping from 'Keyword X' display names to enrichment property names
const keywordMap = {
  'Impact': 'impactX',
  'Pierce': 'pierceX',
  'Critical': 'criticalX',
  'Lethal': 'lethalX',
  'Arsenal': 'arsenalX',
  'Armor': 'armorX',
  'Scout': 'scoutX',
  'Tactical': 'tacticalX',
  'Ram': 'ramX',
  'Ion': 'ionX',
  'Self-Destruct': 'selfDestructX',
  'Overrun': 'overrunX',
  'Flexible Response': 'flexibleResponseX',
  'Advanced Targeting:': 'advancedTargetingX',
  'Command Vehicle': 'commandVehicleX',
  'Hover: Air': 'hover',
};

// Keywords valid at unit level per enrichment type system (UnitKeywords)
const unitLevelKeywords = new Set([
  'scoutX', 'tacticalX', 'arsenalX', 'armorX', 'preciseX', 'sharpshooterX',
  'weakPointX', 'dangerSenseX', 'uncannyLuckX', 'shieldedX', 'guardianX', 'coverX',
  'flexibleResponseX', 'advancedTargetingX', 'commandVehicleX', 'hover',
]);

// Keywords valid at weapon level per enrichment type system (EnrichmentWeaponKeywords + DisplayWeaponKeywords)
const weaponLevelKeywords = new Set([
  'impactX', 'pierceX', 'criticalX', 'lethalX', 'ramX', 'ionX',
  'selfDestructX', 'overrunX',
]);

// Collect all unit-id -> required keywords from units.json
const required = {};
units.forEach(u => {
  if (!u.keywordNames) return;
  u.keywordNames.forEach(k => {
    const m = k.match(/^(.+)\s+X$/);
    if (!m) return;
    const base = m[1];
    const prop = keywordMap[base];
    if (!prop) {
      console.log('UNMAPPED KEYWORD:', base, 'on unit', u.id);
      return;
    }
    if (!required[u.id]) required[u.id] = {};
    required[u.id][prop] = true;
  });
});

// For each unit in required, check if enrichment has that keyword defined ANYWHERE in unit block
const missing = [];
for (const [unitId, keywords] of Object.entries(required)) {
  const unitIdx = enrichSrc.indexOf("'" + unitId + "'");
  if (unitIdx === -1) {
    for (const kw of Object.keys(keywords)) {
      const level = unitLevelKeywords.has(kw) ? 'unit' : weaponLevelKeywords.has(kw) ? 'weapon' : 'unknown';
      missing.push({ unitId, keyword: kw, level, reason: 'unit not in enrichment' });
    }
    continue;
  }

  // Get the text from unit entry to next unit entry
  const afterUnit = enrichSrc.substring(unitIdx);
  const nextUnitMatch = afterUnit.substring(10).match(/\n  '/);
  const blockEnd = nextUnitMatch ? nextUnitMatch.index + 10 : afterUnit.length;
  const unitBlock = afterUnit.substring(0, blockEnd);

  for (const kw of Object.keys(keywords)) {
    const kwRegex = new RegExp(kw + '\\s*:');
    if (!kwRegex.test(unitBlock)) {
      const level = unitLevelKeywords.has(kw) ? 'unit' : weaponLevelKeywords.has(kw) ? 'weapon' : 'unknown';
      missing.push({ unitId, keyword: kw, level, reason: 'keyword missing from entire enrichment block' });
    }
  }
}

console.log('\n=== MISSING KEYWORD X VALUES (checked entire unit block incl weapons) ===');
missing.forEach(m => {
  console.log(`  ${m.unitId} -> ${m.keyword} [${m.level}-level] (${m.reason})`);
});
console.log('\nTotal missing:', missing.length);

// Group by unit for easier editing
console.log('\n=== GROUPED BY UNIT ===');
const grouped = {};
missing.forEach(m => {
  if (!grouped[m.unitId]) grouped[m.unitId] = [];
  grouped[m.unitId].push({ keyword: m.keyword, level: m.level });
});
for (const [unitId, keywords] of Object.entries(grouped)) {
  const unitKws = keywords.filter(k => k.level === 'unit').map(k => k.keyword);
  const weaponKws = keywords.filter(k => k.level === 'weapon').map(k => k.keyword);
  const parts = [];
  if (unitKws.length) parts.push(`unit-level: ${unitKws.join(', ')}`);
  if (weaponKws.length) parts.push(`weapon-level: ${weaponKws.join(', ')}`);
  console.log(`  '${unitId}': ${parts.join(' | ')}`);
}
