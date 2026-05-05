// SM-2 lite spaced repetition.
// Quality grades: 0 = "again" (forgot), 3 = "hard", 4 = "good", 5 = "easy".
// Standard SM-2 ease-factor update; minimum ease 1.3.

import type { SrsState } from '../schema';
import { clamp } from '../utils/arr';

export type Grade = 0 | 3 | 4 | 5;

export const MIN_EASE = 1.3;
export const INITIAL_EASE = 2.5;
export const DAY_MS = 86_400_000;

export function initialSrs(cardId: string, now = Date.now()): SrsState {
  return {
    cardId,
    ease: INITIAL_EASE,
    interval: 0,
    reps: 0,
    due: now,
    lastSeen: 0,
    lapses: 0
  };
}

export function review(state: SrsState, grade: Grade, now = Date.now()): SrsState {
  let { ease, interval, reps, lapses } = state;
  if (grade === 0) {
    // forgot — reset reps, schedule for ~10 minutes from now, log lapse
    reps = 0;
    interval = 0;
    lapses += 1;
    ease = clamp(ease - 0.2, MIN_EASE, 3.0);
    return { ...state, ease, interval, reps, lapses, lastSeen: now, due: now + 10 * 60_000 };
  }

  reps += 1;
  if (reps === 1) interval = 1;
  else if (reps === 2) interval = 6;
  else interval = Math.round(interval * ease);

  ease = clamp(ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)), MIN_EASE, 3.0);

  return {
    ...state,
    ease,
    interval,
    reps,
    lapses,
    lastSeen: now,
    due: now + interval * DAY_MS
  };
}
