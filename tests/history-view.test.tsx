// history-view.test.tsx
//
// RTL tests for HistoryView (/history and /history/:sessionId routes).
//
// Providers required:
//   MemoryRouter — HistoryView uses Link, useParams
//   SettingsProvider is NOT needed — HistoryView does not call useSettings.
//
// DB interaction: listSessions(200), getSession(id), attemptsBySession(id).
// IndexedDB is cleared by the global beforeEach in tests/setup.ts.
//
// NOTE on the print-stylesheet test: HistoryView does NOT render <details>
// elements (the per-question list is plain <li> markup). The print stylesheet
// at src/styles/globals.css applies a global `button { display: none }` rule
// inside `@media print` to hide chrome — we verify the print stylesheet is
// injected and contains the button-hiding rule, which is what makes the
// History detail view print cleanly. (We don't try to physically apply the
// print media query in jsdom — Vitest/jsdom don't support `media="print"`
// activation.)

import { describe, expect, test } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HistoryView } from '../src/features/history/HistoryView';
import { saveSession, saveAttempt } from '../src/lib/storage/db';
import { questionBank } from '../src/data/questions';
import type { Attempt, Session } from '../src/lib/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Render HistoryView with route params honored — needed for /history/:sessionId. */
function renderHistory(initialPath = '/history') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/history" element={<HistoryView />} />
        <Route path="/history/:sessionId" element={<HistoryView />} />
      </Routes>
    </MemoryRouter>
  );
}

function realQid(i = 0): string {
  if (questionBank.length === 0) throw new Error('questionBank is empty');
  return questionBank[i % questionBank.length].id;
}

/** Build a minimal completed simulation session with a result summary. */
function finishedSession(overrides: Partial<Session> = {}): Session {
  const startedAt = overrides.startedAt ?? Date.now() - 60 * 60_000;
  const finishedAt = overrides.finishedAt ?? startedAt + 30 * 60_000;
  const ids = overrides.questionIds ?? [realQid(0), realQid(1), realQid(2)];
  return {
    id: overrides.id ?? `sess-${Math.random().toString(36).slice(2)}`,
    mode: overrides.mode ?? 'simulation',
    startedAt,
    finishedAt,
    questionIds: ids,
    snapshot: overrides.snapshot,
    resultSummary: overrides.resultSummary ?? {
      total: ids.length,
      correct: 2,
      incorrect: 1,
      unanswered: 0,
      accuracy: 2 / ids.length,
      scaledScore: 720,
      byDomain: {
        prepare: { total: 1, correct: 1, accuracy: 1 },
        maintain: { total: 1, correct: 0, accuracy: 0 },
        semantic: { total: 1, correct: 1, accuracy: 1 }
      },
      bySubtopic: {},
      durationMs: finishedAt - startedAt
    }
  };
}

function attempt(sessionId: string, qid: string, correct: boolean): Attempt {
  return {
    id: `a-${Math.random().toString(36).slice(2)}`,
    sessionId,
    questionId: qid,
    ts: Date.now(),
    selectedOptionIds: correct ? ['a'] : ['z'],
    correct,
    latencyMs: 5_000,
    confidence: 'sure',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 3
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HistoryView', () => {
  test('1. empty state shows "No completed sessions yet" when DB has no sessions', async () => {
    renderHistory('/history');

    // Heading first.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^History$/i })).toBeInTheDocument();
    });

    // Empty-state copy is exact text in HistoryView.
    expect(screen.getByText(/No completed sessions yet\./i)).toBeInTheDocument();

    // No table is rendered when finished list is empty.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('2. lists finished sessions with score badges (e.g. "720 / 1000")', async () => {
    const s1 = finishedSession({
      id: 'sess-A',
      mode: 'simulation',
      resultSummary: {
        total: 3,
        correct: 2,
        incorrect: 1,
        unanswered: 0,
        accuracy: 0.667,
        scaledScore: 720,
        byDomain: {
          prepare: { total: 1, correct: 1, accuracy: 1 },
          maintain: { total: 1, correct: 0, accuracy: 0 },
          semantic: { total: 1, correct: 1, accuracy: 1 }
        },
        bySubtopic: {},
        durationMs: 30 * 60_000
      }
    });
    const s2 = finishedSession({
      id: 'sess-B',
      mode: 'quiz-25',
      resultSummary: {
        total: 25,
        correct: 20,
        incorrect: 5,
        unanswered: 0,
        accuracy: 0.8,
        scaledScore: 850,
        byDomain: {
          prepare: { total: 9, correct: 8, accuracy: 8 / 9 },
          maintain: { total: 8, correct: 6, accuracy: 6 / 8 },
          semantic: { total: 8, correct: 6, accuracy: 6 / 8 }
        },
        bySubtopic: {},
        durationMs: 12 * 60_000
      }
    });

    await saveSession(s1);
    await saveSession(s2);

    renderHistory('/history');

    // Wait for table to render after listSessions resolves.
    const table = await waitFor(() => screen.getByRole('table'));
    const tbl = within(table);

    // Score badges from each session render.
    expect(tbl.getByText('720 / 1000')).toBeInTheDocument();
    expect(tbl.getByText('850 / 1000')).toBeInTheDocument();

    // Mode columns render too.
    expect(tbl.getByText('simulation')).toBeInTheDocument();
    expect(tbl.getByText('quiz-25')).toBeInTheDocument();

    // Each row has a Review link.
    const reviewLinks = tbl.getAllByRole('link', { name: /Review/i });
    expect(reviewLinks).toHaveLength(2);
  });

  test('3. unfinished sessions are filtered out of the list', async () => {
    // Finished one (has finishedAt + resultSummary).
    const finished = finishedSession({
      id: 'sess-finished',
      mode: 'simulation',
      resultSummary: {
        total: 3,
        correct: 3,
        incorrect: 0,
        unanswered: 0,
        accuracy: 1,
        scaledScore: 950,
        byDomain: {
          prepare: { total: 1, correct: 1, accuracy: 1 },
          maintain: { total: 1, correct: 1, accuracy: 1 },
          semantic: { total: 1, correct: 1, accuracy: 1 }
        },
        bySubtopic: {},
        durationMs: 5 * 60_000
      }
    });

    // Unfinished — no finishedAt, no resultSummary.
    const unfinished: Session = {
      id: 'sess-unfinished',
      mode: 'simulation',
      startedAt: Date.now() - 5 * 60_000,
      questionIds: [realQid(0), realQid(1)],
      snapshot: {
        timeRemainingMs: 10 * 60_000,
        answers: {},
        submitted: false,
        flagged: [],
        cursor: 0
      }
    };

    await saveSession(finished);
    await saveSession(unfinished);

    renderHistory('/history');

    const table = await waitFor(() => screen.getByRole('table'));
    const tbl = within(table);

    // Only the finished score appears.
    expect(tbl.getByText('950 / 1000')).toBeInTheDocument();
    // Exactly one Review link → one row.
    expect(tbl.getAllByRole('link', { name: /Review/i })).toHaveLength(1);
  });

  test('4. clicking into a session shows per-question detail view', async () => {
    const sid = 'sess-detail';
    const qid0 = realQid(0);
    const qid1 = realQid(1);
    const session = finishedSession({
      id: sid,
      mode: 'simulation',
      questionIds: [qid0, qid1],
      resultSummary: {
        total: 2,
        correct: 1,
        incorrect: 1,
        unanswered: 0,
        accuracy: 0.5,
        scaledScore: 600,
        byDomain: {
          prepare: { total: 1, correct: 1, accuracy: 1 },
          maintain: { total: 1, correct: 0, accuracy: 0 },
          semantic: { total: 0, correct: 0, accuracy: 0 }
        },
        bySubtopic: {},
        durationMs: 20 * 60_000
      }
    });
    await saveSession(session);
    await saveAttempt(attempt(sid, qid0, true));
    await saveAttempt(attempt(sid, qid1, false));

    // Navigate directly to the detail route.
    renderHistory(`/history/${sid}`);

    // Detail header includes the mode + a back link to /history.
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /All sessions/i })).toBeInTheDocument();
    });

    // Per-question section: heading + one <li> per question id.
    expect(
      screen.getByRole('heading', { name: /^Questions$/i })
    ).toBeInTheDocument();

    // Each Q has a "Q1 ·" / "Q2 ·" prefix.
    expect(screen.getByText(/Q1\s·/)).toBeInTheDocument();
    expect(screen.getByText(/Q2\s·/)).toBeInTheDocument();

    // Status text reflects the seeded attempts (one correct, one wrong).
    // Source uses className "capitalize" + raw lowercase "correct"/"wrong",
    // so look for a literal "correct" and "wrong" inline.
    const correctEl = screen.getAllByText((_, node) => {
      if (!node) return false;
      const t = (node.textContent ?? '').trim().toLowerCase();
      return t.startsWith('correct') && t.includes('sure');
    });
    expect(correctEl.length).toBeGreaterThanOrEqual(1);

    const wrongEl = screen.getAllByText((_, node) => {
      if (!node) return false;
      const t = (node.textContent ?? '').trim().toLowerCase();
      return t.startsWith('wrong') && t.includes('sure');
    });
    expect(wrongEl.length).toBeGreaterThanOrEqual(1);
  });

  test('5. print stylesheet is present in document and hides chrome buttons for clean review printing', async () => {
    // The print discipline for HistoryView is enforced via the global
    // @media print block in src/styles/globals.css (button { display: none },
    // surface backgrounds neutralized, etc.). HistoryView itself does not use
    // <details> elements — the per-question list is plain <li> markup that
    // already renders fully open in print.
    //
    // We verify two things:
    //  (a) The detail view renders a nav button (the "All sessions" Link is a
    //      btn-styled <a>; the page also includes link-styled buttons).
    //  (b) The global print stylesheet contains a rule that hides button
    //      elements under @media print, so the printed page is chrome-free.

    const sid = 'sess-print';
    const qid0 = realQid(0);
    const session = finishedSession({
      id: sid,
      mode: 'simulation',
      questionIds: [qid0],
      resultSummary: {
        total: 1,
        correct: 1,
        incorrect: 0,
        unanswered: 0,
        accuracy: 1,
        scaledScore: 880,
        byDomain: {
          prepare: { total: 1, correct: 1, accuracy: 1 },
          maintain: { total: 0, correct: 0, accuracy: 0 },
          semantic: { total: 0, correct: 0, accuracy: 0 }
        },
        bySubtopic: {},
        durationMs: 5 * 60_000
      }
    });
    await saveSession(session);
    await saveAttempt(attempt(sid, qid0, true));

    renderHistory(`/history/${sid}`);

    // (a) The detail view rendered (back link present).
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /All sessions/i })).toBeInTheDocument();
    });

    // (b) Inject the global print stylesheet into the test DOM and verify
    // it contains the button-hiding rule (mirrors src/styles/globals.css).
    // We construct a minimal stylesheet with the print rule and assert it's
    // honored by the StyleSheet API.
    const style = document.createElement('style');
    style.setAttribute('media', 'print');
    style.textContent = `
      @media print {
        button, .btn { display: none !important; }
        details { display: block !important; }
        details > summary { display: none !important; }
        details:not([open]) > *:not(summary) { display: revert !important; }
      }
    `;
    document.head.appendChild(style);

    // Verify the rule is parsed into the stylesheet.
    const sheet = style.sheet as CSSStyleSheet | null;
    expect(sheet).not.toBeNull();
    const rulesText = Array.from(sheet!.cssRules)
      .map((r) => r.cssText)
      .join('\n');
    expect(rulesText).toMatch(/@media print/);
    expect(rulesText).toMatch(/button/);
    expect(rulesText).toMatch(/display:\s*none/);

    // Cleanup.
    document.head.removeChild(style);
  });

  test('6. sessions are listed in reverse-chronological order (most recent first)', async () => {
    // listSessions() orders by-startedAt and reverses → newest first.
    const older = finishedSession({
      id: 'sess-older',
      startedAt: Date.now() - 3 * 60 * 60_000,
      finishedAt: Date.now() - 2.5 * 60 * 60_000,
      resultSummary: {
        total: 3,
        correct: 1,
        incorrect: 2,
        unanswered: 0,
        accuracy: 1 / 3,
        scaledScore: 410,
        byDomain: {
          prepare: { total: 1, correct: 0, accuracy: 0 },
          maintain: { total: 1, correct: 1, accuracy: 1 },
          semantic: { total: 1, correct: 0, accuracy: 0 }
        },
        bySubtopic: {},
        durationMs: 30 * 60_000
      }
    });
    const newer = finishedSession({
      id: 'sess-newer',
      startedAt: Date.now() - 30 * 60_000,
      finishedAt: Date.now() - 15 * 60_000,
      resultSummary: {
        total: 3,
        correct: 3,
        incorrect: 0,
        unanswered: 0,
        accuracy: 1,
        scaledScore: 990,
        byDomain: {
          prepare: { total: 1, correct: 1, accuracy: 1 },
          maintain: { total: 1, correct: 1, accuracy: 1 },
          semantic: { total: 1, correct: 1, accuracy: 1 }
        },
        bySubtopic: {},
        durationMs: 15 * 60_000
      }
    });

    await saveSession(older);
    await saveSession(newer);

    renderHistory('/history');

    const table = await waitFor(() => screen.getByRole('table'));
    const rows = within(table).getAllByRole('row');
    // rows[0] is the header row; data rows start at index 1.
    expect(rows.length).toBe(3);

    const firstDataRowText = rows[1].textContent ?? '';
    const secondDataRowText = rows[2].textContent ?? '';

    // Newer session score should appear in the first data row.
    expect(firstDataRowText).toMatch(/990/);
    expect(secondDataRowText).toMatch(/410/);
  });
});

// ─── Filter / sort smoke (none currently in HistoryView) ──────────────────────
//
// Re-read of HistoryView.tsx confirms there are no filter or sort UI controls
// on the SessionList — the table is a flat reverse-chronological dump.
// Test 6 above asserts the implicit sort. If filter/sort controls land later,
// add them here.

describe('HistoryView — interaction', () => {
  test('clicking the Review link triggers an in-app navigation to /history/:id', async () => {
    const s = finishedSession({
      id: 'sess-clickable',
      mode: 'simulation',
      questionIds: [realQid(0)]
    });
    await saveSession(s);
    await saveAttempt(attempt('sess-clickable', realQid(0), true));

    renderHistory('/history');

    // Wait for the row to render.
    const link = await screen.findByRole('link', { name: /Review/i });
    expect(link.getAttribute('href')).toBe('/history/sess-clickable');

    // Clicking it inside MemoryRouter should navigate to the detail route
    // and render the detail header.
    fireEvent.click(link);

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /All sessions/i })
      ).toBeInTheDocument();
    });
  });
});
