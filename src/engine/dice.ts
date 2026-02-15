import { AttackDieColor, DefenseDieColor, AttackFace, DefenseFace } from './types';

// ============================================================================
// Attack Die Distributions (8-sided)
// ============================================================================

const ATTACK_DIE_FACES: Record<AttackDieColor, AttackFace[]> = {
  [AttackDieColor.White]: [
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Hit,
    AttackFace.Critical,
    AttackFace.Surge,
  ],
  [AttackDieColor.Black]: [
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Blank,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Critical,
    AttackFace.Surge,
  ],
  [AttackDieColor.Red]: [
    AttackFace.Blank,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Hit,
    AttackFace.Critical,
    AttackFace.Surge,
  ],
};

// ============================================================================
// Defense Die Distributions (6-sided)
// ============================================================================

const DEFENSE_DIE_FACES: Record<DefenseDieColor, DefenseFace[]> = {
  [DefenseDieColor.White]: [
    DefenseFace.Blank,
    DefenseFace.Blank,
    DefenseFace.Blank,
    DefenseFace.Blank,
    DefenseFace.Block,
    DefenseFace.Surge,
  ],
  [DefenseDieColor.Red]: [
    DefenseFace.Blank,
    DefenseFace.Blank,
    DefenseFace.Block,
    DefenseFace.Block,
    DefenseFace.Block,
    DefenseFace.Surge,
  ],
};

// ============================================================================
// Roll Functions
// ============================================================================

/**
 * Roll a single attack die of the given color.
 */
export function rollAttackDie(color: AttackDieColor): AttackFace {
  const faces = ATTACK_DIE_FACES[color];
  const index = Math.floor(Math.random() * faces.length);
  return faces[index];
}

/**
 * Roll a single defense die of the given color.
 */
export function rollDefenseDie(color: DefenseDieColor): DefenseFace {
  const faces = DEFENSE_DIE_FACES[color];
  const index = Math.floor(Math.random() * faces.length);
  return faces[index];
}

/**
 * Roll an attack pool given die color counts.
 */
export function rollAttackPool(
  redCount: number,
  blackCount: number,
  whiteCount: number
): AttackFace[] {
  const results: AttackFace[] = [];

  for (let i = 0; i < redCount; i++) {
    results.push(rollAttackDie(AttackDieColor.Red));
  }
  for (let i = 0; i < blackCount; i++) {
    results.push(rollAttackDie(AttackDieColor.Black));
  }
  for (let i = 0; i < whiteCount; i++) {
    results.push(rollAttackDie(AttackDieColor.White));
  }

  return results;
}

/**
 * Roll a defense pool given die color and count.
 */
export function rollDefensePool(color: DefenseDieColor, count: number): DefenseFace[] {
  const results: DefenseFace[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDefenseDie(color));
  }
  return results;
}

// ============================================================================
// Upgrade / Downgrade Chains
// ============================================================================

/**
 * Upgrade an attack die. Returns the upgraded color, or the same color if at max.
 */
export function upgradeAttack(color: AttackDieColor): AttackDieColor {
  switch (color) {
    case AttackDieColor.White:
      return AttackDieColor.Black;
    case AttackDieColor.Black:
      return AttackDieColor.Red;
    case AttackDieColor.Red:
      return AttackDieColor.Red; // Already at max
  }
}

/**
 * Downgrade an attack die. Returns the downgraded color, or the same color if at min.
 */
export function downgradeAttack(color: AttackDieColor): AttackDieColor {
  switch (color) {
    case AttackDieColor.Red:
      return AttackDieColor.Black;
    case AttackDieColor.Black:
      return AttackDieColor.White;
    case AttackDieColor.White:
      return AttackDieColor.White; // Already at min
  }
}

/**
 * Upgrade a defense die. Returns the upgraded color, or the same color if at max.
 */
export function upgradeDefense(color: DefenseDieColor): DefenseDieColor {
  return color === DefenseDieColor.White ? DefenseDieColor.Red : DefenseDieColor.Red;
}

/**
 * Downgrade a defense die. Returns the downgraded color, or the same color if at min.
 */
export function downgradeDefense(color: DefenseDieColor): DefenseDieColor {
  return color === DefenseDieColor.Red ? DefenseDieColor.White : DefenseDieColor.White;
}

/**
 * Apply upgrade or downgrade to a die pool (array of die colors).
 * Returns a new array with the first N dice upgraded/downgraded.
 * A die cannot be upgraded/downgraded more than once by the same effect.
 */
export function applyDieModification(
  pool: AttackDieColor[],
  count: number,
  fn: (color: AttackDieColor) => AttackDieColor
): AttackDieColor[] {
  const result = [...pool];
  let modified = 0;

  for (let i = 0; i < result.length && modified < count; i++) {
    const newColor = fn(result[i]);
    if (newColor !== result[i]) {
      result[i] = newColor;
      modified++;
    }
  }

  return result;
}
