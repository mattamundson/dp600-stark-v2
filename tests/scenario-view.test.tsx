// scenario-view.test.tsx
//
// RTL tests for ScenarioView (/scenarios and /scenarios/:id routes).
//
// Providers required:
//   MemoryRouter — ScenarioView uses Link, useNavigate, useParams. We mount
//                  inside a <Routes> so useParams resolves correctly.
//
// DB interaction: listAttempts() runs once on mount; saveAttempt() runs on
// each submit via the quiz-session driver. fake-indexeddb is wired in
// tests/setup.ts.

import { describe, expect, test } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ScenarioView } from '../src/features/scenarios/ScenarioView';
import { scenarios } from '../src/data/scenarios';
import { questionsByScenario } from '../src/data/questions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// First scenario id (alphabetically) — typically 'scn-01'.
const FIRST = scenarios[0];

function renderScenario(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/scenarios/${id}`]}>
      <Routes>
        <Route path="/scenarios" element={<ScenarioView />} />
        <Route path="/scenarios/:id" element={<ScenarioView />} />
      </Routes>
    </MemoryRouter>
  );
}

/** Click the first option (radio / checkbox) inside the QuestionPlayer. */
function clickFirstOption() {
  const article = screen.getByRole('article', { name: 'Question' });
  const radios = within(article).queryAllByRole('radio');
  const checkboxes = within(article).queryAllByRole('checkbox');
  const opt = radios[0] ?? checkboxes[0];
  if (!opt) throw new Error('No selectable option found in QuestionPlayer');
  fireEvent.click(opt);
  return article;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScenarioView', () => {
  test('1. loads a scenario chain by id and shows scenario context + first chained Q', async () => {
    expect(FIRST).toBeDefined();
    renderScenario(FIRST.id);

    // Scenario header context renders (title + business + prompt).
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: FIRST.title })).toBeInTheDocument();
    });
    expect(screen.getByText(FIRST.business)).toBeInTheDocument();
    expect(screen.getByText(FIRST.prompt)).toBeInTheDocument();

    // QuestionPlayer mounts with question 1.
    const total = questionsByScenario(FIRST.id).length;
    await waitFor(() => {
      expect(screen.getByText(`1 / ${total}`)).toBeInTheDocument();
    });
  });

  test('2. renders chained questions one at a time (cursor advances on submit + next)', async () => {
    renderScenario(FIRST.id);
    const total = questionsByScenario(FIRST.id).length;
    expect(total).toBeGreaterThanOrEqual(2);

    // Wait for Q1 to mount.
    await waitFor(() => {
      expect(screen.getByText(`1 / ${total}`)).toBeInTheDocument();
    });

    // Capture the Q1 prompt text so we can verify Q2 is different after advance.
    const qs = questionsByScenario(FIRST.id);
    expect(screen.getByText(qs[0].prompt)).toBeInTheDocument();

    // Pick an option, submit, then click Next to advance the chain.
    const article = clickFirstOption();
    fireEvent.click(within(article).getByRole('button', { name: 'Submit' }));

    // Verdict appears (post-submit). Then click Next.
    await waitFor(() => {
      expect(within(article).getByRole('status')).toBeInTheDocument();
    });
    fireEvent.click(within(article).getByRole('button', { name: /Next/ }));

    // Q2 should now be visible — header shows "2 / total" and Q2 prompt is present.
    await waitFor(() => {
      expect(screen.getByText(`2 / ${total}`)).toBeInTheDocument();
    });
    expect(screen.getByText(qs[1].prompt)).toBeInTheDocument();
  });

  test('3. per-question feedback (verdict overlay) appears after submit before chain advances', async () => {
    renderScenario(FIRST.id);
    const total = questionsByScenario(FIRST.id).length;

    await waitFor(() => {
      expect(screen.getByText(`1 / ${total}`)).toBeInTheDocument();
    });

    const article = clickFirstOption();

    // Before submit, the Verdict overlay (role=status) is NOT rendered.
    expect(within(article).queryByRole('status')).not.toBeInTheDocument();

    // Submit fires the grader.
    fireEvent.click(within(article).getByRole('button', { name: 'Submit' }));

    // Verdict overlay (correct / incorrect) renders.
    await waitFor(() => {
      expect(within(article).getByRole('status')).toBeInTheDocument();
    });

    // The Submit button is replaced with a Next button — chain has not yet advanced.
    expect(within(article).queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    expect(within(article).getByRole('button', { name: /Next/ })).toBeInTheDocument();

    // Cursor still at Q1.
    expect(screen.getByText(`1 / ${total}`)).toBeInTheDocument();
  });

  test('4. final scenario summary shows aggregate result after the chain completes', async () => {
    renderScenario(FIRST.id);
    const total = questionsByScenario(FIRST.id).length;

    // Walk the chain: pick first option, submit, next — repeat for all Qs.
    for (let i = 0; i < total; i++) {
      await waitFor(() => {
        expect(screen.getByText(`${i + 1} / ${total}`)).toBeInTheDocument();
      });
      const article = clickFirstOption();
      fireEvent.click(within(article).getByRole('button', { name: 'Submit' }));
      await waitFor(() => {
        expect(within(article).getByRole('status')).toBeInTheDocument();
      });
      fireEvent.click(within(article).getByRole('button', { name: /Next/ }));
    }

    // After the final Next, finishSession resolves and the Done panel renders.
    await waitFor(() => {
      expect(screen.getByText('Scenario complete')).toBeInTheDocument();
    });

    // Aggregate line: "<title> · X/total correct" (split across text nodes,
    // so we walk by element textContent).
    expect(
      screen.getByText((_content, el) => {
        if (!el) return false;
        const txt = el.textContent ?? '';
        return (
          el.tagName === 'P' &&
          txt.includes(FIRST.title) &&
          /\b\d+\/\d+ correct\b/.test(txt)
        );
      })
    ).toBeInTheDocument();

    // Navigation buttons on the Done panel.
    expect(screen.getByRole('button', { name: /All scenarios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry this scenario/i })).toBeInTheDocument();
  });
});
