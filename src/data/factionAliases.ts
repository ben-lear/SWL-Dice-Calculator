/**
 * Faction alias mapping — translates list-builder faction strings
 * to the app's Faction enum.
 */

import { Faction } from './presets';

/** Direct alias mapping from various list-builder faction strings */
const FACTION_ALIASES: Record<string, Faction> = {
  // Tabletop Admiral short names
  'empire': Faction.GalacticEmpire,
  'rebels': Faction.RebelAlliance,
  'republic': Faction.Republic,
  'separatists': Faction.SeparatistAlliance,
  'mercenary': Faction.Mercenaries,
  // Full display names
  'galactic empire': Faction.GalacticEmpire,
  'rebel alliance': Faction.RebelAlliance,
  'galactic republic': Faction.Republic,
  'separatist alliance': Faction.SeparatistAlliance,
  'mercenaries': Faction.Mercenaries,
  // Normalized slug forms
  'galactic-empire': Faction.GalacticEmpire,
  'rebel-alliance': Faction.RebelAlliance,
  'separatist-alliance': Faction.SeparatistAlliance,
  // Additional variants
  'imperial': Faction.GalacticEmpire,
  'rebel': Faction.RebelAlliance,
  'separatist': Faction.SeparatistAlliance,
  'cis': Faction.SeparatistAlliance,
  'gar': Faction.Republic,
};

/** Battle force names → their owning faction */
const BATTLE_FORCE_FACTION: Record<string, Faction> = {
  'shadow collective': Faction.Mercenaries,
  'bright tree village': Faction.RebelAlliance,
  'echo base defenders': Faction.RebelAlliance,
  'blizzard force': Faction.GalacticEmpire,
  'tempest force': Faction.GalacticEmpire,
  'imperial remnant': Faction.GalacticEmpire,
  '501st legion': Faction.Republic,
  'experimental droids': Faction.SeparatistAlliance,
};

/**
 * Resolve a faction string from list-builder JSON to our Faction enum.
 * Tries direct alias match first, then battleForce lookup.
 * Returns null if unrecognized.
 */
export function resolveFaction(
  armyFaction?: string | null,
  battleForce?: string | null,
): Faction | null {
  // Try direct faction alias
  if (armyFaction) {
    const normalized = armyFaction.toLowerCase().trim();
    const match = FACTION_ALIASES[normalized];
    if (match) return match;
  }

  // Try battleForce mapping
  if (battleForce) {
    const normalizedBf = battleForce.toLowerCase().trim();
    const bfMatch = BATTLE_FORCE_FACTION[normalizedBf];
    if (bfMatch) return bfMatch;
  }

  return null;
}
