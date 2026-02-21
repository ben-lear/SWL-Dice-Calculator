/**
 * Process raw API data into clean, typed structures.
 *
 * Usage: npx tsx scripts/processApiData.ts
 *
 * Reads from: src/data/raw/
 * Outputs to:  src/data/processed/
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_DIR = join(__dirname, '..', 'src', 'data', 'raw');
const OUT_DIR = join(__dirname, '..', 'src', 'data', 'processed');

// ── Mapping Tables ──────────────────────────────────────────────────────────
// These map API integer codes to string enum values.

const FACTION_MAP: Record<number, string> = {
  1: 'rebel-alliance',
  2: 'galactic-empire',
  3: 'republic',       // Not in original mapping but present in data
  4: 'republic',
  5: 'separatist-alliance',
  6: 'mercenaries',
};

const RANK_MAP: Record<number, string> = {
  1: 'commander',
  2: 'corps',
  3: 'special-forces',
  4: 'support',
  5: 'heavy',
  6: 'operative',
};

const UNIT_TYPE_MAP: Record<number, string> = {
  1: 'trooper',
  2: 'repulsor-vehicle',
  3: 'ground-vehicle',
  4: 'trooper',         // Emplacement troopers (heavy weapons teams)
  5: 'trooper',         // Clone troopers
  6: 'trooper',         // Droids
  7: 'repulsor-vehicle', // Creature vehicles (tauntauns, dewbacks)
};

// Built dynamically from /api/affiliations data below.
// Keyed by API affiliation id, values are slugified name strings.
// ID 7 (Ewoks) is absent from the API response and is hardcoded here.
const AFFILIATION_MAP_FALLBACK: Record<number, string> = {
  7: 'ewoks', // API endpoint omits this entry; hardcoded from observed unit/upgrade data
};

/**
 * Upgrade API IDs whose faction restriction is incorrectly null in the
 * Tabletop Admiral API but should be restricted to specific factions.
 *
 * Add an entry here whenever fresh API data incorrectly omits a faction
 * restriction, so the fix survives future `fetchApiData` runs.
 */
const UPGRADE_FACTION_OVERRIDES: Record<number, string[]> = {
  16569: ['republic'], // Echo, ARC Marksman — API omits Republic faction restriction
};

/**
 * Upgrade API IDs whose `revamp` flag is incorrectly set to `false` in the
 * Tabletop Admiral API but should be treated as Revamp-mode cards.
 *
 * Add an entry here whenever fresh API data incorrectly marks a Revamp card
 * as non-revamp, so the fix survives future `fetchApiData` runs.
 */
const UPGRADE_REVAMP_OVERRIDES = new Set<number>([
  15011, // Hunter (heavy-weapon for The Bad Batch / Clone Force 99) — API incorrectly marks revamp: false
]);

/**
 * Upgrade API IDs that should be reclassified to a different upgrade slot.
 * The Tabletop Admiral API classifies counterpart upgrades under the
 * "programming" slot type (upgrade_type_fkey=15).  We override them to
 * "counterpart" so they match unit upgrade bars and enrichment keys.
 *
 * Add entries here when the API delivers a card under the wrong slot type.
 */
const UPGRADE_SLOT_OVERRIDES: Record<number, string> = {
  3649:  'counterpart', // Grogu
  131:   'counterpart', // C-3PO
  167:   'counterpart', // Iden's ID10 Seeker Droid
  15628: 'counterpart', // Omega
};

/**
 * Maps API upgrade_type_fkey integers to UpgradeSlot string values.
 * Built dynamically from /api/upgrade-types data, with fallback hardcoded
 * values for types present in unit data but missing from /api/upgrade-types
 * (e.g., Ordnance id=14, Programming id=15).
 */
const UPGRADE_TYPE_MAP: Record<number, string> = {
  1: 'personnel',
  2: 'gear',
  3: 'grenades',
  4: 'heavy-weapon',
  5: 'force',
  6: 'comms',
  7: 'pilot',
  8: 'hardpoint',
  9: 'command',
  10: 'training',
  11: 'generator',
  12: 'armament',
  13: 'crew',
  14: 'ordnance',
  15: 'programming',
  16: 'electrobinoculars',
  17: 'portable-scanner',
  18: 'protocol',
  19: 'squad-leader',
  20: 'strike-and-fade',
  21: 'door-gunner',
  22: 'imperial-march',
  23: 'dug-in',
  24: 'doctrine',
};

// ── Helper functions ────────────────────────────────────────────────────────

function isNumber(x: unknown): x is number {
  return typeof x === 'number';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildBaseUnitId(name: string, title?: string | null): string {
  const nameSlug = slugify(name);
  const titleSlug = title ? slugify(title) : '';
  return titleSlug ? `${nameSlug}-${titleSlug}` : nameSlug;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function normalizeKeywordName(name: string): string {
  const withoutBracketedMagnitude = name.replace(/\[X\]/g, 'X');
  const normalizedArsenal = withoutBracketedMagnitude === 'Arsenal'
    ? 'Arsenal X'
    : withoutBracketedMagnitude;

  return normalizedArsenal.replace(/\s{2,}/g, ' ').trim();
}

function getRawKeywordIds(
  record: { keywords?: Array<number | string> | null; keyword_ids?: Array<number | string> | null },
): Array<number | string> {
  return record.keywords ?? record.keyword_ids ?? [];
}

function mapKeywordIdsToNames(
  keywordIds: Array<number | string> | null | undefined,
  keywordIdToName: Map<number, string>,
): string[] {
  const names = (keywordIds ?? [])
    .map((kid) => keywordIdToName.get(Number(kid)))
    .filter((name): name is string => Boolean(name))
    .map(normalizeKeywordName);

  return unique(names);
}

function resolveCost(record: {
  recent_active_cost?: number | null;
  curren_cost?: number | null;
  current_cost?: number | null;
  original_cost?: number | null;
  cost?: number | null;
}): number {
  return (
    record.recent_active_cost ??
    record.current_cost ??
    record.original_cost ??
    record.cost ??
    0
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

function processData() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Load raw data
  const rawUnitsData = JSON.parse(readFileSync(join(RAW_DIR, 'units.json'), 'utf-8'));
  const allRawUnits = rawUnitsData.units || rawUnitsData; // Handle { units: [...] } or just [...]
  const rawKeywords = JSON.parse(readFileSync(join(RAW_DIR, 'keywords.json'), 'utf-8'));
  const allRawUpgrades = JSON.parse(readFileSync(join(RAW_DIR, 'upgrades.json'), 'utf-8'));
  const rawUpgradeTypesData = JSON.parse(readFileSync(join(RAW_DIR, 'upgrade-types.json'), 'utf-8'));
  const rawUpgradeTypes = rawUpgradeTypesData.value || rawUpgradeTypesData; // Handle wrapped response

  // 1b. Build AFFILIATION_MAP from raw affiliations data
  const rawAffiliations = JSON.parse(readFileSync(join(RAW_DIR, 'affiliations.json'), 'utf-8'));
  const AFFILIATION_MAP: Record<number, string> = { ...AFFILIATION_MAP_FALLBACK };
  for (const aff of rawAffiliations) {
    AFFILIATION_MAP[Number(aff.id)] = slugify(aff.name);
  }

  // Apply per-ID revamp overrides before filtering — corrects API data errors
  // for specific upgrade IDs listed in UPGRADE_REVAMP_OVERRIDES.
  for (const up of allRawUpgrades) {
    if (UPGRADE_REVAMP_OVERRIDES.has(Number(up.id))) {
      up.revamp = true;
    }
  }

  // Ignore legacy entries explicitly marked as non-revamp.
  // Keep entries where revamp is true or missing.
  const rawUnits = allRawUnits.filter((u: any) => u.revamp !== false);
  const rawUpgrades = allRawUpgrades.filter((up: any) => up.revamp !== false);

  // 2. Build keyword ID → name map
  const keywordIdToName = new Map<number, string>();
  for (const kw of rawKeywords) {
    keywordIdToName.set(Number(kw.id), kw.name);
  }

  // 2b. Build upgrade type ID → slug map from API data
  // Start with the hardcoded UPGRADE_TYPE_MAP as fallback (covers IDs missing
  // from /api/upgrade-types like Ordnance=14, Programming=15), then overlay
  // with the dynamic names from the API.
  const upgradeTypeIdToSlug = new Map<number, string>(
    Object.entries(UPGRADE_TYPE_MAP).map(([k, v]) => [Number(k), v]),
  );
  for (const ut of rawUpgradeTypes) {
    const slug = slugify(ut.name);
    upgradeTypeIdToSlug.set(Number(ut.id), slug);
  }

  // 2c. Build unlocked_by → upgrade slot map
  // Key = upgrade API ID that unlocks this slot, value = set of slot slugs it unlocks
  const unlockedByMap = new Map<number, Set<string>>();
  for (const u of rawUnits) {
    for (const slotEntry of (u.upgrade_types ?? [])) {
      if (!slotEntry.revamp) continue;
      if (slotEntry.unlocked_by == null) continue;
      const slug = upgradeTypeIdToSlug.get(slotEntry.upgrade_type_fkey);
      if (!slug) continue;
      const unlockerApiId = Number(slotEntry.unlocked_by);
      if (!unlockedByMap.has(unlockerApiId)) {
        unlockedByMap.set(unlockerApiId, new Set<string>());
      }
      unlockedByMap.get(unlockerApiId)!.add(slug);
    }
  }

  // 3. Process units
  const usedUnitIds = new Set<string>();

  const processedUnits = rawUnits
    .map((u: any) => {
      const faction = FACTION_MAP[u.faction_fkey];
      const rank = RANK_MAP[u.rank_fkey];
      const unitType = UNIT_TYPE_MAP[u.unit_type_fkey];

      if (!faction || !rank || !unitType) {
        console.warn(`Skipping unit "${u.name}" (id=${u.id}): unmapped faction=${u.faction_fkey}, rank=${u.rank_fkey}, unit_type=${u.unit_type_fkey}`);
        return null;
      }

      // Extract upgrade bar from the unit's upgrade_types array (if exists)
      const upgradeBar: string[] = (u.upgrade_types ?? [])
        .filter((slotEntry: any) => slotEntry.revamp) // Only include Revamp-mode slots
        .filter((slotEntry: any) => slotEntry.unlocked_by == null) // Exclude conditional slots (unlocked by another upgrade)
        .sort((a: any, b: any) => {
          // Sort by upgrade_type_fkey for consistent ordering based on priority
          const aType = rawUpgradeTypes.find((ut: any) => Number(ut.id) === a.upgrade_type_fkey);
          const bType = rawUpgradeTypes.find((ut: any) => Number(ut.id) === b.upgrade_type_fkey);
          const aPriority = aType?.sort_priority ?? 99;
          const bPriority = bType?.sort_priority ?? 99;
          return aPriority - bPriority;
        })
        .map((slotEntry: any) => {
          const slotName = upgradeTypeIdToSlug.get(slotEntry.upgrade_type_fkey);
          if (!slotName) {
            console.warn(`  Unknown upgrade_type_fkey=${slotEntry.upgrade_type_fkey} on unit "${u.name}"`);
          }
          return slotName;
        })
        .filter(Boolean);

      // Unit IDs are keyed by name + optional title.
      // Faction is appended ONLY if needed to resolve a collision.
      // If a rare collision still remains, append API id as a final fallback.
      const baseId = buildBaseUnitId(u.name, u.title ?? null);
      let uniqueId = baseId;
      if (usedUnitIds.has(uniqueId)) {
        uniqueId = `${baseId}-${faction}`;
      }
      if (usedUnitIds.has(uniqueId)) {
        uniqueId = `${baseId}-${u.id}`;
      }
      usedUnitIds.add(uniqueId);

      const keywordNames = mapKeywordIdsToNames(getRawKeywordIds(u), keywordIdToName);

      return {
        apiId: u.id,
        id: uniqueId,
        name: u.name,
        title: u.title ?? null,
        faction,
        cost: resolveCost(u),
        health: u.health ?? 1,
        figures: u.figures ?? 1,
        defenseDieColor: u.red_defense ? 'red' : 'white',
        rank,
        unitType,
        affiliation: AFFILIATION_MAP[u.affiliation_fkey] ?? null,
        keywordNames,
        upgradeBar,
      };
    })
    .filter(Boolean);

  // 4. Process upgrades
  const processedUpgrades = rawUpgrades
    .map((up: any) => {
      const rawSlot = UPGRADE_TYPE_MAP[up.upgrade_type_fkey];
      if (!rawSlot) {
        console.warn(`Skipping upgrade "${up.name}" (id=${up.id}): unmapped upgrade_type_fkey=${up.upgrade_type_fkey}`);
        return null;
      }
      // Apply slot overrides (e.g. counterpart upgrades miscategorised as programming)
      const upgradeSlot = UPGRADE_SLOT_OVERRIDES[Number(up.id)] ?? rawSlot;

      const keywordNames = mapKeywordIdsToNames(getRawKeywordIds(up), keywordIdToName);

      // Helper: map IDs through a lookup table, warn on unmapped values
      function compact(ids: (number | null | undefined)[], map: Record<number, string>): string[] {
        return ids
          .filter(isNumber)
          .map((id) => {
            const val = map[id];
            if (!val) console.warn(`  Unknown id=${id} in map for upgrade "${up.name}"`);
            return val;
          })
          .filter((v): v is string => Boolean(v));
      }

      // Counterpart upgrades are fully controlled by unitRestrictions (they are
      // inherently unit-specific).  The API's faction restriction is an artifact
      // of the original "programming" slot classification and can be wrong (e.g.
      // Grogu is marked rebel-alliance but both target units are mercenaries).
      const isCounterpartOverride = UPGRADE_SLOT_OVERRIDES[Number(up.id)] === 'counterpart';

      return {
        apiId: up.id,
        // Upgrade IDs intentionally use slot + name only.
        // Some API entries represent the same physical upgrade card repeated
        // for different unit mappings/restrictions; those should collapse to
        // the same logical upgrade ID.
        id: `${upgradeSlot}-${slugify(up.name)}`,
        name: up.name,
        cost: resolveCost(up),
        upgradeSlot,
        factionRestrictions:    isCounterpartOverride ? [] : (UPGRADE_FACTION_OVERRIDES[Number(up.id)] ?? compact([up.faction_fkey], FACTION_MAP)),
        rankRestrictions:       compact([up.rank_fkey, up.rank_fkey2], RANK_MAP),
        unitTypeRestrictions:   unique(compact([up.unit_type_fkey, up.unit_type_fkey2, up.unit_type_fkey3], UNIT_TYPE_MAP)),
        unitRestrictions:       [up.unit_fkey, up.unit_fkey2, up.unit_fkey3, up.unit_fkey4].filter(isNumber),
        affiliationRestrictions: compact([up.affiliation_fkey], AFFILIATION_MAP),
        alignmentRestriction:   (up.alignment as 'Light' | 'Dark' | null) ?? null,
        unitsDisallowedOn:      up.units_disallowed_on ?? [],
        keywordNames,
        addsUpgradeSlot: Array.from(unlockedByMap.get(Number(up.id)) ?? []),
        requiredUpgradeSlot: up.required_upgrade_type != null
          ? (upgradeTypeIdToSlug.get(Number(up.required_upgrade_type)) ?? null)
          : null,
      };
    })
    .filter(Boolean);

  // 4b. Collision detection and disambiguation (second pass on upgrade IDs).
  //
  // Intentional deduplication: entries that represent the same physical upgrade
  // card scoped to different unit restrictions are allowed to share an ID ("benign
  // duplicates"). These have identical cost, keywordNames, and addsUpgradeSlot.
  //
  // True collisions (different mechanics) must be disambiguated by appending a
  // suffix derived from the first unitRestrictions entry's unit name, or falling
  // back to faction+rank restrictions, or finally the raw apiId.
  //
  // This pass only touches true collisions; benign duplicates are left collapsed.

  // Build apiId → unit name lookup from processedUnits (already resolved above).
  // Use Number() to normalize: raw JSON may produce string IDs which must align
  // with the numeric unit_fkey values stored in unitRestrictions.
  const unitApiIdToName = new Map<number, string>();
  for (const unit of processedUnits as Array<{ apiId: number | string; name: string }>) {
    unitApiIdToName.set(Number(unit.apiId), unit.name);
  }

  // Group processed upgrade entries by their current (base) ID.
  type UpgradeEntry = {
    apiId: number;
    id: string;
    cost: number;
    keywordNames: string[];
    addsUpgradeSlot: string[];
    unitRestrictions: number[];
    factionRestrictions: string[];
    rankRestrictions: string[];
    [key: string]: unknown;
  };

  const upgradesByBaseId = new Map<string, UpgradeEntry[]>();
  for (const up of processedUpgrades as UpgradeEntry[]) {
    if (!upgradesByBaseId.has(up.id)) {
      upgradesByBaseId.set(up.id, []);
    }
    upgradesByBaseId.get(up.id)!.push(up);
  }

  for (const [baseId, group] of upgradesByBaseId) {
    if (group.length <= 1) continue;

    // A collision is "benign" when all entries have identical cost, keywordNames
    // (as sorted set), and addsUpgradeSlot (as sorted set). These represent the
    // same physical card repeated for different unit/restriction mappings.
    const first = group[0];
    const sortedStr = (arr: string[]) => JSON.stringify([...arr].sort());
    const isBenign = group.every(
      (up) =>
        up.cost === first.cost &&
        sortedStr(up.keywordNames) === sortedStr(first.keywordNames) &&
        sortedStr(up.addsUpgradeSlot) === sortedStr(first.addsUpgradeSlot),
    );

    if (isBenign) continue;

    // True collision: each entry gets a disambiguating suffix.
    console.warn(
      `⚠ True ID collision for "${baseId}" (${group.length} entries) — disambiguating...`,
    );
    for (const up of group) {
      let suffix: string;
      if (up.unitRestrictions.length > 0) {
        // Prefer the first unit restriction's human name.
        const unitName = unitApiIdToName.get(up.unitRestrictions[0]);
        suffix = unitName ? slugify(unitName) : String(up.apiId);
      } else if (up.factionRestrictions.length > 0 || up.rankRestrictions.length > 0) {
        // Fall back to faction + rank (already-slugified strings from FACTION_MAP / RANK_MAP).
        const parts = [...up.factionRestrictions, ...up.rankRestrictions];
        suffix = parts.join('-');
      } else {
        // Last resort.
        suffix = String(up.apiId);
      }
      up.id = `${baseId}-${suffix}`;
      console.log(`  apiId ${up.apiId} → "${up.id}"`);
    }
  }

  // 5. Write output
  writeFileSync(
    join(OUT_DIR, 'units.json'),
    JSON.stringify(processedUnits, null, 2),
    'utf-8',
  );
  console.log(`Processed ${processedUnits.length} units → processed/units.json`);

  writeFileSync(
    join(OUT_DIR, 'upgrades.json'),
    JSON.stringify(processedUpgrades, null, 2),
    'utf-8',
  );
  console.log(`Processed ${processedUpgrades.length} upgrades → processed/upgrades.json`);

  // 6. Also write out the keyword map for runtime use
  const keywordMeta = rawKeywords.map((kw: any) => ({
    id: kw.id,
    name: normalizeKeywordName(kw.name),
    hasMagnitude: kw.has_magnitude ?? false,
    isWeaponKeyword: kw.weapon ?? false,
  }));
  writeFileSync(
    join(OUT_DIR, 'keywords.json'),
    JSON.stringify(keywordMeta, null, 2),
    'utf-8',
  );
  console.log(`Processed ${keywordMeta.length} keywords → processed/keywords.json`);
}

processData();
