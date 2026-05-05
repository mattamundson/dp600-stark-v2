import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listAttempts } from '../../lib/storage/db';
import { questionBank, questionById } from '../../data/questions';
import { buildRemediation, weakSpots, subtopicChildren } from './engine';
import { startSession, answerQuestion, finishSession, type AnswerInput } from '../quiz/session';
import { QuestionPlayer, type PlayerAnswer, type ResultDisplay } from '../../components/QuestionPlayer';
import type { Attempt, Session, SessionResult, WeakSpot } from '../../lib/schema';
import { DOMAIN_LABEL } from '../../lib/schema';

type Size = 10 | 15 | 20;

export function RemediationView() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [spots, setSpots] = useState<WeakSpot[]>([]);
  const [size, setSize] = useState<Size | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [verdict, setVerdict] = useState<ResultDisplay | null>(null);
  const [tStart, setTStart] = useState(Date.now());
  const [done, setDone] = useState<SessionResult | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    void listAttempts().then((a) => {
      setAttempts(a);
      setSpots(weakSpots(a));
    });
  }, []);

  function start(n: Size, subtopic?: string) {
    setSize(n);
    // When subtopic is a parent bucket (e.g., 'direct-lake'), expand to children.
    const expanded = subtopic ? new Set(subtopicChildren(subtopic)) : null;
    const filteredBank = expanded ? questionBank.filter((q) => expanded.has(q.subtopic)) : questionBank;
    const filteredAttempts = expanded ? attempts.filter((a) => expanded.has(a.subtopic)) : attempts;
    // Fall back to the full bank if the subtopic filter starves the pool.
    const effectiveBank = filteredBank.length >= n ? filteredBank : questionBank;
    const effectiveAttempts = filteredBank.length >= n ? filteredAttempts : attempts;
    const ids = buildRemediation(effectiveBank, effectiveAttempts, { size: n });
    const s = startSession({
      bank: questionBank,
      attempts,
      mode: n === 10 ? 'remediation-10' : n === 15 ? 'remediation-15' : 'remediation-20',
      questionIds: ids
    });
    setSession(s);
    setCursor(0);
    setHistory([]);
    setVerdict(null);
    setDone(null);
    setTStart(Date.now());
  }

  // Deep-link auto-start: ?subtopic=<name>&size=<10|15|20>
  useEffect(() => {
    if (session) return;
    const sub = searchParams.get('subtopic');
    const sz = Number(searchParams.get('size'));
    if (sub && (sz === 10 || sz === 15 || sz === 20) && attempts.length >= 0) {
      start(sz as Size, sub);
      const next = new URLSearchParams(searchParams);
      next.delete('subtopic');
      next.delete('size');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, searchParams]);

  async function submit(a: PlayerAnswer) {
    const cur = session ? questionById(session.questionIds[cursor]) : null;
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

  if (session && !done) {
    const cur = questionById(session.questionIds[cursor]);
    if (!cur) return <div className="panel">Loading…</div>;
    return (
      <div className="flex flex-col gap-3">
        <div className="text-xs text-muted">Remediation · {cursor + 1} / {session.questionIds.length}</div>
        <QuestionPlayer
          question={cur}
          index={cursor}
          total={session.questionIds.length}
          result={verdict ?? undefined}
          reveal={!!verdict}
          onSubmit={submit}
          onNext={next}
        />
      </div>
    );
  }

  if (done && size) {
    return (
      <div className="flex flex-col gap-4">
        <header className="panel">
          <h1 className="text-2xl font-bold">Remediation complete</h1>
          <p className="text-muted">{done.correct}/{done.total} correct on a {size}-question targeted set.</p>
        </header>
        <div className="flex flex-wrap gap-2">
          <Link to="/" className="btn">Dashboard</Link>
          <Link to="/analytics" className="btn">Analytics</Link>
          <button className="btn btn-primary" onClick={() => start(size)}>Another {size}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <h1 className="text-xl font-bold">Weak-area remediation</h1>
        <p className="text-muted">Targeted question sets pulled from your weakest subtopics, with a danger flag for confident-but-wrong answers.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => start(10)}>10 questions</button>
          <button className="btn" onClick={() => start(15)}>15 questions</button>
          <button className="btn" onClick={() => start(20)}>20 questions</button>
        </div>
      </header>
      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Top weak spots</h2>
        {spots.length === 0 ? (
          <p className="text-muted">Answer some questions first to surface weak areas.</p>
        ) : (
          <ul className="grid gap-2">
            {spots.slice(0, 8).map((w) => (
              <li key={w.subtopic} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface2 p-3 text-sm">
                <div>
                  <div className="font-semibold">{w.subtopic}</div>
                  <div className="text-xs text-muted">{DOMAIN_LABEL[w.domain]} · {w.attempts} attempts · {Math.round(w.accuracy * 100)}% accuracy</div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {w.dangerScore >= 0.5 && <span className="badge badge-bad">Danger {Math.round(w.dangerScore * 100)}%</span>}
                  <span className="badge badge-warn">Weight {w.weight.toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
