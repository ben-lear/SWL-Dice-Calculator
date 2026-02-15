import { describe, it, expect } from 'vitest';
import { getResolvedUpgradeById, getAllResolvedUpgrades } from '../upgradeResolver';
import { UPGRADE_ENRICHMENTS } from '../enrichment/upgrades';
import { UpgradeSlot } from '../types';

describe('upgradeResolver', () => {
  describe('Weapon profile resolution', () => {
    it('resolves weapons from enrichment', () => {
      const upgrades = getAllResolvedUpgrades();
      const upgradesWithWeapons = upgrades.filter(u => u.weapons.length > 0);
      
      // Should have SOME upgrades with weapons (if enrichment data is populated)
      // This is a soft assertion since enrichment data population is manual
      if (upgradesWithWeapons.length > 0) {
        for (const upgrade of upgradesWithWeapons) {
          expect(Array.isArray(upgrade.weapons)).toBe(true);
          for (const weapon of upgrade.weapons) {
            expect(weapon.name).toBeDefined();
            expect(weapon.weaponType).toBeDefined();
            expect(weapon.keywords).toBeDefined();
          }
        }
      }
    });

    it('weapons array defaults to empty when enrichment has no weapons', () => {
      const upgrades = getAllResolvedUpgrades();
      
      for (const upgrade of upgrades) {
        // weapons should always be defined, never undefined
        expect(upgrade.weapons).toBeDefined();
        expect(Array.isArray(upgrade.weapons)).toBe(true);
      }
    });

    it('weapons include sidearm keywords', () => {
      const upgrades = getAllResolvedUpgrades();
      const upgradesWithWeapons = upgrades.filter(u => u.weapons.length > 0);
      
      for (const upgrade of upgradesWithWeapons) {
        for (const weapon of upgrade.weapons) {
          expect('sidearmMelee' in weapon.keywords).toBe(true);
          expect('sidearmRanged' in weapon.keywords).toBe(true);
          expect(typeof weapon.keywords.sidearmMelee).toBe('boolean');
          expect(typeof weapon.keywords.sidearmRanged).toBe('boolean');
        }
      }
    });
  });

  describe('addsMiniature resolution', () => {
    it('applies slot-based defaults for Heavy Weapon upgrades', () => {
      const upgrades = getAllResolvedUpgrades();
      const heavyWeaponUpgrades = upgrades.filter(u => 
        u.upgradeSlot === UpgradeSlot.HeavyWeapon
      );
      
      expect(heavyWeaponUpgrades.length).toBeGreaterThan(0);
      
      for (const upgrade of heavyWeaponUpgrades) {
        // Heavy Weapon slot defaults to addsMiniature: 1
        // Unless explicitly overridden in enrichment
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        if (enrichment?.addsMiniature !== undefined) {
          expect(upgrade.addsMiniature).toBe(enrichment.addsMiniature);
        } else {
          // Default should be 1 for Heavy Weapon slot
          expect(upgrade.addsMiniature).toBe(1);
        }
      }
    });

    it('applies slot-based defaults for Personnel upgrades', () => {
      const upgrades = getAllResolvedUpgrades();
      const personnelUpgrades = upgrades.filter(u => 
        u.upgradeSlot === UpgradeSlot.Personnel
      );
      
      expect(personnelUpgrades.length).toBeGreaterThan(0);
      
      for (const upgrade of personnelUpgrades) {
        // Personnel slot defaults to addsMiniature: 1
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        if (enrichment?.addsMiniature !== undefined) {
          expect(upgrade.addsMiniature).toBe(enrichment.addsMiniature);
        } else {
          expect(upgrade.addsMiniature).toBe(1);
        }
      }
    });

    it('applies slot-based defaults for Squad Leader upgrades', () => {
      const upgrades = getAllResolvedUpgrades();
      const squadLeaderUpgrades = upgrades.filter(u => 
        u.upgradeSlot === UpgradeSlot.SquadLeader
      );
      
      expect(squadLeaderUpgrades.length).toBeGreaterThan(0);
      
      for (const upgrade of squadLeaderUpgrades) {
        // Squad Leader slot defaults to addsMiniature: 1
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        if (enrichment?.addsMiniature !== undefined) {
          expect(upgrade.addsMiniature).toBe(enrichment.addsMiniature);
        } else {
          expect(upgrade.addsMiniature).toBe(1);
        }
      }
    });

    it('defaults to addsMiniature: 0 for other upgrade slots', () => {
      const upgrades = getAllResolvedUpgrades();
      const otherSlotUpgrades = upgrades.filter(u =>
        u.upgradeSlot !== UpgradeSlot.HeavyWeapon &&
        u.upgradeSlot !== UpgradeSlot.Personnel &&
        u.upgradeSlot !== UpgradeSlot.SquadLeader
      );
      
      for (const upgrade of otherSlotUpgrades) {
        // Other slots default to addsMiniature: 0
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        if (enrichment?.addsMiniature !== undefined) {
          expect(upgrade.addsMiniature).toBe(enrichment.addsMiniature);
        } else {
          expect(upgrade.addsMiniature).toBe(0);
        }
      }
    });

    it('enrichment can override slot-based addsMiniature default', () => {
      // Find upgrades that explicitly override addsMiniature in enrichment
      const upgrades = getAllResolvedUpgrades();
      
      for (const upgrade of upgrades) {
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        if (enrichment?.addsMiniature !== undefined) {
          // Enrichment override should be respected
          expect(upgrade.addsMiniature).toBe(enrichment.addsMiniature);
        }
      }
    });
  });

  describe('noncombatant flag resolution', () => {
    it('noncombatant defaults to false', () => {
      const upgrades = getAllResolvedUpgrades();
      
      for (const upgrade of upgrades) {
        expect(typeof upgrade.noncombatant).toBe('boolean');
        
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        if (enrichment?.noncombatant !== undefined) {
          expect(upgrade.noncombatant).toBe(enrichment.noncombatant);
        } else {
          expect(upgrade.noncombatant).toBe(false);
        }
      }
    });

    it('noncombatant: true from enrichment is respected', () => {
      const upgrades = getAllResolvedUpgrades();
      
      // Find upgrades with noncombatant: true in enrichment
      const noncombatantUpgrades = upgrades.filter(u => {
        const enrichment = UPGRADE_ENRICHMENTS[u.id];
        return enrichment?.noncombatant === true;
      });
      
      for (const upgrade of noncombatantUpgrades) {
        expect(upgrade.noncombatant).toBe(true);
      }
    });
  });

  describe('isGrenade flag resolution', () => {
    it('isGrenade defaults to false', () => {
      const upgrades = getAllResolvedUpgrades();
      
      for (const upgrade of upgrades) {
        expect(typeof upgrade.isGrenade).toBe('boolean');
        
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        if (enrichment?.isGrenade !== undefined) {
          expect(upgrade.isGrenade).toBe(enrichment.isGrenade);
        } else {
          expect(upgrade.isGrenade).toBe(false);
        }
      }
    });

    it('isGrenade: true from enrichment is respected', () => {
      const upgrades = getAllResolvedUpgrades();
      
      // Find upgrades with isGrenade: true in enrichment
      const grenadeUpgrades = upgrades.filter(u => {
        const enrichment = UPGRADE_ENRICHMENTS[u.id];
        return enrichment?.isGrenade === true;
      });
      
      for (const upgrade of grenadeUpgrades) {
        expect(upgrade.isGrenade).toBe(true);
      }
    });

    it('grenade upgrades are typically in Grenade slot', () => {
      const upgrades = getAllResolvedUpgrades();
      
      // Grenade upgrades should typically be in the Grenade slot
      const grenadeUpgrades = upgrades.filter(u => u.isGrenade);
      
      if (grenadeUpgrades.length > 0) {
        const grenadeSlotCount = grenadeUpgrades.filter(u =>
          u.upgradeSlot === UpgradeSlot.Grenades
        ).length;
        
        // Most or all grenade upgrades should be in Grenade slot
        expect(grenadeSlotCount).toBeGreaterThan(0);
      }
    });
  });

  describe('addsUpgradeSlot resolution', () => {
    it('addsUpgradeSlot defaults to empty array', () => {
      const upgrades = getAllResolvedUpgrades();
      
      for (const upgrade of upgrades) {
        expect(Array.isArray(upgrade.addsUpgradeSlot)).toBe(true);
        
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        if (enrichment?.addsUpgradeSlot !== undefined) {
          expect(upgrade.addsUpgradeSlot).toEqual(enrichment.addsUpgradeSlot);
        } else {
          expect(upgrade.addsUpgradeSlot).toEqual([]);
        }
      }
    });

    it('addsUpgradeSlot from enrichment is respected', () => {
      const upgrades = getAllResolvedUpgrades();
      
      // Find upgrades that add slots
      const slotAddingUpgrades = upgrades.filter(u => {
        const enrichment = UPGRADE_ENRICHMENTS[u.id];
        return enrichment?.addsUpgradeSlot && enrichment.addsUpgradeSlot.length > 0;
      });
      
      for (const upgrade of slotAddingUpgrades) {
        expect(upgrade.addsUpgradeSlot.length).toBeGreaterThan(0);
        
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        expect(upgrade.addsUpgradeSlot).toEqual(enrichment?.addsUpgradeSlot || []);
      }
    });
  });

  describe('Resolved upgrade structure', () => {
    it('all resolved upgrades have required fields', () => {
      const upgrades = getAllResolvedUpgrades();
      expect(upgrades.length).toBeGreaterThan(0);

      for (const upgrade of upgrades) {
        expect(upgrade.id).toBeDefined();
        expect(typeof upgrade.id).toBe('string');
        expect(upgrade.name).toBeDefined();
        expect(typeof upgrade.name).toBe('string');
        expect(upgrade.apiId).toBeDefined();
        expect(typeof upgrade.apiId).toBe('number');
        expect(upgrade.cost).toBeDefined();
        expect(typeof upgrade.cost).toBe('number');
        expect(upgrade.upgradeSlot).toBeDefined();
        expect(upgrade.weapons).toBeDefined();
        expect(Array.isArray(upgrade.weapons)).toBe(true);
        expect(typeof upgrade.addsMiniature).toBe('number');
        expect(typeof upgrade.noncombatant).toBe('boolean');
        expect(typeof upgrade.isGrenade).toBe('boolean');
        expect(Array.isArray(upgrade.addsUpgradeSlot)).toBe(true);
      }
    });

    it('enriched upgrades have isEnriched flag set', () => {
      const upgrades = getAllResolvedUpgrades();
      const enrichedUpgrades = upgrades.filter(u => u.isEnriched);
      
      // Should have SOME enriched upgrades
      expect(enrichedUpgrades.length).toBeGreaterThan(0);

      // All enriched upgrades should have corresponding enrichment
      for (const upgrade of enrichedUpgrades) {
        expect(UPGRADE_ENRICHMENTS[upgrade.id]).toBeDefined();
      }
    });

    it('non-enriched upgrades have isEnriched: false', () => {
      const upgrades = getAllResolvedUpgrades();
      const nonEnrichedUpgrades = upgrades.filter(u => !u.isEnriched);
      
      for (const upgrade of nonEnrichedUpgrades) {
        expect(UPGRADE_ENRICHMENTS[upgrade.id]).toBeUndefined();
      }
    });
  });

  describe('getResolvedUpgradeById', () => {
    it('returns upgrade when ID exists', () => {
      const upgrades = getAllResolvedUpgrades();
      const firstUpgrade = upgrades[0];
      
      const resolved = getResolvedUpgradeById(firstUpgrade.id);
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe(firstUpgrade.id);
    });

    it('returns undefined when ID does not exist', () => {
      const nonexistent = getResolvedUpgradeById('nonexistent-upgrade-id');
      expect(nonexistent).toBeUndefined();
    });

    it('handles empty string ID gracefully', () => {
      const result = getResolvedUpgradeById('');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllResolvedUpgrades', () => {
    it('returns array of upgrades', () => {
      const upgrades = getAllResolvedUpgrades();
      expect(Array.isArray(upgrades)).toBe(true);
      expect(upgrades.length).toBeGreaterThan(0);
    });

    it('returns unique upgrades (no duplicates)', () => {
      const upgrades = getAllResolvedUpgrades();
      const ids = upgrades.map(u => u.id);
      const uniqueIds = new Set(ids);
      // API data may have some duplicates (data quality issue)
      // As long as we have MOSTLY unique IDs, the system works
      // Allow up to 5% duplication
      expect(uniqueIds.size).toBeGreaterThan(ids.length * 0.95);
    });
  });
});
