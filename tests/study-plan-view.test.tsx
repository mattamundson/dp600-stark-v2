// RTL tests for StudyPlanView (/study-plan).
//
// StudyPlanView reads:
//   - studyPlan (live import — currently 14 days)
//   - useSettings() for startedAtIso (computes "today" within the 14-day arc)
//
// Setup: SettingsProvider hydrates settings from IndexedDB (fake-indexeddb in
// tests/setup.ts), so we must waitFor settings to load before asserting on
// the today-highlight class. The 14-day count is asserted against the live
// data source so the test won't drift if the plan grows.

import { describe, expect, test } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudyPlanView } from '../src/features/study-plan/StudyPlanView';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';
import { studyPlan } from '../src/data/studyPlan';
import { updateSettings } from '../src/lib/storage/db';

function renderPlan() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <StudyPlanView />
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe('StudyPlanView', () => {
  test('1. renders all 14 days from the studyPlan data source', async () => {
    renderPlan();

    // Wait for the page heading + plan grid to render.
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: /14-day study plan/i })
      ).toBeInTheDocument()
    );

    // Plan should have 14 days; assert against the actual count so the test
    // ranges with the data source if it changes.
    expect(studyPlan.length).toBe(14);

    // Each day renders its title in an h3. Confirm we find every day's title.
    for (const d of studyPlan) {
      expect(
        screen.getByRole('heading', { level: 3, name: new RegExp(escapeRegex(d.title), 'i') })
      ).toBeInTheDocument();
    }
  });

  test('2. each day card shows the day number and minute totals per block', async () => {
    renderPlan();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /14-day study plan/i })).toBeInTheDocument()
    );

    // Day 1's card should contain its day number (large 3xl text "1") and a
    // minute label like "25m" for at least one block.
    const day1Card = screen
      .getByRole('heading', { level: 3, name: /Foundations: OneLake/i })
      .closest('article');
    expect(day1Card).toBeTruthy();
    const scope = within(day1Card as HTMLElement);
    expect(scope.getByText('1')).toBeInTheDocument();
    // At least one minute marker must appear (every block has one).
    expect(scope.getAllByText(/^\d+m$/).length).toBeGreaterThan(0);
  });

  test('3. clicking a day "Study" link routes to /study/day/N', async () => {
    renderPlan();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /14-day study plan/i })).toBeInTheDocument()
    );

    // Each day card has a primary "Study" link to /study/day/<n>. There are 14
    // of these — verify the first one points at /study/day/1.
    const studyLinks = screen.getAllByRole('link', { name: /^Study$/ });
    expect(studyLinks.length).toBe(14);
    expect(studyLinks[0]).toHaveAttribute('href', '/study/day/1');
    expect(studyLinks[13]).toHaveAttribute('href', '/study/day/14');
  });

  test('4. today-highlight uses the primary border class for the active day', async () => {
    // Force startedAtIso to "today" so day 1 is the highlighted day.
    // (DEFAULT_SETTINGS already sets startedAtIso=now, but we set it
    // explicitly so the test is independent of default-shape drift.)
    await updateSettings({ startedAtIso: new Date().toISOString() });

    renderPlan();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /14-day study plan/i })).toBeInTheDocument()
    );

    // The "today" card uses class "border-primary/40 bg-primary/10". Settings
    // hydrate via SettingsProvider's useEffect (async getSettings()), so
    // poll until exactly one card is highlighted.
    await waitFor(() => {
      const articles = screen.getAllByRole('article');
      const highlighted = articles.filter((el) => el.className.includes('border-primary/40'));
      expect(highlighted.length).toBe(1);
    });

    const articles = screen.getAllByRole('article');
    const highlighted = articles.filter((el) => el.className.includes('border-primary/40'));
    // The highlighted card should be the day 1 article (we set start = now).
    const scope = within(highlighted[0]);
    expect(scope.getByText('1')).toBeInTheDocument();
  });

  test('5. emphasis-mode buttons render and the Clear button is disabled by default', async () => {
    renderPlan();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /14-day study plan/i })).toBeInTheDocument()
    );

    // Three "Emphasize ..." buttons + one Clear button. Clear is disabled
    // when no emphasisMode is set (the default for a fresh Settings record).
    expect(screen.getByRole('button', { name: /Emphasize Prepare/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Emphasize Maintain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Emphasize Semantic/i })).toBeInTheDocument();
    const clearBtn = screen.getByRole('button', { name: /^Clear$/ });
    expect(clearBtn).toBeDisabled();
  });
});

// Regex-escape helper so day titles with special chars (e.g. "—", "&") don't
// blow up the dynamic RegExp construction.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
