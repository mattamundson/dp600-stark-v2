// study-reminder-banner.test.tsx — RTL tests for the banner shell.
//
// The decision logic is exhaustively covered in study-reminder.test.ts.
// These tests focus on three things only:
//   1. The banner appears when the pure logic returns a non-null state.
//   2. Clicking Dismiss hides it AND persists to localStorage.
//   3. The CTA <Link> resolves to the expected hash route.

import { describe, expect, test } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudyReminderBanner } from '../src/components/StudyReminderBanner';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';
import { saveAttempt, saveSession, updateSettings } from '../src/lib/storage/db';
import type { Attempt, Session } from '../src/lib/schema';

const STORAGE_KEY = 'stark-v2:study-reminder-dismissed-at';
const DAY_MS = 24 * 60 * 60 * 1000;

function isoDateDaysFromNow(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * DAY_MS);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

let _seq = 0;
function mkAttempt(ts: number): Attempt {
  _seq += 1;
  return {
    id: `a-${_seq}`,
    questionId: 'q1',
    sessionId: 's-1',
    ts,
    selectedOptionIds: ['A'],
    correct: true,
    latencyMs: 30_000,
    confidence: 'unsure',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 2,
  };
}

function mkSim(opts: { startedAt: number; finishedAt?: number }): Session {
  _seq += 1;
  return {
    id: `s-${_seq}`,
    mode: 'simulation',
    startedAt: opts.startedAt,
    finishedAt: opts.finishedAt,
    questionIds: ['q1'],
  };
}

function renderBanner() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <StudyReminderBanner />
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe('StudyReminderBanner', () => {
  test('renders when exam is near and there is study debt', async () => {
    localStorage.removeItem(STORAGE_KEY);
    // Exam 5 days away, no sims, no attempts → both debts → sim CTA.
    await updateSettings({ examDateIso: isoDateDaysFromNow(5) });
    renderBanner();
    const banner = await screen.findByTestId('study-reminder-banner');
    expect(banner).toBeInTheDocument();
    expect(screen.getByTestId('study-reminder-cta')).toHaveTextContent('Start a simulation');
  });

  test('Dismiss button hides banner and persists to localStorage', async () => {
    localStorage.removeItem(STORAGE_KEY);
    await updateSettings({ examDateIso: isoDateDaysFromNow(5) });
    renderBanner();

    const dismiss = await screen.findByTestId('study-reminder-dismiss');
    fireEvent.click(dismiss);

    await waitFor(() => {
      expect(screen.queryByTestId('study-reminder-banner')).not.toBeInTheDocument();
    });

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(Number.isFinite(Number(stored))).toBe(true);
  });

  test('CTA link has correct href', async () => {
    localStorage.removeItem(STORAGE_KEY);
    // Sim 1d ago (no sim debt) but no attempts in 3d → quiz CTA path.
    await updateSettings({ examDateIso: isoDateDaysFromNow(7) });
    await saveSession(mkSim({ startedAt: Date.now() - 2 * DAY_MS, finishedAt: Date.now() - 1 * DAY_MS }));
    await saveAttempt(mkAttempt(Date.now() - 3 * DAY_MS));

    renderBanner();
    const cta = await screen.findByTestId('study-reminder-cta');
    expect(cta.getAttribute('href')).toBe('/quiz?len=25');
    expect(cta).toHaveTextContent('Start a 25-question quiz');
  });

  test('hides itself when no exam date is set', async () => {
    localStorage.removeItem(STORAGE_KEY);
    // Default settings have no examDateIso.
    renderBanner();
    // Wait a tick for async data load to settle.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId('study-reminder-banner')).not.toBeInTheDocument();
  });
});
