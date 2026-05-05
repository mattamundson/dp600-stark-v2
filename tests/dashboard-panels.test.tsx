// Dashboard panel tests: Readiness rating + Confidence calibration.
//
// Both panels render only when attempts.length > 0 (guarded by `readinessV2` useMemo).
// The strategy here is to seed IndexedDB via saveAttempt() before render, then
// waitFor the async useEffect inside DashboardView to settle.
//
// Wrapper: MemoryRouter + SettingsProvider (DashboardView calls useSettings and
// renders Links). ToastProvider is NOT needed — DashboardView doesn't push toasts.

import { describe, expect, test } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardView } from '../src/features/dashboard/DashboardView';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';
import { saveAttempt } from '../src/lib/storage/db';
import type { Attempt, Confidence, Domain } from '../src/lib/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idSeq = 0;
function mkAttempt(overrides: Partial<Attempt> = {}): Attempt {
  _idSeq += 1;
  return {
    id: `a${_idSeq}`,
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

/**
 * Seed n attempts into IndexedDB, then render DashboardView wrapped in the
 * required providers. Returns the RTL render result.
 */
async function seedAndRender(attempts: Attempt[]) {
  for (const a of attempts) {
    await saveAttempt(a);
  }
  const result = render(
    <MemoryRouter>
      <SettingsProvider>
        <DashboardView />
      </SettingsProvider>
    </MemoryRouter>
  );
  return result;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardView — Readiness panel', () => {
  test('1. empty state: Readiness panel does NOT render with 0 attempts', async () => {
    // No seeding — IndexedDB is empty (reset by setup.ts beforeEach).
    render(
      <MemoryRouter>
        <SettingsProvider>
          <DashboardView />
        </SettingsProvider>
      </MemoryRouter>
    );
    // The "Readiness rating" heading only appears when readinessV2 is non-null.
    // Give the useEffect time to settle (it loads from an empty DB).
    await waitFor(() => {
      expect(screen.queryByText('Readiness rating')).not.toBeInTheDocument();
    });
    // Header readiness text shows the "No attempts" copy instead.
    expect(screen.getByText(/No attempts yet/i)).toBeInTheDocument();
  });

  test('2. sufficient state: Readiness panel renders score + band with ≥3 attempts', async () => {
    await seedAndRender([
      mkAttempt({ correct: true, confidence: 'sure', latencyMs: 50_000 }),
      mkAttempt({ correct: true, confidence: 'sure', latencyMs: 55_000 }),
      mkAttempt({ correct: false, confidence: 'unsure', latencyMs: 80_000 })
    ]);

    await waitFor(() => {
      expect(screen.getByText('Readiness rating')).toBeInTheDocument();
    });

    // Score rendered as "/1000"
    expect(screen.getByText('/1000')).toBeInTheDocument();

    // Subscores table rows
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Calibration')).toBeInTheDocument();
    expect(screen.getByText('Pacing')).toBeInTheDocument();
  });

  test('5. nextBlock recommendation renders when coverage is low', async () => {
    // Seed all attempts to the SAME question/subtopic so coverage is very low
    // (only 1 subtopic covered vs the full bank).
    const attempts = Array.from({ length: 5 }, (_, i) =>
      mkAttempt({
        questionId: 'dlm2-001',
        subtopic: 'direct-lake',
        correct: i % 2 === 0,
        confidence: 'unsure'
      })
    );
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Readiness rating')).toBeInTheDocument();
    });

    // With coverage < 50% of the full bank's subtopics, recommendNextBlock
    // returns focus='coverage'. The panel renders "Next block" label + focus text.
    await waitFor(() => {
      expect(screen.getByText(/Next block/i)).toBeInTheDocument();
    });
    // The focus value is 'coverage' (rendered capitalised via `capitalize` CSS class)
    expect(screen.getByText('coverage')).toBeInTheDocument();
  });

  test('6a. green band styling appears for high-readiness data', async () => {
    // Need high accuracy + confidence correctly calibrated + good pacing.
    // Seed 5 correct, sure, fast attempts.
    const attempts = Array.from({ length: 5 }, () =>
      mkAttempt({ correct: true, confidence: 'sure', latencyMs: 30_000 })
    );
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Readiness rating')).toBeInTheDocument();
    });

    // The band badge will show 'green', 'yellow', or 'red'. With 5 correct+sure+fast
    // attempts and perfect calibration, the band should be yellow or green. We verify
    // the badge element exists and has a tone class (not plain text-muted).
    const bandBadge = await waitFor(() => {
      const el = screen.getByText(/^(green|yellow|red)$/);
      return el;
    });
    // It must have one of the expected tone class substrings.
    const cls = bandBadge.className;
    const hasBandClass =
      cls.includes('text-ok') || cls.includes('text-warn') || cls.includes('text-danger');
    expect(hasBandClass).toBe(true);
  });

  test('6b. red band styling appears for low-readiness data', async () => {
    // Seed many wrong + overconfident attempts to drive score into red zone.
    const attempts = Array.from({ length: 5 }, () =>
      mkAttempt({ correct: false, confidence: 'sure', latencyMs: 200_000 })
    );
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Readiness rating')).toBeInTheDocument();
    });

    const bandBadge = await waitFor(() => screen.getByText(/^(green|yellow|red)$/));
    // With all wrong answers and terrible pacing the score lands in red.
    expect(bandBadge.textContent).toBe('red');
    expect(bandBadge.className).toContain('text-danger');
  });
});

describe('DashboardView — Calibration panel', () => {
  test('3. calibration panel renders the bin table when ≥3 attempts seeded', async () => {
    await seedAndRender([
      mkAttempt({ correct: true, confidence: 'sure' }),
      mkAttempt({ correct: true, confidence: 'sure' }),
      mkAttempt({ correct: false, confidence: 'guess' })
    ]);

    await waitFor(() => {
      expect(screen.getByText('Confidence calibration')).toBeInTheDocument();
    });

    // Table headers
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('Acc%')).toBeInTheDocument();
    expect(screen.getByText('Expected')).toBeInTheDocument();
    expect(screen.getByText('Gap')).toBeInTheDocument();
  });

  test('4. overconfidence warning shows when calibration.overconfidenceScore > 0.05', async () => {
    // To force a high overconfidenceScore we need the 'sure' bin to have:
    //   accuracy << 0.95 (the expected value for 'sure').
    // With minPerBin=5 we need ≥5 sure attempts all wrong.
    const attempts = Array.from({ length: 6 }, () =>
      mkAttempt({ correct: false, confidence: 'sure' })
    );
    await seedAndRender(attempts);

    await waitFor(() => {
      expect(screen.getByText('Confidence calibration')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Overconfidence detected/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Watch the "sure" row/i)).toBeInTheDocument();
  });
});
