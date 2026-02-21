import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import DeferredMount from './DeferredMount';

describe('DeferredMount', () => {
  it('does not render children on initial mount', () => {
    const { container } = render(
      <DeferredMount>
        <span data-testid="child">Hello</span>
      </DeferredMount>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeNull();
  });

  it('renders children after one animation frame', async () => {
    const { container } = render(
      <DeferredMount>
        <span data-testid="child">Hello</span>
      </DeferredMount>,
    );

    // Flush requestAnimationFrame
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="child"]')?.textContent).toBe('Hello');
  });
});
