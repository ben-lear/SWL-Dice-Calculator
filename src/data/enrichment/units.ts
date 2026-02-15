/**
 * Unit enrichment data skeleton generated from raw API keywords.
 *
 * - Includes all processed units.
 * - Boolean keywords are set to true.
 * - Numeric (X) keywords are set to '<need human>'.
 */

import { AttackSurgeChart, AttackType, DefenseSurgeChart } from '../../engine';
import type { UnitEnrichment } from './types';

export const UNIT_ENRICHMENTS: Record<string, UnitEnrichment> = {
  'han-solo-unorthodox-general': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      uncannyLuckX: 3,
      sharpshooterX: 1,
      lowProfile: true,
    },
    weapons: [
      {
        name: 'Brawl',
        weaponType: AttackType.Melee,
        whiteDice: 3,
      },
      {
        name: 'Han\'s DL-44 Blaster',
        weaponType: AttackType.Ranged,
        redDice: 2,
        keywords: {
          pierceX: 2
        }
      }
    ],
  },

  'lando-calrissian-canny-general': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      uncannyLuckX: 2,
    },
    weapons: [
      {
        name: 'Backup Plan',
        weaponType: AttackType.Melee,
        blackDice: 3,
      },
      {
        name: 'Lando\'s X-8 Blaster',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 3,
      }
    ],
  },

  'leia-organa-fearless-and-inventive': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      sharpshooterX: 2,
    },
    weapons: [
      {
        name: 'Martial Arts',
        weaponType: AttackType.Melee,
        blackDice: 3,
      },
      {
        name: 'Leia\'s Blaster',
        weaponType: AttackType.Ranged,
        redDice: 3,
      }
    ],
  },

  'luke-skywalker-hero-of-the-rebellion': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      immunePierce: true,
      sharpshooterX: 1,
      block: true,
    },
    weapons: [
      {
        name: 'Anakin\'s Lightsaber',
        weaponType: AttackType.Melee,
        blackDice: 3,
        redDice: 2,
        keywords: {
          pierceX: 1,
          impactX: 2,
        }
      },
      {
        name: 'Luke\'s Blaster',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 3,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'luke-skywalker-commander-skywalker': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      immunePierce: true,
    },
    weapons: [
      {
        name: 'Lightsaber & Horn',
        weaponType: AttackType.Melee,
        blackDice: 3,
        whiteDice: 3,
        keywords: {
          pierceX: 1,
          impactX: 2,
          lethalX: 1,
          ramX: 1,
        }
      },
      {
        name: 'Luke\'s Blaster',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 3,
      }
    ],
  },

  'rebel-officer-fighting-for-freedom': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {},
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        blackDice: 3,
      },
      {
        name: 'Blaster Pistol',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 2
      }
    ],
  },

  'ahsoka-tano-fulcrum': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      deflect: true,
      jarKaiMastery: true,
      immunePierce: true,
    },
    weapons: [
      {
        name: 'Ahsoka\'s Lightsabers',
        weaponType: AttackType.Melee,
        blackDice: 2,
        whiteDice: 2,
        redDice: 2,
        keywords: {
          pierceX: 2,
          impactX: 2,
        }
      }
    ],
  },

  'cassian-andor-capable-intelligence-agent': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      dangerSenseX: 3,
      marksman: true,
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Martial Arts',
        weaponType: AttackType.Melee,
        blackDice: 3,
      },
      {
        name: 'Cassian\'s Covert Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        blackDice: 2,
      }
    ],
  },

  'chewbacca-walking-carpet': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
    },
    weapons: [
      {
        name: 'Overwhelm',
        weaponType: AttackType.Melee,
        redDice: 4,
        keywords: {
          lethalX: 1
        }
      },
      {
        name: 'Chewbacca\'s Bowcaster',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 2,
        keywords: {
          impactX: 1,
          pierceX: 1
        }
      }
    ],
  },

  'han-solo-reluctant-hero': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      uncannyLuckX: 3,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Stampede',
        weaponType: AttackType.Melee,
        whiteDice: 1,
        blackDice: 2,
        keywords: {
          ramX: 1,
        }
      },
      {
        name: 'Han\'s DL-44 Blaster',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        blackDice: 1,
        whiteDice: 1,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'jyn-erso-stardust': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Collapsible Tonfa',
        weaponType: AttackType.Melee,
        blackDice: 4,
        keywords: {
          suppressive: true,
        }
      },
      {
        name: 'A-180 Blaster Pistol',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 1,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'k-2so-sardonic-security-droid': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [
      {
        name: 'Overpower',
        weaponType: AttackType.Melee,
        redDice: 4,
      }
    ],
  },

  'luke-skywalker-jedi-knight': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [
      {
        name: 'Luke\'s Lightsaber',
        weaponType: AttackType.Melee,
        blackDice: 7,
        keywords: {
          pierceX: 2,
          impactX: 2,
        }
      }
    ],
  },

  'r2-d2-hero-of-a-thousand-devices': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    weapons: [
      {
        name: 'Electro-Shock',
        weaponType: AttackType.Hybrid,
        whiteDice: 3,
        keywords: {
          suppressive: true
        }
      }
    ],
  },

  'rebel-agent-defender-of-democracy': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {},
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        blackDice: 3,
      },
      {
        name: 'Blaster Pistol',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 2
      }
    ],
  },

  'sabine-wren-explosive-artist': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      impervious: true,
    },
    weapons: [
      {
        name: 'WESTAR-35 Blasters',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        blackDice: 1,
        whiteDice: 1,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'fleet-troopers': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {},
    miniatureCount: 4,
    weapons: [
      {
        name: 'DH-17 Blaster Pistol',
        weaponType: AttackType.Hybrid,
        whiteDice: 2
      }
    ],
  },

  'mark-ii-medium-blaster-trooper': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'Mark II Medium Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 4,
        keywords: {
          criticalX: 2,
          cumbersome: true,
        }
      }
    ],
  },

  'rebel-troopers': {
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {},
    miniatureCount: 4,
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'A280 Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
      }
    ],
  },

  'rebel-veterans': {
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 4,
    keywords: {
      lowProfile: true,
    },
    weapons: [],
  },

  'mandalorian-resistance': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 3,
    keywords: {
      impervious: true,
    },
    weapons: [],
  },

  'mandalorian-resistance-clan-wren': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 1,
    keywords: {
      impervious: true,
    },
    weapons: [],
  },

  'rebel-commandos': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 4,
    keywords: {
      lowProfile: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'rebel-commandos-strike-team': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 1,
    keywords: {
      lowProfile: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'rebel-sleeper-cell-ready-to-strike': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 6,
    keywords: {
    },
    weapons: [],
  },

  'wookiee-warriors-freedom-fighters': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [],
  },

  'wookiee-warriors-kashyyyk-resistance': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  '1-4-fd-laser-cannon-team': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {},
    weapons: [],
  },

  'at-rt': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'tauntaun-riders': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 2,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'a-a5-speeder-truck': {
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  't-47-airspeeder': {
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: '<need human>',
      coverX: '<need human>',
      immuneBlast: true,
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'x-34-landspeeder': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      coverX: '<need human>',
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'darth-vader-dark-lord-of-the-sith': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'director-orson-krennic-architect-of-terror': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'general-veers-master-tactician': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'grand-admiral-thrawn-imperial-high-command': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [],
  },

  'grand-moff-tarkin-imperial-high-command': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'iden-versio-inferno-squad-leader': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      marksman: true,
    },
    weapons: [],
  },

  'imperial-officer-ruthless-efficiency': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'moff-gideon-long-live-the-empire': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'agent-kallus-hunter-of-spectres': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      immuneMeleePierce: true,
    },
    weapons: [],
  },

  'boba-fett-infamous-bounty-hunter': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'bossk-trandoshan-terror': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'darth-vader-the-emperor-s-apprentice': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      deflect: true,
      immunePierce: true,
      jediHunter: true,
    },
    weapons: [],
  },

  'fifth-brother-the-kill-is-mine': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      immunePierce: true,
      block: true,
    },
    weapons: [],
  },

  'imperial-agent-bringing-order-to-the-galaxy': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'seventh-sister-compelled-to-inflict-pain': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      block: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'df-90-mortar-trooper': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
    },
    weapons: [],
  },

  'shoretroopers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {},
    weapons: [],
  },

  'snowtroopers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {},
    weapons: [],
  },

  'stormtrooper-riot-squad': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      holdTheLine: true,
    },
    weapons: [],
  },

  'stormtroopers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      preciseX: '<need human>',
    },
    weapons: [],
  },

  'stormtroopers-heavy-response-unit': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 3,
    keywords: {
      preciseX: '<need human>',
    },
    weapons: [],
  },

  'imperial-death-troopers': {
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 4,
    keywords: {
      preciseX: 2,
    },
    weapons: [
      {
        name: 'Close Quarters Combat',
        weaponType: AttackType.Melee,
        redDice: 1
      },
      {
        name: 'SE-14r Light Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
      },
      {
        name: 'E-11D Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1
      }
    ],
  },

  'imperial-probe-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'imperial-special-forces': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      marksman: true,
    },
    weapons: [],
  },

  'imperial-special-forces-inferno-squad': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      marksman: true,
    },
    weapons: [],
  },

  'scout-troopers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      sharpshooterX: '<need human>',
      lowProfile: true,
    },
    weapons: [],
  },

  'scout-troopers-strike-team': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      lowProfile: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  '74-z-speeder-bikes': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 2,
    keywords: {
      coverX: '<need human>',
    },
    weapons: [],
  },

  'dewback-rider': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'e-web-heavy-blaster-team': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
    },
    weapons: [],
  },

  'range-troopers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'at-st': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'imperial-dark-troopers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 3,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'laat-le-patrol-transport-galactic-empire': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      immuneBlast: true,
      coverX: '<need human>',
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'major-marquand-tempest-scout-2': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'tx-225-gavw-occupier-tank': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'ahsoka-tano-padawan-commander': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      shienMastery: true,
      deflect: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'anakin-skywalker-the-chosen-one': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      djemSoMastery: true,
      immunePierce: true,
      deflect: true,
    },
    weapons: [],
  },

  'chewbacca-hero-of-kashyyyk': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      guardianX: '<need human>',
    },
    weapons: [],
  },

  'clone-captain-rex-honorable-soldier': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'clone-commander-trained-for-leadership': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'clone-commander-cody-leader-of-the-212th': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'jedi-knight-general-strong-in-the-force': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'obi-wan-kenobi-civilized-warrior': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      guardianX: '<need human>',
      immunePierce: true,
      soresuMastery: true,
      deflect: true,
    },
    weapons: [],
  },

  'wookiee-chieftain-clan-leader': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [],
  },

  'yoda-grand-master-of-the-jedi-order': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      immunePierce: true,
      deflect: true,
    },
    weapons: [],
  },

  'hondo-ohnaka-trustworthy-compatriot': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      uncannyLuckX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'jedi-knight-keeper-of-the-peace': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'padme-amidala-spirited-senator': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'r2-d2-independent-astromech': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
    },
    weapons: [],
  },

  'the-bad-batch-clone-force-99': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'clone-trooper-infantry': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {},
    weapons: [],
  },

  'clone-trooper-marksmen': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      marksman: true,
    },
    weapons: [],
  },

  'weequay-pirates': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {},
    weapons: [],
  },

  'arc-troopers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'arc-troopers-strike-team': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'arf-troopers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      lowProfile: true,
    },
    weapons: [],
  },

  'wookiee-warriors-kashyyyk-defenders': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 3,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'wookiee-warriors-noble-fighters': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 3,
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [],
  },

  'at-rt-republic': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'barc-speeder': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      coverX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'clone-commandos': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      shieldedX: '<need human>',
    },
    weapons: [],
  },

  'clone-commandos-ds-delta-squad': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      shieldedX: '<need human>',
    },
    weapons: [],
  },

  'raddaugh-gnasp-fluttercraft': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      coverX: '<need human>',
      immuneBlast: true,
    },
    weapons: [],
  },

  'raddaugh-gnasp-fluttercraft-attack-craft': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      coverX: '<need human>',
      immuneBlast: true,
    },
    weapons: [],
  },

  'infantry-support-platform': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      coverX: '<need human>',
    },
    weapons: [],
  },

  'laat-le-patrol-transport': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      coverX: '<need human>',
      immuneBlast: true,
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'saber-class-tank': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      outmaneuver: true,
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'count-dooku-darth-tyranus': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      deflect: true,
      immunePierce: true,
      makashiMastery: true,
    },
    weapons: [],
  },

  'general-grievous-sinister-cyborg': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      jediHunter: true,
      block: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'general-grievous-wheel-bike-warlord': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      immuneMeleePierce: true,
    },
    weapons: [],
  },

  'kalani-super-tactical-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'kraken-super-tactical-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'poggle-the-lesser-public-leader-of-the-geonosians': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'super-tactical-command-droid-command-and-control-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  't-series-tactical-droid-programmed-for-strategy': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'asajj-ventress-separatist-assassin': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      deflect: true,
      immunePierce: true,
      jarKaiMastery: true,
    },
    weapons: [],
  },

  'cad-bane-needs-no-introduction': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      dangerSenseX: '<need human>',
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'maul-impatient-apprentice': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'sun-fac-ruthless-lieutenant': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      coverX: '<need human>',
    },
    weapons: [],
  },

  'super-tactical-command-droid-auxiliary-command-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'b1-battle-droids': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 66,
    keywords: {},
    weapons: [],
  },

  'b2-super-battle-droids': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 3,
    keywords: {},
    weapons: [],
  },

  'geonosian-warriors-soldiers-of-the-hive': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {},
    weapons: [],
  },

  'bx-series-droid-commandos': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'bx-series-droid-commandos-strike-team': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'drk-1-sith-probe-droids': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 3,
    keywords: {
    },
    weapons: [],
  },

  'ig-100-magnaguard': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 3,
    keywords: {
      guardianX: '<need human>',
      immuneMeleePierce: true,
    },
    weapons: [],
  },

  'ig-100-magnaguard-prototype-assassin-droids': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      immuneMeleePierce: true,
    },
    weapons: [],
  },

  'tsmeu-6-wheel-bikes': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 2,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'droidekas': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 2,
    keywords: {
      shieldedX: '<need human>',
      immuneDeflect: true,
    },
    weapons: [],
  },

  'dsd1-dwarf-spider-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'lm-432-crab-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'stap-riders': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 2,
    keywords: {
      coverX: '<need human>',
    },
    weapons: [],
  },

  'aat-battle-tank': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'aqua-droids': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 3,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'persuader-class-tank-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'persuader-class-tank-droid-prototype-tank-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'black-sun-vigo': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'c-3p0-golden-god': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {},
    weapons: [],
  },

  'gar-saxon-militant-commando': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'logray-superstitious-shaman': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      lowProfile: true,
    },
    weapons: [],
  },

  'pyke-syndicate-capo': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      dangerSenseX: '<need human>',
    },
    weapons: [],
  },

  'wicket-hero-of-bright-tree': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      lowProfile: true,
    },
    weapons: [],
  },

  'boba-fett-infamous-bounty-hunter-mercenaries': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'boba-fett-daimyo-of-mos-espa': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'bossk-trandoshan-terror-mercenaries': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
    },
    weapons: [],
  },

  'cad-bane-needs-no-introduction-mercenaries': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      dangerSenseX: '<need human>',
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'din-djarin-the-mandalorian': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      impervious: true,
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'ig-11-nurse-and-protect': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      sharpshooterX: '<need human>',
      impervious: true,
      armorX: '<need human>',
    },
    weapons: [],
  },

  'ig-88-notorious-assassin-droid': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      sharpshooterX: '<need human>',
      impervious: true,
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'maul-a-rival': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'the-bad-batch-clone-force-99-mercenaries': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      impervious: true,
      sharpshooterX: '<need human>',
    },
    weapons: [],
  },

  'black-sun-enforcers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      preciseX: '<need human>',
    },
    weapons: [],
  },

  'ewok-skirmishers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 6,
    keywords: {
      lowProfile: true,
    },
    weapons: [],
  },

  'pyke-syndicate-foot-soldiers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 4,
    keywords: {
      outmaneuver: true,
      dangerSenseX: '<need human>',
    },
    weapons: [],
  },

  'ewok-slingers': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 6,
    keywords: {
      lowProfile: true,
    },
    weapons: [],
  },

  'mandalorian-super-commandos': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 3,
    keywords: {
      impervious: true,
    },
    weapons: [],
  },

  'swoop-bike-riders': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    miniatureCount: 2,
    keywords: {
      coverX: '<need human>',
    },
    weapons: [],
  },

  'a-a5-speeder-truck-mercenaries': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
    },
    weapons: [],
  },

  'chewbacca-let-the-wookiee-win': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  },

  'wlo-5-speeder-tank': {
    attackSurgeChart: undefined,
    defenseSurgeChart: undefined,
    keywords: {
      armorX: '<need human>',
      arsenalX: '<need human>',
    },
    weapons: [],
  }
};
