/**
 * Cockpit engine + presets — pure unit tests.
 * No React rendering; vitest / jsdom environment.
 */

import { describe, expect, test, vi, afterEach } from 'vitest';
import { COCKPIT_PRESETS, getRecommendedPreset } from '../src/data/cockpit/presets';
import { timeRemainingToExam, startPreset } from '../src/features/cockpit/engine';
import type { Attempt, Question } from '../src/lib/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

function mkQ(id: string): Question {
  return {
    id,
    type: 'single',
    domain: 'semantic',
    subtopic: 'direct-lake',
    difficulty: 2,
    prompt: id,
    options: [
      { id: 'A', text: 'a' },
      { id: 'B', text: 'b' },
    ],
    correctOptionIds: ['A'],
    explanation: '',
    sourceAnchor: { category: 'x', note: 'y' },
    tags: [],
  };
}

const EMPTY_ATTEMPTS: Attempt[] = [];
const SMALL_BANK: Question[] = Array.from({ length: 10 }, (_, i) => mkQ(`q${i}`));

// ─── Preset count ─────────────────────────────────────────────────────────────

describe('COCKPIT_PRESETS', () => {
  test('exports exactly 3 presets', () => {
    expect(COCKPIT_PRESETS).toHaveLength(3);
  });

  test('all preset ids are unique and non-empty', () => {
    const ids = COCKPIT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
    ids.forEach((id) => expect(id.length).toBeGreaterThan(0));
  });

  test('all presets have positive durationMinutes', () => {
    COCKPIT_PRESETS.forEach((p) => {
      expect(p.durationMinutes).toBeGreaterThan(0);
    });
  });
});

// ─── getRecommendedPreset boundaries ─────────────────────────────────────────

describe('getRecommendedPreset', () => {
  test('> 24 h out → final-trap-sweep', () => {
    const preset = getRecommendedPreset(new Date(), hoursFromNow(48));
    expect(preset.id).toBe('final-trap-sweep');
  });

  test('exactly 72 h out → final-trap-sweep', () => {
    const preset = getRecommendedPreset(new Date(), hoursFromNow(72));
    expect(preset.id).toBe('final-trap-sweep');
  });

  test('24 h exactly → confidence-reset (boundary: >1 h and ≤24 h)', () => {
    // 24 h is NOT > 24, so falls into the 1–24 h band
    const preset = getRecommendedPreset(new Date(), hoursFromNow(24));
    expect(preset.id).toBe('confidence-reset');
  });

  test('12 h out → confidence-reset', () => {
    const preset = getRecommendedPreset(new Date(), hoursFromNow(12));
    expect(preset.id).toBe('confidence-reset');
  });

  test('1 h out → last-hour-mode', () => {
    // 1 h is NOT > 1, falls to last-hour-mode
    const preset = getRecommendedPreset(new Date(), hoursFromNow(1));
    expect(preset.id).toBe('last-hour-mode');
  });

  test('past exam date → last-hour-mode (graceful fallback)', () => {
    const preset = getRecommendedPreset(new Date(), hoursFromNow(-1));
    expect(preset.id).toBe('last-hour-mode');
  });
});

// ─── timeRemainingToExam bands ────────────────────────────────────────────────

describe('timeRemainingToExam', () => {
  test('past date → isPast=true, band=past', () => {
    const tr = timeRemainingToExam(hoursFromNow(-5));
    expect(tr.isPast).toBe(true);
    expect(tr.band).toBe('past');
    expect(tr.hours).toBe(0);
    expect(tr.minutes).toBe(0);
  });

  test('73 h remaining → band=plenty', () => {
    const tr = timeRemainingToExam(hoursFromNow(73));
    expect(tr.band).toBe('plenty');
    expect(tr.isPast).toBe(false);
    expect(tr.hours).toBeGreaterThan(70);
  });

  test('48 h remaining → band=last72h', () => {
    const tr = timeRemainingToExam(hoursFromNow(48));
    expect(tr.band).toBe('last72h');
    expect(tr.hours).toBeGreaterThanOrEqual(47); // allow 1-min drift
    expect(tr.hours).toBeLessThanOrEqual(48);
  });

  test('12 h remaining → band=last24h', () => {
    const tr = timeRemainingToExam(hoursFromNow(12));
    expect(tr.band).toBe('last24h');
  });

  test('30 min remaining → band=last-hour', () => {
    const tr = timeRemainingToExam(new Date(Date.now() + 30 * 60 * 1000));
    expect(tr.band).toBe('last-hour');
    expect(tr.hours).toBe(0);
    expect(tr.minutes).toBeGreaterThanOrEqual(29); // 1-min drift tolerance
  });

  test('minutes field is correct for 2h 45m remaining', () => {
    const tr = timeRemainingToExam(new Date(Date.now() + (2 * 60 + 45) * 60 * 1000));
    expect(tr.hours).toBe(2);
    expect(tr.minutes).toBeGreaterThanOrEqual(44);
    expect(tr.minutes).toBeLessThanOrEqual(45);
  });
});

// ─── startPreset URL construction ─────────────────────────────────────────────

describe('startPreset', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('remediation preset navigates to /quiz with mode=remediation and size', () => {
    const navigated: string[] = [];
    const remPreset = COCKPIT_PRESETS.find((p) => p.id === 'final-trap-sweep')!;
    startPreset(remPreset, SMALL_BANK, EMPTY_ATTEMPTS, (path) => navigated.push(path));

    expect(navigated).toHaveLength(1);
    expect(navigated[0]).toMatch(/^\/quiz\?/);
    const params = new URLSearchParams(navigated[0].split('?')[1]);
    expect(params.get('mode')).toBe('remediation');
    expect(params.get('size')).toBe('25');
    expect(params.get('preset')).toBe('final-trap-sweep');
  });

  test('mixed-quiz preset (confidence-reset) navigates to /quiz with deck and fcCount', () => {
    const navigated: string[] = [];
    const preset = COCKPIT_PRESETS.find((p) => p.id === 'confidence-reset')!;
    startPreset(preset, SMALL_BANK, EMPTY_ATTEMPTS, (path) => navigated.push(path));

    expect(navigated).toHaveLength(1);
    expect(navigated[0]).toMatch(/^\/quiz\?/);
    const params = new URLSearchParams(navigated[0].split('?')[1]);
    expect(params.get('preset')).toBe('confidence-reset');
    expect(params.get('deck')).toBe('exam-traps');
    expect(params.get('fcCount')).toBe('10');
    expect(params.get('size')).toBe('5');
  });

  test('mixed-quiz preset (last-hour-mode) includes subtopic and endWithReference', () => {
    const navigated: string[] = [];
    const preset = COCKPIT_PRESETS.find((p) => p.id === 'last-hour-mode')!;
    startPreset(preset, SMALL_BANK, EMPTY_ATTEMPTS, (path) => navigated.push(path));

    const params = new URLSearchParams(navigated[0].split('?')[1]);
    expect(params.get('subtopic')).toBe('exam-traps');
    expect(params.get('endWithReference')).toBe('1');
    expect(params.get('size')).toBe('10');
  });

  test('navigate is called exactly once per startPreset invocation', () => {
    const calls: string[] = [];
    const preset = COCKPIT_PRESETS[0];
    startPreset(preset, SMALL_BANK, EMPTY_ATTEMPTS, (path) => calls.push(path));
    expect(calls).toHaveLength(1);
  });
});
