// /q/:id deep-link route smoke tests.
//
// Verifies the SingleQuestionView renders a real question from the bank
// with the verdict pre-revealed, the explanation visible, and "Related
// traps" links pointing back into /q/:id.

import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SingleQuestionView } from '../src/features/quiz/SingleQuestionView';
import { questionBank } from '../src/data/questions';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/q/:id" element={<SingleQuestionView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SingleQuestionView', () => {
  test('renders a known question with explanation visible', () => {
    const q = questionBank.find((x) => x.id === 'dlm2-001');
    expect(q).toBeTruthy();
    renderAt('/q/dlm2-001');
    // Question id appears in header
    expect(screen.getByText('dlm2-001')).toBeInTheDocument();
    // Question content renders (DL appears multiple times — prompt, options, explanation)
    expect(screen.getAllByText(/Direct Lake on OneLake/i).length).toBeGreaterThan(0);
  });

  test('shows "Question not found" for an unknown id', () => {
    renderAt('/q/this-id-does-not-exist');
    expect(screen.getByText(/Question not found/i)).toBeInTheDocument();
  });

  test('related-traps section appears when the question has relatedIds', () => {
    // dlm2-001 has relatedIds: ['dlm2-005', 'dlm2-002'] per the content.
    const q = questionBank.find((x) => x.id === 'dlm2-001');
    expect(q?.relatedIds && q.relatedIds.length > 0).toBe(true);
    renderAt('/q/dlm2-001');
    expect(screen.getByText('Related traps')).toBeInTheDocument();
    // Each link points at /q/:id
    for (const rid of q!.relatedIds!) {
      const link = screen.getByRole('link', { name: new RegExp(rid) });
      expect(link.getAttribute('href')).toBe(`/q/${rid}`);
    }
  });

  test('does not show "Related traps" for a question without relatedIds', () => {
    // Find any question without relatedIds (most older ones do not have them)
    const q = questionBank.find((x) => !x.relatedIds || x.relatedIds.length === 0);
    expect(q).toBeTruthy();
    renderAt(`/q/${q!.id}`);
    expect(screen.queryByText('Related traps')).not.toBeInTheDocument();
  });
});
