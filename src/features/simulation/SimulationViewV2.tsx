// Exam Realism v2 — full 65 Q / 100 min simulation experience.
//
// Differences from the legacy SimulationView:
//   • Driven by SimRealismConfig (DP600_REALISM or DP600_QUICK based on settings)
//   • No per-question feedback until end-of-sim
//   • Top bar: Q N/65, elapsed, countdown — no score hints
//   • Pause is disabled; Abort produces a partial SimSummary
//   • Auto-submit at time expiry (unanswered marked wrong in summary)
//   • End screen: SimSummary + ReadinessRating band + subtopic miss table
//
// This component does NOT modify App.tsx or Layout.tsx — wiring is done separately.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { questionBank, questionById } from '../../data/questions';
import { getActiveSimulation, saveSession } from '../../lib/storage/db';
import {
  recordAnswer,
  setCursor as setCursorEngine,
  submitSimulation,
  toggleFlag
} from './engine';
import type { Confidence, Session } from '../../lib/schema';
import { QuestionPlayer } from '../../components/QuestionPlayer';
import { formatMs } from '../../lib/utils/time';
import { useToast } from '../../app/providers/ToastProvider';
import { useSettings } from '../../app/providers/SettingsProvider';
import {
  buildSimSet,
  DP600_QUICK,
  DP600_REALISM,
  summarizeSim,
  type SimRealismConfig,
  type SimSummary
} from './realism';
import { uid } from '../../lib/utils/id';
import type { ReadinessRating } from '../analytics/readiness';

/* ─── Audio cue (same pattern as legacy SimulationView) ──────────── */

const FINAL_MINUTE_CUE_MS = 60_000;

/** Two short 880 Hz beeps. Fails silently if AudioContext is gated. */
function playFinalMinuteBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beep = (when: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + when);
      o.stop(ctx.currentTime + when + 0.2);
    };
    beep(0);
    beep(0.3);
    setTimeout(() => void ctx.close(), 800);
  } catch {
    /* AudioContext unavailable / suspended */
  }
}

/* ─── Helper: resolve config from settings ───────────────────────── */

function resolveConfig(mode: string | undefined): SimRealismConfig {
  if (mode === 'dp600-quick') return DP600_QUICK;
  return DP600_REALISM; // default: full exam
}

/* ─── Root component ─────────────────────────────────────────────── */

type BootState = 'init' | 'idle' | 'running' | 'done';

export function SimulationViewV2() {
  const [session, setSession] = useState<Session | null>(null);
  const [boot, setBoot] = useState<BootState>('init');
  const [summary, setSummary] = useState<SimSummary | null>(null);
  const tickRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const cueFiredRef = useRef(false);
  const { push } = useToast();
  const { settings } = useSettings();

  const config = useMemo(() => resolveConfig(settings?.simRealismMode), [settings?.simRealismMode]);
  const totalMs = config.timeMinutes * 60_000;

  useEffect(() => {
    void getActiveSimulation().then((existing) => {
      if (existing) {
        setSession(existing);
        setBoot('running');
      } else {
        setBoot('idle');
      }
    });
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  // Countdown tick — persists snapshot every 10 s
  useEffect(() => {
    if (boot !== 'running' || !session) return;
    let last = Date.now();
    let writeAccum = 0;
    cueFiredRef.current = (session.snapshot?.timeRemainingMs ?? totalMs) <= FINAL_MINUTE_CUE_MS;

    tickRef.current = window.setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      writeAccum += dt;

      let snapshotForSubmit: Session | null = null;
      let crossedFinalMinute = false;

      setSession((cur) => {
        if (!cur || !cur.snapshot || cur.snapshot.submitted) return cur;
        const prev = cur.snapshot.timeRemainingMs;
        const remaining = Math.max(0, prev - dt);
        const next = { ...cur, snapshot: { ...cur.snapshot, timeRemainingMs: remaining } };
        if (writeAccum >= 10_000) {
          writeAccum = 0;
          void saveSession(next);
        }
        if (!cueFiredRef.current && prev > FINAL_MINUTE_CUE_MS && remaining <= FINAL_MINUTE_CUE_MS) {
          cueFiredRef.current = true;
          crossedFinalMinute = true;
        }
        if (remaining <= 0 && !submittingRef.current) {
          submittingRef.current = true;
          snapshotForSubmit = next;
        }
        return next;
      });

      if (crossedFinalMinute) {
        push('1 minute remaining — your answers are auto-saved.', 'warn');
        if (settings?.beepOnFinalMinute !== false) playFinalMinuteBeep();
      }
      if (snapshotForSubmit) void doSubmit(snapshotForSubmit);
    }, 1000);

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [boot, session?.id, push, settings?.beepOnFinalMinute, totalMs]);

  async function startNew() {
    if (questionBank.length < config.totalQuestions) {
      push(
        `Need ≥${config.totalQuestions} questions; bank has ${questionBank.length}. Add more content first.`,
        'warn'
      );
      return;
    }
    const ids = buildSimSet(questionBank, config, { seed: Date.now() & 0xffffffff });
    const s: Session = {
      id: uid('simv2'),
      mode: 'simulation',
      startedAt: Date.now(),
      questionIds: ids.map((q) => q.id),
      snapshot: {
        timeRemainingMs: totalMs,
        answers: {},
        submitted: false,
        flagged: [],
        cursor: 0
      }
    };
    await saveSession(s);
    setSession(s);
    setBoot('running');
  }

  async function doSubmit(s: Session) {
    if (!s || s.snapshot?.submitted) return;
    submittingRef.current = true;
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const out = await submitSimulation(s, questionBank);
    const simSummary = summarizeSim(
      out.attempts,
      out.session.questionIds.map((id) => questionById(id)!).filter(Boolean),
      out.session.snapshot?.flagged ?? []
    );
    setSession(out.session);
    setSummary(simSummary);
    setBoot('done');
  }

  async function doAbort() {
    if (!session) return;
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    // Partial submit — whatever was answered gets graded
    await doSubmit(session);
  }

  if (boot === 'init') return <div className="panel">Loading…</div>;
  if (boot === 'idle') {
    return (
      <SimIntro
        config={config}
        bankSize={questionBank.length}
        onStart={startNew}
      />
    );
  }
  if (boot === 'done' && summary && session) {
    return <SimResultV2 session={session} summary={summary} />;
  }
  if (boot === 'running' && session) {
    return (
      <SimRunnerV2
        session={session}
        setSession={setSession}
        config={config}
        onSubmit={() => void doSubmit(session)}
        onAbort={() => void doAbort()}
      />
    );
  }
  return <div className="panel">…</div>;
}

/* ─── Intro screen ────────────────────────────────────────────────── */

function SimIntro({
  config,
  bankSize,
  onStart
}: {
  config: SimRealismConfig;
  bankSize: number;
  onStart: () => void;
}) {
  const isQuick = config.totalQuestions <= 30;
  return (
    <section className="panel flex flex-col gap-3">
      <h1 className="text-2xl font-bold">
        {isQuick ? 'Quick Simulation (Daily Rep)' : 'Full Exam Simulation — DP-600 Realism v2'}
      </h1>
      <p className="text-muted">
        {config.totalQuestions} questions &middot; {config.timeMinutes} minutes &middot; no
        per-question feedback until you submit.
      </p>
      <ul className="ml-5 list-disc text-sm text-muted">
        <li>Blueprint-weighted: Prepare {Math.round(config.blueprint.prepare * 100)}% / Maintain {Math.round(config.blueprint.maintain * 100)}% / Semantic {Math.round(config.blueprint.semantic * 100)}%.</li>
        <li>Refresh-safe — cursor, answers, and remaining time saved every 10 seconds.</li>
        <li>Flag questions to revisit before submission.</li>
        <li>Pause is disabled (exam realism). Use Abort to end early and see a partial summary.</li>
      </ul>
      <div>
        <button className="btn btn-primary" onClick={onStart}>
          Begin simulation ({bankSize} in bank)
        </button>
      </div>
    </section>
  );
}

/* ─── Runner ──────────────────────────────────────────────────────── */

function SimRunnerV2({
  session,
  setSession,
  config,
  onSubmit,
  onAbort
}: {
  session: Session;
  setSession: (s: Session) => void;
  config: SimRealismConfig;
  onSubmit: () => void;
  onAbort: () => void;
}) {
  const cursor = session.snapshot?.cursor ?? 0;
  const qid = session.questionIds[cursor];
  const q = questionById(qid);
  const ans = session.snapshot?.answers[qid];
  const timeMs = session.snapshot?.timeRemainingMs ?? config.timeMinutes * 60_000;
  const totalMs = config.timeMinutes * 60_000;
  const flagged = (session.snapshot?.flagged ?? []).includes(qid);
  const answered = useMemo(
    () =>
      Object.values(session.snapshot?.answers ?? {}).filter(
        (a) => a.selectedOptionIds?.length || a.selectedOrder?.length
      ).length,
    [session]
  );
  const inFinalMinute = timeMs > 0 && timeMs <= FINAL_MINUTE_CUE_MS;
  const elapsedMs = totalMs - timeMs;

  function persist(next: Session) {
    setSession(next);
    void saveSession(next);
  }

  function jumpTo(i: number) {
    persist(setCursorEngine(session, i));
  }

  function flag() {
    persist(toggleFlag(session, qid));
  }

  function onAnswerChange(payload: {
    selectedOptionIds?: string[];
    selectedOrder?: string[];
    confidence: Confidence;
  }) {
    persist(recordAnswer(session, qid, payload, timeMs));
  }

  if (!q) return <div className="panel">Loading question…</div>;

  return (
    <div className="flex flex-col gap-3">
      {inFinalMinute && (
        <div role="alert" className="panel border-warn/60 bg-warn/10 text-sm">
          <strong className="font-semibold">Final minute.</strong>{' '}
          Auto-submit at 0:00. Answers are saved as you change them.
        </div>
      )}

      {/* Top bar */}
      <header
        className={`panel flex flex-wrap items-center justify-between gap-3 ${inFinalMinute ? 'border-warn/60' : ''}`}
      >
        <div className="flex gap-6">
          {/* Countdown */}
          <div>
            <div className={`font-display text-2xl font-bold ${inFinalMinute ? 'text-warn' : ''}`}>
              {formatMs(timeMs)}
            </div>
            <div className="text-xs text-muted">remaining</div>
          </div>
          {/* Elapsed */}
          <div>
            <div className="font-display text-lg font-semibold text-faint">{formatMs(elapsedMs)}</div>
            <div className="text-xs text-muted">elapsed</div>
          </div>
          {/* Question position */}
          <div>
            <div className="font-display text-2xl font-bold">
              {cursor + 1}
              <span className="text-base font-normal text-muted"> / {config.totalQuestions}</span>
            </div>
            <div className="text-xs text-muted">
              {answered} answered &middot; {session.snapshot?.flagged?.length ?? 0} flagged
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="btn"
            onClick={() => jumpTo(Math.max(0, cursor - 1))}
            disabled={cursor === 0}
          >
            &larr; Prev
          </button>
          <button
            className="btn"
            onClick={() => jumpTo(Math.min(session.questionIds.length - 1, cursor + 1))}
            disabled={cursor === session.questionIds.length - 1}
          >
            Next &rarr;
          </button>
          {/* Pause is intentionally absent (exam realism) */}
          <button className="btn btn-warn" onClick={onAbort} title="End early — shows partial summary">
            Abort
          </button>
          <button className="btn btn-primary" onClick={onSubmit}>
            Submit exam
          </button>
        </div>
      </header>

      <PaletteV2 session={session} onJump={jumpTo} total={config.totalQuestions} />

      <QuestionPlayer
        question={q}
        index={cursor}
        total={session.questionIds.length}
        value={{
          selectedOptionIds: ans?.selectedOptionIds,
          selectedOrder: ans?.selectedOrder,
          confidence: ans?.confidence
        }}
        flagged={flagged}
        onFlagToggle={flag}
        onChange={onAnswerChange}
        /* No result/reveal — feedback is hidden until end */
      />
    </div>
  );
}

/* ─── Answer palette ──────────────────────────────────────────────── */

function PaletteV2({
  session,
  onJump,
  total
}: {
  session: Session;
  onJump: (i: number) => void;
  total: number;
}) {
  const cursor = session.snapshot?.cursor ?? 0;
  const ids = session.questionIds.slice(0, total);
  return (
    <div className="panel-tight">
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-[repeat(15,minmax(0,1fr))] lg:grid-cols-[repeat(20,minmax(0,1fr))]">
        {ids.map((id, i) => {
          const ans = session.snapshot?.answers[id];
          const answered = ans && (ans.selectedOptionIds?.length || ans.selectedOrder?.length);
          const isFlagged = (session.snapshot?.flagged ?? []).includes(id);
          const cls =
            i === cursor
              ? 'bg-primary/30 border-primary text-text'
              : isFlagged
              ? 'bg-warn/15 border-warn/40 text-warn'
              : answered
              ? 'bg-ok/15 border-ok/40 text-ok'
              : 'bg-surface2 border-border text-muted';
          return (
            <button
              key={id}
              onClick={() => onJump(i)}
              aria-current={i === cursor ? 'true' : undefined}
              className={`h-10 rounded border text-xs sm:h-8 md:h-7 ${cls}`}
              title={`Q${i + 1}${isFlagged ? ' · flagged' : ''}${answered ? ' · answered' : ''}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── End-of-sim result screen ────────────────────────────────────── */

const BAND_STYLE: Record<ReadinessRating['band'], { border: string; bg: string; text: string; label: string }> = {
  green:  { border: 'border-ok/60',   bg: 'bg-ok/10',   text: 'text-ok',   label: 'Exam Ready' },
  yellow: { border: 'border-warn/60', bg: 'bg-warn/10', text: 'text-warn', label: 'Almost There' },
  red:    { border: 'border-err/60',  bg: 'bg-err/10',  text: 'text-err',  label: 'Needs Work' }
};

function SimResultV2({ session, summary }: { session: Session; summary: SimSummary }) {
  const dur = (session.finishedAt ?? Date.now()) - session.startedAt;
  const rating = summary.readinessReport;
  const band = BAND_STYLE[rating.band];
  const pct = Math.round((summary.score / summary.total) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="panel">
        <h1 className="font-display text-2xl font-bold">Simulation complete</h1>
        <p className="text-muted">
          {summary.score} correct &middot; {summary.total - summary.score} wrong &middot;{' '}
          {summary.total - Object.values(summary.correctById).length} unanswered &middot;{' '}
          {Math.round(dur / 60_000)} min used
        </p>
      </header>

      {/* Score + Readiness band */}
      <section className={`panel grid gap-4 md:grid-cols-3 ${band.border} ${band.bg}`}>
        <div>
          <div className="text-xs uppercase text-faint">Score</div>
          <div className={`font-display text-3xl font-bold ${band.text}`}>{pct}%</div>
          <div className="text-xs text-muted">{summary.score} / {summary.total}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-faint">Readiness</div>
          <div className={`font-display text-3xl font-bold ${band.text}`}>{rating.score}/1000</div>
          <div className="text-xs text-muted">{band.label}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-faint">Time used</div>
          <div className="font-display text-3xl font-bold">{formatMs(dur)}</div>
        </div>
      </section>

      {/* Readiness recommendation */}
      <section className={`panel text-sm ${band.border} ${band.bg}`}>
        <p className={`font-semibold ${band.text}`}>{rating.recommendation}</p>
      </section>

      {/* Per-domain breakdown */}
      <section className="panel">
        <h2 className="mb-2 text-lg font-bold">Domain breakdown</h2>
        <div className="grid gap-2">
          {(['prepare', 'maintain', 'semantic'] as const).map((d) => {
            const v = summary.domainBreakdown[d];
            const domPct = v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100);
            return (
              <div key={d} className="flex items-center justify-between text-sm">
                <span className="text-muted capitalize">{d}</span>
                <span>
                  {v.correct}/{v.total} &middot; {domPct}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top subtopic misses */}
      {summary.subtopicMisses.length > 0 && (
        <section className="panel">
          <h2 className="mb-2 text-lg font-bold">Subtopic misses (top {Math.min(10, summary.subtopicMisses.length)})</h2>
          <div className="grid gap-1">
            {summary.subtopicMisses.slice(0, 10).map(({ subtopic, missed, total: t }) => (
              <div key={subtopic} className="flex items-center justify-between text-sm">
                <span className="text-muted">{subtopic}</span>
                <span className="text-err">{missed}/{t} missed</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Flagged questions */}
      {summary.flagged.length > 0 && (
        <section className="panel">
          <h2 className="mb-2 text-lg font-bold">Flagged questions ({summary.flagged.length})</h2>
          <p className="text-sm text-muted">
            You flagged: Q{summary.flagged.map((id) => {
              const idx = session.questionIds.indexOf(id);
              return idx >= 0 ? idx + 1 : '?';
            }).join(', Q')}
          </p>
        </section>
      )}

      {/* Readiness subscores */}
      <section className="panel">
        <h2 className="mb-2 text-lg font-bold">Readiness subscores</h2>
        <div className="grid gap-1">
          {(Object.entries(rating.subscores) as Array<[keyof typeof rating.subscores, number]>).map(
            ([key, val]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-muted capitalize">{key}</span>
                <span>{Math.round(val)}/1000</span>
              </div>
            )
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to={`/history/${session.id}`} className="btn">
          Review answers
        </Link>
        <Link to="/analytics" className="btn">
          Analytics
        </Link>
        <Link to="/" className="btn btn-primary">
          Home
        </Link>
      </div>
    </div>
  );
}
