// question-player.test.tsx
//
// A11y-focused tests for QuestionPlayer covering the 2026-05-07 audit fixes:
//   • MEDIUM #4 — Verdict region announces via role="status" / aria-live
//   • MOBILE #10 — Move-up/Move-down arrows are keyboard reachable when ordering is unlocked
//
// Pattern is borrowed from tests/ui-questionplayer.test.tsx — same minimal
// fixtures, same render harness with MemoryRouter for verdict relatedIds.

import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuestionPlayer } from '../src/components/QuestionPlayer';
import type { Question } from '../src/lib/schema';

const single: Question = {
  id: 'q1',
  type: 'single',
  domain: 'semantic',
  subtopic: 'storage-modes',
  difficulty: 2,
  prompt: 'Pick B',
  options: [
    { id: 'A', text: 'alpha' },
    { id: 'B', text: 'bravo' }
  ],
  correctOptionIds: ['B'],
  explanation: 'B is right because reasons.',
  sourceAnchor: { category: 'x', note: 'y' },
  tags: []
};

const ordering: Question = {
  id: 'q2',
  type: 'ordering',
  domain: 'maintain',
  subtopic: 'deployment-pipelines',
  difficulty: 3,
  prompt: 'Order me',
  options: [
    { id: 'A', text: 'first' },
    { id: 'B', text: 'second' },
    { id: 'C', text: 'third' }
  ],
  correctOrder: ['A', 'B', 'C'],
  explanation: '',
  sourceAnchor: { category: 'x', note: 'y' },
  tags: []
};

describe('QuestionPlayer a11y', () => {
  test('verdict region exposes role="status" with aria-live="polite" when locked', () => {
    render(
      <MemoryRouter>
        <QuestionPlayer
          question={single}
          value={{ selectedOptionIds: ['B'], confidence: 'sure' }}
          reveal
          result={{ correct: true, partial: 1 }}
        />
      </MemoryRouter>
    );

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeInTheDocument();
    expect(statusRegion.getAttribute('aria-live')).toBe('polite');
    expect(statusRegion.getAttribute('aria-atomic')).toBe('true');
    // Verdict text lives inside the status region
    expect(statusRegion.textContent ?? '').toMatch(/Correct/i);
  });

  test('ordering question: Move up / Move down arrow buttons are reachable as accessible buttons', () => {
    render(<QuestionPlayer question={ordering} onChange={() => {}} onSubmit={() => {}} />);

    // Each item has both a Move up and a Move down button (3 items × 2 buttons = 6).
    const upButtons = screen.getAllByRole('button', { name: /move up/i });
    const downButtons = screen.getAllByRole('button', { name: /move down/i });
    expect(upButtons.length).toBe(3);
    expect(downButtons.length).toBe(3);

    // First item's Move up is disabled (already top); last item's Move down is disabled.
    expect((upButtons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((downButtons[downButtons.length - 1] as HTMLButtonElement).disabled).toBe(true);

    // Touch-target bump: arrow buttons carry the h-10 utility (≥40px height; combined with
    // btn padding meets the 44px target on mobile).
    expect(upButtons[1].className).toMatch(/h-10/);
    expect(downButtons[1].className).toMatch(/h-10/);
  });
});
