import { useId } from 'react';

export interface ToggleProps {
  /** Current boolean value (controlled) */
  value: boolean;
  /** Called when toggled */
  onChange: (value: boolean) => void;
  /** Label text displayed beside the toggle */
  label: string;
  /** Tooltip text (rendered as title attribute) */
  tooltip?: string;
  /** Explicit ID for the toggle input (auto-generated if omitted) */
  id?: string;
  /** Disable interaction */
  disabled?: boolean;
}

export default function Toggle({
  value,
  onChange,
  label,
  tooltip,
  id: externalId,
  disabled = false,
}: ToggleProps) {
  const autoId = useId();
  const inputId = externalId ?? autoId;

  const handleToggle = () => {
    if (!disabled) {
      onChange(!value);
    }
  };

  return (
    <div className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-gray-400 select-none cursor-pointer"
        title={tooltip}
      >
        {label}
      </label>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
          disabled:cursor-not-allowed
          ${value ? 'bg-blue-500' : 'bg-gray-700'}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
            ring-0 transition-transform duration-200 ease-in-out
            ${value ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
