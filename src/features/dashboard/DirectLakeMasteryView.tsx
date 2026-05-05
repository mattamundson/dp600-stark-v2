// Scoped mastery dashboard for Direct Lake. Shows subtopic accuracy, last 10
// attempts, and runs a Direct-Lake-only quiz inline using QuestionPlayer +
// session.ts — same idiom as QuizView but pre-filtered.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QuestionPlayer, type PlayerAnswer, type ResultDisplay } from '../../components/QuestionPlayer';
import { questionBank, questionById } from '../../data/questions';
import { listAttempts } from '../../lib/storage/db';
import { startSession, answerQuestion, finishSession, type AnswerInput } from '../quiz/session';
import { subtopicChildren } from '../remediation/engine';
import type { Attempt, Question, Session, SessionResult } from '../../lib/schema';
import { useToast } from '../../app/providers/ToastProvider';

interface SubtopicStat {
  subtopic: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

const DIRECT_LAKE_SUBTOPICS = new Set(subtopicChildren('direct-lake'));

function isDirectLakeSubtopic(s: string): boolean {
  return DIRECT_LAKE_SUBTOPICS.has(s);
}

function summarizeBySubtopic(attempts: Attempt[]): SubtopicStat[] {
  const map = new Map<string, { attempts: number; correct: number }>();
  for (const a of attempts) {
    const cur = map.get(a.subtopic) ?? { attempts: 0, correct: 0 };
    cur.attempts += 1;
    if (a.correct) cur.correct += 1;
    map.set(a.subtopic, cur);
  }
  const out: SubtopicStat[] = [];
  for (const [subtopic, v] of map.entries()) {
    out.push({
      subtopic,
      attempts: v.attempts,
      correct: v.correct,
      accuracy: v.attempts === 0 ? 0 : v.correct / v.attempts
    });
  }
  out.sort((a, b) => a.subtopic.localeCompare(b.subtopic));
  return out;
}

export function DirectLakeMasteryView() {
  const [loading, setLoading] = useState<boolean>(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  // Inline quiz runner state (same shape as QuizView)
  const [session, setSession] = useState<Session | null>(null);
  const [cursor, setCursor] = useState<number>(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [verdict, setVerdict] = useState<ResultDisplay | null>(null);
  const [tStart, setTStart] = useState<number>(Date.now());
  const [done, setDone] = useState<SessionResult | null>(null);
  const { push } = useToast();

  useEffect(() => {
    let alive = true;
    void listAttempts().then((all) => {
      if (!alive) return;
      setAttempts(all);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const directLakeBank: Question[] = useMemo(
    () => questionBank.filter((q) => isDirectLakeSubtopic(q.subtopic)),
    []
  );

  const dlAttempts = useMemo(
    () => attempts.filter((a) => isDirectLakeSubtopic(a.subtopic)),
    [attempts]
  );

  const subtopicStats = useMemo(() => summarizeBySubtopic(dlAttempts), [dlAttempts]);

  const last10 = useMemo(
    () => dlAttempts.slice().sort((a, b) => b.ts - a.ts).slice(0, 10),
    [dlAttempts]
  );

  const overallAccuracy = useMemo(() => {
    if (dlAttempts.length === 0) return 0;
    const correct = dlAttempts.filter((a) => a.correct).length;
    return correct / dlAttempts.length;
  }, [dlAttempts]);

  function startQuiz() {
    if (directLakeBank.length === 0) {
      push('No Direct Lake questions in the bank yet.', 'warn');
      return;
    }
    const ids = directLakeBank.map((q) => q.id);
    const s = startSession({
      bank: directLakeBank,
      attempts,
      mode: 'quiz-25',
      questionIds: ids
    });
    setSession(s);
    setCursor(0);
    setHistory([]);
    setVerdict(null);
    setDone(null);
    setTStart(Date.now());
  }

  async function handleSubmit(a: PlayerAnswer) {
    if (!session) return;
    const cur = questionById(session.questionIds[cursor]);
    if (!cur) return;
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
      // Refresh attempts so the dashboard panels reflect the new session
      const fresh = await listAttempts();
      setAttempts(fresh);
      return;
    }
    setCursor((c) => c + 1);
    setVerdict(null);
    setTStart(Date.now());
  }

  function exitQuiz() {
    setSession(null);
    setDone(null);
    setVerdict(null);
    setHistory([]);
    setCursor(0);
  }

  if (loading) {
    return <div className="panel">Loading…</div>;
  }

  // ── Inline quiz runner ──────────────────────────────────────────────
  if (session && !done) {
    const cur = questionById(session.questionIds[cursor]);
    const total = session.questionIds.length;
    if (!cur) {
      return (
        <div className="panel">
          <p className="text-muted">Question lookup failed — bank may be empty.</p>
          <button className="btn" onClick={exitQuiz}>Back</button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-xs text-muted">
          <div className="progress flex-1">
            <span style={{ width: `${Math.min(100, Math.round((cursor / Math.max(1, total)) * 100))}%` }} />
          </div>
          <span>
            {cursor + 1} of {total}
          </span>
          <button className="btn btn-ghost text-xs" onClick={exitQuiz}>
            Exit
          </button>
        </div>
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

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <header className="panel">
          <h1 className="font-display text-2xl font-bold">Direct Lake quiz complete</h1>
          <p className="text-muted">
            {done.correct}/{done.total} correct · {Math.round(done.accuracy * 100)}% · scaled {done.scaledScore}/1000
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={startQuiz}>
            New Direct Lake quiz
          </button>
          <button className="btn" onClick={exitQuiz}>
            Back to mastery view
          </button>
          <Link to="/analytics" className="btn">
            Full analytics
          </Link>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────
  if (dlAttempts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <header className="panel">
          <h1 className="font-display text-2xl font-bold">Direct Lake mastery</h1>
          <p className="text-muted">
            No Direct Lake attempts yet. Run a focused quiz to start tracking accuracy by subtopic.
          </p>
        </header>
        <section className="panel">
          <h2 className="mb-2 text-lg font-bold">Direct-Lake-only quiz</h2>
          <p className="text-sm text-muted">
            {directLakeBank.length} questions across direct-lake, framing, fallback, OneLake, and cache subtopics.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={startQuiz} disabled={directLakeBank.length === 0}>
              Start Direct-Lake-only quiz
            </button>
            <Link to="/reference#direct-lake-mechanics" className="btn">
              Reference: Direct Lake mechanics
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ── Default mastery view ───────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Direct Lake mastery</h1>
            <p className="text-muted">
              {dlAttempts.length} attempts · {Math.round(overallAccuracy * 100)}% accuracy ·{' '}
              {directLakeBank.length} questions in scope
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={startQuiz}>
              Start Direct-Lake-only quiz
            </button>
            <Link to="/reference#direct-lake-mechanics" className="btn">
              Reference
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Subtopic accuracy</h2>
          {subtopicStats.length === 0 ? (
            <p className="text-sm text-muted">No subtopic data yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {subtopicStats.map((s) => (
                <li
                  key={s.subtopic}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface2 px-3 py-2"
                >
                  <div>
                    <div className="font-semibold">{s.subtopic}</div>
                    <div className="text-xs text-muted">
                      {s.attempts} attempts · {s.correct} correct
                    </div>
                  </div>
                  <span
                    className={`badge text-[11px] ${
                      s.accuracy >= 0.8
                        ? 'badge-good'
                        : s.accuracy >= 0.5
                          ? 'badge-info'
                          : 'badge-bad'
                    }`}
                  >
                    {Math.round(s.accuracy * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Last 10 attempts</h2>
          {last10.length === 0 ? (
            <p className="text-sm text-muted">No recent attempts.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {last10.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs text-muted">{a.questionId}</div>
                    <div className="text-xs text-muted">
                      {a.subtopic} · D{a.difficulty} · {new Date(a.ts).toLocaleString()}
                    </div>
                  </div>
                  <span className={`badge text-[11px] ${a.correct ? 'badge-good' : 'badge-bad'}`}>
                    {a.correct ? 'Correct' : a.partial && a.partial > 0 ? `Partial ${Math.round(a.partial * 100)}%` : 'Miss'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="mb-2 text-lg font-bold">About this view</h2>
        <p className="text-sm text-muted">
          Scoped to questions whose subtopic begins with <code className="kbd">direct-lake</code>. The quiz CTA
          runs the full filtered bank ({directLakeBank.length} questions) inline using the standard quiz
          runner, so attempts here flow into the same analytics as everything else.
        </p>
      </section>
    </div>
  );
}
