import { useId, useState, useRef, useEffect, useMemo } from 'react';

export interface ComboboxOption {
  /** Unique value identifier */
  value: string;
  /** Display text */
  label: string;
  /** Optional grouping key (e.g., faction name) for visual grouping */
  group?: string;
}

export interface SearchableComboboxProps {
  /** Currently selected value (controlled). Empty string = no selection. */
  value: string;
  /** Called when an option is selected */
  onChange: (value: string) => void;
  /** Available options */
  options: ComboboxOption[];
  /** Label text displayed above the combobox */
  label: string;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Tooltip text (rendered as title attribute) */
  tooltip?: string;
  /** Explicit ID for the input element (auto-generated if omitted) */
  id?: string;
  /** Disable interaction */
  disabled?: boolean;
}

export default function SearchableCombobox({
  value,
  onChange,
  options,
  label,
  placeholder = 'Search...',
  tooltip,
  id: externalId,
  disabled = false,
}: SearchableComboboxProps) {
  const autoId = useId();
  const inputId = externalId ?? autoId;
  const listboxId = `${inputId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find the label for the currently selected value
  const selectedOption = options.find((o) => o.value === value);

  // Filter options by query (case-insensitive substring match)
  const filteredOptions = useMemo(() => {
    if (!query) return options;
    const lowerQuery = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lowerQuery));
  }, [options, query]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlighted = listRef.current.children[highlightedIndex] as HTMLElement;
      highlighted?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Reset query to show selected value
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = () => {
    if (!disabled) {
      setIsOpen(true);
      setQuery('');
      setHighlightedIndex(0);
    }
  };

  const selectOption = (option: ComboboxOption) => {
    onChange(option.value);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  // Display text: when dropdown is open, show query; when closed, show selected label
  const displayValue = isOpen ? query : (selectedOption?.label ?? '');

  return (
    <div
      ref={containerRef}
      className={`relative ${disabled ? 'opacity-50' : ''}`}
    >
      <label
        htmlFor={inputId}
        className="control-label mb-1 block"
        title={tooltip}
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen && filteredOptions[highlightedIndex]
              ? `${inputId}-option-${highlightedIndex}`
              : undefined
          }
          aria-autocomplete="list"
          value={displayValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          className="input-surface h-8 w-full px-3 pr-8 placeholder:text-gray-500"
        />
        {/* Clear button (shown when a value is selected and dropdown is closed) */}
        {value && !isOpen && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            ✕
          </button>
        )}
        {/* Chevron (shown when no value selected or dropdown is open) */}
        {(!value || isOpen) && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
            ▾
          </span>
        )}
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={`${label} options`}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border border-gray-700 bg-gray-800 py-1 shadow-lg"
        >
          {filteredOptions.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-gray-500">No matches found</li>
          ) : (
            filteredOptions.map((option, index) => (
              <li
                key={option.value}
                id={`${inputId}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  cursor-pointer px-3 py-2 text-sm
                  ${index === highlightedIndex ? 'bg-blue-600 text-white' : 'text-gray-100 hover:bg-gray-700'}
                  ${option.value === value ? 'font-medium' : ''}
                `}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
