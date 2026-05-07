// simulation-v2-view.test.tsx
//
// RTL tests for SimulationViewV2 (/simulation-v2 route).
//
// Boot states:
//   'init'    — waiting for getActiveSimulation() to resolve
//   'idle'    — no active session → SimIntro renders
//   'running' — active session seeded in DB → SimRunnerV2 renders
//
// Providers required:
//   MemoryRouter     — SimulationViewV2 uses Link
//   SettingsProvider — reads settings.simRealismMode
//   ToastProvider    — SimulationViewV2 calls useToast() directly

import { describe, expect, test, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SimulationViewV2 } from '../src/features/simulation/SimulationViewV2';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';
import { ToastProvider } from '../src/app/providers/ToastProvider';
import { updateSettings, saveSession } from '../src/lib/storage/db';
import { questionBank } from '../src/data/questions';
import type { Session } from '../src/lib/schema';

// ─── Provider wrapper ──────────────────────────────────────────────────────────

function renderSimV2() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <ToastProvider>
          <SimulationViewV2 />
        </ToastProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

// ─── Question ID helpers ───────────────────────────────────────────────────────

/** Build a question-id list of length n, cycling through the real bank. */
function makeQuestionIds(n: number): string[] {
  const ids = questionBank.map((q) => q.id);
  if (ids.length === 0) throw new Error('questionBank is empty');
  return Array.from({ length: n }, (_, i) => ids[i % ids.length]);
}

/** Build and save a minimal active simulation Session in IndexedDB. */
async function seedActiveSession(totalQ: number, timeRemainingMs: number): Promise<Session> {
  const s: Session = {
    id: 'test-sim-session',
    mode: 'simulation',
    startedAt: Date.now() - 5000,
    questionIds: makeQuestionIds(totalQ),
    snapshot: {
      timeRemainingMs,
      answers: {},
      submitted: false,
      flagged: [],
      cursor: 0
    }
  };
  await saveSession(s);
  return s;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SimulationViewV2', () => {
  test('1. initial idle render: shows Q count 65 and time ~100min (no per-question feedback)', async () => {
    // No active session in DB → getActiveSimulation() returns undefined → boot='idle'.
    renderSimV2();

    await waitFor(() => {
      expect(
        screen.getByText(/Full Exam Simulation.*DP-600 Realism v2/i)
      ).toBeInTheDocument();
    });

    // Intro panel shows Q count and time.
    expect(screen.getByText(/65 questions/i)).toBeInTheDocument();
    expect(screen.getByText(/100 minutes/i)).toBeInTheDocument();

    // Per-question feedback disabled note.
    expect(
      screen.getByText(/no per-question feedback until you submit/i)
    ).toBeInTheDocument();

    // Pause disabled note.
    expect(screen.getByText(/Pause is disabled/i)).toBeInTheDocument();

    // Begin button present.
    expect(screen.getByRole('button', { name: /begin simulation/i })).toBeInTheDocument();
  });

  test('2. with simRealismMode="dp600-quick": intro shows 25 questions · 35 min', async () => {
    await updateSettings({ simRealismMode: 'dp600-quick' });

    renderSimV2();

    await waitFor(() => {
      expect(
        screen.getByText(/Quick Simulation \(Daily Rep\)/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/25 questions/i)).toBeInTheDocument();
    expect(screen.getByText(/35 minutes/i)).toBeInTheDocument();
  });

  test(
    '3. with active session seeded: runner shows "/ 65" position counter and remaining time',
    async () => {
      // Seed an active session so getActiveSimulation() finds it.
      // The runner uses window.setInterval; we don't fake timers here —
      // the interval fires at most once per second (real time) which is fine for this check.
      await seedActiveSession(65, 100 * 60 * 1000);

      renderSimV2();

      // boot transitions: init → running (after IDB resolves) → SimRunnerV2 mounts.
      // Multiple elements can match "/\/ 65/" (header span + QuestionPlayer badge);
      // use getAllByText and assert at least one element matches.
      await waitFor(
        () => {
          const els = screen.getAllByText(/\/ 65/);
          expect(els.length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 10_000 }
      );

      // Time remaining label present.
      expect(screen.getByText('remaining')).toBeInTheDocument();
    },
    15_000 // test-level timeout: give IDB + React rendering plenty of room
  );

  test(
    '4. clicking Next → advances cursor to Q2 (no correctness feedback shown between Qs)',
    async () => {
      await seedActiveSession(65, 100 * 60 * 1000);

      renderSimV2();

      await waitFor(
        () => {
          expect(screen.getAllByText(/\/ 65/).length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 10_000 }
      );

      // Q1 palette button has aria-current="true".
      const q1btn = screen
        .getAllByRole('button')
        .find((b) => b.getAttribute('aria-current') === 'true');
      expect(q1btn?.getAttribute('title')).toMatch(/Q1/);

      // Click Next.
      const nextBtn = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextBtn);

      // Cursor advances → palette button for Q2 becomes current.
      await waitFor(
        () => {
          const curBtn = screen
            .getAllByRole('button')
            .find((b) => b.getAttribute('aria-current') === 'true');
          expect(curBtn?.getAttribute('title')).toMatch(/Q2/);
        },
        { timeout: 5_000 }
      );

      // No correctness verdict text (feedback hidden until end-of-sim submit).
      expect(screen.queryByText(/^Correct!$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Incorrect$/i)).not.toBeInTheDocument();
    },
    15_000
  );

  test(
    '5. Pause button is absent — Abort and Submit exam are present (exam realism)',
    async () => {
      await seedActiveSession(65, 100 * 60 * 1000);

      renderSimV2();

      await waitFor(
        () => {
          expect(screen.getAllByText(/\/ 65/).length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 10_000 }
      );

      // No Pause button (intentionally absent — see SimRunnerV2 comment).
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();

      // Abort IS present (early end → partial summary).
      expect(screen.getByRole('button', { name: /abort/i })).toBeInTheDocument();

      // Submit exam IS present.
      expect(screen.getByRole('button', { name: /submit exam/i })).toBeInTheDocument();
    },
    15_000
  );

  test(
    '6. palette: current Q shows "▶" indicator (a11y MEDIUM #3 — non-color status)',
    async () => {
      await seedActiveSession(65, 100 * 60 * 1000);

      renderSimV2();

      await waitFor(
        () => {
          expect(screen.getAllByText(/\/ 65/).length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 10_000 }
      );

      const currentBtn = screen
        .getAllByRole('button')
        .find((b) => b.getAttribute('aria-current') === 'true');
      expect(currentBtn).toBeTruthy();
      expect(currentBtn?.textContent ?? '').toMatch(/▶/);
    },
    15_000
  );

  test(
    '7. palette: answered Q shows "✓" indicator (a11y MEDIUM #3 — non-color status)',
    async () => {
      // Seed a session with Q1 already answered.
      const ids = makeQuestionIds(65);
      const s: Session = {
        id: 'test-sim-session-answered',
        mode: 'simulation',
        startedAt: Date.now() - 5000,
        questionIds: ids,
        snapshot: {
          timeRemainingMs: 100 * 60 * 1000,
          answers: {
            [ids[0]]: { selectedOptionIds: ['A'], confidence: 'sure' }
          },
          submitted: false,
          flagged: [],
          // Move cursor off Q1 so its palette button reflects "answered" not "current".
          cursor: 1
        }
      };
      await saveSession(s);

      renderSimV2();

      await waitFor(
        () => {
          expect(screen.getAllByText(/\/ 65/).length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 10_000 }
      );

      // Find the palette button for Q1 by its title="Q1 · answered".
      const q1btn = screen
        .getAllByRole('button')
        .find((b) => /^Q1\b/.test(b.getAttribute('title') ?? '') && /answered/.test(b.getAttribute('title') ?? ''));
      expect(q1btn).toBeTruthy();
      expect(q1btn?.textContent ?? '').toMatch(/✓/);
    },
    15_000
  );
});
