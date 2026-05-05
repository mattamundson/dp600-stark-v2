import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { scenarios, scenarioById } from '../../data/scenarios';
import { questionsByScenario } from '../../data/questions';
import { QuestionPlayer, type PlayerAnswer, type ResultDisplay } from '../../components/QuestionPlayer';
import { startSession, answerQuestion, finishSession, type AnswerInput } from '../quiz/session';
import { questionBank } from '../../data/questions';
import { listAttempts } from '../../lib/storage/db';
import type { Attempt, Session, SessionResult } from '../../lib/schema';
import { DOMAIN_LABEL } from '../../lib/schema';

export function ScenarioView() {
  const { id } = useParams();
  if (id) return <ScenarioRunner id={id} />;
  return <ScenarioIndex />;
}

function ScenarioIndex() {
  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <h1 className="font-display text-2xl font-bold">Scenario chains</h1>
        <p className="text-muted">Multi-question scenarios that test tradeoff reasoning, not pure recall.</p>
      </header>
      {scenarios.length === 0 ? (
        <section className="panel">
          <p className="text-muted">15 scenario sets seed in Phase 4.</p>
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {scenarios.map((s) => {
            const qs = questionsByScenario(s.id);
            return (
              <Link key={s.id} to={`/scenarios/${s.id}`} className="panel transition hover:border-primary/40">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="badge">{DOMAIN_LABEL[s.domain]}</span>
                  <span className="badge">{qs.length} Qs</span>
                </div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.business}</p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

function ScenarioRunner({ id }: { id: string }) {
  const scenario = scenarioById(id);
  const navigate = useNavigate();
  const qs = useMemo(() => questionsByScenario(id), [id]);
  const [session, setSession] = useState<Session | null>(null);
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [verdict, setVerdict] = useState<ResultDisplay | null>(null);
  const [tStart, setTStart] = useState(Date.now());
  const [done, setDone] = useState<SessionResult | null>(null);

  useEffect(() => {
    let alive = true;
    void listAttempts().then(() => {
      if (!alive) return;
      const s = startSession({
        bank: questionBank,
        attempts: [],
        mode: 'quiz-10',
        questionIds: qs.map((q) => q.id)
      });
      // mark as scenario in mode would be ideal — we keep quiz-10 to reuse engine; History view differentiates by questionId scenarioId
      setSession({ ...s, mode: 'quiz-10' });
      setCursor(0);
      setHistory([]);
      setVerdict(null);
      setDone(null);
      setTStart(Date.now());
    });
    return () => { alive = false; };
  }, [id]);

  if (!scenario) return <div className="panel">Scenario not found.</div>;
  if (qs.length === 0) return <div className="panel">No questions linked to this scenario yet.</div>;
  if (!session) return <div className="panel">Loading…</div>;

  const cur = qs[cursor];

  async function submit(a: PlayerAnswer) {
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
    if (cursor + 1 >= qs.length) {
      const dur = Date.now() - session.startedAt;
      const result = await finishSession(session, history, dur);
      setDone(result);
      return;
    }
    setCursor((c) => c + 1);
    setVerdict(null);
    setTStart(Date.now());
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <header className="panel">
          <h1 className="text-2xl font-bold">Scenario complete</h1>
          <p className="text-muted">{scenario.title} · {done.correct}/{done.total} correct</p>
        </header>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => navigate('/scenarios')}>All scenarios</button>
          <button className="btn btn-primary" onClick={() => location.reload()}>Retry this scenario</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="panel">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{scenario.title}</h2>
          <div className="flex gap-2 text-xs">
            <span className="badge">{DOMAIN_LABEL[scenario.domain]}</span>
            <span className="badge">{cursor + 1} / {qs.length}</span>
          </div>
        </div>
        <p className="text-sm text-muted">{scenario.business}</p>
        <p className="mt-2 text-sm">{scenario.prompt}</p>
      </header>
      <QuestionPlayer
        question={cur}
        index={cursor}
        total={qs.length}
        result={verdict ?? undefined}
        reveal={!!verdict}
        onSubmit={submit}
        onNext={next}
      />
    </div>
  );
}
