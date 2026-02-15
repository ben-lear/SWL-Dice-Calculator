/**
 * Test script for keyword mapping utilities
 */

import { getKeywordStats, getKeyword, hasKeyword, getMagnitudeKeywords, getWeaponKeywords } from '../src/data/keywordMap.js';

async function testKeywordMap() {
  console.log('=== Keyword Mapping Test ===');
  
  // Test statistics
  const stats = getKeywordStats();
  console.log('\nKeyword Statistics:', stats);
  
  // Test lookups
  console.log('\n=== Keyword Lookups ===');
  console.log('Agile keyword:', getKeyword('Agile'));
  console.log('Pierce keyword exists:', hasKeyword('Pierce'));
  console.log('Impact keyword exists:', hasKeyword('Impact'));
  
  // Test categories
  console.log('\n=== Magnitude Keywords (first 5) ===');
  const magnitudeKeywords = getMagnitudeKeywords();
  console.log(magnitudeKeywords.slice(0, 5));
  
  console.log('\n=== Weapon Keywords (first 5) ===');
  const weaponKeywords = getWeaponKeywords();
  console.log(weaponKeywords.slice(0, 5));
}

testKeywordMap().catch(console.error);