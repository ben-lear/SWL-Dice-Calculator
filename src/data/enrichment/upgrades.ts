/**
 * Upgrade enrichment data skeleton generated from raw API keywords.
 *
 * - Includes all processed upgrades.
 * - Boolean keywords are set to true.
 * - Numeric (X) keywords are set to '<need human>'.
 */

import { AttackType, DefenseDieColor, DefenseSurgeChart } from '../../engine';
import type { UpgradeEnrichment } from './types';

export const UPGRADE_ENRICHMENTS: Record<string, UpgradeEnrichment> = {
  'armament-a-180': {
    keywords: {
      reconfigure: true,
    },
  },

  'armament-a-300': {
    keywords: {
      reconfigure: true,
    },
  },

  'armament-a280-rifle-config': {
    keywords: {
      reconfigure: true,
    },
    weapons: [
      {
        name: 'A280 Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 1,
        maxRange: Infinity,
        keywords: {
          highVelocity: true,
          cumbersome: true,
          pierceX: 1
        }
      },
      {
        name: 'A280 Pistol',
        weaponType: AttackType.Ranged,
        redDice: 2,
        blackDice: 1,
        maxRange: 2,
        keywords: {
          longshot: true,
          pierceX: 1
        }
      }
    ]
  },

  'armament-beskar-spear': {
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [
      {
        name: 'Beskar Spear',
        weaponType: AttackType.Melee,
        redDice: 2,
        blackDice: 1,
      }
    ]
  },

  'armament-bx-deflector-shields': {
    keywords: {
      shieldedX: 2,
      rechargeX: 2,
    },
  },

  'armament-bx-vibroswords': {
    keywords: {
      charge: true,
    },
    weapons: [
      {
        name: 'Vibroswords',
        weaponType: AttackType.Melee,
        redDice: 1,
        whiteDice: 1,
      }
    ]
  },

  'armament-cr-24-flame-rifle': {
    weapons: [
      {
        name: 'CR-24 Flame Rifle',
        weaponType: AttackType.Hybrid,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 1,
        keywords: {
          blast: true,
          spray: true,
        }
      }
    ]
  },

  'armament-dc-17m-icws-config': {
    keywords: {
      reconfigure: true,
    },
    weapons: [
      {
        name: 'DC-17m ICWS Launcher',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          impactX: 1,
          scatter: true,
          exhaust: true
        }
      },
      {
        name: 'DC-17m IDWS Sniper',
        weaponType: AttackType.Ranged,
        redDice: 1,
        minRange: 3,
        maxRange: 4,
        keywords: {
          highVelocity: true,
          lethalX: 1,
          exhaust: true
        }
      }
    ]
  },

  'armament-din-s-amban-rifle': {
    weapons: [
      {
        name: 'Din\'s Amban Rifle',
        weaponType: AttackType.Melee,
        blackDice: 3,
        keywords: {
          immobilizeX: 2,
          suppressive: true,
        }
      }
    ]
  },

  'armament-double-bladed-lightsaber': {
    keywords: {
      charge: true,
      tacticalX: 1
    },
    weapons: [
      {
        name: 'Double-Bladed Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 1,
        whiteDice: 3,
        blackDice: 2,
        keywords: {
          ramX: 1,
          impactX: 2,
          pierceX: 1
        }
      }
    ]
  },

  'armament-e-11d': {
    keywords: {
      reconfigure: true,
    },
    weapons: [
      {
        name: 'E-11D Focused Fire',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 4,
        keywords: {
          suppressive: true,
          exhaust: true
        }
      },
      {
        name: 'E-11D Grenade Launcher',
        weaponType: AttackType.Ranged,
        redDice: 1,
        maxRange: 2,
        keywords: {
          blast: true,
          exhaust: true
        }
      }
    ]
  },

  'armament-electro-gauntlets': {
    weapons: [
      {
        name: 'Electro Gauntlets',
        weaponType: AttackType.Melee,
        redDice: 4,
        keywords: {
          suppressive: true,
          immobilizeX: 3,
          exhaust: true
        }
      }
    ]
  },

  'armament-electrostaff': {
    keywords: {
      immuneMeleePierce: true,
      charge: true
    },
    weapons: [
      {
        name: 'Electrostaff',
        weaponType: AttackType.Melee,
        redDice: 2,
        whiteDice: 2,
        blackDice: 2,
        keywords: {
          criticalX: 1
        }
      }
    ]
  },

  'armament-heavy-arm-cannon': {
    weapons: [
      {
        name: 'Heavy Arm Cannon',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 3,
        maxRange: 2,
        keywords: {
          suppressive: true,
        },
      }
    ]
  },

  // Imperial Agent / Imperial Officer variant (Sharpshooter 1, Target 1, cost 5)
  'armament-heavy-blaster-pistol-imperial-agent': {
    keywords: {
      sharpshooterX: 1,
      targetX: 1,
    },
    weapons: [
      {
        name: 'Heavy Blaster Pistol',
        weaponType: AttackType.Ranged,
        redDice: 2,
        maxRange: 2,
        keywords: {
          lethalX: 1,
          highVelocity: true,
        }
      }
    ]
  },

  // Rebel Officer / Rebel Agent variant (Arsenal X, cost 8)
  'armament-heavy-blaster-pistol-rebel-officer': {
    keywords: {
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Heavy Blaster Pistol',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 1,
        maxRange: 2,
        keywords: {
          lethalX: 1,
        }
      }
    ]
  },

  'armament-iden-s-dlt-20a-rifle': {
    keywords: {
      highVelocity: true,
    },
  },

  'armament-iden-s-tl-50-repeater': {
    keywords: {},
  },

  'armament-j-19-bo-rifle': {
    keywords: {
      immunePierce: true,
      reconfigure: true,
      charge: true,
    },
  },

  'armament-jetpack-rockets': {
    weapons: [
      {
        name: 'Jetpack Rockets',
        weaponType: AttackType.Ranged,
        redDice: 1,
        minRange: 3,
        maxRange: 4,
        keywords: {
          blast: true,
          impactX: 1,
          expend: true
        }
      }
    ]
  },

  'armament-jyn-s-se-14-blaster': {
    weapons: [
      {
        name: 'Jyn\'s SE-14 Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 5,
        maxRange: 2,
        keywords: {
          suppressive: true,
          pierceX: 1,
        }
      }
    ]
  },

  'armament-lightsaber': {
    keywords: {
      block: true,
    },
    weapons: [
      {
        name: 'Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 2,
        whiteDice: 3,
        blackDice: 1,
        keywords: {
          criticalX: 1,
          impactX: 2,
          pierceX: 1,
        }
      }
    ]
  },

  'armament-looted-e-5-blaster': {
    keywords: {},
  },

  'armament-repeating-blaster': {
    keywords: {
      preciseX: 2,
    },
    weapons: [
      {
        name: 'Repeating Blaster',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 3,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          criticalX: 1,
          impactX: 1,
          longshot: true,
        }
      }
    ]
  },

  'armament-rt-97c-blaster-rifle': {
    weapons: [
      {
        name: 'RT-97c Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 3,
        maxRange: 4,
      }
    ]
  },

  'armament-saxon-s-galar-90-rifle': {

    weapons: [
      {
        name: 'Galar-90 Sniper Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 4,
        keywords: {
          longshot: true,
          highVelocity: true,
          lethalX: 1,
        }
      }
    ]
  },

  'armament-saxon-s-jetpack-rockets': {
    keywords: {
      cycle: true,
    },
    weapons: [
      {
        name: 'Jetpack Rockets',
        weaponType: AttackType.Ranged,
        redDice: 3,
        minRange: 2,
        maxRange: 3,
        keywords: {
          blast: true,
          impactX: 2,
          exhaust: true
        }
      }
    ]
  },

  'armament-saxon-s-zx-flame-projector': {
    weapons: [
      {
        name: 'ZX Flame Projector',
        weaponType: AttackType.Hybrid,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 1,
        keywords: {
          blast: true,
          spray: true,
          suppressive: true,
          expend: true
        }
      }
    ]
  },

  'armament-stun-baton': {
    keywords: {
      demoralizeX: 1
    },
    weapons: [
      {
        name: 'Stun Baton',
        weaponType: AttackType.Melee,
        redDice: 1,
        blackDice: 5,
        keywords: {
          immobilizeX: 1,
        }
      }
    ]
  },

  'armament-super-commando-jetpack-rockets': {
    weapons: [
      {
        name: 'Jetpack Rockets',
        weaponType: AttackType.Ranged,
        redDice: 1,
        minRange: 3,
        maxRange: 4,
        keywords: {
          blast: true,
          criticalX: 1,
          impactX: 1,
          expend: true
        }
      }
    ]
  },

  'armament-t-21-blaster-rifle': {
    weapons: [
      {
        name: 'T-21 Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 4,
        maxRange: 4,
        keywords: {
          criticalX: 2,
        }
      }
    ]
  },

  // Sabine Wren variant (Dauntless, cost 15)
  'armament-the-darksaber-sabine-wren': {
    keywords: {
      dauntless: true,
      immuneMeleePierce: true,
      immunePierce: true,
    },
    weapons: [
      {
        name: 'The Darksaber',
        weaponType: AttackType.Melee,
        blackDice: 5,
        keywords: {
          impactX: 1,
          pierceX: 1
        }
      }
    ]
  },

  'armament-the-darksaber-maul': {
    keywords: {
      cunning: true
    },
    surgeOverrides: {
      surgeCrit: true,
    },
    weapons: [
      {
        name: 'The Darksaber (Maul)',
        weaponType: AttackType.Melee,
        blackDice: 6,
        keywords: {
          impactX: 2,
          pierceX: 2
        }
      }
    ]
  },

  'armament-the-darksaber-moff-gideon': {
    keywords: {
      demoralizeX: 1,
      immuneMeleePierce: true,
      immunePierce: true,
    },
    weapons: [
      {
        name: 'The Darksaber (Moff Gideon)',
        weaponType: AttackType.Melee,
        blackDice: 5,
        keywords: {
          impactX: 1,
          pierceX: 1
        }
      }
    ]
  },


  'armament-twin-lightsabers': {
    weapons: [
      {
        name: 'Twin Lightsabers',
        weaponType: AttackType.Melee,
        blackDice: 4,
        whiteDice: 4,
        keywords: {
          highVelocity: true,
          impactX: 2,
          pierceX: 1
        }
      }
    ]
  },

  'armament-vibro-axe': {
    keywords: {
      charge: true
    },
    weapons: [
      {
        name: 'Vibro Axe',
        weaponType: AttackType.Melee,
        redDice: 1,
        blackDice: 3,
        keywords: {
          impactX: 1,
          lethalX: 1,
        }
      }
    ]
  },

  'armament-z-6-riot-baton': {
    keywords: {
      immuneMeleePierce: true,
    },
    weapons: [
      {
        name: 'Z-6 Riot Baton',
        weaponType: AttackType.Melee,
        redDice: 2,
        blackDice: 2,
        keywords: {
          suppressive: true,
        }
      }
    ]
  },

  'command-improvised-orders': {
    keywords: {},
  },

  'command-inspiring-presence': {
    keywords: {},
  },

  'command-lead-by-example': {
    keywords: {
      inspireX: 2
    },
  },

  'command-strict-orders': {
    keywords: {},
  },

  'command-trusted-agent': {
    keywords: {},
  },

  'command-underworld-connections': {
    keywords: {
      alliesOfConvenience: true,
    },
  },

  'command-vigilance': {
    keywords: {},
  },

  'comms-command-control-array': {
  },

  'comms-comms-jammer': {
    keywords: {},
  },

  'comms-emergency-transponder': {
    keywords: {},
  },

  'comms-hacked-comms-unit': {
    keywords: {},
  },

  'comms-hq-uplink': {
    keywords: {},
  },

  'comms-linked-targeting-array': {
    keywords: {
      targetX: 1
    },
  },

  'comms-onboard-comms-channel': {
    keywords: {
      coordinate: 'trooper'
    },
  },

  'comms-spotter-uplink': {
    keywords: {},
  },

  'crew-a-300-rifle-gunner': {
    weapons: [
      {
        name: 'A-300 Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 3,
      }
    ]
  },

  'crew-backworld-medic': {
    keywords: {},
  },

  'crew-barc-ion-gunner': {
    weapons: [
      {
        name: 'Ion Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 3,
        keywords: {
          criticalX: 1,
          fixed: 'front, rear',
          impactX: 1,
          ionX: 1
        }
      }
    ]
  },

  'crew-barc-rps-6-gunner': {
    weapons: [
      {
        name: 'RPS-6 Rocket Launcher',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        redDice: 1,
        blackDice: 1,
        minRange: 2,
        maxRange: 4,
        keywords: {
          impactX: 2
        }
      }
    ]
  },

  'crew-barc-twin-laser-gunner': {
    weapons: [
      {
        name: 'Twin Laser Cannon',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          fixed: 'front, rear',
        }
      }
    ]
  },

  'crew-black-sun-crew': {
    keywords: {},
  },

  'crew-door-gunners': {
    weapons: [
      {
        name: 'Mounted Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          fixed: 'sides'
        }
      }
    ]
  },

  'crew-gnasp-bombardier': {
    weapons: [
      {
        name: 'Thermal Detonators',
        weaponType: AttackType.Overrun,
        whiteDice: 2,
        redDice: 2,
        keywords: {
          overrunX: 2,
          suppressive: true,
        }
      }
    ]
  },

  'crew-gnasp-gunner': {
    weapons: [
      {
        name: 'Heavy Bowcaster',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        redDice: 2,
        maxRange: 3,
        keywords: {
          fixed: 'rear',
          impactX: 1,
          pierceX: 1,
        }
      }
    ]
  },

  'crew-pyke-syndicate-crew': {
    keywords: {},
  },

  'crew-rps-6-rocket-gunner': {
    weapons: [
      {
        name: 'RPS-6 Rocket Launcher',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        redDice: 1,
        blackDice: 1,
        minRange: 2,
        maxRange: 4,
        keywords: {
          impactX: 2
        }
      }
    ]
  },

  'crew-unorthodox-tactician': {
    keywords: {},
  },

  'crew-unstable-astromech': {
    keywords: {},
  },

  'crew-weequay-crew': {
    keywords: {},
  },

  'doctrine-academy-trained': {
    keywords: {
      exemplar: true,
      inspireX: 1,
      strategizeX: 1
    },
  },

  'doctrine-defend-in-depth': {
    keywords: {
      aid: 'emplacement trooper unit',
      preparedPosition: true,
      spotterX: 1,
    },
  },

  'doctrine-frontline-commander': {
    keywords: {
      aid: 'rebel trooper unit',
      indomitable: true,
      spur: true,
      tacticalX: 1,
      dauntless: true,
    },
  },

  'doctrine-general-of-the-republic': {
    keywords: {
      bolsterX: 2,
      direct: 'clone trooper',
      inspireX: 1,
    },
  },

  'doctrine-jedi-consular': {
    keywords: {
      steady: true,
    },
  },

  'doctrine-jedi-guardian': {
    keywords: {
      charge: true,
    },
  },

  'doctrine-jedi-negotiator': {
    keywords: {
      blast: true,
      spray: true,
      suppressive: true,
    },
  },

  'doctrine-platoon-commander': {
    keywords: {
      sharpshooterX: 1,
    },
    surgeOverrides: {
      meleeSurgeCrit: true,
      meleeSurgeBlock: true,
    },
  },

  'doctrine-proven-tactician': {
    keywords: {
      quickThinking: true,
      exemplar: true,
      reinforcements: true,
    },
  },

  'doctrine-reluctant-hero': {
    keywords: {
      infiltrate: true,
      relentless: true,
    },
  },

  'doctrine-seek-and-destroy': {
    keywords: {
      demoralizeX: 1,
      marksman: true,
      targetX: 1,
    },
  },

  'doctrine-tip-of-the-spear': {
    keywords: {
      aid: 'imperial trooper unit',
      direct: 'corps trooper unit',
      tacticalX: 1,
    },
  },

  'doctrine-tyrannical-taskmaster': {
    keywords: {},
  },

  'doctrine-unseen-saboteur': {
    keywords: {
      lowProfile: true,
      preparedPosition: true,
    },
  },

  'force-anger': {
    keywords: {},
  },

  'force-burst-of-speed': {
    keywords: {},
  },

  'force-clairvoyance': {
    keywords: {},
  },

  'force-fear': {
    keywords: {
      demoralizeX: 1
    },
  },

  'force-force-barrier': {
    keywords: {},
  },

  'force-force-choke': {
    keywords: {},
  },

  'force-force-guidance': {
    keywords: {},
  },

  'force-force-push': {
    keywords: {},
  },

  'force-force-reflexes': {
    keywords: {},
  },

  'force-hope': {
    keywords: {
      inspireX: 1,
    },
  },

  'force-jedi-mind-trick': {
    keywords: {},
  },

  'force-saber-throw': {
    weapons: [
      {
        name: 'Saber Throw',
        weaponType: AttackType.Ranged,
        maxRange: 2,
        keywords: {
          // TODO: add saber throw effect. Saber Throw weapon uses the dice of one of that unit's equipped melee weapons, but with half of the dice (rounded up, pick the best dice. For example, 3R2W becomes a 3R saber throw weapon). All keywords from that melee weapon are also transferred to the saber throw weapon.
          saberThrow: true
        }
      }
    ]
  },

  'force-terror': {
    keywords: {},
  },

  'force-tranquility': {
    keywords: {},
  },

  'gear-ascension-cables': {
    keywords: {
      scale: true,
    },
  },

  'gear-boba-s-flame-projector': {
    weapons: [
      {
        name: 'Boba\'s Flame Projector',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        maxRange: 1,
        keywords: {
          blast: true,
          spray: true,
          suppressive: true,
        }
      }
    ]
  },

  'gear-combat-armor': {
    defenseOverrides: {
      dieColor: DefenseDieColor.Red,
      surgeChart: DefenseSurgeChart.None,
    },
    keywords: {
      combatArmor: true,
    },
  },

  'gear-command-and-control-uplink': {
    keywords: {},
  },

  'gear-din-s-flame-projector': {
    keywords: {
      blast: true,
      spray: true,
      suppressive: true,
    },
  },

  'gear-din-s-jetpack': {
    keywords: {
      jumpX: 2
    },
  },

  'gear-electro-grappling-line': {
    keywords: {},
  },

  'gear-electrobinoculars': {
    keywords: {
      spotterX: 1
    },
  },

  'gear-emergency-stims': {
    keywords: {},
  },

  'gear-environmental-gear': {
    keywords: {
      unhindered: true
    },
  },

  'gear-expanded-databanks': {
    keywords: {},
  },

  'gear-extra-supplies': {
    keywords: {},
  },

  'gear-grappling-hooks': {
    keywords: {
      expertClimber: true,
    },
  },

  'gear-katarn-pattern-armor': {
    // Wound cap: when suffering 1+ wounds from a non-melee attack, expend to suffer only 1 wound instead.
    keywords: {
      katarnPatternArmor: true,
      expend: true,
    },
  },

  'gear-mandalorian-combat-shields': {
    keywords: {
      shieldedX: 2,
    },
  },

  'gear-mobility-upgrade': {
    keywords: {
      scale: true,
      steady: true
    },
  },

  'gear-portable-scanner': {
    keywords: {
      takeCoverX: 1
    },
  },

  'gear-prepared-supplies': {
    keywords: {
      cacheDodgeX: 1
    },
  },

  'gear-recon-intel': {
    keywords: {
      scoutX: 1
    },
  },

  'gear-sabine-s-combat-shield': {
    keywords: {
      shieldedX: 1,
      rechargeX: 1,
    },
  },

  'gear-saxon-s-combat-shield': {
    keywords: {
      shieldedX: 1,
      rechargeX: 1,
    },
  },

  'gear-seeker-droid': {
    keywords: {
      shieldedX: 1,
      rechargeX: 1,
      observeX: 1
    },
  },

  'gear-super-commando-combat-shields': {
    keywords: {
      shieldedX: 2,
    },
  },

  'gear-targeting-scopes': {
    keywords: {
      preciseX: 1,
    },
  },

  'gear-turbo-charge': {
    keywords: {},
  },

  'generator-barrage-generator': {
    weapons: [
      {
        name: 'Barrage Generator',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: Infinity,
        keywords: {
          suppressive: true,
          exhaust: true,
        }
      }
    ]
  },

  'generator-overcharged-generator': {
    weapons: [
      {
        name: 'Overcharged Generator',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: Infinity,
        keywords: {
          impactX: 1,
          exhaust: true,
        }
      }
    ]
  },

  'grenades-concussion-grenades': {
    isGrenade: true,
    weapons: [
      {
        name: 'Concussion Grenade',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 1,
        keywords: {
          blast: true,
        }
      }
    ]
  },

  'grenades-emp-droid-poppers': {
    isGrenade: true,
    weapons: [
      {
        name: 'EMP "Droid Poppers"',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 1,
        keywords: {
          ionX: 1,
        }
      }
    ]
  },

  'grenades-fragmentation-grenades': {
    isGrenade: true,
    surgeOverrides: {
      surgeCrit: true,
    },
    weapons: [
      {
        name: 'Frag Grenade',
        weaponType: AttackType.Ranged,
        redDice: 1,
        maxRange: 1,
      }
    ]
  },

  'grenades-impact-grenades': {
    isGrenade: true,
    weapons: [
      {
        name: 'Impact Grenade',
        weaponType: AttackType.Hybrid,
        blackDice: 1,
        maxRange: 1,
        keywords: {
          impactX: 4,
        }
      }
    ]
  },

  'grenades-smoke-grenades': {
    keywords: {
      smokeX: 1,
      expend: true,
    },
  },

  'grenades-sonic-imploders': {
    isGrenade: true,
    weapons: [
      {
        name: 'Sonic Imploder',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 1,
        keywords: {
          suppressive: true,
        }
      }
    ]
  },

  'grenades-thermal-detonator': {
    isGrenade: true,
    weapons: [
      {
        name: 'Thermal Detonator',
        weaponType: AttackType.Hybrid,
        redDice: 4,
        maxRange: 1,
        keywords: {
          blast: true,
          impactX: 4,
          expend: true,
        }
      }
    ]
  },

  'hardpoint-88i-twin-light-blaster': {
    weapons: [
      {
        name: '88i Twin Light Blaster',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 3,
        keywords: {
          fixed: 'front',
          impactX: 1,
        }
      }
    ]
  },

  'hardpoint-ag-2g-quad-laser': {
    weapons: [
      {
        name: 'AG-2G Quad Laser',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3,
        keywords: {
          impactX: 2,
        }
      }
    ]
  },

  'hardpoint-at-rt-flamethrower': {
    weapons: [
      {
        name: 'Flamethrower',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 1,
        keywords: {
          blast: true,
          fixed: 'front',
          spray: true
        }
      }
    ]
  },

  'hardpoint-at-rt-laser-cannon': {
    weapons: [
      {
        name: 'Laser Cannon',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 2,
        minRange: 2,
        maxRange: 4,
        keywords: {
          impactX: 3,
          fixed: 'front',
          spray: true
        }
      }
    ]
  },

  'hardpoint-at-rt-rotary-blaster': {
    weapons: [
      {
        name: 'Rotary Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 5,
        maxRange: 3,
        keywords: {
          fixed: 'front',
        }
      }
    ]
  },

  'hardpoint-at-st-mortar-launcher': {
    weapons: [
      {
        name: 'AT-ST Mortar Launcher',
        weaponType: AttackType.Ranged,
        whiteDice: 3,
        minRange: 4,
        maxRange: Infinity,
        keywords: {
          fixed: 'front',
          suppressive: true,
        }
      }
    ]
  },

  'hardpoint-ax-108-ground-buzzer': {
    weapons: [
      {
        name: 'Ax-108 "Ground Buzzer"',
        weaponType: AttackType.Ranged,
        blackDice: 4,
        maxRange: 2,
        keywords: {
          fixed: 'rear',
        }
      }
    ]
  },

  'hardpoint-beam-turret': {
    weapons: [
      {
        name: 'Beam Cannon',
        weaponType: AttackType.Ranged,
        redDice: 2,
        maxRange: 4,
        keywords: {
          beamX: 2
        }
      }
    ]
  },

  'hardpoint-dw-3-concussion-grenade-launcher': {
    weapons: [
      {
        name: 'DW-3 Grenade Launcher',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          fixed: 'front',
          blast: true,
        }
      }
    ]
  },

  'hardpoint-heavy-laser-cannon': {
    weapons: [
      {
        name: 'Heavy Laser Cannon',
        weaponType: AttackType.Ranged,
        blackDice: 5,
        maxRange: 3,
        keywords: {
          fixed: 'front',
          impactX: 3,
        }
      }
    ]
  },

  'hardpoint-heavy-laser-retrofit': {
    weapons: [
      {
        name: 'Heavy Laser Retrofit',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 4,
        keywords: {
          criticalX: 1,
        }
      }
    ]
  },

  'hardpoint-m-45-ion-blaster': {
    weapons: [
      {
        name: 'M-45 Ion Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        whiteDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 1,
          ionX: 1,
          fixed: 'front',
          criticalX: 1
        }
      }
    ]
  },

  'hardpoint-mark-ii-medium-blaster': {
    weapons: [
      {
        name: 'Mark II Medium Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 4,
        maxRange: 3,
        keywords: {
          fixed: 'front',
        }
      }
    ]
  },

  'hardpoint-mo-dk-power-harpoon': {
    weapons: [
      {
        name: 'Mo/Dk Power Harpoon',
        weaponType: AttackType.Ranged,
        redDice: 1,
        maxRange: 2,
        keywords: {
          impactX: 2,
          fixed: 'rear',
          towCable: true
        }
      }
    ]
  },

  'hardpoint-nose-mounted-flamethrower': {
    weapons: [
      {
        name: 'Flamethrower',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        whiteDice: 1,
        maxRange: 1,
        keywords: {
          fixed: 'front',
          blast: true,
          spray: true
        }
      }
    ]
  },

  'hardpoint-nose-mounted-ion-blaster': {
    keywords: {
      cycle: true,
    },
    weapons: [
      {
        name: 'Ion Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        whiteDice: 3,
        minRange: 2,
        maxRange: 4,
        keywords: {
          fixed: 'front',
          criticalX: 1,
          impactX: 2,
          ionX: 1
        }
      }
    ]
  },

  'hardpoint-nose-mounted-laser-cannon': {
    weapons: [
      {
        name: 'Laser Cannon',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 1,
        blackDice: 3,
        maxRange: 3,
        keywords: {
          fixed: 'front',
          criticalX: 1,
        }
      }
    ]
  },

  'hardpoint-pintle-mounted-dlt-19': {
    weapons: [
      {
        name: 'DLT-19 Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 1,
        }
      }
    ]
  },

  'hardpoint-pintle-mounted-rt-97c': {
        weapons: [
      {
        name: 'RT-97C Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 3,
        maxRange: 4,
      }
    ]
  },

  'hardpoint-twin-beam-cannons': {
    weapons: [
      {
        name: 'Twin Beam Cannons',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 2,
        maxRange: 4,
        keywords: {
          fixed: 'front',
          beamX: 2
        }
      }
    ]
  },

  // Infantry Support Platform variant (Gunslinger, Critical 2, cost 25)
  'hardpoint-twin-blaster-cannons-infantry-support-platform': {
    keywords: {
      gunslinger: true,
    },
    weapons: [
      {
        name: 'Blaster Cannons',
        weaponType: AttackType.Ranged,
        blackDice: 6,
        maxRange: 3,
        keywords: {
          fixed: 'front',
          criticalX: 2
        }
      }
    ]
  },

  'hardpoint-twin-laser-turret': {
    weapons: [
      {
        name: 'Twin Laser Cannon',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3,
        keywords: {
          criticalX: 1,
        }
      }
    ]
  },

  'hardpoint-twin-missile-pods': {
    keywords: {
      gunslinger: true,
    },
    weapons: [
      {
        name: 'Missile Pods',
        weaponType: AttackType.Ranged,
        redDice: 4,
        minRange: 2,
        maxRange: 4,
        keywords: {
          fixed: 'front',
          impactX: 2
        }
      }
    ]
  },

  'hardpoint-twin-blaster-cannons-lm-432-crab-droid': {
    weapons: [
      {
        name: 'Twin Blaster Cannons',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        redDice: 2,
        maxRange: 3,
        keywords: {
          fixed: 'front',
        }
      }
    ]
  },

  'heavy-weapon-agent-kallus': {
    keywords: {
      demoralizeX: 1,
      leader: true
    },
    weapons: [
      {
        name: 'J-19 Bo-Rifle',
        weaponType: AttackType.Hybrid,
        whiteDice: 1,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          sidearmRanged: true,
          longshot: true,

        }
      }
    ]
  },

  'heavy-weapon-axe-ewok': {
    weapons: [
      {
        name: 'Stone Axe',
        weaponType: AttackType.Melee,
        redDice: 1,
        keywords: {
          impactX: 1,
          pierceX: 1,
        },
      },
    ],
  },

  'heavy-weapon-b2-acm-battle-droid': {
    weapons: [
      {
        name: 'Heavy Arm Cannon',
        weaponType: AttackType.Ranged,
        redDice: 3,
        maxRange: 2,
      }
    ]
  },

  'heavy-weapon-b2-ha-battle-droid': {
    keywords: {
      cycle: true,
    },
    weapons: [
      {
        name: 'B2-HA Cannon',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 1,
        minRange: 2,
        maxRange: 3,
        keywords: {
          blast: true,
          exhaust: true,
          impactX: 2,
        }
      }
    ]
  },

  'heavy-weapon-battle-shield-wookiee': {
    keywords: {
      armorX: 1,
    },
    weapons: [
      {
        name: 'Battle Shield',
        weaponType: AttackType.Melee,
        redDice: 2,
      },
      {
        name: 'Battle Shield',
        weaponType: AttackType.Melee,
        blackDice: 2,
      }
    ]
  },

  'heavy-weapon-beskad-duelist': {
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [
      {
        name: 'Vibroblade',
        weaponType: AttackType.Melee,
        redDice: 2,
      }
    ]
  },

  'heavy-weapon-bistan': {
    keywords: {},
  },

  'heavy-weapon-bowcaster-wookiee': {
    weapons: [
      {
        name: 'Bowcaster',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 1,
        maxRange: 3,
        keywords: {
          impactX: 1,
          pierceX: 1,
        },
      }
    ]
  },

  'heavy-weapon-bx-series-droid-sniper': {
    keywords: {
      immuneDeflect: true,
    },
  },

  'heavy-weapon-cassian-andor': {
    keywords: {
      uncannyLuckX: 1,
      lowProfile: true,
      secretMission: true
    },
    weapons: [
      {
        name: 'A280 Sniper Config',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          longshot: true,
        }
      },
      {
        name: 'Black Ops',
        weaponType: AttackType.Hybrid,
        redDice: 2,
        maxRange: 2,
        keywords: {
          // TODO: add special effect of defeated minis contributing 1 white die to attacks
          // When this unit forms an attack pool, add 1 white die to the attack pool for each miniature from this unit that is defeated.
          blackOps: true,
        }
      }
    ]
  },

  'heavy-weapon-cm-0-93-trooper': {
    weapons: [
      {
        name: 'CM-O/93',
        weaponType: AttackType.Ranged,
        whiteDice: 4,
        maxRange: 4,
        keywords: {
          criticalX: 2
        }
      }
    ]
  },

  'heavy-weapon-crosshair': {
    keywords: {
      preciseX: 1,
    },
    weapons: [
      {
        name: 'Firepuncher Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        maxRange: 5,
        keywords: {
          highVelocity: true,
          pierceX: 1
        }
      }
    ]
  },

  'heavy-weapon-dc-15x-arc-trooper': {
    weapons: [
      {
        name: 'DC-15x Sniper Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 1,
        maxRange: 5,
        keywords: {
          immuneDeflect: true,
          lethalX: 1,
        }
      }
    ]
  },

  'heavy-weapon-del-meeko': {
    keywords: {
      repairXCapacity1: 2,
      restore: true,
    },
    weapons: [
      {
        name: 'Del\'s DLT-19x',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 5,
        keywords: {
          highVelocity: true,
          lethalX: 1,
        }
      }
    ]
  },

  'heavy-weapon-dh-447-sniper': {
    weapons: [
      {
        name: 'DH-447 Sniper Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 5,
        keywords: {
          highVelocity: true,
          pierceX: 1,
        }
      }
    ]
  },

  'heavy-weapon-dioxis-mine-saboteur': {
    weapons: [
      {
        name: 'Dioxis Mine',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 1,
        keywords: {
          blast: true,
          poisonX: 1,
        }
      }
    ]
  },

  'heavy-weapon-dlt-19-stormtrooper': {
    weapons: [
      {
        name: 'DLT-19 Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 1
        }
      }
    ]
  },

  'heavy-weapon-dlt-19d-trooper': {
    weapons: [
      {
        name: 'DLT-19D Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        redDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 1
        }
      }
    ]
  },

  'heavy-weapon-dlt-19x-sniper': {
    weapons: [
      {
        name: 'DLT-19x Sniper Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 5,
        keywords: {
          highVelocity: true,
          pierceX: 1,
        }
      }
    ]
  },

  'heavy-weapon-dlt-20a-range-trooper': {
    weapons: [
      {
        name: 'DLT-20A Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 2,
        maxRange: 5,
        keywords: {
          impactX: 2,
        }
      }
    ]
  },

  'heavy-weapon-dlt-20a-trooper': {
    weapons: [
      {
        name: 'DLT-20A Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        whiteDice: 1,
        maxRange: 4,
        keywords: {
          criticalX: 1,
        }
      }
    ]
  },

  'heavy-weapon-dp-23-clone-trooper': {
    weapons: [
      {
        name: 'DP-23',
        weaponType: AttackType.Hybrid,
        redDice: 2,
        maxRange: 2,
        keywords: {
          pierceX: 1,
        }
      }
    ]
  },

  'heavy-weapon-dt-f16': {
    keywords: {
      compel: true,
      leader: true,
    },
    weapons: [
      {
        name: 'E-11D Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 3
      }
    ]
  },

  'heavy-weapon-e-5c-b1-battle-droid': {
    weapons: [
      {
        name: 'E-5C Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3
      }
    ]
  },

  'heavy-weapon-e-5s-b1-battle-droid': {
    weapons: [
      {
        name: 'E-5s Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 1,
        maxRange: 4,
        keywords: {
          criticalX: 1,
        }
      }
    ]
  },

  'heavy-weapon-e-60r-b1-battle-droid': {
    weapons: [
      {
        name: 'E-60R',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 1,
        whiteDice: 1,
        minRange: 2,
        maxRange: 4,
        keywords: {
          cumbersome: true,
          impactX: 2,
        }
      }
    ]
  },

  'heavy-weapon-echo-arc-marksman': {
    keywords: {
      leader: true,
      reliableX: 1,
    },
    weapons: [
      {
        name: 'DC-15x',
        weaponType: AttackType.Ranged,
        redDice: 2,
        maxRange: 5,
        keywords: {
          criticalX: 1,
          lethalX: 1,
          immuneDeflect: true,
        }
      }
    ]
  },

  'heavy-weapon-echo-clone-force-99': {
    keywords: {
      reliableX: 3
    },
  },

  'heavy-weapon-electro-whip-magnaguard': {
    weapons: [
      {
        name: 'Electro-Whip',
        weaponType: AttackType.Hybrid,
        redDice: 2,
        maxRange: 1,
        keywords: {
          immobilizeX: 1,
          versatile: true,
        }
      }
    ]
  },

  'heavy-weapon-electro-whip-soldier': {
    weapons: [
      {
        name: 'Electro-Whip',
        weaponType: AttackType.Hybrid,
        redDice: 2,
        maxRange: 1,
        keywords: {
          immobilizeX: 1,
          suppressive: true,
        }
      }
    ]
  },

  'heavy-weapon-electrostaff-guard': {
    keywords: {
      immunePierce: true,
    },
  },

  'heavy-weapon-flametrooper': {
    weapons: [
      {
        name: 'Flamethrower',
        weaponType: AttackType.Hybrid,
        blackDice: 1,
        maxRange: 1,
        keywords: {
          blast: true,
          spray: true,
        }
      }
    ]
  },

  'heavy-weapon-force-pike-warrior': {
    weapons: [
      {
        name: 'Force Pike',
        weaponType: AttackType.Melee,
        redDice: 1,
        blackDice: 1,
        keywords: {
          suppressive: true,
        }
      },
      {
        name: 'Force Pike',
        weaponType: AttackType.Overrun,
        whiteDice: 2,
        blackDice: 1,
        keywords: {
          overrunX: 1,
          suppressive: true,
        }
      }
    ]
  },

  'heavy-weapon-gideon-hask': {
    keywords: {
      leader: true,
      coordinate: 'corps trooper'
    },
    weapons: [
      {
        name: 'Gideon\'s E-11',
        weaponType: AttackType.Ranged,
        redDice: 2,
        maxRange: 3
      }
    ]
  },

  'heavy-weapon-heavy-aqua-droid': {
    weapons: [
      {
        name: 'Heavy Blaster',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 1,
        maxRange: 3,
        keywords: {
          impactX: 2
        }
      }
    ]
  },

  'heavy-weapon-hh-12-stormtrooper': {
    weapons: [
      {
        name: 'HH-12',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        minRange: 2,
        maxRange: 4,
        keywords: {
          cumbersome: true,
          impactX: 3
        }
      }
    ]
  },

  'heavy-weapon-hunter': {
    keywords: {
      leader: true,
    },
  },

  'heavy-weapon-ig-100-magnaguard': {
    keywords: {},
  },

  'heavy-weapon-kraken-ig-100-magnaguard': {
    weapons: [
      {
        name: 'Kraken\'s Blaster',
        weaponType: AttackType.Hybrid,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 3,
        keywords: {
          // TODO: add unique effect
          // When this unit attacks, upgrade 1 die for each miniature from this unit that is defeated.
          krakenBlaster: true,
        }
      }
    ]
  },

  'heavy-weapon-kraken-separatist-alliance-corps': {
    weapons: [
      {
        name: 'Kraken\'s Blaster',
        weaponType: AttackType.Hybrid,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 3,
        keywords: {
          // TODO: add unique effect
          // When this unit attacks, upgrade 1 die for each miniature from this unit that is defeated.
          krakenBlaster: true,
        }
      }
    ]
  },

  'heavy-weapon-kx-series-security-droids': {
    addsMiniature: 2,
    weapons: [
      {
        name: 'Oppress',
        weaponType: AttackType.Melee,
        redDice: 1,
        keywords: {
          impactX: 1,
        }
      }
    ]
  },

  'heavy-weapon-long-gun-wookiee': {
    weapons: [
      {
        name: 'Long Gun',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 4,
        keywords: {
          suppressive: true,
        }
      }
    ]
  },

  'heavy-weapon-mag-det-enforcer': {
    weapons: [
      {
        name: 'Mag-Detpack',
        weaponType: AttackType.Hybrid,
        blackDice: 3,
        keywords: {
          blast: true,
          impactX: 3
        }
      }
    ]
  },

  'heavy-weapon-mandalorian-super-commando': {
    keywords: {
      cacheSurgeX: 2,
    },
  },

  'heavy-weapon-mertalizer-dark-trooper': {
    weapons: [
      {
        name: 'Mertalizer',
        weaponType: AttackType.Melee,
        redDice: 2,
        blackDice: 1,
        keywords: {
          suppressive: true,
        }
      }
    ]
  },

  'heavy-weapon-mortar-clone-trooper': {
    weapons: [
      {
        name: 'Clone Mortar',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        minRange: 2,
        maxRange: 4,
        keywords: {
          criticalX: 1,
          suppressive: true,
          cumbersome: true
        }
      }
    ]
  },

  'heavy-weapon-mpl-57-barrage-trooper': {
    keywords: {
      cycle: true
    },
    weapons: [
      {
        name: 'MPL-57 Barrage',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 2,
        maxRange: 3,
        keywords: {
          blast: true,
          impactX: 2,
          exhaust: true,
        }
      }
    ]
  },

  'heavy-weapon-mpl-57-ion-trooper': {
    weapons: [
      {
        name: 'MPL-57 Ion',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        whiteDice: 1,
        maxRange: 3,
        keywords: {
          criticalX: 1,
          impactX: 1,
          ionX: 1,
        }
      }
    ]
  },

  'heavy-weapon-p13-m-disruptor-soldier': {
    weapons: [
      {
        name: 'P-13M Disruptor',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        redDice: 1,
        maxRange: 4,
        keywords: {
          impactX: 1,
        }
      }
    ]
  },

  'heavy-weapon-pao': {
    keywords: {
      inspireX: 1,
      leader: true,
    },
  },

  'heavy-weapon-proton-charge-saboteur': {
    weapons: [
      {
        name: 'Proton Charge',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 1,
        keywords: {
          blast: true,
          criticalX: 2,
          impactX: 3
        }
      }
    ]
  },

  'heavy-weapon-radiation-cannon-b1-battle-droid': {
    weapons: [
      {
        name: 'Radiation Cannon',
        weaponType: AttackType.Ranged,
        redDice: 2,
        maxRange: 2,
        keywords: {
          poisonX: 1,
        }
      }
    ]
  },

  'heavy-weapon-rebel-marksman': {
    keywords: {},
  },

  'heavy-weapon-rook-kast': {
    keywords: {
      leader: true,
      retinue: 'maul'
    },
    weapons: [
      {
        name: 'Rook\'s Blaster Pistols',
        weaponType: AttackType.Hybrid,
        redDice: 2,
        whiteDice: 2,
        maxRange: 2,
      }
    ]
  },

  'heavy-weapon-rps-6-arf-trooper': {
    weapons: [
      {
        name: 'RPS-6',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        redDice: 1,
        minRange: 2,
        maxRange: 4,
        keywords: {
          impactX: 2,
          cumbersome: true,
        }
      }
    ]
  },

  'heavy-weapon-rps-6-clone-trooper': {
    weapons: [
      {
        name: 'RPS-6',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        redDice: 1,
        minRange: 2,
        maxRange: 4,
        keywords: {
          impactX: 2,
          cumbersome: true,
        }
      }
    ]
  },

  'heavy-weapon-rps-6-magnaguard': {
    weapons: [
      {
        name: 'RPS-6',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        redDice: 1,
        minRange: 2,
        maxRange: 4,
        keywords: {
          impactX: 2,
          criticalX: 1,
        }
      }
    ]
  },

  'heavy-weapon-rt-97c-stormtrooper': {
    weapons: [
      {
        name: 'RT-97C Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 3,
        redDice: 1,
        maxRange: 4,
      }
    ]
  },

  'heavy-weapon-scatter-gun-enforcer': {
    weapons: [
      {
        name: 'Scatter Gun',
        weaponType: AttackType.Hybrid,
        redDice: 2,
        maxRange: 2,
        keywords: {
          pierceX: 1
        }
      }
    ]
  },

  'heavy-weapon-scatter-gun-trooper': {
    weapons: [
      {
        name: 'Scatter Gun',
        weaponType: AttackType.Hybrid,
        redDice: 2,
        maxRange: 2,
        keywords: {
          pierceX: 1
        }
      }
    ]
  },

  'heavy-weapon-sm-9-frag-launcher': {
    keywords: {
      cycle: true,
    },
    weapons: [
      {
        name: 'Scatter Gun',
        weaponType: AttackType.Ranged,
        redDice: 2,
        blackDice: 1,
        maxRange: 2,
        keywords: {
          blast: true,
          impactX: 2,
        }
      }
    ]
  },

  'heavy-weapon-sonic-cannon-warrior': {
    weapons: [
      {
        name: 'Sonic Cannon',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        redDice: 1,
        maxRange: 2,
        keywords: {
          impactX: 1,
          scatter: true,
        }
      }
    ]
  },

  'heavy-weapon-sonic-charge-saboteur': {
    weapons: [
      {
        name: 'Sonic Charge',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        whiteDice: 1,
        redDice: 1,
        maxRange: 1,
        keywords: {
          impactX: 2,
          blast: true,
          suppressive: true,
        }
      }
    ]
  },

  'heavy-weapon-stormtrooper-marksman': {
  },

  'heavy-weapon-super-commando-gunslinger': {
    weapons: [
      {
        name: 'Dual Blaster Pistols',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        whiteDice: 2,
        maxRange: 2,
        keywords: {
          lethalX: 1,
        }
      }
    ]
  },

  'heavy-weapon-super-commando-marksman': {
    keywords: {
      preciseX: 1,
    },
    weapons: [
      {
        name: 'Blaster Carbine',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 3,
      }
    ]
  },

  'heavy-weapon-sx-21-trooper': {
    weapons: [
      {
        name: 'SX-21 Scatter Blaster',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 2,
        maxRange: 2,
        keywords: {
          impactX: 1
        }
      }
    ]
  },

  'heavy-weapon-t-21-special-forces-trooper': {
    weapons: [
      {
        name: 'T-21 Repeating Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 4,
        maxRange: 3,
        keywords: {
          criticalX: 2
        }
      }
    ]
  },

  'heavy-weapon-t-21-stormtrooper': {
    weapons: [
      {
        name: 'T-21 Repeating Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 4,
        maxRange: 3,
        keywords: {
          criticalX: 2
        }
      }
    ]
  },

  'heavy-weapon-t-21a-range-trooper': {
    weapons: [
      {
        name: 'T-21A Repeating Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 4,
        keywords: {
          suppressive: true
        }
      }
    ]
  },

  'heavy-weapon-t-21b-shoretrooper': {
    weapons: [
      {
        name: 'T-21B Repeating Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 4,
        keywords: {
          criticalX: 1
        }
      }
    ]
  },

  'heavy-weapon-t-7-ion-snowtrooper': {
    weapons: [
      {
        name: 'T-7 Ion Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          criticalX: 1,
          ionX: 1,
          impactX: 1
        }
      }
    ]
  },

  'heavy-weapon-tech': {
    keywords: {
      tacticalX: 1,
      cacheAimX: 1,
      cacheDodgeX: 1
    },
  },

  'heavy-weapon-tristan-wren': {
    weapons: [
      {
        name: 'Tristan\'s Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          lethalX: 1,
          suppressive: true,
        }
      }
    ]
  },

  'heavy-weapon-ursa-wren': {
    keywords: {
      leader: true,
      dauntless: true,
    },
    weapons: [
      {
        name: 'Ursa\'s Blaster',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        whiteDice: 1,
        blackDice: 1,
        keywords: {
          longshot: true,
        }
      }
    ]
  },

  'heavy-weapon-wrecker': {
    weapons: [
      {
        name: 'Wrecker\'s Blaster',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 2,
      }
    ]
  },

  'heavy-weapon-xs-iv-assault-cannon': {
    weapons: [
      {
        name: 'XS-IV Assault Cannon',
        weaponType: AttackType.Ranged,
        blackDice: 4,
        maxRange: 3,
        keywords: {
          criticalX: 1,
        }
      }
    ]
  },

  'heavy-weapon-z-6-clone-trooper': {
    weapons: [
      {
        name: 'Z-6',
        weaponType: AttackType.Ranged,
        whiteDice: 6,
        maxRange: 3,
      }
    ]
  },

  'heavy-weapon-z-6-trooper': {
    weapons: [
      {
        name: 'Z-6 Rotary Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 6,
        maxRange: 3,
      }
    ]
  },

  'ordnance-armor-piercing-shells': {
    keywords: {
      cycle: true,
    },
    weapons: [
      {
        name: 'Armor-Piercing Shells',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 2,
        minRange: 2,
        maxRange: 3,
        keywords: {
          fixed: 'front',
          impactX: 3,
          exhaust: true,
        }
      }
    ]
  },

  'ordnance-bunker-buster-shells': {
    keywords: {
      cycle: true,
    },
    weapons: [
      {
        name: 'Bunker Buster Shells',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 3,
        maxRange: 2,
        keywords: {
          fixed: 'front',
          blast: true,
          scatter: true,
          exhaust: true,
        }
      }
    ]
  },

  'ordnance-high-energy-shells': {
    keywords: {
      cycle: true,
    },
    weapons: [
      {
        name: 'High-Energy Shells',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 1,
        minRange: 2,
        maxRange: 4,
        keywords: {
          fixed: 'front',
          criticalX: 1,
          highVelocity: true,
          exhaust: true,
        }
      }
    ]
  },

  'personnel-2-1b-medical-droid': {
    keywords: {
      noncombatant: true,
      treatXCapacity2: 1,
      noncombatantKeyword: true,
      restore: true,
    },
  },

  'personnel-arf-trooper-duo': {
    addsMiniature: 2,
    keywords: {
      cacheSurgeX: 1,
    },
  },

  'personnel-astromech': {
    keywords: {
      noncombatant: true,
      repairXCapacity2: 1,
      noncombatantKeyword: true,
    },
  },

  'personnel-astromech-droid': {
    keywords: {
      noncombatant: true,
      repairXCapacity2: 1,
      noncombatantKeyword: true,
      restore: true,
    },
  },

  'personnel-b1-battle-droid': {
    keywords: {},
  },

  'personnel-b1-battle-droid-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 7
  },

  'personnel-b1-security-droid': {
    keywords: {},
  },

  'personnel-b2-super-battle-droid': {
    keywords: {},
  },

  'personnel-b2-super-battle-droid-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 4
  },

  'personnel-black-sun-enforcer': {
    keywords: {},
  },

  'personnel-black-sun-vigo': {
    keywords: {
      leader: true,
      independentSurgeX: 1,
    },
  },

  'personnel-clone-comms-technician': {
    keywords: {
      fireSupport: true
    },
  },

  'personnel-clone-engineer': {
    keywords: {
      repairXCapacity1: 1,
      restore: true,
    },
  },

  'personnel-clone-marksman': {
    keywords: {},
  },

  'personnel-clone-specialist': {
    keywords: {
      exhaust: true,
    },
  },

  'personnel-clone-trooper-infantry': {
    keywords: {},
  },

  'personnel-clone-trooper-infantry-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 5
  },

  'personnel-clone-trooper-marksmen-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 5
  },

  'personnel-ev-series-medical-droid': {
    keywords: {
      noncombatant: true,
      treatXCapacity2: 1,
      noncombatantKeyword: true,
      restore: true,
    },
  },

  'personnel-ewok-skirmisher-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 4
  },

  'personnel-ewok-slinger-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 4
  },

  'personnel-ewok-trapper': {
    keywords: {},
  },

  'personnel-fleet-trooper': {
    keywords: {},
  },

  'personnel-fleet-trooper-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 5
  },

  'personnel-fx-9-medical-droid': {
    keywords: {
      noncombatant: true,
      treatXCapacity2: 1,
      noncombatantKeyword: true,
      restore: true,
    },
  },

  'personnel-geonosian-warrior': {
    keywords: {},
  },

  'personnel-geonosian-warrior-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 5
  },

  'personnel-imperial-comms-technician': {
    keywords: {},
  },

  'personnel-imperial-dark-trooper': {
    keywords: {},
  },

  'personnel-imperial-officer': {
    keywords: {
      inspireX: 1,
      leader: true,
    },
  },

  'personnel-oom-series-battle-droid': {
    keywords: {
      leader: true,
    },
  },

  'personnel-pk-series-worker-droid': {
    keywords: {
      noncombatant: true,
      repairXCapacity2: 1,
      noncombatantKeyword: true,
      restore: true,
    },
  },

  'personnel-pyke-syndicate-capo': {
    keywords: {
      independentSurgeX: 1,
      leader: true,
    },
  },

  'personnel-pyke-syndicate-foot-soldier': {
    keywords: {
      cacheAimX: 1,
    },
  },

  'personnel-r4-astromech': {
    keywords: {
      noncombatant: true,
      repairXCapacity2: 1,
      noncombatantKeyword: true,
      restore: true,
    },
  },

  'personnel-range-trooper': {
    keywords: {},
  },

  'personnel-rebel-comms-technician': {
    keywords: {},
  },

  'personnel-rebel-officer': {
    keywords: {
      inspireX: 1,
      leader: true,
    },
  },

  'personnel-rebel-trooper': {
    keywords: {},
  },

  'personnel-rebel-trooper-captain': {
    keywords: {
      leader: true
    },
  },

  'personnel-rebel-trooper-specialist': {
    keywords: {},
  },

  'personnel-rebel-trooper-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 5
  },

  'personnel-rebel-veteran': {
    keywords: {},
  },

  'personnel-rebel-veteran-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 5
  },

  'personnel-shoretrooper': {
    keywords: {},
  },

  'personnel-shoretrooper-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 5
  },

  'personnel-snowtrooper': {
    keywords: {},
  },

  'personnel-snowtrooper-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 5
  },

  'personnel-stormtrooper': {
    keywords: {},
  },

  'personnel-stormtrooper-captain': {
    keywords: {
      leader: true
    },
  },

  'personnel-stormtrooper-specialist': {
    keywords: {},
  },

  'personnel-stormtrooper-squad': {
    keywords: {
      indomitable: true,
    },
    addsMiniature: 5
  },

  'personnel-t-series-tactical-droid': {
    keywords: {
      leader: true,
      reliableX: 1,
    },
    weapons: [
      {
        name: 'E-5 Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        maxRange: 3,
        keywords: {
          sidearmRanged: true,
        }
      }
    ]
  },

  'personnel-viper-recon-droid': {
    keywords: {
      observeX: 2,
    },
    weapons: [
      {
        name: 'Recon Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 2,
        keywords: {
          sidearmMelee: true,
          sidearmRanged: true,
        }
      }
    ]
  },

  'pilot-327th-star-corps-elite-armor-pilots': {
    keywords: {},
  },

  'pilot-aayla-secura': {
    keywords: {
      fieldCommander: true,
      inspireX: 2
    },
  },

  'pilot-baron-rudor': {
    keywords: {
      marksman: true,
    },
  },

  'pilot-clone-commander-fox': {
    keywords: {
      fieldCommander: true,
    },
  },

  'pilot-clone-shock-trooper-pilot': {
    keywords: {},
  },

  'pilot-first-sergeant-arbmab': {
    keywords: {
      tacticalX: 1,
    },
  },

  'pilot-frenzied-gunner': {
    // TODO: add unique effect of dice being added to pool during the Form Attack Pool step.
    // Logic is: roll a red defense die. On a blank result, add a white attack die to the pool. On a block result, add a black attack die to the pool. On a surge result, add a red attack die to the pool.
    keywords: {
      frenziedGunner: true
    },
  },

  'pilot-gang-boss': {
    keywords: {
      commandVehicleX: 2
    },
  },

  'pilot-general-weiss': {
    keywords: {
      arsenalX: 2,
      fieldCommander: true,
    },
  },

  'pilot-governor-pryce': {
    keywords: {
      fieldCommander: true
    },
  },

  'pilot-hotshot-pilot': {
    keywords: {
      sharpshooterX: 1,
    },
  },

  'pilot-hound-grizzer': {
    keywords: {
      observeX: 4
    },
  },

  'pilot-imperial-hammers-elite-armor-pilot': {
    surgeOverrides: {
      surgeHit: true,
    }
  },

  'pilot-imperial-tie-pilot': {
    keywords: {},
  },

  'pilot-lok-durd': {
  },

  'pilot-oom-series-droid-pilot': {
    keywords: {
      coordinate: 'droid trooper'
    },
  },

  'pilot-outer-rim-speeder-jockey': {
    keywords: {
      coverX: 1,
    },
  },

  'pilot-pirate-captain': {
    keywords: {},
  },

  'pilot-plo-koon': {
    keywords: {
      agileX: 2,
    },
  },

  'pilot-raiding-party-leader': {
    keywords: {
      alliesOfConvenience: true,
      fieldCommander: true,
      demoralizeX: 1
    },
  },

  'pilot-ryder-azadi': {
    keywords: {},
  },

  'pilot-shriv-suurgav': {
    keywords: {
      fieldCommander: true
    },
  },

  'pilot-t-series-tactical-droid-pilot': {
    keywords: {
      fieldCommander: true
    },
  },

  'pilot-veteran-clone-pilot': {
    keywords: {},
  },

  'pilot-wedge-antilles': {
    keywords: {
      fieldCommander: true,
    },
  },

  'counterpart-c-3po': {
    keywords: {
      calculateOdds: true,
      distract: true
    },
    weapons: [
      {
        name: 'Clumsy Kick',
        weaponType: AttackType.Melee,
        whiteDice: 1
      }
    ]
  },

  'counterpart-grogu': {
    keywords: {
      hunted: true,
      latentPower: true,
      small: true
    },
  },

  'counterpart-iden-s-id10-seeker-droid': {
    keywords: {
      shieldedX: 1,
      rechargeX: 1,
      observeX: 1,
      small: true,
    },
    weapons: [
      {
        name: 'Electro-Shock',
        weaponType: AttackType.Hybrid,
        whiteDice: 3,
        maxRange: 1,
        keywords: {
          suppressive: true,
        }
      }
    ]
  },

  'counterpart-omega': {
    keywords: {
      imPartOfTheSquadToo: true,
    },
    weapons: [
      {
        name: 'Zygerrian Energy Bow',
        weaponType: AttackType.Hybrid,
        whiteDice: 2,
        maxRange: 2,
      }
    ]
  },

  'protocol-bounty-programming': {
    keywords: {
      bounty: true,
      ai: 'aim, attack',
      pierceX: 1,
      suppressive: true,
    },
  },

  'protocol-nanny-programming': {
    // TODO: unique effect to allow equipping Grogu
    keywords: {
      ai: 'dodge, move'
    },
  },

  'protocol-attack-protocols': {
    keywords: {
      ai: 'aim',
      preciseX: 2,
    },
  },

  'protocol-defense-protocols': {
    keywords: {
      ai: 'dodge',
      nimble: true,
      outmaneuver: true,
    },
  },

  'protocol-engagement-protocols': {
    keywords: {
      ai: 'attack, move',

    },
  },

  'protocol-enhanced-combat-subroutines': {
    keywords: {
      sharpshooterX: 1,
      lethalX: 1,
    },
  },

  'protocol-limiter-override': {
    keywords: {},
  },

  'protocol-optimized-task-flow': {
    keywords: {
      direct: 'ai unit'
    },
  },

  'protocol-overclock': {
    keywords: {},
  },

  'protocol-programmed-loyalty': {
    keywords: {
      retinue: 'Commander',
    },
  },

  'protocol-sliced-comms': {
    keywords: {},
  },

  'protocol-strategic-programming': {
    keywords: {
      strategizeX: 1
    },
  },

  'protocol-targeting-relay': {
    keywords: {},
  },

  'squad-leader-ahsoka-tano-jedi-padawan': {
    keywords: {
      leader: true,
      block: true,
      charge: true,
      independentDodgeX: 1,
    },
    weapons: [
      {
        name: 'Ahsoka\'s Lightsabers',
        weaponType: AttackType.Melee,
        whiteDice: 2,
        blackDice: 2,
        keywords: {
          criticalX: 1,
          impactX: 2,
          pierceX: 1,
          sidearmMelee: true,
          sidearmRanged: true
        }
      }
    ]
  },

  'squad-leader-boil': {
    keywords: {
      leader: true,
      guardianX: 1,
      scoutX: 1,
    },
  },

  'squad-leader-clone-captain': {
    keywords: {
      leader: true,
      outmaneuver: true,
      defendX: 1,
    },
  },

  'squad-leader-clone-captain-rex': {
    keywords: {
      leader: true,
    },
    weapons: [
      {
        name: 'Dual Hand Blasters',
        weaponType: AttackType.Hybrid,
        redDice: 2,
        maxRange: 2,
      }
    ]
  },

  'squad-leader-clone-commander': {
    keywords: {
      leader: true,
      inspireX: 1,
      reliableX: 1,
    },
  },

  'squad-leader-clone-medic': {
    keywords: {
      treatXCapacity1: 1,
      restore: true,
    },
  },

  'squad-leader-fives': {
    keywords: {
      leader: true,
      charge: true,
      coordinate: 'clone trooper'
    },
    weapons: [
      {
        name: 'Fives\' Blaster',
        weaponType: AttackType.Hybrid,
        blackDice: 3,
        maxRange: 3,
      }
    ]
  },

  'squad-leader-jedi-guardian': {
    keywords: {
      leader: true,
      charge: true,
    },
    weapons: [
      {
        name: 'Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 2,
        keywords: {
          impactX: 2,
          pierceX: 1,
          sidearmRanged: true
        }
      }
    ]
  },

  'squad-leader-waxer': {
    keywords: {
      leader: true,
      disciplinedX: 1,
      scoutX: 1,
    },
  },

  'training-call-to-arms': {
    keywords: {
      charge: true,
    },
  },

  'training-duck-and-cover': {
    keywords: {
      duckAndCover: true,
    },
  },

  'training-dug-in': {
    keywords: {
      dugIn: true,
    },
  },

  'training-endurance': {
    keywords: {},
  },

  'training-forest-dwellers': {
    keywords: {
      scoutX: 1,
    },
  },

  'training-herbal-medicine': {
    keywords: {},
  },

  'training-imperial-march': {
    keywords: {},
  },

  'training-inquisitorius-training': {
    keywords: {
      demoralizeX: 1,
    },
  },

  'training-insatiable-curiosity': {
    keywords: {},
  },

  'training-into-the-fray': {
    keywords: {},
  },

  'training-jedi-training-force-adept': {
    keywords: {
      jumpX: 2
    },
  },

  'training-jedi-training-master-duelist': {
    keywords: {
      outmaneuver: true,
      block: true,
      criticalX: 1,
      jumpX: 1
    },
  },

  'training-jedi-training-peacekeeping-mission': {
    keywords: {
      preparedPosition: true,
      reliableX: 2,
      sentinel: true,
    },
  },

  'training-jedi-training-tactical-acumen': {
    keywords: {
      guidance: 'corps trooper',
    },
  },

  'training-mission-objective': {
    keywords: {
      missionObjective: true,
      exhaust: true,
    },
  },

  'training-offensive-push': {
    keywords: {
      tacticalX: 1,
      exhaust: true,
    },
  },

  'training-offensive-defensive-stance': {
    keywords: {},
  },

  'training-on-the-hunt': {
    keywords: {},
  },

  'training-onward-to-victory': {
    keywords: {},
  },

  'training-overwatch': {
    keywords: {
      sentinel: true,
    },
  },

  'training-protector': {
    keywords: {},
  },

  'training-secret-ingredients': {
    keywords: {},
  },

  'training-seize-the-initiative': {
    keywords: {},
  },

  'training-situational-awareness': {
    keywords: {
      outmaneuver: true,
    },
  },

  'training-strike-and-fade': {
    keywords: {},
  },

  'training-strike-team-leader': {
    keywords: {},
  },

  'training-tenacity': {
    weapons: [
      {
        name: 'Tenacity',
        weaponType: AttackType.Melee,
        redDice: 1,
      }
    ]
  },

  'training-up-close-and-personal': {
    keywords: {},
  },

  'pilot-ig-100-magnaguard-pilot': {
    keywords: {
      immuneMeleePierce: true
    },
  },

  'training-logistical-prowess': {
    keywords: {
      cacheAimX: 1,
      cacheDodgeX: 1,
    },
  },

  'training-security-detail': {
    keywords: {
      guardianX: 2,
      retinue: 'Commander',
    },
  },
};
