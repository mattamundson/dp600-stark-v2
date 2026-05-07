// retention-panel.test.tsx
//
// RTL tests for RetentionPanel — the drop-in panel for /missed that surfaces
// resolved subtopics aged past N days without a re-attempt.
//
// Note: this lives in src/features/missed/RetentionPanel.tsx, separate from
// the host MissedPatternsView (which is in src/features/analytics/). The
// integration step that imports this panel into MissedPatternsView is
// documented at the bottom of RetentionPanel.tsx and is intentionally left
// for the host's owner to apply (single-line edit).

import { describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RetentionPanel } from '../src/features/missed/RetentionPanel';
import { DAY_MS } from '../src/features/missed/retention-loop';
import type { Attempt } from '../src/lib/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000;

let _seq = 0;
function mkAttempt(
  questionId: string,
  subtopic: string,
  correct: boolean,
  ts: number
): Attempt {
  _seq += 1;
  return {
    id: `a-${_seq}`,
    questionId,
    sessionId: 'sess-1',
    ts,
    selectedOptionIds: correct ? ['A'] : ['B'],
    correct,
    latencyMs: 30_000,
    confidence: 'unsure',
    domain: 'semantic',
    subtopic,
    difficulty: 2,
  };
}

function renderPanel(
  resolvedSubtopics: Record<string, number>,
  attempts: Attempt[],
  onPatch = vi.fn()
) {
  return {
    onPatch,
    ...render(
      <MemoryRouter>
        <RetentionPanel
          resolvedSubtopics={resolvedSubtopics}
          attempts={attempts}
          onPatch={onPatch}
          now={NOW}
        />
      </MemoryRouter>
    ),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RetentionPanel', () => {
  test('renders nothing when no resolved subtopics', () => {
    const { container } = renderPanel({}, []);
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when resolution is fresh (< threshold days)', () => {
    const { container } = renderPanel({ 'direct-lake': NOW - 1 * DAY_MS }, []);
    expect(container.firstChild).toBeNull();
  });

  test('renders heading + row when a subtopic is due', () => {
    renderPanel({ 'direct-lake': NOW - 5 * DAY_MS }, []);
    expect(screen.getByText('Retention check due')).toBeInTheDocument();
    expect(screen.getByTestId('retention-row-direct-lake')).toBeInTheDocument();
    expect(screen.getByText('direct-lake')).toBeInTheDocument();
  });

  test('CTA link navigates to remediation route with correct query', () => {
    renderPanel({ 'direct-lake': NOW - 5 * DAY_MS }, []);
    const cta = screen.getByRole('link', { name: /Retest 3 questions on direct-lake/i });
    expect(cta.getAttribute('href')).toBe('/remediation?subtopic=direct-lake&size=10');
  });

  test('renders one row per due subtopic', () => {
    renderPanel(
      {
        'direct-lake': NOW - 6 * DAY_MS,
        kql: NOW - 9 * DAY_MS,
      },
      []
    );
    expect(screen.getByTestId('retention-row-direct-lake')).toBeInTheDocument();
    expect(screen.getByTestId('retention-row-kql')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Retest 3 questions/i })).toHaveLength(2);
  });

  test('subtopic with re-attempts since resolve does not appear', () => {
    const resolvedAt = NOW - 5 * DAY_MS;
    const attempts = [mkAttempt('q1', 'direct-lake', true, NOW - 1 * DAY_MS)];
    const { container } = renderPanel({ 'direct-lake': resolvedAt }, attempts);
    expect(container.firstChild).toBeNull();
  });

  test('auto-bump fires onPatch when post-resolve attempts already pass threshold', async () => {
    const resolvedAt = NOW - 10 * DAY_MS;
    // 3 of 3 correct after resolve → auto-bump
    const attempts = [
      mkAttempt('q1', 'direct-lake', true, NOW - 3 * DAY_MS),
      mkAttempt('q2', 'direct-lake', true, NOW - 2 * DAY_MS),
      mkAttempt('q3', 'direct-lake', true, NOW - 1 * DAY_MS),
    ];
    const { onPatch } = renderPanel({ 'direct-lake': resolvedAt }, attempts);

    await waitFor(() => {
      expect(onPatch).toHaveBeenCalledTimes(1);
    });
    const arg = onPatch.mock.calls[0][0];
    expect(arg.resolvedMissedPatterns['direct-lake']).toBe(NOW - 1 * DAY_MS);
  });

  test('auto-bump does NOT fire when attempts fail threshold', async () => {
    const resolvedAt = NOW - 10 * DAY_MS;
    // 1 of 3 correct → 33% < 80% threshold
    const attempts = [
      mkAttempt('q1', 'direct-lake', false, NOW - 3 * DAY_MS),
      mkAttempt('q2', 'direct-lake', false, NOW - 2 * DAY_MS),
      mkAttempt('q3', 'direct-lake', true, NOW - 1 * DAY_MS),
    ];
    const { onPatch } = renderPanel({ 'direct-lake': resolvedAt }, attempts);

    // Give the effect a tick — it should not fire onPatch.
    await new Promise((r) => setTimeout(r, 0));
    expect(onPatch).not.toHaveBeenCalled();
  });

  test('respects custom daysAfterResolve via prop', () => {
    render(
      <MemoryRouter>
        <RetentionPanel
          resolvedSubtopics={{ 'direct-lake': NOW - 2 * DAY_MS }}
          attempts={[]}
          onPatch={vi.fn()}
          now={NOW}
          daysAfterResolve={1}
        />
      </MemoryRouter>
    );
    expect(screen.getByTestId('retention-row-direct-lake')).toBeInTheDocument();
  });
});
