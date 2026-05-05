import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { questionBank, questionById } from '../../data/questions';
import { getActiveSimulation, saveSession } from '../../lib/storage/db';
import {
  newSimulationSession,
  recordAnswer,
  setCursor as setCursorEngine,
  SIMULATION_MS,
  SIMULATION_QUESTIONS,
  submitSimulation,
  toggleFlag
} from './engine';
import type { Confidence, Session, SessionResult } from '../../lib/schema';
import { QuestionPlayer } from '../../components/QuestionPlayer';
import { formatMs } from '../../lib/utils/time';
import { useToast } from '../../app/providers/ToastProvider';

export function SimulationView() {
  const [session, setSession] = useState<Session | null>(null);
  const [boot, setBoot] = useState<'init' | 'idle' | 'running' | 'done'>('init');
  const [result, setResult] = useState<SessionResult | null>(null);
  const tickRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const { push } = useToast();

  useEffect(() => {
    void getActiveSimulation().then((existing) => {
      if (existing) {
        setSession(existing);
        setBoot('running');
      } else {
        setBoot('idle');
      }
    });
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, []);

  // tick the timer once per second; persist snapshot every 10s
  useEffect(() => {
    if (boot !== 'running' || !session) return;
    let last = Date.now();
    let writeAccum = 0;
    tickRef.current = window.setInterval(() => {
      const now = Date.now();
      const dt = now - last; last = now; writeAccum += dt;
      let snapshotForSubmit: Session | null = null;
      setSession((cur) => {
        if (!cur || !cur.snapshot || cur.snapshot.submitted) return cur;
        const remaining = Math.max(0, cur.snapshot.timeRemainingMs - dt);
        const next = { ...cur, snapshot: { ...cur.snapshot, timeRemainingMs: remaining } };
        if (writeAccum >= 10_000) { writeAccum = 0; void saveSession(next); }
        if (remaining <= 0 && !submittingRef.current) {
          submittingRef.current = true;
          snapshotForSubmit = next;
        }
        return next;
      });
      if (snapshotForSubmit) void doSubmit(snapshotForSubmit);
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [boot, session?.id]);

  async function startNew() {
    if (questionBank.length < SIMULATION_QUESTIONS) {
      push(`Need ≥${SIMULATION_QUESTIONS} questions; bank has ${questionBank.length}. Phase 4 content required.`, 'warn');
      return;
    }
    const s = newSimulationSession(questionBank);
    await saveSession(s);
    setSession(s);
    setBoot('running');
  }

  async function doSubmit(s: Session) {
    if (!s) return;
    if (s.snapshot?.submitted) return;
    submittingRef.current = true;
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    const out = await submitSimulation(s, questionBank);
    setSession(out.session);
    setResult(out.result);
    setBoot('done');
  }

  if (boot === 'init') return <div className="panel">Loading…</div>;
  if (boot === 'idle') return <SimulationIntro onStart={startNew} bankSize={questionBank.length} />;
  if (boot === 'done' && result) return <SimulationResult session={session!} result={result} />;
  if (boot === 'running' && session) return <SimulationRunner session={session} setSession={setSession} onSubmit={() => doSubmit(session)} />;
  return <div className="panel">…</div>;
}

function SimulationIntro({ onStart, bankSize }: { onStart: () => void; bankSize: number }) {
  return (
    <section className="panel flex flex-col gap-3">
      <h1 className="text-2xl font-bold">Full Exam Simulation</h1>
      <p className="text-muted">{SIMULATION_QUESTIONS} questions · 100 minutes · no per-question feedback until you submit.</p>
      <ul className="ml-5 list-disc text-sm text-muted">
        <li>Refresh-safe — your cursor, answers, and remaining time are saved every 10 seconds.</li>
        <li>Flag questions with <span className="kbd">F</span> to revisit before submission.</li>
        <li>Submit early or wait for time-up; either way, scoring is the same.</li>
      </ul>
      <div>
        <button className="btn btn-primary" onClick={onStart}>Begin simulation ({bankSize} questions in bank)</button>
      </div>
    </section>
  );
}

function SimulationRunner({ session, setSession, onSubmit }: { session: Session; setSession: (s: Session) => void; onSubmit: () => void }) {
  const cursor = session.snapshot?.cursor ?? 0;
  const qid = session.questionIds[cursor];
  const q = questionById(qid);
  const ans = session.snapshot?.answers[qid];
  const timeMs = session.snapshot?.timeRemainingMs ?? SIMULATION_MS;
  const flagged = (session.snapshot?.flagged ?? []).includes(qid);
  const answered = useMemo(() => Object.values(session.snapshot?.answers ?? {}).filter((a) => a.selectedOptionIds?.length || a.selectedOrder?.length).length, [session]);

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

  function onAnswerChange(payload: { selectedOptionIds?: string[]; selectedOrder?: string[]; confidence: Confidence }) {
    persist(recordAnswer(session, qid, payload, timeMs));
  }

  if (!q) return <div className="panel">Loading question…</div>;

  return (
    <div className="flex flex-col gap-3">
      <header className="panel flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-2xl font-bold">{formatMs(timeMs)}</div>
          <div className="text-xs text-muted">{answered} answered · {(session.snapshot?.flagged?.length ?? 0)} flagged</div>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => jumpTo(Math.max(0, cursor - 1))} disabled={cursor === 0}>← Prev</button>
          <button className="btn" onClick={() => jumpTo(Math.min(session.questionIds.length - 1, cursor + 1))} disabled={cursor === session.questionIds.length - 1}>Next →</button>
          <button className="btn btn-primary" onClick={onSubmit}>Submit exam</button>
        </div>
      </header>

      <Palette session={session} onJump={jumpTo} />

      <QuestionPlayer
        question={q}
        index={cursor}
        total={session.questionIds.length}
        value={{ selectedOptionIds: ans?.selectedOptionIds, selectedOrder: ans?.selectedOrder, confidence: ans?.confidence }}
        flagged={flagged}
        onFlagToggle={flag}
        onChange={onAnswerChange}
      />
    </div>
  );
}

function Palette({ session, onJump }: { session: Session; onJump: (i: number) => void }) {
  const cursor = session.snapshot?.cursor ?? 0;
  return (
    <div className="panel-tight">
      <div className="grid grid-cols-10 gap-1 sm:grid-cols-13 md:grid-cols-[repeat(15,minmax(0,1fr))] lg:grid-cols-[repeat(20,minmax(0,1fr))]">
        {session.questionIds.map((id, i) => {
          const ans = session.snapshot?.answers[id];
          const answered = ans && (ans.selectedOptionIds?.length || ans.selectedOrder?.length);
          const flagged = (session.snapshot?.flagged ?? []).includes(id);
          const cls = i === cursor
            ? 'bg-primary/30 border-primary text-text'
            : flagged
            ? 'bg-warn/15 border-warn/40 text-warn'
            : answered
            ? 'bg-ok/15 border-ok/40 text-ok'
            : 'bg-surface2 border-border text-muted';
          return (
            <button
              key={id}
              onClick={() => onJump(i)}
              aria-current={i === cursor ? 'true' : undefined}
              className={`h-7 rounded border text-xs ${cls}`}
              title={`Q${i + 1}${flagged ? ' · flagged' : ''}${answered ? ' · answered' : ''}`}
            >{i + 1}</button>
          );
        })}
      </div>
    </div>
  );
}

function SimulationResult({ session, result }: { session: Session; result: SessionResult }) {
  const dur = (session.finishedAt ?? Date.now()) - session.startedAt;
  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <h1 className="font-display text-2xl font-bold">Simulation submitted</h1>
        <p className="text-muted">{result.correct} correct · {result.incorrect} wrong · {result.unanswered} unanswered · {Math.round(dur / 60_000)} min</p>
      </header>
      <section className="panel grid gap-4 md:grid-cols-3">
        <div><div className="text-xs uppercase text-faint">Accuracy</div><div className="font-display text-3xl font-bold">{Math.round(result.accuracy * 100)}%</div></div>
        <div><div className="text-xs uppercase text-faint">Scaled score</div><div className="font-display text-3xl font-bold">{result.scaledScore}/1000</div></div>
        <div><div className="text-xs uppercase text-faint">Time used</div><div className="font-display text-3xl font-bold">{formatMs(dur)}</div></div>
      </section>
      <section className="panel">
        <h2 className="mb-2 text-lg font-bold">Per-domain accuracy</h2>
        <div className="grid gap-2">
          {(['prepare', 'maintain', 'semantic'] as const).map((d) => {
            const v = result.byDomain[d];
            return (
              <div key={d} className="flex items-center justify-between text-sm">
                <span className="text-muted">{d}</span>
                <span>{v.correct}/{v.total} · {Math.round(v.accuracy * 100)}%</span>
              </div>
            );
          })}
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        <Link to={`/history/${session.id}`} className="btn">Review answers</Link>
        <Link to="/analytics" className="btn">Analytics</Link>
        <Link to="/" className="btn btn-primary">Home</Link>
      </div>
    </div>
  );
}
