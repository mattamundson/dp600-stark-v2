// RTL tests for CheatSheetView (/cheat-sheet).
//
// Providers: only MemoryRouter is needed — the view has no SettingsProvider or
// ToastProvider dependency. It reads section data from refSectionsExtras (pure
// module-level array, no async) and renders inline time-management bullets.

import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheatSheetView } from '../src/features/cheat-sheet/CheatSheetView';
import { refSectionsExtras } from '../src/features/reference/content-extras';

function renderView() {
  return render(
    <MemoryRouter>
      <CheatSheetView />
    </MemoryRouter>
  );
}

/** Look up the title of a section by its slug from refSectionsExtras. */
function findSectionTitle(slug: string): string {
  const section = refSectionsExtras.find((s) => s.slug === slug);
  if (!section) throw new Error(`No section with slug "${slug}" found in refSectionsExtras`);
  return section.title;
}

describe('CheatSheetView', () => {
  test('1. renders the page heading', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1, name: /dp-600 exam day cheat sheet/i })).toBeInTheDocument();
  });

  test('2. renders the Save as PDF button', () => {
    renderView();
    expect(screen.getByRole('button', { name: /save as pdf/i })).toBeInTheDocument();
  });

  test('3. renders the Time management rules section heading', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 2, name: /time management rules/i })).toBeInTheDocument();
  });

  test('4. renders all 5 main section titles from refSectionsExtras', () => {
    renderView();
    const slugs = [
      'top-10-rls-traps',
      'direct-lake-decision-tree',
      'dax-perf-cheat-sheet',
      'fabric-item-quick-pick',
      'day-of-exam-checklist',
    ] as const;
    for (const slug of slugs) {
      const title = findSectionTitle(slug);
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  test('5. renders at least one time-management bullet', () => {
    renderView();
    expect(
      screen.getByText(/Flag and skip anything you cannot resolve in 90 seconds/i)
    ).toBeInTheDocument();
  });

  test('6. clicking Save as PDF calls window.print() once', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /save as pdf/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
