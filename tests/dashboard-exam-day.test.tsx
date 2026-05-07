// Dashboard exam-day-mode focus tests.
//
// Blocker B-A from session-6 handoff: only 2 of 8 panels had `exam-day-hide`.
// This file verifies that with `examDayMode=true` the expected dashboard
// panels are hidden (have `exam-day-hide` class on or above their root) and
// the global toggle (html.exam-day) is applied via SettingsProvider.
//
// We mock SyllabusPreviewCard because that file is being added by a parallel
// agent in this same fan-out. If the parallel agent's stub lands first, the
// mock is harmless; if it doesn't, this test still runs.

import { describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock SyllabusPreviewCard so this test file is independent of parallel
// agent 5. Renders an identifiable marker so we can assert presence/absence.
vi.mock('../src/features/syllabus/SyllabusPreviewCard', () => ({
  SyllabusPreviewCard: () => <div data-testid="syllabus-preview-card">Syllabus</div>
}));

import { DashboardView } from '../src/features/dashboard/DashboardView';
import { SettingsProvider, useSettings } from '../src/app/providers/SettingsProvider';
import { saveAttempt, updateSettings } from '../src/lib/storage/db';
import type { Attempt, Confidence, Domain } from '../src/lib/schema';

let _idSeq = 0;
function mkAttempt(overrides: Partial<Attempt> = {}): Attempt {
  _idSeq += 1;
  return {
    id: `a${_idSeq}`,
    questionId: overrides.questionId ?? 'dlm2-001',
    sessionId: 's1',
    ts: Date.now() - _idSeq * 1000,
    selectedOptionIds: [],
    correct: true,
    latencyMs: 60_000,
    confidence: 'sure' as Confidence,
    domain: 'prepare' as Domain,
    subtopic: 'direct-lake',
    difficulty: 2,
    ...overrides
  };
}

async function seedAttempts(n = 5) {
  for (let i = 0; i < n; i++) {
    await saveAttempt(mkAttempt({ correct: i % 2 === 0 }));
  }
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <DashboardView />
      </SettingsProvider>
    </MemoryRouter>
  );
}

// Toggle settings.examDayMode by directly persisting + reloading. Cleanest
// hands-off path; SettingsProvider re-applies the html class on its initial
// effect run.
async function setExamDayMode(on: boolean) {
  await updateSettings({ examDayMode: on });
}

afterEach(() => {
  // Always strip the class between tests so leakage doesn't poison the next run.
  document.documentElement.classList.remove('exam-day');
});

describe('DashboardView — exam-day-mode hide audit', () => {
  test('1. examDayMode=false: panels render without hiding class on <html>', async () => {
    await seedAttempts(5);
    renderDashboard();

    await waitFor(() => {
      // Header present, app booted.
      expect(screen.getByRole('heading', { level: 1, name: /welcome back/i })).toBeInTheDocument();
    });

    // No exam-day class on the html element by default.
    expect(document.documentElement.classList.contains('exam-day')).toBe(false);

    // Last session panel should render (no class hides it without exam-day).
    expect(screen.getByText(/last session/i)).toBeInTheDocument();
    // Today on the plan panel should render.
    expect(screen.getByText(/today on the plan/i)).toBeInTheDocument();
    // SyllabusPreviewCard mock renders.
    expect(screen.getByTestId('syllabus-preview-card')).toBeInTheDocument();
  });

  test('2. examDayMode=true: html.exam-day is applied by SettingsProvider', async () => {
    await setExamDayMode(true);
    renderDashboard();

    // SettingsProvider's initial-load effect calls applyExamDayMode(true).
    await waitFor(() => {
      expect(document.documentElement.classList.contains('exam-day')).toBe(true);
    });
  });

  test('3. expected hide-targets carry exam-day-hide class (via class on element or ancestor)', async () => {
    await seedAttempts(5);
    await setExamDayMode(true);
    renderDashboard();

    // Wait for Dashboard async useEffect to settle.
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /welcome back/i })).toBeInTheDocument();
    });

    // For each expected hide-target heading, walk up to find a node with
    // `exam-day-hide`. CSS uses `display: none !important` on that node so
    // its presence on or above the heading is what matters.
    const hideTargets = [
      /last session/i,
      /today on the plan/i,
      /14-day activity/i,
    ];

    for (const labelRe of hideTargets) {
      const el = screen.getByRole('heading', { name: labelRe });
      // Walk ancestors looking for exam-day-hide.
      let node: HTMLElement | null = el;
      let found = false;
      while (node) {
        if (node.classList?.contains('exam-day-hide')) {
          found = true;
          break;
        }
        node = node.parentElement;
      }
      expect(found, `expected '${labelRe}' to be hidden in exam-day mode`).toBe(true);
    }
  });

  test('4. keep-targets do NOT carry exam-day-hide class (active-study panels)', async () => {
    await seedAttempts(5);
    await setExamDayMode(true);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /welcome back/i })).toBeInTheDocument();
    });

    // The header (with the quiz CTAs) must remain visible — no exam-day-hide
    // on its <header> chain.
    const header = screen.getByRole('heading', { level: 1, name: /welcome back/i });
    let node: HTMLElement | null = header;
    let foundOnHeader = false;
    while (node) {
      if (node.classList?.contains('exam-day-hide')) {
        foundOnHeader = true;
        break;
      }
      node = node.parentElement;
    }
    expect(foundOnHeader).toBe(false);

    // The Today / Streak / Questions row must remain visible. The "Today"
    // text label inside the first panel is a reliable marker.
    const todayLabel = screen.getByText(/^today$/i);
    let nodeT: HTMLElement | null = todayLabel;
    let hiddenT = false;
    while (nodeT) {
      if (nodeT.classList?.contains('exam-day-hide')) {
        hiddenT = true;
        break;
      }
      nodeT = nodeT.parentElement;
    }
    expect(hiddenT).toBe(false);
  });

  test('5. flipping examDayMode=false removes the html class', async () => {
    await setExamDayMode(true);
    const { rerender } = renderDashboard();
    await waitFor(() => {
      expect(document.documentElement.classList.contains('exam-day')).toBe(true);
    });

    // Flip back via patch — call the SettingsProvider's patch through a
    // tiny inline harness so the class toggle runs through applyExamDayMode.
    function Flip() {
      const { patch, settings } = useSettings();
      // Auto-flip on mount when current value is true.
      if (settings && settings.examDayMode) {
        void patch({ examDayMode: false });
      }
      return null;
    }

    await act(async () => {
      rerender(
        <MemoryRouter>
          <SettingsProvider>
            <DashboardView />
            <Flip />
          </SettingsProvider>
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains('exam-day')).toBe(false);
    });
  });
});
