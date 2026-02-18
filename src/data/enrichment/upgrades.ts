/**
 * Upgrade enrichment data skeleton generated from raw API keywords.
 *
 * - Includes all processed upgrades.
 * - Boolean keywords are set to true.
 * - Numeric (X) keywords are set to '<need human>'.
 */

import { AttackType } from '../../engine';
import type { UpgradeEnrichment } from './types';

export const UPGRADE_ENRICHMENTS: Record<string, UpgradeEnrichment> = {
  'armament-a-180': {
    keywords: {},
  },

  'armament-a-300': {
    keywords: {},
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
        keywords: {
          suppressive: true,
          exhaust: true
        }
      },
      {
        name: 'E-11D Grenade Launcher',
        weaponType: AttackType.Ranged,
        redDice: 1,
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
        keywords: {
          suppressive: true,
        },
      }
    ]
  },

  'armament-heavy-blaster-pistol': {
    keywords: {
      sharpshooterX: 1,
      tacticalX: 1,
    },
    weapons: [
      {
        name: 'Heavy Blaster Pistol',
        weaponType: AttackType.Ranged,
        redDice: 2,
        keywords: {
          lethalX: 1,
          highVelocity: true,
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

  'armament-the-darksaber': {
    keywords: {
      dauntless: true,
      immuneMeleePierce: true
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
      immuneMeleePierce: true
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
    keywords: {},
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
      tacticalX: 1
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
    keywords: {},
  },

  'doctrine-jedi-guardian': {
    keywords: {},
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
    keywords: {},
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
    keywords: {},
  },

  'force-jedi-mind-trick': {
    keywords: {},
  },

  'force-saber-throw': {
    keywords: {},
  },

  'force-terror': {
    keywords: {},
  },

  'force-tranquility': {
    keywords: {},
  },

  'gear-ascension-cables': {
    keywords: {},
  },

  'gear-boba-s-flame-projector': {
    keywords: {
      blast: true,
      spray: true,
      suppressive: true,
    },
  },

  'gear-combat-armor': {
    keywords: {},
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
    keywords: {},
  },

  'gear-electro-grappling-line': {
    keywords: {},
  },

  'gear-electrobinoculars': {
    keywords: {},
  },

  'gear-emergency-stims': {
    keywords: {},
  },

  'gear-environmental-gear': {
    keywords: {},
  },

  'gear-expanded-databanks': {
    keywords: {},
  },

  'gear-extra-supplies': {
    keywords: {},
  },

  'gear-grappling-hooks': {
    keywords: {},
  },

  'gear-katarn-pattern-armor': {
    keywords: {},
  },

  'gear-mandalorian-combat-shields': {
    keywords: {
      shieldedX: '<need human>',
    },
  },

  'gear-mobility-upgrade': {
    keywords: {},
  },

  'gear-portable-scanner': {
    keywords: {},
  },

  'gear-prepared-supplies': {
    keywords: {},
  },

  'gear-recon-intel': {
    keywords: {},
  },

  'gear-sabine-s-combat-shield': {
    keywords: {
      shieldedX: '<need human>',
    },
  },

  'gear-saxon-s-combat-shield': {
    keywords: {
      shieldedX: '<need human>',
    },
  },

  'gear-seeker-droid': {
    keywords: {
      shieldedX: '<need human>',
    },
  },

  'gear-super-commando-combat-shields': {
    keywords: {
      shieldedX: '<need human>',
    },
  },

  'gear-targeting-scopes': {
    keywords: {
      preciseX: '<need human>',
    },
  },

  'gear-turbo-charge': {
    keywords: {},
  },

  'generator-barrage-generator': {
    keywords: {
      suppressive: true,
    },
  },

  'generator-overcharged-generator': {
    keywords: {},
  },

  'grenades-concussion-grenades': {
    keywords: {
      blast: true,
    },
  },

  'grenades-emp-droid-poppers': {
    keywords: {},
  },

  'grenades-fragmentation-grenades': {
    keywords: {},
  },

  'grenades-impact-grenades': {
    isGrenade: true,
    weapons: [
      {
        name: 'Impact Grenade',
        weaponType: AttackType.Hybrid,
        blackDice: 1,
        keywords: {
          impactX: 4,
        }
      }
    ]
  },

  'grenades-smoke-grenades': {
    keywords: {},
  },

  'grenades-sonic-imploders': {
    keywords: {
      suppressive: true,
    },
  },

  'grenades-thermal-detonator': {
    keywords: {
      blast: true,
    },
  },

  'hardpoint-88i-twin-light-blaster': {
    keywords: {},
  },

  'hardpoint-ag-2g-quad-laser': {
    keywords: {},
  },

  'hardpoint-at-rt-flamethrower': {
    keywords: {
      blast: true,
      spray: true,
    },
  },

  'hardpoint-at-rt-laser-cannon': {
    keywords: {},
  },

  'hardpoint-at-rt-rotary-blaster': {
    keywords: {},
  },

  'hardpoint-at-st-mortar-launcher': {
    keywords: {
      suppressive: true,
    },
  },

  'hardpoint-ax-108-ground-buzzer': {
    keywords: {},
  },

  'hardpoint-beam-turret': {
    keywords: {},
  },

  'hardpoint-dw-3-concussion-grenade-launcher': {
    keywords: {
      blast: true,
    },
  },

  'hardpoint-heavy-laser-cannon': {
    keywords: {},
  },

  'hardpoint-heavy-laser-retrofit': {
    keywords: {},
  },

  'hardpoint-m-45-ion-blaster': {
    keywords: {},
  },

  'hardpoint-mark-ii-medium-blaster': {
    keywords: {},
  },

  'hardpoint-mo-dk-power-harpoon': {
    keywords: {},
  },

  'hardpoint-nose-mounted-flamethrower': {
    keywords: {
      blast: true,
      spray: true,
    },
  },

  'hardpoint-nose-mounted-ion-blaster': {
    keywords: {},
  },

  'hardpoint-nose-mounted-laser-cannon': {
    keywords: {},
  },

  'hardpoint-pintle-mounted-dlt-19': {
    keywords: {},
  },

  'hardpoint-pintle-mounted-rt-97c': {
    keywords: {},
  },

  'hardpoint-twin-beam-cannons': {
    keywords: {},
  },

  'hardpoint-twin-blaster-cannons': {
    keywords: {},
  },

  'hardpoint-twin-laser-turret': {
    keywords: {},
  },

  'hardpoint-twin-missile-pods': {
    keywords: {},
  },

  'heavy-weapon-agent-kallus': {
    weapons: [
      {
        name: 'J-19 Bo-Rifle',
        weaponType: AttackType.Hybrid,
        whiteDice: 1,
        blackDice: 2,
        keywords: {
          sidearmRanged: true
        }
      }
    ]
  },

  'heavy-weapon-axe-ewok': {
    keywords: {},
  },

  'heavy-weapon-b2-acm-battle-droid': {
    keywords: {},
  },

  'heavy-weapon-b2-ha-battle-droid': {
    keywords: {
      blast: true,
    },
  },

  'heavy-weapon-battle-shield-wookiee': {
    keywords: {
      armorX: '<need human>',
    },
  },

  'heavy-weapon-beskad-duelist': {
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
  },

  'heavy-weapon-bistan': {
    keywords: {},
  },

  'heavy-weapon-bowcaster-wookiee': {
    keywords: {},
  },

  'heavy-weapon-bx-series-droid-sniper': {
    keywords: {
      immuneDeflect: true,
    },
  },

  'heavy-weapon-cassian-andor': {
    keywords: {},
  },

  'heavy-weapon-cm-0-93-trooper': {
    keywords: {},
  },

  'heavy-weapon-crosshair': {
    keywords: {
      highVelocity: true,
      preciseX: '<need human>',
    },
  },

  'heavy-weapon-dc-15x-arc-trooper': {
    keywords: {
      immuneDeflect: true,
    },
  },

  'heavy-weapon-del-meeko': {
    keywords: {
      highVelocity: true,
    },
  },

  'heavy-weapon-dh-447-sniper': {
    keywords: {
      highVelocity: true,
    },
  },

  'heavy-weapon-dioxis-mine-saboteur': {
    keywords: {
      blast: true,
    },
  },

  'heavy-weapon-dlt-19-stormtrooper': {
    keywords: {},
  },

  'heavy-weapon-dlt-19d-trooper': {
    weapons: [
      {
        name: 'DLT-19D Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        redDice: 2,
        keywords: {
          impactX: 1
        }
      }
    ]
  },

  'heavy-weapon-dlt-19x-sniper': {
    keywords: {
      highVelocity: true,
    },
  },

  'heavy-weapon-dlt-20a-range-trooper': {
    keywords: {},
  },

  'heavy-weapon-dlt-20a-trooper': {
    keywords: {},
  },

  'heavy-weapon-dp-23-clone-trooper': {
    keywords: {},
  },

  'heavy-weapon-dt-f16': {
    keywords: {},
  },

  'heavy-weapon-e-5c-b1-battle-droid': {
    keywords: {},
  },

  'heavy-weapon-e-5s-b1-battle-droid': {
    keywords: {},
  },

  'heavy-weapon-e-60r-b1-battle-droid': {
    keywords: {
      cumbersome: true,
    },
  },

  'heavy-weapon-echo-arc-marksman': {
    keywords: {
      immuneDeflect: true,
    },
  },

  'heavy-weapon-echo-clone-force-99': {
    keywords: {},
  },

  'heavy-weapon-electro-whip-magnaguard': {
    keywords: {},
  },

  'heavy-weapon-electro-whip-soldier': {
    keywords: {
      suppressive: true,
    },
  },

  'heavy-weapon-electrostaff-guard': {
    keywords: {
      immunePierce: true,
    },
  },

  'heavy-weapon-flametrooper': {
    keywords: {
      blast: true,
      spray: true,
    },
  },

  'heavy-weapon-force-pike-warrior': {
    keywords: {
      suppressive: true,
    },
  },

  'heavy-weapon-gideon-hask': {
    keywords: {},
  },

  'heavy-weapon-heavy-aqua-droid': {
    keywords: {},
  },

  'heavy-weapon-hh-12-stormtrooper': {
    keywords: {
      cumbersome: true,
    },
  },

  'heavy-weapon-ig-100-magnaguard': {
    keywords: {},
  },

  'heavy-weapon-kraken': {
    keywords: {},
  },

  'heavy-weapon-kx-series-security-droids': {
    keywords: {},
  },

  'heavy-weapon-long-gun-wookiee': {
    keywords: {
      suppressive: true,
    },
  },

  'heavy-weapon-mag-det-enforcer': {
    keywords: {
      blast: true,
    },
  },

  'heavy-weapon-mandalorian-super-commando': {
    keywords: {},
  },

  'heavy-weapon-mertalizer-dark-trooper': {
    keywords: {
      suppressive: true,
    },
  },

  'heavy-weapon-mortar-clone-trooper': {
    keywords: {
      suppressive: true,
      cumbersome: true,
    },
  },

  'heavy-weapon-mpl-57-barrage-trooper': {
    keywords: {
      blast: true,
    },
  },

  'heavy-weapon-mpl-57-ion-trooper': {
    keywords: {},
  },

  'heavy-weapon-p13-m-disruptor-soldier': {
    keywords: {},
  },

  'heavy-weapon-pao': {
    keywords: {},
  },

  'heavy-weapon-proton-charge-saboteur': {
    keywords: {
      blast: true,
    },
  },

  'heavy-weapon-radiation-cannon-b1-battle-droid': {
    keywords: {},
  },

  'heavy-weapon-rebel-marksman': {
    keywords: {},
  },

  'heavy-weapon-rook-kast': {
    keywords: {},
  },

  'heavy-weapon-rps-6-arf-trooper': {
    keywords: {
      cumbersome: true,
    },
  },

  'heavy-weapon-rps-6-clone-trooper': {
    keywords: {
      cumbersome: true,
    },
  },

  'heavy-weapon-rps-6-magnaguard': {
    keywords: {},
  },

  'heavy-weapon-rt-97c-stormtrooper': {
    keywords: {},
  },

  'heavy-weapon-scatter-gun-enforcer': {
    keywords: {},
  },

  'heavy-weapon-scatter-gun-trooper': {
    keywords: {},
  },

  'heavy-weapon-sm-9-frag-launcher': {
    keywords: {
      blast: true,
    },
  },

  'heavy-weapon-sonic-cannon-warrior': {
    keywords: {},
  },

  'heavy-weapon-sonic-charge-saboteur': {
    keywords: {
      blast: true,
      suppressive: true,
    },
  },

  'heavy-weapon-stormtrooper-marksman': {
    keywords: {},
  },

  'heavy-weapon-super-commando-gunslinger': {
    keywords: {},
  },

  'heavy-weapon-super-commando-marksman': {
    keywords: {
      preciseX: '<need human>',
    },
  },

  'heavy-weapon-sx-21-trooper': {
    keywords: {},
  },

  'heavy-weapon-t-21-special-forces-trooper': {
    keywords: {},
  },

  'heavy-weapon-t-21-stormtrooper': {
    keywords: {},
  },

  'heavy-weapon-t-21a-range-trooper': {
    keywords: {
      suppressive: true,
    },
  },

  'heavy-weapon-t-21b-shoretrooper': {
    keywords: {},
  },

  'heavy-weapon-t-7-ion-snowtrooper': {
    keywords: {},
  },

  'heavy-weapon-tech': {
    keywords: {},
  },

  'heavy-weapon-tristan-wren': {
    keywords: {
      suppressive: true,
    },
  },

  'heavy-weapon-ursa-wren': {
    keywords: {},
  },

  'heavy-weapon-wrecker': {
    keywords: {},
  },

  'heavy-weapon-xs-iv-assault-cannon': {
    keywords: {},
  },

  'heavy-weapon-z-6-clone-trooper': {
    keywords: {},
  },

  'heavy-weapon-z-6-trooper': {
    keywords: {},
  },

  'ordnance-armor-piercing-shells': {
    keywords: {},
  },

  'ordnance-bunker-buster-shells': {
    keywords: {
      blast: true,
    },
  },

  'ordnance-high-energy-shells': {
    keywords: {
      highVelocity: true,
    },
  },

  'personnel-2-1b-medical-droid': {
    keywords: {},
  },

  'personnel-arf-trooper-duo': {
    keywords: {},
  },

  'personnel-astromech': {
    keywords: {},
  },

  'personnel-astromech-droid': {
    keywords: {},
  },

  'personnel-b1-battle-droid': {
    keywords: {},
  },

  'personnel-b1-battle-droid-squad': {
    keywords: {},
  },

  'personnel-b1-security-droid': {
    keywords: {},
  },

  'personnel-b2-super-battle-droid': {
    keywords: {},
  },

  'personnel-b2-super-battle-droid-squad': {
    keywords: {},
  },

  'personnel-black-sun-enforcer': {
    keywords: {},
  },

  'personnel-black-sun-vigo': {
    keywords: {},
  },

  'personnel-clone-comms-technician': {
    keywords: {},
  },

  'personnel-clone-engineer': {
    keywords: {},
  },

  'personnel-clone-marksman': {
    keywords: {},
  },

  'personnel-clone-specialist': {
    keywords: {},
  },

  'personnel-clone-trooper-infantry': {
    keywords: {},
  },

  'personnel-clone-trooper-infantry-squad': {
    keywords: {},
  },

  'personnel-clone-trooper-marksmen-squad': {
    keywords: {},
  },

  'personnel-ev-series-medical-droid': {
    keywords: {},
  },

  'personnel-ewok-skirmisher-squad': {
    keywords: {},
  },

  'personnel-ewok-slinger-squad': {
    keywords: {},
  },

  'personnel-ewok-trapper': {
    keywords: {},
  },

  'personnel-fleet-trooper': {
    keywords: {},
  },

  'personnel-fleet-trooper-squad': {
    keywords: {},
  },

  'personnel-fx-9-medical-droid': {
    keywords: {},
  },

  'personnel-geonosian-warrior': {
    keywords: {},
  },

  'personnel-geonosian-warrior-squad': {
    keywords: {},
  },

  'personnel-imperial-comms-technician': {
    keywords: {},
  },

  'personnel-imperial-dark-trooper': {
    keywords: {},
  },

  'personnel-imperial-officer': {
    keywords: {},
  },

  'personnel-oom-series-battle-droid': {
    keywords: {},
  },

  'personnel-pk-series-worker-droid': {
    keywords: {},
  },

  'personnel-pyke-syndicate-capo': {
    keywords: {},
  },

  'personnel-pyke-syndicate-foot-soldier': {
    keywords: {},
  },

  'personnel-r4-astromech': {
    keywords: {},
  },

  'personnel-range-trooper': {
    keywords: {},
  },

  'personnel-rebel-comms-technician': {
    keywords: {},
  },

  'personnel-rebel-officer': {
    keywords: {},
  },

  'personnel-rebel-trooper': {
    keywords: {},
  },

  'personnel-rebel-trooper-captain': {
    keywords: {},
  },

  'personnel-rebel-trooper-specialist': {
    keywords: {},
  },

  'personnel-rebel-trooper-squad': {
    keywords: {},
  },

  'personnel-rebel-veteran': {
    keywords: {},
  },

  'personnel-rebel-veteran-squad': {
    keywords: {},
  },

  'personnel-shoretrooper': {
    keywords: {},
  },

  'personnel-shoretrooper-squad': {
    keywords: {},
  },

  'personnel-snowtrooper': {
    keywords: {},
  },

  'personnel-snowtrooper-squad': {
    keywords: {},
  },

  'personnel-stormtrooper': {
    keywords: {},
  },

  'personnel-stormtrooper-captain': {
    keywords: {},
  },

  'personnel-stormtrooper-specialist': {
    keywords: {},
  },

  'personnel-stormtrooper-squad': {
    keywords: {},
  },

  'personnel-t-series-tactical-droid': {
    keywords: {},
  },

  'personnel-viper-recon-droid': {
    keywords: {},
  },

  'pilot-327th-star-corps-elite-armor-pilots': {
    keywords: {},
  },

  'pilot-aayla-secura': {
    keywords: {},
  },

  'pilot-baron-rudor': {
    keywords: {
      marksman: true,
    },
  },

  'pilot-clone-commander-fox': {
    keywords: {},
  },

  'pilot-clone-shock-trooper-pilot': {
    keywords: {},
  },

  'pilot-first-sergeant-arbmab': {
    keywords: {},
  },

  'pilot-frenzied-gunner': {
    keywords: {},
  },

  'pilot-gang-boss': {
    keywords: {},
  },

  'pilot-general-weiss': {
    keywords: {},
  },

  'pilot-governor-pryce': {
    keywords: {},
  },

  'pilot-hotshot-pilot': {
    keywords: {
      sharpshooterX: '<need human>',
    },
  },

  'pilot-hound-grizzer': {
    keywords: {},
  },

  'pilot-imperial-hammers-elite-armor-pilot': {
    keywords: {},
  },

  'pilot-imperial-tie-pilot': {
    keywords: {},
  },

  'pilot-lok-durd': {
    keywords: {
      suppressive: true,
    },
  },

  'pilot-oom-series-droid-pilot': {
    keywords: {},
  },

  'pilot-outer-rim-speeder-jockey': {
    keywords: {
      coverX: '<need human>',
    },
  },

  'pilot-pirate-captain': {
    keywords: {},
  },

  'pilot-plo-koon': {
    keywords: {},
  },

  'pilot-raiding-party-leader': {
    keywords: {},
  },

  'pilot-ryder-azadi': {
    keywords: {},
  },

  'pilot-shriv-suurgav': {
    keywords: {},
  },

  'pilot-t-series-tactical-droid-pilot': {
    keywords: {},
  },

  'pilot-veteran-clone-pilot': {
    keywords: {},
  },

  'pilot-wedge-antilles': {
    keywords: {},
  },

  'programming-c-3po': {
    keywords: {},
  },

  'programming-grogu': {
    keywords: {},
  },

  'programming-iden-s-id10-seeker-droid': {
    keywords: {
      shieldedX: '<need human>',
    },
  },

  'programming-omega': {
    keywords: {},
  },

  'protocol-bounty-programming': {
    keywords: {
      suppressive: true,
    },
  },

  'protocol-nanny-programming': {
    keywords: {},
  },

  'protocol-attack-protocols': {
    keywords: {
      preciseX: '<need human>',
    },
  },

  'protocol-defense-protocols': {
    keywords: {},
  },

  'protocol-engagement-protocols': {
    keywords: {},
  },

  'protocol-enhanced-combat-subroutines': {
    keywords: {
      sharpshooterX: '<need human>',
    },
  },

  'protocol-limiter-override': {
    keywords: {},
  },

  'protocol-optimized-task-flow': {
    keywords: {},
  },

  'protocol-overclock': {
    keywords: {},
  },

  'protocol-programmed-loyalty': {
    keywords: {},
  },

  'protocol-sliced-comms': {
    keywords: {},
  },

  'protocol-strategic-programming': {
    keywords: {},
  },

  'protocol-targeting-relay': {
    keywords: {},
  },

  'squad-leader-ahsoka-tano-jedi-padawan': {
    keywords: {
      block: true,
    },
  },

  'squad-leader-boil': {
    keywords: {
      guardianX: '<need human>',
    },
  },

  'squad-leader-clone-captain': {
    keywords: {
      outmaneuver: true,
    },
  },

  'squad-leader-clone-captain-rex': {
    keywords: {},
  },

  'squad-leader-clone-commander': {
    keywords: {},
  },

  'squad-leader-clone-medic': {
    keywords: {},
  },

  'squad-leader-fives': {
    keywords: {},
  },

  'squad-leader-jedi-guardian': {
    keywords: {},
  },

  'squad-leader-waxer': {
    keywords: {},
  },

  'training-call-to-arms': {
    keywords: {},
  },

  'training-duck-and-cover': {
    keywords: {},
  },

  'training-dug-in': {
    keywords: {},
  },

  'training-endurance': {
    keywords: {},
  },

  'training-forest-dwellers': {
    keywords: {},
  },

  'training-herbal-medicine': {
    keywords: {},
  },

  'training-imperial-march': {
    keywords: {},
  },

  'training-inquisitorius-training': {
    keywords: {},
  },

  'training-insatiable-curiosity': {
    keywords: {},
  },

  'training-into-the-fray': {
    keywords: {},
  },

  'training-jedi-training-force-adept': {
    keywords: {},
  },

  'training-jedi-training-master-duelist': {
    keywords: {
      outmaneuver: true,
      block: true,
    },
  },

  'training-jedi-training-peacekeeping-mission': {
    keywords: {},
  },

  'training-jedi-training-tactical-acumen': {
    keywords: {},
  },

  'training-mission-objective': {
    keywords: {},
  },

  'training-offensive-push': {
    keywords: {},
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
    keywords: {},
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
    keywords: {},
  },

  'training-up-close-and-personal': {
    keywords: {},
  }
};
