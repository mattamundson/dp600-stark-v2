// Smoke test for DashboardView wiring of new entry cards.
//
// Verifies that UnseenOnlyEntryCard and SyllabusPreviewCard are rendered into
// the dashboard. SyllabusPreviewCard is mocked here to keep this test
// independent of parallel agent 5's implementation timeline.

import { describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/features/syllabus/SyllabusPreviewCard', () => ({
  SyllabusPreviewCard: () => <div data-testid="syllabus-preview-card">Syllabus</div>
}));

import { DashboardView } from '../src/features/dashboard/DashboardView';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';
import { saveAttempt } from '../src/lib/storage/db';
import type { Attempt, Confidence, Domain } from '../src/lib/schema';

let _idSeq = 0;
function mkAttempt(overrides: Partial<Attempt> = {}): Attempt {
  _idSeq += 1;
  return {
    id: `b${_idSeq}`,
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

function renderDashboard() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <DashboardView />
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe('DashboardView — new card wiring', () => {
  test('renders UnseenOnlyEntryCard when there are unseen questions', async () => {
    // Seed only one attempt so the user has many unseen questions left.
    await saveAttempt(mkAttempt({ questionId: 'dlm2-001' }));
    renderDashboard();

    await waitFor(() => {
      // UnseenOnlyEntryCard renders a "Drill N unseen →" CTA when count > 0.
      expect(screen.getByRole('link', { name: /drill .* unseen/i })).toBeInTheDocument();
    });
  });

  test('renders SyllabusPreviewCard mock in row 2', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('syllabus-preview-card')).toBeInTheDocument();
    });
  });

  test('row 1 grid is 4-column at lg breakpoint', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /welcome back/i })).toBeInTheDocument();
    });
    // The Today/Streak/Questions/Unseen grid must declare lg:grid-cols-4
    const todayLabel = screen.getByText(/^today$/i);
    // Walk up until we find a section with the grid class
    let node: HTMLElement | null = todayLabel;
    let foundLg4 = false;
    while (node) {
      if (node.classList?.contains('lg:grid-cols-4')) {
        foundLg4 = true;
        break;
      }
      node = node.parentElement;
    }
    expect(foundLg4).toBe(true);
  });
});
