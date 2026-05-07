// RTL tests for SyllabusPreviewView (/syllabus) and SyllabusPreviewCard.
//
// Both views consume the live questionBank / flashcards / scenarios modules
// directly — there's no provider stack to set up beyond MemoryRouter for the
// card's <Link>. We assert structural invariants (all three domains render,
// pills have the right labels, badge testid resolves) rather than exact
// counts so the tests don't break every time the bank grows.

import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SyllabusPreviewView } from '../src/features/syllabus/SyllabusPreviewView';
import { SyllabusPreviewCard } from '../src/features/syllabus/SyllabusPreviewCard';

function renderView() {
  return render(
    <MemoryRouter>
      <SyllabusPreviewView />
    </MemoryRouter>
  );
}

function renderCard() {
  return render(
    <MemoryRouter>
      <SyllabusPreviewCard />
    </MemoryRouter>
  );
}

describe('SyllabusPreviewView', () => {
  test('1. renders the page heading', () => {
    renderView();
    expect(
      screen.getByRole('heading', { level: 1, name: /syllabus coverage/i })
    ).toBeInTheDocument();
  });

  test('2. renders all three domain sections', () => {
    renderView();
    expect(screen.getByTestId('syllabus-domain-maintain')).toBeInTheDocument();
    expect(screen.getByTestId('syllabus-domain-prepare')).toBeInTheDocument();
    expect(screen.getByTestId('syllabus-domain-semantic')).toBeInTheDocument();
  });

  test('3. each domain section has a coverage badge', () => {
    renderView();
    const sections = [
      screen.getByTestId('syllabus-domain-maintain'),
      screen.getByTestId('syllabus-domain-prepare'),
      screen.getByTestId('syllabus-domain-semantic')
    ];
    for (const section of sections) {
      const badge = section.querySelector('[data-testid^="coverage-badge-"]');
      expect(badge).not.toBeNull();
    }
  });

  test('4. renders blueprint range labels for each domain', () => {
    renderView();
    // The expected ranges are 25-30% (maintain), 45-50% (prepare), 25-30% (semantic).
    const maintain = screen.getByTestId('syllabus-domain-maintain');
    const prepare = screen.getByTestId('syllabus-domain-prepare');
    expect(maintain.textContent).toMatch(/25–30%/);
    expect(prepare.textContent).toMatch(/45–50%/);
  });

  test('5. Save as PDF button calls window.print()', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderView();
    const btn = screen.getByRole('button', { name: /save as pdf/i });
    btn.click();
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});

describe('SyllabusPreviewCard', () => {
  test('6. renders dashboard card heading', () => {
    renderCard();
    expect(
      screen.getByRole('heading', { name: /question bank vs official dp-600 weighting/i })
    ).toBeInTheDocument();
  });

  test('7. renders three pill chips one per domain', () => {
    renderCard();
    expect(screen.getByTestId('syllabus-pill-maintain')).toBeInTheDocument();
    expect(screen.getByTestId('syllabus-pill-prepare')).toBeInTheDocument();
    expect(screen.getByTestId('syllabus-pill-semantic')).toBeInTheDocument();
  });

  test('8. pills include actual percent vs blueprint range copy', () => {
    renderCard();
    const maintainPill = screen.getByTestId('syllabus-pill-maintain');
    expect(maintainPill.textContent).toMatch(/%/);
    expect(maintainPill.textContent).toMatch(/25–30%/);
  });

  test('9. has Open syllabus CTA pointing at /syllabus', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /open syllabus/i });
    expect(link).toHaveAttribute('href', '/syllabus');
  });
});
