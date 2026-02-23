# Testing Instructions

> **Applies to:** All test files (`*.test.ts`, `*.test.tsx`), `src/test/`, `src/integration/`, `e2e/`

## Purpose

Testing conventions, patterns, and tooling for the Just Roll Crits codebase.

## Test Toolchain

| Tool | Purpose | Config |
|------|---------|--------|
| **Vitest** | Unit + integration tests | `vite.config.ts` → `test` block |
| **happy-dom** | DOM environment for component tests | `vite.config.ts` → `test.environment` |
| **React Testing Library** | Component rendering + interaction | `@testing-library/react`, `@testing-library/user-event` |
| **@testing-library/jest-dom** | DOM assertion matchers (`toBeInTheDocument`, etc.) | `src/test/setup.ts` |
| **Playwright** | E2E browser tests | `playwright.config.ts` |

## Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run test` | Watch mode (Vitest) | During development |
| `npm run test:run` | Single pass | CI / before committing |
| `npm run test:coverage` | With coverage report | Periodic coverage checks |
| `npm run test:e2e` | Playwright headless | CI / smoke testing |
| `npm run test:e2e:headed` | Playwright with browser | Debugging E2E failures |
| `npm run test:e2e:ui` | Playwright interactive UI | Developing E2E tests |

## Test Organization

### Co-located tests (preferred)
```
src/engine/dice.ts
src/engine/dice.test.ts         ← co-located

src/components/shared/Toggle.tsx
src/components/shared/Toggle.test.tsx  ← co-located
```

### `__tests__/` subdirectories (used sparingly)
```
src/stores/__tests__/upgradeBarHelpers.test.ts
src/data/__tests__/presetGenerator.test.ts
```

Prefer co-located. Use `__tests__/` only when the test file name would be ambiguous in the same directory.

## Engine Test Patterns

### Always use factory helpers
Import from `src/engine/testHelpers.ts`:

```ts
import { createMinimalAttacker, createMinimalDefender, createAttackerWithWeapon } from './testHelpers';
```

Never construct raw `AttackerConfig`/`DefenderConfig` manually — the factories ensure all required fields have valid defaults.

### Testing a single step function
```ts
describe('modifyAttackDice', () => {
  it('Impact converts hits to crits against Armor', () => {
    const attacker = createAttackerWithWeapon(
      { redDice: 4, keywords: { impactX: 2 } },
    );
    const defender = createMinimalDefender({ armorX: 1 });
    // ... call function, assert results
  });
});
```

### Testing keyword interactions
Name test cases to describe the rule interaction explicitly:
```ts
it('Pierce X is reduced by Immune: Melee Pierce in melee attack type', () => { ... });
it('Impervious converts pierce to blocks in defense modifier step', () => { ... });
```

### Statistical tests (Monte Carlo)
For simulation tests, use enough iterations for confidence but keep tests fast:
```ts
const result = simulate(config, 10_000);
expect(result.totalWounds.mean).toBeCloseTo(3.5, 0); // 0 decimal places
```

### Performance benchmarks
```ts
it('should complete 10k iterations in under 500ms', () => {
  const start = performance.now();
  simulate(config, 10_000);
  expect(performance.now() - start).toBeLessThan(500);
});
```

## Component Test Patterns

### Rendering with store state
Components read from Zustand stores. Set up state before rendering:

```ts
import { useAttackConfigStore } from '../../stores/attackConfigStore';

beforeEach(() => {
  useAttackConfigStore.getState().reset();
});

it('shows attack surge selector', () => {
  render(<AttackerPanel />);
  expect(screen.getByRole('radiogroup')).toBeInTheDocument();
});
```

### User interactions
Use `@testing-library/user-event` (not `fireEvent`):

```ts
const user = userEvent.setup();
await user.click(screen.getByRole('button', { name: /simulate/i }));
```

### Testing disabled states
```ts
expect(screen.getByRole('spinbutton', { name: /sharpshooter/i }))
  .toHaveAttribute('aria-disabled', 'true');
```

## Store Test Patterns

### Reset between tests
```ts
beforeEach(() => {
  useAttackConfigStore.getState().reset();
  useDefenseConfigStore.getState().reset();
});
```

### Testing actions
```ts
it('setField updates a single field', () => {
  const { setField } = useAttackConfigStore.getState();
  setField('aimTokens', 3);
  expect(useAttackConfigStore.getState().aimTokens).toBe(3);
});
```

### Testing selectors
```ts
it('selectAttackerConfig strips UI fields', () => {
  const state = useAttackConfigStore.getState();
  const config = selectAttackerConfig(state);
  expect(config).not.toHaveProperty('selectedFaction');
  expect(config).not.toHaveProperty('upgradeBar');
});
```

### Snapshot clearing for mode tests
```ts
import { _clearSnapshot } from '../stores/attackConfigStore';

afterEach(() => {
  _clearSnapshot();
});
```

## Integration Test Patterns

Location: `src/integration/pipeline.test.ts`

Tests the full store → engine pipeline using real Zustand stores and `simulate()`:

```ts
it('configured attacker produces expected wound range', () => {
  useAttackConfigStore.getState().setField('weapons', [...]);
  const config = getFullConfig();
  const result = simulate(config, 5_000);
  expect(result.totalWounds.mean).toBeGreaterThan(0);
});
```

## E2E Test Patterns

Location: `e2e/app.spec.ts`

Currently minimal (2 smoke tests). When adding E2E tests:

```ts
import { test, expect } from '@playwright/test';

test('can configure an attacker and run simulation', async ({ page }) => {
  await page.goto('/');
  // interact with controls, trigger simulation, verify results appear
});
```

Dev server runs on port 8080 (configured in `playwright.config.ts`).

## Coverage Expectations

| Layer | Expectation |
|-------|-------------|
| Engine modules | **Must** have co-located tests. Every new function needs tests. |
| Shared components | **Should** have tests. Form controls and interactive components need coverage. |
| Store actions/selectors | **Should** have tests. State transitions and selector output need validation. |
| Panel sub-sections | Nice-to-have. Internal components tested indirectly through parent panel tests. |
| Display-only components | Nice-to-have. Pure render components with no logic can skip tests. |
| Hooks | **Should** have tests. `useIsMobile` is the only hook currently missing a test. |

## What NOT to Test

- Barrel `index.ts` files (re-exports only)
- `types.ts` files (type definitions only)
- `testHelpers.ts` (validated by being used in all engine tests)
- Snapshot tests of large component trees (avoid — brittle and high-maintenance)
