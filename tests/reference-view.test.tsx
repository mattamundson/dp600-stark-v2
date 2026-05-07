// RTL tests for ReferenceView (/reference).
//
// Providers: only MemoryRouter — ReferenceView reads `useSearchParams` from
// react-router-dom (focus=traps query param) plus the static `refSections`
// content. No SettingsProvider / ToastProvider dependency.
//
// Print stylesheet: ReferenceView itself does NOT render <details> tags, but
// the global @media print rules in src/styles/globals.css include a flatten
// rule (`details:not([open]) > *:not(summary) { display: block !important; }`)
// for any embedded <details> elsewhere in the app. Test 3 verifies that
// global rule literally exists in the stylesheet, since jsdom can't apply
// @media print at runtime.

import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ReferenceView } from '../src/features/reference/ReferenceView';
import { refSections } from '../src/features/reference/content';

function renderView(initialEntry = '/reference') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ReferenceView />
    </MemoryRouter>
  );
}

describe('ReferenceView', () => {
  test('1. renders the page heading and Print/PDF button', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1, name: /reference sheet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print \/ pdf/i })).toBeInTheDocument();
  });

  test('2. loads ALL reference sections (refSectionsBase + refSectionsExtras lookup)', () => {
    const { container } = renderView();
    // Every section gets rendered as a <section> with id=slug. Verify each slug
    // from the merged refSections array maps to a DOM element with that id.
    for (const s of refSections) {
      const el = container.querySelector(`section#${CSS.escape(s.slug)}`);
      expect(el, `section with id "${s.slug}" not rendered`).not.toBeNull();
    }
    // Spot-check a few well-known slugs from BOTH base and extras.
    expect(container.querySelector('#direct-lake-mechanics')).not.toBeNull(); // base
    expect(container.querySelector('#top-10-rls-traps')).not.toBeNull(); // extras
    expect(container.querySelector('#dax-perf-cheat-sheet')).not.toBeNull(); // extras
  });

  test('3. section anchors work for in-page navigation (id matches slug)', () => {
    const { container } = renderView();
    // Pick three known slugs and verify the rendered section has matching id.
    const slugs = ['direct-lake-mechanics', 'storage-modes', 'top-15-traps'];
    for (const slug of slugs) {
      const sec = container.querySelector(`section#${CSS.escape(slug)}`);
      expect(sec).not.toBeNull();
      // Section id == slug — this is what enables /reference#<slug> deep links.
      expect((sec as HTMLElement).id).toBe(slug);
    }
  });

  test('4. global print stylesheet expands collapsed <details> elements', () => {
    // jsdom does not apply @media print rules at runtime, so we verify the
    // rule is literally present in src/styles/globals.css (the print sheet
    // governs every print-trigged page including ReferenceView).
    const cssPath = resolve(__dirname, '../src/styles/globals.css');
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toMatch(/@media print\b/);
    // The rule that flattens <details>: collapsed children become block-displayed.
    expect(css).toMatch(/details:not\(\[open\]\)\s*>\s*\*:not\(summary\)\s*\{\s*display:\s*block\s*!important;\s*\}/);
  });

  test('5. clicking Print/PDF calls window.print() once', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /print \/ pdf/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  test('6. focus=traps URL filters to traps-only and shows the focus banner', () => {
    const { container } = renderView('/reference?focus=traps');
    // Banner copy
    expect(screen.getByText(/Trap-focus on:/i)).toBeInTheDocument();
    // Trap-focused view filters to fewer sections than the full set.
    const sections = container.querySelectorAll('section.panel');
    expect(sections.length).toBeLessThan(refSections.length);
    // "Show all" escape hatch button is present.
    expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument();
  });
});
