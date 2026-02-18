/**
 * Fetch raw data from the TableTopAdmiral API and save to src/data/raw/.
 *
 * Usage: npx tsx scripts/fetchApiData.ts
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = 'https://tabletopadmiral.com/api';
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'raw');

const ENDPOINTS: { name: string; path: string }[] = [
  { name: 'units', path: '/units/2' },
  { name: 'keywords', path: '/keywords' },
  { name: 'upgrades', path: '/upgrades' },
  { name: 'upgrade-types', path: '/upgrade-types' },
  { name: 'factions', path: '/factions' },
  { name: 'affiliations', path: '/affiliations' },
  { name: 'unit-types', path: '/unit-types' },
  { name: 'ranks', path: '/ranks' },
];

async function fetchAndSave() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const endpoint of ENDPOINTS) {
    const url = `${API_BASE}${endpoint. path}`;
    console.log(`Fetching ${url}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const outputPath = join(OUTPUT_DIR, `${endpoint.name}.json`);
    writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  → Saved ${Array.isArray(data) ? data.length : '?'} entries to ${outputPath}`);
  }

  console.log('Done.');
}

fetchAndSave().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
