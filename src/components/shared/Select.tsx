import { useId } from 'react';

export interface SelectOption<T extends string = string> {
  /** Internal value */
  value: T;
  /** Display text */
  label: string;
}

export interface SelectProps<T extends string = string> {
  /** Currently selected value (controlled) */
  value: T;
  /** Called when selection changes */
  onChange: (value: T) => void;
  /** Available options */
  options: SelectOption<T>[];
  /** Label text displayed above or beside the select */
  label: string;
  /** Tooltip text (rendered as title attribute) */
  tooltip?: string;
  /** Explicit ID for the select element (auto-generated if omitted) */
  id?: string;
  /** Disable interaction */
  disabled?: boolean;
}

export default function Select<T extends string = string>({
  value,
  onChange,
  options,
  label,
  tooltip,
  id: externalId,
  disabled = false,
}: SelectProps<T>) {
  const autoId = useId();
  const selectId = externalId ?? autoId;

  return (
    <div className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-gray-400 select-none"
        title={tooltip}
      >
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className="h-8 rounded border border-gray-700 bg-gray-800 px-2 text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
