// ============================================================================
// Chart Theme Constants — single source of truth for Recharts styling
// ============================================================================

/**
 * Grid styling for CartesianGrid component
 */
export const CHART_GRID = {
  strokeDasharray: '3 3',
  stroke: '#374151', // gray-700
};

/**
 * Axis styling for XAxis/YAxis components
 */
export const CHART_AXIS = {
  stroke: '#4b5563', // gray-600
  tickFill: '#9ca3af', // gray-400
  tickFontSize: 11,
  labelFill: '#9ca3af', // gray-400
  labelFontSize: 12,
};

/**
 * Cursor styling for Tooltip component
 */
export const CHART_CURSOR = {
  fill: 'rgba(99, 102, 241, 0.1)', // indigo-500 at 10%
};

/**
 * Bar styling defaults
 */
export const CHART_BAR = {
  radius: [2, 2, 0, 0] as [number, number, number, number],
};
