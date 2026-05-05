/**
 * Cockpit engine helpers.
 *
 * Pure functions — no React, no side-effects beyond the `navigate` callback
 * passed in by the caller. This keeps the unit tests simple and fast.
 */

import type { Attempt, Question } from '../../lib/schema';
import type { CockpitPreset } from '../../data/cockpit/presets';

// ─── Time helpers ────────────────────────────────────────────────────────────

export type ExamBand = 'plenty' | 'last72h' | 'last24h' | 'last-hour' | 'past';

export interface TimeRemaining {
  hours: number;
  minutes: number;
  isPast: boolean;
  band: ExamBand;
}

/**
 * Returns a structured time-remaining breakdown and the named band that
 * should control which UI / recommendations the cockpit surfaces.
 *
 * Bands:
 *  > 72 h  → 'plenty'    (cockpit is advisory, not critical)
 *  24–72 h → 'last72h'   (cockpit active, Final Trap Sweep recommended)
 *  1–24 h  → 'last24h'   (Confidence Reset recommended)
 *  0–1 h   → 'last-hour' (Last Hour Mode, no new material)
 *  < 0     → 'past'      (exam date passed)
 */
export function timeRemainingToExam(examDate: Date): TimeRemaining {
  const nowMs = Date.now();
  const diffMs = examDate.getTime() - nowMs;

  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, isPast: true, band: 'past' };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let band: ExamBand;
  if (hours > 72) {
    band = 'plenty';
  } else if (hours > 24) {
    band = 'last72h';
  } else if (hours > 1 || (hours === 1 && minutes > 0)) {
    band = 'last24h';
  } else {
    band = 'last-hour';
  }

  return { hours, minutes, isPast: false, band };
}

// ─── Preset launcher ─────────────────────────────────────────────────────────

/**
 * Wires a cockpit preset to the correct quiz/flashcard/remediation route.
 *
 * The QuizView already reads URL params for filters, so we encode all
 * preset config as query params and navigate. This keeps the cockpit
 * decoupled from the quiz internals — no direct `startSession` call here.
 *
 * `bank` and `attempts` are accepted for future use (e.g., pre-validating
 * that the bank is large enough for the requested size before navigating).
 *
 * URL contract:
 *  - remediation  → /quiz?mode=remediation&size=N&preset=<id>
 *  - mixed-quiz   → /quiz?preset=<id>&size=N[&deck=D][&subtopic=S]
 *  - flashcards   → /flashcards?deck=D&preset=<id>
 *  - simulation   → /simulation?preset=<id>
 */
export function startPreset(
  preset: CockpitPreset,
  _bank: Question[],
  _attempts: Attempt[],
  navigate: (path: string) => void,
): void {
  const params = new URLSearchParams({ preset: preset.id });

  switch (preset.mode) {
    case 'remediation': {
      const size = typeof preset.config.size === 'number' ? preset.config.size : 25;
      params.set('mode', 'remediation');
      params.set('size', String(size));
      navigate(`/quiz?${params.toString()}`);
      break;
    }

    case 'mixed-quiz': {
      const quizSize =
        typeof preset.config.quizSize === 'number' ? preset.config.quizSize : 10;
      params.set('size', String(quizSize));

      if (typeof preset.config.subtopicFilter === 'string') {
        params.set('subtopic', preset.config.subtopicFilter);
      }
      if (preset.config.endWithReference === true) {
        params.set('endWithReference', '1');
      }
      // Flashcard prefix for mixed-quiz presets that include a deck
      if (typeof preset.config.flashcardDeck === 'string') {
        params.set('deck', preset.config.flashcardDeck);
        const fcCount =
          typeof preset.config.flashcardCount === 'number'
            ? preset.config.flashcardCount
            : 10;
        params.set('fcCount', String(fcCount));
      }
      navigate(`/quiz?${params.toString()}`);
      break;
    }

    case 'flashcards': {
      if (typeof preset.config.deck === 'string') {
        params.set('deck', preset.config.deck);
      }
      navigate(`/flashcards?${params.toString()}`);
      break;
    }

    case 'simulation': {
      navigate(`/simulation?${params.toString()}`);
      break;
    }

    default: {
      // Exhaustiveness guard — TypeScript will surface this if a new mode is added
      const _exhaustive: never = preset.mode;
      navigate(`/quiz?${params.toString()}`);
      // Suppress the unused-variable warning in the guard
      void _exhaustive;
    }
  }
}
