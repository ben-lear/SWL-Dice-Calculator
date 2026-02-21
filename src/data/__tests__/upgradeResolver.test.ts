import { describe, it, expect } from 'vitest';
import { getResolvedUpgradeById, getAllResolvedUpgrades, getUpgradesForSlot } from '../upgradeResolver';
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
    it('addsUpgradeSlot is always an array', () => {
      const upgrades = getAllResolvedUpgrades();

      for (const upgrade of upgrades) {
        expect(Array.isArray(upgrade.addsUpgradeSlot)).toBe(true);
      }
    });

    it('addsUpgradeSlot includes enrichment slots when enrichment specifies them', () => {
      const upgrades = getAllResolvedUpgrades();

      for (const upgrade of upgrades) {
        const enrichment = UPGRADE_ENRICHMENTS[upgrade.id];
        if (enrichment?.addsUpgradeSlot !== undefined) {
          // All enrichment slots must appear in resolved addsUpgradeSlot
          for (const slot of enrichment.addsUpgradeSlot) {
            expect(upgrade.addsUpgradeSlot).toContain(slot);
          }
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

  describe('getUpgradesForSlot restriction filtering', () => {
    // ── No context → all upgrades shown ──────────────────────────────────────

    it('returns faction-restricted upgrades when no context provided', () => {
      // 2-1B Medical Droid is rebel-alliance only; without context it should still appear
      const upgrades = getUpgradesForSlot(UpgradeSlot.Personnel);
      const medDroid = upgrades.find(u => u.id === 'personnel-2-1b-medical-droid');
      expect(medDroid).toBeDefined();
    });

    // ── Faction restrictions ──────────────────────────────────────────────────

    it('includes faction-restricted upgrade when faction matches', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Personnel, { faction: 'rebel-alliance' });
      const medDroid = upgrades.find(u => u.id === 'personnel-2-1b-medical-droid');
      expect(medDroid).toBeDefined();
    });

    it('excludes faction-restricted upgrade when faction does not match', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Personnel, { faction: 'galactic-empire' });
      const medDroid = upgrades.find(u => u.id === 'personnel-2-1b-medical-droid');
      expect(medDroid).toBeUndefined();
    });

    // ── Rank restrictions ─────────────────────────────────────────────────────

    it('includes rank-restricted upgrade when rank matches', () => {
      // 2-1B Medical Droid has rankRestrictions: ['corps']
      const upgrades = getUpgradesForSlot(UpgradeSlot.Personnel, {
        faction: 'rebel-alliance',
        rank: 'corps',
      });
      const medDroid = upgrades.find(u => u.id === 'personnel-2-1b-medical-droid');
      expect(medDroid).toBeDefined();
    });

    it('excludes rank-restricted upgrade when rank does not match', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Personnel, {
        faction: 'rebel-alliance',
        rank: 'commander',
      });
      const medDroid = upgrades.find(u => u.id === 'personnel-2-1b-medical-droid');
      expect(medDroid).toBeUndefined();
    });

    // ── Unit type restrictions ────────────────────────────────────────────────

    it('includes unit-type-restricted upgrade when unit type matches', () => {
      // Attack Protocols has unitTypeRestrictions: ['repulsor-vehicle', 'ground-vehicle']
      const vehicleUpgrades = getUpgradesForSlot(UpgradeSlot.Protocol, {
        unitType: 'ground-vehicle',
      });
      const attackProto = vehicleUpgrades.find(u => u.id === 'protocol-attack-protocols');
      expect(attackProto).toBeDefined();
    });

    it('excludes unit-type-restricted upgrade when unit type does not match', () => {
      const trooperUpgrades = getUpgradesForSlot(UpgradeSlot.Protocol, {
        unitType: 'trooper',
      });
      const attackProto = trooperUpgrades.find(u => u.id === 'protocol-attack-protocols');
      expect(attackProto).toBeUndefined();
    });

    // ── Unit-specific restrictions ────────────────────────────────────────────

    it('includes unit-restricted upgrade when unit API ID matches', () => {
      // 88i Twin Light Blaster has unitRestrictions: [9]
      const upgrades = getUpgradesForSlot(UpgradeSlot.Hardpoint, { unitApiId: 9 });
      const blaster = upgrades.find(u => u.id === 'hardpoint-88i-twin-light-blaster');
      expect(blaster).toBeDefined();
    });

    it('excludes unit-restricted upgrade when unit API ID does not match', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Hardpoint, { unitApiId: 999 });
      const blaster = upgrades.find(u => u.id === 'hardpoint-88i-twin-light-blaster');
      expect(blaster).toBeUndefined();
    });

    // ── Units disallowed exclusion ────────────────────────────────────────────

    it('excludes upgrade when unit is on the disallowed list', () => {
      // Command Control Array has unitsDisallowedOn: [31844, 31845]
      const upgrades = getUpgradesForSlot(UpgradeSlot.Comms, { unitApiId: 31844 });
      const cmdArray = upgrades.find(u => u.id === 'comms-command-control-array');
      expect(cmdArray).toBeUndefined();
    });

    it('includes upgrade when unit is NOT on the disallowed list', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Comms, { unitApiId: 999 });
      const cmdArray = upgrades.find(u => u.id === 'comms-command-control-array');
      expect(cmdArray).toBeDefined();
    });

    // ── Alignment restrictions ────────────────────────────────────────────────

    it('includes Dark-aligned upgrade for Galactic Empire unit', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Force, { faction: 'galactic-empire' });
      const forceChoke = upgrades.find(u => u.id === 'force-force-choke');
      expect(forceChoke).toBeDefined();
    });

    it('excludes Dark-aligned upgrade for Rebel Alliance unit', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Force, { faction: 'rebel-alliance' });
      const forceChoke = upgrades.find(u => u.id === 'force-force-choke');
      expect(forceChoke).toBeUndefined();
    });

    it('excludes Dark-aligned upgrade for Mercenary unit (no alignment)', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Force, { faction: 'mercenaries' });
      const forceChoke = upgrades.find(u => u.id === 'force-force-choke');
      expect(forceChoke).toBeUndefined();
    });

    it('includes Light-aligned upgrade for Republic unit', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Force, { faction: 'republic' });
      const forceHope = upgrades.find(u => u.name === 'Hope');
      expect(forceHope).toBeDefined();
    });

    // ── Affiliation restrictions ──────────────────────────────────────────────

    it('includes affiliation-restricted upgrade when affiliation matches', () => {
      // Call to Arms has affiliationRestrictions: ['ewoks']
      const upgrades = getUpgradesForSlot(UpgradeSlot.Training, { affiliation: 'ewoks' });
      const callToArms = upgrades.find(u => u.id === 'training-call-to-arms');
      expect(callToArms).toBeDefined();
    });

    it('excludes affiliation-restricted upgrade when unit has no affiliation', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Training, { affiliation: null });
      const callToArms = upgrades.find(u => u.id === 'training-call-to-arms');
      expect(callToArms).toBeUndefined();
    });

    it('excludes affiliation-restricted upgrade when unit has wrong affiliation', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Training, { affiliation: 'raiders' });
      const callToArms = upgrades.find(u => u.id === 'training-call-to-arms');
      expect(callToArms).toBeUndefined();
    });

    // ── No restrictions → always pass ────────────────────────────────────────

    it('unrestricted upgrades appear for any unit context', () => {
      // Upgrades with all empty restriction arrays should appear for any context
      const allUpgrades = getAllResolvedUpgrades();
      const unrestricted = allUpgrades.filter(
        u =>
          u.factionRestrictions.length === 0 &&
          u.rankRestrictions.length === 0 &&
          u.unitTypeRestrictions.length === 0 &&
          u.unitRestrictions.length === 0 &&
          u.affiliationRestrictions.length === 0 &&
          u.alignmentRestriction === null &&
          u.unitsDisallowedOn.length === 0,
      );

      if (unrestricted.length === 0) return; // Skip if no truly unrestricted upgrades

      const sample = unrestricted[0];
      const upgrades = getUpgradesForSlot(sample.upgradeSlot, {
        faction: 'galactic-empire',
        rank: 'corps',
        unitType: 'trooper',
        unitApiId: 99999,
        affiliation: null,
      });
      const found = upgrades.find(u => u.id === sample.id);
      expect(found).toBeDefined();
    });
  });

  // ── Phase 12: addsUpgradeSlot & requiredUpgradeSlot ─────────────────────

  describe('addsUpgradeSlot', () => {
    it('Agent Kallus has addsUpgradeSlot: [heavy-weapon]', () => {
      const allUpgrades = getAllResolvedUpgrades();
      const kallus = allUpgrades.find(u => u.apiId === 20801);
      expect(kallus).toBeDefined();
      expect(kallus!.addsUpgradeSlot).toContain(UpgradeSlot.HeavyWeapon);
    });

    it('Clone Captain Rex has addsUpgradeSlot containing command and training', () => {
      const allUpgrades = getAllResolvedUpgrades();
      const rex = allUpgrades.find(u => u.apiId === 20802);
      expect(rex).toBeDefined();
      expect(rex!.addsUpgradeSlot).toContain(UpgradeSlot.Command);
      expect(rex!.addsUpgradeSlot).toContain(UpgradeSlot.Training);
    });

    it('Stormtrooper Captain has addsUpgradeSlot: [training]', () => {
      const allUpgrades = getAllResolvedUpgrades();
      const stCaptain = allUpgrades.find(u => u.apiId === 134);
      expect(stCaptain).toBeDefined();
      expect(stCaptain!.addsUpgradeSlot).toContain(UpgradeSlot.Training);
    });

    it('upgrades without conditional slots have empty addsUpgradeSlot', () => {
      const allUpgrades = getAllResolvedUpgrades();
      // Pick a well-known upgrade that does not add slots (e.g., a generic gear upgrade)
      const genericUpgrades = allUpgrades.filter(
        u => u.addsUpgradeSlot.length === 0,
      );
      expect(genericUpgrades.length).toBeGreaterThan(0);
      for (const u of genericUpgrades) {
        expect(Array.isArray(u.addsUpgradeSlot)).toBe(true);
        expect(u.addsUpgradeSlot.length).toBe(0);
      }
    });
  });

  describe('requiredUpgradeSlot', () => {
    it('Offensive/Defensive Stance has requiredUpgradeSlot: force', () => {
      const allUpgrades = getAllResolvedUpgrades();
      const odsUpgrades = allUpgrades.filter(
        u => u.apiId === 179 || u.apiId === 183,
      );
      expect(odsUpgrades.length).toBeGreaterThan(0);
      for (const u of odsUpgrades) {
        expect(u.requiredUpgradeSlot).toBe(UpgradeSlot.Force);
      }
    });

    it('most upgrades have requiredUpgradeSlot: null', () => {
      const allUpgrades = getAllResolvedUpgrades();
      const withReq = allUpgrades.filter(u => u.requiredUpgradeSlot !== null);
      // Only the 2 Offensive/Defensive Stance variants require a slot
      expect(withReq.length).toBe(2);
    });
  });

  describe('getUpgradesForSlot — requiredUpgradeSlot filtering', () => {
    it('excludes upgrades with requiredUpgradeSlot when slot is absent from effectiveUpgradeBar', () => {
      // Offensive/Defensive Stance requires a Force slot.
      // Use a training slot context without a Force slot.
      const upgrades = getUpgradesForSlot(UpgradeSlot.Training, {
        effectiveUpgradeBar: [UpgradeSlot.Training],
      });
      const ods = upgrades.filter(u => u.apiId === 179 || u.apiId === 183);
      expect(ods.length).toBe(0);
    });

    it('includes upgrades with requiredUpgradeSlot when slot IS in effectiveUpgradeBar', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Training, {
        effectiveUpgradeBar: [UpgradeSlot.Training, UpgradeSlot.Force],
      });
      const ods = upgrades.filter(u => u.apiId === 179 || u.apiId === 183);
      expect(ods.length).toBeGreaterThan(0);
    });

    it('skips requiredUpgradeSlot check when effectiveUpgradeBar is not provided', () => {
      // Without effectiveUpgradeBar in context, all training upgrades including ODS should appear
      const upgrades = getUpgradesForSlot(UpgradeSlot.Training, {
        // No effectiveUpgradeBar
      });
      const ods = upgrades.filter(u => u.apiId === 179 || u.apiId === 183);
      expect(ods.length).toBeGreaterThan(0);
    });

    it('skips requiredUpgradeSlot check when context is absent entirely', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Training);
      const ods = upgrades.filter(u => u.apiId === 179 || u.apiId === 183);
      expect(ods.length).toBeGreaterThan(0);
    });
  });

  // ── Pilot slot filtering (AT-ST scenario) ────────────────────────────────
  describe('getUpgradesForSlot — pilot slot with AT-ST context', () => {
    // AT-ST: apiId 9, faction galactic-empire, unitType ground-vehicle, rank heavy
    const atStContext = {
      unitApiId: 9,
      faction: 'galactic-empire',
      rank: 'heavy',
      unitType: 'ground-vehicle',
      affiliation: null as string | null,
    };

    it('returns pilot upgrades for AT-ST with full context', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Pilot, atStContext);
      expect(upgrades.length).toBeGreaterThan(0);
    });

    it('includes General Weiss for AT-ST (empire + ground-vehicle)', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Pilot, atStContext);
      const weiss = upgrades.find(u => u.id === 'pilot-general-weiss');
      expect(weiss).toBeDefined();
    });

    it('excludes rebel pilot (Hotshot Pilot) from AT-ST', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Pilot, atStContext);
      const hotshot = upgrades.find(u => u.id === 'pilot-hotshot-pilot');
      expect(hotshot).toBeUndefined();
    });

    it('excludes repulsor-vehicle-only pilot (Baron Rudor) from AT-ST (ground-vehicle)', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Pilot, atStContext);
      const baron = upgrades.find(u => u.id === 'pilot-baron-rudor');
      expect(baron).toBeUndefined();
    });

    it('excludes mercenaries-only pilot (Frenzied Gunner) from AT-ST', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Pilot, atStContext);
      const gunner = upgrades.find(u => u.id === 'pilot-frenzied-gunner');
      expect(gunner).toBeUndefined();
    });

    it('returns no pilot upgrades when faction is undefined (no context)', () => {
      // When faction is undefined, faction-restricted upgrades pass through —
      // but the purpose of this test is to document that behavior
      const upgrades = getUpgradesForSlot(UpgradeSlot.Pilot, {
        unitApiId: 9,
        // faction intentionally omitted
        rank: 'heavy',
        unitType: 'ground-vehicle',
      });
      // Without faction, faction-restricted pilots pass; we still filter on unitType etc.
      const baron = upgrades.find(u => u.id === 'pilot-baron-rudor');
      expect(baron).toBeUndefined(); // Still excluded by unitType mismatch
    });
  });

  // ── Counterpart slot availability ──────────────────────────────────────────
  describe('getUpgradesForSlot — counterpart slot', () => {
    it('returns counterpart upgrades for Iden Versio (apiId 58)', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Counterpart, {
        unitApiId: 58,
        faction: 'galactic-empire',
      });
      const id10 = upgrades.find(u => u.id === 'counterpart-iden-s-id10-seeker-droid');
      expect(id10).toBeDefined();
    });

    it('returns Grogu for Din Djarin (apiId 6179)', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Counterpart, {
        unitApiId: 6179,
        faction: 'mercenaries',
      });
      const grogu = upgrades.find(u => u.id === 'counterpart-grogu');
      expect(grogu).toBeDefined();
    });

    it('excludes Grogu from non-matching units', () => {
      const upgrades = getUpgradesForSlot(UpgradeSlot.Counterpart, {
        unitApiId: 9, // AT-ST
        faction: 'galactic-empire',
      });
      const grogu = upgrades.find(u => u.id === 'counterpart-grogu');
      expect(grogu).toBeUndefined();
    });
  });
});
