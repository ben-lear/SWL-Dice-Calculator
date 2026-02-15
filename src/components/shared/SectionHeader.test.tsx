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
