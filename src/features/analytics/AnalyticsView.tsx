import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAttempts, listSessions } from '../../lib/storage/db';
import { accuracyByDomain, accuracyBySubtopic, calibration, recentWindow, timePerTopic, trend, finishedSessions } from './engine';
import { weakSpots } from '../remediation/engine';
import { readinessFromAttempts } from '../../lib/scoring/score';
import type { Attempt, Session } from '../../lib/schema';
import { DOMAIN_LABEL } from '../../lib/schema';
import { formatHumanDuration } from '../../lib/utils/time';

export function AnalyticsView() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    void Promise.all([listAttempts(), listSessions(200)]).then(([a, s]) => {
      setAttempts(a);
      setSessions(s);
    });
  }, []);

  if (!attempts.length) {
    return (
      <section className="panel">
        <h1 className="text-xl font-bold">Progress analytics</h1>
        <p className="text-muted">Answer at least one question to see analytics.</p>
        <Link to="/quiz?len=10" className="btn btn-primary mt-3">Start a 10-min quiz</Link>
      </section>
    );
  }

  const readiness = readinessFromAttempts(attempts);
  const last7 = recentWindow(attempts, 7);
  const last30 = recentWindow(attempts, 30);
  const dom = accuracyByDomain(attempts);
  const sub = accuracyBySubtopic(attempts);
  const cal = calibration(attempts);
  const tt = timePerTopic(attempts).slice(0, 8);
  const trend7 = trend(last7);
  const sims = finishedSessions(sessions).filter((s) => s.mode === 'simulation');
  const spots = weakSpots(attempts);

  return (
    <div className="flex flex-col gap-4">
      <header className="panel grid gap-4 md:grid-cols-4">
        <Stat label="Readiness (0–1000)" value={readiness} />
        <Stat label="Total attempts" value={attempts.length} />
        <Stat label="Last 7 days" value={`${last7.filter((a) => a.correct).length}/${last7.length}`} sub={`${pct(last7.filter((a) => a.correct).length, last7.length)}% acc`} />
        <Stat label="Last 30 days" value={`${last30.filter((a) => a.correct).length}/${last30.length}`} sub={`${pct(last30.filter((a) => a.correct).length, last30.length)}% acc`} />
      </header>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Accuracy by domain</h2>
        <div className="space-y-3">
          {dom.map((d) => (
            <div key={d.domain}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{DOMAIN_LABEL[d.domain]}</span>
                <span className="text-muted">{d.correct}/{d.total} · {Math.round(d.accuracy * 100)}%</span>
              </div>
              <div className="progress"><span style={{ width: `${Math.round(d.accuracy * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Confidence calibration</h2>
          <div className="space-y-3">
            {cal.map((c) => (
              <div key={c.confidence}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize">{c.confidence}</span>
                  <span className="text-muted">{c.correct}/{c.total} · {Math.round((c.accuracy || 0) * 100)}%</span>
                </div>
                <div className="progress">
                  <span style={{ width: `${Math.round((c.accuracy || 0) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-faint">If "Sure" accuracy is below 90%, you're over-confident. If "Guess" accuracy is above 50%, you're under-confident.</p>
        </div>

        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Daily accuracy (last 7d)</h2>
          {trend7.length === 0 ? (
            <p className="text-sm text-muted">Not enough recent data.</p>
          ) : (
            <Spark points={trend7.map((t) => t.accuracy * 100)} />
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Subtopic accuracy (worst first)</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-faint"><th className="py-2">Subtopic</th><th>Domain</th><th>n</th><th>acc</th></tr></thead>
          <tbody>
            {sub.slice(0, 12).map((s) => (
              <tr key={s.subtopic} className="border-t border-border/60">
                <td className="py-2">{s.subtopic}</td>
                <td className="text-muted">{DOMAIN_LABEL[s.domain]}</td>
                <td className="text-muted">{s.total}</td>
                <td className={s.accuracy < 0.6 ? 'text-bad' : s.accuracy < 0.8 ? 'text-warn' : 'text-ok'}>{Math.round(s.accuracy * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Time per topic</h2>
          {tt.length === 0 ? <p className="text-sm text-muted">Latency tracked on adaptive quiz only.</p> : (
            <ul className="space-y-2 text-sm">
              {tt.map((t) => (
                <li key={t.subtopic} className="flex items-center justify-between"><span>{t.subtopic}</span><span className="text-muted">{formatHumanDuration(t.avgMs)} · n={t.total}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h2 className="mb-3 text-lg font-bold">Recommended next block</h2>
          <Recommendation spots={spots} attempts={attempts} />
        </div>
      </section>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">Simulation history</h2>
        {sims.length === 0 ? <p className="text-sm text-muted">No completed simulations yet.</p> : (
          <ul className="space-y-2 text-sm">
            {sims.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-surface2 p-3">
                <span>{new Date(s.startedAt).toLocaleString()}</span>
                <span>{s.resultSummary?.correct}/{s.resultSummary?.total} · {s.resultSummary?.scaledScore} score</span>
                <Link className="btn btn-ghost" to={`/history/${s.id}`}>Review</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-faint">{label}</div>
      <div className="font-display text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((100 * n) / d);
}

function Spark({ points }: { points: number[] }) {
  if (!points.length) return null;
  const w = 320;
  const h = 80;
  const max = 100;
  const step = w / Math.max(1, points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (p / max) * h).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
      <path d={path} fill="none" stroke="rgb(var(--primary))" strokeWidth="2" />
      <line x1="0" x2={w} y1={h} y2={h} stroke="rgb(var(--border))" />
    </svg>
  );
}

function Recommendation({ spots, attempts }: { spots: ReturnType<typeof weakSpots>; attempts: Attempt[] }) {
  if (spots.length === 0) {
    return <p className="text-sm text-muted">Insufficient data — start a 25-min quiz to baseline.</p>;
  }
  const wrongCounts: Record<string, number> = {};
  const sureWrongCounts: Record<string, number> = {};
  const totalCounts: Record<string, number> = {};
  for (const a of attempts) {
    totalCounts[a.subtopic] = (totalCounts[a.subtopic] ?? 0) + 1;
    if (!a.correct) {
      wrongCounts[a.subtopic] = (wrongCounts[a.subtopic] ?? 0) + 1;
      if (a.confidence === 'sure') sureWrongCounts[a.subtopic] = (sureWrongCounts[a.subtopic] ?? 0) + 1;
    }
  }
  const confident = spots
    .filter((s) => s.dangerScore >= 0.5 && (wrongCounts[s.subtopic] ?? 0) >= 2)
    .sort((a, b) => b.dangerScore - a.dangerScore);
  const lowAcc = spots.filter((s) => s.attempts >= 3).sort((a, b) => a.accuracy - b.accuracy);

  let pick: ReturnType<typeof weakSpots>[number] = spots[0];
  let reason = `weight ${pick.weight.toFixed(2)} · ${pick.attempts} attempts`;
  let size: 10 | 15 | 20 = 10;
  if (confident.length) {
    pick = confident[0];
    const total = totalCounts[pick.subtopic] ?? pick.attempts;
    const wrong = wrongCounts[pick.subtopic] ?? 0;
    const sure = sureWrongCounts[pick.subtopic] ?? 0;
    reason = `${wrong}/${total} wrong, ${sure} of those confident`;
    size = 15;
  } else if (lowAcc.length) {
    pick = lowAcc[0];
    const total = totalCounts[pick.subtopic] ?? pick.attempts;
    const correct = total - (wrongCounts[pick.subtopic] ?? 0);
    reason = `${correct}/${total} correct (${Math.round(pick.accuracy * 100)}%)`;
  }
  return (
    <div className="text-sm">
      <p className="mb-2">
        Drill <strong>{size}</strong> questions on <code className="rounded bg-surface2 px-1 py-0.5">{pick.subtopic}</code> — {reason}.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link to={`/remediation?subtopic=${encodeURIComponent(pick.subtopic)}&size=${size}`} className="btn btn-primary">Start drill</Link>
        <Link to="/quiz?len=25" className="btn">Adaptive 25</Link>
      </div>
    </div>
  );
}
