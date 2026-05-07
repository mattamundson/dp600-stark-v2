// analytics-view.test.tsx
//
// RTL tests for AnalyticsView (/analytics route).
//
// Providers required:
//   MemoryRouter — AnalyticsView uses Link
//   SettingsProvider is NOT needed — AnalyticsView does not call useSettings.
//
// DB interaction: listAttempts() + listSessions(200) on mount.
// Seeding is done via saveAttempt() before render; IndexedDB is cleared
// between each test by the global beforeEach in setup.ts.

import { describe, expect, test } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnalyticsView } from '../src/features/analytics/AnalyticsView';
import { saveAttempt } from '../src/lib/storage/db';
import type { Attempt } from '../src/lib/schema';
import { DOMAIN_LABEL } from '../src/lib/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: `a-${Math.random().toString(36).slice(2)}`,
    questionId: 'q-001',
    sessionId: 'sess-1',
    ts: Date.now(),
    selectedOptionIds: ['a'],
    correct: true,
    latencyMs: 1500,
    confidence: 'sure',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 3,
    ...overrides,
  };
}

async function seedAndRender(attempts: Attempt[]) {
  for (const a of attempts) {
    await saveAttempt(a);
  }
  return render(
    <MemoryRouter>
      <AnalyticsView />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AnalyticsView', () => {
  test('1. empty state: renders heading + CTA when no attempts in DB', async () => {
    render(
      <MemoryRouter>
        <AnalyticsView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Progress analytics')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Answer at least one question to see analytics.')
    ).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /start a 10-min quiz/i });
    expect(cta).toBeInTheDocument();
    expect(cta.getAttribute('href')).toBe('/quiz?len=10');
  });

  test('2. header stats: shows "Readiness (0–1000)" label and correct total count', async () => {
    const attempts = [
      attempt({ correct: true, domain: 'semantic', subtopic: 'direct-lake' }),
      attempt({ correct: true, domain: 'semantic', subtopic: 'direct-lake' }),
      attempt({ correct: true, domain: 'prepare', subtopic: 'pipelines' }),
      attempt({ correct: false, domain: 'prepare', subtopic: 'pipelines' }),
      attempt({ correct: false, domain: 'maintain', subtopic: 'deployment' }),
    ];
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Readiness (0–1000)')).toBeInTheDocument();
    });

    expect(screen.getByText('Total attempts')).toBeInTheDocument();
    // The total count is rendered as a large number via the Stat component.
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('3. accuracy by domain: both seeded domain labels appear', async () => {
    const attempts = [
      attempt({ domain: 'semantic', subtopic: 'direct-lake', correct: true }),
      attempt({ domain: 'semantic', subtopic: 'direct-lake', correct: false }),
      attempt({ domain: 'prepare', subtopic: 'pipelines', correct: true }),
      attempt({ domain: 'prepare', subtopic: 'pipelines', correct: true }),
    ];
    await seedAndRender(attempts);

    // Domain labels appear in both the accuracy-by-domain bars and the subtopic
    // table — use getAllByText and assert at least one match.
    await waitFor(() => {
      expect(screen.getAllByText(DOMAIN_LABEL['semantic']).length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText(DOMAIN_LABEL['prepare']).length).toBeGreaterThanOrEqual(1);
  });

  test('4. subtopic table: heading + each seeded subtopic appears in the table', async () => {
    const attempts = [
      attempt({ subtopic: 'direct-lake', domain: 'semantic', correct: true }),
      attempt({ subtopic: 'direct-lake', domain: 'semantic', correct: false }),
      attempt({ subtopic: 'deployment-pipelines', domain: 'maintain', correct: true }),
      attempt({ subtopic: 'deployment-pipelines', domain: 'maintain', correct: false }),
    ];
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(
        screen.getByText('Subtopic accuracy (worst first)')
      ).toBeInTheDocument();
    });

    // Subtopic names appear both in the Recommendation panel and the table;
    // use getAllByText and assert at least one match per subtopic.
    expect(screen.getAllByText('direct-lake').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('deployment-pipelines').length).toBeGreaterThanOrEqual(1);
  });

  test('5. recommendation panel: "Recommended next block" heading is present with seeded attempts', async () => {
    // Seed several attempts on a single subtopic to give the recommendation
    // engine enough signal to suggest a drill block.
    const attempts = Array.from({ length: 5 }, (_, i) =>
      attempt({
        subtopic: 'direct-lake',
        domain: 'semantic',
        correct: i % 2 === 0,
        confidence: 'sure',
      })
    );
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Recommended next block')).toBeInTheDocument();
    });
  });

  test('6. PacingTrendPanel placeholder: shows "Need at least 2 finished sessions" when no sessions', async () => {
    // Seed attempts only — no finished sessions with timed attempt data.
    // pacingTrend() will return an empty array → PacingTrendPanel shows the placeholder.
    const attempts = [
      attempt({ latencyMs: 2000, domain: 'semantic', subtopic: 'direct-lake' }),
      attempt({ latencyMs: 1800, domain: 'prepare', subtopic: 'pipelines' }),
    ];
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Need at least 2 finished sessions with timed attempts to plot a trend\./i
        )
      ).toBeInTheDocument();
    });
  });

  test('7. daily accuracy sparkline section heading appears', async () => {
    const attempts = Array.from({ length: 3 }, () =>
      attempt({ correct: true, ts: Date.now() - 1000 * 60 * 60 })
    );
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Daily accuracy (last 7d)')).toBeInTheDocument();
    });
  });

  test('8. per-domain trend panel heading is present', async () => {
    const attempts = [
      attempt({ correct: true, domain: 'prepare', subtopic: 'pipelines' }),
      attempt({ correct: false, domain: 'prepare', subtopic: 'pipelines' }),
    ];
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Per-domain trend')).toBeInTheDocument();
    });
  });

  test('9. per-domain empty state: sparse domain shows "Not enough attempts yet"', async () => {
    // Only one day of attempts in semantic — fewer than 3 active days,
    // every domain panel should show the empty state.
    const attempts = [
      attempt({ domain: 'semantic', correct: true }),
      attempt({ domain: 'semantic', correct: false }),
    ];
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Per-domain trend')).toBeInTheDocument();
    });
    // 3 domain cards × empty state message
    const empties = screen.getAllByText(/Not enough attempts yet/i);
    expect(empties.length).toBeGreaterThanOrEqual(3);
  });

  test('10. per-domain trend renders slope indicator for an active domain', async () => {
    // Seed 3+ active days in `prepare` so the slope renders rather than the empty state.
    const DAY = 86_400_000;
    const now = Date.now();
    const attempts: Attempt[] = [];
    for (let d = 0; d < 4; d++) {
      const ts = now - (3 - d) * DAY;
      attempts.push(attempt({ ts, correct: true, domain: 'prepare', subtopic: 'pipelines' }));
      attempts.push(attempt({ ts: ts + 1000, correct: d > 0, domain: 'prepare', subtopic: 'pipelines' }));
    }
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Per-domain trend')).toBeInTheDocument();
    });
    // The "based on N attempts across M days" footer renders only when slope is shown.
    expect(screen.getAllByText(/based on \d+ attempts? across \d+ days?/i).length).toBeGreaterThanOrEqual(1);
  });
});
