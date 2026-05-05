/**
 * Last72HoursView — /cockpit route
 *
 * Layout:
 *  1. Countdown banner (reads examDate from Settings → localStorage fallback → date picker)
 *  2. Three preset cards (responsive grid)
 *  3. Three discipline reminders (small inline panels)
 *  4. Trap sheet link → /reference?focus=traps
 *
 * Styling uses only existing CSS classes from globals.css — no new globals added.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../../app/providers/SettingsProvider';
import { COCKPIT_PRESETS, getRecommendedPreset } from '../../data/cockpit/presets';
import type { CockpitPreset } from '../../data/cockpit/presets';
import { timeRemainingToExam, startPreset } from './engine';
import { questionBank } from '../../data/questions';
import { listAttempts } from '../../lib/storage/db';
import type { Attempt } from '../../lib/schema';

const LS_EXAM_KEY = 'dp600.examDate';

const DISCIPLINE_REMINDERS = [
  {
    id: 'no-new-material',
    heading: "Don't change study material in the last 24h",
    body: 'Anchoring to familiar content outperforms last-minute cramming. Stick to what you know.',
  },
  {
    id: 'least-overhead',
    heading: 'Pick the option with the least operational overhead',
    body: 'Microsoft exam questions almost always favour the managed, automated, or integrated path over bespoke solutions.',
  },
  {
    id: 'never-blank',
    heading: 'Never leave a question blank',
    body: 'There is no penalty for wrong answers. A calibrated guess beats an empty slot every time.',
  },
] as const;

// ─── Sub-components ──────────────────────────────────────────────────────────

function CountdownBanner({
  examDate,
  onDateChange,
}: {
  examDate: Date | null;
  onDateChange: (iso: string) => void;
}) {
  const tr = examDate ? timeRemainingToExam(examDate) : null;

  const bandLabel: Record<string, string> = {
    plenty: 'Plenty of time',
    last72h: 'Last 72 hours',
    last24h: 'Last 24 hours',
    'last-hour': 'Final hour',
    past: 'Exam date passed',
  };

  const bandColor: Record<string, string> = {
    plenty: 'text-green',
    last72h: 'text-cyan',
    last24h: 'text-amber',
    'last-hour': 'text-red',
    past: 'text-muted',
  };

  return (
    <header className="panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Last 72 Hours Cockpit</h1>
          {tr && !tr.isPast ? (
            <p className={`mt-1 text-sm ${bandColor[tr.band] ?? 'text-muted'}`}>
              <span className="font-semibold">
                {tr.hours}h {tr.minutes}m
              </span>{' '}
              to exam ·{' '}
              <span className="text-faint">{bandLabel[tr.band]}</span>
            </p>
          ) : tr?.isPast ? (
            <p className="mt-1 text-sm text-muted">Exam date has passed.</p>
          ) : (
            <p className="mt-1 text-sm text-faint">Set your exam date to enable the countdown.</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cockpit-exam-date" className="text-xs text-faint">
            Exam date
          </label>
          <input
            id="cockpit-exam-date"
            type="date"
            className="input w-44"
            value={examDate ? examDate.toISOString().slice(0, 10) : ''}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
      </div>
    </header>
  );
}

function PresetCard({
  preset,
  isRecommended,
  onStart,
}: {
  preset: CockpitPreset;
  isRecommended: boolean;
  onStart: (preset: CockpitPreset) => void;
}) {
  return (
    <div
      className={`panel flex flex-col gap-3 ${
        isRecommended ? 'border-primary/50 bg-primary/5' : ''
      }`}
    >
      {isRecommended && (
        <span className="badge badge-info self-start text-[10px] uppercase tracking-wide">
          Recommended now
        </span>
      )}
      <div>
        <h2 className="font-display text-lg font-bold">{preset.name}</h2>
        <p className="mt-1 text-xs text-faint uppercase tracking-wide">{preset.blockTitle}</p>
      </div>
      <p className="flex-1 text-sm text-muted">{preset.description}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-faint">{preset.durationMinutes} min</span>
        <span className="text-xs text-faint italic">{preset.whenToRun}</span>
      </div>
      <button className="btn btn-primary mt-1 w-full" onClick={() => onStart(preset)}>
        Start
      </button>
    </div>
  );
}

function DisciplineReminders() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">
        Exam Discipline
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {DISCIPLINE_REMINDERS.map((r) => (
          <div key={r.id} className="panel-tight flex flex-col gap-1">
            <p className="text-sm font-semibold text-text">{r.heading}</p>
            <p className="text-xs text-muted">{r.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function Last72HoursView() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [localExamDateIso, setLocalExamDateIso] = useState<string | null>(null);

  // Load attempts for startPreset
  useEffect(() => {
    void listAttempts().then(setAttempts);
  }, []);

  // Resolve exam date: Settings (from SettingsProvider / IndexedDB) takes priority,
  // then localStorage fallback, then null (shows the date picker).
  const examDateIso: string | null =
    settings?.examDateIso ??
    localExamDateIso ??
    localStorage.getItem(LS_EXAM_KEY);

  const examDate: Date | null = useMemo(() => {
    if (!examDateIso) return null;
    const d = new Date(examDateIso);
    return isNaN(d.getTime()) ? null : d;
  }, [examDateIso]);

  const recommendedPreset: CockpitPreset | null = examDate
    ? getRecommendedPreset(new Date(), examDate)
    : null;

  function handleDateChange(iso: string) {
    setLocalExamDateIso(iso);
    try {
      localStorage.setItem(LS_EXAM_KEY, iso);
    } catch {
      // localStorage may be blocked in some contexts — silently ignore
    }
  }

  function handleStart(preset: CockpitPreset) {
    startPreset(preset, questionBank, attempts, (path) => navigate(path));
  }

  return (
    <div className="flex flex-col gap-6">
      <CountdownBanner examDate={examDate} onDateChange={handleDateChange} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">
          Study Presets
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {COCKPIT_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isRecommended={recommendedPreset?.id === preset.id}
              onStart={handleStart}
            />
          ))}
        </div>
      </section>

      <DisciplineReminders />

      <footer className="panel-tight flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-text">Exam Trap Reference Sheet</p>
          <p className="text-xs text-muted">Quick-scan the highest-frequency traps before you walk in.</p>
        </div>
        <Link to="/reference?focus=traps" className="btn btn-primary shrink-0">
          Open trap sheet →
        </Link>
      </footer>
    </div>
  );
}
