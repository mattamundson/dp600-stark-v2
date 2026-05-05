import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { attemptsBySession, getSession, listSessions } from '../../lib/storage/db';
import { questionById } from '../../data/questions';
import type { Attempt, Session } from '../../lib/schema';
import { DOMAIN_LABEL } from '../../lib/schema';
import { formatHumanDuration } from '../../lib/utils/time';

export function HistoryView() {
  const { sessionId } = useParams();
  if (sessionId) return <SessionDetail sessionId={sessionId} />;
  return <SessionList />;
}

function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  useEffect(() => { void listSessions(200).then(setSessions); }, []);
  const finished = useMemo(() => sessions.filter((s) => s.finishedAt && s.resultSummary), [sessions]);

  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted">Every completed session. Click in to review answers and missed questions.</p>
      </header>
      {finished.length === 0 ? (
        <section className="panel"><p className="text-muted">No completed sessions yet.</p></section>
      ) : (
        <section className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-faint">
              <th className="py-2">When</th><th>Mode</th><th>Score</th><th>Acc</th><th>Time</th><th></th>
            </tr></thead>
            <tbody>
              {finished.map((s) => {
                const r = s.resultSummary!;
                const dur = (s.finishedAt ?? 0) - s.startedAt;
                return (
                  <tr key={s.id} className="border-t border-border/60">
                    <td className="py-2">{new Date(s.startedAt).toLocaleString()}</td>
                    <td className="text-muted">{s.mode}</td>
                    <td>{r.scaledScore} / 1000</td>
                    <td>{r.correct}/{r.total} · {Math.round(r.accuracy * 100)}%</td>
                    <td className="text-muted">{formatHumanDuration(dur)}</td>
                    <td><Link to={`/history/${s.id}`} className="btn btn-ghost text-xs">Review →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function SessionDetail({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  useEffect(() => {
    void Promise.all([getSession(sessionId), attemptsBySession(sessionId)]).then(([s, a]) => {
      setSession(s ?? null);
      setAttempts(a);
    });
  }, [sessionId]);

  if (!session) return <div className="panel">Loading…</div>;
  const r = session.resultSummary;

  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <Link to="/history" className="btn-ghost btn text-xs">← All sessions</Link>
        <h1 className="mt-2 text-2xl font-bold">{session.mode} · {new Date(session.startedAt).toLocaleString()}</h1>
        {r && <p className="text-muted">{r.correct}/{r.total} correct · {Math.round(r.accuracy * 100)}% · score {r.scaledScore}</p>}
      </header>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Per-domain</h2>
        {r ? (
          <div className="grid gap-2 text-sm">
            {(['prepare', 'maintain', 'semantic'] as const).map((d) => (
              <div key={d} className="flex items-center justify-between"><span>{DOMAIN_LABEL[d]}</span><span className="text-muted">{r.byDomain[d].correct}/{r.byDomain[d].total}</span></div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">No summary recorded.</p>}
      </section>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Questions</h2>
        <ul className="space-y-3">
          {session.questionIds.map((qid, i) => {
            const q = questionById(qid);
            const a = attempts.find((x) => x.questionId === qid);
            const status = !a ? 'unanswered' : a.correct ? 'correct' : 'wrong';
            return (
              <li key={qid} className={`rounded-xl border px-3 py-3 text-sm ${status === 'correct' ? 'border-ok/30 bg-ok/10' : status === 'wrong' ? 'border-bad/30 bg-bad/10' : 'border-border bg-surface2'}`}>
                <div className="mb-1 flex items-center justify-between text-xs text-muted">
                  <span>Q{i + 1} · {q?.subtopic ?? '—'}</span>
                  <span className="capitalize">{status}{a ? ` · ${a.confidence}` : ''}</span>
                </div>
                <div className="font-semibold">{q?.prompt ?? `(missing question ${qid})`}</div>
                {a && q && <Picked q={q} a={a} />}
                {q && !a && <p className="mt-1 text-xs text-faint">Skipped during the session.</p>}
                {q?.explanation && <p className="mt-2 text-xs text-text/80"><strong>Explain:</strong> {q.explanation}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Picked({ q, a }: { q: ReturnType<typeof questionById> & object; a: Attempt }) {
  if (q.type === 'ordering') {
    return <p className="mt-1 text-xs text-muted">Your order: {a.selectedOrder?.map((id) => q.options?.find((o) => o.id === id)?.text).join(' → ')}</p>;
  }
  return <p className="mt-1 text-xs text-muted">Picked: {a.selectedOptionIds.map((id) => q.options?.find((o) => o.id === id)?.text ?? id).join(', ') || '—'}</p>;
}
