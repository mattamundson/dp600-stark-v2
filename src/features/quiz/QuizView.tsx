import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { QuestionPlayer, type PlayerAnswer, type ResultDisplay } from '../../components/QuestionPlayer';
import { questionBank, questionById } from '../../data/questions';
import { listAttempts } from '../../lib/storage/db';
import { startSession, answerQuestion, finishSession, targetSize, emphasisDecrementPatch, type AnswerInput } from './session';
import type { Attempt, Session, SessionResult } from '../../lib/schema';
import { useToast } from '../../app/providers/ToastProvider';
import { useSettings } from '../../app/providers/SettingsProvider';

type Mode = 'quiz-10' | 'quiz-25' | 'quiz-50';

function modeFromParams(p: URLSearchParams): Mode {
  const len = p.get('len');
  if (len === '25') return 'quiz-25';
  if (len === '50') return 'quiz-50';
  return 'quiz-10';
}

export function QuizView() {
  const [params] = useSearchParams();
  const mode = modeFromParams(params);
  const [session, setSession] = useState<Session | null>(null);
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [verdict, setVerdict] = useState<ResultDisplay | null>(null);
  const [tStart, setTStart] = useState<number>(Date.now());
  const [done, setDone] = useState<SessionResult | null>(null);
  const { push } = useToast();
  const { settings, patch } = useSettings();

  useEffect(() => {
    let alive = true;
    if (!settings) return;
    void listAttempts().then((all) => {
      if (!alive) return;
      const s = startSession({ bank: questionBank, attempts: all, mode, settings });
      if (s.questionIds.length === 0) {
        push('Question bank is empty — Phase 4 content not yet seeded.', 'warn');
      }
      setSession(s);
      setCursor(0);
      setHistory([]);
      setVerdict(null);
      setDone(null);
      setTStart(Date.now());
      // Decrement emphasis-mode usage AFTER the session is built so this session
      // benefits from the skew, then the count rolls down for the next one.
      const decPatch = emphasisDecrementPatch(settings);
      if (decPatch) void patch(decPatch);
    });
    return () => { alive = false; };
    // settings.emphasisMode is read-by-value at session-build time; depending on
    // the full `settings` object would re-trigger on every patch including
    // theme/reduceMotion. We intentionally only re-run on `mode` change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, settings?.startedAtIso]);

  const cur = session ? questionById(session.questionIds[cursor]) : null;
  const total = session?.questionIds.length ?? 0;

  async function handleSubmit(a: PlayerAnswer) {
    if (!session || !cur) return;
    const input: AnswerInput = {
      selectedOptionIds: a.selectedOptionIds,
      selectedOrder: a.selectedOrder,
      confidence: a.confidence,
      latencyMs: Date.now() - tStart
    };
    const out = await answerQuestion(session, cur, input);
    setHistory((h) => [...h, out.attempt]);
    setVerdict({ correct: out.correct, partial: out.partial });
  }

  async function next() {
    if (!session) return;
    if (cursor + 1 >= session.questionIds.length) {
      const dur = Date.now() - session.startedAt;
      const result = await finishSession(session, history, dur);
      setDone(result);
      return;
    }
    setCursor((c) => c + 1);
    setVerdict(null);
    setTStart(Date.now());
  }

  if (done) return <ResultView result={done} mode={mode} />;
  if (!session) return <div className="panel">Loading…</div>;
  if (!cur) return <EmptyBank mode={mode} target={targetSize(mode)} />;

  return (
    <div className="flex flex-col gap-3">
      <ProgressBar value={cursor / Math.max(1, total)} label={`${cursor + 1} of ${total}`} />
      <QuestionPlayer
        question={cur}
        index={cursor}
        total={total}
        result={verdict ?? undefined}
        reveal={!!verdict}
        onSubmit={handleSubmit}
        onNext={next}
      />
    </div>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <div className="progress flex-1"><span style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} /></div>
      <span>{label}</span>
    </div>
  );
}

function ResultView({ result, mode }: { result: SessionResult; mode: Mode }) {
  const minutes = useMemo(() => Math.round(result.durationMs / 60_000), [result.durationMs]);
  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <h1 className="font-display text-2xl font-bold">Session complete</h1>
        <p className="text-muted">{mode} · {minutes} min · {result.correct}/{result.total} correct</p>
      </header>
      <section className="panel grid gap-4 md:grid-cols-3">
        <div><div className="text-xs uppercase text-faint">Accuracy</div><div className="font-display text-3xl font-bold">{Math.round(result.accuracy * 100)}%</div></div>
        <div><div className="text-xs uppercase text-faint">Scaled score (0–1000)</div><div className="font-display text-3xl font-bold">{result.scaledScore}</div></div>
        <div><div className="text-xs uppercase text-faint">Unanswered</div><div className="font-display text-3xl font-bold">{result.unanswered}</div></div>
      </section>
      <section className="panel">
        <h2 className="mb-2 text-lg font-bold">By domain</h2>
        <div className="grid gap-2">
          {(['prepare', 'maintain', 'semantic'] as const).map((d) => (
            <div key={d} className="flex items-center justify-between text-sm">
              <span className="text-muted">{d}</span>
              <span>{result.byDomain[d].correct}/{result.byDomain[d].total} · {Math.round(result.byDomain[d].accuracy * 100)}%</span>
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        <Link to="/" className="btn">Dashboard</Link>
        <Link to="/analytics" className="btn">View analytics</Link>
        <Link to={`/quiz?len=${mode === 'quiz-10' ? 10 : mode === 'quiz-25' ? 25 : 50}`} reloadDocument className="btn btn-primary">New {mode === 'quiz-10' ? '10' : mode === 'quiz-25' ? '25' : '50'}-min session</Link>
      </div>
    </div>
  );
}

function EmptyBank({ mode, target }: { mode: Mode; target: number }) {
  return (
    <section className="panel">
      <h1 className="text-xl font-bold">No questions to ask yet</h1>
      <p className="text-muted">Phase 4 content (≥220 questions) seeds the bank. Requested {target} for {mode}.</p>
    </section>
  );
}
