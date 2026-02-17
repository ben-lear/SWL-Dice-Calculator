import { useId } from 'react';

export interface SegmentedControlOption<T extends string = string> {
  /** Internal value */
  value: T;
  /** Display text */
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  /** Currently selected value (controlled) */
  value: T;
  /** Called when selection changes */
  onChange: (value: T) => void;
  /** Available options */
  options: SegmentedControlOption<T>[];
  /** Label text displayed above or beside the control */
  label: string;
  /** Tooltip text (rendered as title attribute) */
  tooltip?: string;
  /** Explicit ID for the control element (auto-generated if omitted) */
  id?: string;
  /** Disable interaction */
  disabled?: boolean;
}

export default function SegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  label,
  tooltip,
  id: externalId,
  disabled = false,
}: SegmentedControlProps<T>) {
  const autoId = useId();
  const groupId = externalId ?? autoId;

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = options.length - 1;
    } else {
      return; // Don't handle this key
    }

    const nextOption = options[nextIndex];
    if (nextOption && nextOption.value !== value) {
      onChange(nextOption.value);
    }
    // Focus the new button
    const buttonElement = document.querySelector(
      `button[data-segmented-value="${nextOption?.value}"]`
    ) as HTMLButtonElement;
    buttonElement?.focus();
  };

  return (
    <div className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <label
        htmlFor={groupId}
        className="text-sm font-medium text-gray-300 select-none"
        title={tooltip}
      >
        {label}
      </label>
      <div
        id={groupId}
        role="radiogroup"
        aria-label={label}
        className="inline-flex min-h-[2rem] rounded border border-gray-700 bg-gray-800 overflow-hidden"
      >
        {options.map((option, index) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              data-segmented-value={option.value}
              disabled={disabled}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                if (!isActive) {
                  onChange(option.value);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                flex-1 px-3 text-sm font-medium transition-colors whitespace-nowrap
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                disabled:cursor-not-allowed
                ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
