# Phase 4: Shared UI Components — Implementation Plan

## Goal

Build a library of reusable, accessible input primitives that both the Attacker and Defender panels (Phase 6) will compose. Each component is styled with Tailwind CSS, supports keyboard navigation and ARIA attributes, and is fully tested in isolation. No business logic or state management — these are pure presentational components controlled via props.

---

## Overview

Phase 4 creates five shared components:

- **4A:** NumberSpinner — numeric input with increment/decrement buttons
- **4B:** Toggle — labeled on/off switch
- **4C:** Select — dropdown with label
- **4D:** SearchableCombobox — filterable dropdown with type-ahead search
- **4E:** SectionHeader — collapsible section divider

All components live in `src/components/shared/` and follow consistent patterns:

- Controlled components (value + onChange props)
- Optional `label`, `tooltip`, and `id` props
- Tailwind dark-theme styling consistent with the app shell (gray-900 surfaces, gray-100 text)
- Keyboard accessible (Tab, Enter, Escape, Arrow keys where applicable)
- ARIA attributes for screen reader support

Phase 4 depends only on Phase 1 (project scaffolding with React, TypeScript, Tailwind, Vitest). It has no dependency on the engine (Phase 2), simulator (Phase 3), or stores (Phase 5).

---

## Design Decisions

The following design decisions are documented for clarity:

1. **Controlled Components Only** — All components are fully controlled via `value` + `onChange` props. No internal state for values. This keeps the components simple, testable, and compatible with Zustand stores in Phase 5+.

2. **Tooltip Implementation** — Tooltips use the native `title` attribute for MVP simplicity. A custom tooltip component (with hover delay, positioning, etc.) is deferred to a polish pass. The `tooltip` prop maps directly to `title` on the component's root or label element.

3. **Dark Theme Consistency** — All components use the same color palette established in the Phase 1 app shell:
   - Surfaces: `bg-gray-800` (inputs) on `bg-gray-900` (panels)
   - Text: `text-gray-100` (primary), `text-gray-400` (labels/secondary)
   - Borders: `border-gray-700` (inputs), `border-gray-600` (focus)
   - Focus ring: `ring-blue-500` (standard focus indicator)
   - Accent: `text-blue-400` (interactive elements)

4. **Component Sizing** — Components use a consistent height (`h-8` / 32px) for inputs and buttons to maintain visual alignment when placed side by side or in form rows. Labels are `text-sm` with `font-medium`.

5. **ID Generation** — Components accept an optional `id` prop for explicit labeling. When omitted, a stable auto-generated ID is created via `React.useId()` to link `<label>` elements to their inputs for accessibility.

6. **Disabled State** — All components accept an optional `disabled` prop that grays out the component and prevents interaction. This is used by the attack-type filtering system (Phase 6/8) to visually disable keywords that don't apply to the selected attack type.

7. **SearchableCombobox Architecture** — Uses a text input + dropdown list pattern (ARIA combobox role) rather than a native `<select>`. This enables type-ahead filtering, which is essential for scanning a list of 50+ unit names. The dropdown opens on focus/click and closes on blur/Escape/selection.

8. **SectionHeader Collapse** — Uses CSS height transitions for smooth expand/collapse animation. Collapsed state is managed internally (uncontrolled) since it's purely visual and doesn't affect form data. An optional `defaultExpanded` prop controls initial state (defaults to `true`).

---

## Step 4A.1 — NumberSpinner Component

**File:** `src/components/shared/NumberSpinner.tsx`

A numeric input with decrement (−) and increment (+) buttons, bounded by min/max values. Used extensively throughout both panels for dice counts, token counts, and keyword X values.

### Props Interface

```tsx
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
  label: string;
  /** Tooltip text (rendered as title attribute) */
  tooltip?: string;
  /** Explicit ID for input element (auto-generated if omitted) */
  id?: string;
  /** Disable all interaction */
  disabled?: boolean;
}
```

### Implementation

```tsx
import { useId } from 'react';

export default function NumberSpinner({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  tooltip,
  id: externalId,
  disabled = false,
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

  return (
    <div className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-gray-400 select-none"
        title={tooltip}
      >
        {label}
      </label>
      <div className="flex items-center">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-l border border-r-0 border-gray-700 bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-gray-800"
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
          className="h-8 w-12 border-y border-gray-700 bg-gray-800 text-center text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-500"
        />
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-r border border-l-0 border-gray-700 bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-gray-800"
        >
          +
        </button>
      </div>
    </div>
  );
}
```

### Behavior

- Clicking − decrements by `step` (clamped to `min`)
- Clicking + increments by `step` (clamped to `max`)
- Direct keyboard entry: parsed as integer, clamped to `[min, max]`
- Arrow Up/Down keys on the input field increment/decrement
- Buttons show disabled styling when at min/max boundary
- `inputMode="numeric"` brings up numeric keyboard on mobile
- `type="text"` (not `type="number"`) avoids browser-native spinner buttons that conflict with our custom ones
- `role="spinbutton"` with `aria-valuemin/max/now` for screen readers

### Verify

- Renders label and value
- Clicking + increments, − decrements
- Cannot go below min or above max
- Direct typing updates value, clamped
- Arrow keys work
- Disabled state prevents all interaction
- Label `htmlFor` links to input `id`

---

## Step 4A.2 — NumberSpinner Unit Tests

**File:** `src/components/shared/NumberSpinner.test.tsx`

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NumberSpinner from './NumberSpinner';
import { describe, it, expect, vi } from 'vitest';

describe('NumberSpinner', () => {
  // --- Rendering ---

  it('renders the label and current value', () => {
    render(<NumberSpinner label="Red dice" value={3} onChange={() => {}} />);
    expect(screen.getByText('Red dice')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue('3');
  });

  it('renders increment and decrement buttons', () => {
    render(<NumberSpinner label="Tokens" value={0} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /decrease/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /increase/i })).toBeInTheDocument();
  });

  // --- Increment / Decrement ---

  it('calls onChange with incremented value when + is clicked', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={2} onChange={onChange} max={10} />);
    await userEvent.click(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with decremented value when − is clicked', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={3} onChange={onChange} min={0} />);
    await userEvent.click(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  // --- Boundaries ---

  it('disables decrement button at min value', () => {
    render(<NumberSpinner label="Dice" value={0} onChange={() => {}} min={0} />);
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
  });

  it('disables increment button at max value', () => {
    render(<NumberSpinner label="Dice" value={5} onChange={() => {}} max={5} />);
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled();
  });

  it('does not call onChange when clicking + at max', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={5} onChange={onChange} max={5} />);
    await userEvent.click(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when clicking − at min', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={0} onChange={onChange} min={0} />);
    await userEvent.click(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  // --- Direct Input ---

  it('clamps typed value above max to max', () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={0} onChange={onChange} min={0} max={12} />);
    const input = screen.getByRole('spinbutton');
    // Use fireEvent.change to simulate a complete value entry.
    // userEvent.type on a controlled component with mock onChange doesn't accumulate
    // keystrokes because the value prop never updates between characters.
    fireEvent.change(input, { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith(12);
  });

  it('clamps typed value below min to min', () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={5} onChange={onChange} min={2} max={12} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('treats empty input as min value', () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={3} onChange={onChange} min={0} max={12} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  // --- Keyboard ---

  it('increments on ArrowUp key', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={3} onChange={onChange} max={10} />);
    const input = screen.getByRole('spinbutton');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('decrements on ArrowDown key', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Dice" value={3} onChange={onChange} min={0} />);
    const input = screen.getByRole('spinbutton');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenCalledWith(2);
  });

  // --- Custom Step ---

  it('increments by custom step size', async () => {
    const onChange = vi.fn();
    render(<NumberSpinner label="Cost" value={100} onChange={onChange} step={5} max={999} />);
    await userEvent.click(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(105);
  });

  // --- Disabled State ---

  it('disables all inputs when disabled prop is true', () => {
    render(<NumberSpinner label="Dice" value={3} onChange={() => {}} disabled />);
    expect(screen.getByRole('spinbutton')).toBeDisabled();
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled();
  });

  // --- Tooltip ---

  it('renders tooltip as title on the label', () => {
    render(
      <NumberSpinner
        label="Pierce"
        value={2}
        onChange={() => {}}
        tooltip="Cancel defense results"
      />
    );
    expect(screen.getByText('Pierce')).toHaveAttribute('title', 'Cancel defense results');
  });

  // --- Accessibility ---

  it('links label to input via htmlFor/id', () => {
    render(<NumberSpinner label="Red dice" value={0} onChange={() => {}} id="red-dice" />);
    const label = screen.getByText('Red dice');
    expect(label).toHaveAttribute('for', 'red-dice');
    expect(screen.getByRole('spinbutton')).toHaveAttribute('id', 'red-dice');
  });

  it('sets aria-valuemin, aria-valuemax, and aria-valuenow', () => {
    render(<NumberSpinner label="Aim" value={2} onChange={() => {}} min={0} max={5} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-valuemin', '0');
    expect(input).toHaveAttribute('aria-valuemax', '5');
    expect(input).toHaveAttribute('aria-valuenow', '2');
  });
});
```

---

## Step 4B.1 — Toggle Component

**File:** `src/components/shared/Toggle.tsx`

A labeled on/off switch. Used for boolean keywords like Blast, High Velocity, Marksman, Immune: Pierce, Deflect, etc.

### Props Interface

```tsx
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
```

### Implementation

```tsx
import { useId } from 'react';

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
```

### Behavior

- Clicking the toggle or label switches between on/off
- Visual: track changes color (gray-700 → blue-500), thumb slides left/right
- Space and Enter key toggle natively via `<button>` element's built-in keyboard handling (fires `click` → `onClick`)
- `role="switch"` with `aria-checked` for screen readers
- Disabled state prevents interaction and reduces opacity

### Verify

- Renders label
- Clicking calls onChange with opposite value
- Visual state reflects `value` prop
- Keyboard toggle works (Space, Enter)
- Disabled prevents clicks
- Tooltip renders as title on label

---

## Step 4B.2 — Toggle Unit Tests

**File:** `src/components/shared/Toggle.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toggle from './Toggle';
import { describe, it, expect, vi } from 'vitest';

describe('Toggle', () => {
  // --- Rendering ---

  it('renders the label text', () => {
    render(<Toggle label="Blast" value={false} onChange={() => {}} />);
    expect(screen.getByText('Blast')).toBeInTheDocument();
  });

  it('renders as a switch role', () => {
    render(<Toggle label="Blast" value={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  // --- Toggle Behavior ---

  it('calls onChange with true when toggled from off', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when toggled from on', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={true} onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('toggles when clicking the label', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} />);
    await userEvent.click(screen.getByText('Blast'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  // --- Aria State ---

  it('sets aria-checked to true when value is true', () => {
    render(<Toggle label="Blast" value={true} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('sets aria-checked to false when value is false', () => {
    render(<Toggle label="Blast" value={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  // --- Keyboard ---

  it('toggles on Space key (native button behavior)', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch');
    toggle.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('toggles on Enter key (native button behavior)', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch');
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // --- Disabled ---

  it('does not call onChange when disabled', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Blast" value={false} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('button is disabled when disabled prop is true', () => {
    render(<Toggle label="Blast" value={false} onChange={() => {}} disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  // --- Tooltip ---

  it('renders tooltip as title on the label', () => {
    render(
      <Toggle label="Blast" value={false} onChange={() => {}} tooltip="Ignore cover" />
    );
    expect(screen.getByText('Blast')).toHaveAttribute('title', 'Ignore cover');
  });
});
```

---

## Step 4C.1 — Select Component

**File:** `src/components/shared/Select.tsx`

A labeled dropdown select. Used for surge charts (c→a / c→b / None), defense die color (White / Red), cover type (None / Light / Heavy), attack type, reroll strategy, and Marksman strategy.

### Props Interface

```tsx
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
```

### Implementation

```tsx
import { useId } from 'react';

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
```

### Behavior

- Native `<select>` element — automatically provides keyboard navigation (Arrow keys, type-to-search), mobile-friendly picker, and full accessibility
- Generic type `T` constrains value to specific string literal types (e.g., `AttackSurgeChart`, `CoverType`)
- Change fires `onChange` with the new value cast to `T`
- Disabled state is handled natively by the `<select>` element

### Verify

- Renders label and all options
- Selecting an option calls onChange with the correct value
- Current value is displayed as selected
- Disabled prevents interaction
- Tooltip on label

### Notes

- Using native `<select>` is intentional for MVP. It provides built-in keyboard nav, mobile OS pickers, and full a11y for free. A custom styled dropdown can replace it in a polish phase if needed.
- The dark-theme styling (`bg-gray-800`, `text-gray-100`) works on all browsers but the dropdown menu itself may render with OS-native colors on some platforms. This is acceptable for MVP.

---

## Step 4C.2 — Select Unit Tests

**File:** `src/components/shared/Select.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from './Select';
import { describe, it, expect, vi } from 'vitest';

const surgeOptions = [
  { value: 'none', label: 'None' },
  { value: 'to-hit', label: 'c → a (Hit)' },
  { value: 'to-crit', label: 'c → b (Crit)' },
];

describe('Select', () => {
  // --- Rendering ---

  it('renders the label text', () => {
    render(
      <Select label="Surge chart" value="none" onChange={() => {}} options={surgeOptions} />
    );
    expect(screen.getByText('Surge chart')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(
      <Select label="Surge chart" value="none" onChange={() => {}} options={surgeOptions} />
    );
    const select = screen.getByRole('combobox');
    expect(select.children).toHaveLength(3);
  });

  it('displays the selected value', () => {
    render(
      <Select label="Surge chart" value="to-hit" onChange={() => {}} options={surgeOptions} />
    );
    expect(screen.getByRole('combobox')).toHaveValue('to-hit');
  });

  // --- Selection ---

  it('calls onChange with the new value when selection changes', async () => {
    const onChange = vi.fn();
    render(
      <Select label="Surge chart" value="none" onChange={onChange} options={surgeOptions} />
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), 'to-crit');
    expect(onChange).toHaveBeenCalledWith('to-crit');
  });

  // --- Disabled ---

  it('disables the select when disabled prop is true', () => {
    render(
      <Select label="Surge chart" value="none" onChange={() => {}} options={surgeOptions} disabled />
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  // --- Tooltip ---

  it('renders tooltip as title on the label', () => {
    render(
      <Select
        label="Surge chart"
        value="none"
        onChange={() => {}}
        options={surgeOptions}
        tooltip="Unit card surge conversion"
      />
    );
    expect(screen.getByText('Surge chart')).toHaveAttribute('title', 'Unit card surge conversion');
  });

  // --- Accessibility ---

  it('links label to select via htmlFor/id', () => {
    render(
      <Select
        label="Surge chart"
        value="none"
        onChange={() => {}}
        options={surgeOptions}
        id="surge-chart"
      />
    );
    expect(screen.getByText('Surge chart')).toHaveAttribute('for', 'surge-chart');
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'surge-chart');
  });
});
```

---

## Step 4D.1 — SearchableCombobox Component

**File:** `src/components/shared/SearchableCombobox.tsx`

A filterable dropdown for selecting from a large list. Used for unit/weapon preset selection in both Attacker and Defender panels. Supports type-ahead filtering, keyboard navigation of the filtered list, and clear selection.

### Props Interface

```tsx
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
```

### Implementation

```tsx
import { useId, useState, useRef, useEffect, useMemo } from 'react';

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
        className="mb-1 block text-sm font-medium text-gray-400 select-none"
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
          className="h-8 w-full rounded border border-gray-700 bg-gray-800 px-3 pr-8 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed"
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
```

### Behavior

- **Closed state:** Displays the selected option's label (or placeholder). Clicking/focusing opens the dropdown.
- **Open state:** Input clears to show a text field. Typing filters options by case-insensitive substring match. Filtered list updates in real time.
- **Keyboard navigation:**
  - Arrow Down: open dropdown / move highlight down
  - Arrow Up: move highlight up
  - Enter: select highlighted option
  - Escape: close dropdown without selecting
- **Clear button:** When a value is selected and dropdown is closed, a ✕ button clears the selection.
- **Click outside:** Closes dropdown.
- **"No matches found":** Shown when filter produces empty results.
- **ARIA:** `role="combobox"` on input, `role="listbox"` on dropdown, `role="option"` on each item, `aria-expanded`, `aria-activedescendant`, `aria-selected`.

### Verify

- Opens on focus/click
- Typing filters options
- Arrow keys navigate, Enter selects
- Escape closes
- Clear button resets value
- Click outside closes
- Renders selected option label when closed
- ARIA attributes are correct
- Disabled prevents opening

---

## Step 4D.2 — SearchableCombobox Unit Tests

**File:** `src/components/shared/SearchableCombobox.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchableCombobox from './SearchableCombobox';
import { describe, it, expect, vi } from 'vitest';

const unitOptions = [
  { value: 'vader', label: 'Darth Vader (Lightsaber)' },
  { value: 'stormtroopers', label: 'Stormtroopers (DLT-19)' },
  { value: 'shore', label: 'Shore Troopers (T-21B)' },
  { value: 'luke', label: 'Luke Skywalker (Lightsaber)' },
  { value: 'rebels', label: 'Rebel Troopers' },
];

describe('SearchableCombobox', () => {
  // --- Rendering ---

  it('renders the label text', () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    expect(screen.getByText('Unit')).toBeInTheDocument();
  });

  it('displays placeholder when no value is selected', () => {
    render(
      <SearchableCombobox
        label="Unit"
        value=""
        onChange={() => {}}
        options={unitOptions}
        placeholder="Select a unit..."
      />
    );
    expect(screen.getByPlaceholderText('Select a unit...')).toBeInTheDocument();
  });

  it('displays selected option label when value is set', () => {
    render(
      <SearchableCombobox label="Unit" value="vader" onChange={() => {}} options={unitOptions} />
    );
    expect(screen.getByRole('combobox')).toHaveValue('Darth Vader (Lightsaber)');
  });

  // --- Opening ---

  it('opens dropdown on focus', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  // --- Filtering ---

  it('filters options as user types', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'vader');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Darth Vader');
  });

  it('shows "No matches found" when filter produces no results', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'zzzzz');
    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  it('filters case-insensitively', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'STORM');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Stormtroopers');
  });

  // --- Selection ---

  it('calls onChange when an option is clicked', async () => {
    const onChange = vi.fn();
    render(
      <SearchableCombobox label="Unit" value="" onChange={onChange} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Darth Vader (Lightsaber)'));
    expect(onChange).toHaveBeenCalledWith('vader');
  });

  it('closes dropdown after selection', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Darth Vader (Lightsaber)'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // --- Clear ---

  it('shows clear button when value is selected', () => {
    render(
      <SearchableCombobox label="Unit" value="vader" onChange={() => {}} options={unitOptions} />
    );
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('calls onChange with empty string when clear is clicked', async () => {
    const onChange = vi.fn();
    render(
      <SearchableCombobox label="Unit" value="vader" onChange={onChange} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  // --- Keyboard Navigation ---

  it('navigates options with arrow keys and selects with Enter', async () => {
    const onChange = vi.fn();
    render(
      <SearchableCombobox label="Unit" value="" onChange={onChange} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}'); // highlight second option
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('stormtroopers');
  });

  it('closes dropdown on Escape without selecting', async () => {
    const onChange = vi.fn();
    render(
      <SearchableCombobox label="Unit" value="" onChange={onChange} options={unitOptions} />
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  // --- Disabled ---

  it('does not open dropdown when disabled', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} disabled />
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // --- Accessibility ---

  it('sets aria-expanded correctly', async () => {
    render(
      <SearchableCombobox label="Unit" value="" onChange={() => {}} options={unitOptions} />
    );
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('links label to input via htmlFor/id', () => {
    render(
      <SearchableCombobox
        label="Unit"
        value=""
        onChange={() => {}}
        options={unitOptions}
        id="unit-select"
      />
    );
    expect(screen.getByText('Unit')).toHaveAttribute('for', 'unit-select');
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'unit-select');
  });
});
```

---

## Step 4E.1 — SectionHeader Component

**File:** `src/components/shared/SectionHeader.tsx`

A collapsible section divider that groups related inputs. Used to organize keyword sections (e.g., "Keywords", "Tokens", "Upgrades") within the Attacker and Defender panels.

### Props Interface

```tsx
export interface SectionHeaderProps {
  /** Section title text */
  title: string;
  /** Content to show/hide */
  children: React.ReactNode;
  /** Whether the section starts expanded (default: true) */
  defaultExpanded?: boolean;
}
```

### Implementation

```tsx
import { useState } from 'react';

export default function SectionHeader({
  title,
  children,
  defaultExpanded = true,
}: SectionHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-t border-gray-800 pt-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between py-2 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </span>
        <span
          className={`text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-3 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### Behavior

- Click header to toggle expand/collapse
- Chevron rotates to indicate state (▾ expanded, ▸ collapsed)
- Content animates via CSS `max-height` + `opacity` transition
- `aria-expanded` on the toggle button for screen readers
- `defaultExpanded` controls initial state (defaults to true so all keywords are visible on load)
- Internally managed state (uncontrolled) — collapse state is purely visual and doesn't affect form data

### Verify

- Section starts expanded by default
- Click collapses, hides children
- Click again expands, shows children
- `defaultExpanded={false}` starts collapsed
- Content renders correctly inside the section
- Chevron rotates on toggle

### Notes

- `max-h-[2000px]` is used as a "large enough" value for the expand animation. This avoids needing JavaScript height measurement while still animating smoothly. The value is set high to accommodate panels with many keyword inputs.
- The outer `border-t` and `pt-2` create visual separation between sections without requiring explicit spacing from the parent.

---

## Step 4E.2 — SectionHeader Unit Tests

**File:** `src/components/shared/SectionHeader.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectionHeader from './SectionHeader';
import { describe, it, expect } from 'vitest';

describe('SectionHeader', () => {
  // --- Rendering ---

  it('renders the title text', () => {
    render(
      <SectionHeader title="Keywords">
        <span>Keyword inputs here</span>
      </SectionHeader>
    );
    expect(screen.getByText('Keywords')).toBeInTheDocument();
  });

  it('renders children when expanded', () => {
    render(
      <SectionHeader title="Keywords">
        <span>Keyword inputs here</span>
      </SectionHeader>
    );
    expect(screen.getByText('Keyword inputs here')).toBeInTheDocument();
  });

  // --- Default Expanded ---

  it('starts expanded by default', () => {
    render(
      <SectionHeader title="Keywords">
        <span>Content</span>
      </SectionHeader>
    );
    expect(screen.getByRole('button', { name: /keywords/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('starts collapsed when defaultExpanded is false', () => {
    render(
      <SectionHeader title="Keywords" defaultExpanded={false}>
        <span>Content</span>
      </SectionHeader>
    );
    expect(screen.getByRole('button', { name: /keywords/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  // --- Toggle ---

  it('collapses when toggle button is clicked', async () => {
    render(
      <SectionHeader title="Keywords">
        <span>Content</span>
      </SectionHeader>
    );
    const toggle = screen.getByRole('button', { name: /keywords/i });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands when collapsed and toggle is clicked', async () => {
    render(
      <SectionHeader title="Keywords" defaultExpanded={false}>
        <span>Content</span>
      </SectionHeader>
    );
    const toggle = screen.getByRole('button', { name: /keywords/i });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles back and forth', async () => {
    render(
      <SectionHeader title="Tokens">
        <span>Token content</span>
      </SectionHeader>
    );
    const toggle = screen.getByRole('button', { name: /tokens/i });
    // Start expanded
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // Collapse
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Expand again
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  // --- Multiple Sections ---

  it('collapses independently when multiple sections exist', async () => {
    render(
      <>
        <SectionHeader title="Tokens">
          <span>Token content</span>
        </SectionHeader>
        <SectionHeader title="Keywords">
          <span>Keyword content</span>
        </SectionHeader>
      </>
    );
    const tokensToggle = screen.getByRole('button', { name: /tokens/i });
    const keywordsToggle = screen.getByRole('button', { name: /keywords/i });

    // Collapse only tokens
    await userEvent.click(tokensToggle);
    expect(tokensToggle).toHaveAttribute('aria-expanded', 'false');
    expect(keywordsToggle).toHaveAttribute('aria-expanded', 'true');
  });
});
```

---

## Step 4F — Barrel Export

**File:** `src/components/shared/index.ts`

Create a barrel export file for convenient imports from the shared components directory.

```ts
export { default as NumberSpinner } from './NumberSpinner';
export type { NumberSpinnerProps } from './NumberSpinner';

export { default as Toggle } from './Toggle';
export type { ToggleProps } from './Toggle';

export { default as Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

export { default as SearchableCombobox } from './SearchableCombobox';
export type { SearchableComboboxProps, ComboboxOption } from './SearchableCombobox';

export { default as SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';
```

This allows Phase 6 panels to import all shared components from a single path:

```tsx
import { NumberSpinner, Toggle, Select, SearchableCombobox, SectionHeader } from '../shared';
```

---

## Verification Checklist

After completing all steps, confirm:

| Check | Command / Action |
|-------|-----------------|
| All components render | Create a temporary demo page or test each with `npm test` |
| TypeScript compiles | `npx tsc --noEmit` — no type errors |
| All tests pass | `npm test -- --run` — all test suites green |
| NumberSpinner | Increment/decrement, min/max boundaries, keyboard, disabled, ARIA |
| Toggle | On/off click, label click, keyboard, disabled, ARIA switch role |
| Select | Option selection, disabled, label-to-select linking, ARIA |
| SearchableCombobox | Filter, keyboard nav, select, clear, close on outside click, ARIA |
| SectionHeader | Expand/collapse toggle, animation, aria-expanded, default states |
| Barrel export | `import { NumberSpinner, Toggle, ... } from '../shared'` resolves |
| Dark theme | All components visually consistent with app shell (gray-800/900 palette) |
| Accessible | Labels linked to inputs, ARIA roles set, keyboard navigation works |

---

## Files Created in This Phase

| File | Description |
|------|-------------|
| `src/components/shared/NumberSpinner.tsx` | Numeric spinner with ±, min/max, label, tooltip |
| `src/components/shared/NumberSpinner.test.tsx` | Unit tests for NumberSpinner |
| `src/components/shared/Toggle.tsx` | Labeled on/off switch |
| `src/components/shared/Toggle.test.tsx` | Unit tests for Toggle |
| `src/components/shared/Select.tsx` | Labeled dropdown select |
| `src/components/shared/Select.test.tsx` | Unit tests for Select |
| `src/components/shared/SearchableCombobox.tsx` | Filterable searchable dropdown |
| `src/components/shared/SearchableCombobox.test.tsx` | Unit tests for SearchableCombobox |
| `src/components/shared/SectionHeader.tsx` | Collapsible section divider |
| `src/components/shared/SectionHeader.test.tsx` | Unit tests for SectionHeader |
| `src/components/shared/index.ts` | Barrel export for all shared components |

---

## Dependency Notes

- **Phase 4 depends on:** Phase 1 (React, TypeScript, Tailwind, Vitest configured)
- **Phase 4 is required by:** Phase 6 (Attacker/Defender panels compose these components), Phase 7 (Results panel may use Select for iteration count)
- **Phase 4 does NOT depend on:** Phase 2 (engine), Phase 3 (simulator), Phase 5 (stores)
- **Parallelism:** Phase 4 can proceed in parallel with Phases 2, 3, and 5A once Phase 1 is complete

---

## Usage Preview

When Phase 6 assembles the Attacker panel, components will be used like:

```tsx
import { NumberSpinner, Toggle, Select, SearchableCombobox, SectionHeader } from '../shared';

// In AttackerPanel component:

<SearchableCombobox
  label="Unit / Weapon"
  value={selectedUnit}
  onChange={setSelectedUnit}
  options={unitOptions}
  placeholder="Search units..."
/>

<SectionHeader title="Dice Pool">
  <NumberSpinner label="Red dice" value={redDice} onChange={setRedDice} min={0} max={12} />
  <NumberSpinner label="Black dice" value={blackDice} onChange={setBlackDice} min={0} max={12} />
  <NumberSpinner label="White dice" value={whiteDice} onChange={setWhiteDice} min={0} max={12} />
  <Select
    label="Surge chart"
    value={surgeChart}
    onChange={setSurgeChart}
    options={[
      { value: 'none', label: 'None' },
      { value: 'to-hit', label: 'c → a (Hit)' },
      { value: 'to-crit', label: 'c → b (Crit)' },
    ]}
  />
</SectionHeader>

<SectionHeader title="Keywords">
  <NumberSpinner label="Pierce" value={pierce} onChange={setPierce} min={0} max={5}
    tooltip="Cancel defense die results" />
  <Toggle label="Blast" value={blast} onChange={setBlast}
    tooltip="Defender ignores cover" />
</SectionHeader>
```
