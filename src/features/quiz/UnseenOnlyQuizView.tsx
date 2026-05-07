// Unseen-only quiz runner — same loop as QuizView but the question set is
// curated up-front from `selectUnseenQuiz` rather than the adaptive engine.
//
// Falls back to a friendly empty state when the user has already attempted
// every question in the bank. Sessions still persist (mode='quiz-25') so
// History/Analytics show them just like any other quiz.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { QuestionPlayer, type PlayerAnswer, type ResultDisplay } from '../../components/QuestionPlayer';
import { questionBank, questionById } from '../../data/questions';
import { listAttempts } from '../../lib/storage/db';
import { startSession, answerQuestion, finishSession, type AnswerInput } from './session';
import { selectUnseenQuiz } from './unseen-only';
import type { Attempt, Session, SessionResult } from '../../lib/schema';
import { useToast } from '../../app/providers/ToastProvider';
import { useSettings } from '../../app/providers/SettingsProvider';

function lengthFromParams(p: URLSearchParams): number {
  const n = Number(p.get('len'));
  if (!Number.isFinite(n) || n <= 0) return 25;
  return Math.min(50, Math.max(1, Math.floor(n)));
}

export function UnseenOnlyQuizView() {
  const [params] = useSearchParams();
  const targetLen = lengthFromParams(params);
  const [session, setSession] = useState<Session | null>(null);
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [verdict, setVerdict] = useState<ResultDisplay | null>(null);
  const [tStart, setTStart] = useState<number>(Date.now());
  const [done, setDone] = useState<SessionResult | null>(null);
  const [empty, setEmpty] = useState(false);
  const { push } = useToast();
  const { settings } = useSettings();

  useEffect(() => {
    let alive = true;
    if (!settings) return;
    void listAttempts().then((all) => {
      if (!alive) return;
      const picked = selectUnseenQuiz(questionBank, all, targetLen);
      if (picked.length === 0) {
        setEmpty(true);
        return;
      }
      const s = startSession({
        bank: questionBank,
        attempts: all,
        // Reuse the standard quiz-25 session mode so History/Analytics treat
        // these like any other quiz — no schema migration needed.
        mode: 'quiz-25',
        questionIds: picked.map((q) => q.id),
        settings
      });
      setSession(s);
      setCursor(0);
      setHistory([]);
      setVerdict(null);
      setDone(null);
      setEmpty(false);
      setTStart(Date.now());
      push(`Drilling ${picked.length} unseen questions.`, 'info');
    });
    return () => {
      alive = false;
    };
    // Intentionally only re-run when targetLen or initial settings load changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLen, settings?.startedAtIso]);

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

  if (empty) return <AllCaughtUp />;
  if (done) return <UnseenResultView result={done} total={total} />;
  if (!session) return <div className="panel">Loading…</div>;
  if (!cur) return <AllCaughtUp />;

  return (
    <div className="flex flex-col gap-3">
      <ProgressBar value={cursor / Math.max(1, total)} label={`${cursor + 1} of ${total} unseen`} />
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
      <div className="progress flex-1">
        <span style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
      </div>
      <span>{label}</span>
    </div>
  );
}

function AllCaughtUp() {
  return (
    <section className="panel">
      <h1 className="text-xl font-bold">All caught up</h1>
      <p className="mt-2 text-muted">
        You've attempted every question in the bank — there are no unseen drills left. Try a fresh full
        simulation to stress-test calibration under exam conditions.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/simulation" className="btn btn-primary">Start a full simulation</Link>
        <Link to="/remediation" className="btn">Drill weak spots</Link>
        <Link to="/" className="btn btn-ghost">Dashboard</Link>
      </div>
    </section>
  );
}

function UnseenResultView({ result, total }: { result: SessionResult; total: number }) {
  const minutes = useMemo(() => Math.round(result.durationMs / 60_000), [result.durationMs]);
  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <h1 className="font-display text-2xl font-bold">Unseen drill complete</h1>
        <p className="text-muted">
          {total} unseen question{total === 1 ? '' : 's'} · {minutes} min · {result.correct}/{result.total} correct
        </p>
      </header>
      <section className="panel grid gap-4 md:grid-cols-3">
        <div>
          <div className="text-xs uppercase text-faint">Accuracy</div>
          <div className="font-display text-3xl font-bold">{Math.round(result.accuracy * 100)}%</div>
        </div>
        <div>
          <div className="text-xs uppercase text-faint">Scaled score (0–1000)</div>
          <div className="font-display text-3xl font-bold">{result.scaledScore}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-faint">Unanswered</div>
          <div className="font-display text-3xl font-bold">{result.unanswered}</div>
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        <Link to="/" className="btn">Dashboard</Link>
        <Link to="/analytics" className="btn">View analytics</Link>
        <Link to="/quiz/unseen?len=25" reloadDocument className="btn btn-primary">
          Drill another 25 unseen
        </Link>
      </div>
    </div>
  );
}
