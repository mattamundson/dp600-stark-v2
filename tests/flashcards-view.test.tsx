// RTL tests for FlashcardsView (/flashcards).
//
// Providers: ToastProvider (the view calls useToast().push on grade).
// MemoryRouter is not strictly required (no Link / useNavigate), but harmless.
//
// Persistence: SRS state is stored via saveSrs/getSrs in IndexedDB (fake-
// indexeddb wired in tests/setup.ts). Each test starts with a clean store
// because setup.ts runs _resetDbForTests() in beforeEach.
//
// Gotcha: The "due" deck is populated by loadDeck('due') which fires inside
// useEffect on mount. When SRS state is empty the unseen filter pulls from
// the full flashcards bank, so the due queue is non-empty even on first
// load. We waitFor the first card to appear before interacting.

import { describe, expect, test, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { ToastProvider } from '../src/app/providers/ToastProvider';
import { FlashcardsView } from '../src/features/flashcards/FlashcardsView';
import { flashcards, flashcardsByDeck } from '../src/data/flashcards';
import { getSrs } from '../src/lib/storage/db';
import { DECK_LABEL } from '../src/lib/schema';

function renderView() {
  return render(
    <ToastProvider>
      <FlashcardsView />
    </ToastProvider>
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('FlashcardsView', () => {
  test('1. loads with first card from the default ("due") queue front-side', async () => {
    renderView();
    // The due queue includes ALL unseen cards on a fresh DB, so a card renders.
    await waitFor(() => {
      expect(screen.getByText(/^Front$/)).toBeInTheDocument();
    });
    // Counter shows "1 / N"
    expect(screen.getByText(/^1\s*\/\s*\d+$/)).toBeInTheDocument();
    // The grade buttons are disabled until the card is flipped.
    expect(screen.getByRole('button', { name: /^Again \(1\)$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Easy \(4\)$/ })).toBeDisabled();
  });

  test('2. flipping the card reveals the back side', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText(/^Front$/)).toBeInTheDocument();
    });
    // Click the card itself (the flip target — it has aria-pressed).
    const card = screen.getByRole('button', { pressed: false });
    fireEvent.click(card);
    await waitFor(() => {
      expect(screen.getByText(/^Back$/)).toBeInTheDocument();
    });
    // Grade buttons are now enabled.
    expect(screen.getByRole('button', { name: /^Good \(3\)$/ })).toBeEnabled();
  });

  test('3. rating a card with "Good" advances the queue and persists SRS state', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText(/^Front$/)).toBeInTheDocument();
    });
    // Capture the first card's content so we can verify advancement.
    const totalText = screen.getByText(/^1\s*\/\s*\d+$/).textContent ?? '1 / 1';
    const totalMatch = totalText.match(/\/\s*(\d+)$/);
    const total = totalMatch ? Number.parseInt(totalMatch[1], 10) : 1;

    // Identify the active card BEFORE grading by scanning the deck queue.
    // We can't easily get the cardId from DOM, so we'll just verify SRS row
    // count goes from 0 → 1 after grading, and the cursor advances.

    // Flip then grade Good.
    fireEvent.click(screen.getByRole('button', { pressed: false }));
    await waitFor(() => {
      expect(screen.getByText(/^Back$/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /^Good \(3\)$/ }));

    // The view should advance to either the next card (cursor 2 / total)
    // OR back to cursor 1 if the queue rolled over (only when total === 1,
    // which won't happen on a fresh bank with 100+ cards).
    if (total > 1) {
      await waitFor(() => {
        expect(screen.getByText(/^2\s*\/\s*\d+$/)).toBeInTheDocument();
      });
    }

    // SRS state should now contain ONE persisted row for the rated card.
    // The due queue is shuffled, so the rated card could be any of the
    // unseen flashcards — check all of them.
    let foundSrs = false;
    for (const fc of flashcards) {
      // eslint-disable-next-line no-await-in-loop
      const s = await getSrs(fc.id);
      if (s) {
        foundSrs = true;
        // Good = grade 4; reps should advance to 1; interval to 1 day.
        expect(s.reps).toBe(1);
        expect(s.interval).toBe(1);
        break;
      }
    }
    expect(foundSrs).toBe(true);
  });

  test('4. switching to a specific deck filter changes the active card pool', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText(/^Front$/)).toBeInTheDocument();
    });

    // Click the "KQL" deck button (label = "KQL (N)").
    const kqlBtn = screen.getByRole('button', { name: new RegExp(`^${DECK_LABEL.kql}\\s*\\(\\d+\\)`, 'i') });
    fireEvent.click(kqlBtn);

    const kqlCards = flashcardsByDeck('kql');
    if (kqlCards.length > 0) {
      // Card counter should reflect the kql deck size.
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`^1\\s*/\\s*${kqlCards.length}$`))).toBeInTheDocument();
      });

      // Card content should match SOME card from the kql deck (front side).
      // Pull the visible card body and verify it equals one of the kql fronts.
      const body = screen.getByRole('button', { pressed: false });
      const visibleText = body.textContent ?? '';
      const matched = kqlCards.some((c) => visibleText.includes(c.front));
      expect(matched).toBe(true);
    }
  });

  test('5. an empty deck shows the "no cards in this view" copy', async () => {
    // The view shows "No cards in this view." when the queue is empty (cursor
    // points past end). We isolate the view + provider in a fresh module
    // graph so React Context identity matches across the wrapper and the view.
    vi.resetModules();
    vi.doMock('../src/data/flashcards', () => ({
      flashcards: [],
      flashcardsByDeck: () => [],
      flashcardById: () => undefined
    }));

    const isolated = await import('../src/features/flashcards/FlashcardsView');
    const provider = await import('../src/app/providers/ToastProvider');
    const FlashcardsViewIsolated = isolated.FlashcardsView;
    const ToastProviderIsolated = provider.ToastProvider;

    const { container } = render(
      <ToastProviderIsolated>
        <FlashcardsViewIsolated />
      </ToastProviderIsolated>
    );
    await waitFor(() => {
      expect(within(container).getByText(/No cards in this view/i)).toBeInTheDocument();
    });

    vi.doUnmock('../src/data/flashcards');
    vi.resetModules();
  });
});
