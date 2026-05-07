// RTL tests for DirectLakeMasteryView (/dashboard/direct-lake).
//
// Providers: ToastProvider (push() on empty-bank case) + MemoryRouter (Link).
//
// Filter mechanic: the view scopes questions and attempts via
// `isDirectLakeSubtopic`, which checks membership in
// `subtopicChildren('direct-lake')` from features/remediation/engine.ts.
// That set is exactly:
//   ['direct-lake', 'direct-lake-fallback', 'direct-lake-framing',
//    'direct-lake-onelake', 'direct-lake-cache']
// (parent + 4 children in SUBTOPIC_GROUPS). Subtopics outside this set are
// ignored even if they begin with 'direct-lake-' literally.
//
// Persistence: attempts are seeded via saveAttempt (IndexedDB / fake-indexeddb).
// setup.ts wipes the store between tests.

import { describe, expect, test } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DirectLakeMasteryView } from '../src/features/dashboard/DirectLakeMasteryView';
import { ToastProvider } from '../src/app/providers/ToastProvider';
import { saveAttempt } from '../src/lib/storage/db';
import { questionBank } from '../src/data/questions';
import { subtopicChildren } from '../src/features/remediation/engine';
import type { Attempt } from '../src/lib/schema';

const DL_SUBTOPICS = subtopicChildren('direct-lake');

let _seq = 0;
function mkAttempt(overrides: Partial<Attempt> = {}): Attempt {
  _seq += 1;
  return {
    id: `dl-a${_seq}`,
    questionId: overrides.questionId ?? 'dlm2-001',
    sessionId: 's-dl-1',
    ts: Date.now() - _seq * 1000,
    selectedOptionIds: ['A'],
    correct: true,
    latencyMs: 50_000,
    confidence: 'sure',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 3,
    ...overrides
  };
}

function renderView() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DirectLakeMasteryView />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('DirectLakeMasteryView', () => {
  test('1. loads matching Qs from the bank (Direct Lake-scoped count is shown)', async () => {
    renderView();
    // Empty-state branch (no DL attempts yet) shows the question-bank size.
    const dlBank = questionBank.filter((q) => DL_SUBTOPICS.includes(q.subtopic));
    expect(dlBank.length).toBeGreaterThan(0);
    await waitFor(() => {
      // Empty-state copy mentions the bank size.
      expect(
        screen.getByText(new RegExp(`${dlBank.length} questions across direct-lake`, 'i'))
      ).toBeInTheDocument();
    });
    // Empty-state CTA wires to the same Direct-Lake-only quiz.
    expect(screen.getByRole('button', { name: /Start Direct-Lake-only quiz/i })).toBeInTheDocument();
  });

  test('2. shows mastery rollup (overall accuracy + subtopic accuracy panel)', async () => {
    // Seed 3 attempts: 2 correct on direct-lake, 1 wrong on direct-lake-framing.
    await saveAttempt(mkAttempt({ subtopic: 'direct-lake', correct: true }));
    await saveAttempt(mkAttempt({ subtopic: 'direct-lake', correct: true }));
    await saveAttempt(mkAttempt({ subtopic: 'direct-lake-framing', correct: false }));

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Direct Lake mastery/i })).toBeInTheDocument();
    });

    // Header summary copy: "3 attempts · 67% accuracy · N questions in scope"
    await waitFor(() => {
      expect(screen.getAllByText(/3 attempts/).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/67% accuracy/)).toBeInTheDocument();

    // Subtopic accuracy panel renders both seeded subtopics. The string
    // 'direct-lake' appears multiple places (header copy, About copy,
    // rollup row), so use getAllByText for the parent slug.
    expect(screen.getByText('Subtopic accuracy')).toBeInTheDocument();
    expect(screen.getAllByText('direct-lake').length).toBeGreaterThan(0);
    expect(screen.getByText('direct-lake-framing')).toBeInTheDocument();

    // Last 10 attempts panel renders.
    expect(screen.getByText('Last 10 attempts')).toBeInTheDocument();
  });

  test('3. Drill button starts a curated Direct-Lake quiz (inline runner mounts)', async () => {
    // Seed at least one attempt so we hit the default mastery view (not empty).
    await saveAttempt(mkAttempt({ subtopic: 'direct-lake', correct: true }));

    renderView();

    // Click the prominent CTA in the header.
    const startBtn = await waitFor(() =>
      screen.getByRole('button', { name: /Start Direct-Lake-only quiz/i })
    );
    fireEvent.click(startBtn);

    // The inline quiz runner replaces the mastery view: progress text "1 of N"
    // and an Exit button appear.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Exit$/ })).toBeInTheDocument();
    });
    // "1 of <total>" progress label
    expect(screen.getByText(/^1 of \d+$/)).toBeInTheDocument();
  });

  test('4. rollup updates after a fresh attempt is inserted (re-render via remount)', async () => {
    // First render with 1 attempt → header shows "1 attempts".
    // (The string also appears in the rollup row, so use getAllByText.)
    await saveAttempt(mkAttempt({ subtopic: 'direct-lake', correct: true }));
    const first = renderView();
    await waitFor(() => {
      expect(screen.getAllByText(/1 attempts/).length).toBeGreaterThan(0);
    });
    first.unmount();

    // Insert two more attempts (one wrong) and remount the view. The view's
    // useEffect re-loads attempts on mount and the rollup recomputes.
    await saveAttempt(mkAttempt({ subtopic: 'direct-lake-framing', correct: false }));
    await saveAttempt(mkAttempt({ subtopic: 'direct-lake-onelake', correct: true }));

    renderView();
    await waitFor(() => {
      expect(screen.getAllByText(/3 attempts/).length).toBeGreaterThan(0);
    });
    // 2 correct of 3 → 67% accuracy.
    expect(screen.getByText(/67% accuracy/)).toBeInTheDocument();
    // Newly seeded subtopics appear in the rollup.
    expect(screen.getByText('direct-lake-framing')).toBeInTheDocument();
    expect(screen.getByText('direct-lake-onelake')).toBeInTheDocument();
  });
});
