/**
 * Format a wound stat (mean, median, mode) to 2 decimal places.
 * Example: 3.21428 → "3.21"
 */
export function formatWoundStat(value: number): string {
  return value.toFixed(2);
}

/**
 * Format a probability (0–1) as a percentage with 1 decimal place.
 * Example: 0.9423 → "94.2%"
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format a per-point efficiency metric to 4 decimal places.
 * Example: 0.03 → "0.0300"
 * Returns "—" for zero or non-finite values.
 */
export function formatPerPoint(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '—';
  return value.toFixed(4);
}

/**
 * Format a per-wound efficiency metric to 1 decimal place.
 * Example: 33.333 → "33.3"
 * Returns "—" for zero or non-finite values.
 */
export function formatPerWound(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '—';
  return value.toFixed(1);
}

/**
 * Format the attacker efficiency ratio to 6 decimal places.
 * Example: 0.0006 → "0.000600"
 * Returns "—" for zero or non-finite values.
 */
export function formatEfficiencyRatio(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '—';
  return value.toFixed(6);
}
