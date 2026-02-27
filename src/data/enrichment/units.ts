/**
 * Unit enrichment data skeleton generated from raw API keywords.
 *
 * - Includes all processed units.
 * - Boolean keywords are set to true.
 * - Numeric (X) keywords are set to '<need human>'.
 */

import { AttackSurgeChart, AttackType, DefenseDieColor, DefenseSurgeChart } from '../../engine';
import type { UnitEnrichment } from './types';

export const UNIT_ENRICHMENTS: Record<string, UnitEnrichment> = {
  'han-solo-unorthodox-general': {
    courage: 2,
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
        maxRange: 2,
        keywords: {
          pierceX: 2
        }
      }
    ],
  },

  'lando-calrissian-canny-general': {
    courage: 2,
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
        maxRange: 2,
        keywords: {
          longshot: true,
        }
      }
    ],
  },

  'leia-organa-fearless-and-inventive': {
    courage: 2,
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
        maxRange: 3,
      }
    ],
  },

  'luke-skywalker-hero-of-the-rebellion': {
    courage: 3,
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
        maxRange: 2,
        keywords: {
          pierceX: 1,
          longshot: true,
        }
      }
    ],
  },

  'luke-skywalker-commander-skywalker': {
    courage: 2,
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
        maxRange: 2,
      }
    ],
  },

  'rebel-officer-fighting-for-freedom': {
    courage: 2,
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
        whiteDice: 2,
        maxRange: 2,
      }
    ],
  },

  'ahsoka-tano-fulcrum': {
    courage: 3,
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
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      dangerSenseX: 3,
      marksman: true,
      sharpshooterX: 1,
      tacticalX: 1,
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
        maxRange: 2,
      }
    ],
  },

  'chewbacca-walking-carpet': {
    courage: 2,
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
        maxRange: 3,
        keywords: {
          impactX: 1,
          pierceX: 1
        }
      }
    ],
  },

  'han-solo-reluctant-hero': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      uncannyLuckX: 3,
      arsenalX: 2,
      independentAimX: 1,
      independentDodgeX: 1,
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
        maxRange: 2,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'jyn-erso-stardust': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      sharpshooterX: 1,
      independent: 'move'
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
        maxRange: 2,
        keywords: {
          pierceX: 1,
          longshot: true,
        }
      }
    ],
  },

  'k-2so-sardonic-security-droid': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      armorX: 1,
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
    courage: 4,
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
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      repairXCapacity2: 2,
    },
    weapons: [
      {
        name: 'Electro-Shock',
        weaponType: AttackType.Hybrid,
        whiteDice: 3,
        maxRange: 1,
        keywords: {
          suppressive: true
        }
      }
    ],
  },

  'rebel-agent-defender-of-democracy': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      independentDodgeX: 1
    },
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
        whiteDice: 2,
        maxRange: 2,
      }
    ],
  },

  'sabine-wren-explosive-artist': {
    courage: 2,
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
        maxRange: 2,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'fleet-troopers': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {},
    miniatureCount: 4,
    weapons: [
      {
        name: 'DH-17 Blaster Pistol',
        weaponType: AttackType.Hybrid,
        whiteDice: 2,
        maxRange: 2,
      }
    ],
  },

  'mark-ii-medium-blaster-trooper': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    healthOverride: 4,
    keywords: {
      preparedPosition: true
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
        maxRange: 3,
        keywords: {
          criticalX: 2,
          cumbersome: true,
        }
      }
    ],
  },

  'rebel-troopers': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
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
        maxRange: 3,
      }
    ],
  },

  'rebel-veterans': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 4,
    keywords: {
      lowProfile: true,
    },
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
        maxRange: 3,
      }
    ],
  },

  'mandalorian-resistance': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 3,
    keywords: {
      impervious: true,
    },
    weapons: [
      {
        name: 'WESTAR-35 Blasters',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        maxRange: 2,
      }
    ],
  },

  'mandalorian-resistance-clan-wren': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 1,
    keywords: {
      impervious: true,
    },
    weapons: [
      {
        name: 'WESTAR-35 Blasters',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        maxRange: 2,
      }
    ],
  },

  'rebel-commandos': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 4,
    keywords: {
      lowProfile: true,
      sharpshooterX: 1,
      scoutX: 2,
    },
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
        maxRange: 3,
      }
    ],
  },

  'rebel-commandos-strike-team': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 1,
    keywords: {
      lowProfile: true,
      sharpshooterX: 1,
      scoutX: 2,
    },
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
        maxRange: 3,
      }
    ],
  },

  'rebel-sleeper-cell-ready-to-strike': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 6,
    keywords: {
      tacticalX: 1,
      scoutX: 2,
    },
    weapons: [
      {
        name: 'Det Packs',
        weaponType: AttackType.Melee,
        redDice: 1,
        keywords: {
          impactX: 1
        }
      },
      {
        name: 'Blaster Pistols',
        weaponType: AttackType.Melee,
        blackDice: 1,
        whiteDice: 1,
        keywords: {
          suppressive: true,
        }
      },
      {
        name: 'Blaster Pistols',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
      },
    ],
  },

  'wookiee-warriors-freedom-fighters': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [
      {
        name: 'Ryyk Blade',
        weaponType: AttackType.Melee,
        blackDice: 2
      },
      {
        name: 'Kashyyyk Pistol',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 2,
      }
    ],
  },

  'wookiee-warriors-kashyyyk-resistance': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        whiteDice: 1,
        blackDice: 1,
      },
      {
        name: 'X1 Carbine',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 3,
      }
    ],
  },

  '1-4-fd-laser-cannon-team': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 2,
      },
      {
        name: 'Blaster Pistols',
        weaponType: AttackType.Ranged,
        whiteDice: 4,
        maxRange: 2,
      },
      {
        name: '1-4 FD Laser Cannon',
        weaponType: AttackType.Ranged,
        blackDice: 5,
        maxRange: 5,
        keywords: {
          impactX: 2
        }
      }
    ],
  },

  'at-rt': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 2,
      scoutX: 1,
    },
    weapons: [
      {
        name: 'Grappling Claws',
        weaponType: AttackType.Melee,
        redDice: 3,
        keywords: {
          impactX: 1
        }
      },
      {
        name: 'A300 Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 3,
      }
    ],
  },

  'tauntaun-riders': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 2,
    keywords: {
      sharpshooterX: 1,
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
        name: 'Blaster Pistols',
        weaponType: AttackType.Ranged,
        redDice: 2,
        maxRange: 2,
      }
    ],
  },

  'a-a5-speeder-truck': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
    },
    weapons: [],
  },

  't-47-airspeeder': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 3,
      coverX: 1,
      immuneBlast: true,
      immuneMelee: true,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Double Laser Cannon',
        weaponType: AttackType.Ranged,
        redDice: 3,
        blackDice: 3,
        maxRange: 3,
        keywords: {
          impactX: 3
        }
      }
    ],
  },

  'x-34-landspeeder': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      coverX: 1,
      armorX: 2,
      arsenalX: 3,
    },
    weapons: [
      {
        name: 'Blaster Pistol',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 2,
      }
    ],
  },

  'darth-vader-dark-lord-of-the-sith': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [
      {
        name: 'Vader\'s Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 6,
        keywords: {
          impactX: 3,
          pierceX: 3
        }
      }
    ],
  },

  'director-orson-krennic-architect-of-terror': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1,
      },
      {
        name: 'Krennic\'s Blaster',
        weaponType: AttackType.Ranged,
        redDice: 3,
        maxRange: 2,
      }
    ],
  },

  'general-veers-master-tactician': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Combat Expertise',
        weaponType: AttackType.Melee,
        blackDice: 2,
      },
      {
        name: 'Veers\'s Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 3,
        maxRange: 3,
      }
    ],
  },

  'grand-admiral-thrawn-imperial-high-command': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [
      {
        name: 'Chiss Martial Arts',
        weaponType: AttackType.Melee,
        redDice: 4
      },
      {
        name: 'Thrawn\'s Blaster',
        weaponType: AttackType.Ranged,
        redDice: 3,
        maxRange: 2,
      }
    ],
  },

  'grand-moff-tarkin-imperial-high-command': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    weapons: [
      {
        name: 'Contempt',
        weaponType: AttackType.Melee,
        whiteDice: 1
      }
    ],
  },

  'iden-versio-inferno-squad-leader': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    keywords: {
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
        name: 'Iden\'s DLT-20A Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: Infinity,
        keywords: {
          highVelocity: true,
          pierceX: 1,
        }
      },
      {
        name: 'Iden\'s TL-50 Repeater',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 2,
        blackDice: 1,
        maxRange: 3,
        keywords: {
          criticalX: 1,
          impactX: 1
        }
      }
    ],
  },

  'imperial-officer-ruthless-efficiency': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
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
        whiteDice: 2,
        maxRange: 2,
      }
    ],
  },

  'moff-gideon-long-live-the-empire': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      sharpshooterX: 1,
      tacticalX: 1,
    },
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        redDice: 2,
      },
      {
        name: 'Gideon\'s Blaster',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'agent-kallus-hunter-of-spectres': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      immuneMeleePierce: true,
    },
    weapons: [
      {
        name: 'J-19 Bo-Rifle',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        blackDice: 3,
        maxRange: 2,
        keywords: {
          criticalX: 1,
          lethalX: 1,
          longshot: true,
        }
      }
    ],
  },

  'boba-fett-infamous-bounty-hunter': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      impervious: true,
      sharpshooterX: 2,
      arsenalX: 2,
      independentAimOrDodgeX: 1
    },
    weapons: [
      {
        name: 'Boot Spikes',
        weaponType: AttackType.Melee,
        redDice: 3,
      },
      {
        name: 'Integrated Rockets',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          impactX: 1,
        }
      },
      {
        name: 'EE-3 Carbine Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'bossk-trandoshan-terror': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      independentSurgeX: 2
    },
    weapons: [
      {
        name: 'Frenzy',
        weaponType: AttackType.Melee,
        redDice: 1,
        whiteDice: 1,
        blackDice: 2,
        keywords: {
          pierceX: 1
        }
      },
      {
        name: 'Mortar Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 4,
        maxRange: 4,
        keywords: {
          pierceX: 1,
          suppressive: true,
        }
      }
    ],
  },

  'darth-vader-the-emperor-s-apprentice': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      deflect: true,
      immunePierce: true,
      jediHunter: true,
    },
    weapons: [
      {
        name: 'Vader\'s Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 5,
        keywords: {
          impactX: 3,
          pierceX: 3
        }
      },
      {
        name: 'Force Throw',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          blast: true,
        }
      }
    ],
  },

  'fifth-brother-the-kill-is-mine': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      immunePierce: true,
      block: true,
    },
    weapons: [
      {
        name: 'Spinning Lightsaber',
        weaponType: AttackType.Melee,
        blackDice: 5,
        keywords: {
          impactX: 2,
          pierceX: 1,
          ramX: 2
        }
      },
      {
        name: 'Thrown Lightsaber',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 2, 
        keywords: {
          impactX: 2,
          pierceX: 1
        }
      }
    ],
  },

  'imperial-agent-bringing-order-to-the-galaxy': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
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
        whiteDice: 2,
        maxRange: 2,
      }
    ],
  },

  'seventh-sister-compelled-to-inflict-pain': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      block: true,
      immunePierce: true,
    },
    weapons: [
      {
        name: 'Spinning Lightsaber',
        weaponType: AttackType.Melee,
        blackDice: 5,
        keywords: {
          impactX: 2,
          pierceX: 1,
        }
      },
      {
        name: 'Thrown Lightsaber',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 2,
        keywords: {
          impactX: 2,
          pierceX: 1
        }
      }
    ],
  },

  'df-90-mortar-trooper': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    weapons: [
      {
        name: 'E-22 Blaster Rifle',
        weaponType: AttackType.Hybrid,
        blackDice: 1,
        maxRange: 3,
      },
      {
        name: 'DF-90 Mortar',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        minRange: 3,
        maxRange: 4,
        keywords: {
          criticalX: 1,
          suppressive: true,
          cumbersome: true,
        }
      }
    ],
  },

  'shoretroopers': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    miniatureCount: 4,
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'E-22 Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 3,
        keywords: {
          longshot: true,
        }
      }
    ],
  },

  'snowtroopers': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    miniatureCount: 4,
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        whiteDice: 1
      },
      {
        name: 'E-11 Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        maxRange: 3,
      }
    ],
  },

  'stormtrooper-riot-squad': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    miniatureCount: 4,
    keywords: {
      holdTheLine: true,
    },
    weapons: [
      {
        name: 'Stun Baton',
        weaponType: AttackType.Melee,
        blackDice: 1,
        keywords: {
          suppressive: true,
        }
      },
      {
        name: 'E-11 Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        maxRange: 3,
      }
    ],
  },

  'stormtroopers': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    miniatureCount: 4,
    keywords: {
      preciseX: 1,
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        whiteDice: 1
      },
      {
        name: 'E-11 Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        maxRange: 3,
      }
    ],
  },

  'stormtroopers-heavy-response-unit': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    miniatureCount: 3,
    keywords: {
      preciseX: 1,
      flexibleResponseX: 2,
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        whiteDice: 1
      },
      {
        name: 'E-11 Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        maxRange: 3,
      }
    ],
  },

  'imperial-death-troopers': {
    courage: 2,
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
        maxRange: 2,
      },
      {
        name: 'E-11D Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 3,
      }
    ],
  },

  'imperial-probe-droid': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      selfDestructX: 3,
      hover: 'air 1',
    },
    weapons: [
      {
        name: 'Light Blaster',
        weaponType: AttackType.Hybrid,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 1,
      }
    ],
  },

  'imperial-special-forces': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      marksman: true,
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1,
      },
      {
        name: 'E-11 Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 3,
      }
    ],
  },

  'imperial-special-forces-inferno-squad': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      marksman: true,
    },
    weapons: [
      {
        name: 'Close Quarters Combat',
        weaponType: AttackType.Melee,
        redDice: 1,
      },
      {
        name: 'E-11 Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 3,
      }
    ],
  },

  'scout-troopers': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 4,
    keywords: {
      sharpshooterX: 1,
      lowProfile: true,
      scoutX: 3,
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'EC-17 Hold-Out Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
      }
    ],
  },

  'scout-troopers-strike-team': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 1,
    keywords: {
      sharpshooterX: 1,
      lowProfile: true,
      scoutX: 3,
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'EC-17 Hold-Out Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
      }
    ],
  },

  '74-z-speeder-bikes': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 2,
    keywords: {
      coverX: 1,
    },
    weapons: [
      {
        name: 'EC-17 Hold-Out Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
      },
      {
        name: 'Blaster Cannon',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 3,
        keywords: {
          impactX: 1,
        }
      }
    ],
  },

  'dewback-rider': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      armorX: 1,
    },
    weapons: [
      {
        name: 'Shock Prod & Claws',
        weaponType: AttackType.Melee,
        redDice: 3,
        whiteDice: 3,
        keywords: {
          criticalX: 2,
          suppressive: true,
        }
      }
    ],
  },

  'e-web-heavy-blaster-team': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 2,
      },
      {
        name: 'Blaster Rifles',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 3,
      },
      {
        name: 'E-Web Heavy Blaster',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 2,
        whiteDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 1,
          cumbersome: true,
        }
      }
    ],
  },

  'range-troopers': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 4,
    keywords: {
      armorX: 1,
      advancedTargetingX: 'trooper 1',
    },
    weapons: [
      {
        name: 'Gription Boot Kick',
        weaponType: AttackType.Melee,
        blackDice: 1,
      },
      {
        name: 'E-10R Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 4,
      }
    ],
  },

  'at-st': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Fence-Cutting Blades',
        weaponType: AttackType.Melee,
        redDice: 4,
      },
      {
        name: 'MS-4 Twin Blaster',
        weaponType: AttackType.Ranged,
        redDice: 2,
        blackDice: 2,
        whiteDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 3,
        }
      }
    ],
  },

  'imperial-dark-troopers': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      armorX: 3,
    },
    weapons: [
      {
        name: 'Crushing Punch',
        weaponType: AttackType.Melee,
        redDice: 1,
        whiteDice: 1,
      },
      {
        name: 'E-11D Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 3,
      }
    ],
  },

  'laat-le-patrol-transport-galactic-empire': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
      arsenalX: 2,
      coverX: 1,
      immuneBlast: true,
      immuneMelee: true,
      hover: 'air 2',
    },
    weapons: [
      {
        name: 'Twin Laser Cannons',
        weaponType: AttackType.Ranged,
        redDice: 2,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          impactX: 1,
        }
      }
    ],
  },

  'major-marquand-tempest-scout-2': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Grenade Launcher',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          blast: true,
        }
      },
      {
        name: '88 Twin Light Blaster',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 3,
        keywords: {
          impactX: 1,
        }
      },
      {
        name: 'MS-4 Twin Blaster',
        weaponType: AttackType.Ranged,
        redDice: 2,
        blackDice: 2,
        whiteDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 3,
        }
      }
    ],
  },

  'tx-225-gavw-occupier-tank': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      armorX: 5,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Twin Cannons',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 1,
        maxRange: 2,
        keywords: {
          suppressive: true,
        }
      },
      {
        name: 'Quad Cannons',
        weaponType: AttackType.Ranged,
        redDice: 2,
        blackDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 2,
        }
      }
    ],
  },

  'ahsoka-tano-padawan-commander': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      shienMastery: true,
      deflect: true,
      immunePierce: true,
      scoutX: 1,
      independent: 'recover',
    },
    weapons: [
      {
        name: 'Ahsoka\'s Lightsabers',
        weaponType: AttackType.Melee,
        whiteDice: 3,
        blackDice: 5,
        keywords: {
          impactX: 2,
          pierceX: 1,
        }
      }
    ],
  },

  'anakin-skywalker-the-chosen-one': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      djemSoMastery: true,
      immunePierce: true,
      deflect: true,
    },
    weapons: [
      {
        name: 'Anakin\'s Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 5,
        keywords: {
          impactX: 3,
          pierceX: 3
        }
      }
    ],
  },

  'chewbacca-hero-of-kashyyyk': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    weapons: [
      {
        name: 'Overwhelm',
        weaponType: AttackType.Melee,
        redDice: 4,
        keywords: {
          lethalX: 1,
        }
      },
      {
        name: 'Chewbacca\'s Bowcaster',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 2,
        maxRange: 3,
        keywords: {
          criticalX: 1,
          impactX: 1,
          pierceX: 1,
        }
      }
    ],
  },

  'clone-captain-rex-honorable-soldier': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    keywords: {
      sharpshooterX: 1,
      scoutX: 1,
      tacticalX: 1,
      scoutingPartyX: 2
    },
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        redDice: 2,
      },
      {
        name: 'DC-17 Hand Blasters',
        weaponType: AttackType.Ranged,
        redDice: 3,
        maxRange: 2,
      }
    ],
  },

  'clone-commander-trained-for-leadership': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    keywords: {
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        redDice: 2,
      },
      {
        name: 'DC-15 Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3,
      }
    ],
  },

  'clone-commander-cody-leader-of-the-212th': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        redDice: 2,
      },
      {
        name: 'DC-15A Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 4,
        keywords: {
          lethalX: 1,
          impactX: 1,
        }
      }
    ],
  },

  'jedi-knight-general-strong-in-the-force': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'obi-wan-kenobi-civilized-warrior': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      immunePierce: true,
      soresuMastery: true,
      deflect: true,
    },
    weapons: [
      {
        name: 'Obi-Wan\'s Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 2,
        whiteDice: 2,
        blackDice: 2,
        keywords: {
          criticalX: 2,
          impactX: 2,
          pierceX: 2,
        }
      }
    ],
  },

  'wookiee-chieftain-clan-leader': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [
      {
        name: 'Ancestral Weapon',
        weaponType: AttackType.Melee,
        redDice: 2,
        whiteDice: 2,
        blackDice: 2,
      },
      {
        name: 'Chieftain\'s Bowcaster',
        weaponType: AttackType.Ranged,
        blackDice: 4,
        maxRange: 3,
        keywords: {
          impactX: 1,
          pierceX: 1,
        }
      }
    ],
  },

  'yoda-grand-master-of-the-jedi-order': {
    courage: 4,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      immunePierce: true,
      deflect: true,
    },
    weapons: [
      {
        name: 'Yoda\'s Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 4,
        keywords: {
          impactX: 2,
          pierceX: 2,
        }
      },
      {
        name: 'Force Wave',
        weaponType: AttackType.Ranged,
        blackDice: 4,
        maxRange: 2,
        keywords: {
          blast: true,
          suppressive: true,
        }
      }
    ],
  },

  'hondo-ohnaka-trustworthy-compatriot': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      uncannyLuckX: 3,
      arsenalX: 3,
      independentDodgeX: 3
    },
    weapons: [
      {
        name: 'Weequay\'s Cunning',
        weaponType: AttackType.Hybrid,
        blackDice: 3,
        maxRange: 1,
      },
      {
        name: 'Hondo\'s Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        whiteDice: 1,
        maxRange: 2,
      }
    ],
  },

  'jedi-knight-keeper-of-the-peace': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [],
  },

  'padme-amidala-spirited-senator': {
    courage: 3,
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
        name: 'Padme\'s Blaster',
        weaponType: AttackType.Ranged,
        redDice: 3,
        maxRange: 2,
      }
    ],
  },

  'r2-d2-independent-astromech': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    weapons: [
      {
        name: 'Electro-Shock',
        weaponType: AttackType.Hybrid,
        whiteDice: 3,
        maxRange: 1
      }
    ],
  },

  'the-bad-batch-clone-force-99': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 0,
    keywords: {
      impervious: true,
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        redDice: 1,
      },
      {
        name: 'DC-17 Hand Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 2
      }
    ],
  },

  'clone-trooper-infantry': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    miniatureCount: 4,
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'DC-15A Blaster Carbine',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 3
      }
    ],
  },

  'clone-trooper-marksmen': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    defenseDieColor: DefenseDieColor.Red,
    miniatureCount: 4,
    keywords: {
      marksman: true,
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'DC-15A Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 3,
        keywords: {
          longshot: true,
        }
      }
    ],
  },

  'weequay-pirates': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 4,
    keywords: {
      independentAimX: 1,
    },
    weapons: [
      {
        name: 'Vibroblade',
        weaponType: AttackType.Melee,
        blackDice: 1,
      },
      {
        name: 'Weequay Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 2,
        keywords: {
          versatile: true,
        }
      }
    ],
  },

  'arc-troopers': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 4,
    keywords: {
      impervious: true,
      sharpshooterX: 1,
      scoutX: 2,
      tacticalX: 1,
    },
    weapons: [
      {
        name: 'DC-17 Hand Blaster',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        maxRange: 2
      }
    ],
  },

  'arc-troopers-strike-team': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 1,
    keywords: {
      impervious: true,
      sharpshooterX: 1,
      scoutX: 2,
      tacticalX: 1,
    },
    weapons: [
      {
        name: 'DC-17 Hand Blaster',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        maxRange: 2
      }
    ],
  },

  'arf-troopers': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 4,
    keywords: {
      lowProfile: true,
      scoutX: 1,
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'DC-15A Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 4
      }
    ],
  },

  'wookiee-warriors-kashyyyk-defenders': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        whiteDice: 1,
        blackDice: 1,
      },
      {
        name: 'X1 Carbine',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 3
      }
    ],
  },

  'wookiee-warriors-noble-fighters': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      duelistAttacker: true,
      duelistDefender: true,
    },
    weapons: [
      {
        name: 'Ryyk Blade',
        weaponType: AttackType.Melee,
        blackDice: 2,
      },
      {
        name: 'Kashyyyk Pistol',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 2
      }
    ],
  },

  'at-rt-republic': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      armorX: 2,
      scoutX: 1,
    },
    weapons: [
      {
        name: 'Grappling Claws',
        weaponType: AttackType.Melee,
        redDice: 3,
        keywords: {
          impactX: 1,
        }
      },
      {
        name: 'Rocket Launcher',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        blackDice: 1,
        maxRange: 3,
        keywords: {
          criticalX: 1,
          impactX: 1
        }
      }
    ],
  },

  'barc-speeder': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      coverX: 1,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'DC-15A Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 3
      },
      {
        name: 'Twin Blaster Cannon',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 3,
        keywords: {
          fixed: 'front'
        }
      }
    ],
  },

  'clone-commandos': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 4,
    keywords: {
      shieldedX: 1,
      targetX: 1,
      completeTheMission: true
    },
    weapons: [
      {
        name: 'Gauntlet Vibroblade',
        weaponType: AttackType.Melee,
        blackDice: 2,
      },
      {
        name: 'DC-17M ICWS Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 2,
        keywords: {
          suppressive: true
        }
      }
    ],
  },

  'clone-commandos-ds-delta-squad': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 4,
    keywords: {
      shieldedX: 1,
      targetX: 2,
      independent: 'recover',
      completeTheMission: true
    },
    weapons: [
      {
        name: 'Gauntlet Vibroblade',
        weaponType: AttackType.Melee,
        blackDice: 2,
      },
      {
        name: 'DC-17M ICWS Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          suppressive: true
        }
      }
    ],
  },

  'raddaugh-gnasp-fluttercraft': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      coverX: 2,
      immuneBlast: true,
      immuneMelee: true,
    },
    weapons: [
      {
        name: 'Pilot\'s Kashyyyk Pistol',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 2,
      }
    ],
  },

  'raddaugh-gnasp-fluttercraft-attack-craft': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      coverX: 2,
      immuneBlast: true,
      immuneMelee: true,
    },
    weapons: [
      {
        name: 'Pilot\'s Kashyyyk Pistol',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 2,
      }
    ],
  },

  'infantry-support-platform': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      armorX: 3,
      coverX: 1,
    },
    weapons: [
      {
        name: 'DC-15A Blaster Rifles',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 3,
      }
    ],
  },

  'laat-le-patrol-transport': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
      arsenalX: 2,
      coverX: 1,
      immuneBlast: true,
      immuneMelee: true,
      hover: 'air 2',
    },
    weapons: [
      {
        name: 'Twin Laser Cannons',
        weaponType: AttackType.Ranged,
        redDice: 2,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          impactX: 1,
        }
      }
    ],
  },

  'saber-class-tank': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      outmaneuver: true,
      armorX: 5,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Heavy Laser Cannons',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 2,
          criticalX: 1
        }
      }
    ],
  },

  'count-dooku-darth-tyranus': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      deflect: true,
      immunePierce: true,
      makashiMastery: true,
      direct: 'trooper unit',
      cunning: true,
      masterOfTheForceX: 2
    },
    weapons: [
      {
        name: 'Dooku\'s Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 5,
        keywords: {
          impactX: 2,
          pierceX: 2,
        }
      },
      {
        name: 'Force Lightning',
        weaponType: AttackType.Ranged,
        blackDice: 6,
        maxRange: 2,
        keywords: {
          pierceX: 1,
          scatter: true,
          suppressive: true,
        }
      }
    ],
  },

  'general-grievous-sinister-cyborg': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      jediHunter: true,
      block: true,
      immunePierce: true,
    },
    weapons: [
      {
        name: 'Trophy Lightsabers',
        weaponType: AttackType.Melee,
        redDice: 2,
        whiteDice: 2,
        blackDice: 4,
        keywords: {
          impactX: 2,
          pierceX: 2,
          criticalX: 1,
        }
      },
      {
        name: 'DT-57 "Annihilator"',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          criticalX: 1,
          pierceX: 1,
          versatile: true,
        }
      }
    ],
  },

  'general-grievous-wheel-bike-warlord': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      armorX: 1,
      immuneMeleePierce: true,
      commandVehicleX: 2,
    },
    weapons: [
      {
        name: 'Trophy Lightsabers',
        weaponType: AttackType.Overrun,
        redDice: 1,
        whiteDice: 1,
        blackDice: 3,
        keywords: {
          impactX: 2,
          pierceX: 1,
          ramX: 1,
          overrunX: 1,
          scatter: true
        }
      },
      {
        name: 'Laser Cannon and Pistol',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        blackDice: 2,
        redDice: 1,
        maxRange: 2,
        keywords: {
          fixed: 'front',
          impactX: 1,
          pierceX: 1,
        }
      }
    ],
  },

  'kalani-super-tactical-droid': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      sharpshooterX: 1
    },
    weapons: [
      {
        name: 'Combat Expertise',
        weaponType: AttackType.Melee,
        blackDice: 2
      },
      {
        name: 'Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3,
        keywords: {
          lethalX: 1,
        }
      }
    ],
  },

  'kraken-super-tactical-droid': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Overwhelm',
        weaponType: AttackType.Melee,
        redDice: 4,
        keywords: {
          lethalX: 1,
        }
      },
      {
        name: 'Blaster Rifle',
        weaponType: AttackType.Ranged,
        redDice: 3,
        maxRange: 3,
        keywords: {
          lethalX: 1,
        }
      }
    ],
  },

  'poggle-the-lesser-public-leader-of-the-geonosians': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {},
    weapons: [
      {
        name: 'Staff of Command',
        weaponType: AttackType.Melee,
        blackDice: 2,
      },
      {
        name: 'Concealed Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 3,
      }
    ],
  },

  'super-tactical-command-droid-command-and-control-droid': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    weapons: [
      {
        name: 'Aggression Protocol',
        weaponType: AttackType.Melee,
        whiteDice: 1,
        blackDice: 2,
      },
      {
        name: 'E-5 Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3,
      }
    ],
  },

  't-series-tactical-droid-programmed-for-strategy': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    weapons: [
      {
        name: 'Bludgeon',
        weaponType: AttackType.Melee,
        whiteDice: 1,
      },
      {
        name: 'Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 3,
      }
    ],
  },

  'asajj-ventress-separatist-assassin': {
    courage: '<need human>',
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      deflect: true,
      immunePierce: true,
      jarKaiMastery: true,
      independentDodgeX: 1,
    },
    weapons: [
      {
        name: 'Asajj\'s Lightsabers',
        weaponType: AttackType.Melee,
        blackDice: 8,
        keywords: {
          impactX: 2,
          pierceX: 2,
        }
      }
    ],
  },

  'cad-bane-needs-no-introduction': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      dangerSenseX: 3,
      sharpshooterX: 1,
      independentDodgeX: 2
    },
    weapons: [
      {
        name: 'Martial Arts',
        weaponType: AttackType.Melee,
        blackDice: 3,
      },
      {
        name: 'LL-30 Blaster Pistols',
        weaponType: AttackType.Ranged,
        blackDice: 4,
        maxRange: 2,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'maul-impatient-apprentice': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [
      {
        name: 'Maul\'s Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 4,
        whiteDice: 4,
        keywords: {
          impactX: 2,
          pierceX: 2,
        }
      }
    ],
  },

  'sun-fac-ruthless-lieutenant': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      coverX: 1,
      deathFromAbove: true
    },
    weapons: [
      {
        name: 'Force Pike',
        weaponType: AttackType.Melee,
        redDice: 2,
        blackDice: 1,
        keywords: {
          pierceX: 1,
        }
      },
      {
        name: 'Sonic Carbine',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        redDice: 1,
        whiteDice: 1,
        maxRange: 3,
        keywords: {
          suppressive: true,
        }
      }
    ],
  },

  'super-tactical-command-droid-auxiliary-command-droid': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    weapons: [
      {
        name: 'Aggression Protocol',
        weaponType: AttackType.Melee,
        whiteDice: 1,
        blackDice: 2,
      },
      {
        name: 'E-5 Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3,
      }
    ],
  },

  'b1-battle-droids': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 6,
    weapons: [
      {
        name: 'Bludgeon',
        weaponType: AttackType.Melee,
        whiteDice: 1,
      },
      {
        name: 'E-5 Blaster Rifle',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        maxRange: 3,
      }
    ],
  },

  'b2-super-battle-droids': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    weapons: [
      {
        name: 'Wrist Rockets',
        weaponType: AttackType.Ranged,
        redDice: 1,
        maxRange: 1,
        keywords: {
          impactX: 1,
        }
      },
      {
        name: 'Arm Cannons',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        maxRange: 2,
      }
    ],
  },

  'geonosian-warriors-soldiers-of-the-hive': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 4,
    keywords: {
      deathFromAbove: true,
    },
    weapons: [
      {
        name: 'Spears',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'Sonic Blasters',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 2,
      }
    ],
  },

  'bx-series-droid-commandos': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      impervious: true,
      sharpshooterX: 1,
      scoutX: 3,
    },
    miniatureCount: 4,
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'Commando E-5 Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 3,
      }
    ],
  },

  'bx-series-droid-commandos-strike-team': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      impervious: true,
      sharpshooterX: 1,
      scoutX: 3,
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1
      },
      {
        name: 'Commando E-5 Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 2,
        maxRange: 3,
      }
    ],
  },

  'drk-1-sith-probe-droids': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      hover: 'air 1',
    },
    weapons: [
      {
        name: 'Electro-stun Blaster',
        weaponType: AttackType.Hybrid,
        whiteDice: 2,
        maxRange: 2,
        keywords: {
          suppressive: true,
        }
      }
    ],
  },

  'ig-100-magnaguard': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      immuneMeleePierce: true,
    },
    weapons: [
      {
        name: 'Electrostaff',
        weaponType: AttackType.Melee,
        blackDice: 2,
      },
      {
        name: 'Precision Laser Dart',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 2,
      }
    ],
  },

  'ig-100-magnaguard-prototype-assassin-droids': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 3,
    keywords: {
      immuneMeleePierce: true,
    },
    weapons: [
      {
        name: 'Electrostaff',
        weaponType: AttackType.Melee,
        blackDice: 1,
        whiteDice: 1,
      },
      {
        name: 'Precision Laser Dart',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 2,
      }
    ],
  },

  'tsmeu-6-wheel-bikes': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 2,
    keywords: {
      armorX: 1,
    },
    weapons: [
      {
        name: 'Spiked Wheel',
        weaponType: AttackType.Overrun,
        blackDice: 3,
        keywords: {
          overrunX: 2
        }
      },
      {
        name: 'Double Laser Cannon',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 1,
        maxRange: 2,
        keywords: {
          impactX: 1,
        }
      }
    ],
  },

  'droidekas': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 2,
    keywords: {
      shieldedX: 4,
    },
    weapons: [
      {
        name: 'Dual Blaster Cannons',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          immuneDeflect: true,
          suppressive: true,
        }
      }
    ],
  },

  'dsd1-dwarf-spider-droid': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 3,
      selfDestructX: 3
    },
    weapons: [
      {
        name: 'Wicked Kick',
        weaponType: AttackType.Melee,
        redDice: 1,
        blackDice: 1,
        whiteDice: 1
      }
    ],
  },

  'lm-432-crab-droid': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      armorX: 2,
      scoutX: 1,
      scoutingPartyX: 1
    },
    weapons: [
      {
        name: 'Crab Claws',
        weaponType: AttackType.Melee,
        redDice: 2,
        blackDice: 1,
        whiteDice: 1,
        keywords: {
          impactX: 2,
          pierceX: 1,
        }
      }
    ],
  },

  'stap-riders': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 2,
    keywords: {
      coverX: 1,
    },
    weapons: [
      {
        name: 'Dual Blaster Cannons',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3,
        keywords: {
          criticalX: 1,
        }
      }
    ],
  },

  'aat-battle-tank': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      armorX: 5,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Anti-Personnel Lasers',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 2,
      },
      {
        name: 'Artillery Cannon',
        weaponType: AttackType.Ranged,
        redDice: 4,
        minRange: 2,
        maxRange: 4,
        keywords: {
          impactX: 2,
          criticalX: 2,
          highVelocity: true
        }
      }
    ],
  },

  'aqua-droids': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 3,
    keywords: {
      armorX: 2,
      infiltrate: true,
      ai: 'attack, move'
    },
    weapons: [
      {
        name: 'Crushing Punch',
        weaponType: AttackType.Melee,
        redDice: 1,
        keywords: {
          impactX: 1,
        }
      },
      {
        name: 'Laser Cannon',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 3,
      }
    ],
  },

  'persuader-class-tank-droid': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Ion Cannons',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 2,
        keywords: {
          criticalX: 1,
          impactX: 1,
          ionX: 1,
          fixed: 'front'
        }
      },
      {
        name: 'Heavy Blasters',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 4,
        keywords: {
          criticalX: 1,
          fixed: 'front'
        }
      }
    ],
  },

  'persuader-class-tank-droid-prototype-tank-droid': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
      arsenalX: 3,
    },
    weapons: [
      {
        name: 'Prototype Ion Cannons',
        weaponType: AttackType.Ranged,
        redDice: 1,
        blackDice: 1,
        maxRange: 2,
        keywords: {
          impactX: 1,
          ionX: 1
        }
      },
      {
        name: 'Heavy Blasters',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 4,
        keywords: {
          criticalX: 1
        }
      }
    ],
  },

  'black-sun-vigo': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      independentAimX: 1
    },
    weapons: [
      {
        name: 'Vigo\'s Double Blaster',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        whiteDice: 2,
        maxRange: 2,
      }
    ],
  },

  'c-3p0-golden-god': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    weapons: [],
  },

  'gar-saxon-militant-commando': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      impervious: true,
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        redDice: 2,
      },
      {
        name: 'Gar\'s Blaster Pistol',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        redDice: 1,
        whiteDice: 1,
        maxRange: 2,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'logray-superstitious-shaman': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      lowProfile: true,
      independentAimOrDodgeX: 1
    },
    weapons: [
      {
        name: 'Staff',
        weaponType: AttackType.Melee,
        blackDice: 2,
        keywords: {
          suppressive: true,
        }
      }
    ],
  },

  'pyke-syndicate-capo': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      dangerSenseX: 2,
      independentDodgeX: 1
    },
    weapons: [
      {
        name: 'Unarmed',
        weaponType: AttackType.Melee,
        blackDice: 1,
      },
      {
        name: 'Capo\'s Long Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3,
      }
    ],
  },

  'wicket-hero-of-bright-tree': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      lowProfile: true,
      scoutX: 1,
      scoutingPartyX: 2,
      independentDodgeX: 1
    },
    weapons: [
      {
        name: 'Spear',
        weaponType: AttackType.Melee,
        redDice: 2,
        blackDice: 1,
        keywords: {
          pierceX: 1,
        }
      },
      {
        name: 'Sling',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 2,
        keywords: {
          pierceX: 1,
          primitive: true,
        }
      }
    ],
  },

  'boba-fett-infamous-bounty-hunter-mercenaries': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      impervious: true,
      sharpshooterX: 2,
      arsenalX: 2,
      independentAimOrDodgeX: 1
    },
    weapons: [
      {
        name: 'Boot Spikes',
        weaponType: AttackType.Melee,
        redDice: 3,
      },
      {
        name: 'Integrated Rockets',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          impactX: 1,
        }
      },
      {
        name: 'EE-3 Carbine Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'boba-fett-daimyo-of-mos-espa': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      impervious: true,
      sharpshooterX: 1,
      arsenalX: 2,
      tacticalX: 1,
      independentStandbyX: 1
    },
    weapons: [
      {
        name: 'Gaderffii Stick',
        weaponType: AttackType.Melee,
        redDice: 3,
        blackDice: 1
      },
      {
        name: 'EE-3 Carbine Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        maxRange: 3,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'bossk-trandoshan-terror-mercenaries': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      independentSurgeX: 2
    },
    weapons: [
      {
        name: 'Frenzy',
        weaponType: AttackType.Melee,
        redDice: 1,
        whiteDice: 1,
        blackDice: 2,
        keywords: {
          pierceX: 1
        }
      },
      {
        name: 'Mortar Rifle',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 4,
        minRange: 2,
        maxRange: 4,
        keywords: {
          pierceX: 1,
          suppressive: true,
        }
      }
    ],
  },

  'cad-bane-needs-no-introduction-mercenaries': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      dangerSenseX: 3,
      sharpshooterX: 1,
      independentDodgeX: 2
    },
    weapons: [
      {
        name: 'Martial Arts',
        weaponType: AttackType.Melee,
        blackDice: 3,
      },
      {
        name: 'LL-30 Blaster Pistols',
        weaponType: AttackType.Ranged,
        blackDice: 4,
        maxRange: 2,
        keywords: {
          pierceX: 1,
        }
      }
    ],
  },

  'din-djarin-the-mandalorian': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      impervious: true,
      arsenalX: 2,
      tacticalX: 1,
      independentAimX: 1,
      independentDodgeX: 1,
    },
    weapons: [
      {
        name: 'Vibroknife',
        weaponType: AttackType.Melee,
        blackDice: 2,
        keywords: {
          lethalX: 1,
        }
      },
      {
        name: 'IB-94 Blaster Pistol',
        weaponType: AttackType.Ranged,
        redDice: 2,
        blackDice: 1,
        maxRange: 2,
        keywords: {
          lethalX: 1,
          longshot: true,
          versatile: true,
        }
      }
    ],
  },

  'ig-11-nurse-and-protect': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      sharpshooterX: 1,
      impervious: true,
      armorX: 1,
    },
    weapons: [
      {
        name: 'Overwhelm',
        weaponType: AttackType.Melee,
        redDice: 4
      },
      {
        name: 'Modified Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 2,
        maxRange: 3,
        keywords: {
          pierceX: 1
        }
      },
      {
        name: 'Modified DLT-20A',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        whiteDice: 1,
        maxRange: 4,
      }
    ],
  },

  'ig-88-notorious-assassin-droid': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      sharpshooterX: 1,
      impervious: true,
      armorX: 1,
      arsenalX: 2
    },
    weapons: [
      {
        name: 'Vibrocleaver',
        weaponType: AttackType.Melee,
        redDice: 1,
        blackDice: 1,
        whiteDice: 1,
        keywords: {
          pierceX: 1,
        }
      },
      {
        name: 'Modified Blaster Rifle',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 2,
        maxRange: 3,
        keywords: {
          pierceX: 1
        }
      },
      {
        name: 'Modified DLT-20A',
        weaponType: AttackType.Ranged,
        blackDice: 2,
        whiteDice: 1,
        maxRange: 4,
      }
    ],
  },

  'maul-a-rival': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    keywords: {
      deflect: true,
      immunePierce: true,
    },
    weapons: [
      {
        name: 'Maul\'s Lightsaber',
        weaponType: AttackType.Melee,
        redDice: 4,
        whiteDice: 4,
        keywords: {
          impactX: 2,
          pierceX: 2,
        }
      }
    ],
  },

  'the-bad-batch-clone-force-99-mercenaries': {
    courage: 3,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 0,
    keywords: {
      impervious: true,
      sharpshooterX: 1,
    },
    weapons: [
      {
        name: 'Combat Training',
        weaponType: AttackType.Melee,
        redDice: 1,
      },
      {
        name: 'DC-17 Hand Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 2,
      }
    ],
  },

  'black-sun-enforcers': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 4,
    keywords: {
      preciseX: 1,
      independentAimX: 1
    },
    weapons: [
      {
        name: 'Close Quarters Combat',
        weaponType: AttackType.Melee,
        redDice: 1,
      },
      {
        name: 'Double Blaster',
        weaponType: AttackType.Ranged,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 2,
      }
    ],
  },

  'ewok-skirmishers': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 6,
    keywords: {
      lowProfile: true,
    },
    weapons: [
      {
        name: 'Spear',
        weaponType: AttackType.Melee,
        blackDice: 1,
      }
    ],
  },

  'pyke-syndicate-foot-soldiers': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 4,
    keywords: {
      outmaneuver: true,
      dangerSenseX: 2,
      independentDodgeX: 1
    },
    weapons: [
      {
        name: 'Stun Baton',
        weaponType: AttackType.Melee,
        whiteDice: 2,
      },
      {
        name: 'P13 Long Blaster',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 3,
      }
    ],
  },

  'ewok-slingers': {
    courage: 1,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.None,
    miniatureCount: 6,
    keywords: {
      lowProfile: true,
      independentSurgeX: 1
    },
    weapons: [
      {
        name: 'Stones',
        weaponType: AttackType.Melee,
        whiteDice: 1,
      },
      {
        name: 'Slings',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        maxRange: 2,
        keywords: {
          primitive: true
        }
      }
    ],
  },

  'mandalorian-super-commandos': {
    courage: 2,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 1,
    keywords: {
      impervious: true,
      independentAimX: 1,
    },
    weapons: [
      {
        name: 'WESTAR-35 Blasters',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        maxRange: 2,
      },
      {
        name: 'Blaster Carbines',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        whiteDice: 1,
        maxRange: 3,
      }
    ],
  },

  'swoop-bike-riders': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToHit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    miniatureCount: 2,
    keywords: {
      coverX: 1,
      independentAimOrDodgeX: 1
    },
    weapons: [
      {
        name: 'Vibro-Ax',
        weaponType: AttackType.Overrun,
        redDice: 1,
        whiteDice: 2,
        keywords: {
          overrunX: 2,
        }
      },
      {
        name: 'Heavy Blaster Pistol',
        weaponType: AttackType.Ranged,
        blackDice: 1,
        redDice: 1,
        maxRange: 2,
      }
    ],
  },

  'a-a5-speeder-truck-mercenaries': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
    },
    weapons: [],
  },

  'chewbacca-let-the-wookiee-win': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.ToCrit,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Grenade Launcher',
        weaponType: AttackType.Hybrid,
        blackDice: 2,
        maxRange: 2,
        keywords: {
          blast: true
        }
      },
      {
        name: '88 Twin Light Blaster',
        weaponType: AttackType.Hybrid,
        redDice: 1,
        whiteDice: 1,
        blackDice: 1,
        maxRange: 3,
        keywords: {
          impactX: 1,
        }
      },
      {
        name: 'MS-4 Twin Blaster',
        weaponType: AttackType.Ranged,
        redDice: 2,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 4,
        keywords: {
          impactX: 3,
        }
      }
    ],
  },

  'wlo-5-speeder-tank': {
    courage: Infinity,
    attackSurgeChart: AttackSurgeChart.None,
    defenseSurgeChart: DefenseSurgeChart.ToBlock,
    keywords: {
      armorX: 5,
      arsenalX: 2,
    },
    weapons: [
      {
        name: 'Anti-Personnel Lasers',
        weaponType: AttackType.Ranged,
        blackDice: 3,
        whiteDice: 2,
        maxRange: 2,
      },
      {
        name: 'Heavy Laser Cannon',
        weaponType: AttackType.Ranged,
        redDice: 1,
        whiteDice: 2,
        blackDice: 2,
        maxRange: 3,
        keywords: {
          impactX: 2,
        }
      }
    ],
  }
};
