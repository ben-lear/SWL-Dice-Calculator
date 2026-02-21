// ============================================================================
// Series Color Tokens — single source of truth for the 4-series color palette
// ============================================================================

export interface SeriesColor {
  base: string;
  light: string;
}

export const SERIES_COLORS: Record<string, SeriesColor> = {
  indigo:  { base: '#6366f1', light: '#818cf8' },
  emerald: { base: '#10b981', light: '#34d399' },
  amber:   { base: '#f59e0b', light: '#fbbf24' },
  rose:    { base: '#f43f5e', light: '#fb7185' },
};

const DEFAULT_COLOR: SeriesColor = SERIES_COLORS.indigo;

/** Get the base hex color for a series slot name. Returns undefined if not recognised. */
export function getHexColor(colorName?: string): string | undefined {
  if (!colorName) return undefined;
  return SERIES_COLORS[colorName]?.base;
}

/** Get the base hex color with a fallback (for chart series). */
export function getSeriesHexColor(colorName: string): string {
  return SERIES_COLORS[colorName]?.base ?? DEFAULT_COLOR.base;
}

/** Get both base and light hex colors (for chart gradients/fills). */
export function getSeriesColor(colorName: string): SeriesColor {
  return SERIES_COLORS[colorName] ?? DEFAULT_COLOR;
}
