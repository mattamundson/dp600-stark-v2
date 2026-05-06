// RTL tests for KqlDrillView (/lab/kql-drill).
//
// Providers: only MemoryRouter — KqlDrillView uses Link from react-router-dom
// but does NOT persist sessions, so no SettingsProvider / ToastProvider needed.
// fake-indexeddb is wired in tests/setup.ts (belt-and-suspenders; no IDB calls here).

import { describe, expect, test, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KqlDrillView } from '../src/features/lab/KqlDrillView';

function renderDrill() {
  return render(
    <MemoryRouter>
      <KqlDrillView />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('KqlDrillView', () => {
  test('1. renders the idle screen with the "Begin drill" button visible', async () => {
    renderDrill();

    // The component starts in 'init' phase then immediately sets 'idle' via useEffect.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /KQL Mini-Drill/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /begin drill/i })).toBeInTheDocument();
  });

  test('2. clicking "Begin drill" enters running phase: timer "05:00" and palette of 5 buttons', async () => {
    renderDrill();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /begin drill/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /begin drill/i }));

    await waitFor(() => {
      // Timer shows M:SS — 300_000ms → "05:00"
      expect(screen.getByText('05:00')).toBeInTheDocument();
    });

    // Palette: 5 numbered question buttons (aria-label="Question palette")
    const palette = screen.getByLabelText('Question palette');
    const paletteButtons = palette.querySelectorAll('button');
    expect(paletteButtons).toHaveLength(5);
    // Verify they are labelled 1–5
    expect(paletteButtons[0]).toHaveTextContent('1');
    expect(paletteButtons[4]).toHaveTextContent('5');
  });

  test('3. footer text "No per-question feedback during the drill." is visible in running phase', async () => {
    renderDrill();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /begin drill/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /begin drill/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/No per-question feedback during the drill/i)
      ).toBeInTheDocument();
    });
  });

  test('4. clicking "Submit drill now" transitions to done phase showing "KQL Drill complete"', async () => {
    renderDrill();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /begin drill/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /begin drill/i }));

    // Wait for running phase (footer button appears)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit drill now/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /submit drill now/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /KQL Drill complete/i })).toBeInTheDocument();
    });
  });

  test('5. done phase shows "Per-question" section with 5 list items labelled Q1–Q5', async () => {
    renderDrill();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /begin drill/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /begin drill/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit drill now/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /submit drill now/i }));

    await waitFor(() => {
      expect(screen.getByText('Per-question')).toBeInTheDocument();
    });

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(5);

    // Each item should include Q1 … Q5 prefix text
    for (let i = 1; i <= 5; i++) {
      expect(
        listItems.find((li) => li.textContent?.includes(`Q${i}`))
      ).toBeDefined();
    }
  });

  // Test 6: timer countdown via fake timers is intentionally omitted.
  //
  // KqlDrillView's timer uses a wall-clock delta (Date.now() diff inside
  // window.setInterval) rather than a fixed decrement. Faking Date globally
  // causes waitFor's own setTimeout-based polling to deadlock under Vitest's
  // fake-timer scheduler. The five tests above cover the critical user flows
  // without the flakiness risk. If a future refactor replaces the delta loop
  // with a fixed-step timer, this test can be added back safely.
});
