// Nightly study-reminder banner.
//
// Surfaces a top-of-page nudge when the exam is ≤14 days away AND the user
// has accumulated study debt (no completed sim in 3+ days, or no logged
// practice in 2+ days). Dismissible — dismissal lives in localStorage and
// auto-clears after 12h so the reminder returns the next morning.
//
// The decision logic lives in `./study-reminder.ts` (pure function); this
// file is a thin React shell that wires up the data sources and renders
// the result. Visual style follows the RetentionPanel `panel border-warn`
// pattern so it sits naturally above the dashboard.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../app/providers/SettingsProvider';
import { listAttempts, listSessions } from '../lib/storage/db';
import type { Attempt, Session } from '../lib/schema';
import {
  DISMISS_TTL_MS,
  getStudyReminderState,
  type StudyReminderState,
} from './study-reminder';

const STORAGE_KEY = 'stark-v2:study-reminder-dismissed-at';

export function StudyReminderBanner() {
  const { settings } = useSettings();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(() =>
    readDismissedAt()
  );

  // Pull sessions + attempts on mount. We don't poll — the banner is a
  // page-load surface, not a live counter.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([listSessions(200), listAttempts()]).then(([s, a]) => {
      if (cancelled) return;
      setSessions(s);
      setAttempts(a);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-clear stale dismissals so the banner returns the next morning.
  useEffect(() => {
    if (dismissedAt === null) return;
    if (Date.now() - dismissedAt < DISMISS_TTL_MS) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop — quota / privacy mode */
    }
    setDismissedAt(null);
  }, [dismissedAt]);

  if (!settings || sessions === null || attempts === null) return null;

  const state: StudyReminderState | null = getStudyReminderState({
    examDateIso: settings.examDateIso,
    sessions,
    attempts,
    now: Date.now(),
    dismissedAt,
  });

  if (!state) return null;

  const handleDismiss = () => {
    const ts = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(ts));
    } catch {
      /* noop */
    }
    setDismissedAt(ts);
  };

  return (
    <section
      role="status"
      aria-live="polite"
      data-testid="study-reminder-banner"
      className="panel border-warn"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold">Study reminder</h2>
          <p className="mt-1 text-sm text-muted">{state.message}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={state.ctaHref}
            className="btn btn-primary"
            data-testid="study-reminder-cta"
          >
            {state.ctaLabel}
          </Link>
          <button
            type="button"
            className="btn"
            onClick={handleDismiss}
            data-testid="study-reminder-dismiss"
            aria-label="Dismiss study reminder"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}

function readDismissedAt(): number | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
