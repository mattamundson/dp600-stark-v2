// Mobile bottom-bar navigation — accessibility & icon augmentation tests.
//
// Layout's MobileBar renders 4 NavLinks (Home/Quiz/Sim/Sim2) plus a "More"
// button on small screens. The 2026-05-07 a11y audit (LOW #9) added Unicode
// icon glyphs above each label to aid visual scanning. This test asserts:
//   1. The nav exposes an accessible name "Mobile navigation".
//   2. Exactly 5 entries render (4 NavLinks + 1 More button).
//   3. Each entry's accessible name combines the icon-context and the short
//      label, and the textual label is still visible underneath the icon
//      (not replaced).
//   4. The icon glyph is marked aria-hidden so screen readers do not
//      double-announce it.

import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../src/components/Layout';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <SettingsProvider>
        <Layout>
          <div data-testid="content">child</div>
        </Layout>
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe('Layout — mobile bottom-bar nav', () => {
  test('renders mobile nav with accessible name', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(nav).toBeInTheDocument();
  });

  test('renders exactly 5 entries (4 links + More button)', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    const links = within(nav).getAllByRole('link');
    const buttons = within(nav).getAllByRole('button');
    expect(links).toHaveLength(4);
    expect(buttons).toHaveLength(1);
    expect(links.length + buttons.length).toBe(5);
  });

  test('each NavLink has accessible name combining label + short text', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });

    // The 4 visible NavLinks are Home/Quiz/Sim/Sim2 (first 4 ROUTES). Their
    // aria-label format is `${full label} (${short})`.
    const expected = [
      { label: 'Dashboard', short: 'Home' },
      { label: 'Adaptive Quiz', short: 'Quiz' },
      { label: 'Full Simulation', short: 'Sim' },
      { label: 'Sim · 65Q Realism', short: 'Sim2' }
    ];
    for (const { label, short } of expected) {
      const link = within(nav).getByRole('link', { name: `${label} (${short})` });
      expect(link).toBeInTheDocument();
      // Label text should still be visible underneath the icon.
      expect(within(link).getByText(short)).toBeInTheDocument();
    }
  });

  test('More button has accessible name and visible label', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    const more = within(nav).getByRole('button', { name: 'More navigation' });
    expect(more).toBeInTheDocument();
    expect(within(more).getByText('More')).toBeInTheDocument();
  });

  test('icon glyphs are marked aria-hidden so SRs do not double-announce', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    const hidden = nav.querySelectorAll('[aria-hidden="true"]');
    // 4 NavLinks + 1 More button each render an aria-hidden icon span.
    expect(hidden.length).toBe(5);
    // Every icon span should have non-empty text content.
    hidden.forEach((el) => {
      expect((el.textContent ?? '').trim().length).toBeGreaterThan(0);
    });
  });
});
