// KQL Mini-Drill — timed 5-question drill against the KQL subset of the
// question bank. Reuses QuestionPlayer for rendering. Auto-submits at 0:00.
//
// Note (intentional): this drill is in-memory only. We deliberately do NOT
// persist a Session-shaped snapshot every 10s the way SimulationView does —
// the drill is short, the value of refresh-survival is low, and adding a
// dedicated SessionMode 'kql-drill' is a future schema bump (see schema.ts
// SessionMode union). If a refresh happens mid-drill, the user restarts.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QuestionPlayer, type PlayerAnswer } from '../../components/QuestionPlayer';
import { questionBank } from '../../data/questions';
import { formatMs } from '../../lib/utils/time';
import { seededShuffle } from '../../lib/utils/arr';
import { gradeAnswer } from '../../lib/scoring/score';
import type { Confidence, Question } from '../../lib/schema';

const DRILL_MS = 300_000; // 5 minutes
const DRILL_QUESTIONS = 5;

interface DrillAnswer {
  selectedOptionIds?: string[];
  selectedOrder?: string[];
  confidence?: Confidence;
}

export function KqlDrillView() {
  const kqlPool = useMemo(
    () => questionBank.filter((q) => q.subtopic === 'kql'),
    []
  );

  const [questions, setQuestions] = useState<Question[]>([]);
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Record<string, DrillAnswer>>({});
  const [timeRemainingMs, setTimeRemainingMs] = useState(DRILL_MS);
  const [phase, setPhase] = useState<'init' | 'idle' | 'running' | 'done'>('init');
  const [summary, setSummary] = useState<{ correct: number; total: number; perQuestion: Array<{ qid: string; correct: boolean }> } | null>(null);

  const tickRef = useRef<number | null>(null);
  const submittingRef = useRef(false);

  // Initial mount: classify whether we even have enough KQL questions.
  useEffect(() => {
    if (kqlPool.length < DRILL_QUESTIONS) {
      setPhase('idle');
    } else {
      setPhase('idle');
    }
  }, [kqlPool.length]);

  function start() {
    if (kqlPool.length < DRILL_QUESTIONS) return;
    const seed = Date.now() & 0xffffffff;
    const picked = seededShuffle(kqlPool, seed).slice(0, DRILL_QUESTIONS);
    setQuestions(picked);
    setAnswers({});
    setCursor(0);
    setTimeRemainingMs(DRILL_MS);
    submittingRef.current = false;
    setSummary(null);
    setPhase('running');
  }

  // Timer.
  useEffect(() => {
    if (phase !== 'running') return;
    let last = Date.now();
    tickRef.current = window.setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      setTimeRemainingMs((cur) => {
        const next = Math.max(0, cur - dt);
        if (next <= 0 && !submittingRef.current) {
          submittingRef.current = true;
          // Auto-submit on next tick to let the state settle.
          window.setTimeout(() => doSubmit(), 0);
        }
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function doSubmit() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const perQuestion = questions.map((q) => {
      const a = answers[q.id];
      const grade = gradeAnswer(q, a?.selectedOptionIds, a?.selectedOrder);
      return { qid: q.id, correct: grade.correct };
    });
    const correct = perQuestion.filter((p) => p.correct).length;
    setSummary({ correct, total: questions.length, perQuestion });
    setPhase('done');
  }

  // Capture the user's in-progress answer (locked=false; we never reveal mid-drill).
  function onChange(payload: { selectedOptionIds?: string[]; selectedOrder?: string[]; confidence: Confidence }) {
    const q = questions[cursor];
    if (!q) return;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        selectedOptionIds: payload.selectedOptionIds,
        selectedOrder: payload.selectedOrder,
        confidence: payload.confidence
      }
    }));
  }

  // Per-question Submit button click in the drill = "save and go to next".
  // We grade only at end-of-drill (drill semantics: no per-question feedback).
  function onSubmit(a: PlayerAnswer) {
    const q = questions[cursor];
    if (!q) return;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        selectedOptionIds: a.selectedOptionIds,
        selectedOrder: a.selectedOrder,
        confidence: a.confidence
      }
    }));
    if (cursor + 1 < questions.length) {
      setCursor((c) => c + 1);
    } else {
      doSubmit();
    }
  }

  function jumpTo(i: number) {
    if (i < 0 || i >= questions.length) return;
    setCursor(i);
  }

  if (phase === 'init') return <div className="panel">Loading…</div>;

  if (phase === 'idle') {
    if (kqlPool.length < DRILL_QUESTIONS) {
      return (
        <section className="panel flex flex-col gap-3">
          <h1 className="text-xl font-bold">Not enough KQL questions</h1>
          <p className="text-muted">
            The drill needs at least {DRILL_QUESTIONS} KQL questions but the bank
            currently has {kqlPool.length}. Seed more KQL content first.
          </p>
          <div>
            <Link to="/study-plan" className="btn">
              Back to study plan
            </Link>
          </div>
        </section>
      );
    }
    return (
      <section className="panel flex flex-col gap-3">
        <h1 className="text-2xl font-bold">KQL Mini-Drill</h1>
        <p className="text-muted">
          {DRILL_QUESTIONS} KQL questions · 5-minute timer · no per-question
          feedback during the drill — results revealed at submit / time-up.
        </p>
        <div>
          <button className="btn btn-primary" onClick={start}>
            Begin drill
          </button>
        </div>
      </section>
    );
  }

  if (phase === 'done' && summary) {
    return (
      <div className="flex flex-col gap-4">
        <header className="panel flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">KQL Drill complete</h1>
            <p className="text-muted">
              {summary.correct} / {summary.total} correct
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-faint">Accuracy</div>
            <div className="font-display text-3xl font-bold">
              {Math.round((summary.correct / Math.max(1, summary.total)) * 100)}%
            </div>
          </div>
        </header>
        <section className="panel">
          <h2 className="mb-2 text-lg font-bold">Per-question</h2>
          <ul className="grid gap-1 text-sm">
            {summary.perQuestion.map((r, i) => (
              <li
                key={r.qid}
                className={`flex items-center justify-between rounded border px-3 py-2 ${
                  r.correct
                    ? 'border-ok/40 bg-ok/10'
                    : 'border-bad/40 bg-bad/10'
                }`}
              >
                <span className="text-muted">
                  Q{i + 1} · {r.qid}
                </span>
                <span className={r.correct ? 'text-ok' : 'text-bad'}>
                  {r.correct ? 'Correct' : 'Wrong'}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={start}>
            Run another drill
          </button>
          <Link to="/study-plan" className="btn">
            Back to study plan
          </Link>
        </div>
      </div>
    );
  }

  // phase === 'running'
  const cur = questions[cursor];
  if (!cur) return <div className="panel">Loading question…</div>;
  const ans = answers[cur.id];

  return (
    <div className="flex flex-col gap-3">
      <header className="panel flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col items-center gap-1">
          <Palette
            count={questions.length}
            cursor={cursor}
            answeredIds={Object.keys(answers)}
            questionIds={questions.map((q) => q.id)}
            onJump={jumpTo}
          />
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold">{formatMs(timeRemainingMs)}</div>
          <div className="text-xs text-muted">timer · auto-submit at 0:00</div>
        </div>
      </header>

      <QuestionPlayer
        question={cur}
        index={cursor}
        total={questions.length}
        value={{
          selectedOptionIds: ans?.selectedOptionIds,
          selectedOrder: ans?.selectedOrder,
          confidence: ans?.confidence
        }}
        onChange={onChange}
        onSubmit={onSubmit}
        primaryLabel={cursor + 1 < questions.length ? 'Save & next' : 'Submit drill'}
      />

      <footer className="panel-tight flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-faint">
          No per-question feedback during the drill. Submit early or wait for time-up.
        </div>
        <button className="btn" onClick={doSubmit}>
          Submit drill now
        </button>
      </footer>
    </div>
  );
}

function Palette({
  count,
  cursor,
  answeredIds,
  questionIds,
  onJump
}: {
  count: number;
  cursor: number;
  answeredIds: string[];
  questionIds: string[];
  onJump: (i: number) => void;
}) {
  const answered = new Set(answeredIds);
  return (
    <div className="flex gap-1" aria-label="Question palette">
      {Array.from({ length: count }, (_, i) => {
        const qid = questionIds[i];
        const isAnswered = answered.has(qid);
        const isCurrent = i === cursor;
        const cls = isCurrent
          ? 'bg-primary/30 border-primary text-text'
          : isAnswered
          ? 'bg-ok/15 border-ok/40 text-ok'
          : 'bg-surface2 border-border text-muted';
        return (
          <button
            key={i}
            onClick={() => onJump(i)}
            aria-current={isCurrent ? 'true' : undefined}
            className={`h-8 w-8 rounded border text-xs ${cls}`}
            title={`Q${i + 1}${isAnswered ? ' · answered' : ''}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
