/**
 * Check keyword names for enrichment data
 */

import { getKeywordsByCategory } from '../src/data/keywordMap.js';

function checkEnrichmentKeywords() {
  const categories = getKeywordsByCategory();

  console.log('=== Keywords Used in Enrichment ===');
  const enrichmentKeywords = ['Immune: Pierce', 'Deflect', 'Pierce X', 'Impact X', 'Armor [X]', 'Shielded', 'Precise'];

  for (const keyword of enrichmentKeywords) {
    const found = categories.all.find(k => k.name === keyword);
    if (found) {
      console.log('✓ Found:', found.name);
    } else {
      console.log('✗ Not found:', keyword);
      const similar = categories.all.filter(k => k.name.toLowerCase().includes(keyword.toLowerCase().split(' ')[0]));
      if (similar.length > 0) {
        console.log('  Similar:', similar.map(k => k.name).slice(0, 3).join(', '));
      }
    }
  }

  // Also look for specific keyword patterns
  console.log('\n=== All Keywords containing "armor" ===');
  const armorKeywords = categories.all.filter(k => k.name.toLowerCase().includes('armor'));
  armorKeywords.forEach(k => console.log(`  - ${k.name}`));

  console.log('\n=== All Keywords containing "shield" ===');
  const shieldKeywords = categories.all.filter(k => k.name.toLowerCase().includes('shield'));
  shieldKeywords.forEach(k => console.log(`  - ${k.name}`));
}

checkEnrichmentKeywords();