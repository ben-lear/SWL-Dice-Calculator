import type { AttackConfig, AttackResult } from './types';
import { formAttackPool, upgradeDowgradeAttackDice } from './attackPool';
import { rollAttackDice, rerollAttackDice } from './attackRoll';
import { convertAttackSurges, applyMarksman, applyJarKai } from './attackSurges';
import { applyDodgeAndCover } from './dodgeCover';
import { modifyAttackDice } from './attackModifiers';
import { rollGuardianDefense, rollDefenseDice } from './defenseRoll';
import { convertDefenseSurges } from './defenseSurges';
import { modifyDefenseDice } from './defenseModifiers';
import { compareResults } from './compareResults';

/**
 * Execute the full Star Wars: Legion attack sequence (Steps 2–9).
 * Returns the final wound count and side effects.
 * 
 * This is the main orchestrator that coordinates all attack sequence steps.
 * Each step is implemented in its own module for better organization and maintainability.
 */
export function executeAttackSequence(config: AttackConfig): AttackResult {
  // Step 2 — Form Attack Pool
  const poolAfterStep2 = formAttackPool(config);

  // Step 4a — Upgrade/Downgrade Attack Dice
  const poolAfterStep4a = upgradeDowgradeAttackDice(poolAfterStep2, config);

  // Step 4b — Roll Attack Dice
  const rolledAttack = rollAttackDice(poolAfterStep4a);

  // Step 4c — Reroll Attack Dice
  const { results: afterRerolls, aimsSpent, pierceBonus, aimsSavedForMarksman } =
    rerollAttackDice(rolledAttack, config);

  // Step 4d — Convert Attack Surges
  const afterSurgeConversion = convertAttackSurges(afterRerolls, config);

  // Step 4d.5 — Apply Marksman (post-surge conversion)
  const afterMarksman = applyMarksman(afterSurgeConversion, config, aimsSavedForMarksman);

  // Step 4d.6 — Apply Jar'Kai Mastery (post-surge conversion, Melee only)
  const afterJarKai = applyJarKai(afterMarksman, config);

  // Step 5 — Apply Dodge and Cover
  const { hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, blanks: blanksAfterDodgeCover, dodgeWasSpent } =
    applyDodgeAndCover(afterJarKai, config);

  // Step 6 — Modify Attack Dice
  const { hits, crits, lethalPierce, guardianHits } =
    modifyAttackDice({ hits: hitsAfterDodgeCover, crits: critsAfterDodgeCover, blanks: blanksAfterDodgeCover }, config, aimsSpent, aimsSavedForMarksman);

  // Step 6b — Roll Guardian Defense (if Guardian absorbed hits)
  let guardianWoundsNoPierce = 0;
  let guardianBlocks = 0;
  let guardianDeflectWounds = 0;
  if (guardianHits > 0 && config.defender.guardianX > 0) {
    const guardianResult = rollGuardianDefense(guardianHits, config);
    guardianWoundsNoPierce = guardianResult.guardianWoundsNoPierce;
    guardianBlocks = guardianResult.guardianBlocks;
    guardianDeflectWounds = guardianResult.guardianDeflectWounds;
  }

  // Step 7 — Roll Defense Dice
  const { results: defenseResults, surgeCountBeforeConversion } =
    rollDefenseDice({ hits, crits }, config, lethalPierce, pierceBonus, dodgeWasSpent);

  // Step 7e — Convert Defense Surges
  const defenseAfterSurgeConversion = convertDefenseSurges(defenseResults, config, dodgeWasSpent);

  // Step 8 — Modify Defense Dice
  const { blocks: mainTargetBlocks } = modifyDefenseDice(defenseAfterSurgeConversion, config, dodgeWasSpent);

  // Step 9 — Compare Results
  const finalResult = compareResults(
    { hits, crits },
    { mainTargetBlocks, guardianBlocks, guardianHits },
    config,
    lethalPierce,
    pierceBonus,
    surgeCountBeforeConversion,
    rolledAttack,
    guardianWoundsNoPierce,
    guardianDeflectWounds,
    dodgeWasSpent
  );

  return finalResult;
}
