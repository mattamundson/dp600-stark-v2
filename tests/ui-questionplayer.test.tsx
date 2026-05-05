import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
  explanation: '',
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

describe('QuestionPlayer', () => {
  test('single-choice: clicking an option fires onChange and highlights it', () => {
    const onChange = vi.fn();
    render(<QuestionPlayer question={single} onChange={onChange} onSubmit={() => {}} />);
    const optB = screen.getByRole('radio', { name: /bravo/i });
    fireEvent.click(optB);
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.selectedOptionIds).toEqual(['B']);
  });

  test('keyboard 1/2 selects option 1/2 in single-choice', () => {
    const onChange = vi.fn();
    render(<QuestionPlayer question={single} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.keyDown(window, { key: '2' });
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.selectedOptionIds).toEqual(['B']);
  });

  test('ordering: J/K keys reorder the highlighted item', () => {
    const onChange = vi.fn();
    render(<QuestionPlayer question={ordering} onChange={onChange} onSubmit={() => {}} />);
    // initial order = A, B, C; cursor at 0 (A). Press J to move A down.
    fireEvent.keyDown(window, { key: 'j' });
    let last = onChange.mock.calls.at(-1)?.[0];
    expect(last.selectedOrder).toEqual(['B', 'A', 'C']);
    // Now A is at index 1; press J again — A goes to index 2.
    fireEvent.keyDown(window, { key: 'j' });
    last = onChange.mock.calls.at(-1)?.[0];
    expect(last.selectedOrder).toEqual(['B', 'C', 'A']);
    // Press K — A goes back to index 1.
    fireEvent.keyDown(window, { key: 'k' });
    last = onChange.mock.calls.at(-1)?.[0];
    expect(last.selectedOrder).toEqual(['B', 'A', 'C']);
  });

  test('confidence keys S/U/G set confidence', () => {
    const onChange = vi.fn();
    render(<QuestionPlayer question={single} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.keyDown(window, { key: 's' });
    expect(onChange.mock.calls.at(-1)?.[0].confidence).toBe('sure');
    fireEvent.keyDown(window, { key: 'g' });
    expect(onChange.mock.calls.at(-1)?.[0].confidence).toBe('guess');
  });

  test('related-trap links render in revealed verdict and point at /q/:id', () => {
    const withRelated: Question = {
      ...single,
      explanation: 'because B',
      relatedIds: ['dpd-007', 'dlm2-004']
    };
    render(
      <MemoryRouter>
        <QuestionPlayer
          question={withRelated}
          value={{ selectedOptionIds: ['B'], confidence: 'sure' }}
          reveal
          result={{ correct: true, partial: 1 }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Related traps')).toBeInTheDocument();
    const linkA = screen.getByRole('link', { name: /dpd-007/ });
    expect(linkA.getAttribute('href')).toBe('/q/dpd-007');
    const linkB = screen.getByRole('link', { name: /dlm2-004/ });
    expect(linkB.getAttribute('href')).toBe('/q/dlm2-004');
  });

  test('verdict omits Related-traps section when relatedIds is absent', () => {
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
    expect(screen.queryByText('Related traps')).not.toBeInTheDocument();
  });
});
