import { useId } from 'react';

export interface NumberSpinnerProps {
  /** Current numeric value (controlled) */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Minimum allowed value (default: 0) */
  min?: number;
  /** Maximum allowed value (default: 99) */
  max?: number;
  /** Step size for increment/decrement (default: 1) */
  step?: number;
  /** Label text displayed above or beside the input */
  label?: string;
  /** Custom label content (e.g., icon) - overrides label if provided */
  labelContent?: React.ReactNode;
  /** Tooltip text (rendered as title attribute) */
  tooltip?: string;
  /** Explicit ID for input element (auto-generated if omitted) */
  id?: string;
  /** Disable all interaction */
  disabled?: boolean;
  /** Compact mode: smaller controls, no justify-between spacing */
  compact?: boolean;
  /** Custom gap between label and controls (default: gap-2) */
  gap?: string;
}

export default function NumberSpinner({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  labelContent,
  tooltip,
  id: externalId,
  disabled = false,
  compact = false,
  gap = 'gap-2',
}: NumberSpinnerProps) {
  const autoId = useId();
  const inputId = externalId ?? autoId;

  const decrement = () => {
    const next = value - step;
    if (next >= min) onChange(next);
  };

  const increment = () => {
    const next = value + step;
    if (next <= max) onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty field while typing (treat as min)
    if (raw === '') {
      onChange(min);
      return;
    }

    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();
    }
  };

  const buttonSize = compact ? 'h-8 w-6' : 'h-8 w-8';
  const inputSize = compact ? 'h-8 w-8' : 'h-8 w-12';
  const textSize = 'text-sm';
  const labelSize = 'text-sm';
  
  const displayLabel = labelContent ?? label;
  const ariaLabel = label ?? 'value';

  return (
    <div className={`flex items-center justify-between ${gap} ${disabled ? 'opacity-50' : ''}`}>
      {displayLabel && (
        <label
          htmlFor={inputId}
          className={`${labelSize} font-medium text-gray-300 select-none`}
          title={tooltip}
        >
          {displayLabel}
        </label>
      )}
      <div className="flex items-center">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${ariaLabel}`}
          className={`flex ${buttonSize} items-center justify-center rounded-l border border-r-0 border-gray-700 bg-gray-800 ${textSize} text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-gray-800`}
        >
          −
        </button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          role="spinbutton"
          className={`${inputSize} border-y border-gray-700 bg-gray-800 text-center ${textSize} text-gray-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-500`}
        />
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          aria-label={`Increase ${ariaLabel}`}
          className={`flex ${buttonSize} items-center justify-center rounded-r border border-l-0 border-gray-700 bg-gray-800 ${textSize} text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-gray-800`}
        >
          +
        </button>
      </div>
    </div>
  );
}
