/**
 * Cockpit presets — deterministic study blocks for the last 72 hours
 * before the DP-600 exam.
 *
 * Each preset maps to a mode the QuizView can handle via URL params.
 * The `config` field carries mode-specific hints that `startPreset()`
 * in `src/features/cockpit/engine.ts` encodes into query params.
 */

export interface CockpitPreset {
  id: string;
  name: string;
  description: string;
  blockTitle: string;
  durationMinutes: number;
  mode: 'remediation' | 'simulation' | 'flashcards' | 'mixed-quiz';
  config: Record<string, unknown>; // mode-specific config
  whenToRun: string; // human-readable guidance
}

// ─── Three exam-countdown presets ───────────────────────────────────────────

/**
 * Preset 1 — "Final Trap Sweep"
 * 25 remediation Qs from the bottom-3 weakest subtopics.
 * Run it 72 h out when you still have time to repair a weak spot.
 */
const finalTrapSweep: CockpitPreset = {
  id: 'final-trap-sweep',
  name: 'Final Trap Sweep',
  description:
    '25 questions targeted at your three weakest subtopics. Exposes confident-wrong patterns before they cost you on exam day.',
  blockTitle: 'Weak-Spot Remediation · 25 Q',
  durationMinutes: 30,
  mode: 'remediation',
  config: {
    size: 25,
    topWeakSubtopics: 3,
  },
  whenToRun: '72 hours before the exam — while there is still time to close a gap',
};

/**
 * Preset 2 — "Confidence Reset"
 * 10 flashcards from the high-confusion deck + 5 mixed quiz questions.
 * Deliberately short so it fits in any 15-minute window.
 */
const confidenceReset: CockpitPreset = {
  id: 'confidence-reset',
  name: 'Confidence Reset',
  description:
    '10 flashcards from the exam-traps deck, followed by 5 mixed questions. Resets anchoring bias and rebuilds pattern recognition.',
  blockTitle: 'Flashcards + Quick Quiz · 15 min',
  durationMinutes: 15,
  mode: 'mixed-quiz',
  config: {
    flashcardDeck: 'exam-traps',
    flashcardCount: 10,
    quizSize: 5,
  },
  whenToRun: '24–48 hours before the exam — morning or afternoon session',
};

/**
 * Preset 3 — "Last Hour Mode"
 * 10 quick questions from exam-traps subtopics only, then reference review.
 * No new material. Zero surprises.
 */
const lastHourMode: CockpitPreset = {
  id: 'last-hour-mode',
  name: 'Last Hour Mode',
  description:
    '10 questions exclusively from exam-trap subtopics, then a reference sheet review. No new material — only reinforcement.',
  blockTitle: 'Trap Q + Reference · 20 min',
  durationMinutes: 20,
  mode: 'mixed-quiz',
  config: {
    subtopicFilter: 'exam-traps',
    quizSize: 10,
    endWithReference: true,
  },
  whenToRun: 'Final hour before the exam — last touch, low stakes',
};

export const COCKPIT_PRESETS: CockpitPreset[] = [
  finalTrapSweep,
  confidenceReset,
  lastHourMode,
];

// ─── Deterministic preset selector ──────────────────────────────────────────

/**
 * Returns the one preset that best matches where in the 72-hour window
 * the user currently sits. Logic is strictly deterministic — same inputs,
 * same output — so the cockpit banner always shows a single clear action.
 *
 * Bands:
 *  > 24 h remaining  → Final Trap Sweep (most time, biggest intervention)
 *  1–24 h remaining  → Confidence Reset (limited time, reinforcement)
 *  ≤ 1 h remaining   → Last Hour Mode  (imminent, no new material)
 *  0 h (past)        → Last Hour Mode  (graceful fallback)
 */
export function getRecommendedPreset(now: Date, examDate: Date): CockpitPreset {
  const hoursUntil = (examDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil > 24) return finalTrapSweep;
  if (hoursUntil > 1) return confidenceReset;
  return lastHourMode;
}
