export interface CheckboxProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  tooltip?: string;
  disabled?: boolean;
}

export default function Checkbox({
  value,
  onChange,
  label,
  tooltip,
  disabled = false,
}: CheckboxProps) {
  return (
    <label
      className={`flex select-none items-center gap-2 text-sm min-h-[2.75rem] sm:min-h-0 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-5 w-5 sm:h-4 sm:w-4 cursor-pointer rounded border-gray-700 bg-gray-800 text-blue-500 transition-colors hover:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:hover:border-gray-700"
      />
      <span className="text-gray-300" title={tooltip}>
        {label}
      </span>
    </label>
  );
}
