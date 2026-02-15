/**
 * Check upgrade enrichment keywords
 */

import { getKeywordsByCategory } from '../src/data/keywordMap.js';

function checkUpgradeKeywords() {
  const categories = getKeywordsByCategory();

  console.log('=== Upgrade Enrichment Keywords ===');
  const upgradeKeywords = ['Force Push', 'Saber Throw', 'Force Reflexes', 'Tenacity', 'Duck and Cover', 'Offensive Push', 'Blast', 'Dug In'];

  for (const keyword of upgradeKeywords) {
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
}

checkUpgradeKeywords();