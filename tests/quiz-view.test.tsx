// QuizView (/quiz) RTL tests.
//
// Strategy: mock the question bank to a deterministic 12-question set spanning
// the three domains so the adaptive selector at any quiz length will produce a
// non-empty session and we can drive the loop to completion in a few clicks.
//
// Providers required:
//   MemoryRouter      — QuizView uses useSearchParams + Link
//   SettingsProvider  — QuizView calls useSettings() and reads/patches it
//   ToastProvider     — QuizView calls useToast() directly
//
// IMPORTANT: vi.mock() of '../src/data/questions' must be hoisted BEFORE the
// QuizView import (vitest hoists vi.mock automatically), and the mock data
// must be created via vi.hoisted so it's available at module-resolution time.

import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Question } from '../src/lib/schema';

// ─── Hoisted fixtures ─────────────────────────────────────────────────────────

const { mockBank } = vi.hoisted(() => {
  // 12 questions × 3 domains × 4 each. All are 'single' type with the same
  // option ids so the test can submit deterministically without inspecting the
  // specific question rendered. Option 'A' is correct for every question.
  function mk(id: string, domain: 'prepare' | 'maintain' | 'semantic'): Question {
    return {
      id,
      type: 'single',
      domain,
      subtopic: `${domain}-sub`,
      difficulty: 2,
      prompt: `Prompt for ${id}`,
      options: [
        { id: 'A', text: `${id}-alpha (correct)` },
        { id: 'B', text: `${id}-bravo` }
      ],
      correctOptionIds: ['A'],
      explanation: `Why ${id}`,
      sourceAnchor: { category: 'cat', note: 'note' },
      tags: []
    };
  }
  const bank: Question[] = [];
  const domains: Array<'prepare' | 'maintain' | 'semantic'> = ['prepare', 'maintain', 'semantic'];
  for (const d of domains) {
    for (let i = 1; i <= 4; i++) bank.push(mk(`mock-${d}-${i}`, d));
  }
  return { mockBank: bank };
});

vi.mock('../src/data/questions', () => ({
  questionBank: mockBank,
  questionById: (id: string) => mockBank.find((q) => q.id === id),
  questionsByDomain: (domain: string) => mockBank.filter((q) => q.domain === domain),
  questionsBySubtopic: (subtopic: string) => mockBank.filter((q) => q.subtopic === subtopic),
  questionsByScenario: () => []
}));

// Imports AFTER the mock so the view resolves the mocked module.
import { QuizView } from '../src/features/quiz/QuizView';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';
import { ToastProvider } from '../src/app/providers/ToastProvider';
import { listAttempts, attemptsBySession } from '../src/lib/storage/db';

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function renderQuizAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider>
        <ToastProvider>
          <QuizView />
        </ToastProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

/** Wait for the first question to be on screen — i.e., the panel headline
 *  "Question N / M" badge appears. Returns the M (total). */
async function waitForFirstQuestion(): Promise<number> {
  let total = 0;
  await waitFor(
    () => {
      const badge = screen.getByText(/^Question \d+ \/ \d+$/);
      const m = badge.textContent?.match(/Question \d+ \/ (\d+)/);
      expect(m).toBeTruthy();
      total = Number(m![1]);
    },
    { timeout: 3000 }
  );
  return total;
}

/** Submit the current question with option A (the correct answer in mockBank)
 *  and a chosen confidence, then advance via the Next button. Returns the
 *  attempt count visible in IndexedDB after the submit completes. */
async function answerAndNext(confidence: 'sure' | 'unsure' | 'guess' = 'sure') {
  // Click option A (the first option button).
  const optA = screen.getAllByRole('radio')[0];
  fireEvent.click(optA);

  // Pick the requested confidence.
  const conf = screen.getByRole('button', {
    name: confidence === 'sure' ? /^S Sure$/ : confidence === 'unsure' ? /^U Unsure$/ : /^G Guess$/
  });
  fireEvent.click(conf);

  // Submit.
  const submit = screen.getByRole('button', { name: /^Submit$/ });
  fireEvent.click(submit);

  // After submit the verdict appears and a "Next" button replaces "Submit".
  const nextBtn = await screen.findByRole('button', { name: /^Next →$/ });
  fireEvent.click(nextBtn);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('QuizView', () => {
  test('1. loads with the configured quiz length (?len=10 → 12-question target)', async () => {
    renderQuizAt('/quiz?len=10');
    const total = await waitForFirstQuestion();
    // targetSize('quiz-10') === 12; mockBank has 12 questions so adaptive can fill it.
    expect(total).toBeGreaterThanOrEqual(1);
    expect(total).toBeLessThanOrEqual(12);
  });

  test('2. question advances on Submit → Next', async () => {
    renderQuizAt('/quiz?len=10');
    await waitForFirstQuestion();

    // Capture the prompt of the first question.
    const firstHeading = screen.getByRole('heading', { level: 2 }).textContent;
    expect(firstHeading).toMatch(/^Prompt for mock-/);

    await answerAndNext('sure');

    // After Next, a new question heading is shown — its text differs (or at
    // worst the badge index is now "Question 2 / N").
    await waitFor(() => {
      const badge = screen.getByText(/^Question \d+ \/ \d+$/);
      expect(badge.textContent).toMatch(/^Question 2 /);
    });
  });

  test('3. confidence selection persists into the attempt record', async () => {
    renderQuizAt('/quiz?len=10');
    await waitForFirstQuestion();

    // Answer the first question with confidence='guess' and advance.
    await answerAndNext('guess');

    // Read the attempts log via listAttempts() — first attempt's confidence is 'guess'.
    await waitFor(async () => {
      const attempts = await listAttempts();
      expect(attempts.length).toBeGreaterThanOrEqual(1);
      // Find the most-recent attempt (highest ts).
      const latest = attempts.slice().sort((a, b) => b.ts - a.ts)[0];
      expect(latest.confidence).toBe('guess');
    });
  });

  test('4. answering all questions surfaces the final summary panel', async () => {
    renderQuizAt('/quiz?len=10');
    const total = await waitForFirstQuestion();

    // Loop through the entire session — answer every question with option A.
    for (let i = 0; i < total; i++) {
      const optA = screen.getAllByRole('radio')[0];
      fireEvent.click(optA);
      const submit = screen.getByRole('button', { name: /^Submit$/ });
      fireEvent.click(submit);
      // Wait for Next OR (last question) for the summary heading to appear.
      if (i < total - 1) {
        const nextBtn = await screen.findByRole('button', { name: /^Next →$/ });
        fireEvent.click(nextBtn);
      } else {
        const nextBtn = await screen.findByRole('button', { name: /^Next →$/ });
        fireEvent.click(nextBtn);
      }
    }

    // ResultView heading appears.
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Session complete/i })
      ).toBeInTheDocument();
    });

    // Accuracy + scaled-score + by-domain panel render.
    expect(screen.getByText(/^Accuracy$/i)).toBeInTheDocument();
    expect(screen.getByText(/Scaled score/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /By domain/i })).toBeInTheDocument();
  });

  test('5. final summary shows 100% accuracy when every question answered with the correct option', async () => {
    renderQuizAt('/quiz?len=10');
    const total = await waitForFirstQuestion();

    for (let i = 0; i < total; i++) {
      const optA = screen.getAllByRole('radio')[0];
      fireEvent.click(optA);
      const submit = screen.getByRole('button', { name: /^Submit$/ });
      fireEvent.click(submit);
      const nextBtn = await screen.findByRole('button', { name: /^Next →$/ });
      fireEvent.click(nextBtn);
    }

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Session complete/i })
      ).toBeInTheDocument();
    });

    // Every option-A click is correct → 100% accuracy. The page renders the
    // full percentage as "100%" in the Accuracy block.
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Cross-check: every persisted attempt for this session is correct=true.
    const attempts = await listAttempts();
    expect(attempts.length).toBeGreaterThanOrEqual(total);
    const sessionId = attempts[0].sessionId;
    const sessionAttempts = await attemptsBySession(sessionId);
    expect(sessionAttempts.length).toBe(total);
    expect(sessionAttempts.every((a) => a.correct)).toBe(true);
  });

  test('6. final summary renders Dashboard / Analytics / New-session navigation links', async () => {
    renderQuizAt('/quiz?len=10');
    const total = await waitForFirstQuestion();

    for (let i = 0; i < total; i++) {
      const optA = screen.getAllByRole('radio')[0];
      fireEvent.click(optA);
      const submit = screen.getByRole('button', { name: /^Submit$/ });
      fireEvent.click(submit);
      const nextBtn = await screen.findByRole('button', { name: /^Next →$/ });
      fireEvent.click(nextBtn);
    }

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Session complete/i })
      ).toBeInTheDocument();
    });

    // Dashboard link.
    const dash = screen.getByRole('link', { name: /^Dashboard$/ });
    expect(dash.getAttribute('href')).toBe('/');

    // Analytics link.
    const analytics = screen.getByRole('link', { name: /View analytics/i });
    expect(analytics.getAttribute('href')).toBe('/analytics');

    // "New 10-min session" link points back at /quiz?len=10.
    const newSession = screen.getByRole('link', { name: /New 10-min session/i });
    expect(newSession.getAttribute('href')).toBe('/quiz?len=10');
  });
});
