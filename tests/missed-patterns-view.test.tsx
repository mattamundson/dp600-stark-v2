// missed-patterns-view.test.tsx
//
// RTL tests for MissedPatternsView (/missed route).
//
// Providers required:
//   MemoryRouter      — MissedPatternsView uses Link + (indirectly) useNavigate
//   SettingsProvider  — view calls useSettings() for resolvedMissedPatterns
//
// DB interaction: listAttempts() is called once on mount.
// Seeding is done via saveAttempt() (fake-indexeddb, pre-loaded in setup.ts).

import { describe, expect, test, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MissedPatternsView } from '../src/features/analytics/MissedPatternsView';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';
import { saveAttempt } from '../src/lib/storage/db';
import { questionBank } from '../src/data/questions';
import type { Attempt } from '../src/lib/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderMissed() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <MissedPatternsView />
      </SettingsProvider>
    </MemoryRouter>
  );
}

/** Build a realistic Attempt from a real questionBank entry */
function attempt(qid: string, overrides: Partial<Attempt> = {}): Attempt {
  const q = questionBank.find((x) => x.id === qid)!;
  return {
    id: `a-${Math.random().toString(36).slice(2)}`,
    questionId: qid,
    sessionId: 'sess-1',
    ts: Date.now(),
    selectedOptionIds: ['z'],
    correct: false,
    latencyMs: 1500,
    confidence: 'sure',
    domain: q.domain,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    ...overrides,
  };
}

// Pick real question IDs from the bank for two distinct subtopics.
// `direct-lake` is the largest and most stable subtopic; fall back to first
// two unique subtopics in the bank if for some reason it is empty.
function pickSubtopicQuestions(): { subtopicA: string; idsA: string[]; subtopicB: string; idsB: string[] } {
  const bySubtopic = new Map<string, string[]>();
  for (const q of questionBank) {
    const arr = bySubtopic.get(q.subtopic) ?? [];
    arr.push(q.id);
    bySubtopic.set(q.subtopic, arr);
  }
  const entries = [...bySubtopic.entries()].filter(([, ids]) => ids.length >= 2);
  const [subtopicA, idsA] = entries[0];
  const [subtopicB, idsB] = entries[1];
  return { subtopicA, idsA, subtopicB, idsB };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MissedPatternsView', () => {
  beforeEach(() => {
    // setup.ts already resets IndexedDB; nothing extra needed here.
  });

  // ── 1. Empty state ──────────────────────────────────────────────────────────
  test('1. empty state renders heading + quiz CTA with 0 attempts', async () => {
    renderMissed();

    // Wait for the async listAttempts() + SettingsProvider init.
    await waitFor(() => {
      expect(screen.getByText('Wrong-answer patterns')).toBeInTheDocument();
    });

    // Empty-state copy.
    expect(screen.getByText(/No missed questions yet/i)).toBeInTheDocument();

    // CTA link.
    const ctaLink = screen.getByRole('link', { name: /Start a 10-question quiz/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink.getAttribute('href')).toBe('/quiz?len=10');
  });

  // ── 2. Renders groups when wrong attempts exist ─────────────────────────────
  test('2. renders group h2 + miss/attempt counts after seeding wrong attempts', async () => {
    const { subtopicA, idsA } = pickSubtopicQuestions();

    // Seed 3 wrong attempts on the same subtopic.
    for (let i = 0; i < 3; i++) {
      await saveAttempt(attempt(idsA[i % idsA.length]));
    }

    renderMissed();

    await waitFor(() => {
      // Subtopic name should appear as an h2 GroupPanel header.
      expect(screen.getByRole('heading', { name: subtopicA, level: 2 })).toBeInTheDocument();
    });

    // Header stat row should include "miss" and "attempts" text (multiple elements
    // may match these patterns — use getAllBy and check at least one exists).
    expect(screen.getAllByText(/miss/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/attempts/i).length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. "Drill these" link present + correct href ────────────────────────────
  test('3. "Drill these" link points to /remediation?subtopic=...&size=10', async () => {
    const { subtopicA, idsA } = pickSubtopicQuestions();

    await saveAttempt(attempt(idsA[0]));

    renderMissed();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /drill these/i })).toBeInTheDocument();
    });

    const drillLink = screen.getByRole('link', { name: /drill these/i });
    const expectedHref = `/remediation?subtopic=${encodeURIComponent(subtopicA)}&size=10`;
    expect(drillLink.getAttribute('href')).toBe(expectedHref);
  });

  // ── 4. Mark resolved hides the active group ─────────────────────────────────
  test('4. clicking "Mark resolved" removes the group from active list', async () => {
    const { subtopicA, idsA } = pickSubtopicQuestions();

    await saveAttempt(attempt(idsA[0]));

    renderMissed();

    // Wait for group to appear.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: subtopicA, level: 2 })).toBeInTheDocument();
    });

    // Click the Mark resolved button.
    const resolveBtn = screen.getByRole('button', { name: /mark resolved/i });
    fireEvent.click(resolveBtn);

    // Group should leave the active list.
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: subtopicA, level: 2 })
      ).not.toBeInTheDocument();
    });

    // "Show N resolved" toggle should now appear.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /show \d+ resolved/i })).toBeInTheDocument();
    });
  });

  // ── 5. Show resolved toggle reveals the resolved group ──────────────────────
  test('5. clicking "Show resolved" toggle reveals the resolved group', async () => {
    const { subtopicA, idsA } = pickSubtopicQuestions();

    await saveAttempt(attempt(idsA[0]));

    renderMissed();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark resolved/i })).toBeInTheDocument();
    });

    // Mark resolved.
    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));

    // Wait for toggle to appear.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /show \d+ resolved/i })).toBeInTheDocument();
    });

    // Click the toggle.
    fireEvent.click(screen.getByRole('button', { name: /show \d+ resolved/i }));

    // "Resolved" section header (h2 level) and the group should re-appear.
    // Note: a "Resolved" badge also appears on the GroupPanel card, so use
    // getAllByText and assert at least one match rather than getByText.
    await waitFor(() => {
      expect(screen.getAllByText('Resolved').length).toBeGreaterThanOrEqual(1);
    });

    // The group should be visible again (inside the resolved section).
    expect(screen.getAllByText(subtopicA).length).toBeGreaterThanOrEqual(1);
  });

  // ── 6. Header counts reflect number of active subtopics ─────────────────────
  test('6. header shows correct active subtopic count for 2 subtopics', async () => {
    const { idsA, idsB } = pickSubtopicQuestions();

    // One wrong attempt each on two different subtopics.
    await saveAttempt(attempt(idsA[0]));
    await saveAttempt(attempt(idsB[0]));

    renderMissed();

    await waitFor(() => {
      // "2 active subtopics" appears in the header paragraph.
      expect(screen.getByText(/2 active subtopic/i)).toBeInTheDocument();
    });
  });
});
